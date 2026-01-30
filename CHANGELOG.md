# Changelog

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。版本号与 tag 一致（如 v0.1.0）。

## [Unreleased]

## [0.1.2]

### Added

- 亮/暗主题：界面跟随系统 `prefers-color-scheme`，背景与文字颜色区分，暗色下可读
- 顶栏亮/暗主题切换按钮（亮色显示月亮、暗色显示太阳），点击切换；选择持久化到本地，下次启动沿用
- macOS 桌面与 iOS 构建与签名说明（docs/build.md），含环境、常见问题、iOS 不参与 CI 的说明
- GitHub Actions：增加 macOS 应用构建（产出 `*-macos-aarch64.zip`）；CI 不构建 iOS
- GitHub Actions：支持手动触发（Run workflow）并指定 tag，无需打新 tag 即可重新构建该版本
- 文档：功能说明与技术说明补充主题、顶栏按钮、CI 范围；README 发布说明与运行示意图路径修正

### Changed

- 应用图标：iOS 工程图标写入 `gen/apple/Assets.xcassets/AppIcon.appiconset/` 的说明与流程（icon.md）

## [0.1.1]

### Added

- 应用内更新主义数据：选择 ism.json → 校验 → 确认后替换
- Android 返回键与全面屏返回手势支持
- GitHub Release脚本CHANGELOG内容支持

## [0.1.0]

### Added

- 主义主义学习进度：树形列表、详情、学习程度、搜索、展开/折叠
- 跨平台：Windows、Android；链接用系统浏览器打开
- 一键发布脚本与 GitHub Release 自动构建