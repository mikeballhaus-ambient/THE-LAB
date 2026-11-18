import { AppDatabaseServiceProxy } from '@/apps/lab-chartbuilder/db/app-db-service';
import { DataConnectorsRepository, ChartsRepository } from '@/apps/lab-chartbuilder/db/repositories';
import type { ChartDataMapping, ChartFilterSpec } from '@/shared/charts/chart-data-mapping';
import type { ChartSchema, ChartLegendPosition } from '@/shared/charts/chart-types';
import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';
import type { ProvisionChartStubRequest } from '@/shared/types/schemas/lab-integrations-stub-schema';
import { appsRepository } from '../db/Apps/apps-repository';
import {
  LabIntegrationsError,
  canConfigureHostBindings,
} from '../db/LabIntegrations/lab-integrations-service';
import type { User } from '@/shared/types/user';
import { labIntegrationsHubService } from './lab-integrations-hub-service';
import { buildLabIntegrationsHubDiscoveryUrl } from './lab-integrations-hub-url';
import { resolveLiveDiscoveryUrl } from './resolve-live-discovery-url';
import {
  catalogChartDataMapping,
  catalogChartLegendOptions,
  catalogChartTimelineOptions,
  catalogChartType,
  isCatalogHostAppId,
} from '@/shared/config/catalog-chart-config';

export interface ProvisionChartStubResult {
  chartKey: string;
  connectorId: number;
  created: boolean;
}

export function defaultChartKeyForStub(hostAppId: string, serviceId: string, slot: string): string {
  const host = hostAppId.replace(/^app-/, '');
  const slotPart = slot.replace(/\./g, '-');
  return `${host}.${serviceId}.${slotPart}`.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function resolveSlotLabel(hostAppId: string, slot: string): string {
  const manifest = appsRepository.getIntegrationManifest(hostAppId);
  const accept = manifest?.accepts?.find((row) => row.slot === slot);
  return accept?.label ?? slot;
}

function datasetLabelForService(serviceId: string): string {
  if (serviceId.startsWith('help-desk.')) {
    return 'Tickets';
  }
  if (serviceId.startsWith('crm.')) {
    return 'Records';
  }
  if (serviceId.includes('ledger')) {
    return 'Ledger entries';
  }
  return 'Tasks';
}

function defaultMappingForSlot(slot: string, serviceId: string): ChartDataMapping {
  const label = datasetLabelForService(serviceId);
  if (slot.includes('pipeline') && serviceId.startsWith('crm.')) {
    return {
      mode: 'aggregate',
      groupByField: 'stage',
      measure: 'sum',
      measureField: 'amount',
      datasetLabel: 'Pipeline',
    };
  }
  if (slot.includes('priority')) {
    return {
      mode: 'aggregate',
      groupByField: 'priority',
      measure: 'count',
      datasetLabel: label,
    };
  }
  if (slot.includes('queue-funnel') && serviceId === 'help-desk.tickets') {
    return {
      mode: 'aggregate',
      groupByField: 'status',
      measure: 'count',
      datasetLabel: label,
      labelOrder: ['new', 'open', 'pending', 'resolved', 'closed'],
      funnelCumulative: true,
    };
  }
  if (slot.includes('stage') || slot.includes('funnel')) {
    return {
      mode: 'aggregate',
      groupByField: serviceId === 'crm.leads' ? 'status' : 'stage',
      measure: 'count',
      datasetLabel: label,
    };
  }
  if (slot.includes('portfolio')) {
    return {
      mode: 'aggregate',
      groupByField: 'status',
      measure: 'count',
      datasetLabel: label,
    };
  }
  if (slot.includes('activity') && serviceId.includes('ledger')) {
    return {
      mode: 'aggregate',
      groupByField: 'debitAccountLabel',
      measure: 'sum',
      measureField: 'amountDollars',
      datasetLabel: 'Posting volume (USD)',
    };
  }
  if (slot.includes('postings-by-credit') && serviceId.includes('ledger')) {
    return {
      mode: 'aggregate',
      groupByField: 'creditAccountLabel',
      measure: 'sum',
      measureField: 'amountDollars',
      datasetLabel: 'Credits (USD)',
    };
  }
  if (slot.includes('account-balances') && serviceId.includes('ledger')) {
    return {
      mode: 'aggregate',
      groupByField: 'code',
      measure: 'sum',
      measureField: 'balanceDollars',
      datasetLabel: 'Balance (USD)',
    };
  }
  return {
    mode: 'aggregate',
    groupByField: 'status',
    measure: 'count',
    datasetLabel: label,
  };
}

function defaultChartTypeForSlot(slot: string): ChartSchema['chartType'] {
  if (slot.includes('funnel') || slot.includes('pipeline')) {
    return 'funnel';
  }
  if (slot.includes('portfolio')) {
    return 'line';
  }
  if (slot.includes('service-by-status')) {
    return 'doughnut';
  }
  if (slot.includes('service-by-priority')) {
    return 'pie';
  }
  if (slot.includes('postings-by-credit')) {
    return 'doughnut';
  }
  if (slot.includes('account-balances')) {
    return 'bar';
  }
  return 'bar';
}

function defaultFiltersForService(serviceId: string, hostAppId?: string): ChartFilterSpec[] {
  if (hostAppId && isCatalogHostAppId(hostAppId)) {
    return [];
  }
  if (
    serviceId.startsWith('help-desk.') ||
    serviceId.startsWith('crm.') ||
    serviceId.includes('ledger')
  ) {
    return [];
  }
  return [{ contextKey: 'taskListId', targetParam: 'taskListId', required: true }];
}

export async function provisionChartStubInChartBuilderDb(
  input: ProvisionChartStubRequest & { contract: FormsBuilderContract; chartName: string },
  repos: { connectors: DataConnectorsRepository; charts: ChartsRepository },
): Promise<ProvisionChartStubResult> {
  const chartKey = input.suggestedChartKey ?? defaultChartKeyForStub(input.hostAppId, input.serviceId, input.slot);
  const manifest = appsRepository.getIntegrationManifest(input.hostAppId);
  const service = manifest?.integrationServices?.find((row) => row.serviceId === input.serviceId);
  const discoveryUrl =
    service?.tier === 'platform'
      ? buildLabIntegrationsHubDiscoveryUrl(input.hostAppId, input.serviceId)
      : resolveLiveDiscoveryUrl(
          input.contract,
          service?.connector?.discoveryPath ?? '/discovery/task',
        );

  let connector = repos.connectors.findByAppEntity(input.contract.appName, input.contract.entityName);
  if (connector) {
    connector = repos.connectors.update(connector.id, { discoveryUrl, isActive: true })!;
  } else {
    connector = repos.connectors.create({
      appName: input.contract.appName,
      entityName: input.contract.entityName,
      discoveryUrl,
    });
  }

  const existing = repos.charts.findByKey(chartKey);
  const mapping = isCatalogHostAppId(input.hostAppId)
    ? catalogChartDataMapping(
        input.hostAppId,
        input.slot,
        resolveSlotLabel(input.hostAppId, input.slot),
      )
    : defaultMappingForSlot(input.slot, input.serviceId);
  const allowedFilters = defaultFiltersForService(input.serviceId, input.hostAppId);
  const resolvedCatalogChartType = isCatalogHostAppId(input.hostAppId)
    ? catalogChartType(input.hostAppId, input.slot)
    : undefined;
  const catalogTimelineOpts = isCatalogHostAppId(input.hostAppId)
    ? catalogChartTimelineOptions(input.hostAppId, input.slot)
    : {};
  const catalogLegendOpts = isCatalogHostAppId(input.hostAppId)
    ? catalogChartLegendOptions(input.hostAppId, input.slot)
    : {};
  const ledgerJournalChart = input.slot.startsWith('ledger.');
  const ledgerLegendRight = input.slot.includes('postings-by-credit');
  const resolvedChartType = input.chartType ?? resolvedCatalogChartType ?? defaultChartTypeForSlot(input.slot);
  const legendDisplayExplicit = catalogLegendOpts.legendDisplay;
  const legendDisplay =
    legendDisplayExplicit !== undefined
      ? legendDisplayExplicit
      : catalogTimelineOpts.timelineChart === true
        ? false
        : true;
  const defaultLegendPosition: ChartLegendPosition =
    resolvedChartType === 'bar' || resolvedChartType === 'line' ? 'bottom' : 'top';
  const chartPayload: ChartSchema = {
    chartKey,
    name: input.chartName,
    description: `catalog stub for ${input.slot}`,
    chartType: resolvedChartType,
    options: {
      title: input.chartName,
      legendDisplay,
      legendPosition:
        ledgerLegendRight
          ? 'right'
          : (catalogLegendOpts.legendPosition ?? (ledgerJournalChart ? 'top' : defaultLegendPosition)),
      showDataLabels:
        catalogTimelineOpts.showDataLabels ??
        (!ledgerJournalChart && mapping.mode !== 'dateRangeSeries'),
      maintainAspectRatio: ledgerJournalChart ? false : undefined,
      ...catalogTimelineOpts,
    },
    layout: { size: ledgerJournalChart ? 62 : 100, maintainAspectRatio: ledgerJournalChart ? false : undefined },
    is_active: true,
    dataConnectorId: connector.id,
    dataMapping: mapping,
    allowedFilters,
  };

  if (existing) {
    if (!input.overwrite) {
      throw new LabIntegrationsError(`Chart already exists for key: ${chartKey}`, 'CONFLICT');
    }
    repos.charts.update(chartKey, chartPayload);
    return { chartKey, connectorId: connector.id, created: false };
  }

  repos.charts.create(chartPayload);
  return { chartKey, connectorId: connector.id, created: true };
}

export class LabIntegrationsChartStubProvisioner {
  async provisionForCaller(
    caller: User,
    input: ProvisionChartStubRequest,
  ): Promise<ProvisionChartStubResult> {
    if (!canConfigureHostBindings(caller, input.hostAppId)) {
      throw new LabIntegrationsError('Not allowed to provision chart stubs for host', 'FORBIDDEN');
    }
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      caller,
      input.hostAppId,
      input.serviceId,
    );
    await AppDatabaseServiceProxy.getInstance().initialize();
    const proxy = AppDatabaseServiceProxy.getInstance();
    return provisionChartStubInChartBuilderDb(
      {
        ...input,
        contract,
        chartName: resolveSlotLabel(input.hostAppId, input.slot),
      },
      {
        connectors: proxy.getDataConnectorsRepository(),
        charts: proxy.getChartsRepository(),
      },
    );
  }
}

export const labIntegrationsChartStubProvisioner = new LabIntegrationsChartStubProvisioner();
