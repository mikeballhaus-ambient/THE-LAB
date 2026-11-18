import { ref, computed } from 'vue';
import { ICommand, Persona, ICommandRequestData } from '../../../shared/types';

export const useCommandManagement = (commands: () => ICommand[],
  personaConfigs: () => Record<string, Persona>,
  manageCommandsRequestHandler: (data: ICommandRequestData) => void) => {
  const currentCommand = ref<ICommand | undefined>();
  const isCommandExisting = ref<boolean>(false);

  const commandsList = computed(() => {
    const _commands = JSON.parse(JSON.stringify(commands()))
    return _commands.sort((a: ICommand, b: ICommand) => a.key > b.key ? 1 : a.key < b.key ? -1 : 0)
  });

  const saveCurrentCommand = (isRemove: boolean) => {
    if (currentCommand.value) manageCommandsRequestHandler({
      command: currentCommand.value,
      isRemove: isRemove
    } as ICommandRequestData)
    if (isRemove) currentCommand.value = undefined
  }

  const duplicateCurrentCommand = () => {
    if (currentCommand.value) {
      currentCommand.value.key = `${currentCommand.value.key}-new`
      isCommandExisting.value = false
    }
  }

  const addArgumentHint = () => {
    if (currentCommand.value) {
      currentCommand.value.argumentHints.push('');
    }
  };

  const removeArgumentHint = (index: number) => {
    if (currentCommand.value) {
      const currentHints = currentCommand.value.argumentHints || [];
      currentCommand.value.argumentHints = currentHints.filter((_: string, i: number) => i !== index);
    }
  };

  const addNewCommand = () => {
    currentCommand.value = {
      key: 'new-slash-command',
      description: 'New Slash Command'
    } as ICommand;
    isCommandExisting.value = false;
  };

  const selectExistingCommand = () => {
    isCommandExisting.value = true;
  };

  const availablePersonas = computed(() => {
    const _personaConfigs = personaConfigs()
    return Object.keys(_personaConfigs);
  })

  return {
    currentCommand,
    saveCurrentCommand,
    duplicateCurrentCommand,
    isCommandExisting,
    commandsList,
    addArgumentHint,
    removeArgumentHint,
    addNewCommand,
    selectExistingCommand,
    availablePersonas
  };
};
