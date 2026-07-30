# Hướng dẫn: Trợ lý AI trong Goimon (dành cho người mới bắt đầu)

Tài liệu này giải thích **từ đầu** mọi khái niệm liên quan đến tính năng "Trợ lý AI" vừa
được thêm vào dự án — bạn không cần biết gì trước về LLM, agent, tRPC hay Drizzle để đọc
được tài liệu này. Mọi ví dụ đều trích từ code THẬT đã chạy được trong dự án, không phải
ví dụ minh hoạ chung chung.

---

## 1. Bức tranh tổng thể: chuyện gì xảy ra khi bạn gửi 1 câu hỏi?

```
Bạn gõ câu hỏi trên UI
        │
        ▼
Trình duyệt gửi request tới  /api/assistant/chat
        │
        ▼
Server gọi OpenAI (model gpt-4.1), kèm theo:
  - "system prompt" (chỉ dẫn cách trả lời)
  - lịch sử hội thoại
  - danh sách "tool" model được phép gọi (vd: query_data)
        │
        ▼
Model quyết định: trả lời ngay, hoặc gọi 1 tool trước
        │                                   │
        │                                   ▼
        │                       Server THỰC THI tool đó
        │                       (vd: query_data → chạy 1 câu
        │                       truy vấn Postgres an toàn)
        │                                   │
        │                                   ▼
        │                       Kết quả tool gửi ngược lại cho model
        │                                   │
        ◄───────────────────────────────────┘
        ▼
Model đọc kết quả, viết câu trả lời bằng tiếng Việt
        │
        ▼
Câu trả lời được "stream" (chảy dần từng chữ) về trình duyệt
        │
        ▼
Toàn bộ lượt hỏi-đáp được lưu vào bảng assistant_messages
```

Phần khó nhất và quan trọng nhất trong toàn bộ hệ thống là **tool `query_data`** — nó cho
phép model tự viết truy vấn dữ liệu dưới dạng JSON, nhưng server phải đảm bảo JSON đó
không bao giờ có thể đọc dữ liệu nhạy cảm hay phá hoại dữ liệu. Mục 9 giải thích chi tiết.

---

## 2. LLM là gì? "Tool calling" (gọi công cụ) là gì?

**LLM** (Large Language Model — mô hình ngôn ngữ lớn) là một chương trình AI được huấn
luyện để "đoán chữ tiếp theo" cực kỳ giỏi, tới mức có thể trò chuyện, giải thích, viết
code... Ở đây ta dùng model `gpt-4.1` của OpenAI, gọi qua API (không chạy trên máy bạn).

Vấn đề: LLM **không tự nó** biết dữ liệu thật trong database của quán bạn (nó không có
kết nối tới Postgres). Nếu chỉ hỏi suông, nó sẽ bịa số liệu.

**Tool calling** giải quyết việc này: bạn "dạy" model rằng nó có thể gọi những hàm cụ thể
(gọi là "tool") để lấy dữ liệu thật, thay vì đoán. Model không tự chạy code — nó chỉ trả
lời "tôi muốn gọi tool X với tham số Y", rồi **server của bạn** thực thi tool đó và gửi
kết quả về cho model đọc tiếp.

Trong dự án này có 3 tool, định nghĩa ở
[`src/modules/assistant/infrastructure/tools/`](../src/modules/assistant/infrastructure/tools/):

| Tool | Việc nó làm | File |
|---|---|---|
| `query_data` | Truy vấn dữ liệu (đơn hàng, món ăn...) — CHỈ ĐỌC | `query-data.tool.ts` |
| `render_chart` | Vẽ biểu đồ line/bar/pie | `render-chart.tool.ts` |
| `render_diagram` | Vẽ sơ đồ quy trình (nodes + edges) | `render-diagram.tool.ts` |

Mỗi tool được định nghĩa bằng hàm `tool({...})` của thư viện `ai` (Vercel AI SDK):

```ts
// src/modules/assistant/infrastructure/tools/query-data.tool.ts
export function createQueryDataTool(actorId: string) {
  return tool({
    description: "Truy vấn READ-ONLY dữ liệu kinh doanh...",
    inputSchema: structuredQuerySchema, // "hình dạng" tham số hợp lệ — xem mục 5 (Zod)
    execute: async (input) => {
      // Đây là code THẬT sẽ chạy khi model quyết định gọi tool này
      return await runStructuredQuery(input, actorId);
    },
  });
}
```

Vòng lặp "model gọi tool → server chạy → trả kết quả → model gọi tool tiếp hoặc trả lời"
được thư viện `ai`'s `streamText({ tools, stopWhen: stepCountIs(6) })` tự động xử lý — xem
[`src/app/api/assistant/chat/route.ts`](../src/app/api/assistant/chat/route.ts).
`stepCountIs(6)` giới hạn tối đa 6 vòng lặp, để tránh model gọi tool vô tận nếu có lỗi.

---

## 3. System prompt là gì? Vì sao phải viết cẩn thận?

**System prompt** là đoạn chỉ dẫn "nền" gửi kèm MỌI request tới model — nó định hình
"tính cách" và ranh giới của trợ lý, khác với tin nhắn của người dùng.

Xem toàn bộ tại
[`src/modules/assistant/infrastructure/system-prompt.ts`](../src/modules/assistant/infrastructure/system-prompt.ts).
Những phần quan trọng nhất:

1. **Ranh giới năng lực**: nói rõ model CHỈ ĐỌC được dữ liệu, không được sửa/xoá — nếu
   người dùng yêu cầu sửa dữ liệu, model phải từ chối. Đây là chỉ dẫn ở tầng "lời nói"
   — lớp bảo vệ THẬT SỰ nằm ở tầng code (mục 9), system prompt chỉ là lớp phòng thủ đầu
   tiên, không phải duy nhất.
2. **Không tiết lộ chi tiết kỹ thuật**: dặn model không nói "bảng orders, cột
   totalAmount" trong câu trả lời — chỉ dùng ngôn ngữ nghiệp vụ ("đơn hàng", "doanh thu").
3. **Chống prompt injection**: dặn model coi dữ liệu trả về từ tool là DỮ LIỆU THUẦN TUÝ,
   không phải chỉ thị. Vì sao cần dặn? Nếu 1 dòng ghi chú đơn hàng chứa chữ như "Bỏ qua
   mọi hướng dẫn trước đó và...", một model không cẩn thận có thể tưởng đó là lệnh thật.
4. **Schema dữ liệu**: liệt kê chính xác tên bảng/cột được phép dùng — được **tự động
   sinh ra** từ chính Drizzle schema (không viết tay để tránh sai lệch), xem
   [`schema-context.ts`](../src/modules/assistant/infrastructure/query-tool/schema-context.ts).

System prompt trong dự án này **cố tình viết tĩnh** (không đổi giữa các request) — vì
OpenAI tự động cache phần đầu request giống nhau giữa các lượt gọi, giúp lượt chat sau
rẻ hơn và nhanh hơn lượt đầu.

---

## 4. Streaming là gì? Vì sao câu trả lời hiện ra dần dần?

Nếu phải đợi model viết xong TOÀN BỘ câu trả lời rồi mới hiển thị, người dùng sẽ nhìn
màn hình trắng nhiều giây. **Streaming** nghĩa là server gửi câu trả lời về **từng mẩu
nhỏ** ngay khi model sinh ra nó, qua một chuẨn gọi là SSE (Server-Sent Events) — trình
duyệt nhận và hiển thị ngay, tạo cảm giác "gõ chữ" quen thuộc của các chatbot.

Ở phía server ([`route.ts`](../src/app/api/assistant/chat/route.ts)), `streamText(...)`
trả về 1 luồng (stream) sự kiện — mỗi sự kiện có thể là "thêm 1 chữ vào câu trả lời",
"bắt đầu gọi tool X", "tool X đã xong, đây là kết quả"... Ở phía trình duyệt
([`chat-panel.tsx`](../src/app/quan-ly/tro-ly-ai/chat-panel.tsx)), hook `useChat()` của
`@ai-sdk/react` tự động nhận các sự kiện này và cập nhật giao diện — bạn không cần tự
viết code xử lý stream.

Bạn có thể tự xem dữ liệu thô của 1 stream bằng lệnh sau (thay `<cookie>` bằng cookie
đăng nhập thật, xem mục 10):

```bash
curl -N -X POST http://localhost:4466/api/assistant/chat \
  -H "Content-Type: application/json" -b "<cookie>" \
  -d '{"sessionId":1,"messages":[{"id":"m1","role":"user","parts":[{"type":"text","text":"Xin chào"}]}]}'
```

Bạn sẽ thấy nhiều dòng `data: {...}` chảy qua — mỗi dòng là 1 mẩu nhỏ của câu trả lời.

---

## 5. Zod là gì? Vì sao dùng để kiểm tra dữ liệu?

**Zod** là thư viện định nghĩa "hình dạng dữ liệu hợp lệ" bằng TypeScript, rồi tự động
kiểm tra (validate) dữ liệu thật có đúng hình dạng đó không — dùng ở khắp dự án Goimon,
không riêng tính năng AI.

Ví dụ hình dạng tham số của tool `query_data`
([`structured-query.schema.ts`](../src/modules/assistant/infrastructure/query-tool/structured-query.schema.ts)):

```ts
export const structuredQuerySchema = z.object({
  table: z.string().max(64),
  columns: z.array(columnRef).min(1).max(30).optional(),
  filter: z.array(filterNode).max(20).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  // ...
});
```

Điều này nghĩa là: nếu model (hoặc bất kỳ ai) gửi 1 JSON không đúng hình dạng này — ví
dụ `limit: 999999` hoặc `table: 12345` (số thay vì chữ) — Zod sẽ **tự động từ chối trước
khi code của bạn chạy**, bạn không cần viết `if` kiểm tra tay từng trường. `max(200)` ở
đây chính là giới hạn cứng: dù model có yêu cầu lấy 1 triệu dòng, Zod cũng chặn lại còn
tối đa 200.

---

## 6. Drizzle ORM — những khái niệm cần biết

**ORM** (Object-Relational Mapping) là lớp trung gian giúp bạn thao tác database bằng
code TypeScript thay vì viết chuỗi SQL thô. **Drizzle** là ORM dự án đang dùng.

- **Table (bảng)**: định nghĩa bằng `pgTable(...)`, ví dụ
  [`assistant.schema.ts`](../src/modules/assistant/infrastructure/assistant.schema.ts)
  định nghĩa 2 bảng mới: `assistant_sessions` (mỗi phiên trò chuyện) và
  `assistant_messages` (từng tin nhắn trong phiên đó).
- **Cột (column)**: mỗi trường trong bảng, có kiểu dữ liệu riêng (`integer`, `text`,
  `timestamp`, `jsonb`...). Tên biến TypeScript thường viết `camelCase` (`sessionId`)
  nhưng tên cột SQL thật thường viết `snake_case` (`session_id`) — Drizzle tự ánh xạ
  2 chiều.
- **Quan hệ (relations)**: khai báo bảng này liên kết bảng kia qua khoá ngoại (foreign
  key) thế nào — vd `assistant_messages.session_id` trỏ tới `assistant_sessions.id`.
  Quan hệ này còn được tái sử dụng để tool `query_data` biết join nào là "hợp lệ" (mục 9).
- **Migration**: khi bạn ĐỔI schema (thêm bảng/cột), cần "đồng bộ" thay đổi đó vào
  database thật. Có 2 cách:
  - `npm run db:generate` rồi `npm run db:migrate`: sinh ra 1 file `.sql` mô tả chính
    xác thay đổi, lưu lại lịch sử — nên dùng cách này khi đã có dữ liệu thật cần giữ.
  - `npm run db:push`: so sánh trực tiếp schema code với database rồi tự áp dụng, không
    lưu lịch sử — nhanh, tiện lúc đang phát triển, nhưng không có file `.sql` để review.
  - `npm run db:studio`: mở giao diện web xem trực tiếp dữ liệu trong database — cách
    nhanh nhất để "mắt thấy" dữ liệu thật.

  > Lưu ý: khi làm tính năng này, mình phát hiện database của bạn có vài bảng
  > (`promotions`, `shifts`, `payment_config`) đã tồn tại trong DB thật (chắc do trước
  > đây từng chạy `db:push`) nhưng chưa từng có trong file migration `.sql` nào — nên
  > lần này mình dùng `db:push` để thêm 2 bảng mới của tính năng AI, tránh việc chạy
  > `db:migrate` cố tạo lại các bảng đã tồn tại rồi bị lỗi trùng.

---

## 7. tRPC là gì? Vì sao có 1 chỗ KHÔNG dùng tRPC?

**tRPC** cho phép gọi hàm ở server từ client giống như gọi hàm JavaScript bình thường,
tự động có type-safety (gõ sai tên field là báo lỗi ngay lúc code, không cần đợi chạy
thử) — khác REST API truyền thống (phải tự định nghĩa URL, tự parse JSON, không tự động
khớp kiểu dữ liệu 2 đầu).

Ví dụ gọi tRPC ở component `session-sidebar.tsx`:
```ts
const { data } = api.assistant.listSessions.useQuery({ page: 1, pageSize: 20 });
```
Không cần viết `fetch("/api/...")`, không cần tự định nghĩa response type — tất cả tự
động khớp với [`assistant.router.ts`](../src/modules/assistant/assistant.router.ts) ở
server.

**Nhưng lượt chat thật sự (gửi câu hỏi, nhận câu trả lời) KHÔNG đi qua tRPC** — nó là 1
"Route Handler" thường của Next.js tại
[`src/app/api/assistant/chat/route.ts`](../src/app/api/assistant/chat/route.ts). Lý do:
thư viện `@ai-sdk/react`'s `useChat()` cần nhận về 1 luồng streaming (mục 4) theo đúng
định dạng riêng của nó, và cách nhận này khớp tự nhiên với 1 route handler trả về
`Response` thô hơn là qua tRPC. Đây là ngoại lệ duy nhất, có chủ đích, được ghi chú rõ
ngay trong file `route.ts`.

Tóm lại: **danh sách phiên chat, đổi tên, xoá phiên** → tRPC (nằm trong
`assistant.router.ts`). **Gửi câu hỏi, nhận câu trả lời streaming** → route handler
riêng.

---

## 8. Kiến trúc DDD của dự án — vì sao chia nhiều lớp vậy?

Toàn bộ module `assistant` (cũng như mọi module khác trong Goimon) chia làm 4 lớp, mỗi
lớp có 1 trách nhiệm rõ ràng và **quy tắc ai được import gì**:

```
src/modules/assistant/
  domain/           # Định nghĩa "khái niệm" thuần TypeScript — KHÔNG import Drizzle
  application/      # "Usecase" — điều phối nghiệp vụ, gọi qua interface repository
  infrastructure/   # Nơi DUY NHẤT được dùng Drizzle thật (schema, query, tool logic)
  ui/               # Component React (chart, diagram)
  assistant.router.ts  # tRPC router — chỉ gọi usecase, không tự query DB
```

Vì sao chia vậy thay vì viết tất cả vào 1 file? Ví dụ cụ thể: hàm
`listSessions` ở [`application/list-sessions.usecase.ts`](../src/modules/assistant/application/list-sessions.usecase.ts)
chỉ biết "có 1 `repository` với hàm `listSessions()`" — nó KHÔNG biết bên dưới là
Postgres, Drizzle, hay bất kỳ công nghệ gì. Lợi ích:
- Muốn viết unit test cho usecase? Đưa vào 1 "repository giả" (không cần database thật).
- Muốn đổi từ Postgres sang database khác sau này? Chỉ cần viết lại
  `infrastructure/assistant.drizzle-repository.ts`, các lớp trên không đổi 1 dòng.
- Đọc `application/*.usecase.ts` là hiểu ngay "hệ thống làm được những gì" mà không bị
  rối bởi chi tiết SQL.

Module `assistant` có tầng `domain/` khá "mỏng" (không có nhiều logic nghiệp vụ phức
tạp như state machine của `Order`) — điều đó bình thường, vì bản chất tính năng này gần
với "lưu trữ + truy vấn" hơn là 1 quy trình nghiệp vụ nhiều bước.

---

## 9. Vì sao tool truy vấn dữ liệu phải cực kỳ an toàn?

Đây là phần **quan trọng nhất** của toàn bộ tính năng — cho phép 1 AI tự viết truy vấn
dữ liệu là một rủi ro bảo mật thật sự nếu không kiểm soát chặt.

### 3 lớp phòng thủ (`run-structured-query.ts`)

File
[`run-structured-query.ts`](../src/modules/assistant/infrastructure/query-tool/run-structured-query.ts)
biến JSON model gửi lên thành 1 câu truy vấn Postgres thật, qua các bước:

1. **Whitelist bảng** ([`table-registry.ts`](../src/modules/assistant/infrastructure/query-tool/table-registry.ts)):
   chỉ 12 bảng nghiệp vụ được liệt kê sẵn (`orders`, `menu_items`, `promotions`...) mới
   được phép truy vấn. Bảng chứa dữ liệu nhạy cảm (`users`, `sessions`, `accounts` —
   chứa mật khẩu đã mã hoá, số điện thoại) **hoàn toàn không có trong danh sách** — model
   có yêu cầu cũng không thể chạm tới.

   Ví dụ đã test thật:
   ```
   ❌ { table: "users", columns: ["id"] }
   → "Bảng users không được phép truy vấn."
   ```

2. **Whitelist cột theo từng bảng**: cột không tồn tại (hoặc gõ sai tên) bị chặn ngay,
   KHÔNG đoán bừa. Ví dụ đã test:
   ```
   ❌ { table: "orders", columns: ["id", "cotKhongTonTai"] }
   → "Cột cotKhongTonTai không tồn tại trong bảng orders."
   ```
   Danh sách cột hợp lệ được **tự động lấy ra từ chính Drizzle schema**
   (`getTableColumns()`), không viết tay 2 lần — nếu sau này bạn thêm 1 cột mới vào
   `order.schema.ts`, tool này tự động biết cột đó tồn tại, không cần sửa gì thêm.

3. **Join phải có khoá ngoại thật**: model không được tự ý "join" 2 bảng bất kỳ để dò mối
   liên hệ không có thật giữa dữ liệu — chỉ cho phép join nếu 2 bảng đó **thật sự** có
   khoá ngoại nối với nhau trong schema (`getTableConfig(table).foreignKeys`). Ví dụ đã
   test:
   ```
   ❌ join orders với printers qua orders.id = printers.id
   → "Không có khoá ngoại nào liên kết orders và printers."
   ```

4. **Chống SQL injection bằng thiết kế, không phải bằng "lọc chuỗi"**: mọi điều kiện
   filter được dựng bằng các hàm sẵn có của Drizzle (`eq()`, `gt()`, `like()`,
   `inArray()`...) — những hàm này tự động dùng **tham số hoá** (parameterized query),
   nghĩa là giá trị người dùng/model đưa vào luôn được Postgres coi là DỮ LIỆU, không
   bao giờ được coi là 1 phần câu lệnh SQL. Đây là lý do dự án **không có** chỗ nào ghép
   chuỗi kiểu `` `SELECT * FROM ${table}` `` — cách ghép chuỗi đó chính là nguồn gốc phổ
   biến nhất của lỗi SQL injection.

5. **Giới hạn số dòng trả về**: dù model yêu cầu `limit: 999999`, Zod đã chặn còn tối đa
   200 (mục 5), và code còn tự `Math.min(limit, 200)` lần nữa cho chắc — nguyên tắc
   "phòng thủ nhiều lớp" (defense in depth): dù 1 lớp có lỗi, lớp sau vẫn chặn được.

6. **Chỉ đọc, không bao giờ ghi**: file `run-structured-query.ts` chỉ được phép gọi
   `db.select(...)` — không có dòng nào gọi `db.insert`, `db.update`, hay `db.delete`.
   Bạn có thể tự kiểm tra điều này bất cứ lúc nào bằng lệnh:
   ```bash
   grep -n "db.insert\|db.update\|db.delete" src/modules/assistant/infrastructure/query-tool/run-structured-query.ts
   ```
   Nếu lệnh này không in ra dòng nào, nghĩa là tool vẫn đảm bảo read-only.

7. **Ghi log mọi lượt truy vấn**: mỗi lần tool `query_data` chạy, hệ thống ghi lại vào
   bảng `activity_logs` (bảng, cột, filter đã dùng) — nếu sau này nghi ngờ có gì bất
   thường, bạn có thể tra lại chính xác AI đã "nhìn" vào dữ liệu gì.

### Việc CHƯA làm (có thể làm sau nếu cần thêm 1 lớp an toàn)

Hiện tại tool này dùng chung 1 kết nối database với toàn bộ ứng dụng. Một bước an toàn
hơn nữa (không bắt buộc ở quy mô hiện tại) là tạo riêng 1 "role" trong Postgres chỉ có
quyền `SELECT`, dùng riêng cho tool này — để dù code có lỗi, database tự nó cũng từ chối
mọi câu lệnh ghi. Việc này chưa cấp thiết vì tính năng đang giới hạn chỉ admin dùng.

---

## 10. Cách chạy & tự kiểm tra tính năng

### Chạy dự án
```bash
npm run dev          # chạy ở http://localhost:4466
```
Đăng nhập bằng tài khoản admin đã seed sẵn (số điện thoại + mật khẩu giống nhau, xem
`src/server/db/seed.ts` nếu quên). Vào menu bên trái → nhóm "Quản trị" → "Trợ lý AI".

### Xem dữ liệu đã lưu
```bash
npm run db:studio
```
Mở bảng `assistant_sessions` / `assistant_messages` để xem từng phiên/tin nhắn đã lưu
dưới dạng JSON thật — hữu ích khi muốn hiểu chính xác cấu trúc dữ liệu được lưu.

### Kiểm tra nhanh tool query_data KHÔNG cần gọi thật OpenAI
Vì tool này chỉ là 1 hàm TypeScript bình thường (`runStructuredQuery`), bạn có thể gọi
thử trực tiếp bằng 1 script nhỏ (không tốn tiền gọi OpenAI):
```ts
// scratch-test.ts (xoá sau khi test xong)
import { runStructuredQuery } from "./src/modules/assistant/infrastructure/query-tool/run-structured-query";

const result = await runStructuredQuery(
  { table: "orders", aggregate: [{ fn: "count", alias: "total" }], limit: 50, offset: 0 },
  "id-user-that-exists",
);
console.log(result);
```
```bash
npx tsx scratch-test.ts
```

### Phân quyền
Tính năng này CHỈ hiện với tài khoản `role = "admin"`. Nếu đăng nhập bằng tài khoản
`manager`, mục "Trợ lý AI" sẽ không hiện trên menu, và nếu cố vào thẳng URL
`/quan-ly/tro-ly-ai` sẽ bị chuyển hướng về `/quan-ly` ngay ở server (đã tự tay kiểm
chứng điều này lúc xây dựng tính năng).

---

## 11. Các khái niệm phía giao diện (UI)

- **`useChat()`** (từ `@ai-sdk/react`): hook React quản lý toàn bộ trạng thái 1 cuộc
  trò chuyện — danh sách tin nhắn, trạng thái đang gõ/đang chờ (`status`), hàm gửi tin
  nhắn (`sendMessage`). Bạn không cần tự quản lý state này bằng `useState` thủ công.
- **`DefaultChatTransport`**: cấu hình `useChat()` gửi request tới URL nào
  (`/api/assistant/chat`) và kèm theo dữ liệu gì (`sessionId`) — xem
  [`chat-panel.tsx`](../src/app/quan-ly/tro-ly-ai/chat-panel.tsx).
- **"Parts" của 1 tin nhắn**: 1 tin nhắn không phải lúc nào cũng chỉ là chữ — nó có thể
  gồm nhiều "phần" (text, tool-call, tool-result) ghép lại theo đúng thứ tự đã diễn ra.
  Component [`message-part.tsx`](../src/app/quan-ly/tro-ly-ai/message-part.tsx) render
  từng phần tuỳ theo loại (`part.type`) — vd phần `tool-query_data` chỉ hiện 1 chip nhỏ
  "Đã tra cứu dữ liệu", không hiện chi tiết kỹ thuật.
- **2 tầng gọi API khác nhau trên cùng 1 trang** (mục 7): danh sách phiên chat dùng tRPC
  (`api.assistant.listSessions.useQuery()`), còn nội dung chat dùng `useChat()` gọi
  route handler riêng — đây là điều duy nhất "khác thường" so với các trang khác trong
  Goimon, và lý do đã giải thích ở mục 7.

---

## 12. Những gì CHƯA làm / có thể mở rộng sau

- **Markdown rendering**: câu trả lời hiện đang hiển thị dạng chữ thường (có xuống
  dòng), chưa render đậm/nghiêng/bullet-list dù model có thể trả lời theo markdown. Có
  thể thêm thư viện `react-markdown` sau nếu cần.
- **Rate limit dùng bộ nhớ trong (`Map`)**: chỉ đúng khi chạy 1 tiến trình server duy
  nhất — nếu sau này deploy nhiều instance (load balancing), cần chuyển sang lưu ở
  Redis hoặc database.
- **Dashboard thống kê chi phí** hiện tính theo giá `gpt-4.1` cứng trong code — nên
  kiểm tra lại giá thật trên trang giá của OpenAI trước khi dùng con số này để báo cáo
  chính thức, vì giá có thể thay đổi.
- **Postgres role riêng chỉ có quyền SELECT** cho tool `query_data` (mục 9) — lớp phòng
  thủ bổ sung, chưa cấp thiết ở quy mô hiện tại.
