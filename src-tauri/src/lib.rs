mod ism;
mod progress;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::path::PathBuf;

use std::fs;
use std::sync::RwLock;

use ism::{
    get_ism_detail_from_map, get_ism_list_from_map, parse_ism_map_from_str, IsmEntry, IsmUpdatePreview,
};
use progress::{get_progress as progress_get, set_progress as progress_set};
use tauri::{AppHandle, Manager};

/// 主义数据运行时状态；解析错误时保持原数据，仅在用户确认后更新。
struct IsmState(RwLock<std::collections::HashMap<String, IsmEntry>>);

impl IsmState {
    /// 启动时加载：优先 app_data_dir/ism.json，解析失败或不存在则用内置数据。
    fn load_initial(&self, app: &AppHandle) {
        let map = match app.path().app_data_dir() {
            Ok(dir) => {
                let path = dir.join("ism.json");
                if path.exists() {
                    if let Ok(s) = fs::read_to_string(&path) {
                        parse_ism_map_from_str(&s).unwrap_or_else(|_| load_embedded_ism())
                    } else {
                        load_embedded_ism()
                    }
                } else {
                    load_embedded_ism()
                }
            }
            Err(_) => load_embedded_ism(),
        };
        if let Ok(mut guard) = self.0.write() {
            *guard = map;
        }
    }
}

fn load_embedded_ism() -> std::collections::HashMap<String, IsmEntry> {
    parse_ism_map_from_str(include_str!("../ism.json"))
        .expect("内置 ism.json 解析失败")
}

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
fn get_ism_list(app: AppHandle) -> Vec<ism::IsmItem> {
    let state = app.state::<IsmState>();
    let map = state.0.read().expect("ism state lock");
    get_ism_list_from_map(&map)
}

#[tauri::command]
fn get_ism_detail(app: AppHandle, id: String) -> Option<ism::IsmEntry> {
    let state = app.state::<IsmState>();
    let map = state.0.read().expect("ism state lock");
    get_ism_detail_from_map(&map, &id)
}

/// 校验新 ism 内容：仅解析，不修改状态。解析失败返回 Err，成功返回预览。
#[tauri::command]
fn validate_ism_content(content: String) -> Result<IsmUpdatePreview, String> {
    let map = parse_ism_map_from_str(&content)?;
    Ok(ism::IsmUpdatePreview {
        entry_count: map.len(),
    })
}

/// 应用新 ism 内容：再次解析，成功则替换状态并写入 app_data，失败则保持原数据。
#[tauri::command]
fn apply_ism_content(app: AppHandle, content: String) -> Result<(), String> {
    let map = parse_ism_map_from_str(&content)?;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("ism.json");
    fs::write(&path, content.as_bytes()).map_err(|e| e.to_string())?;
    let state = app.state::<IsmState>();
    let mut guard = state.0.write().expect("ism state lock");
    *guard = map;
    Ok(())
}

/// 从路径读取文件内容（用于「选择文件」后传给校验/应用）。路径应由用户通过对话框选择。
#[tauri::command]
fn read_ism_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))
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
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init());
    #[cfg(any(target_os = "android", target_os = "ios"))]
    let builder = builder.plugin(tauri_plugin_app_events::init());
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder;
    builder
        .invoke_handler(tauri::generate_handler![
            get_ism_list,
            get_ism_detail,
            get_progress,
            set_progress,
            validate_ism_content,
            apply_ism_content,
            read_ism_file
        ])
        .manage(IsmState(RwLock::new(std::collections::HashMap::new())))
        .setup(|app| {
            app.state::<IsmState>().load_initial(&app.handle());
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
