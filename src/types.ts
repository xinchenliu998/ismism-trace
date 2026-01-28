/** 主义条目简要（列表用） */
export interface IsmItem {
  id: string;
  ch_name: string;
  en_name: string;
}

/** 树节点（层级列表用） */
export interface IsmTreeNode {
  id: string;
  ch_name: string;
  en_name: string;
  children: IsmTreeNode[];
}

/** 主义详情 */
export interface IsmEntry {
  ch_name: string;
  en_name: string;
  axis_list: string[];
  feature_list: string[];
  related_list: string[];
}

/** 单条学习进度 */
export interface ProgressEntry {
  level: number;
  updated_at: string;
}

/** 进度表：id -> 进度 */
export type ProgressMap = Record<string, ProgressEntry>;
