import { invoke } from "@tauri-apps/api/core";
import type { IsmEntry, IsmItem, IsmUpdatePreview, ProgressMap } from "./types";

export function getIsmList(): Promise<IsmItem[]> {
  return invoke<IsmItem[]>("get_ism_list");
}

export function getIsmDetail(id: string): Promise<IsmEntry | null> {
  return invoke<IsmEntry | null>("get_ism_detail", { id });
}

export function getProgress(): Promise<ProgressMap> {
  return invoke<ProgressMap>("get_progress");
}

export function setProgress(id: string, level: number): Promise<void> {
  return invoke("set_progress", { id, level });
}

export function readIsmFile(path: string): Promise<string> {
  return invoke<string>("read_ism_file", { path });
}

export function validateIsmContent(content: string): Promise<IsmUpdatePreview> {
  return invoke<IsmUpdatePreview>("validate_ism_content", { content });
}

export function applyIsmContent(content: string): Promise<void> {
  return invoke("apply_ism_content", { content });
}
