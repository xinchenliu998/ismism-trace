# 项目技术说明：各文件与目录作用

本文档说明当前项目中主要文件与目录的职责，便于新人上手或做功能修改时快速定位。

---

## 1. 项目根目录

| 文件 / 目录 | 作用 |
|-------------|------|
| `package.json` | 前端依赖与脚本：Vue、Vite、Tauri 相关包；`dev` / `build` / `tauri` / `release` 等命令。版本号与 `src-tauri/tauri.conf.json` 一致，用于发布与 tag。 |
| `pnpm-workspace.yaml` | pnpm 工作区配置（当前 `packages: []`），满足 Tauri/CI 对 workspace 的约束。 |
| `pnpm-lock.yaml` | 依赖锁文件，保证安装结果一致。 |
| `vite.config.ts` | Vite 配置：Vue 插件、开发端口 1420、Tauri 开发时的 HMR 与忽略 `src-tauri`。 |
| `tsconfig.json` | TypeScript 配置（前端）。 |
| `tsconfig.node.json` | Node 环境下的 TS 配置（Vite 等构建脚本）。 |
| `index.html` | 前端入口 HTML，挂载 Vue 应用（`#app`）。 |
| `ism.json` | **主义数据源**：项目根目录主副本，构建时由 `src-tauri/build.rs` 复制到 `src-tauri/ism.json` 并嵌入；应用内「更新数据」会写入系统应用数据目录的 `ism.json`。 |
| `CHANGELOG.md` | 按版本维护的更新说明；CI 创建 GitHub Release 时提取当前版本段落写入 Release 正文。 |
| `README.md` | 项目简介、环境与运行、发布命令、文档索引。 |
| `.gitignore` | 根目录忽略规则（如 `node_modules`、`dist`、`release` 等）。 |
| `public/` | 静态资源（如 `tauri.svg`、`vite.svg`），构建时原样输出。 |
| `image/` | 截图与源图（如 `主义主义.jpg`），可用于 `scripts/prepare-icon.mjs` 生成图标。 |

---

## 2. 前端：`src/`

| 文件 / 目录 | 作用 |
|-------------|------|
| `main.ts` | Vue 应用入口：挂载 App，并引入 `styles/theme.css`。 |
| `styles/theme.css` | 亮/暗主题 CSS 变量：默认根据 `prefers-color-scheme` 定义 `--bg-page`、`--text-primary`、`--accent` 等；支持通过 `html` 的 `data-theme="light"` / `data-theme="dark"` 覆盖（由顶栏主题按钮设置），供各组件统一引用。 |
| `App.vue` | 根组件：顶栏（标题、搜索、**主题切换按钮**、返回按钮、更新数据图标）、侧栏列表、详情区；负责主题状态与 `localStorage` 持久化、`selectedId`、`items`、`progress` 等，以及 Android 返回键/全面屏手势（`onBackKeyDown`）、更新数据流程（选文件 → 校验 → 确认 → 刷新）。 |
| `api.ts` | 封装 Tauri `invoke`：`get_ism_list`、`get_ism_detail`、`get_progress`、`set_progress`、`read_ism_file`、`validate_ism_content`、`apply_ism_content`。 |
| `types.ts` | 前端类型：`IsmItem`、`IsmTreeNode`、`IsmEntry`、`ProgressEntry`、`ProgressMap`、`IsmUpdatePreview`。 |
| `vite-env.d.ts` | Vite 环境类型声明。 |
| `components/IsmList.vue` | 主义列表：统计、筛选（全部/已学/未学）、全部展开/折叠、展开到选中项、树形列表项与学习程度角标。 |
| `components/IsmDetail.vue` | 主义详情：场域/轴、特征、相关链接（用系统浏览器打开）、学习程度选择与保存。 |
| `config/learning-levels.ts` | 学习程度展示文案（0–4 档），与后端 level 约定一致。 |
| `utils/tree.ts` | 树形数据：`buildTree`（扁平列表转树）、`filterTree`（按关键词过滤）。 |
| `utils/link.ts` | 链接处理：判断 http(s) 并用 Tauri opener 打开。 |
| `assets/` | 前端资源（如 `vue.svg`）。 |

---

## 3. 后端（Tauri）：`src-tauri/`

### 3.1 顶层

| 文件 / 目录 | 作用 |
|-------------|------|
| `Cargo.toml` | Rust 依赖与目标：`tauri`、`tauri-plugin-opener`、`tauri-plugin-dialog`；移动端 `tauri-plugin-app-events`。 |
| `Cargo.lock` | 依赖版本锁。 |
| `tauri.conf.json` | Tauri 应用配置：产品名、版本、identifier、前端构建命令与产物路径、窗口、bundle 图标等。 |
| `build.rs` | 构建脚本：将项目根目录 `ism.json` 复制到 `src-tauri/ism.json` 供 `include_str!` 使用；Windows 下设置 exe 图标路径。 |
| `capabilities/default.json` | 桌面端能力：主窗口可用的权限（`core:default`、`opener:default`、`dialog:default`）。 |
| `capabilities/mobile.json` | 移动端能力：主窗口在 Android/iOS 下的权限（含 `app-events:default`、`dialog:default`）。 |
| `icons/` | 各平台图标（ico、icns、png 等），由 `pnpm icon:gen` 从 `app-icon.png` 生成。 |
| `gen/android/` | Android 工程（Gradle、MainActivity、资源等），由 Tauri 生成；其中 `MainActivity.kt` 已自定义返回键/手势逻辑。 |

### 3.2 源码：`src-tauri/src/`

| 文件 | 作用 |
|------|------|
| `main.rs` | 可执行入口，通常仅调用 `ismism_trace_lib::run()`。 |
| `lib.rs` | Tauri 应用主体：注册插件（opener、dialog、app-events）、管理 `IsmState`（主义数据运行时状态）、注册命令（`get_ism_list`、`get_ism_detail`、`validate_ism_content`、`apply_ism_content`、`read_ism_file`、`get_progress`、`set_progress`）、启动时加载 ism 数据（优先 app_data 下 `ism.json`）、桌面端设置窗口图标。 |
| `ism.rs` | 主义数据：解析 `ism.json`（`parse_ism_map_from_str`）、从 map 生成列表/详情（`get_ism_list_from_map`、`get_ism_detail_from_map`）、`IsmUpdatePreview`；不直接持状态，状态在 `lib.rs` 的 `IsmState`。 |
| `progress.rs` | 学习进度：读写应用数据目录下 `progress.json`（`get_progress`、`set_progress`），路径通过 `app.path().app_data_dir()` 解析。 |

### 3.3 Android 自定义

| 文件 | 作用 |
|------|------|
| `gen/android/app/src/main/java/.../MainActivity.kt` | 自定义返回键与手势：`onBackPressed()` 与 `onKeyDown(KEYCODE_BACK)` 统一走 `handleBackKey`，通过 JS `window.__tauri_android_on_back_key_down__()` 询问前端；详情页返回列表、主界面调用 `finish()` 退到后台；防抖避免同一次按键触发两次逻辑。 |

---

## 4. 脚本：`scripts/`

| 文件 | 作用 |
|------|------|
| `release.mjs` | 一键发布：检查当前版本 tag 是否已在远程；未发布则用当前版本，已发布则按 patch/minor/major 升级；更新 `package.json`、提交、创建 tag、推送；失败时回滚。 |
| `release-pack.mjs` | 本地打包收集：将各平台已存在的构建产物（Windows exe、macOS dmg、iOS ipa、Android apk、Linux AppImage/deb）复制到根目录 `release/` 并重命名为带版本与平台后缀的文件名；无对应包不报错。 |
| `prepare-icon.mjs` | 图标预处理：将指定图片（默认 `image/主义主义.jpg`）转为 1024×1024 的 `src-tauri/app-icon.png`，供 `pnpm tauri icon` 使用。 |

---

## 5. CI：`.github/workflows/`

| 文件 | 作用 |
|------|------|
| `release.yml` | 推送 `v*` tag 时：并行构建 Windows exe、macOS 应用（aarch64 zip）、Linux（x86_64 AppImage/deb）与 Android APK（含签名配置）；**不构建 iOS**；下载产物、从 `CHANGELOG.md` 提取当前版本段落生成 Release 正文、创建 GitHub Release 并上传 exe/macos/linux/apk。 |

---

## 6. 文档：`docs/`

| 文件 | 作用 |
|------|------|
| `build.md` | 各平台构建命令与产物路径、一键发布与手动发布、CHANGELOG 编写示例、CI 签名配置。 |
| `config.md` | 学习程度配置、数据与存储、ism.json 更新方式、构建与安装包相关配置。 |
| `features.md` | 功能说明：列表与目录、学习进度、更新主义数据、详情与链接、亮/暗主题与多端布局。 |
| `icon.md` | 应用图标：从源图生成、`icon:prepare` / `icon:gen` 用法。 |
| `数据来源.md` | 主义数据来源引用（如 B 站、GitHub 仓库）。 |
| `tech-overview.md` | 本技术说明：各文件与目录作用。 |

---

## 7. 其他

- `src-tauri/ism.json`：由 `build.rs` 从根目录复制而来，被 `include_str!` 嵌入；若不存在则使用内置数据。该路径在 `src-tauri/.gitignore` 中，一般不提交。
- `src-tauri/gen/`：Tauri 生成的 Android 工程，部分文件（如 `MainActivity.kt`、`keystore.properties` 示例）可修改或本地配置，详见 [build.md](build.md)。

如需修改功能，可先在本文档中定位到对应模块（前端组件、后端命令、脚本或 CI），再结合 [features.md](features.md)、[config.md](config.md)、[build.md](build.md) 做具体改动。
