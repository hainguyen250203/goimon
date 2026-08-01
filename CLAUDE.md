# Goimon — CLAUDE.md

Hệ thống POS quản lý nhà hàng: order món, tạo hóa đơn, in bill, xác nhận thanh toán thủ công (tiền mặt / chuyển khoản ngoài hệ thống). **Không tích hợp cổng thanh toán hay API ngân hàng.**

## Nguồn tham khảo (chỉ đọc, không copy)

- `../pos-be` và `../pos-fe`: dùng để tham khảo UI và business flow hiện có.
- **Cấm** copy code, copy cấu trúc thư mục, hoặc kế thừa pattern từ hai repo này. Toàn bộ code trong `goimon` viết mới từ đầu, tuân theo kiến trúc mô tả bên dưới.
- `alix-bo-frontend-v2` (repo Chakra UI v3 khác của cùng tổ chức): tham khảo UX layout (admin shell/sidebar/header) và pattern Chakra thật (theme `system.ts`, `EmotionRegistry`, snippet `components/ui/*`) — được phép lấy trực tiếp pattern/API vì cùng stack Chakra, khác `pos-be`/`pos-fe` (khác hẳn stack, chỉ được tham khảo cấu trúc/UX).

## Tech stack (bắt buộc)

- **Scaffold**: T3 Stack (https://create.t3.gg) — Next.js App Router + tRPC + TypeScript.
- **UI**: Chakra UI v3 (Ark UI based) + `next-themes` cho color mode. Không dùng Tailwind CSS.
  - Component dùng chung sinh qua CLI chính thức (`npx @chakra-ui/cli snippet add <name>`), đặt ở `src/components/ui/` — sửa icon từ `react-icons` sang `lucide-react` cho khớp icon library cả app đang dùng.
  - Bo góc toàn app chỉnh qua 3 semantic token `l1`/`l2`/`l3` (6/8/12px) trong `src/lib/theme/system.ts` — cố tình bo nhẹ, không dùng `xl`/`2xl`/`full` cho container.
  - **Bắt buộc** có `EmotionRegistry` (`src/components/ui/emotion-registry.tsx`, pattern SSR chuẩn của Next.js cho Emotion) bọc ngoài cùng `ChakraProvider` trong root layout — Chakra v3 vẫn dùng Emotion's `<Global>` cho global styles, thiếu registry này gây hydration mismatch thật (React error #418), không phải cảnh báo vô hại.
- **Database**: PostgreSQL + Drizzle ORM.
- **Validation**: Zod, kết hợp `drizzle-zod` để sinh schema từ table (không tự tay viết lại schema Zod trùng với schema DB).
  - Ngoại lệ: `drizzle-zod@0.8` sinh schema kiểu `zod/v4`, không `.extend()`/`.omit()` tương thích với `z` (zod v3 classic) mà cả app dùng — kể cả khi trỏ `zodInstance` về `z` qua `createSchemaFactory`. Với input CRUD cần `.extend()` (vd: thêm `id` cho update), viết tay `z.object({...})` thay vì sinh từ drizzle-zod.
- **State**:
  - Zustand **chỉ** cho client/UI state (ví dụ: giỏ order đang chọn trên UI trước khi submit, trạng thái mở/đóng dialog, tab đang active).
  - Server state (data từ DB) do tRPC + TanStack Query đảm nhiệm.
  - **Cấm** đưa data fetching hoặc cache server data vào Zustand store.
- **Auth**: BetterAuth cho cả authentication và authorization, tích hợp theo chuẩn T3.

## Nghiệp vụ thanh toán

- Không có tích hợp cổng thanh toán. Khách tự thanh toán ngoài hệ thống (tiền mặt hoặc chuyển khoản), nhân viên xác nhận thủ công.
- **Không có entity "hóa đơn" (invoice) riêng** — `order` tự mang toàn bộ vòng đời từ gọi món đến thanh toán, vì order↔invoice luôn là quan hệ 1:1 và cùng một vòng đời, tách 2 entity là dư thừa.
- Trạng thái `order` tối thiểu: `open` (đang gọi món/chờ thanh toán) → `paid` / `cancelled`.
- **In hoá đơn (`printBill()`) là 1 hành động ĐỘC LẬP, không phải điều kiện tiên quyết để thanh
  toán** — chỉ set `printedAt`/tính lại `totalAmount`, không ràng buộc gì với `confirmPayment()`.
  Đã từng bắt buộc phải in trước khi thanh toán — bỏ theo yêu cầu người dùng, in hay không không
  liên quan tới việc xác nhận thanh toán.
- Rule nghiệp vụ nằm trong entity `Order`, không phải constraint DB:
  - `printBill()`: chỉ hợp lệ khi đang `open` — tính lại `totalAmount` từ các món hiện tại, set
    `printedAt`. In lại bao nhiêu lần cũng được khi đơn còn `open`.
  - `addItem()/updateItem()/removeItem()`: nếu đã in (`printedAt` khác null) thì xoá `printedAt` để
    phải in lại nếu muốn hoá đơn khớp món mới — không đổi status, không ảnh hưởng thanh toán.
  - `confirmPayment(staffId)`: chỉ hợp lệ khi đang `open` → `paid`, ghi lại `paidConfirmedBy` và
    `paidConfirmedAt` — KHÔNG yêu cầu đã in bill. Gọi khi không phải `open` phải throw domain error,
    không đổi state. Không có trạng thái nào tự động chuyển thành `paid`.
  - `cancel()`: hợp lệ từ `open` → `cancelled`.
- Mọi query tính doanh thu/số liệu đơn hàng phải lọc `isNull(order.deletedAt)` — đơn xoá mềm
  không được tính vào bất kỳ KPI/báo cáo nào. Doanh thu đơn `open` (chưa thanh toán) PHẢI tính
  "sống" từ `sum(orderItem.unitPrice * orderItem.quantity)` (join `orderItem`), KHÔNG được dùng
  `order.totalAmount` — cột này `null` tới khi `printBill()`/`confirmPayment()` chạy, nên đơn
  `open` chưa từng in sẽ bị tính thiếu/bằng 0. Xem `order.drizzle-repository.ts`'s
  `getShiftOrderStats()`/`listActive()`.

## Route guard & trang danh sách

- `/quan-ly/layout.tsx` chỉ chặn role `user` (đẩy sang `/goi-mon`), không phân biệt `manager` vs `admin`. Route admin-only (vd: `nguoi-dung`, `bao-cao`) phải tự check `session.user.role !== "admin"` và `redirect("/quan-ly")` ngay trong `page.tsx` — nếu không, `manager` vẫn vào được UI nhưng mọi gọi tRPC (`adminProcedure`) đều FORBIDDEN, kẹt loading vô thời hạn thay vì bị chặn rõ ràng.
- Trang danh sách có phân trang/filter: dùng `useQuery` + `placeholderData: keepPreviousData` (KHÔNG `useSuspenseQuery`) cho query đó — Suspense không có khái niệm giữ data cũ trong lúc fetch data mới. Điều hướng phân trang/filter phải qua `router.push` (client-side), không dùng `<a href>` thô — gây full page reload, nháy trắng màn hình.
- **`superadmin` là vai trò giám sát ẨN — cấm tuyệt đối để lộ sự tồn tại của nó** ra bất kỳ
  text/UI nào mà người xem không phải superadmin nhìn thấy được (dialog xác nhận, toast, tooltip,
  label, error message...), kể cả gián tiếp qua câu chữ — vd dialog xoá đơn từng ghi "hành động này
  chỉ superadmin xem lại được" là sai, vì ngay việc nhắc TÊN role đã xác nhận nó tồn tại cho admin
  đọc thấy. Chặn truy cập phải luôn ở tầng server (không chỉ ẩn ở UI), và không bao giờ trả lỗi xác
  nhận role này có thật cho non-superadmin — trả kết quả rỗng thay vì `FORBIDDEN` (xem
  `user.router.ts`'s `list`).

## Responsive / Mobile

- Bất kỳ layout nhiều cột tự viết riêng cho 1 trang (không phải sidebar điều hướng chính của `AdminShell`) — ví dụ sidebar danh sách phiên + khung chat của Trợ lý AI — đều phải tự thu gọn trên mobile: ẩn cột phụ bằng `display={{ base: "none", md: "..." }}`, thay bằng nút mở `Drawer` (`~/components/ui/drawer`) khi cần xem, đúng pattern `AdminShell` đã dùng cho sidebar điều hướng chính. Không bao giờ để 2 cột tự co lại chia đôi màn hình hẹp — chữ bị bóp xuống dòng liên tục, không đọc được.
- `ListViewPagination`: trên mobile chỉ hiện nút Trước/Sau + dòng "Trang X/Y — N kết quả" (`display={{ base: "none", sm: "..." }}` cho `PaginationFirstTrigger`/`PaginationLastTrigger`/danh sách số trang) — hiện đầy đủ từ `sm` trở lên. Danh sách số trang dễ tràn dòng trên màn hình hẹp nếu hiện hết.
- Lưới `KpiCard` nhiều ô: mobile vẫn nên chia **2 cột** (`templateColumns={{ base: "repeat(2, 1fr)", ... }}`), KHÔNG dùng `base: "1fr"` (1 cột) — mỗi card 1 dòng riêng làm trang dài lê thê, UX kém. Xem `src/app/quan-ly/bao-cao/report-view.tsx`/`dashboard-overview.tsx`.
- Mọi input chỉ nhận số nguyên (số lượng, giá, SĐT, port, số tài khoản...) phải dùng
  `NumericInput` (`src/components/ui/numeric-input.tsx`) thay vì `Input` với
  `type="number"`/`type="tel"` — ép bàn phím số trên mobile qua `inputMode="numeric"` +
  `pattern="[0-9]*"` (dùng `type="text"` bên dưới để tránh nút tăng/giảm và ký tự +/-/e mà
  `type="number"` vẫn hiện trên nhiều trình duyệt mobile). `min`/`max` truyền vào chỉ mang
  tính tài liệu, không được trình duyệt tự enforce trên `type="text"` — nơi gọi phải tự
  validate qua JS/Zod như hiện tại.
- Biểu đồ `echarts-for-react`: **luôn** bọc qua `EchartBox` (`src/app/quan-ly/bao-cao/ui/echart-box.tsx`), không tự viết `<ReactECharts>` trần. `EchartBox` nhận prop `buildOption(containerWidth)` (hàm), KHÔNG nhận `option` tĩnh — bên trong tự đo chiều rộng THẬT của container bằng `ResizeObserver` rồi gọi `buildOption(width)` + `setOption(..., notMerge: true)` mỗi khi resize. Lý do không dùng `useBreakpointValue`/breakpoint Chakra cho fontSize/margin của chart: breakpoint dựa theo viewport toàn trang, không phải kích thước container chart thực tế (co cửa sổ, đổi số cột Grid không kèm sự kiện breakpoint rõ ràng); còn `chart.resize()` một mình chỉ vẽ lại theo kích thước mới nhưng vẫn dùng option cũ (fontSize/width nhãn "đóng băng" lúc mount) — phải đo width thật + build lại toàn bộ option + `notMerge` mới chắc chắn đúng ngay, không cần F5.

## Kích thước component (size/fontSize)

- Mọi control tương tác trong trang quản lý (`Input`, `Select`/`SelectRoot`, `Button`, `IconButton`) đều dùng `size="sm"` — đây là size mặc định thống nhất toàn app `quan-ly`, không dùng size mặc định của Chakra (thường là `md`, to hơn rõ rệt). Khi thêm 1 control mới nằm cùng hàng với control khác (vd filter/toolbar), **luôn tự set `size="sm"` tường minh** — Chakra không tự đồng bộ size giữa các component khác nhau, để mặc định dễ bị lệch cỡ so với các control lân cận (từng xảy ra: `Select` filter danh mục thiếu `size="sm"` trong khi `Input` ngày cùng hàng đã set, làm 2 control lệch cỡ rõ rệt).
- `fontSize` nên khai báo dạng responsive object theo breakpoint (`fontSize={{ base: "xs", md: "sm" }}`) ở bất kỳ đâu chữ cần đọc được tốt trên cả mobile lẫn desktop, thay vì 1 giá trị cố định cho mọi màn hình — theo đúng breakpoint `base/sm/md/lg/xl` Chakra đã dùng thống nhất trong toàn app (xem mục Responsive/Mobile). Riêng chữ **trong biểu đồ echarts** (title/legend/axisLabel) không phải Chakra component nên không tự nhận prop responsive — phải tự tính bằng `useBreakpointValue({ base: ..., md: ... })` **trước** early-return của component (React không cho gọi hook sau early-return) rồi gán vào `textStyle.fontSize`/`axisLabel.fontSize` của option.

## Đặt tên field/type phân loại

- Khi thêm 1 trường phân loại "đây là loại/kiểu gì" cho 1 entity (vd: máy in dùng cho hoá đơn hay bếp, khuyến mãi giảm % hay giảm tiền cố định...), đặt tên là `type` (hoặc `{Entity}Type`, vd `PrinterType`, `DiscountType`) — **không** đặt là `role`.
- `role` chỉ dùng cho đúng 2 khái niệm đã có sẵn: vai trò phân quyền người dùng (`Role`: `"user"|"manager"|"admin"`, xem `nav-config.ts`) và vai trò người tham gia hội thoại AI (`message.role`, đúng tên field gốc của AI SDK/OpenAI — không tự đổi tên field này khi bọc lại type, vd `AssistantMessageRole = UIMessage["role"]` ở `message-part.tsx`). Ngoài 2 trường hợp này, dùng `role` cho 1 field phân loại mới là sai tên, dễ gây nhầm với phân quyền.

## Quy tắc tổ chức code

1. **Server Component mặc định.**
   - `"use client"` chỉ đặt ở component lá nhỏ nhất thực sự cần interactivity (state, event handler, effect, browser API).
   - Cấm biến cả page/layout thành client component chỉ vì một nút bấm hay một handler — tách phần cần interactivity ra component con, giữ page/layout là Server Component.

2. **Chia folder theo module/feature**, không chia theo loại file toàn cục (không có `components/`, `hooks/`, `services/` dùng chung cho toàn app ở root).
   - Ví dụ module: `modules/order`, `modules/menu`, `modules/table`, `modules/printer`, `modules/activity-log`, `modules/report`.
   - Code dùng chung thật sự cross-module (UI primitive từ Chakra snippet, utils thuần) mới đặt ở `src/components/ui`, `src/lib`.

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
  - Research/search: tra docs (BetterAuth, Drizzle, Chakra UI...), tìm hiểu codebase,
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
