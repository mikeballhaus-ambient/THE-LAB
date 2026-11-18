/** Resolve designer tab panel index from pointer position over a Tabs container. */
export function resolveTabIndexFromPointer(
  containerFieldKey: string,
  clientX: number,
  clientY: number,
  fallbackIndex: number,
): number {
  const hit = document.elementFromPoint(clientX, clientY);
  if (!hit) {
    return fallbackIndex;
  }

  const zone = hit.closest(`[data-container-key="${CSS.escape(containerFieldKey)}"]`);
  if (!zone) {
    return fallbackIndex;
  }

  const raw = zone.getAttribute('data-tab-index');
  if (raw == null) {
    return fallbackIndex;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallbackIndex;
}
