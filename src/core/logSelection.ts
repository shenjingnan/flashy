/**
 * 日志区文本选中相关的纯逻辑，便于单测（不直接依赖 window）。
 */

/** 判断节点是否位于指定容器内（含节点自身）。 */
export function nodeInside(node: Node | null, container: Node | null): boolean {
  return Boolean(node && container?.contains(node));
}

/**
 * 提取选区文本：选区为空/折叠，或起点终点均不在容器内时返回空串。
 *
 * 用 anchorNode/focusNode + container.contains 判断是否与日志视图相交，
 * 比 Range.intersectsNode 更稳，happy-dom 兼容。
 */
export function selectionTextInside(selection: Selection | null, container: Node | null): string {
  if (selection === null || selection.rangeCount === 0) {
    return '';
  }
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    return '';
  }
  if (!nodeInside(selection.anchorNode, container) && !nodeInside(selection.focusNode, container)) {
    return '';
  }
  return selection.toString().trim();
}
