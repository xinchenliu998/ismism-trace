/**
 * 将任意图片（如 JPG）转为正方形 PNG，供 `pnpm tauri icon` 使用。
 * 用法: node scripts/prepare-icon.mjs <图片路径>
 * 输出: src-tauri/app-icon.png（1024×1024，不足则白边填充）
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const defaultInput = resolve(projectRoot, "image/主义主义.jpg");
const outputPath = resolve(projectRoot, "src-tauri/app-icon.png");

async function main() {
  const sharp = (await import("sharp")).default;
  const input = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : defaultInput;

  if (!existsSync(input)) {
    console.error("文件不存在:", input);
    process.exit(1);
  }

  const size = 1024;
  const white = { r: 255, g: 255, b: 255, alpha: 1 };
  const buf = await sharp(input)
    .resize(size, size, { fit: "contain", background: white })
    .toBuffer();
  const { width: w, height: h } = await sharp(buf).metadata();
  const padTop = Math.floor((size - (h ?? 0)) / 2);
  const padBottom = size - (h ?? 0) - padTop;
  const padLeft = Math.floor((size - (w ?? 0)) / 2);
  const padRight = size - (w ?? 0) - padLeft;

  await sharp(buf)
    .extend({ top: padTop, bottom: padBottom, left: padLeft, right: padRight, background: white })
    .png()
    .toFile(outputPath);

  console.log("已生成:", outputPath);
  console.log("请执行: pnpm tauri icon src-tauri/app-icon.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
