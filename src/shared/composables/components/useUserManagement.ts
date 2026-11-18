import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { AppPermission, GlobalPermissions, RuntimeApp, User, UserPermissions, UserRole } from '../../../shared/types';
import { useToast } from 'primevue/usetoast';

export const useUserManagement = (user: () => User | null,
  userList: () => User[],
  handleUserLogin: (username: string, password: string) => void,
  handleUserRegister: (username: string, password: string, role: string, email?: string) => void,
  handleUserLogout: () => void,
  updateUserProfile: (updatedUser: User) => void,
  handleDeleteUser: (targetUserId: number) => void,
  updateUserRole: (targetUserId: number, newRole: UserRole) => void,
  logoutHandler: () => void,
  fetchingUserList: () => boolean,
  isAuthenticated: () => boolean,
  fetchUserList: () => void,
  apps: () => RuntimeApp[]
) => {

  const toast = useToast();

  const showAddUserDialog = ref<boolean>(false);
  const showEditDialog = ref<boolean>(false);
  const showDeleteDialog = ref<boolean>(false);
  const showLoginDialog = ref<boolean>(false);
  const showRegisterDialog = ref<boolean>(false);

  interface FormUser extends User {
    permissions: FormPermissions
  }

  interface FormPermissions extends UserPermissions {
    global?: FormGlobalPermissions;
    app?: AppPermission[];
  }

  interface FormGlobalPermissions extends GlobalPermissions {
    canLaunchApps: boolean;
    canTeardownApps: boolean;
    canUpdateApps: boolean;
    canViewLogs: boolean;
    canManageUsers: boolean;
    canDeleteApps: boolean;
    canManageApps: boolean;
    canCreateApps: boolean;
    canModifyTags: boolean;
  }

  const removeUser = ref<User | null>(null);
  const editUserForm = ref<FormUser | null>();
  const addUserForm = ref({ name: '', email: '', role: 'member' as UserRole, password: '' });
  const currentUserSearchQuery = ref('');
  const currentUserRoleFilterQuery = ref<UserRole | 'all'>('all');
  const roleOptions = [
    { label: 'Owner', value: 'owner' },
    { label: 'Admin', value: 'admin' },
    { label: 'Member', value: 'member' },
    { label: 'Viewer', value: 'viewer' }
  ];
  const selectedAppToAdd = ref<RuntimeApp>()

  watch(
    () => isAuthenticated(),
    (newAuth) => {
      if (newAuth) {
        showLoginDialog.value = false
        const _user = user()
        if (_user && _user.permissions?.global?.canManageUsers) {
          fetchUserList()
        }
      }
    },
  )

  onMounted(() => {
    const _user = user()
    if (isAuthenticated() && _user?.permissions?.global?.canManageUsers) {
      fetchUserList()
    }
  })

  const hasRole = (role: UserRole): boolean => {
    return user()?.role === role;
  };

  const userContext = computed(() => {
    const _user = user()
    return _user
  })

  const canManageDeveloperMode = computed(() => {
    const ctx = userContext.value
    return Boolean(
      ctx?.permissions?.global?.canManageUsers
        && (ctx.role === 'owner' || ctx.role === 'admin'),
    )
  })


  const canEditUser = (user: User): boolean => {
    void user;
    if (userContext.value) {
      if (!userContext.value.permissions?.global?.canManageUsers) return false
      //if (!user || userContext.value.userId === user.userId) return false;
      if (userContext.value?.role === 'owner' || userContext.value?.role === 'admin') return true;
    }
    return false;
  };

  const canDeleteUser = (user: User): boolean => {
    if (userContext.value) {
      if (!user) return false;
      if (userContext.value.userId === user.userId) return false;
      if (userContext.value.role === 'owner' || userContext.value.role === 'admin') return true;
    }
    return false;
  };

  const filteredUsers = computed(() => {
    return userList().filter((user: User) => {
      const matchesSearch = !currentUserSearchQuery.value ||
        (user?.name && user.name.toLowerCase().includes(currentUserSearchQuery.value.toLowerCase()));
      const matchesRole = currentUserRoleFilterQuery.value === 'all' ||
        user.role === currentUserRoleFilterQuery.value;
      return matchesSearch && matchesRole;
    });
  });

  const formatLastSeen = (timestamp: string): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const showToast = (severity: string, summary: string, detail: string) => {
    toast.add({ severity, summary, detail, life: 3000 });
  };

  async function handleAddUserSubmit() {
    if (!addUserForm.value.name || !addUserForm.value.email) {
      showToast('error', 'Add User', 'Please fill in all required fields');
      return;
    }
    handleUserRegister(addUserForm.value.name, addUserForm.value.password, addUserForm.value.role, addUserForm.value.email)
    showAddUserDialog.value = false;
    nextTick(() => {
      addUserForm.value.name = ''
      addUserForm.value.password = ''
      addUserForm.value.email = ''
      addUserForm.value.role = 'viewer'
    })
  }

  function handleEditUserSubmit() {
    if (editUserForm.value) {
      updateUserProfile(resolveUser(editUserForm.value))
      showEditDialog.value = false;
      editUserForm.value = null;
    }
  }
  function handleDeleteUserSubmit() {
    const editUserValue = removeUser.value;
    if (!editUserValue) return;
    handleDeleteUser(editUserValue.userId)
    showDeleteDialog.value = false;
    removeUser.value = null;
  }

  function openEditDialog(user: User) {
    if (!canEditUser(user)) {
      showToast('error', 'Edit', 'You do not have permission to edit this user');
      return;
    }
    editUserForm.value = resolveFormUser(user);
    showEditDialog.value = true;
  }

  function openDeleteDialog(user: User) {
    if (!canDeleteUser(user)) {
      showToast('error', 'Delete', 'You do not have permission to delete this user');
      return;
    }
    removeUser.value = user;
    showDeleteDialog.value = true;
  }

  function handleLogin() {
    handleUserLogin(addUserForm.value.name, addUserForm.value.password)
    nextTick(() => {
      addUserForm.value.name = ''
      addUserForm.value.password = ''
    })
  }

  function handleLogout() {
    logoutHandler()
    nextTick(() => {
      addUserForm.value.name = ''
      addUserForm.value.password = ''
    })
  }

  const isFetchingUserList = computed(() => {
    return fetchingUserList()
  })

  const resolveFormUser = (user: User): FormUser => {
    return {
      ...user,
      isDeveloperMode: Boolean(user.isDeveloperMode),
      permissions: {
        app: user.permissions?.app,
        global: {
          canLaunchApps: user.permissions?.global?.canLaunchApps ? true : false,
          canTeardownApps: user.permissions?.global?.canTeardownApps ? true : false,
          canUpdateApps: user.permissions?.global?.canUpdateApps ? true : false,
          canViewLogs: user.permissions?.global?.canViewLogs ? true : false,
          canManageUsers: user.permissions?.global?.canManageUsers ? true : false,
          canDeleteApps: user.permissions?.global?.canDeleteApps ? true : false,
          canManageApps: user.permissions?.global?.canManageApps ? true : false,
          canCreateApps: user.permissions?.global?.canCreateApps ? true : false,
          canModifyTags: user.permissions?.global?.canModifyTags ? true : false,
        }
      }
    } as FormUser
  }

  const resolveUser = (user: FormUser): User => {
    return {
      ...user,
      permissions: {
        app: user.permissions?.app,
        global: {
          canLaunchApps: user.permissions?.global?.canLaunchApps ? true : false,
          canTeardownApps: user.permissions?.global?.canTeardownApps ? true : false,
          canUpdateApps: user.permissions?.global?.canUpdateApps ? true : false,
          canViewLogs: user.permissions?.global?.canViewLogs ? true : false,
          canManageUsers: user.permissions?.global?.canManageUsers ? true : false,
          canDeleteApps: user.permissions?.global?.canDeleteApps ? true : false,
          canManageApps: user.permissions?.global?.canManageApps ? true : false,
          canCreateApps: user.permissions?.global?.canCreateApps ? true : false,
          canModifyTags: user.permissions?.global?.canModifyTags ? true : false,
        }
      }
    } as User
  }

  const getAppInfo = (appId: string): RuntimeApp => {
    try {
      const _apps = apps()
      if (_apps.length > 0) {
        const app = _apps.filter(_ => _.id == appId)[0]
        console.log(app)
        return app
      } else {
        return {
          name: '',
          faIcon: ''
        } as RuntimeApp
      }
    } catch {
      return {
        name: '',
        faIcon: ''
      } as RuntimeApp
    }
  }

  const removeAppPermission = (appId: string): void => {
    if (editUserForm.value?.permissions.app?.filter(_ => _.appId == appId).length == 1) {
      editUserForm.value.permissions.app = editUserForm.value.permissions.app.filter(item => item.appId !== appId)
    }
  }

  const appsToAdd = computed(() => {
    if (editUserForm.value?.permissions.app) {
      const editFormAppIds = editUserForm.value?.permissions.app.map(_ => _.appId)
      return apps().filter(_ => !editFormAppIds.includes(_.id))
    } else {
      return [] as RuntimeApp[]
    }
  })

  const addApp = (): void => {
    if (editUserForm.value?.permissions.app && selectedAppToAdd.value) {
      editUserForm.value?.permissions.app.push({
        appId: selectedAppToAdd.value.id,
        canLaunch: false,
        canTeardown: false,
        canUpdate: false,
        canViewLogs: false,
        canModifyTags: false,
      } as AppPermission)
      selectedAppToAdd.value = undefined
    }
  }

  return {
    hasRole,
    canEditUser,
    canDeleteUser,
    filteredUsers,
    formatLastSeen,
    handleAddUserSubmit,
    handleEditUserSubmit,
    handleDeleteUserSubmit,
    openEditDialog,
    openDeleteDialog,
    handleLogin,
    handleLogout,
    showAddUserDialog,
    showEditDialog,
    showDeleteDialog,
    showLoginDialog,
    showRegisterDialog,
    editUserForm,
    addUserForm,
    currentUserSearchQuery,
    currentUserRoleFilterQuery,
    roleOptions,
    isFetchingUserList,
    removeUser,
    getAppInfo,
    removeAppPermission,
    selectedAppToAdd,
    appsToAdd,
    addApp,
    userContext,
    canManageDeveloperMode,
  }
}
