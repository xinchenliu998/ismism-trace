<script setup lang="ts">
import { computed, ref } from "vue";
import type { IsmItem, IsmTreeNode } from "../types";
import type { ProgressMap } from "../types";
import { buildTree, filterTree } from "../utils/tree";

const props = defineProps<{
  items: IsmItem[];
  progress: ProgressMap;
  selectedId: string | null;
  searchKeyword: string;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

type LearnFilter = "all" | "learned" | "unlearned";
const learnFilter = ref<LearnFilter>("all");
const expandedIds = ref<Set<string>>(new Set(["1", "2", "3", "4"]));

const tree = computed(() => buildTree(props.items));
const filteredTree = computed(() =>
  filterTree(tree.value, props.searchKeyword)
);

/** 按展开状态压平的节点列表（带深度） */
const flattenedRaw = computed(() => {
  const list: { node: IsmTreeNode; depth: number }[] = [];
  const kw = props.searchKeyword.trim();
  const isSearching = kw.length > 0;

  function walk(nodes: IsmTreeNode[], depth: number, parentExpanded: boolean) {
    for (const node of nodes) {
      const hasChildren = node.children.length > 0;
      const isNodeExpanded = isSearching || expandedIds.value.has(node.id);
      if (parentExpanded || depth === 0) {
        list.push({ node, depth });
      }
      if (hasChildren && isNodeExpanded) {
        walk(node.children, depth + 1, isNodeExpanded);
      }
    }
  }
  walk(filteredTree.value, 0, true);
  return list;
});

/** 再按「已学/未学」筛选后的列表 */
const flattened = computed(() => {
  const raw = flattenedRaw.value;
  if (learnFilter.value === "all") return raw;
  return raw.filter(({ node }) => {
    const lv = props.progress[node.id]?.level ?? 0;
    if (learnFilter.value === "learned") return lv > 0;
    return lv === 0;
  });
});

/** 已学数量（level > 0） */
const learnedCount = computed(() =>
  props.items.filter((i) => (props.progress[i.id]?.level ?? 0) > 0).length
);
const totalCount = computed(() => props.items.length);

function level(id: string): number {
  return props.progress[id]?.level ?? 0;
}

function toggle(id: string) {
  const next = new Set(expandedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedIds.value = next;
}

function select(id: string) {
  emit("select", id);
}

const ROOT_IDS = ["1", "2", "3", "4"];

/** 所有有子节点的 id 集合 */
const idsWithChildren = computed(() => {
  const set = new Set<string>();
  function walk(nodes: IsmTreeNode[]) {
    for (const node of nodes) {
      if (node.children.length > 0) {
        set.add(node.id);
        walk(node.children);
      }
    }
  }
  walk(tree.value);
  return set;
});

const isAllExpanded = computed(() => {
  for (const id of idsWithChildren.value) {
    if (!expandedIds.value.has(id)) return false;
  }
  return idsWithChildren.value.size > 0;
});

function expandAll() {
  expandedIds.value = new Set(props.items.map((i) => i.id));
}

function collapseAll() {
  expandedIds.value = new Set(ROOT_IDS);
}

function toggleExpandCollapseAll() {
  if (isAllExpanded.value) collapseAll();
  else expandAll();
}

/** 仅展开从根到当前选中项的路径 */
function expandToSelected() {
  if (!props.selectedId) return;
  const path: string[] = [];
  const parts = props.selectedId.split("-");
  for (let i = 1; i <= parts.length; i++) {
    path.push(parts.slice(0, i).join("-"));
  }
  expandedIds.value = new Set(path.slice(0, -1));
}
</script>

<template>
  <div class="ism-list">
    <div class="stats">
      <span class="stats-text">已学 {{ learnedCount }} / {{ totalCount }}</span>
    </div>
    <div class="filter-tabs">
      <button
        type="button"
        class="tab"
        :class="{ active: learnFilter === 'all' }"
        @click="learnFilter = 'all'"
      >
        全部
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: learnFilter === 'learned' }"
        @click="learnFilter = 'learned'"
      >
        已学习
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: learnFilter === 'unlearned' }"
        @click="learnFilter = 'unlearned'"
      >
        未学习
      </button>
    </div>
    <div class="toolbar">
      <button
        type="button"
        class="icon-btn icon-btn-expand-collapse"
        :title="isAllExpanded ? '全部折叠' : '全部展开'"
        @click="toggleExpandCollapseAll"
      >
        <svg v-if="isAllExpanded" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-collapse">
          <path d="M17 14l-5-5-5 5M17 8l-5-5-5 5" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-expand">
          <path d="M7 10l5 5 5-5M7 16l5 5 5-5" />
        </svg>
      </button>
      <button
        type="button"
        class="icon-btn"
        :disabled="!selectedId"
        title="仅展开到当前选中项所在路径"
        @click="expandToSelected"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
    </div>
    <ul>
      <li
        v-for="{ node, depth } in flattened"
        :key="node.id"
        :class="{ selected: selectedId === node.id, unlearned: level(node.id) === 0 }"
        :style="{ paddingLeft: depth ? `${0.5 + depth * 1.25}rem` : undefined }"
        @click="select(node.id)"
      >
        <button
          v-if="node.children.length > 0"
          type="button"
          class="toggle"
          :class="{ expanded: expandedIds.has(node.id) }"
          :aria-label="expandedIds.has(node.id) ? '收起' : '展开'"
          @click.stop="toggle(node.id)"
        />
        <span v-else class="toggle-placeholder" />
        <span class="id">{{ node.id }}</span>
        <span class="name">{{ node.ch_name }}</span>
        <span class="level-badge" :data-level="level(node.id)" :class="{ 'is-unlearned': level(node.id) === 0 }">
          {{ level(node.id) === 0 ? "未" : level(node.id) }}
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ism-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.stats {
  flex-shrink: 0;
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
  color: var(--stats-color, #64748b);
  background: var(--toolbar-bg, #f8f9fa);
  border-bottom: 1px solid var(--border, #e8e8e8);
}
.stats-text {
  font-weight: 500;
}
.filter-tabs {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.6rem;
  background: var(--toolbar-bg, #f8f9fa);
  border-bottom: 1px solid var(--border, #e8e8e8);
}
.tab {
  flex: 1;
  min-height: 2rem;
  padding: 0.35rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.tab:hover {
  background: #f1f5f9;
  color: #334155;
}
.tab.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}
.toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--border, #e8e8e8);
  background: var(--toolbar-bg, #f8f9fa);
}
.icon-btn {
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--icon-color, #555);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.icon-btn .icon {
  width: 1.2rem;
  height: 1.2rem;
  display: block;
}
/* 全部展开/折叠两态图标垂直居中一致，避免切换时上下跳动 */
.icon-btn-expand-collapse {
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn-expand-collapse .icon-collapse {
  transform: translateY(0.15em);
}
.icon-btn-expand-collapse .icon-expand {
  transform: translateY(-0.15em);
}
.icon-btn:hover:not(:disabled) {
  background: var(--icon-btn-hover-bg, rgba(0, 0, 0, 0.06));
  color: var(--icon-color-hover, #1a1a1a);
}
.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ism-list ul {
  flex: 1;
  overflow-y: auto;
  margin: 0;
  padding: 0.4rem 0;
}
ul {
  list-style: none;
  margin: 0;
}
li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.6rem;
  margin: 0 0.4rem;
  min-height: 2.5rem;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.12s;
  -webkit-tap-highlight-color: transparent;
}
li:hover {
  background: var(--item-hover-bg, #eef1f4);
}
li.unlearned .name {
  color: var(--unlearned-color, #94a3b8);
}
li.selected {
  background: var(--item-selected-bg, #e3f2fd);
  color: var(--item-selected-color, #1565c0);
}
li.selected .id {
  color: inherit;
  opacity: 0.85;
}
li.selected.unlearned .name {
  color: inherit;
}
.toggle,
.toggle-placeholder {
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
}
.toggle {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--chevron-color, #666);
  transition: color 0.12s, background 0.12s;
}
.toggle::before {
  content: "▶";
  font-size: 0.55rem;
  transition: transform 0.2s ease;
}
.toggle.expanded::before {
  transform: rotate(90deg);
}
.toggle:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--chevron-hover, #333);
}
.toggle-placeholder {
  visibility: hidden;
}
.id {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--id-color, #64748b);
  min-width: 3.2rem;
}
.name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}
.level-badge {
  flex-shrink: 0;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--level-0-bg, #e2e8f0);
  color: var(--level-0-color, #475569);
}
.level-badge.is-unlearned {
  background: #cbd5e1;
  color: #64748b;
  font-size: 0.65rem;
}
.level-badge[data-level="1"] {
  background: #fef3c7;
  color: #b45309;
}
.level-badge[data-level="2"] {
  background: #dbeafe;
  color: #1d4ed8;
}
.level-badge[data-level="3"] {
  background: #d1fae5;
  color: #047857;
}
.level-badge[data-level="4"] {
  background: #ede9fe;
  color: #6d28d9;
}

/* 安卓/小屏：触摸目标至少 44px */
@media (max-width: 768px) {
  .tab {
    min-height: 2.75rem;
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
  }
  .ism-list li {
    min-height: 2.75rem;
    padding: 0.5rem 0.75rem;
  }
  .icon-btn {
    width: 2.5rem;
    height: 2.5rem;
  }
  .icon-btn .icon {
    width: 1.25rem;
    height: 1.25rem;
  }
}
</style>
