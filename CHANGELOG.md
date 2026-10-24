# Changelog — Flexalon Cocos Creator

Những thay đổi đáng chú ý của các bản phát hành ổn định.

## v0.5.8 — 2026-10-24

**Phát hành:** 24/10/2026  
**Hỗ trợ:** Cocos Creator 3.8.2 trở lên  
**Nâng cấp từ:** v0.5.7 (Auto Updater hoặc cài ZIP thủ công)

### Sửa cảnh báo Editor: ValueType

- Loại bỏ 19 khai báo `type: Vec3` dư thừa trong decorator `@property` ở 6 component: `FlexalonCurveAnimator` (5), `FlexalonObject` (7), `FlexalonConstraint` (1), `FlexalonCurveLayout` (4), `FlexalonRandomLayout` (1) và `FlexalonRandomModifier` (1).
- Khắc phục nguồn phát sinh cảnh báo `[Scene] No need to specify the "type" ... because cc.Vec3 is a child class of ValueType` khi Editor đọc các property.
- Giữ nguyên tên property, kiểu `Vec3`, giá trị mặc định, `tooltip`, `visible`, logic Inspector và UUID metadata; không yêu cầu thay đổi Scene/Prefab.
- Thêm kiểm thử tự động `tests/value-type-decorators.test.cjs` để ngăn việc khai báo lại `type` dư thừa cho các `ValueType` Cocos thường gặp.

### Không thay đổi

- Không thay đổi thuật toán Layout, Animator, Interaction, Guide và Auto Updater.
- Bản cập nhật tiếp tục sử dụng updater helper để tải, xác minh ZIP, ghi đè, đóng Editor và dọn `temp/`, `library/`, `.flexalon-updater/`.

### Kiểm thử

- Đã chạy kiểm thử tự động trên nhánh `dev` cho các thay đổi decorator; quy trình phát hành tiếp tục kiểm tra build, test, CRC và toàn vẹn ZIP.
- Chưa xác nhận bằng thao tác trực tiếp trong Cocos Creator GUI; có thể kiểm tra lại Console trên Windows/macOS sau khi nâng cấp.

---

## v0.5.7 — 2026-10-23

**Phát hành:** 23/10/2026  
**Hỗ trợ:** Cocos Creator 3.8.2 trở lên  
**Nâng cấp từ:** v0.5.6 (Auto Updater hoặc cài ZIP thủ công)

### Auto Updater — đợi Scene Editor sẵn sàng

- Bắt đầu kiểm tra bản mới từ GitHub Releases khi extension được load; bỏ timer cố định 4 giây trước khi kiểm tra.
- Chỉ hiện popup **Có phiên bản Flexalon mới** sau khi nhận được broadcast `scene:ready` từ Cocos Creator. Nếu Scene Editor đã sẵn sàng khi extension load/reload, kiểm tra trạng thái `scene/query-is-ready` để không bỏ lỡ sự kiện.
- Đồng bộ hai điều kiện *scene ready* và *có bản cập nhật*: GitHub phản hồi trước hay sau scene đều không làm hiện popup quá sớm hoặc bỏ mất popup.
- Giữ chống hiện popup lặp khi đổi scene trong cùng phiên Editor; tôn trọng lựa chọn **Để sau** với release đã bỏ qua.
- Bỏ ngoại lệ chỉ dành cho bản fake `0.5.5-dev.100`. Version chính thức là **0.5.7**.

### Không thay đổi

- Tab **Check Update** trong Guide và kiểm tra thủ công vẫn hoạt động bình thường.
- Helper vẫn tải ZIP release ổn định, xác minh, sao lưu/rollback khi cần, ghi đè extension; yêu cầu Editor đóng, sau đó xoá cache `temp/`, `library/` và toàn bộ `.flexalon-updater/`.
- Không thay đổi runtime layouts, components hay API public; không cần chỉnh Scene/Prefab.

### Kiểm thử

- Bổ sung regression test cho việc chặn popup trước khi scene ready, hiển thị đúng một lần và việc bỏ qua popup đã snooze.
- Build TypeScript, kiểm thử updater/helper và toàn vẹn ZIP tự động trên GitHub Actions.
- Chưa có xác nhận chạy trực tiếp với Cocos Creator GUI trên Windows/macOS; nên lưu Scene và sao lưu project trước khi cập nhật.

---

## v0.5.6 — 2026-10-23

**Phát hành:** 23/10/2026  
**Hỗ trợ:** Cocos Creator 3.8.2 trở lên  
**Nâng cấp từ:** v0.5.5 (Auto Updater hoặc cài ZIP thủ công)

## Điểm mới

### 1. Event-Driven Dirty Layout

- `LayoutBase` theo dõi Node events: thay đổi Content Size, Anchor, thêm/xóa/đổi thứ tự child, active state, component và Scale/Rotation.
- Event chỉ đánh dấu `MarkDirty()`. Layout được đo và sắp xếp lại trong `lateUpdate()` **khi có Dirty**, thay vì chạy `arrangeChildren()` mỗi frame.
- Theo dõi thay đổi property trong Inspector, kể cả `Vec3`, `GridCell`, Gap và Padding; Dirty từ Layout lồng nhau truyền về Layout cha.
- Gỡ listener khi disable; bỏ qua Node Gizmos tạm (`DontSave`) và thay đổi vị trí liên tục của Animator để tránh relayout không cần thiết.
- Giữ nguyên API `ForceUpdate()` và chế độ `autoUpdate = false`.

### 2. Flexalon Interactable — kéo thả chính xác hơn

- **Drag Start:** Đánh dấu Dirty ngay cho Layout nguồn, kể cả khi Node không có `FlexalonObject`.
- **Drag Move:** Chỉ thay đổi Position không kích hoạt relayout liên tục mỗi frame.
- **Drop / Cancel / Disable:** Phục hồi trạng thái `IsDragging`, `skipLayout` và Animator; đánh dấu Dirty cho cả Layout nguồn và Layout đích.
- Hỗ trợ trường hợp kéo Node tạm lên Canvas rồi thả vào Layout khác, đổi thứ tự trong cùng Layout.
- Dùng `finally` để khôi phục trạng thái ngay cả khi DropTarget tùy biến báo lỗi.

### 3. Kiểm thử và tương thích

- Bổ sung regression tests cho Node events, Layout đứng yên, thay đổi Inspector, GridCell, nested layouts, Gizmos, ForceUpdate và kéo thả đa Layout.
- Giữ nguyên các tính năng Auto Updater, Guide, Inspector và bộ Layout hiện có từ v0.5.5.
- Build và test tự động với Cocos Node mô phỏng; **chưa xác minh trực tiếp trong Editor/Windows hay đo benchmark FPS thực tế**.

## Hướng dẫn nâng cấp

1. Lưu các Scene đang chỉnh sửa và sao lưu project.
2. Trong Cocos Creator mở **Extensions → Flexalon → Check for Updates** và chọn **Update Now**; hoặc giải nén ZIP vào `<Project>/extensions/flexalon-tools/`.
3. Nếu dùng Auto Updater, sau khi ghi đè Editor sẽ được yêu cầu đóng. Khi Editor thoát, Helper dọn cache `temp/`, `library/` và toàn bộ `.flexalon-updater/`. Lần mở đầu tiên có thể import tài nguyên lâu hơn.

**Lưu ý:** Chưa có thay đổi bắt buộc về Scene/Prefab hay API public. Nếu đang dùng script tự điều khiển vị trí child thuộc Layout, có thể gọi `MarkDirty()` hoặc `ForceUpdate()` khi muốn Layout tự sắp xếp lại.


---

## v0.5.5

- Tự kiểm tra bản mới từ GitHub Releases, tab Check Update trong Guide Panel và hiển thị tiến trình tải.
- Updater Helper độc lập: xác minh ZIP, sao lưu, ghi đè, rollback khi lỗi.
- Sau khi Editor đóng thành công, dọn `temp/`, `library/` và `.flexalon-updater/`; giữ dữ liệu project.
