# Cập nhật từ Flexalon Cocos 0.4.x sang 0.5.0 (một extension)

## Dự án mới

Copy duy nhất thư mục `flexalon-tools` vào `<project>/extensions/`, bật Extension Manager. Runtime đã nằm trong thư mục `extensions/flexalon-tools/assets/flexalon`; **không** copy sang `<project>/assets/flexalon`.

## Dự án cũ đã sử dụng `assets/flexalon`

Cần ưu tiên UUID: các scene và prefab Cocos có thể tham chiếu `.meta` cũ. Một số file `.ts` của các bản ZIP cũ không mang theo `.meta`, khiến từng dự án có UUID tự phát sinh.

1. Sao lưu project và đóng Cocos Editor.
2. Đặt extension mới trong `<project>/extensions/flexalon-tools`.
3. Chạy `node extensions/flexalon-tools/scripts/migrate-legacy.cjs --project <đường-dẫn-project>`.
4. Lệnh sẽ chuyển các UUID có trong `.meta` cũ sang extension, kiểm tra UUID bị trùng, và chuyển `assets/flexalon` ra thư mục dự phòng bên ngoài `assets`.
5. Mở Cocos, bật extension và kiểm tra tất cả Scene/Prefab, Add Component, Preview và Build.
6. Nếu có thành phần mất script, khôi phục bản sao lưu và kiểm tra metadata, đừng xóa dữ liệu dự phòng.

**Không chạy migration trên dự án đang mở bằng Cocos Creator.** Không cài đồng thời runtime cũ và mới. Script không sửa scene/prefab, không xóa backup. Khi cài toàn cục cho nhiều dự án, không sửa metadata package riêng theo một project; sử dụng Project extension để migration.

## Ghi chú

Cách làm này dùng `asset-db.mount` readonly. Khi vô hiệu hoá/gỡ extension, tất cả component Flexalon gắn trong scene sẽ thiếu mã. Hãy giữ extension trong repository hoặc quy trình dựng dự án.
