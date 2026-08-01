import {
  and,
  asc,
  avg,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  max,
  min,
  ne,
  or,
  sum,
  type SQL,
} from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import { db } from "~/server/db";

import { AssistantQueryError } from "./assistant-query.error";
import {
  ALLOWED_TABLES,
  getAllowedColumns,
  getForeignKeyEdges,
  isAllowedTable,
} from "./table-registry";
import type {
  AggregateSpec,
  StructuredQuery,
  StructuredQueryFilterNode,
} from "./structured-query.schema";

// File này CHỈ ĐƯỢC PHÉP gọi db.select(...) — không import/gọi db.insert,
// db.update, hay db.delete ở đây. Đây là điểm đảm bảo tool query_data
// luôn read-only (kiểm tra được bằng `grep` khi review).

const MAX_RESULT_CHARS = 8000;
const MAX_LIMIT = 200;

export type RunStructuredQueryResult = {
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
};

type TableCtx = {
  name: string;
  table: PgTable;
  columns: Record<string, PgColumn>;
};

function loadTableCtx(tableName: string): TableCtx {
  if (!isAllowedTable(tableName)) {
    throw new AssistantQueryError(
      `Bảng "${tableName}" không được phép truy vấn. Chỉ được dùng các bảng nghiệp vụ đã liệt kê trong schema.`,
    );
  }
  return {
    name: tableName,
    table: ALLOWED_TABLES[tableName]!,
    columns: getAllowedColumns(tableName),
  };
}

/** "col" hoặc "table.col" — không ghi rõ bảng thì mặc định thuộc bảng gốc (base). */
function resolveColumn(
  ref: string,
  base: TableCtx,
  joined: Map<string, TableCtx>,
): PgColumn {
  const dotIndex = ref.indexOf(".");
  const tableName = dotIndex === -1 ? base.name : ref.slice(0, dotIndex);
  const columnName = dotIndex === -1 ? ref : ref.slice(dotIndex + 1);

  const ctx = tableName === base.name ? base : joined.get(tableName);
  if (!ctx) {
    throw new AssistantQueryError(
      `Bảng "${tableName}" chưa được join vào truy vấn, không thể dùng cột "${ref}".`,
    );
  }
  const column = ctx.columns[columnName];
  if (!column) {
    throw new AssistantQueryError(`Cột "${columnName}" không tồn tại trong bảng "${ctx.name}".`);
  }
  return column;
}

/** Bắt buộc dạng "table.column" — dùng riêng cho join.left/join.right để luôn rõ ràng. */
function resolveJoinSide(
  ref: string,
  base: TableCtx,
  joined: Map<string, TableCtx>,
): { tableName: string; columnKey: string; column: PgColumn } {
  const dotIndex = ref.indexOf(".");
  if (dotIndex === -1) {
    throw new AssistantQueryError(
      `Điều kiện join "${ref}" phải ghi rõ dạng "table.column", ví dụ "orders.tableId".`,
    );
  }
  const tableName = ref.slice(0, dotIndex);
  const columnKey = ref.slice(dotIndex + 1);
  const ctx = tableName === base.name ? base : joined.get(tableName);
  if (!ctx) {
    throw new AssistantQueryError(`Bảng "${tableName}" chưa được join vào truy vấn.`);
  }
  const column = ctx.columns[columnKey];
  if (!column) {
    throw new AssistantQueryError(`Cột "${columnKey}" không tồn tại trong bảng "${ctx.name}".`);
  }
  return { tableName, columnKey, column };
}

/** Model chỉ có thể gửi chuỗi/số/boolean/null (JSON) — cột timestamp cần một
 * `Date` thật, không thì driver Postgres lỗi khi serialize tham số. */
function coerceValue(column: PgColumn, value: string | number | boolean | null | undefined) {
  if (column.dataType === "date" && typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return value;
}

/** `node` là 1 điều kiện đơn hoặc 1 nhóm `{ or: [...] }` (không lồng thêm được
 * — xem ghi chú ở structured-query.schema.ts về lý do không dùng schema đệ quy). */
function buildFilterSql(
  node: StructuredQueryFilterNode,
  base: TableCtx,
  joined: Map<string, TableCtx>,
): SQL {
  if ("or" in node) {
    const parts = node.or.map((n) => buildConditionSql(n, base, joined));
    return or(...parts)!;
  }
  return buildConditionSql(node, base, joined);
}

function buildConditionSql(
  node: Exclude<StructuredQueryFilterNode, { or: unknown[] }>,
  base: TableCtx,
  joined: Map<string, TableCtx>,
): SQL {
  const column = resolveColumn(node.column, base, joined);

  // Mọi giá trị đi qua các hàm builder của Drizzle (eq/gt/like/inArray...) —
  // KHÔNG BAO GIỜ ghép chuỗi SQL thô. Đây là điểm chống SQL injection.
  switch (node.operator) {
    case "=":
      return eq(column, coerceValue(column, node.value));
    case "!=":
      return ne(column, coerceValue(column, node.value));
    case ">":
      return gt(column, coerceValue(column, node.value));
    case "<":
      return lt(column, coerceValue(column, node.value));
    case ">=":
      return gte(column, coerceValue(column, node.value));
    case "<=":
      return lte(column, coerceValue(column, node.value));
    case "LIKE": {
      // Model hay quên tự thêm "%" và Postgres LIKE mặc định phân biệt hoa
      // thường — dùng ILIKE (không phân biệt hoa/thường) + tự bọc "%...%" nếu
      // model chưa tự bọc, để LIKE luôn hoạt động như tìm kiếm gần đúng thay
      // vì vô tình thành so khớp chính xác (từng gây lỗi: lọc danh mục "bia"
      // không khớp được tên thật "Bia & Nước Giải Khát").
      const raw = String(node.value ?? "");
      const pattern = raw.includes("%") ? raw : `%${raw}%`;
      return ilike(column, pattern);
    }
    case "IN":
      if (!node.values) throw new AssistantQueryError('Toán tử IN cần trường "values".');
      return inArray(
        column,
        node.values.map((v) => coerceValue(column, v)),
      );
    case "IS NULL":
      return isNull(column);
    case "IS NOT NULL":
      return isNotNull(column);
    case "BETWEEN": {
      if (!node.range) throw new AssistantQueryError('Toán tử BETWEEN cần trường "range".');
      const [lo, hi] = node.range;
      return and(gte(column, coerceValue(column, lo)), lte(column, coerceValue(column, hi)))!;
    }
  }
}

function buildAggregateExpr(
  agg: AggregateSpec,
  base: TableCtx,
  joined: Map<string, TableCtx>,
): SQL {
  const column = agg.column ? resolveColumn(agg.column, base, joined) : undefined;
  switch (agg.fn) {
    case "count":
      return count(column);
    case "sum":
      if (!column) throw new AssistantQueryError('Hàm "sum" cần trường "column".');
      return sum(column);
    case "avg":
      if (!column) throw new AssistantQueryError('Hàm "avg" cần trường "column".');
      return avg(column);
    case "min":
      if (!column) throw new AssistantQueryError('Hàm "min" cần trường "column".');
      return min(column);
    case "max":
      if (!column) throw new AssistantQueryError('Hàm "max" cần trường "column".');
      return max(column);
  }
}

function buildProjection(
  query: StructuredQuery,
  base: TableCtx,
  joined: Map<string, TableCtx>,
): Record<string, PgColumn | SQL> {
  const projection: Record<string, PgColumn | SQL> = {};

  for (const colRef of query.columns ?? []) {
    projection[colRef] = resolveColumn(colRef, base, joined);
  }

  for (const agg of query.aggregate ?? []) {
    projection[agg.alias] = buildAggregateExpr(agg, base, joined);
  }

  return projection;
}

/** "sort" có thể trỏ vào 1 cột thật HOẶC alias của 1 hàm aggregate trong cùng
 * truy vấn (vd sort theo "total_sold" để lấy "món bán chạy nhất") — nếu không
 * hỗ trợ vế thứ 2 thì mọi câu hỏi dạng "top N theo 1 chỉ số tính toán" đều
 * không làm được, vì bản thân alias không phải cột thật trong bảng nào. */
function resolveSortTarget(
  ref: string,
  query: StructuredQuery,
  base: TableCtx,
  joined: Map<string, TableCtx>,
): PgColumn | SQL {
  const matchingAggregate = query.aggregate?.find((agg) => agg.alias === ref);
  if (matchingAggregate) return buildAggregateExpr(matchingAggregate, base, joined);
  return resolveColumn(ref, base, joined);
}

export async function runStructuredQuery(
  input: StructuredQuery,
): Promise<RunStructuredQueryResult> {
  const base = loadTableCtx(input.table);
  const joined = new Map<string, TableCtx>();

  for (const j of input.join ?? []) {
    const joinCtx = loadTableCtx(j.table);

    const left = resolveJoinSide(j.left, base, joined);
    // "right" phải trỏ vào bảng vừa join (chưa có trong `joined` lúc validate).
    const rightDotIndex = j.right.indexOf(".");
    if (rightDotIndex === -1) {
      throw new AssistantQueryError(
        `Điều kiện join "${j.right}" phải ghi rõ dạng "table.column".`,
      );
    }
    const rightTableName = j.right.slice(0, rightDotIndex);
    const rightColumnKey = j.right.slice(rightDotIndex + 1);
    if (rightTableName !== joinCtx.name) {
      throw new AssistantQueryError(
        `"right" của join phải thuộc bảng "${joinCtx.name}" (bảng đang join vào).`,
      );
    }
    const rightColumn = joinCtx.columns[rightColumnKey];
    if (!rightColumn) {
      throw new AssistantQueryError(
        `Cột "${rightColumnKey}" không tồn tại trong bảng "${joinCtx.name}".`,
      );
    }

    // Chỉ cho phép join nếu có khoá ngoại THẬT nối 2 bảng — không cho join tuỳ tiện.
    // Phải xét khoá ngoại từ đúng bảng chứa "left" (base HOẶC 1 bảng đã join
    // trước đó trong chuỗi) — không phải luôn luôn `base` cố định. Trước đây
    // hardcode `base.name` nên join bắc cầu qua bảng trung gian (vd order_items
    // -> menu_items -> categories, cột "left" của lượt join thứ 2 thuộc
    // menu_items chứ không phải order_items) bị chặn NHẦM là "không có khoá
    // ngoại", dù menu_items -> categories là khoá ngoại thật — model buộc phải
    // vòng vo dò tìm cách khác thay vì join 1 lượt đúng như dự định.
    const edgesFromLeft = getForeignKeyEdges(left.tableName);
    const edgesFromJoined = getForeignKeyEdges(joinCtx.name);
    const isRealFk =
      edgesFromLeft.some(
        (e) =>
          e.toTable === joinCtx.name &&
          ((e.fromColumn === left.columnKey && e.toColumn === rightColumnKey) ||
            (e.fromColumn === rightColumnKey && e.toColumn === left.columnKey)),
      ) ||
      edgesFromJoined.some(
        (e) =>
          e.toTable === left.tableName &&
          ((e.fromColumn === rightColumnKey && e.toColumn === left.columnKey) ||
            (e.fromColumn === left.columnKey && e.toColumn === rightColumnKey)),
      );
    if (!isRealFk) {
      throw new AssistantQueryError(
        `Không có khoá ngoại nào liên kết "${left.tableName}" và "${joinCtx.name}" qua các cột đã cho — không thể join.`,
      );
    }

    joined.set(joinCtx.name, joinCtx);
  }

  const projection = buildProjection(input, base, joined);
  if (Object.keys(projection).length === 0) {
    throw new AssistantQueryError("Truy vấn phải chọn ít nhất 1 cột hoặc 1 hàm tổng hợp.");
  }

  let queryBuilder = db.select(projection).from(base.table).$dynamic();

  for (const j of input.join ?? []) {
    const joinCtx = joined.get(j.table)!;
    const left = resolveColumn(j.left, base, joined);
    const right = resolveColumn(j.right, base, joined);
    const on = eq(left, right);
    queryBuilder =
      j.type === "inner"
        ? queryBuilder.innerJoin(joinCtx.table, on)
        : queryBuilder.leftJoin(joinCtx.table, on);
  }

  // Bắt buộc loại đơn đã xoá mềm khỏi MỌI truy vấn đụng tới "orders" (base
  // hoặc join) — không dựa vào model tự biết thêm filter deletedAt, vì model
  // không được dạy về cột này trong schema-context.ts. Đây là chốt chặn CỨNG,
  // không thể bỏ qua kể cả khi model cố tình không lọc.
  const mandatoryConditions: SQL[] = [];
  for (const ctx of [base, ...joined.values()]) {
    if (ctx.name === "orders") {
      mandatoryConditions.push(isNull(ctx.columns.deletedAt!));
    }
  }

  const filterConditions = input.filter?.map((f) => buildFilterSql(f, base, joined)) ?? [];
  const allConditions = [...mandatoryConditions, ...filterConditions];
  if (allConditions.length > 0) {
    queryBuilder = queryBuilder.where(and(...allConditions));
  }

  if (input.groupBy && input.groupBy.length > 0) {
    const groupCols = input.groupBy.map((g) => resolveColumn(g, base, joined));
    queryBuilder = queryBuilder.groupBy(...groupCols);
  }

  if (input.sort && input.sort.length > 0) {
    const orderCols = input.sort.map(([colRef, dir]) => {
      const column = resolveSortTarget(colRef, input, base, joined);
      return dir === "DESC" ? desc(column) : asc(column);
    });
    queryBuilder = queryBuilder.orderBy(...orderCols);
  }

  // Clamp limit lần nữa dù Zod đã chặn — phòng khi hàm này được gọi từ nơi khác bỏ qua Zod.
  const safeLimit = Math.min(input.limit, MAX_LIMIT);
  queryBuilder = queryBuilder.limit(safeLimit).offset(input.offset);

  const rows = (await queryBuilder) as Record<string, unknown>[];

  let truncated = false;
  let resultRows = rows;
  let serialized = JSON.stringify(resultRows);
  while (serialized.length > MAX_RESULT_CHARS && resultRows.length > 1) {
    resultRows = resultRows.slice(0, Math.ceil(resultRows.length / 2));
    truncated = true;
    serialized = JSON.stringify(resultRows);
  }

  // Cột timestamp (vd shift.startTime) trả về là Date object thật từ Drizzle
  // — không phải JSON value hợp lệ cho tool-result (AI SDK validate content
  // theo schema string/number/boolean/null/record/array khi build lại
  // ModelMessage, Date object thô làm convertToModelMessages throw "expected
  // string, received Date" ngay khi lượt chat SAU cần đọc lại lịch sử này).
  // Parse lại từ `serialized` đã tính sẵn ở trên (đo độ dài) — JSON.stringify
  // tự gọi Date.prototype.toJSON() nên Date tự thành chuỗi ISO, không cần
  // tính riêng thêm 1 lần.
  const jsonSafeRows = JSON.parse(serialized) as Record<string, unknown>[];

  return { rows: jsonSafeRows, rowCount: jsonSafeRows.length, truncated };
}
