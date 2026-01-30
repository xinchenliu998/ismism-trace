# 各平台打包说明

以下路径均相对于项目根目录。应用图标从源图生成方式见 [icon.md](icon.md)。

---

## Windows

**命令：** `pnpm tauri build`

| 产物 | 路径 |
|------|------|
| 可执行文件 | `src-tauri/target/release/ismism-trace.exe` |
| MSI 安装包 | `src-tauri/target/release/bundle/msi/ismism-trace_0.1.0_x64_en-US.msi`（需在 tauri.conf.json 的 `bundle.targets` 中包含 `msi`） |
| NSIS 安装包 | `src-tauri/target/release/bundle/nsis/ismism-trace_0.1.0_x64-setup.exe`（需在 `bundle.targets` 中包含 `nsis`） |

当前默认仅打 exe（`targets: ["app"]`），不生成 MSI/NSIS。若需安装包，见 [配置说明 - 构建与安装包](config.md#构建与安装包)。

**exe 文件图标：** 构建时已通过 `build.rs` 将 `src-tauri/icons/icon.ico` 嵌入 exe 资源。若资源管理器中仍显示旧图标，可先执行一次干净构建（删除 `src-tauri/target/release` 后再 `pnpm tauri build`），必要时重启资源管理器或清理系统图标缓存。

---

## Android

**命令：** `pnpm tauri android build`（需已执行过 `pnpm tauri android init`）

| 产物 | 路径 |
|------|------|
| Universal 安装包（推荐） | `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`（已配置签名时）或 `app-universal-release-unsigned.apk`（未签名） |
| 分架构 APK | `src-tauri/gen/android/app/build/outputs/apk/{abi}/release/`（如 arm64-v8a、armeabi-v7a、x86_64） |

**安装时报 “packageinfo is null” 的原因：** 未签名的 APK 在部分设备上无法正确安装。必须对 release 包进行签名后再安装。

**返回键与全面屏返回手势：** 已通过 `tauri-plugin-app-events` 与自定义 `MainActivity.kt` 支持。在详情页按物理返回键或全面屏返回手势会返回列表；在列表页按返回键交给系统处理。自定义逻辑位于 `src-tauri/gen/android/app/src/main/java/.../MainActivity.kt`；若重新执行 `tauri android init` 导致该文件被覆盖，需按 [tauri-plugin-app-events](https://github.com/wtto00/tauri-plugin-app-events) 的 README 重新添加 `onWebViewCreate` 与 `onKeyDown` 中的返回键转发逻辑。

**配置签名（必做后再用 Universal 安装）：**

1. 生成密钥库（仅需做一次）：
   - **PowerShell（推荐）**：用 `$env:USERPROFILE`，否则路径不会展开：
     ```powershell
     keytool -genkey -v -keystore $env:USERPROFILE\upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
     ```
   - **CMD**：可用 `%USERPROFILE%`：
     ```cmd
     keytool -genkey -v -keystore %USERPROFILE%\upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
     ```
   - 或直接写绝对路径，如：`-keystore C:\Users\你的用户名\upload-keystore.jks`
   `keytool` 一般在 JDK 或 Android Studio 自带的 JBR 中（如 `C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`）。

2. 在项目内配置签名信息：在 `src-tauri/gen/android/` 下新建 `keystore.properties`（可参考同目录下的 `keystore.properties.example`），内容示例：
   ```properties
   password=你创建密钥库时设置的密码
   keyAlias=upload
   storeFile=密钥库的绝对路径，例如 C:/Users/你的用户名/upload-keystore.jks
   ```
   **注意：** 不要将 `keystore.properties` 和 `.jks` 提交到公开仓库。

3. 重新执行 `pnpm tauri android build`。构建会使用上述配置对 release 包签名，同一路径下的 Universal APK 将变为已签名包，安装后不再出现 “packageinfo is null”。

---

## macOS（桌面）

**命令：** 在 macOS 上执行

- 开发：`pnpm tauri dev`
- 构建：`pnpm tauri build`

| 产物 | 路径 |
|------|------|
| 应用包 (.app) | `src-tauri/target/release/bundle/macos/ismism-trace.app` |
| DMG 安装镜像 | `src-tauri/target/release/bundle/dmg/ismism-trace_0.1.0_x64.dmg`（需 `bundle.targets` 包含对应类型，如 `dmg`） |

**架构：** 默认按当前机器架构（Apple Silicon 为 aarch64，Intel 为 x86_64）。需通用包时先安装双架构 target：`rustup target add aarch64-apple-darwin x86_64-apple-darwin`，再使用 `tauri build --target universal-apple-darwin`（见 Tauri 文档）。

---

## iOS

**说明：** GitHub Actions CI **不包含** iOS 构建；iOS 需在本地 macOS 上自行执行 `pnpm tauri ios init`（仅一次）及 `pnpm tauri ios build`。签名与上架见下文。

**前置条件：** 必须在 **macOS** 上构建，且满足以下环境：

1. **完整 Xcode**（从 App Store 安装），而非仅“Command Line Tools”。`simctl` 等工具随 Xcode 提供。
2. **活动开发者目录指向 Xcode**：若曾切换为 Command Line Tools，需改回：
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
   否则会出现 `xcrun: unable to find utility "simctl"` 或 exit code 72。
3. **CocoaPods**：iOS 工程依赖 CocoaPods。若未安装，可用：
   ```bash
   brew install --formula cocoapods
   ```
4. **首次构建前** 需初始化 iOS 工程（见下方）。

**初始化（仅需一次）：**

```bash
pnpm tauri ios init
```

会在 `src-tauri/gen/apple/` 下生成 iOS 工程（Xcode 项目等）。

**开发：**

```bash
pnpm tauri ios dev
```

默认会尝试连接设备，若无设备则提示选择模拟器。也可指定设备名，例如：

```bash
pnpm tauri ios dev 'iPhone 16e'
```

用 Xcode 打开工程而不直接跑机子：

```bash
pnpm tauri ios dev --open
```

在**真机**上开发时，开发服务器需监听局域网地址（供手机访问）。本项目的 `vite.config.ts` 已通过 `TAURI_DEV_HOST` 支持；首次运行可能弹出“发现并连接本地网络设备”权限，需允许。若用 Xcode 跑真机，可加 `--open --host`。

**构建：**

```bash
pnpm tauri ios build
```

| 产物 | 说明 |
|------|------|
| IPA / 应用 | 位于 `src-tauri/gen/apple/build/` 下，具体路径以构建输出为准。可配合 `--export-method` 生成 App Store / TestFlight 包。 |

**签名：** 真机运行或上架必须进行代码签名，且需加入 [Apple Developer Program](https://developer.apple.com)（当前约 99 美元/年）。Bundle ID（本应用为 `com.bottle.ismism-trace`）需在 [App Store Connect](https://appstoreconnect.apple.com) 或 [Identifiers](https://developer.apple.com/account/resources/identifiers/list) 中注册。

**方式一：自动签名（推荐，本机开发/真机调试）**

由 Xcode 管理证书与描述文件，最省事：

1. 在 Mac 上打开 Xcode → **Xcode → Settings** → **Accounts**，点击 **+** 添加你的 Apple ID（已加入开发者计划则选该账号）。
2. 用 Xcode 打开 iOS 工程：`pnpm tauri ios dev --open`，在左侧选中 **ismism-trace_iOS**  target → **Signing & Capabilities**，勾选 **Automatically manage signing**，在 **Team** 下拉框中选择你的开发团队。
3. 若用命令行构建（如 `pnpm tauri ios build`）且希望指定团队而不再用 Xcode 选，可在 `tauri.conf.json` 的 `bundle` 下增加 `iOS` 配置，设置 `developmentTeam` 为你的 **Team ID**（10 位字符，在 [Apple Developer → Membership](https://developer.apple.com/account#MembershipDetailsCard) 或 Xcode Signing 里可见）；或设置环境变量 `APPLE_DEVELOPMENT_TEAM=<你的 Team ID>`。

**方式二：手动签名（证书 + 描述文件）**

适用于无 Xcode 图形界面或需固定证书的场景。在构建前设置环境变量：

| 变量名 | 说明 |
|--------|------|
| `IOS_CERTIFICATE` | 从钥匙串导出的 .p12 证书的 **Base64** 字符串（`base64 -i 证书.p12 \| pbcopy`） |
| `IOS_CERTIFICATE_PASSWORD` | 导出 .p12 时设置的密码 |
| `IOS_MOBILE_PROVISION` | 描述文件 .mobileprovision 的 **Base64** 字符串（`base64 -i xxx.mobileprovision \| pbcopy`） |

证书类型需与导出方式对应：真机调试用 **Apple Development**；上架 / Ad Hoc 用 **Apple Distribution**。描述文件在 [Profiles](https://developer.apple.com/account/resources/profiles/list) 创建，Bundle ID 需与 `tauri.conf.json` 的 `identifier` 一致。

**方式三：CI / 自动构建**

在 CI 中使用自动签名时，需使用 App Store Connect API Key，并设置：

| 变量名 | 说明 |
|--------|------|
| `APPLE_API_ISSUER` | App Store Connect → Users and Access → Integrations → 创建 API Key 后页面上方的 **Issuer ID** |
| `APPLE_API_KEY` | 该 API Key 的 **Key ID** |
| `APPLE_API_KEY_PATH` | 下载的 .p8 私钥文件的路径（创建 Key 后仅可下载一次） |

更多细节与证书/描述文件导出步骤见 [Tauri 官方：iOS Code Signing](https://v2.tauri.app/distribute/sign/ios)。

**常见问题：**

- **Failed to detect connected iOS Simulator / exit code 72**：多为 `xcode-select` 指向 Command Line Tools。执行 `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`。
- **No code signing certificates found**：仅模拟器可先忽略；真机或上架需在 Xcode 中配置开发团队，或在 `tauri.conf.json` 的 `bundle > iOS > developmentTeam` 或环境变量 `APPLE_DEVELOPMENT_TEAM` 中设置。
- **pod install 失败 / cocoapods not found**：安装 CocoaPods，例如 `brew install --formula cocoapods`。

---

## Linux

**命令：** `pnpm tauri build`（在 Linux 上执行）

| 产物 | 路径 |
|------|------|
| AppImage | `src-tauri/target/release/bundle/appimage/ismism-trace_0.1.0_amd64.AppImage`（需 targets 包含 `appimage`） |
| .deb | `src-tauri/target/release/bundle/deb/` 下（需 targets 包含 `deb`） |

具体文件名以构建输出为准。

---

## 发布与 Tag（GitHub 可浏览/下载）

**CI 构建范围：** 推送 tag 后，GitHub Actions 会自动构建 **Windows exe**、**macOS 应用**（Apple Silicon，产出 `*-macos-aarch64.zip`）与 **Android APK**，并创建 Release 附带上述产物。**不支持 iOS 构建**；iOS 需在本地 macOS 上执行 `pnpm tauri ios build` 自行构建与签名。

版本号以 `package.json` / `tauri.conf.json` 的 `version` 为准。

### 一键发布（推荐）

使用发布脚本自动完成版本检查、版本更新、提交、创建 tag、推送并触发 CI 构建：

```bash
pnpm release          # 智能版本：当前版本未发布则使用当前版本，已发布则 patch +1
pnpm release patch    # patch 版本（0.1.0 -> 0.1.1）
pnpm release minor    # minor 版本（0.1.0 -> 0.2.0）
pnpm release major    # major 版本（0.1.0 -> 1.0.0）
```

**版本管理逻辑：**

脚本会先检查当前版本的 tag 是否已存在于远程：
- **当前版本未发布**（tag 在远程不存在）：
  - 使用当前版本发布，不升级版本号
  - 如果本地 tag 不存在，会先创建 tag
  - 如果本地 tag 已存在，会删除后重新创建（确保指向当前 commit）
- **当前版本已发布**（tag 在远程已存在）：
  - 根据版本类型（patch/minor/major）升级版本号
  - 更新 `package.json` 并提交更改
  - 创建新版本的 tag

**脚本自动完成的操作：**

1. 检查当前版本的 tag 是否已存在于远程
2. 根据检查结果决定使用当前版本或升级版本
3. 如需升级版本，更新 `package.json` 中的版本号
4. 如需升级版本，提交更改（commit message: `chore: bump version to x.x.x`）
5. 创建带注释的 tag（格式：`vx.x.x`）
6. 推送代码和 tag 到远程仓库
7. 触发 GitHub Actions 自动构建和创建 Release

**前置条件：**
- 确保当前分支已关联远程仓库
- 确保有推送权限
- 在仓库 **Settings → Actions → General** 中，将 **Workflow permissions** 设为 **Read and write permissions**

**错误处理：**
- 如果发布过程中任何步骤失败，脚本会自动回滚所有更改（删除 tag、回滚提交、恢复版本号）
- 如果 tag 已存在于远程，会提示错误并退出

推送 tag 后，GitHub Actions 会自动构建 Windows exe、macOS 应用（aarch64 zip）和 Android APK，并创建 Release。在 **Actions** 页查看构建进度，完成后在 **Releases** 页即可下载。iOS 不在 CI 中构建，需在本地 Mac 上自行构建。

**只想重新跑一次构建、不打新 tag 时：**

1. **Re-run**：在 **Actions** 页找到该 tag 对应的那次运行，点进该 run，右上角 **Re-run all jobs**，会用同一 tag 重新构建并覆盖同一次 Release 的产物。
2. **手动触发**：在 **Actions** 页选择 **Release** workflow，点击 **Run workflow**，在 **要重新构建的 tag** 输入框填写 tag（如 `v0.1.0`），运行后会 checkout 该 tag 并重新构建、更新该 tag 的 Release。

**Release 正文与 Changelog：**  
CI 创建 Release 时，会从项目根目录的 `CHANGELOG.md` 中提取**当前版本**对应的段落（以 `## [x.y.z]` 开头的区块，到下一个 `##` 或文件末尾为止）写入 Release 正文，再追加 Android、macOS 包说明。版本号需与 tag 一致（如 tag `v0.1.1` 对应 `## [0.1.1]`）。

**Changelog 编写示例：**

在项目根目录维护 `CHANGELOG.md`，按 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式书写。CI 只提取**当前发布版本**的那一段，不会包含 `[Unreleased]` 或其他版本。

```markdown
# Changelog

格式基于 Keep a Changelog。版本号与 tag 一致（如 v0.1.0）。

## [Unreleased]

（此处写尚未发布的改动，发布时再挪到对应版本下）

## [0.1.1] - 2025-01-28

### Added

- 应用内更新主义数据：选择 ism.json → 校验 → 确认后替换
- Android 返回键与全面屏返回手势：详情页返回列表，主界面退出到后台

### Fixed

- 返回键在主界面无法退出到后台的问题

## [0.1.0]

### Added

- 主义主义学习进度：树形列表、详情、学习程度、搜索、展开/折叠
- 跨平台 Windows、Android；链接用系统浏览器打开
```

常用分类：`### Added`、`### Changed`、`### Deprecated`、`### Removed`、`### Fixed`、`### Security`。日期 ` - YYYY-MM-DD` 可选。发布前确保即将打的 tag 对应版本在 `CHANGELOG.md` 里已有 `## [x.y.z]` 段落，否则 Release 正文中该版本会为空。

### 手动发布（不推荐）

如需手动发布，可参考以下步骤：

**1. 更新版本号并打 tag**

```bash
# 手动更新 package.json 中的 version
# 然后创建并推送 tag
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

**2. 本地构建并收集（可选）**

如需本地构建并收集文件：

```bash
pnpm tauri build
pnpm tauri android build
pnpm release:pack
```

脚本会将 exe 与 APK 复制到项目根目录下的 `release/`，文件名形如：
- `ismism-trace-0.1.0-win-x64.exe`
- `ismism-trace-0.1.0-android-universal.apk`（或 `-android-universal-unsigned.apk` 若未配置签名）

`release/` 已加入 `.gitignore`，仅用于本地上传，不提交。

**3. 手动创建 GitHub Release**

使用 GitHub CLI 或网页操作创建 Release 并上传文件（通常不需要，CI 会自动创建）。

### CI 签名配置

workflow 已支持在 CI 中注入 keystore 进行签名。在仓库 **Settings → Secrets and variables → Actions** 中新增以下 Secrets 后，推送 tag 构建出的 Android 包将为已签名包（`*-android-universal.apk`）：

| Secret 名称 | 说明 |
|-------------|------|
| `ANDROID_KEYSTORE_BASE64` | 本机 `.jks` 文件内容经 **Base64 编码** 后的字符串（PowerShell：`[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\upload-keystore.jks"))` 输出到文件后粘贴） |
| `ANDROID_KEYSTORE_PASSWORD` | 创建 keystore 时设置的密码 |
| `ANDROID_KEY_ALIAS` | 密钥别名，与本机 `keystore.properties` 中一致（如 `upload`）；可选，默认 `upload` |

未配置上述 Secrets 时，workflow 会报错并提示配置；配置后 CI 将产出已签名 Universal APK。
