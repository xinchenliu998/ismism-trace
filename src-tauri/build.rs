use std::fs;
use std::path::Path;

fn main() {
    // 将项目根目录的 ism.json 复制到 src-tauri，供 include_str! 使用
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let project_root = manifest_dir.parent().unwrap();
    let src = project_root.join("ism.json");
    let dst = manifest_dir.join("ism.json");
    if src.exists() {
        fs::copy(&src, &dst).expect("复制 ism.json 到 src-tauri 失败");
    }

    // Windows：显式指定 exe 图标路径（绝对路径），确保资源嵌入正确，避免仅运行时 set_icon 导致文件图标仍为默认
    let mut attrs = tauri_build::Attributes::default();
    if cfg!(target_os = "windows") {
        let icon_path = manifest_dir.join("icons").join("icon.ico");
        if icon_path.exists() {
            attrs = attrs.windows_attributes(
                tauri_build::WindowsAttributes::new().window_icon_path(&icon_path),
            );
        }
    }
    tauri_build::try_build(attrs).expect("tauri build 失败");
}
