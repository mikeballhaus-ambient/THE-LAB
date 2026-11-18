import { ref, computed } from 'vue';
import { IMCPServerConfig } from '../../../shared/types';
import { SEEDED_MCP_SERVER_NAMES } from '../../../shared/config/default-mcp-servers';

export const useMCPServerManagement = (
  mcpServers: () => IMCPServerConfig[],
  handleMCPServerSave: (data: {
    action: 'add' | 'update' | 'remove';
    server: IMCPServerConfig;
    serverId?: number;
  }) => void,
  toggleMCPServer: (serverId: number) => void,
  isPlatformAdmin: () => boolean = () => false,
) => {

  // Transport options configuration
  const transportOptions = [
    { label: 'stdio', value: 'stdio' as const },
    { label: 'streamable-http', value: 'streamable-http' as const }
  ];

  const commandOptions = [
    { label: 'npx', value: 'npx' as const },
    { label: 'python', value: 'python' as const },
    { label: 'node', value: 'node' as const },
    { label: 'npm', value: 'npm' as const },
    { label: 'cmd.exe', value: 'cmd.exe' as const }
  ]

  const defaultTools: string[] = [...SEEDED_MCP_SERVER_NAMES] as string[];

  const mcpServerSelected = ref<number>(-1);
  const newMcpServerFormVisible = ref<boolean>(false);
  const showRenameOption = ref<boolean>(false);
  const renameMcpServer = ref<string>('');
  const isEditing = ref<boolean>(false);
  const toolPreviewActive = ref<number[]>([])

  const emptyMcpServerModel = (): IMCPServerConfig => {
    return {
      id: -1,
      userId: -1,
      name: '',
      command: '',
      args: [],
      transport: undefined,
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as IMCPServerConfig
  };

  const newMcpServerForm = ref<IMCPServerConfig>(emptyMcpServerModel());
  const newMcpServerFormValidated = ref<boolean>(false);

  // Computed values for JSON fields to avoid v-model issues
  const cwdValue = computed({
    get: () => newMcpServerForm.value.cwd ?? '',
    set: (val: string) => { newMcpServerForm.value.cwd = val === '' ? undefined : val; }
  });

  const argsValue = computed({
    get: () => JSON.stringify(newMcpServerForm.value.args, null, 2),
    set: (val: string) => { newMcpServerForm.value.args = val ? JSON.parse(val) : []; }
  });

  const envValue = computed({
    get: () => JSON.stringify(newMcpServerForm.value.env ?? {}, null, 2),
    set: (val: string) => { newMcpServerForm.value.env = val ? JSON.parse(val) : {}; }
  });

  const headersValue = computed({
    get: () => JSON.stringify(newMcpServerForm.value.headers ?? {}, null, 2),
    set: (val: string) => { newMcpServerForm.value.headers = val ? JSON.parse(val) : {}; }
  });

  const urlValue = computed({
    get: () => newMcpServerForm.value.url ?? '',
    set: (val: string) => { newMcpServerForm.value.url = val === '' ? undefined : val; }
  });

  const timeoutValueStr = computed({
    get: () => String(newMcpServerForm.value.timeout ?? 30),
    set: (val: string) => { newMcpServerForm.value.timeout = parseInt(val, 10) || 30; }
  });

  const openEditForm = (serverId: number) => {
    newMcpServerForm.value = emptyMcpServerModel()
    const serverIndex = mcpServers().findIndex((s) => s.id === serverId);
    if (serverIndex !== -1) {
      newMcpServerForm.value = { ...mcpServers()[serverIndex] };
      isEditing.value = true;
      newMcpServerFormVisible.value = true;
      mcpServerSelected.value = serverId;
    }
  };

  const handleSave = (action: 'add' | 'update' | 'remove') => {
    if (mcpServerSelected.value !== -1) {
      const serverIndex = mcpServers().findIndex((s) => s.id === mcpServerSelected.value);
      if (serverIndex !== -1) {
        newMcpServerForm.value.id = mcpServerSelected.value
        handleMCPServerSave({
          action,
          server: newMcpServerForm.value,
          serverId: mcpServerSelected.value
        });
        newMcpServerForm.value = emptyMcpServerModel()
      }
    } else {
      handleMCPServerSave({
        action: 'add',
        server: newMcpServerForm.value
      });
      newMcpServerForm.value = emptyMcpServerModel()
    }
    mcpServerSelected.value = -1
  };

  const saveNewMcpServer = () => {
    newMcpServerFormValidated.value = true;
    if (newMcpServerValidator.value.isValid) {
      handleMCPServerSave({
        action: isEditing.value ? 'update' : 'add',
        server: newMcpServerForm.value,
        serverId: mcpServerSelected.value
      });
      newMcpServerFormVisible.value = false;
      isEditing.value = false;
      newMcpServerForm.value = emptyMcpServerModel()
    }
  };

  const showNewMcpServerForm = () => {
    newMcpServerFormValidated.value = false;
    newMcpServerForm.value = emptyMcpServerModel();
    newMcpServerForm.value.id = Date.now();
    newMcpServerForm.value.userId = -1; // Will be set by frontend
    newMcpServerFormVisible.value = true;
  };

  const newMcpServerValidator = computed(() => {
    const nameValidated: string[] = [];
    const transportValidated: string[] = []
    if (newMcpServerForm.value.name.length < 3) nameValidated.push('Server name must be at least 3 characters');
    // When editing, exclude the current server from uniqueness check
    const isEditingExisting = mcpServerSelected.value !== -1;
    const otherServers = isEditingExisting
      ? mcpServers().filter(s => s.id !== mcpServerSelected.value)
      : mcpServers();
    if (otherServers.some(s => s.name === newMcpServerForm.value.name)) nameValidated.push('Server name must be unique');
    if (newMcpServerForm.value.name.includes(' ')) nameValidated.push('Server name must not contain spaces');
    if (!/^[a-zA-Z0-9-]+$/.test(newMcpServerForm.value.name)) nameValidated.push('Server name can only contain alphanumeric characters and hyphens');
    if (!newMcpServerForm.value.transport) transportValidated.push('Transport cannot be empty')

    return {
      isValid: nameValidated.length === 0 && transportValidated.length === 0,
      validators: {
        name: nameValidated,
        transport: transportValidated
      }
    };
  });

  const testConnection = async (serverId: number) => {
    void serverId;
    // This is a placeholder - actual connection testing would require backend support
    // For now, we just show a success toast
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  };

  const toggleEnabled = (serverId: number) => {
    const server = mcpServers().find((s) => s.id === serverId);
    if (server) {
      toggleMCPServer(serverId);
    }
  };

  const toggleToolPreview = (serverId: number) => {
    if (toolPreviewActive.value.includes(serverId)) {
      toolPreviewActive.value = toolPreviewActive.value.filter(id => id !== serverId);
    } else {
      toolPreviewActive.value.push(serverId)
    }
  }

  const canModify = (serverName: string) => {
    return !defaultTools.includes(serverName);
  };

  const canToggleServer = (serverName: string) => {
    if (!defaultTools.includes(serverName)) {
      return true;
    }
    return isPlatformAdmin();
  };

  return {
    openEditForm,
    isEditing,
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
    renameMcpServer,
    showRenameOption,
    testConnection,
    toggleEnabled,
    toolPreviewActive,
    toggleToolPreview,
    commandOptions,
    canModify,
    canToggleServer,
  };
};
