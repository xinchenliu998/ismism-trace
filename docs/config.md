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

- **主义数据**：来自项目根目录的 `ism.json`，构建时复制到 `src-tauri` 供程序使用。
- **学习进度**：保存在系统应用数据目录下的 `progress.json`，由 Tauri 自动解析路径，无需配置。

## 构建与安装包

- **tauri.conf.json → bundle.targets**：控制打包产物。当前为 `["app"]`，仅生成 exe（位于 `src-tauri/target/release/ismism-trace.exe`），不生成 MSI/NSIS 安装包，可避免 Tauri 从 GitHub 下载 WiX/NSIS 时的网络错误（如 `protocol: http response missing version`）。
- 若需安装包：可将 `targets` 改为 `["app", "nsis"]` 或 `["app", "msi"]`，需本机网络能正常访问 GitHub 以下载 NSIS/WiX；Tauri 暂不读取本机 `NSISDIR`，会使用自身下载的 NSIS。
