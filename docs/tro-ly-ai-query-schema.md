# Schema & tham số đầy đủ cho tool `query_data`

> File này liệt kê ĐẦY ĐỦ các field, type, và ví dụ dùng của tool truy vấn dữ liệu
> mà trợ lý AI dùng — mục đích để tra cứu khi cần debug, và để hiểu rõ AI "được phép"
> hỏi những gì. Nội dung tương đương (bản rút gọn hơn) đã được nhúng thẳng vào system
> prompt tại [`query-dsl-reference.ts`](../src/modules/assistant/infrastructure/query-tool/query-dsl-reference.ts)
> — nếu sửa 1 trong 2 nơi, nhớ cập nhật cả 2 cho khớp.

## 1. Tham số của `query_data` (Zod schema thật — xem [`structured-query.schema.ts`](../src/modules/assistant/infrastructure/query-tool/structured-query.schema.ts))

| Field | Kiểu | Bắt buộc? | Ghi chú |
|---|---|---|---|
| `purpose` | `string` (≤200 ký tự) | **Có** | Mô tả ngắn tự nhiên, không nhắc bảng/cột/SQL — hiển thị cho người dùng xem tiến trình. |
| `table` | `string` (≤64) | **Có** | Tên bảng — phải nằm trong whitelist (mục 3). |
| `columns` | `string[]` (1–30 phần tử) | Không (nhưng phải có `columns` hoặc `aggregate`) | `"col"` hoặc `"table.col"` khi có join. |
| `aggregate` | mảng ≤5 phần tử | Không | Mỗi phần tử: `{ fn: "count"\|"sum"\|"avg"\|"min"\|"max", column?: string, alias: string }`. `column` bỏ qua khi `fn = "count"` (đếm `COUNT(*)`). |
| `groupBy` | `string[]` (≤5) | Không | Dùng cùng `aggregate` để nhóm theo cột. |
| `filter` | mảng ≤20 phần tử | Không | Cấp cao nhất = AND. Mỗi phần tử là 1 điều kiện hoặc `{ or: [điều kiện, ...] }` (xem mục 2). |
| `join` | mảng ≤3 phần tử | Không | `{ table: string, left: "table.col", right: "table.col", type?: "inner"\|"left" }`. Chỉ hợp lệ nếu 2 bảng có khoá ngoại thật. |
| `sort` | mảng ≤3 phần tử | Không | Mỗi phần tử: `[tênCộtHoặcAlias, "ASC"\|"DESC"]`. Có thể trỏ vào **alias** đã khai báo trong `aggregate` (xem Ví dụ 2). |
| `limit` | `number` | Không (mặc định 50) | Tối đa 200 — vượt quá sẽ tự bị cắt còn 200. |
| `offset` | `number` | Không (mặc định 0) | Tối đa 5000. |

## 2. Cấu trúc 1 điều kiện `filter`

```ts
type Condition = {
  column: string;                                    // "col" hoặc "table.col"
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" |
            "LIKE" | "IN" | "IS NULL" | "IS NOT NULL" | "BETWEEN";
  value?: string | number | boolean | null;          // cho =, !=, >, <, >=, <=, LIKE
  values?: (string | number | boolean | null)[];      // cho IN (1-50 phần tử)
  range?: [value, value];                             // cho BETWEEN
};

// 1 phần tử của mảng filter[] có thể là Condition, HOẶC:
type OrGroup = { or: Condition[] };   // 2-5 điều kiện, KHÔNG lồng thêm and/or bên trong
```

**Vì sao không hỗ trợ lồng `and`/`or` nhiều cấp**: khi chuyển Zod schema đệ quy sang
JSON Schema gửi cho OpenAI, phần đệ quy bị thư viện "default về `any`" (mất hết ràng
buộc kiểu) — từng gây lỗi ngẫu nhiên khó tái hiện vì model có thể gửi input sai hình
dạng mà không bị chặn trước. Giới hạn `or` chỉ 1 cấp là đánh đổi có chủ đích để tránh
lỗi này, và đã đủ dùng cho hầu hết câu hỏi thực tế (mảng `filter` ở cấp cao nhất vốn
đã là AND, nên "so sánh A và (B hoặc C)" vẫn viết được).

## 3. Danh sách bảng được phép truy vấn

Whitelist bảng/cột/khoá ngoại **tự động lấy từ Drizzle schema thật** (không hard-code
trùng lặp) — xem [`table-registry.ts`](../src/modules/assistant/infrastructure/query-tool/table-registry.ts).
Để xem danh sách bảng/cột/enum values CHÍNH XÁC tại thời điểm hiện tại (tự cập nhật
mỗi khi schema đổi), chạy:

```bash
npx tsx -e "
import('./src/modules/assistant/infrastructure/query-tool/schema-context.ts').then(m => console.log(m.SCHEMA_CONTEXT));
"
```

Bảng auth của BetterAuth (`users`, `sessions`, `accounts`, `verifications`) **không**
nằm trong whitelist — AI không thể đọc được dù có yêu cầu.

## 4. Ví dụ

### Ví dụ 1 — tổng hợp có điều kiện ("doanh thu hôm nay")
```json
{
  "purpose": "Tính doanh thu các đơn đã thanh toán hôm nay",
  "table": "orders",
  "aggregate": [{ "fn": "sum", "column": "totalAmount", "alias": "revenue" }],
  "filter": [
    { "column": "status", "operator": "=", "value": "paid" },
    { "column": "paidConfirmedAt", "operator": ">=", "value": "2024-06-08" },
    { "column": "paidConfirmedAt", "operator": "<", "value": "2024-06-09" }
  ]
}
```

### Ví dụ 2 — "top N theo 1 chỉ số tính toán" (món bán chạy nhất)
Đây là mẫu **hay bị làm sai nhất** trước khi có tài liệu này: model từng tự bịa tên cột
tổng hợp (vd `"totalSold"`) rồi dùng làm `sort`/`columns` — sai, vì đó là **alias**, không
phải cột thật trong bảng nào. Cách đúng: đặt `alias` trong `aggregate`, rồi `sort` trỏ
đúng vào alias đó (tool tự nhận diện alias khớp với `aggregate` để dựng lại đúng biểu
thức `SUM(...)`/`COUNT(...)` khi ORDER BY — xem `resolveSortTarget()` trong
[`run-structured-query.ts`](../src/modules/assistant/infrastructure/query-tool/run-structured-query.ts)):
```json
{
  "purpose": "Tìm món bán chạy nhất tuần này theo số lượng bán ra",
  "table": "order_items",
  "columns": ["itemName"],
  "aggregate": [{ "fn": "sum", "column": "quantity", "alias": "total_sold" }],
  "groupBy": ["itemName"],
  "sort": [["total_sold", "DESC"]],
  "limit": 1
}
```

### Ví dụ 3 — join 2 bảng có khoá ngoại thật
```json
{
  "purpose": "Xem đơn hàng kèm tên bàn",
  "table": "orders",
  "columns": ["orders.id", "orders.status", "tables.name"],
  "join": [{ "table": "tables", "left": "orders.tableId", "right": "tables.id", "type": "left" }],
  "limit": 20
}
```

## 5. Lỗi thường gặp & cách tránh

| Lỗi | Nguyên nhân | Cách tránh |
|---|---|---|
| `Bảng "X" không được phép truy vấn` | Bảng không có trong whitelist (thường là gõ sai tên, hoặc cố truy vấn bảng auth). | Chỉ dùng tên bảng trong mục 3. |
| `Cột "X" không tồn tại trong bảng "Y"` | Gõ sai tên cột, hoặc dùng alias của `aggregate` ở chỗ cần cột thật (vd trong `filter`). | Đối chiếu đúng tên cột thật trong schema; alias chỉ dùng được ở `sort`. |
| `Không có khoá ngoại nào liên kết...` | Cố join 2 bảng không có quan hệ FK thật. | Chỉ join các cặp bảng có khoá ngoại — xem "Khoá ngoại" trong schema context. |
| Lỗi Postgres kiểu ép kiểu ngày giờ | Trước đây do gửi chuỗi ngày cho cột timestamp mà không convert — **đã fix** ở `coerceValue()` trong `run-structured-query.ts`, tự chuyển string hợp lệ sang `Date`. | Không cần làm gì thêm — nếu vẫn gặp, kiểm tra định dạng chuỗi ngày có hợp lệ (`YYYY-MM-DD` hoặc ISO) không. |
| Model dùng sai case cho cột enum (vd `"OPEN"` thay vì `"open"`) | Trước đây schema context không liệt kê giá trị enum hợp lệ — **đã fix**, mỗi cột enum giờ hiện kèm `giá trị hợp lệ: a/b/c`. | Không cần làm gì thêm. |
