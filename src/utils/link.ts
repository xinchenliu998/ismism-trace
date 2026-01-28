/** 从文本中提取 http(s) URL，返回可渲染的段落（文本或链接） */
const URL_RE = /https?:\/\/[^\s<>"']+/g;

export type LinkSegment = { type: "text"; value: string } | { type: "link"; url: string };

export function parseLinkSegments(text: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let lastEnd = 0;
  for (const m of text.matchAll(URL_RE)) {
    const full = m[0];
    const start = m.index!;
    const url = full.replace(/[.,;:)]+$/, "");
    const before = text.slice(lastEnd, start);
    if (before) segments.push({ type: "text", value: before });
    segments.push({ type: "link", url });
    lastEnd = start + full.length;
  }
  const after = text.slice(lastEnd);
  if (after) segments.push({ type: "text", value: after });
  return segments.length ? segments : [{ type: "text", value: text }];
}

/** 文本是否包含可提取的 URL */
export function hasUrl(text: string): boolean {
  return /https?:\/\/\S+/.test(text);
}
