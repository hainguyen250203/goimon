# Goimon — CLAUDE.md

Hệ thống POS quản lý nhà hàng: order món, tạo hóa đơn, in bill, xác nhận thanh toán thủ công (tiền mặt / chuyển khoản ngoài hệ thống). **Không tích hợp cổng thanh toán hay API ngân hàng.**

## Nguồn tham khảo (chỉ đọc, không copy)

- `../pos-be` và `../pos-fe`: dùng để tham khảo UI và business flow hiện có.
- **Cấm** copy code, copy cấu trúc thư mục, hoặc kế thừa pattern từ hai repo này. Toàn bộ code trong `goimon` viết mới từ đầu, tuân theo kiến trúc mô tả bên dưới.

## Tech stack (bắt buộc)

- **Scaffold**: T3 Stack (https://create.t3.gg) — Next.js App Router + tRPC + TypeScript.
- **UI**: shadcn/ui + Tailwind CSS.
- **Database**: PostgreSQL + Drizzle ORM.
- **Validation**: Zod, kết hợp `drizzle-zod` để sinh schema từ table (không tự tay viết lại schema Zod trùng với schema DB).
- **State**:
  - Zustand **chỉ** cho client/UI state (ví dụ: giỏ order đang chọn trên UI trước khi submit, trạng thái mở/đóng dialog, tab đang active).
  - Server state (data từ DB) do tRPC + TanStack Query đảm nhiệm.
  - **Cấm** đưa data fetching hoặc cache server data vào Zustand store.
- **Auth**: BetterAuth cho cả authentication và authorization, tích hợp theo chuẩn T3.

## Nghiệp vụ thanh toán

- Không có tích hợp cổng thanh toán. Khách tự thanh toán ngoài hệ thống (tiền mặt hoặc chuyển khoản), nhân viên xác nhận thủ công.
- **Không có entity "hóa đơn" (invoice) riêng** — `order` tự mang toàn bộ vòng đời từ gọi món đến thanh toán, vì order↔invoice luôn là quan hệ 1:1 và cùng một vòng đời, tách 2 entity là dư thừa.
- Trạng thái `order` tối thiểu: `open` (đang gọi món) → `printed` (đã in bill, chờ thanh toán) → `paid` / `cancelled` (hủy được từ `open` hoặc `printed`).
- Rule nghiệp vụ nằm trong entity `Order`, không phải constraint DB:
  - `printBill()`: `open→printed` hoặc `printed→printed` (in lại) — tính lại `totalAmount` từ các món hiện tại, set `printedAt`.
  - `addItem()/updateItem()/removeItem()`: nếu đang `printed` thì tự động quay về `open` (phải in lại mới thanh toán được).
  - `confirmPayment(staffId)`: chỉ hợp lệ khi đang `printed` → `paid`, ghi lại `paidConfirmedBy` và `paidConfirmedAt`. Gọi khi không phải `printed` phải throw domain error, không đổi state. Không có trạng thái nào tự động chuyển thành `paid`.
  - `cancel()`: hợp lệ từ `open` hoặc `printed` → `cancelled`.

## Quy tắc tổ chức code

1. **Server Component mặc định.**
   - `"use client"` chỉ đặt ở component lá nhỏ nhất thực sự cần interactivity (state, event handler, effect, browser API).
   - Cấm biến cả page/layout thành client component chỉ vì một nút bấm hay một handler — tách phần cần interactivity ra component con, giữ page/layout là Server Component.

2. **Chia folder theo module/feature**, không chia theo loại file toàn cục (không có `components/`, `hooks/`, `services/` dùng chung cho toàn app ở root).
   - Ví dụ module: `modules/order`, `modules/menu`, `modules/table`, `modules/printer`, `modules/activity-log`, `modules/report`.
   - Code dùng chung thật sự cross-module (UI primitive từ shadcn, utils thuần) mới đặt ở `src/components/ui`, `src/lib`.

3. **Mỗi action/mutation là một file/hàm riêng, nhỏ và đơn nhiệm.**
   - Không gộp nhiều nghiệp vụ vào một action lớn.
   - Ví dụ trong module `order`: `addOrderItem`, `updateOrderItem`, `removeOrderItem`, `printOrder`, `confirmPayment`, `cancelOrder` là các usecase/action riêng biệt, mỗi cái một file.

## Kiến trúc Domain-Driven Design

Mỗi module trong `modules/*` phân tầng rõ ràng theo 3 lớp:

- **`domain/`** — entities: object TypeScript thuần chứa nghiệp vụ.
  - **Cấm** import Drizzle hoặc bất kỳ thư viện DB nào.
  - **Cấm** chứa field/kiểu dữ liệu đặc thù của DB (không có `createdAt: Date` kiểu Drizzle column, không có foreign key raw).
  - Mọi thay đổi trạng thái diễn ra trên entity trong memory, có validate nghiệp vụ ngay trong method của entity.
  - Ví dụ: `order.confirmPayment(staffId)` phải tự kiểm tra order đang ở trạng thái `printed` trước khi chuyển sang `paid`; nếu không hợp lệ thì throw domain error, không đổi state.

- **`application/`** (usecases) — điều phối nghiệp vụ.
  - Gọi repository qua **interface**, không biết chi tiết implementation DB.
  - Load entity → gọi method nghiệp vụ trên entity → gọi `repository.save()`.
  - Không chứa Drizzle, không chứa SQL, không chứa query.

- **`infrastructure/`** (repositories) — nơi **duy nhất** được dùng Drizzle.
  - Nhận entity từ application layer, map entity → row để persist (insert/update).
  - Đọc row từ DB, map row → entity khi trả về cho application layer.
  - Implement interface đã định nghĩa ở `application/` (hoặc `domain/`).

- **Flow chuẩn bắt buộc**:
  `load entity từ repository → xử lý nghiệp vụ trên entity trong memory → gọi repository.save() để persist`.
  **Cấm** gọi Drizzle rải rác trong usecase, React component, hay tRPC router. tRPC router chỉ được gọi usecase, không tự query DB.

## Cấu trúc thư mục mẫu — module `order`

```
src/
  modules/
    order/
      domain/
        order.entity.ts           # class/object Order, method printBill(), confirmPayment(), cancel(), addItem()...
        order-status.ts           # enum/union: 'open' | 'printed' | 'paid' | 'cancelled'
        order.repository.ts       # interface OrderRepository (không import Drizzle)
        order.errors.ts           # domain errors, ví dụ InvalidStatusTransitionError

      application/
        add-order-item.usecase.ts
        update-order-item.usecase.ts
        remove-order-item.usecase.ts
        print-order.usecase.ts
        confirm-payment.usecase.ts
        cancel-order.usecase.ts
        get-order.usecase.ts

      infrastructure/
        order.drizzle-repository.ts   # implements OrderRepository, dùng Drizzle
        order.mapper.ts                # map entity <-> DB row (order, order_item, order_event)
        order.schema.ts                # Drizzle table (order, order_item, order_event) + drizzle-zod schema

      ui/
        order-list.tsx              # Server Component mặc định
        order-detail.tsx
        confirm-payment-button.tsx  # "use client" — component lá cần interactivity

      order.router.ts               # tRPC router, chỉ gọi các usecase ở application/
```

Áp dụng cấu trúc tương tự cho `modules/menu`, `modules/table`, `modules/printer`, `modules/activity-log`, `modules/report`.

## Checklist khi thêm tính năng mới

- [ ] Entity mới/thay đổi nghiệp vụ đặt ở `domain/`, không import Drizzle.
- [ ] Mỗi action là một usecase riêng trong `application/`.
- [ ] Chỉ `infrastructure/` được import và dùng Drizzle.
- [ ] tRPC router chỉ gọi usecase, không query DB trực tiếp.
- [ ] Component mặc định là Server Component; `"use client"` chỉ ở component lá cần interactivity.
- [ ] Server state qua tRPC + TanStack Query; Zustand chỉ chứa UI state, không chứa data fetch.
- [ ] Validation dùng Zod, ưu tiên sinh từ `drizzle-zod` khi schema khớp với DB table.
- [ ] Không có code nào import hoặc copy trực tiếp từ `pos-be` / `pos-fe`.

## Tự cải tiến CLAUDE.md theo thời gian

- CLAUDE.md là tài liệu sống. Sau mỗi task đáng kể, nếu phát hiện một trong các điều sau thì PHẢI đề xuất cập nhật CLAUDE.md:
  - Một convention mới đã được thống nhất trong quá trình làm (naming, cấu trúc file, pattern xử lý lỗi...).
  - Một sai lầm đã mắc phải và cách tránh — ghi thành rule để không lặp lại.
  - Một rule hiện có bị mơ hồ, gây hiểu sai, hoặc đã lỗi thời so với codebase.
- Quy trình: đề xuất diff thay đổi CLAUDE.md để tôi duyệt, KHÔNG tự ý sửa.
- Giữ CLAUDE.md ngắn gọn: rule mới phải súc tích, dạng imperative; nếu thêm rule mới
  mà có rule cũ trùng lặp hoặc hết giá trị thì đề xuất xóa/gộp. Độ dài file không
  được phình ra vô hạn.

## Luôn chạy song song nhiều agent

- Mặc định PHẢI dùng nhiều subagent chạy song song thay vì tuần tự một mình, đặc biệt:
  - Research/search: tra docs (BetterAuth, Drizzle, shadcn...), tìm hiểu codebase,
    đọc repo tham khảo pos-be/pos-fe → tách thành nhiều agent search song song,
    mỗi agent một chủ đề.
  - Các task độc lập không đụng chung file: ví dụ scaffold module `menu` và module
    `table`, hoặc viết unit test cho nhiều entity khác nhau → giao cho các agent
    song song.
  - Khảo sát trước khi sửa lớn: một agent đọc schema, một agent trace luồng gọi,
    một agent tìm chỗ ảnh hưởng.
- Ngoại lệ (phải chạy tuần tự): các thay đổi đụng chung một file hoặc phụ thuộc
  kết quả của nhau (vd: phải có schema DB trước rồi mới viết repository).
  Không bao giờ cho 2 agent cùng sửa một file.
- Trước mỗi task lớn: lập kế hoạch chia việc, ghi rõ nhánh nào song song được,
  nhánh nào phải tuần tự, rồi mới thực thi.
