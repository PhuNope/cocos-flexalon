# Changelog — Flexalon Cocos Creator

Những thay đổi đáng chú ý của các bản phát hành ổn định.

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
