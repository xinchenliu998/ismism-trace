import { invoke } from "@tauri-apps/api/core";
import type { IsmEntry, IsmItem, ProgressMap } from "./types";

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
