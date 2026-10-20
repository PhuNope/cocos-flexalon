# Flexalon Cocos Creator 3.8.2+ — Unified Extension v0.5.2

Đây là **một extension duy nhất**, bao gồm:

- 42 file TypeScript runtime Flexalon (Core, Grid/Flexible/Circle/Curve/Align/Random/Shape Layout, Object, Animation, Cloner, Interaction...).
- Custom Inspector của 18 component Flexalon.
- Guide Panel tiếng Việt với 19 bài hướng dẫn và hình SVG offline.
- Các lệnh Inspect Layouts, Refresh Layouts và Open Guide.
- `.meta` riêng cho tất cả script/directory để UUID ổn định khi nâng cấp.

## Dự án mới: Cài đặt trong 3 bước

1. Giải nén ZIP và đặt **nguyên thư mục** `flexalon-tools` vào `<DỰ_ÁN>/extensions/`.
2. Mở dự án trong **Cocos Creator >= 3.8.2** → Extension Manager → Project → bật/reload `flexalon-tools`. Khởi động lại Creator nếu chưa thấy database.
3. Trong **Assets** tìm database `flexalon-tools`, mở `flexalon/Layouts`; thêm component từ Inspector bằng Add Component → Flexalon hoặc kéo script. Menu Extensions → Flexalon → Open Flexalon Guide để xem hướng dẫn.

**Không cần và không nên copy** `assets/flexalon` của extension sang `assets` dự án. Toàn bộ script được đăng ký qua `contributions.asset-db.mount` và Cocos sẽ biên dịch chúng như game script.

Ví dụ import từ mã dự án:

```ts
import { FlexalonGridLayout } from 'db://flexalon-tools/flexalon/Layouts/FlexalonGridLayout';
```

## Nâng cấp dự án đã dùng v0.4.9 trở xuống

Nếu trong project có `assets/flexalon`, **KHÔNG bật đồng thời bản cũ và bản mới** (trùng class `@ccclass`/UUID). Đóng Creator và sao lưu toàn bộ project trước.

Extension cung cấp công cụ chuyển metadata, giữ UUID cho Scene/Prefab đã tạo:

```bash
node extensions/flexalon-tools/scripts/migrate-legacy.cjs --project "<đường dẫn thư mục project>" --dry-run
node extensions/flexalon-tools/scripts/migrate-legacy.cjs --project "<đường dẫn thư mục project>"
```

Công cụ sao lưu bản cũ bên ngoài `assets`, chuyển UUID theo file `.meta` sang extension rồi vô hiệu hoá thư mục script cũ; không sửa Scene/Prefab và không xoá backup. Chỉ hỗ trợ extension cài trong **Project**, chạy khi Editor đã đóng. Đọc `docs/MIGRATION_VI.md` trước khi chạy.

Mọi thay đổi import đường dẫn tương đối trong script tự viết của dự án (nếu có) cần điều chỉnh về đường dẫn `db://flexalon-tools/...`.

## Vị trí mã và tài liệu

- `assets/flexalon`: mã game runtime.
- `src`, `dist`: Custom Inspector và phần mềm Editor.
- `docs/Flexalon_Guide_VI.html`: sách hướng dẫn offline.
- `docs/MIGRATION_VI.md`: hướng dẫn nâng cấp.
- `scripts/verify-package.cjs`: kiểm tra gói, chạy `npm run verify`.

**Trạng thái QA:** đã biên dịch code TypeScript, chạy mock layout/Inspector/Guide và kiểm thử migrator. Chưa mở bằng Cocos Editor thực tế; đặc biệt cần xác minh import Script, scene/prefab, preview và build của project thực tế trên từng bản 3.8.x.

## Tạo ZIP để đưa lên GitHub Releases

**Trong repo GitHub, để `package.json` và `.github/workflows/release.yml` ở thư mục gốc.** Yêu cầu Node.js 18+; dùng `npm ci` để tải TypeScript được khóa trong `package-lock.json`.

```bash
npm ci
npm run release
npm run release:check
```

Lệnh `npm run release` sẽ tự build mã Editor (TypeScript → `dist`), copy các Custom Inspector và tài nguyên Guide Panel, kiểm tra UUID/.meta, đóng gói ZIP **và kiểm tra toàn vẹn từng file bên trong ZIP**, sau đó tạo:

```text
release/flexalon-tools-v0.5.2.zip
└── flexalon-tools/
    ├── package.json
    ├── assets/flexalon/          # runtime TS + .meta
    ├── dist/                     # JS đã build, Inspector, Guide
    ├── static/guide-icon.png    # icon của panel
    ├── docs/MIGRATION_VI.md  # hướng dẫn chuyển từ bản cũ
    ├── scripts/migrate-legacy.cjs # chỉ dùng khi nâng cấp
    └── README_VI.md
```

File này có thể upload trực tiếp lên GitHub Release, sau đó người dùng giải nén vào `<Project>/extensions/`.

**Release tự động trên GitHub:** Tăng `version` trong `package.json` (và `package-lock.json`), commit & push. Sau đó tạo tag trùng với version và push tag:

```bash
git tag v0.5.2
git push origin v0.5.2
```

GitHub Actions sẽ chạy build + verify + tạo ZIP rồi tạo GitHub Release và đính kèm ZIP. Cũng có thể chạy bằng **Actions → Build and publish Flexalon extension → Run workflow**, nhập tag đã tồn tại. Tag phải đúng `v<version>` của `package.json`; cần cho phép Actions có quyền ghi Releases (`contents: write`). GitHub Release tồn tại thì workflow upload đè ZIP.

**Đóng gói tối giản (allowlist):** Chỉ đưa vào ZIP file cài đặt `package.json`, mã runtime `assets/**/*.ts` và `.meta` (giữ UUID), mã Editor đã build trong `dist` (những file được khai báo + dependency dùng trực tiếp), icon `static/guide-icon.png`, `README_VI.md` và công cụ nâng cấp `scripts/migrate-legacy.cjs` + `docs/MIGRATION_VI.md`.

**KHÔNG đóng gói:** `src/`, `node_modules/`, `package-lock.json`, `tsconfig.json`, `release/`, `.github/`, `.git/`, test, ảnh preview và bản HTML hướng dẫn offline nằm trong `docs/`. Guide Panel vẫn có đầy đủ 19 bài vì dữ liệu đã nằm trong `dist`.

Xem chính xác các file sẽ nằm trong ZIP trước khi phát hành:

```bash
npm run release:files
```

Thay đổi danh sách file được đóng gói ở `scripts/release-manifest.cjs`. Cơ chế này dùng allowlist, không đóng gói cả thư mục `src` hoặc `scripts` một cách tùy tiện.

**Khi nào workflow chạy?** Push branch (`git push origin main`) **không** tạo Release; chỉ push Git tag `v*` trùng `package.json.version` hoặc chạy workflow thủ công với tag hợp lệ mới build và đăng ZIP lên GitHub Release. Tag đã phát hành trước đó không nên ghi đè. Tăng version và tạo tag mới cho bản tiếp theo.

## Nhánh dev — Gizmos trong Scene View

Cài riêng [PhuNope/Cocos-Gizmos](https://github.com/PhuNope/Cocos-Gizmos) v2.0.0 trên Cocos Creator >=3.8.2.
Flexalon chỉ sử dụng kiểu TypeScript tương thích và gọi `globalThis.Gizmos2D` đã tồn tại.
Không copy runtime Gizmos, không import Gizmos.js, không khai báo global trùng lặp.
Nếu chưa cài Cocos-Gizmos, layout vẫn hoạt động nhưng không vẽ Gizmos.

Chọn Node và bật **Show Gizmos** (tùy chọn **Show Child Bounds**) trong Custom Inspector.
Màu cyan: bounds; xanh lá: padding; vàng: margin/vùng drop; hồng: Circle/Curve/Shape.
Node vẽ tạm của Gizmos không tham gia layout. Chưa hỗ trợ Circle XZ/ZY và kéo handle.
**Chỉ phát triển trên dev; không merge main, không tạo tag hoặc Release khi chưa chốt.**

## Dev: sửa Gizmos lồng nhau và kéo thả

- Cocos-Gizmos v2 được cài riêng; Flexalon gửi world-space points để vẽ đúng khi layout cha/con khác scale/rotation, không import runtime Gizmos lần thứ hai.
- FlexalonInteractable bỏ qua layout khi kéo dù child không có FlexalonObject; có thể dùng hoặc không dùng Lerp Animator (Lerp sẽ tạm dừng trong khi kéo).
- detachWhileDragging: chuyển tạm sang Canvas (tránh Mask/ScrollView clip), giữ world transform.
- Drop lên node có FlexalonDragTarget để chuyển parent. Mặc định thả bên ngoài parent mà không có target sẽ giữ dưới Canvas; thả bên trong/Cancel trả về parent cũ.
- UITransform của node được kéo là bắt buộc để nhận sự kiện touch/mouse. Tính năng này chỉ hỗ trợ UI 2D.
- Đây là bản dev thử nghiệm: chưa merge main / chưa phát hành Release.

## Dev: Curve Animator Gizmos, Pause và reorder trong layout

- **Curve Animator** có `Show Gizmos`: đường Bézier, tay nắm và marker `Preview Progress` (0..1). Đường được vẽ theo hệ tọa độ **parent** vì `p0..p3` là vị trí local của parent; object chạy trên curve không kéo đường Gizmos chạy theo.
- `Paused` ngừng update của Curve Animator ở cả Editor và runtime. `Preview In Editor` mặc định **tắt** để không tự chạy khi chỉnh scene; bật lên mới chạy thử trong Editor. `Pause()`, `Resume()`, `Restart()` dùng được bằng script. `Preview Progress` chỉ dịch marker gizmo, không dịch chuyển object.
- Khi `FlexalonInteractable` bắt đầu kéo, Curve Animator và Lerp Animator tạm dừng; thả/cancel thì tiếp tục.
- **Reorder Within Layout** (bật mặc định) ở Interactable: khi thả **trong vùng parent layout cũ**, node được đưa lại đúng parent và thay đổi `siblingIndex` theo vị trí thả, rồi layout sắp xếp lại. Hỗ trợ kể cả `Detach While Dragging`; drag ra ngoài parent hoặc sang `Drag Target` vẫn theo logic cũ. Đây là **reorder khi thả**, chưa có placeholder hoặc đổi thứ tự liên tục ngay trong lúc đang kéo.
- Nếu vừa có Curve Animator vừa có Flexalon Layout cùng điều khiển một Node, cả hai đều có thể ghi `node.position`; nên chọn một hệ điều khiển chuyển động hoặc cho child đó `Skip Layout`.

Bản dev chưa merge `main` hoặc phát hành Release.

## Dev 0.5.4-dev.1 — sửa Gizmos cha/con và Curve Animator Inspector

- Flexalon vẽ qua Node Gizmos tạm (DontSave, HideInHierarchy) ở cấp Canvas; chọn layout cha → con → cha sẽ không tái sử dụng renderer nằm trong nested layout. Chỉ dùng runtime Cocos-Gizmos cài riêng.
- Curve Animator: phần **Playback · Pause / Preview** chứa Paused, Preview In Editor, Preview Progress; phần Scene Gizmos chứa Show Gizmos.
- Để update: tắt Cocos Creator, xóa thư mục `extensions/flexalon-tools` cũ, giải nén ZIP mới vào `extensions/` (đúng đường dẫn `extensions/flexalon-tools/package.json`), rồi mở lại Editor.
- Đây là **dev 0.5.4-dev.1**; chưa merge main / chưa phát hành Release.

## Dev v0.5.4-dev.2 — Gizmos / Interactable
- Đổi hoặc bỏ chọn Node sẽ hủy renderer tạm của Flexalon; không copy runtime Cocos-Gizmos.
- Tắt Child Bounds mặc định để tránh nhiều nét đè lên sprite, tránh Bounds trùng nhau giữa Object và Layout.
- Tính drag theo local-space của parent gốc, hỗ trợ Canvas scale/rotation. Interactable yêu cầu UITransform, nhận touch trên Sprite con.
- Khi thả ngoài parent, Keep Outside On Release có hiệu lực cả khi Detach While Dragging tắt.
- Curve Animator Inspector báo rõ khi asset-db script dump thiếu các thuộc tính Paused/Preview/Gizmos.
- Tính năng Interactable là cho Preview/Runtime, không phải Move Tool trong Scene Editor.

## Dev 0.5.4-dev.3 — Curve Animator Start Position

- Use Start Position: khi bật, Start Position thay đổi P0 thực tế trong hệ local của parent, dịch toàn bộ đường Bézier; khi tắt, dùng P0 như cũ.
- Start Progress: 0..1, bắt đầu animation tại một điểm trên curve; Loop quay lại Start Progress.
- Snap To Start In Editor: căn Node vào điểm bắt đầu mà không chạy animation; tắt để chỉnh Transform bằng Move Tool.
- Ignore Parent Layout: tùy chọn bỏ qua sắp xếp từ Flexalon Layout cha, mặc định tắt để giữ tương thích scene cũ.
- Gizmos hiển thị start marker, preview marker, đường cong đã dịch theo Start Position.
- API: Restart(), PlaceAtStart(), PointAt(t), UseCurrentPositionAsStart(). Không merge main hoặc tạo Release ở bản dev.

## Dev v0.5.4-dev.4 — Bước nhảy Slider

Curve Animator: Start Progress và Preview Progress dùng CCFloat với `range:[0,1,0.01]` (bước 1%). Rà soát toàn bộ 43 runtime script và Custom Inspector: hai trường này là toàn bộ slider số thực hiện tại. Max Items Per Line giữ step 1 do là số nguyên. Script `verify-sliders.cjs` chạy cùng npm run verify để tránh tạo lại slider không chỉnh được.



## Dev v0.5.4-dev.5 — Grid Layout Gizmos

- Grid Layout có phần **Grid Gizmos** trong Inspector: Show Grid, Show Cell Bounds, Show Occupied Cells, Show Grid Gaps và Show Cell Index.
- Tâm/kích thước của ô dùng **chung `geometry()` và `cellGeometry()`** với `arrangeChildren`, bao gồm Uniform, Fit Children, Start Corner, Hexagonal và GridCell Column/Row Span. Vùng chiếm bởi child có đường màu cam; cell màu cyan; gap màu tím.
- Hexagonal dùng khung lục giác cho cell đơn; span nhiều cell được thể hiện bằng hình chữ nhật bao vì hệ thống layout tính vùng span theo khung bao.
- Index hiển thị dạng `column,row` bắt đầu từ 1. Gizmos giới hạn 400 cell, 80 nhãn để không quá tải Cocos Editor. Không cần/copy runtime Cocos-Gizmos thứ hai.
- Chỉ phát triển trên `dev`, chưa merge `main`, chưa tạo tag hoặc Release.

## Dev 0.5.4-dev.6 — Fill Parent Fallback

- \`FlexalonObject.fillParentFallback\` mặc định tắt để giữ hành vi cũ.
- Bật với parent chỉ có UITransform: các trục Width/Height Type Fill nhận (Content Size parent - Margin) nhân Fill X/Y, có giới hạn Min/Max.
- Căn giữa vùng content theo Anchor parent/child và Object Offset. Trục không Fill giữ nguyên.
- Preserve UI Content Size bật thì không thay Content Size của child.
- Parent có Flexalon Layout đang bật thì layout có ưu tiên; kéo Interactable thì tạm không điều chỉnh Fill.
- Cập nhật trong Editor/Runtime khi kích thước parent thay đổi. Chỉ dev; chưa merge main hay tạo Release.

## Dev 0.5.4-dev.7 — Fix Canvas Fill without pre-existing UITransform

- Khi parent là Canvas (hoặc Node thường có `UITransform`) và child có `FlexalonObject` với Width/Height Type = Fill, Fill Parent Fallback mặc định **bật trên component mới**. Trên component đã tạo ở dev.6, Cocos có thể đã serialize `fillParentFallback=false`: bật lại trong Inspector.
- Nếu child chưa có `UITransform`, fallback sẽ bổ sung **khi thực sự cần** (có ít nhất một trục Fill, parent có UITransform, không có Flexalon Layout đang chạy, không trong trạng thái kéo).
- Parent Layout vẫn có ưu tiên tuyệt đối; không thêm UITransform cho Node 3D khi không Fill hoặc parent không có UITransform.
- Tự cập nhật khi Canvas resize; xét margin, min/max, anchor, Fill fraction, Preserve UI Content Size và Offset.
- Đây là bản thử nghiệm trên dev, chưa merge main hoặc tạo Release.
