import { ledgerMemoForCompany } from '@/shared/utils/ledger-memo-format';
import { EntityRecordService } from '../services/entity-record-service';

function readStringField(record: Record<string, unknown>, key: string): string | undefined {
  const raw = record[key];
  if (raw == null) {
    return undefined;
  }
  const text = String(raw).trim();
  return text === '' ? undefined : text;
}

function readLookupId(record: Record<string, unknown>, key: string): number | undefined {
  const raw = record[key];
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function dealDisplayLabel(
  entityKey: string,
  record: Record<string, unknown>,
  recordLabel?: string,
  recordId?: number,
): string {
  const fromClient = recordLabel?.trim();
  if (fromClient) {
    return fromClient;
  }
  if (entityKey === 'quotes') {
    const title = readStringField(record, 'title');
    if (title) {
      return title;
    }
  }
  const name = readStringField(record, 'name');
  if (name) {
    return name;
  }
  if (recordId != null) {
    return `#${recordId}`;
  }
  return 'CRM deal';
}

async function resolveAccountNameFromContactId(contactId: number): Promise<string | undefined> {
  const records = EntityRecordService.getInstance();
  const contact = await records.getByEntityKeyAndId('contacts', contactId);
  if (!contact) {
    return undefined;
  }
  const companyId = readLookupId(contact, 'companyId');
  if (companyId != null) {
    const account = await records.getByEntityKeyAndId('accounts', companyId);
    const accountName = account ? readStringField(account, 'name') : undefined;
    if (accountName) {
      return accountName;
    }
  }
  return readStringField(contact, 'company');
}

/**
 * Resolves CRM account + journal memo text for ledger post domain events.
 * Uses `{Account} — {Deal}` when an account/company is known (ledger plan §4).
 */
export async function buildCrmLedgerPostEventFields(input: {
  entityKey: string;
  recordId: number;
  recordLabel?: string;
  userMemo?: string;
}): Promise<{
  accountName?: string;
  dealLabel: string;
  ledgerMemo: string;
  eventMemo: string;
}> {
  const records = EntityRecordService.getInstance();
  const deal = await records.getByEntityKeyAndId(input.entityKey, input.recordId);
  const dealData = deal ?? {};
  const dealLabel = dealDisplayLabel(input.entityKey, dealData, input.recordLabel, input.recordId);

  const contactId = readLookupId(dealData, 'contactId');
  const accountName =
    contactId != null ? await resolveAccountNameFromContactId(contactId) : undefined;

  const whatForMemo =
    accountName && dealLabel.startsWith(accountName)
      ? dealLabel.slice(accountName.length).replace(/^[—–-]\s*/, '').trim() || dealLabel
      : dealLabel;

  const ledgerMemo = accountName
    ? ledgerMemoForCompany(accountName, whatForMemo)
    : dealLabel;

  const userMemo = input.userMemo?.trim();
  const eventMemo =
    userMemo
    || (input.recordLabel?.trim()
      ? `CRM ${input.entityKey} — ${input.recordLabel.trim()} (#${input.recordId})`
      : `CRM ${input.entityKey} #${input.recordId}`);

  return {
    accountName,
    dealLabel,
    ledgerMemo,
    eventMemo,
  };
}
