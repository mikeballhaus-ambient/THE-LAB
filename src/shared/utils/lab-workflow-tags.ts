const MAX_WORKFLOW_TAGS = 12;
const MAX_WORKFLOW_TAG_LENGTH = 32;

function normalizeOneTag(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > MAX_WORKFLOW_TAG_LENGTH) {
    return trimmed.slice(0, MAX_WORKFLOW_TAG_LENGTH);
  }
  return trimmed;
}

/** Canonical tag list for persistence and API responses. */
export function normalizeLabWorkflowTags(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of input) {
    if (typeof entry !== 'string') {
      continue;
    }
    const tag = normalizeOneTag(entry);
    if (!tag) {
      continue;
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_WORKFLOW_TAGS) {
      break;
    }
  }
  return out;
}

export function labWorkflowTagKey(label: string): string {
  return label.trim().toLowerCase();
}

export function parseLabWorkflowTagsJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    return normalizeLabWorkflowTags(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}