//! 解析 ism.json，提供主义条目列表与详情；支持运行时校验与替换。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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

/// 校验/更新时的预览信息
#[derive(Debug, Clone, Serialize)]
pub struct IsmUpdatePreview {
    pub entry_count: usize,
}

/// 从 JSON 字符串解析出条目映射；解析失败返回 Err，不修改任何状态。
pub fn parse_ism_map_from_str(s: &str) -> Result<HashMap<String, IsmEntry>, String> {
    let root: HashMap<String, serde_json::Value> =
        serde_json::from_str(s).map_err(|e| format!("JSON 解析失败: {}", e))?;
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
    Ok(map)
}

/// 从已解析的 map 生成列表（按 id 自然序）
pub fn get_ism_list_from_map(map: &HashMap<String, IsmEntry>) -> Vec<IsmItem> {
    let mut items: Vec<IsmItem> = map
        .iter()
        .map(|(id, entry)| IsmItem {
            id: id.clone(),
            ch_name: entry.ch_name.clone(),
            en_name: entry.en_name.clone(),
        })
        .collect();
    items.sort_by(|a, b| natural_cmp(&a.id, &b.id));
    items
}

/// 从已解析的 map 取单条详情
pub fn get_ism_detail_from_map(map: &HashMap<String, IsmEntry>, id: &str) -> Option<IsmEntry> {
    map.get(id).cloned()
}

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_empty_obj() {
        let r = parse_ism_map_from_str("{}");
        assert!(r.is_ok());
        assert!(r.unwrap().is_empty());
    }

    #[test]
    fn parse_invalid_returns_err() {
        assert!(parse_ism_map_from_str("not json").is_err());
    }
}
