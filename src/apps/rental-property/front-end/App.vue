<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useCatalogSingleAccordion } from '@/shared/composables/catalog/useCatalogSingleAccordion';
import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';
import type { PropertyWithDetails } from '../shared/types';
import * as api from './api';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';

const HOST_APP_ID = 'app-rental-property';

interface Props {
  serverUrl?: string;
  appDescription?: string;
}
const props = defineProps<Props>();
const { generateUniqueId } = useUniqueElementId();
const toast = useToast();
const { accordionValue, onAccordionChange } = useCatalogSingleAccordion();

const integrationRef = ref<InstanceType<typeof CatalogIntegrationHost> | null>(null);
const base = computed(() => (props.serverUrl ?? '').replace(/\/$/, ''));

const loading = ref(false);
const error = ref<string | null>(null);
const properties = ref<PropertyWithDetails[]>([]);

async function refresh(): Promise<void> {
  if (!base.value) {
    error.value = 'App server is not available.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    properties.value = await api.listProperties(base.value);
  } catch (e) {
    error.value = msg(e);
  } finally {
    loading.value = false;
  }
}

const { reportsChartContext, reloadWorkspace } = useCatalogWorkspaceRefresh({
  hostAppId: HOST_APP_ID,
  serverUrl: () => base.value,
  reload: refresh,
});

async function onIntegrationSuccess(): Promise<void> {
  await reloadWorkspace();
  toast.add({ severity: 'success', summary: 'Property updated', life: 2500 });
}

async function markPaid(id: number): Promise<void> {
  try {
    await api.markPaymentPaid(base.value, id);
    await reloadWorkspace();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Update failed', detail: msg(e), life: 5000 });
  }
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function paymentStatusClass(status: string): Record<string, boolean> {
  return {
    'border-lab-button-border-hover text-lab-general-text': status === 'paid',
    'border-lab-general-border text-lab-general-text': status === 'due',
    'border-red-400/60 text-red-300': status === 'late',
    'text-lab-general-text-muted': status !== 'paid' && status !== 'late' && status !== 'due',
  };
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

onMounted(refresh);
</script>

<template>
  <div
    class="rental-property-app lab-platform-catalog-app app-loaded-container text-lab-general-text w-full min-h-0 h-full flex flex-1 flex-col overflow-hidden p-4 gap-4"
    :id="generateUniqueId('rental-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('rental-header')">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold m-0" :id="generateUniqueId('rental-title')">Rental Property</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">
          {{ props.appDescription || 'Manage rental properties, tenants and rent.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          label="New property"
          icon="pi pi-plus"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('rental-new') } } }"
          @click="integrationRef?.openPrimaryCreate()"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          size="small"
          severity="secondary"
          :loading="loading"
          :pt="{ root: { attrs: { id: generateUniqueId('rental-refresh') } } }"
          @click="reloadWorkspace"
        />
      </div>
    </header>

    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      :chart-context="reportsChartContext"
      id-prefix="rental-reports"
    />

    <CatalogAppFormSection
      title="Properties"
      lead="Leases and rent payment status."
      icon="pi pi-home"
      section-class="catalog-app-workspace-section lab-app-body flex-1 min-h-0 min-w-0 flex flex-col gap-4 overflow-x-hidden"
      id-prefix="rental-main"
    >
      <p v-if="error" class="text-sm text-red-400 m-0" :id="generateUniqueId('rental-error')">{{ error }}</p>
      <p
        v-else-if="!loading && properties.length === 0"
        class="text-sm text-lab-general-text-muted m-0"
        :id="generateUniqueId('rental-empty')"
      >
        No properties yet — use “New property” to add one.
      </p>

      <ul v-else class="catalog-master-list" :id="generateUniqueId('rental-list')">
        <li v-for="p in properties" :key="p.id" :id="generateUniqueId(`rental-wrap-${p.id}`)">
          <section class="lab-form-section catalog-master-record" :id="generateUniqueId(`rental-prop-${p.id}`)">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <h2 class="text-lg font-semibold m-0" :id="generateUniqueId(`rental-prop-title-${p.id}`)">{{ p.name }}</h2>
                <p class="text-xs text-lab-general-text-muted m-0 mt-0.5">
                  {{ p.address || 'No address' }} · {{ p.status }} · {{ money(p.monthlyRentCents) }}/mo
                </p>
              </div>
              <div class="flex gap-1 shrink-0 flex-wrap">
                <Button
                  label="Lease"
                  icon="pi pi-plus"
                  size="small"
                  severity="secondary"
                  :pt="{ root: { attrs: { id: generateUniqueId(`rental-add-lease-${p.id}`) } } }"
                  @click="integrationRef?.openEntityCreate('lease', { propertyId: p.id })"
                />
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'rental', 'edit', p.id, p.address)"
                  @click="integrationRef?.openPrimaryEdit(p.id)"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  text
                  :pt="labRecordActionButtonPt(generateUniqueId, 'rental', 'delete', p.id, p.address)"
                  @click="integrationRef?.openPrimaryDelete(p.id)"
                />
              </div>
            </div>

            <Accordion
              :value="accordionValue(p.id)"
              class="catalog-details-accordion mt-3 w-full min-w-0"
              :pt="{ root: { attrs: { id: generateUniqueId(`rental-details-accordion-${p.id}`) } } }"
              @update:value="(v) => onAccordionChange(p.id, v)"
            >
              <AccordionPanel
                :value="String(p.id)"
                class="min-w-0"
                :pt="{ root: { attrs: { id: generateUniqueId(`rental-details-panel-${p.id}`) } } }"
              >
                <AccordionHeader
                  :pt="{ root: { attrs: { id: generateUniqueId(`rental-details-toggle-${p.id}`) } } }"
                >
                  <span class="text-sm font-medium">
                    Leases & rent
                    <span class="text-lab-general-text-muted font-normal">({{ p.leases.length }})</span>
                  </span>
                </AccordionHeader>
                <AccordionContent
                  :pt="{ root: { attrs: { id: generateUniqueId(`rental-details-body-${p.id}`) } } }"
                >
                  <p
                    v-if="p.leases.length === 0"
                    class="text-xs text-lab-general-text-muted m-0"
                    :id="generateUniqueId(`rental-leases-empty-${p.id}`)"
                  >
                    No leases yet.
                  </p>
                  <div v-else class="catalog-details-inner" :id="generateUniqueId(`rental-leases-${p.id}`)">
                    <section
                      v-for="lease in p.leases"
                      :key="lease.id"
                      class="lab-form-section lab-form-section--nested"
                      :id="generateUniqueId(`rental-lease-${lease.id}`)"
                    >
                      <h4
                        class="lab-form-section__title m-0"
                        :id="generateUniqueId(`rental-lease-title-${lease.id}`)"
                      >
                        <span class="lab-form-section__icon" aria-hidden="true">
                          <i class="pi pi-user" />
                        </span>
                        <span :id="generateUniqueId(`rental-lease-tenant-${lease.id}`)">
                          {{ lease.tenantName }}
                        </span>
                      </h4>
                      <p class="lab-form-section__lead m-0 capitalize">
                        {{ lease.status }} · {{ lease.startDate || '—' }}
                        <template v-if="lease.endDate"> → {{ lease.endDate }}</template>
                      </p>
                      <div class="flex flex-wrap gap-1 mt-2">
                        <Button
                          label="Charge rent"
                          icon="pi pi-plus"
                          size="small"
                          text
                          :pt="{ root: { attrs: { id: generateUniqueId(`rental-charge-${lease.id}`) } } }"
                          @click="integrationRef?.openEntityCreate('rent-payment', { leaseId: lease.id, propertyId: p.id })"
                        />
                        <Button
                          icon="pi pi-pencil"
                          size="small"
                          severity="secondary"
                          text
                          :pt="
                            labRecordActionButtonPt(
                              generateUniqueId,
                              'rental-lease',
                              'edit',
                              lease.id,
                              lease.tenantName,
                            )
                          "
                          @click="integrationRef?.openEntityEdit('lease', lease.id, { propertyId: p.id })"
                        />
                        <Button
                          icon="pi pi-trash"
                          size="small"
                          severity="danger"
                          text
                          :pt="
                            labRecordActionButtonPt(
                              generateUniqueId,
                              'rental-lease',
                              'delete',
                              lease.id,
                              lease.tenantName,
                            )
                          "
                          @click="integrationRef?.openEntityDelete('lease', lease.id, { propertyId: p.id })"
                        />
                      </div>
                      <div class="lab-form-section__children">
                        <div
                          v-if="p.payments.filter((x) => x.leaseId === lease.id).length === 0"
                          class="text-xs text-lab-general-text-muted m-0"
                          :id="generateUniqueId(`rental-payments-empty-${lease.id}`)"
                        >
                          No rent charges yet.
                        </div>
                        <div v-else class="rental-payment-table">
                          <div
                            class="rental-payment-col-head"
                            :id="generateUniqueId(`rental-payment-cols-${lease.id}`)"
                          >
                            <span class="rental-payment-col-head__period">Period</span>
                            <span class="rental-payment-col-head__amount">Amount</span>
                            <span class="rental-payment-col-head__status">Status</span>
                            <span class="rental-payment-col-head__actions" />
                          </div>
                          <ul
                            class="rental-payment-list catalog-accordion-item-list list-none m-0 p-0"
                            :id="generateUniqueId(`rental-payments-${lease.id}`)"
                          >
                            <li
                              v-for="pay in p.payments.filter((x) => x.leaseId === lease.id)"
                              :key="pay.id"
                              class="rental-payment-row"
                              :id="generateUniqueId(`rental-payment-${pay.id}`)"
                            >
                              <span class="rental-payment-row__period text-lab-general-text-muted">
                                {{ pay.periodMonth }}
                              </span>
                              <span class="rental-payment-row__amount">{{ money(pay.amountCents) }}</span>
                              <span
                                class="rental-payment-row__status text-xs capitalize px-2 py-0.5 rounded-full border border-lab-general-border text-center"
                                :class="paymentStatusClass(pay.status)"
                                :id="generateUniqueId(`rental-payment-status-${pay.id}`)"
                              >
                                {{ pay.status }}
                              </span>
                              <div class="rental-payment-row__actions flex gap-0.5 shrink-0 justify-end flex-wrap">
                                <Button
                                  v-if="pay.status !== 'paid'"
                                  label="Mark paid"
                                  size="small"
                                  text
                                  :pt="{ root: { attrs: { id: generateUniqueId(`rental-pay-${pay.id}`) } } }"
                                  @click="markPaid(pay.id)"
                                />
                                <Button
                                  icon="pi pi-pencil"
                                  size="small"
                                  severity="secondary"
                                  text
                                  :pt="{ root: { attrs: { id: generateUniqueId(`rental-edit-payment-${pay.id}`) } } }"
                                  @click="integrationRef?.openEntityEdit('rent-payment', pay.id, { leaseId: lease.id, propertyId: p.id })"
                                />
                                <Button
                                  icon="pi pi-trash"
                                  size="small"
                                  severity="danger"
                                  text
                                  :pt="{ root: { attrs: { id: generateUniqueId(`rental-del-payment-${pay.id}`) } } }"
                                  @click="integrationRef?.openEntityDelete('rent-payment', pay.id, { leaseId: lease.id, propertyId: p.id })"
                                />
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </section>
                  </div>
                </AccordionContent>
              </AccordionPanel>
            </Accordion>
          </section>
        </li>
      </ul>
    </CatalogAppFormSection>

    <CatalogIntegrationHost
      ref="integrationRef"
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      @integration-success="onIntegrationSuccess"
    />

  </div>
</template>

<style scoped>
.rental-payment-table {
  --rental-payment-grid-cols: 6.75rem 5.5rem 5.75rem minmax(5.5rem, 1fr);
  min-width: 0;
  width: calc(100% + 1.3rem);
  max-width: none;
  margin-inline: -0.65rem;
}

.rental-payment-col-head,
.rental-payment-row {
  display: grid;
  grid-template-columns: var(--rental-payment-grid-cols);
  align-items: center;
  column-gap: 0.65rem;
  width: 100%;
  box-sizing: border-box;
}

.rental-payment-col-head {
  padding: 0.35rem 0.65rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--lab-general-text-muted);
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-border) 55%, transparent);
}

.rental-payment-col-head__amount,
.rental-payment-row__amount {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.rental-payment-col-head__status,
.rental-payment-row__status {
  justify-self: start;
  min-width: 4.5rem;
}

.rental-payment-col-head__actions,
.rental-payment-row__actions {
  justify-self: end;
}

.rental-payment-row__period {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}

.rental-payment-row__amount {
  font-size: 0.875rem;
  font-weight: 500;
}

:global(.rental-property-app .catalog-accordion-item-list > li.rental-payment-row) {
  padding-block: 0.45rem;
  padding-inline: 0.65rem;
}
</style>
