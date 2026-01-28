<script setup lang="ts">
import { ref, watch } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { IsmEntry } from "../types";
import { getIsmDetail, setProgress } from "../api";
import { LEARNING_LEVEL_LABELS, LEARNING_LEVEL_ORDER } from "../config/learning-levels";
import { hasUrl, parseLinkSegments } from "../utils/link";

const props = defineProps<{
  id: string | null;
  currentLevel: number;
}>();

const emit = defineEmits<{
  progressSaved: [];
}>();

const detail = ref<IsmEntry | null>(null);
const loading = ref(false);
const saving = ref(false);
const selectedLevel = ref(0);
const error = ref<string | null>(null);

watch(
  () => props.id,
  async (id) => {
    selectedLevel.value = props.currentLevel;
    if (!id) {
      detail.value = null;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      detail.value = await getIsmDetail(id);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      detail.value = null;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true }
);

watch(
  () => props.currentLevel,
  (v) => {
    selectedLevel.value = v;
  }
);

async function saveProgress() {
  if (props.id == null) return;
  saving.value = true;
  try {
    await setProgress(props.id, selectedLevel.value);
    emit("progressSaved");
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

function openLink(url: string) {
  openUrl(url).catch((e) => {
    error.value = e instanceof Error ? e.message : String(e);
  });
}
</script>

<template>
  <div class="ism-detail">
    <template v-if="!id">
      <p class="placeholder">从左侧选择一条主义查看详情</p>
    </template>
    <template v-else-if="loading">
      <p class="loading">加载中…</p>
    </template>
    <template v-else-if="error">
      <p class="error">{{ error }}</p>
    </template>
    <template v-else-if="detail">
      <h2 class="title">{{ detail.ch_name }}</h2>
      <p v-if="detail.en_name" class="en-name">{{ detail.en_name }}</p>
      <section v-if="detail.axis_list.length" class="section">
        <h3>场域/轴</h3>
        <ul>
          <li v-for="(a, i) in detail.axis_list" :key="i">{{ a }}</li>
        </ul>
      </section>
      <section v-if="detail.feature_list.length" class="section">
        <h3>特征</h3>
        <ul>
          <li v-for="(f, i) in detail.feature_list" :key="i">{{ f }}</li>
        </ul>
      </section>
      <section v-if="detail.related_list.length" class="section">
        <h3>相关</h3>
        <ul class="related">
          <li v-for="(r, i) in detail.related_list" :key="i">
            <template v-if="hasUrl(r)">
              <template v-for="(seg, j) in parseLinkSegments(r)" :key="j">
                <span v-if="seg.type === 'text'">{{ seg.value }}</span>
                <a
                  v-else
                  href="#"
                  class="ext-link"
                  @click.prevent="openLink(seg.url)"
                >{{ seg.url }}</a>
              </template>
            </template>
            <template v-else>{{ r }}</template>
          </li>
        </ul>
      </section>
      <section class="progress-section">
        <h3>学习程度</h3>
        <div class="level-select">
          <select v-model.number="selectedLevel">
            <option
              v-for="lvl in LEARNING_LEVEL_ORDER"
              :key="lvl"
              :value="lvl"
            >
              {{ LEARNING_LEVEL_LABELS[lvl] }}
            </option>
          </select>
          <button
            type="button"
            class="save-btn"
            :disabled="saving || selectedLevel === currentLevel"
            @click="saveProgress"
          >
            {{ saving ? "保存中…" : "保存进度" }}
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.ism-detail {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  height: 100%;
  color: #334155;
}
.placeholder,
.loading {
  color: #94a3b8;
  margin-top: 2rem;
  font-size: 0.95rem;
}
.error {
  color: #dc2626;
  font-size: 0.9rem;
}
.title {
  margin: 0 0 0.35rem;
  font-size: 1.4rem;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.en-name {
  margin: 0 0 1.25rem;
  color: #64748b;
  font-size: 0.95rem;
}
.section {
  margin-bottom: 1.25rem;
}
.section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.section ul {
  margin: 0;
  padding-left: 1.25rem;
}
.section li {
  margin: 0.35rem 0;
  line-height: 1.5;
}
.related li {
  font-size: 0.9rem;
  color: #475569;
}
.related .ext-link {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.related .ext-link:hover {
  color: #1d4ed8;
}
.progress-section {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
}
.level-select {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.level-select select {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 0.95rem;
  background: #fff;
  color: #1e293b;
  min-width: 7rem;
}
.save-btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.15s;
}
.save-btn:hover:not(:disabled) {
  background: #2563eb;
}
.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
