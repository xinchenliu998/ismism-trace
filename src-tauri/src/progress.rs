//! 学习进度持久化：读写 app_data_dir 下的 progress.json。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const PROGRESS_FILENAME: &str = "progress.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEntry {
    /// 学习程度：0=未学习, 1=了解, 2=学习中, 3=掌握, 4=精通
    pub level: u8,
    pub updated_at: String,
}

pub type ProgressMap = HashMap<String, ProgressEntry>;

fn progress_path(app: &AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_data_dir().ok()?;
    fs::create_dir_all(&dir).ok()?;
    Some(dir.join(PROGRESS_FILENAME))
}

pub fn get_progress(app: &AppHandle) -> ProgressMap {
    let path = match progress_path(app) {
        Some(p) => p,
        None => return ProgressMap::new(),
    };
    let Ok(s) = fs::read_to_string(&path) else {
        return ProgressMap::new();
    };
    serde_json::from_str(&s).unwrap_or_default()
}

pub fn set_progress(app: &AppHandle, id: String, level: u8) -> Result<(), String> {
    if level > 4 {
        return Err("level 必须在 0–4 之间".to_string());
    }
    let path = progress_path(app).ok_or("无法解析 app_data 路径")?;
    let mut map = get_progress(app);
    let updated_at = updated_at_iso();
    map.insert(id, ProgressEntry { level, updated_at });
    let s = serde_json::to_string_pretty(&map).map_err(|e| e.to_string())?;
    fs::write(&path, s).map_err(|e| e.to_string())?;
    Ok(())
}

fn updated_at_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    t.to_string()
}
