<script setup lang="ts">
import { computed } from 'vue';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ToggleSwitch from 'primevue/toggleswitch';
import { useMCPServerManagement } from '@/shared/composables/components/useMCPServerManagement';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labRecordActionButtonPt } from '@/shared/constants/lab-record-automation';
import { IMCPServerConfig, McpStdioAccessPayload, User } from '@/shared/types';

const { generateUniqueId } = useUniqueElementId();

const props = defineProps<{
  mcpServers: IMCPServerConfig[];
  user: User | { userId: number; role?: User['role'] };
  handleMcpServerSave: (data: {
    userId?: number;
    action: 'add' | 'update' | 'remove';
    server: IMCPServerConfig;
    serverId?: number;
  }) => void;
  toggleMcpServer: (serverId: number) => void;
  stdioAccess?: McpStdioAccessPayload;
  requestStdioAccess?: (serverId: number, note?: string) => void;
  reviewStdioAccess?: (requestId: number, action: 'approve' | 'deny') => void;
}>();

const isAdminReviewer = computed(
  () => props.user && 'role' in props.user && (props.user.role === 'owner' || props.user.role === 'admin'),
);

const mcpUrlPlaceholder = computed(() => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost';
  return `${baseUrl}:8080`;
});

const {
  transportOptions,
  cwdValue,
  argsValue,
  envValue,
  headersValue,
  urlValue,
  timeoutValueStr,
  mcpServerSelected,
  newMcpServerFormVisible,
  handleSave,
  showNewMcpServerForm,
  saveNewMcpServer,
  newMcpServerForm,
  newMcpServerValidator,
  newMcpServerFormValidated,
  toggleEnabled,
  openEditForm,
  isEditing,
  toolPreviewActive,
  toggleToolPreview,
  commandOptions,
  canModify,
  canToggleServer,
} = useMCPServerManagement(
  () => props.mcpServers,
  (data) => props.handleMcpServerSave(data),
  (serverId) => props.toggleMcpServer(serverId),
  () => isAdminReviewer.value,
);

const stdioAccess = computed(() => props.stdioAccess ?? { allowlistedServerIds: [], myRequests: [], pendingForReview: [] });

function isStdioAllowlisted(serverId: number | undefined): boolean {
  if (serverId == null) return false;
  return stdioAccess.value.allowlistedServerIds.includes(serverId);
}

function pendingRequestForServer(serverId: number | undefined) {
  if (serverId == null) return undefined;
  return stdioAccess.value.myRequests.find((r) => r.serverId === serverId && r.status === 'pending');
}

function requestStdio(serverId: number | undefined) {
  if (serverId == null || !props.requestStdioAccess) return;
  props.requestStdioAccess(serverId);
}

function reviewStdio(requestId: number, action: 'approve' | 'deny') {
  props.reviewStdioAccess?.(requestId, action);
}

</script>

<template>
  <div class="flex flex-col gap-4 min-h-0 pb-2">

    <div class="flex justify-between items-center">
      <div class="flex flex-col gap-1">
        <div class="text-sm text-lab-general-text">Configure MCP servers for the Lab Assistant</div>
        <div class="text-xs italic text-lab-general-text-muted">Use Personas tab to configure permissions</div>
      </div>
      <!-- Add Button -->
      <div class="flex justify-end">
        <Button label="Add New Server" icon="pi pi-plus" severity="success" @click="showNewMcpServerForm" />
      </div>
    </div>

    <!-- Server List -->
    <div v-if="props.mcpServers.length > 0" class="flex flex-col gap-3">
      <div v-for="server in props.mcpServers" :key="server.id"
        class="lab-settings-inner-panel flex items-center justify-between gap-4 p-4 transition-colors hover:border-lab-button-border-hover!">
        <div class="flex items-center gap-4" :class="{ 'flex-1': !(server.enabled && !server.isConnected && server.connectionError) }">
          <i
            class="fa fa-plug text-xl"
            :class="server.enabled ? 'text-lab-button-border-hover!' : 'text-lab-general-text-muted!'"
          ></i>
          <i class="fa fa-circle" :class="{
            'text-green-500': server.enabled && server.isConnected,
            'text-amber-400': server.enabled && !server.isConnected && server.connectionError === 'Connecting…',
            'text-red-500': server.enabled && !server.isConnected && server.connectionError !== 'Connecting…',
            'text-lab-general-text-muted': !server.enabled
          }" />
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="font-medium text-lab-general-text">{{ server.name }}</span>
              <ToggleSwitch v-model="server.enabled" :disabled="!props.user.userId || !canToggleServer(server.name)" @click="toggleEnabled(server.id)" />
            </div>
            <div class="text-xxs text-lab-general-text-muted">
              {{ server.transport }}
            </div>
          </div>
          <div v-if="server.enabled && server.isConnected && server.tools && server.tools?.length > 0" class="flex flex-col min-h-[45px]!">
            <div @click="toggleToolPreview(server.id)"
              class="mb-2 flex cursor-pointer items-center justify-start gap-1 text-sm text-lab-general-text">
              <i class="fa fa-screwdriver-wrench text-lab-general-text-muted"></i>
              <div>Available tools:</div>
              <i class="fa text-lab-general-text-muted" :class="{
                'fa-chevron-down': !toolPreviewActive.includes(server.id),
                'fa-chevron-up': toolPreviewActive.includes(server.id),
              }"></i>
            </div>
            <div v-if="toolPreviewActive.includes(server.id)"
              class="absolute z-50 -ml-[100px] mt-10 max-h-[400px] overflow-auto rounded-lg border border-lab-general-border bg-lab-general-bg p-2 text-xs shadow">
              <div v-for="(tool, idx) in server.tools" :key="tool.id" class="flex flex-col">
                <div
                  class="flex gap-2 px-2 py-1 text-lab-general-text"
                  :class="{
                  'bg-lab-general-bg': idx % 2 != 0,
                  'bg-lab-header-bg': idx % 2 == 0,
                  'rounded-t-md': idx == 0,
                  'rounded-b-md': idx == (server.tools.length - 1)
                }">
                  <div class="min-w-[150px] font-semibold">{{ tool.name }}:</div>
                  <div>{{ tool.description }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="server.enabled && !server.isConnected && server.connectionError" class="flex flex-col flex-1 gap-2">
          <span class="text-xs font-semibold text-lab-general-text">MCP Error:</span>
          <span class="text-xs text-lab-general-text-muted">{{ server.connectionError }}</span>
        </div>
        <div v-if="canModify(server.name)" class="flex items-center gap-2">
          <Button
            label="Edit"
            icon="pi pi-pencil"
            severity="secondary"
            size="small"
            :pt="labRecordActionButtonPt(generateUniqueId, 'mcp-server', 'edit', server.id, server.name)"
            @click="openEditForm(server.id)"
          />
          <Button
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            size="small"
            :pt="labRecordActionButtonPt(generateUniqueId, 'mcp-server', 'delete', server.id, server.name)"
            @click="mcpServerSelected = server.id; handleSave('remove');"
          />
        </div>
        <div v-else-if="server.transport === 'stdio' && props.requestStdioAccess && !isAdminReviewer" class="flex flex-col items-end gap-1 text-xs">
          <span v-if="isStdioAllowlisted(server.id)" class="text-green-400">Production stdio approved</span>
          <span v-else-if="pendingRequestForServer(server.id)" class="text-amber-300">Access pending review</span>
          <Button v-else label="Request stdio access" size="small" severity="secondary"
            :pt="{ root: { attrs: { id: generateUniqueId('mcp-stdio-request') } } }"
            @click="requestStdio(server.id)" />
        </div>
      </div>
    </div>

    <div v-if="isAdminReviewer && stdioAccess.pendingForReview.length > 0"
      class="flex flex-col gap-2 rounded-lg border border-lab-general-border bg-lab-general-bg p-4">
      <div class="text-sm font-medium text-lab-general-text">Pending stdio MCP access requests</div>
      <div
        v-for="req in stdioAccess.pendingForReview"
        :key="req.id"
        class="flex flex-wrap items-center justify-between gap-2 border-b border-lab-general-border pb-2 text-xs text-lab-general-text"
      >
        <div>
          <span class="font-semibold">{{ req.requesterName || req.requesterEmail || `User ${req.userId}` }}</span>
          → {{ req.serverName || `server #${req.serverId}` }}
        </div>
        <div class="flex gap-2">
          <Button label="Approve" size="small" severity="success"
            :pt="{ root: { attrs: { id: generateUniqueId('mcp-stdio-approve') } } }"
            @click="reviewStdio(req.id, 'approve')" />
          <Button label="Deny" size="small" severity="danger"
            :pt="{ root: { attrs: { id: generateUniqueId('mcp-stdio-deny') } } }"
            @click="reviewStdio(req.id, 'deny')" />
        </div>
      </div>
    </div>

    <div v-if="props.mcpServers.length === 0" class="py-8 text-center text-sm text-lab-general-text-muted">
      No MCP servers configured. Click "Add New Server" to create one.
    </div>

    <!-- Add/Edit Dialog -->
    <Dialog v-model:visible="newMcpServerFormVisible" modal :pt="{ mask: { class: 'settings-modal-child' } }"
      header="Configure MCP Server" :style="{ width: '60rem' }"
      class="lab-settings-dialog w-[800px] h-[650px]" :breakouts="{ disabled: true }">
      <div class="lab-settings-inner-panel flex h-full flex-1 flex-col p-6">
        <form @submit.prevent="saveNewMcpServer" class="">

          <!-- Dynamic Header with Edit Indicator -->
          <div v-if="isEditing" class="mb-2 text-sm text-lab-general-text-muted">
            Editing server: {{ newMcpServerForm.name }}
          </div>
          <div class="flex flex-col gap-4 text-lab-general-text">
            <!-- Name -->
            <div class="flex gap-2 items-center">
              <label for="new-mcp-server-name" class="min-w-[100px]! w-[100px]!">Name:</label>
              <InputText id="new-mcp-server-name" type="text" v-model="newMcpServerForm.name"
                placeholder="Enter server name" class="min-w-[250px] bg-lab-general-bg!"
                :class="{ 'border-red-800!': !newMcpServerValidator.isValid && newMcpServerFormValidated && newMcpServerValidator.validators.name.length > 0 }" />
              <div
                v-if="!newMcpServerValidator.isValid && newMcpServerFormValidated && newMcpServerValidator.validators.name.length > 0">
                <span class="text-red-200" v-for="(msg, idx) in newMcpServerValidator.validators.name" :key="idx">{{ msg
                }}</span>
              </div>
            </div>

            <!-- Transport Type -->
            <div class="flex gap-2 items-center">
              <label for="new-mcp-server-transport" class="min-w-[100px]! w-[100px]!">Transport:</label>
              <Select id="new-mcp-server-transport" v-model="newMcpServerForm.transport" :options="transportOptions"
                optionLabel="label" optionValue="value" placeholder="Select transport"
                class="min-w-[200px] bg-lab-general-bg!"
                :class="{ 'border-red-800!': !newMcpServerValidator.isValid && newMcpServerFormValidated && newMcpServerValidator.validators.transport.length > 0 }">
              </Select>
              <div
                v-if="!newMcpServerValidator.isValid && newMcpServerFormValidated && newMcpServerValidator.validators.transport.length > 0">
                <span class="text-red-200" v-for="(msg, idx) in newMcpServerValidator.validators.transport" :key="idx">{{ msg
                }}</span>
              </div>
            </div>

            <!-- Command -->
            <div v-show="newMcpServerForm.transport == 'stdio'" class="flex gap-2 items-center">
              <label for="new-mcp-server-command" class="min-w-[100px]! w-[100px]!">Command:</label>
              <Select id="new-mcp-server-command" v-model="newMcpServerForm.command" :options="commandOptions"
                optionLabel="label" optionValue="value" placeholder="Select command"
                class="min-w-[200px] bg-lab-general-bg!">
              </Select>
            </div>

            <!-- Working Directory -->
            <div v-show="newMcpServerForm.transport == 'stdio'" class="flex gap-2 items-center">
              <label for="new-mcp-server-cwd" class="min-w-[100px]! w-[100px]!">Working Dir:</label>
              <InputText id="new-mcp-server-cwd" type="text" v-model="cwdValue" placeholder="/path/to/dir"
                class="min-w-[250px] bg-lab-general-bg!" />
            </div>

            <!-- Arguments (JSON) -->
            <div v-show="newMcpServerForm.transport == 'stdio'" class="flex gap-2 items-start">
              <label for="new-mcp-server-args" class="min-w-[100px]! w-[100px]!">Arguments:</label>
              <div class="w-full flex-1">
                <Textarea id="new-mcp-server-args" v-model="argsValue" rows="5"
                  class="font-mono! w-full text-xs! bg-lab-general-bg!" placeholder='["arg1", "arg2"]' />
              </div>
            </div>

            <!-- Environment Variables (JSON) -->
            <div v-show="newMcpServerForm.transport == 'stdio'" class="flex gap-2 items-start">
              <label for="new-mcp-server-env" class="min-w-[100px]! w-[100px]!">Environment:</label>
              <div class="w-full flex-1">
                <Textarea id="new-mcp-server-env" v-model="envValue" rows="4"
                  class="font-mono! w-full text-xs! bg-lab-general-bg!" placeholder='{"KEY": "value"}' />
              </div>
            </div>

            <!-- HTTP Headers (JSON) - for HTTP transport -->
            <div v-show="newMcpServerForm.transport != 'stdio'" class="flex gap-2 items-start">
              <label for="new-mcp-server-headers" class="min-w-[100px]! w-[100px]!">Headers:</label>
              <div class="w-full flex-1">
                <Textarea id="new-mcp-server-headers" v-model="headersValue" rows="4"
                  class="font-mono! w-full text-xs! bg-lab-general-bg!" placeholder='{"Authorization": "Bearer token"}' />
              </div>
            </div>

            <!-- URL (for HTTP transport) -->
            <div v-show="newMcpServerForm.transport != 'stdio'" class="flex gap-2 items-start">
              <label for="new-mcp-server-url" class="min-w-[100px]! w-[100px]!">URL:</label>
              <InputText id="new-mcp-server-url" type="text" v-model="urlValue" :placeholder="mcpUrlPlaceholder"
                class="min-w-[250px] bg-lab-general-bg!" />
            </div>

            <!-- Timeout -->
            <div v-show="newMcpServerForm.transport != 'stdio'" class="flex gap-2 items-center">
              <label for="new-mcp-server-timeout" class="min-w-[100px]! w-[100px]!">Timeout (s):</label>
              <InputText id="new-mcp-server-timeout" type="text" v-model="timeoutValueStr"
                class="min-w-[120px] bg-lab-general-bg!" />
            </div>

            <!-- Enable/Disable -->
            <div class="flex gap-2 items-center">
              <label for="new-mcp-server-enabled" class="min-w-[100px]! w-[100px]!">Enabled:</label>
              <ToggleSwitch id="new-mcp-server-enabled" v-model="newMcpServerForm.enabled" />
            </div>

          </div>

          <div class="flex justify-center gap-3 pt-4">
            <div><Button type="submit" label="Save Server" icon="pi pi-save" severity="success" class="flex-1" /></div>
            <div><Button type="button" label="Cancel" icon="pi pi-times" severity="secondary"
                @click="newMcpServerFormVisible = false; isEditing = false" class="flex-1" />
            </div>
          </div>
        </form>
      </div>
    </Dialog>
  </div>
</template>
