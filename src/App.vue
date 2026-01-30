<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import IsmList from "./components/IsmList.vue";
import IsmDetail from "./components/IsmDetail.vue";
import {
  getIsmList,
  getProgress,
  readIsmFile,
  validateIsmContent,
  applyIsmContent,
} from "./api";
import type { IsmItem } from "./types";
import type { ProgressMap } from "./types";

const THEME_KEY = "theme";
type ThemeMode = "light" | "dark" | "system";

const theme = ref<ThemeMode>(
  (localStorage.getItem(THEME_KEY) as ThemeMode) ?? "system"
);
const systemDark = ref(
  typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
);

const effectiveTheme = computed<"light" | "dark">(() => {
  if (theme.value === "system") return systemDark.value ? "dark" : "light";
  return theme.value;
});

function applyTheme() {
  const root = document.documentElement;
  if (theme.value === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme.value);
  }
}

function toggleTheme() {
  theme.value = effectiveTheme.value === "light" ? "dark" : "light";
  localStorage.setItem(THEME_KEY, theme.value);
  applyTheme();
}

// Android 返回键 / 全面屏返回手势：仅在移动端存在
const setupBackKey = async () => {
  try {
    const { onBackKeyDown } = await import("tauri-plugin-app-events-api");
    onBackKeyDown(() => {
      if (selectedId.value != null) {
        selectedId.value = null;
        return false; // 已处理，阻止系统默认返回
      }
      return true; // 未处理，交给系统
    });
  } catch {
    // 桌面端无此 API，忽略
  }
};

const items = ref<IsmItem[]>([]);
const progress = ref<ProgressMap>({});
const selectedId = ref<string | null>(null);
const searchKeyword = ref("");

let mediaQuery: MediaQueryList | null = null;
let mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;

onMounted(async () => {
  applyTheme();
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  systemDark.value = mediaQuery.matches;
  mediaQueryHandler = (e: MediaQueryListEvent) => {
    systemDark.value = e.matches;
  };
  mediaQuery.addEventListener("change", mediaQueryHandler);
  setupBackKey();
  try {
    const [list, prog] = await Promise.all([getIsmList(), getProgress()]);
    items.value = list;
    progress.value = prog;
  } catch (e) {
    console.error("加载失败", e);
  }
});

onUnmounted(() => {
  if (mediaQuery && mediaQueryHandler) {
    mediaQuery.removeEventListener("change", mediaQueryHandler);
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

const ismUpdateLoading = ref(false);
const ismUpdateError = ref<string | null>(null);

async function runIsmUpdate() {
  ismUpdateError.value = null;
  const raw = await openFileDialog({
    title: "选择 ism.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  const path = raw == null ? null : Array.isArray(raw) ? raw[0] : raw;
  if (!path) return;
  ismUpdateLoading.value = true;
  try {
    const content = await readIsmFile(path);
    const preview = await validateIsmContent(content);
    const ok = window.confirm(
      `校验通过，发现 ${preview.entry_count} 条主义。确认替换当前数据？`
    );
    if (!ok) return;
    await applyIsmContent(content);
    selectedId.value = null;
    const [list, prog] = await Promise.all([getIsmList(), getProgress()]);
    items.value = list;
    progress.value = prog;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ismUpdateError.value = msg.includes("JSON") ? "解析错误，已保持原数据。" : msg;
  } finally {
    ismUpdateLoading.value = false;
  }
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
      <button
        type="button"
        class="theme-btn"
        :aria-label="effectiveTheme === 'light' ? '切换到暗色模式' : '切换到亮色模式'"
        :title="effectiveTheme === 'light' ? '切换到暗色模式' : '切换到亮色模式'"
        @click="toggleTheme"
      >
        <!-- 当前为亮色时显示月亮，点击切暗色；当前为暗色时显示太阳，点击切亮色 -->
        <svg v-if="effectiveTheme === 'light'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      </button>
      <button
        type="button"
        class="update-btn"
        aria-label="更新主义数据"
        :disabled="ismUpdateLoading"
        :title="ismUpdateLoading ? '校验中…' : '更新数据'"
        @click="runIsmUpdate"
      >
        <svg v-if="!ismUpdateLoading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
        <svg v-else class="update-btn-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
      </button>
      <p v-if="ismUpdateError" class="update-err" role="alert">
        {{ ismUpdateError }}
      </p>
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
  color: var(--text-secondary);
  background: var(--bg-page);
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
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
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
  color: var(--icon-color);
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
  background: var(--hover-bg);
  color: var(--icon-hover);
}
.header .title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  flex: 1;
  min-width: 0;
}
.search {
  flex: 1;
  max-width: 300px;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 0.9rem;
  background: var(--bg-input);
  color: var(--text-secondary);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search::placeholder {
  color: var(--text-placeholder);
}
.search:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
  background: var(--bg-panel);
}
.theme-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-panel);
  color: var(--icon-color);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.theme-btn svg {
  width: 1.35rem;
  height: 1.35rem;
  display: block;
}
.theme-btn:hover {
  background: var(--hover-bg);
  color: var(--icon-hover);
}
.update-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-panel);
  color: var(--icon-color);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.update-btn svg {
  width: 1.35rem;
  height: 1.35rem;
  display: block;
}
.update-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--icon-hover);
}
.update-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.update-btn-spin {
  animation: update-spin 0.8s linear infinite;
}
@keyframes update-spin {
  to { transform: rotate(360deg); }
}
.update-err {
  margin: 0;
  font-size: 0.8rem;
  color: var(--danger);
  flex-basis: 100%;
  order: 1;
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
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
  overflow: hidden;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03);
}
.content {
  flex: 1;
  min-width: 0;
  background: var(--bg-page);
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
    border-bottom: 1px solid var(--border);
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
/* 暗色模式由 theme.css 的 :root 变量统一控制，此处无需重复覆盖 */
</style>
