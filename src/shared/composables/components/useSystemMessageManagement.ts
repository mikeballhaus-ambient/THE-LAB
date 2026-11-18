import { User } from '@/shared/types';
import { ref, computed, watchEffect } from 'vue';

export const useSystemMessageManagement = (
  globalSysMsg: () => string,
  previewSystemInstructionRequest: () => void,
  handleGlobalSysMsgChange: (data: string) => void,
  user: () => User | null,
  currentUserInstructions: () => string,
  handleUpdateGlobalUserMsg: (data: string) => void
) => {
  const showSysInstructionsPreview = ref<boolean>(false);
  const localSysMsgValue = ref<string>(globalSysMsg());
  const localUserMsgValue = ref<string>(currentUserInstructions())
  const localUserMsgValueInitialized = ref<boolean>(false)

  const handleSaveGlobalSysMsg = () => {
    handleGlobalSysMsgChange(localSysMsgValue.value);
  };

  const handleSaveGlobalUserMsg = () => {
    handleUpdateGlobalUserMsg(localUserMsgValue.value)
  }

  const previewSystemInstructionRequestHandler = () => {
    showSysInstructionsPreview.value = true;
    previewSystemInstructionRequest();
  };

  const globalSysMsgValue = computed({
    get: () => localSysMsgValue.value,
    set: (newVal: string) => {
      localSysMsgValue.value = newVal;
    }
  });

  const globalUserMsgValue = computed({
    get: () => localUserMsgValue.value,
    set: (newVal: string) => {
      localUserMsgValue.value = newVal;
    }
  });

  const canUpdateGlobalSysMsg = computed(() => {
    const _user = user()
    return _user ? _user.role == 'admin' || _user.role == 'owner' : false
  })

 watchEffect(() => {
  const _curUserInstructions = currentUserInstructions()
  if (!localUserMsgValueInitialized.value && _curUserInstructions)  {
    localUserMsgValue.value = _curUserInstructions
    localUserMsgValueInitialized.value = true
  }
 })

  return {
    showSysInstructionsPreview,
    handleSaveGlobalSysMsg,
    previewSystemInstructionRequestHandler,
    globalSysMsgValue,
    canUpdateGlobalSysMsg,
    globalUserMsgValue,
    handleSaveGlobalUserMsg
  };
};
