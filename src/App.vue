<script setup lang="ts">
import { ref, onMounted } from "vue";
import IsmList from "./components/IsmList.vue";
import IsmDetail from "./components/IsmDetail.vue";
import { getIsmList, getProgress } from "./api";
import type { IsmItem } from "./types";
import type { ProgressMap } from "./types";

const items = ref<IsmItem[]>([]);
const progress = ref<ProgressMap>({});
const selectedId = ref<string | null>(null);
const searchKeyword = ref("");

onMounted(async () => {
  try {
    const [list, prog] = await Promise.all([getIsmList(), getProgress()]);
    items.value = list;
    progress.value = prog;
  } catch (e) {
    console.error("加载失败", e);
  }
});

function currentLevel(): number {
  if (!selectedId.value) return 0;
  return progress.value[selectedId.value]?.level ?? 0;
}

function onProgressSaved() {
  if (!selectedId.value) return;
  const p = progress.value[selectedId.value];
  if (p) {
    progress.value = { ...progress.value, [selectedId.value]: p };
  }
  getProgress().then((prog) => {
    progress.value = prog;
  });
}
</script>

<template>
  <div class="app" :class="{ 'has-selection': !!selectedId }">
    <header class="header">
      <button
        type="button"
        class="back-btn"
        aria-label="返回列表"
        @click="selectedId = null"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <h1 class="title">主义主义 · 学习进度</h1>
      <input
        v-model="searchKeyword"
        type="text"
        class="search"
        placeholder="搜索名称或编号…"
      />
    </header>
    <div class="main">
      <aside class="sidebar">
        <IsmList
          :items="items"
          :progress="progress"
          :selected-id="selectedId"
          :search-keyword="searchKeyword"
          @select="selectedId = $event"
        />
      </aside>
      <main class="content">
        <IsmDetail
          :id="selectedId"
          :current-level="currentLevel()"
          @progress-saved="onProgressSaved"
        />
      </main>
    </div>
  </div>
</template>

<style>
:root {
  font-family: system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  font-size: 15px;
  line-height: 1.5;
  color: #1e293b;
  background: #f1f5f9;
}
* {
  box-sizing: border-box;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem 0.6rem 0.75rem;
  padding-top: max(0.6rem, env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.back-btn {
  display: none;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #475569;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.back-btn svg {
  width: 1.35rem;
  height: 1.35rem;
  display: block;
}
.back-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.header .title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.02em;
  flex: 1;
  min-width: 0;
}
.search {
  flex: 1;
  max-width: 300px;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  background: #f8fafc;
  color: #1e293b;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search::placeholder {
  color: #94a3b8;
}
.search:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #fff;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
}
.sidebar {
  width: 320px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03);
}
.content {
  flex: 1;
  min-width: 0;
  background: #f8fafc;
}

/* 安卓/小屏：单栏切换，列表与详情二选一，顶部返回；预留顶部安全区避免被状态栏遮挡 */
@media (max-width: 768px) {
  .header {
    padding: 0.5rem 0.75rem;
    padding-top: max(1.25rem, env(safe-area-inset-top, 1.25rem));
  }
  .back-btn {
    display: flex;
  }
  .app:not(.has-selection) .back-btn {
    visibility: hidden;
    pointer-events: none;
  }
  .header .title {
    font-size: 1rem;
  }
  .main {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    max-height: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: none;
  }
  .app.has-selection .sidebar {
    display: none;
  }
  .content {
    flex: 1;
    min-height: 0;
  }
  .app:not(.has-selection) .content {
    display: none;
  }
}

/* 小屏：搜索框可收缩，保证标题和返回可见 */
@media (max-width: 480px) {
  .search {
    max-width: 120px;
  }
}
@media (prefers-color-scheme: dark) {
  :root {
    color: #e2e8f0;
    background: #0f172a;
  }
  .header {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  .header .title { color: #f1f5f9; }
  .sidebar {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.2);
  }
  .content { background: #0f172a; }
  .search {
    background: #334155;
    border-color: #475569;
    color: #f1f5f9;
  }
  .search::placeholder { color: #94a3b8; }
  .search:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
    background: #334155;
  }
}
</style>
