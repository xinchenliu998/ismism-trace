//! 解析 ism.json，提供主义条目列表与详情。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// build 时 ism.json 已复制到 src-tauri/ism.json
const ISM_JSON: &str = include_str!("../ism.json");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IsmEntry {
    pub ch_name: String,
    pub en_name: String,
    pub axis_list: Vec<String>,
    pub feature_list: Vec<String>,
    pub related_list: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct IsmItem {
    pub id: String,
    pub ch_name: String,
    pub en_name: String,
}

/// 解析 ism.json，返回所有主义条目（排除 introduction 等非条目键）。
pub fn parse_ism_map() -> HashMap<String, IsmEntry> {
    let root: HashMap<String, serde_json::Value> =
        serde_json::from_str(ISM_JSON).expect("ism.json 解析失败");
    let mut map = HashMap::new();
    for (id, value) in root {
        if id == "introduction" {
            continue;
        }
        if let Some(obj) = value.as_object() {
            if obj.get("ch_name").is_some() {
                if let Ok(entry) = serde_json::from_value::<IsmEntry>(value.clone()) {
                    map.insert(id, entry);
                }
            }
        }
    }
    map
}

/// 获取主义列表，按 id 字典序排序（保证层级顺序 1, 1-1, 1-1-1 等）。
pub fn get_ism_list() -> Vec<IsmItem> {
    let map = parse_ism_map();
    let mut items: Vec<IsmItem> = map
        .into_iter()
        .map(|(id, entry)| IsmItem {
            id: id.clone(),
            ch_name: entry.ch_name,
            en_name: entry.en_name,
        })
        .collect();
    items.sort_by(|a, b| natural_cmp(&a.id, &b.id));
    items
}

/// 获取单个主义详情。
pub fn get_ism_detail(id: &str) -> Option<IsmEntry> {
    let map = parse_ism_map();
    map.get(id).cloned()
}

/// 简单自然序比较：先按段比较数字，再按字符串。
fn natural_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let segs_a: Vec<&str> = a.split('-').collect();
    let segs_b: Vec<&str> = b.split('-').collect();
    for (sa, sb) in segs_a.iter().zip(segs_b.iter()) {
        match (sa.parse::<u32>(), sb.parse::<u32>()) {
            (Ok(na), Ok(nb)) => {
                if na != nb {
                    return na.cmp(&nb);
                }
            }
            _ => return sa.cmp(sb),
        }
    }
    segs_a.len().cmp(&segs_b.len())
}
