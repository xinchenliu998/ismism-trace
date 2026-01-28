/**
 * 将 Windows exe 与 Android APK 收集到 release/ 目录，便于上传到 GitHub Release。
 * 使用前需已执行：pnpm tauri build、pnpm tauri android build。
 * 用法: node scripts/release-pack.mjs
 */
import { readFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
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

// Windows exe（包名 ismism-trace，tauri.conf 中 mainBinaryName 指定）
const exeSrc = existsSync(join(root, "src-tauri/target/release/ismism-trace.exe"))
  ? join(root, "src-tauri/target/release/ismism-trace.exe")
  : join(root, "src-tauri/target/release/ismism_trace.exe");
copy(exeSrc, `${name}-${version}-win-x64.exe`);

// Android Universal APK（包名 + 版本 + universal + 签名状态）
const apkDir = join(root, "src-tauri/gen/android/app/build/outputs/apk/universal/release");
const apkSigned = join(apkDir, "app-universal-release.apk");
const apkUnsigned = join(apkDir, "app-universal-release-unsigned.apk");
if (!copy(apkSigned, `${name}-${version}-android-universal.apk`)) {
  copy(apkUnsigned, `${name}-${version}-android-universal-unsigned.apk`);
}

if (artifacts.length === 0) {
  console.error("未找到任何构建产物。请先执行：");
  console.error("  pnpm tauri build");
  console.error("  pnpm tauri android build");
  process.exit(1);
}

console.log("已复制到 release/：");
artifacts.forEach((f) => console.log("  ", f));
console.log("\n上传到 GitHub Release 示例：");
console.log("  gh release create v" + version + " ./release/* --title \"v" + version + "\" --notes \"发布说明\"");
console.log("或：在 GitHub 仓库 Releases 页创建 Release，选择 tag v" + version + "，拖拽 release/ 下文件上传。");
