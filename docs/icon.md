# 应用图标生成

从一张源图（如 JPG/PNG 的 logo）生成各平台所需全部图标。

## 要求

- 源图：**正方形 PNG 或 SVG** 更适合；若为 JPG，需先转为正方形 PNG。
- `tauri icon` 默认接受 `./app-icon.png`（正方形、建议 1024×1024）。

## 方式一：一键生成（推荐）

源图放在 `src-tauri/icons/` 下时，可直接执行：

```bash
pnpm icon:gen
```

会先根据默认路径生成 `src-tauri/app-icon.png`，再调用 `tauri icon` 生成全部图标。

若源图路径不同，先单独执行准备脚本再执行 tauri icon：

```bash
node scripts/prepare-icon.mjs 你的图片路径
pnpm tauri icon src-tauri/app-icon.png
```

## 方式二：已有正方形 PNG 时

若已有 1024×1024 的 PNG（或 SVG），在项目根目录执行：

```bash
pnpm tauri icon 路径/to/app-icon.png
```

例如放在项目根时：

```bash
pnpm tauri icon ./app-icon.png
```

## 开发模式下的窗口图标

`pnpm tauri dev` 时，exe 未嵌入图标，窗口会显示默认 Tauri 图标。本应用在启动时会从 `src-tauri/icons/icon.ico` 读取并设置窗口图标（路径由 exe 所在目录反推项目根），因此 **dev 下也会显示自定义图标**。若图标未更新，请确认已执行过 `pnpm icon:gen` 或 `pnpm tauri icon`。

## 输出位置

- **桌面（Windows/macOS/Linux）**：`src-tauri/icons/`含 `32x32.png`、`128x128.png`、`128x128@2x.png`、`icon.ico`、`icon.icns` 等，由 `tauri.conf.json` 的 `bundle.icon` 引用。
- **Android**：自动写入 `src-tauri/gen/android/app/src/main/res/mipmap-*/`（各分辨率 `ic_launcher.png`、`ic_launcher_round.png`、`ic_launcher_foreground.png`）。
- **iOS**：自动写入 `src-tauri/gen/apple/` 下对应 AppIcon 资源（若存在 iOS 工程）。

## 可选参数

- `-o, --output`：指定图标输出目录（默认 `src-tauri/icons`）。
- `--ios-color`：iOS 图标背景色（默认 `#fff`）。
- `-p, --png`：仅生成指定尺寸的 PNG，不生成默认全套（一般不推荐）。

## 脚本说明（prepare-icon.mjs）

- **作用**：把任意比例图片转为 1024×1024 正方形 PNG（白底、等比缩放、不足处留白），供 `tauri icon` 使用。
- **依赖**：`sharp`（已加入 devDependencies）。
- **默认输入**：未传参时使用 `image/主义主义.jpg`。
- **输出**：`src-tauri/app-icon.png`。
