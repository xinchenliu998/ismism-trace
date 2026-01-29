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

## macOS

**命令：** `pnpm tauri build`（在 macOS 上执行）

| 产物 | 路径 |
|------|------|
| 应用包 (.app) | `src-tauri/target/release/bundle/macos/ismism-trace.app` |
| DMG 安装镜像 | `src-tauri/target/release/bundle/dmg/ismism-trace_0.1.0_x64.dmg`（需 `bundle.targets` 包含对应类型） |

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

推送 tag 后，GitHub Actions 会自动构建 Windows exe 和 Android APK，并创建 Release。在 **Actions** 页查看构建进度，完成后在 **Releases** 页即可下载。

**Release 正文与 Changelog：**  
CI 创建 Release 时，会从项目根目录的 `CHANGELOG.md` 中提取**当前版本**对应的段落（以 `## [x.y.z]` 开头的区块，到下一个 `##` 或文件末尾为止）写入 Release 正文，再追加 Android 包说明。版本号需与 tag 一致（如 tag `v0.1.1` 对应 `## [0.1.1]`）。

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
