mod ism;
mod progress;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::path::PathBuf;

use ism::{get_ism_detail as ism_detail, get_ism_list as ism_list};
use progress::{get_progress as progress_get, set_progress as progress_set};
use tauri::{AppHandle, Manager};

/// 解析图标路径：dev 下从 exe 反推项目根再找 src-tauri/icons/icon.ico；仅桌面端使用。
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn icon_path() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let target_dir = exe.parent()?;
    let root = target_dir.parent().and_then(|p| p.parent())?;
    let path: PathBuf = root.join("src-tauri/icons/icon.ico");
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

#[tauri::command]
fn get_ism_list() -> Vec<ism::IsmItem> {
    ism_list()
}

#[tauri::command]
fn get_ism_detail(id: String) -> Option<ism::IsmEntry> {
    ism_detail(&id)
}

#[tauri::command]
fn get_progress(app: AppHandle) -> progress::ProgressMap {
    progress_get(&app)
}

#[tauri::command]
fn set_progress(app: AppHandle, id: String, level: u8) -> Result<(), String> {
    progress_set(&app, id, level)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_ism_list,
            get_ism_detail,
            get_progress,
            set_progress
        ])
        .setup(|app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                if let Some(path) = icon_path() {
                    if let Ok(buf) = std::fs::read(&path) {
                        if let Ok(dyn_img) = image::load_from_memory(&buf) {
                            let rgba = dyn_img.to_rgba8();
                            let (w, h) = rgba.dimensions();
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.set_icon(tauri::image::Image::new_owned(
                                    rgba.into_raw(),
                                    w,
                                    h,
                                ));
                            }
                        }
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
