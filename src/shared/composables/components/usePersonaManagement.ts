import { computed, ref, watch } from 'vue';
import { Persona, PersonaEventType, UpdatePersonaConfigEventData } from '../../../shared/types';

export const usePersonaManagement = (
  personaConfigs: () => Record<string, Persona>,
  currentPersonaName: () => string,
  currentPersonaProperty: () => string,
  handlePersonaSave: (data: UpdatePersonaConfigEventData) => void
) => {

  const personaSelected = ref<string>(currentPersonaName())
  const personaPropertySelected = ref<string>(currentPersonaProperty())
  const newPersonaFormVisible = ref<boolean>(false)
  const systemPersonas = ref<string[]>([
    'Chat', 'Orchestrator', 'Architect', 'Code', 'Debug', 'QA'
  ])
  const emptyPersonaModel: Persona = {
    id: -1,
    name: '',
    sysMsg: {
      role: '',
      capabilities: '',
      output: '',
      rules: ''
    },
    tools: [],
    reasoning: { none: 0 },
    slashCommands: []
  } as Persona

  const newPersonaForm = ref<Persona>(emptyPersonaModel)
  const newPersonaFormValidated = ref<boolean>(false)
  const showRenameOption = ref<boolean>(false)
  const renamePersona = ref<string>('')

  const handleSave = (eventType: PersonaEventType) => {
    if (personaSelected.value) {
      const persona = personaConfigs()[personaSelected.value]
      if (persona) {
        handlePersonaSave({
          personaName: personaSelected.value,
          persona,
          action: eventType
        } as UpdatePersonaConfigEventData)
      }
    }
  };

  const handleRename = () => {
    if (renamePersonaValidator.value.isValid) {
      const persona = personaConfigs()[personaSelected.value]
      if (persona) {
        persona.name = renamePersona.value
        handlePersonaSave({
          personaName: persona.name,
          persona,
          action: 'update'
        } as UpdatePersonaConfigEventData)
        renamePersona.value = ''
        showRenameOption.value = false
      }
    }
  };

  const saveNewPersona = () => {
    newPersonaFormValidated.value = true
    if (newPersonaValidator.value.isValid) {
      handlePersonaSave({
        personaName: newPersonaForm.value.name,
        persona: newPersonaForm.value,
        action: 'add'
      } as UpdatePersonaConfigEventData)
      newPersonaFormVisible.value = false
    }
  }

  const showNewPersonaForm = () => {
    newPersonaFormValidated.value = false
    newPersonaForm.value = emptyPersonaModel
    newPersonaForm.value.id = systemPersonas.value.length + 1
    newPersonaFormVisible.value = true
  }

  const allPersonaNames = computed(() => {
    return Object.keys(personaConfigs());
  })

  const newPersonaValidator = computed(() => {
    const nameValidated: string[] = []
    if (newPersonaForm.value.name.length < 3) nameValidated.push('Persona name must be at least 3 characters')
    if (allPersonaNames.value.includes(newPersonaForm.value.name)) nameValidated.push('Persona name must be unique')
    if (newPersonaForm.value.name.includes(' ')) nameValidated.push('Persona name must not contain spaces')
    const roleValidated = newPersonaForm.value.sysMsg.role.length == 0 ? ['Role information is required'] : []
    const capabilitiesValidated = newPersonaForm.value.sysMsg.capabilities.length == 0 ? ['Capabilities information is required'] : []
    const outputValidated = newPersonaForm.value.sysMsg.output.length == 0 ? ['Output information is required'] : []
    const rulesValidated = newPersonaForm.value.sysMsg.rules.length == 0 ? ['Rules information is required'] : []

    return {
      isValid: nameValidated.length == 0 &&
        roleValidated.length == 0 &&
        capabilitiesValidated.length == 0 &&
        outputValidated.length == 0 &&
        rulesValidated.length == 0,
      validators: {
        name: nameValidated,
        sysMsg_role: roleValidated,
        sysMsg_capabilities: capabilitiesValidated,
        sysMsg_output: outputValidated,
        sysMsg_rules: rulesValidated,
      }
    }
  })

  watch(
    () => currentPersonaName(),
    (name) => {
      if (name) personaSelected.value = name
    },
  )

  watch(
    () => currentPersonaProperty(),
    (property) => {
      if (property) personaPropertySelected.value = property
    },
  )

  const renamePersonaValidator = computed(() => {
    const nameValidated: string[] = []
    if (renamePersona.value.length < 3) nameValidated.push('Persona name must be at least 3 characters')
    if (allPersonaNames.value.includes(renamePersona.value)) nameValidated.push('Persona name must be unique')
    if (renamePersona.value.includes(' ')) nameValidated.push('Persona name must not contain spaces')

    return {
      isValid: nameValidated.length == 0,
      validators: {
        name: nameValidated
      }
    }
  })

  return {
    personaSelected,
    personaPropertySelected,
    newPersonaFormVisible,
    handleSave,
    showNewPersonaForm,
    saveNewPersona,
    systemPersonas,
    newPersonaForm,
    newPersonaValidator,
    newPersonaFormValidated,
    renamePersonaValidator,
    renamePersona,
    showRenameOption,
    handleRename
  };
};
