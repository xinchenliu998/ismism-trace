import type { IsmItem, IsmTreeNode } from "../types";

/** 从扁平列表按 id 层级（1, 1-1, 1-1-1）构建树 */
export function buildTree(items: IsmItem[]): IsmTreeNode[] {
  const byId = new Map<string, IsmTreeNode>();
  for (const item of items) {
    byId.set(item.id, {
      id: item.id,
      ch_name: item.ch_name,
      en_name: item.en_name,
      children: [],
    });
  }
  const roots: IsmTreeNode[] = [];
  for (const item of items) {
    const node = byId.get(item.id)!;
    const segs = item.id.split("-");
    if (segs.length === 1) {
      roots.push(node);
    } else {
      const parentId = segs.slice(0, -1).join("-");
      const parent = byId.get(parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  sortTree(roots);
  return roots;
}

function sortTree(nodes: IsmTreeNode[]): void {
  nodes.sort((a, b) => naturalCmp(a.id, b.id));
  nodes.forEach((n) => sortTree(n.children));
}

function naturalCmp(a: string, b: string): number {
  const segsA = a.split("-").map((s) => (Number.isNaN(Number(s)) ? s : Number(s)));
  const segsB = b.split("-").map((s) => (Number.isNaN(Number(s)) ? s : Number(s)));
  for (let i = 0; i < Math.min(segsA.length, segsB.length); i++) {
    const x = segsA[i];
    const y = segsB[i];
    if (x !== y) return (x as number) < (y as number) ? -1 : 1;
  }
  return segsA.length - segsB.length;
}

/** 根据关键词过滤树：保留自身或任意子节点匹配的节点 */
export function filterTree(
  nodes: IsmTreeNode[],
  keyword: string
): IsmTreeNode[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return nodes;

  function matches(node: IsmTreeNode): boolean {
    return (
      node.ch_name.toLowerCase().includes(kw) ||
      node.en_name.toLowerCase().includes(kw) ||
      node.id.includes(kw)
    );
  }

  function go(node: IsmTreeNode): IsmTreeNode | null {
    const filteredChildren = node.children.map(go).filter(Boolean) as IsmTreeNode[];
    if (matches(node) || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }
    return null;
  }

  return nodes.map(go).filter(Boolean) as IsmTreeNode[];
}
