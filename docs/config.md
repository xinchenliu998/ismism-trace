# 配置说明

## 学习程度（learning-levels）

学习进度中「程度」的等级与展示标签由配置控制。

- **level 0**：最低档，表示尚未开始或未标记
- **level 1**：初识档
- **level 2**：进行中档
- **level 3**：已掌握档
- **level 4**：最高档

配置位置：`src/config/learning-levels.ts` 中的 `LEARNING_LEVEL_LABELS`。各 key（0–4）对应一条展示文案，仅可修改展示文案，不可改 key 与后端约定。

## 数据与存储

- **主义数据**：构建时嵌入一份 `ism.json`（来自项目根目录）；运行时优先使用应用数据目录下的 `ism.json`（若存在且解析成功），否则使用嵌入数据。应用内可通过「更新数据」选择本地文件校验并确认后替换，实现不重装即可更新。
- **学习进度**：保存在系统应用数据目录下的 `progress.json`，由 Tauri 自动解析路径，无需配置。

### ism.json 更新方式

- **运行时更新**：应用内提供「更新数据」入口。用户选择本地 `ism.json` 文件后，先**仅做校验**（解析不通过则**保持原数据**并提示「解析错误，已保持原数据」）；解析成功则展示条目数并**需用户再次确认**后才替换内存数据并写入应用数据目录，下次启动将使用新数据。
- **数据来源与持久化**：首次启动使用构建时嵌入的主义数据；若应用数据目录下已有 `ism.json` 且解析成功则优先使用该文件，解析失败则回退到嵌入数据。用户通过「更新数据」确认替换后，新内容会写入应用数据目录的 `ism.json`，实现不重装即可更新。

## 界面与主题

- **主题偏好**：用户通过顶栏亮/暗切换按钮选择后，选择会持久化到本地，下次启动沿用。持久化使用的 key 由前端根组件定义，用于区分「跟随系统」与「固定亮色/暗色」；具体 key 名见 `App.vue` 中主题相关逻辑。

## 版本号

- **版本源**：应用版本以项目根目录 `package.json` 的 `version` 为准。
- **同步范围**：使用 `pnpm release` 升级版本时，脚本会将该版本同步到 `src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 以及 iOS 工程（`gen/apple/project.yml`、`gen/apple/ismism-trace_iOS/Info.plist`），保证 Windows / macOS / Linux / Android / iOS 各平台包内显示的版本一致。
- **手动改版本**：若手动修改 `package.json` 的版本，需同步修改上述 Tauri 与 iOS 文件，否则各平台包内版本会不一致。详见 [打包说明 - 发布与 Tag](build.md#发布与-taggithub-可浏览下载)。

## 构建与安装包

- **tauri.conf.json → bundle.targets**：控制打包产物。当前为 `["app"]`，仅生成 exe（位于 `src-tauri/target/release/ismism-trace.exe`），不生成 MSI/NSIS 安装包，可避免 Tauri 从 GitHub 下载 WiX/NSIS 时的网络错误（如 `protocol: http response missing version`）。
- 若需安装包：可将 `targets` 改为 `["app", "nsis"]` 或 `["app", "msi"]`，需本机网络能正常访问 GitHub 以下载 NSIS/WiX；Tauri 暂不读取本机 `NSISDIR`，会使用自身下载的 NSIS。
