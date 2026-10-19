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
