# Flexalon Unified Extension v0.5.2 — Cocos Creator >= 3.8.2

**One extension, everything included.** The package carries all 42 runtime TypeScript files, 18 Custom Inspectors, the Guide Panel, and an offline HTML guide.

## Install (new project)

1. Extract the folder `flexalon-tools` into `<YourProject>/extensions/flexalon-tools/`. Ensure `package.json` is directly inside that folder (not nested twice).
2. In Creator, open **Extension Manager → Project**, enable/reload `flexalon-tools`, and reopen the project if needed.
3. In the **Assets** panel look for the mounted database **flexalon-tools**, with `flexalon/Core`, `flexalon/Layouts`, etc.
4. Select a Node → **Add Component → Flexalon → Flexible Layout**. `FlexalonObject` is added via `@requireComponent`.
5. Open **Extensions → Flexalon → Open Flexalon Guide** for illustrated tutorials.

**No `assets/flexalon` copy is required.** Cocos Creator loads the runtime TypeScript from the extension's read-only `asset-db` mount (`contributions.asset-db.mount`, `./assets`). This is supported by the Cocos 3.8 extension system. Example import from a project script:

```ts
import { FlexalonFlexibleLayout } from 'db://flexalon-tools/flexalon/Layouts/FlexalonFlexibleLayout';
```

If your project uses a different class path convention or your IDE cannot resolve `db://` until the editor refreshes, use the TypeScript import suggestion from Creator's Assets panel.

## Upgrading an existing v0.4.x project — important

**Back up your project first.** Do not install the same runtime scripts both in `assets/flexalon` and the mounted extension. Duplicate `@ccclass` registrations and duplicate UUIDs can cause import/build failures.

- If the project contains `assets/flexalon`, close Creator. Make a backup of that folder (including `.meta`) outside the project. Some earlier Flexalon ZIPs omitted `.meta` for certain classes, so scenes/prefabs may refer to UUIDs generated locally.
- For automatic UUID-preserving migration, run the optional script (Node 18+):

```bash
node extensions/flexalon-tools/scripts/migrate-legacy.cjs --project /path/to/YourProject
```

The script **does not delete any legacy source**: it backs up the old folder outside `assets` and renames it out of the asset database after validating collisions. Run while the editor is closed. Then start Creator, enable the extension, and verify all scenes/prefabs before deleting the backup. See `docs/MIGRATION_VI.md`.

- Fresh installation needs **no migration** and no command line.

## Maintainers

- `assets/flexalon`: runtime TypeScript (`.meta` UUIDs pinned for updates).
- `src`, `dist`: extension UI and compiled JS. Only `src` is compiled by the extension's TypeScript config; **do not compile `assets/flexalon` using Node/extension `tsc`**. Creator compiles it as engine assets.
- `src/contributions/inspector`: 18 Custom Inspector panels; `src/panels/guide`: 19 illustrated Vietnamese lessons.
- `docs/Flexalon_Guide_VI.html`: offline HTML.
- `npm run build`: rebuild inspector/editor JS (requires global/project `tsc`).
- `npm run verify`: validate manifest, runtime and `.meta` mappings offline.

Testing: extension build and mocked runtime/inspector tests only, not live Cocos Creator 3.8.2/3.8.8 Editor or device builds. Verify read-only DB mount, scene serialization, preview and build in your actual project.

## Building a GitHub Release ZIP

Keep the **contents** of this `flexalon-tools` folder at your GitHub repository root so GitHub can find `.github/workflows/release.yml`.

```bash
npm ci
npm run release
npm run release:check
```

Produces `release/flexalon-tools-v0.5.2.zip` with one top-level `flexalon-tools/` folder. **Minimal installer allowlist**: only runtime `.ts/.meta`, compiled JS/HTML/CSS needed by Editor/Inspector/Guide, `package.json`, panel icon, `README_VI.md`, and optional legacy migrator plus its migration instructions. Source `src/`, TypeScript build dependencies, lockfile, tsconfig, workflow, tests, offline HTML and screenshot previews are excluded. The illustrated Guide Panel stays fully functional. Run `npm run release:files` to inspect every included path; edit `scripts/release-manifest.cjs` to change the allowlist. `npm run release` rebuilds and checks the package, creates ZIP, and verifies its CRC/decompression against disk files. `release:check` can be run again separately.

Pushing the matching tag (`git tag v0.5.2 && git push origin v0.5.2`) triggers the workflow. It runs `npm ci`, `npm run release`, verifies the ZIP, and creates/updates the corresponding GitHub Release using `GITHUB_TOKEN`. Use GitHub Actions manual dispatch to publish an **existing** tag. Tag version must equal `v` + package version.


**Note:** Ordinary branch pushes do not publish ZIPs. Only matching `v*` tags or manual workflow dispatch publish a GitHub Release. Repo source can omit `dist/` (ignored); the workflow builds it from `src/` before packaging.

## Development branch — Cocos-Gizmos Scene visualization

Install [PhuNope/Cocos-Gizmos](https://github.com/PhuNope/Cocos-Gizmos) v2.0.0 separately (Cocos Creator >=3.8.2).
Flexalon uses only structural TypeScript types and `globalThis.Gizmos2D` at runtime.
It does NOT import, bundle, register or redeclare Gizmos, so other extensions reuse the same Gizmos runtime.
Without Cocos-Gizmos enabled, Flexalon keeps working without visuals.

Select a Node and enable **Show Gizmos** (optionally **Show Child Bounds**). Cyan: bounds;
green: padding; yellow: margin/drop zone; pink: circle/curve/shape guides. Circle
XZ/ZY and draggable handles are not implemented yet. Temporary Gizmos nodes are
excluded from layout measurement. **Keep these changes on dev until approved.**
