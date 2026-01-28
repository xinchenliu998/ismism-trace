/**
 * 学习程度配置。
 * 与后端 level 0–4 对应，仅用于展示标签，不可改 key 含义。
 */
export const LEARNING_LEVEL_LABELS: Record<number, string> = {
  0: "未学习",
  1: "了解",
  2: "学习中",
  3: "掌握",
  4: "精通",
};

export const LEARNING_LEVEL_ORDER = [0, 1, 2, 3, 4] as const;
