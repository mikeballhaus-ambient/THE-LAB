/** SQL fragment for filtering tasks.metadata JSON (CRM entity linkage). */
export function taskMetadataEntityFilter(
  entityKey?: string,
  recordId?: number,
): { clause: string; params: (string | number)[] } {
  if (!entityKey?.trim() || recordId == null || Number.isNaN(Number(recordId))) {
    return { clause: '', params: [] };
  }
  return {
    clause: ` AND json_extract(t.metadata, '$.entityKey') = ? AND CAST(json_extract(t.metadata, '$.recordId') AS INTEGER) = ?`,
    params: [entityKey.trim(), Number(recordId)],
  };
}
