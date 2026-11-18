export function ticketMetadataEntityFilter(
  entityKey?: string,
  recordId?: number,
): { clause: string; params: (string | number)[] } {
  if (!entityKey?.trim() || recordId == null || Number.isNaN(Number(recordId))) {
    return { clause: '', params: [] };
  }
  return {
    clause: ` AND json_extract(metadata, '$.entityKey') = ? AND CAST(json_extract(metadata, '$.recordId') AS INTEGER) = ?`,
    params: [entityKey.trim(), Number(recordId)],
  };
}
