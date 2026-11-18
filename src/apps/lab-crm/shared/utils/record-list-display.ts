import type {
  ConnectorEntityRecord,
  EntityDefinition,
  EntityProperty,
  LookupLabelsByField,
} from '../types/entity.types';

const PREFERRED_COLUMN_NAMES = [
  'firstName',
  'lastName',
  'name',
  'title',
  'subject',
  'sku',
  'email',
  'status',
  'stage',
  'approvalStatus',
];

export interface ListColumn {
  name: string;
  label: string;
}

export function listDisplayColumns(definition: EntityDefinition | null, max = 5): ListColumn[] {
  const propsList = definition?.properties ?? [];
  if (!propsList.length) {
    return [{ name: 'id', label: 'ID' }];
  }
  const byName = new Map(propsList.map((p) => [p.name, p]));
  const columnCap = byName.has('approvalStatus') ? max + 1 : max;
  const ordered: EntityProperty[] = [];
  for (const name of PREFERRED_COLUMN_NAMES) {
    const p = byName.get(name);
    if (p) {
      ordered.push(p);
    }
  }
  for (const p of propsList) {
    if (!ordered.some((o) => o.name === p.name)) {
      ordered.push(p);
    }
  }
  return ordered.slice(0, columnCap).map((p) => ({ name: p.name, label: p.label || p.name }));
}

/** Properties suitable for quick filter dropdowns (enum + common status fields). */
export function filterableProperties(definition: EntityDefinition | null): EntityProperty[] {
  if (!definition) {
    return [];
  }
  return definition.properties.filter(
    (p) => p.type === 'enum' || p.name === 'status' || p.name === 'stage',
  );
}

export function filterRecords(
  records: ConnectorEntityRecord[],
  options: { q?: string; fieldFilters?: Record<string, string> },
): ConnectorEntityRecord[] {
  let out = records;
  const q = options.q?.trim().toLowerCase();
  if (q) {
    out = out.filter((row) =>
      Object.entries(row).some(([key, val]) => {
        if (key === 'id') {
          return String(val).includes(q);
        }
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }
  const filters = options.fieldFilters ?? {};
  for (const [field, value] of Object.entries(filters)) {
    if (!value) {
      continue;
    }
    out = out.filter((row) => String(row[field] ?? '') === value);
  }
  return out;
}

/** CRM-native display for deal amounts (stored as whole dollars in demo data). Not used by Forms Builder. */
export function formatCrmCurrencyAmount(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCellValue(
  row: Record<string, unknown>,
  field: string,
  options?: {
    property?: EntityProperty;
    lookupLabels?: Record<number, string>;
  },
): string {
  const val = row[field];
  if (val == null || val === '') {
    return '—';
  }
  if (
    options?.property?.type === 'lookup' &&
    typeof val === 'number' &&
    options.lookupLabels?.[val]
  ) {
    return options.lookupLabels[val];
  }
  if (options?.property?.type === 'enum' && options.property.options) {
    const match = options.property.options.find((o) => o.value === String(val));
    if (match) {
      return match.label;
    }
  }
  if (field === 'amount' && options?.property?.type === 'number') {
    const n = typeof val === 'number' ? val : Number(val);
    if (Number.isFinite(n)) {
      return formatCrmCurrencyAmount(n);
    }
  }
  return String(val);
}

export function formatCellValueForDefinition(
  row: Record<string, unknown>,
  field: string,
  definition: EntityDefinition | null,
  lookupLabelsByField?: LookupLabelsByField,
): string {
  const property = definition?.properties.find((p) => p.name === field);
  return formatCellValue(row, field, {
    property,
    lookupLabels: lookupLabelsByField?.[field],
  });
}

export function recordsToCsv(
  columns: ListColumn[],
  rows: ConnectorEntityRecord[],
  definition?: EntityDefinition | null,
  lookupLabelsByField?: LookupLabelsByField,
): string {
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const header = ['id', ...columns.map((c) => c.name)].join(',');
  const lines = rows.map((row) => {
    const cells = ['id', ...columns.map((c) => c.name)].map((key) =>
      escape(formatCellValueForDefinition(row, key, definition ?? null, lookupLabelsByField)),
    );
    return cells.join(',');
  });
  return [header, ...lines].join('\n');
}
