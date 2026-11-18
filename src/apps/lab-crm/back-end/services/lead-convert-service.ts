import { EntityRecordService } from './entity-record-service';
import { emitEntityRecordsChanged } from '../utils/crm-socket-broadcast';

export class LeadConvertService {
  private static instance: LeadConvertService | null = null;

  public static getInstance(): LeadConvertService {
    if (!this.instance) {
      this.instance = new LeadConvertService();
    }
    return this.instance;
  }

  private get records(): EntityRecordService {
    return EntityRecordService.getInstance();
  }

  async convertLead(
    leadId: number,
    saleData: Record<string, unknown> = {},
  ): Promise<
    | { lead: Record<string, unknown>; sale: Record<string, unknown> }
    | { error: string; status: number }
  > {
    const lead = await this.records.getByEntityKeyAndId('leads', leadId);
    if (!lead) {
      return { error: 'Lead not found', status: 404 };
    }
    if (lead.status === 'converted') {
      return { error: 'Lead is already converted', status: 400 };
    }
    const contactId = lead.contactId;
    if (contactId == null) {
      return { error: 'Lead has no contactId', status: 400 };
    }
    const salePayload: Record<string, unknown> = {
      name: saleData.name ?? lead.title ?? `Sale from lead #${leadId}`,
      contactId,
      leadId,
      stage: saleData.stage ?? 'prospecting',
      ...saleData,
    };
    const created = await this.records.create('sales', salePayload);
    if (created.errors?.length || !created.record) {
      return {
        error: created.errors?.join('; ') ?? 'Failed to create sale',
        status: 400,
      };
    }
    const updatedLead = await this.records.update('leads', leadId, { status: 'converted' });
    if (updatedLead.notFound || !updatedLead.record) {
      return { error: 'Failed to update lead status', status: 500 };
    }
    emitEntityRecordsChanged('leads');
    emitEntityRecordsChanged('sales');
    return { lead: updatedLead.record, sale: created.record };
  }
}
