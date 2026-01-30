/**
 * 将各平台构建产物收集到 release/ 目录，便于上传到 GitHub Release。
 * 仅复制当前环境下存在的产物，无对应包不报错（本机通常只有部分平台产物）。
 * 用法: node scripts/release-pack.mjs
 */
import { readFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const name = pkg.name;

const outDir = join(root, "release");
const artifacts = [];

function copy(src, destName) {
  if (!existsSync(src)) return false;
  mkdirSync(outDir, { recursive: true });
  const dest = join(outDir, destName);
  copyFileSync(src, dest);
  artifacts.push(destName);
  return true;
}

/** 目录下首个匹配后缀的文件（仅一层） */
function firstFile(dir, suffix) {
  if (!existsSync(dir)) return null;
  const file = readdirSync(dir).find((f) => f.endsWith(suffix));
  return file ? join(dir, file) : null;
}

/** 目录及其子目录下首个匹配后缀的文件（递归，限制深度） */
function firstFileRecursive(dir, suffix, maxDepth = 4) {
  if (!existsSync(dir) || maxDepth <= 0) return null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith(suffix)) return full;
    if (entry.isDirectory()) {
      const found = firstFileRecursive(full, suffix, maxDepth - 1);
      if (found) return found;
    }
  }
  return null;
}

// Windows exe（tauri.conf 中 mainBinaryName 指定）
const exeSrc = existsSync(join(root, "src-tauri/target/release/ismism-trace.exe"))
  ? join(root, "src-tauri/target/release/ismism-trace.exe")
  : join(root, "src-tauri/target/release/ismism_trace.exe");
copy(exeSrc, `${name}-${version}-win-x64.exe`);

// macOS：DMG 或 .app 不在此脚本打包 zip，仅收集 DMG
const dmgDir = join(root, "src-tauri/target/release/bundle/dmg");
const dmgSrc = firstFile(dmgDir, ".dmg");
if (dmgSrc) copy(dmgSrc, `${name}-${version}-macos-aarch64.dmg`);

// iOS：IPA 位于 gen/apple/build 下（具体路径以构建输出为准）
const iosBuildDir = join(root, "src-tauri/gen/apple/build");
const ipaSrc = firstFileRecursive(iosBuildDir, ".ipa");
if (ipaSrc) copy(ipaSrc, `${name}-${version}-ios.ipa`);

// Android Universal APK
const apkDir = join(root, "src-tauri/gen/android/app/build/outputs/apk/universal/release");
const apkSigned = join(apkDir, "app-universal-release.apk");
const apkUnsigned = join(apkDir, "app-universal-release-unsigned.apk");
if (!copy(apkSigned, `${name}-${version}-android-universal.apk`)) {
  copy(apkUnsigned, `${name}-${version}-android-universal-unsigned.apk`);
}

// Linux：AppImage / .deb
const appimageDir = join(root, "src-tauri/target/release/bundle/appimage");
const debDir = join(root, "src-tauri/target/release/bundle/deb");
const appimageSrc = firstFile(appimageDir, ".AppImage");
const debSrc = firstFile(debDir, ".deb");
if (appimageSrc) copy(appimageSrc, `${name}-${version}-linux-x64.AppImage`);
if (debSrc) copy(debSrc, `${name}-${version}-linux-x64.deb`);

if (artifacts.length === 0) {
  console.log("未找到任何构建产物，release/ 未创建。在对应平台执行 pnpm tauri build 或 pnpm tauri android build / pnpm tauri ios build 后再运行本脚本。");
  process.exit(0);
}

console.log("已复制到 release/：");
artifacts.forEach((f) => console.log("  ", f));
console.log("\n上传到 GitHub Release 示例：");
console.log("  gh release create v" + version + " ./release/* --title \"v" + version + "\" --notes \"发布说明\"");
console.log("或：在 GitHub 仓库 Releases 页创建 Release，选择 tag v" + version + "，拖拽 release/ 下文件上传。");
