<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';
import ToggleSwitch from 'primevue/toggleswitch';
import Select from 'primevue/select';
import Badge from 'primevue/badge';
import ProgressSpinner from 'primevue/progressspinner';
import { getCurrentUserName, RuntimeApp, User, UserRole } from '../../../shared/types';
import { useUserManagement } from '../../../shared/composables/components/useUserManagement';
import { displayLabUserName } from '@/shared/utils/lab-comms-ui';

const props = defineProps<{
  user: User | null,
  userList: User[],
  isAuthenticated: boolean,
  fetchUserList: () => void,
  handleUserLogin: (username: string, password: string) => void,
  handleUserRegister: (username: string, password: string, role: string, email?: string) => void,
  handleUserLogout: () => void,
  updateUserProfile: (updatedUser: User) => void,
  handleDeleteUser: (targetUserId: number) => void,
  updateUserRole: (targetUserId: number, newRole: UserRole) => void,
  logoutHandler: () => void,
  loadingUserList: boolean,
  apps: RuntimeApp[]
}>()

defineEmits<{
  (e: 'visible-change', visible: boolean): void;
  (e: 'user-filter-change', data: { search: string; role: string }): void;
}>();

const {
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
  showAddUserDialog,
  showEditDialog,
  showDeleteDialog,
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
} = useUserManagement(() => props.user,
  () => props.userList,
  props.handleUserLogin,
  props.handleUserRegister,
  props.handleUserLogout,
  props.updateUserProfile,
  props.handleDeleteUser,
  props.updateUserRole,
  props.logoutHandler,
  () => props.loadingUserList,
  () => props.isAuthenticated,
  props.fetchUserList,
  () => props.apps)

</script>

<template>

  <!-- User List Section -->
  <div class="user-management flex flex-col h-full w-full gap-4 p-2 text-lab-general-text">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-3 min-w-0">
        <Badge severity="secondary" size="large" class="bg-lab-general-bg-muted/80! text-lab-general-text! flex items-center gap-2">
          <i class="fa fa-users"></i>
          <span>{{ userList.length }} Users</span>
        </Badge>
        <span class="text-lab-general-text truncate">{{ getCurrentUserName() }}</span>
      </div>
      <div class="flex gap-2 shrink-0 justify-end">
        <Button
          v-if="hasRole('admin') || hasRole('owner')"
          type="button"
          label="Refresh"
          icon="fa fa-sync-alt"
          severity="secondary"
          @click="props.fetchUserList"
        />
        <Button
          v-if="hasRole('admin') || hasRole('owner')"
          type="button"
          label="Add User"
          icon="fa fa-plus"
          severity="secondary"
          @click="showAddUserDialog = true"
        />
      </div>
    </div>

    <!-- Search and filter -->
    <div class="flex gap-2 mb-4">
      <InputText v-model="currentUserSearchQuery" placeholder="Search users..." class="min-w-[250px] lab-settings-input" />
      <Select v-model="currentUserRoleFilterQuery" :options="roleOptions" option-label="label" option-value="value"
        placeholder="Filter by role" class="min-w-[250px] lab-settings-input" />
    </div>

    <!-- User list table -->
    <div class="flex-1 overflow-auto">
      <div class="overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full border border-lab-general-border">
            <thead class="bg-lab-general-bg-muted!">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-lab-general-text-muted uppercase">User</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-lab-general-text-muted uppercase">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-lab-general-text-muted uppercase">Role</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-lab-general-text-muted uppercase">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-lab-general-text-muted uppercase">Last Seen</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-lab-general-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-lab-general-bg-muted/50">
              <tr v-for="user in filteredUsers" :key="user.userId">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div v-if="user.userId === userContext?.userId" class="mr-2">
                      <i class="fa fa-star text-lab-chat-followup-text" aria-hidden="true" />
                    </div>
                    <div>
                      <div class="text-sm font-medium text-lab-general-text">{{ displayLabUserName(user) }}</div>
                      <div class="text-xs text-lab-general-text-muted">ID: {{ user.userId }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span>{{ user.email }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge
                    :severity="user.role === 'owner' ? 'info' : user.role === 'admin' ? 'warn' : user.role === 'viewer' ? 'help' : 'secondary'"
                    size="small"
                  >{{ user.role }}</Badge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :severity="user.status === 'active' ? 'success' : 'danger'" size="small">{{ user.status }}
                  </Badge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-lab-general-text-muted">{{ formatLastSeen(user.lastSeen) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end gap-2">
                    <Button v-if="canEditUser(user)" :icon="'fa fa-cog'" severity="secondary" class="p-1"
                      @click="openEditDialog(user)" @keyup.enter="openEditDialog(user)" />
                    <Button v-if="canDeleteUser(user)" severity="danger" :icon="'fa fa-trash'" class="p-1"
                      @click="openDeleteDialog(user)" />
                  </div>
                </td>
              </tr>
              <tr v-if="filteredUsers.length === 0">
                <td :colspan="5" class="px-6 py-8 text-center text-lab-general-text-muted">No users found</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Register Dialog -->
  <Dialog v-model:visible="showRegisterDialog" modal :style="{ width: '300px' }"
    :pt="{ mask: { class: 'settings-modal-child' } }">
    <template #header>
      <h3 class="text-xl font-semibold">Register</h3>
    </template>
    <div class="flex flex-col gap-2">
      <InputText v-model="addUserForm.name" placeholder="Username" />
      <InputText type="email" placeholder="Email" v-model="addUserForm.email" />
      <InputText type="password" placeholder="Password" v-model="addUserForm.password" />
    </div>
    <div class="flex justify-end gap-2 mt-4">
      <Button label="Cancel" icon="fa fa-times-circle" @click="showRegisterDialog = false" />
      <Button label="Register" icon="fa fa-user-plus" @click="showRegisterDialog = false" />
    </div>
  </Dialog>

  <!-- Delete User Dialog -->
  <Dialog v-model:visible="showDeleteDialog" modal :style="{ width: '300px' }"
    :pt="{ mask: { class: 'settings-modal-child' } }">
    <template #header>
      <h3 class="text-xl font-semibold">Delete User</h3>
    </template>
    <p class="mb-4">Are you sure you want to delete {{ removeUser?.name }}?</p>
    <div class="flex justify-end gap-2">
      <Button label="Cancel" icon="fa fa-times-circle" @click="showDeleteDialog = false" />
      <Button label="Delete" severity="danger" icon="fa fa-trash" @click="handleDeleteUserSubmit" />
    </div>
  </Dialog>

  <!-- Add User Dialog -->
  <Dialog v-model:visible="showAddUserDialog" modal :style="{ width: '400px' }"
    :pt="{ mask: { class: 'settings-modal-child' } }">
    <template #header>
      <h3 class="text-xl font-semibold">Add User</h3>
    </template>
    <div class="flex flex-col gap-2">
      <InputText v-model="addUserForm.name" placeholder="Username" />
      <InputText type="email" v-model="addUserForm.email" placeholder="Email" />
      <InputText type="password" v-model="addUserForm.password" placeholder="Password" />
      <Select v-model="addUserForm.role" :options="roleOptions" option-label="label" option-value="value"
        placeholder="Select role" />
    </div>
    <div class="flex justify-end gap-2 mt-4">
      <Button label="Cancel" icon="fa fa-times-circle" @click="showAddUserDialog = false" />
      <Button label="Add" icon="fa fa-user-plus" @click="handleAddUserSubmit" />
    </div>
  </Dialog>

  <!-- Edit User Dialog -->
  <Dialog v-model:visible="showEditDialog" modal :style="{ width: 'auto !important' }"
    :pt="{ mask: { class: 'settings-modal-child' } }">
    <template #header>
      <h3 class="text-xl! font-semibold!">Edit User: {{ editUserForm?.name }}</h3>
    </template>
    <div v-if="editUserForm" class="flex! justify-center! flex-col! gap-2!">
      <div class="flex! gap-2!">
        <div class="min-w-[75px]! text-sm!">Username:</div>
        <InputText class="w-full!" v-model="editUserForm.name" placeholder="Username" />
      </div>
      <div class="flex! gap-2!">
        <div class="min-w-[75px]! text-sm!">Email:</div>
        <InputText class="w-full!" type="email" v-model="editUserForm.email" placeholder="Email" />
      </div>
      <div class="flex! gap-2!">
        <div class="min-w-[75px]! text-sm!">Role:</div>
        <Select v-model="editUserForm.role" :options="roleOptions" option-label="label" option-value="value"
          placeholder="Select role" />
      </div>
      <div v-if="canManageDeveloperMode" class="flex! items-center! gap-2!">
        <ToggleSwitch v-model="editUserForm.isDeveloperMode" inputId="edit-user-developer-mode" />
        <label for="edit-user-developer-mode" class="text-sm!">Developer mode</label>
      </div>
      <!-- permissions -->
      <div class="flex gap-5 w-full justify-between">

        <!-- global permissions -->
        <div v-if="editUserForm?.permissions && editUserForm.permissions?.global">
          <div
            class="bg-lab-general-bg-muted rounded-lg border border-lab-general-border p-4 flex! flex-col gap-2! text-sm text-lab-general-text-muted!">
            <div class="mb-2 text-base! text-cyan-200">Global Permissions:</div>
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <Checkbox v-model="editUserForm.permissions.global.canLaunchApps" binary inputId="canLaunchApps" />
                <label for="canLaunchApps">Launch Apps</label>
              </div>
              <div class="flex items-center gap-2">
                <Checkbox v-model="editUserForm.permissions.global.canTeardownApps" binary inputId="canTeardownApps" />
                <label for="canTeardownApps">Teardown Apps</label>
              </div>
              <div class="flex items-center gap-2">
                <Checkbox v-model="editUserForm.permissions.global.canUpdateApps" binary inputId="canUpdateApps" />
                <label for="canUpdateApps">Update Apps</label>
              </div>
              <div class="flex items-center gap-2">
                <Checkbox v-model="editUserForm.permissions.global.canViewLogs" binary inputId="canViewLogs" />
                <label for="canViewLogs">View Logs</label>
              </div>
              <div class="flex items-center gap-2">
                <Checkbox v-model="editUserForm.permissions.global.canManageUsers" binary inputId="canManageUsers" />
                <label for="canManageUsers">Manage Users</label>
              </div>
              <div class="flex items-center gap-2">
                <Checkbox v-model="editUserForm.permissions.global.canDeleteApps" binary inputId="canDeleteApps" />
                <label for="canDeleteApps">Delete Apps</label>
              </div>
              <div class="flex items-center gap-2">
                <Checkbox v-model="editUserForm.permissions.global.canManageApps" binary inputId="canManageApps" />
                <label for="canManageApps">Manage Apps</label>
              </div>
              <div class="flex items-center gap-2">
                <Checkbox v-model="editUserForm.permissions.global.canCreateApps" binary inputId="canCreateApps" />
                <label for="canCreateApps">Create Apps</label>
              </div>
              <div class="flex items-center gap-2">
                <Checkbox v-model="editUserForm.permissions.global.canModifyTags" binary inputId="canModifyTags" />
                <label for="canModifyTags">Modify catalog tags (all apps)</label>
              </div>
            </div>
          </div>
        </div>


        <!-- app permissions -->
        <div v-if="editUserForm?.permissions && editUserForm.permissions?.app">
          <div
            class="bg-lab-general-bg-muted rounded-lg border border-lab-general-border p-4 flex! flex-col gap-2! text-sm text-lab-general-text-muted!">
            <div class="text-base font-medium text-lab-general-text">App Permissions:</div>
            <div v-if="appsToAdd.length > 0">
              <div class="flex items-center gap-2">
                <div>
                  <Button @click="addApp" label="Add App" icon="fa fa-plus" />
                </div>
                <Select v-model="selectedAppToAdd" :options="appsToAdd" option-label="name"
                  placeholder="Select App" />
              </div>
            </div>
            <div v-if="editUserForm.permissions?.app.length == 0"
              class="flex flex-col gap-2 items-center justify-center m-2">
              <div>No App permissions have been set</div>
            </div>
            <div v-if="editUserForm.permissions?.app.length > 0"
              class="flex flex-col gap-2 m-2 max-h-[250px]! overflow-auto">
              <div v-for="app in editUserForm.permissions.app" :key="app.appId"
                class="flex flex-col gap-2 bg-lab-general-bg-muted rounded p-2">
                <div class="flex items-center justify-between">
                  <Badge size="medium" class="bg-lab-general-bg-muted! text-lab-general-text-muted!">
                    <div class="flex gap-2 items-center">
                      <i class="fa" :class="getAppInfo(app.appId).faIcon"></i>
                      <span>{{ getAppInfo(app.appId).name }}</span>
                    </div>
                  </Badge>
                  <div @click="() => removeAppPermission(app.appId)" class="text-red-400 cursor-pointer">
                    <i class="fa fa-close shadow"></i>
                  </div>
                </div>
                <div class="flex gap-2 text-xs">
                  <div class="flex items-center gap-2">
                    <Checkbox v-model="app.canLaunch" binary :inputId="`app_${app.appId}_canLaunch`" />
                    <label :for="`app_${app.appId}_canLaunch`">Launch App</label>
                  </div>
                  <div class="flex items-center gap-2">
                    <Checkbox v-model="app.canTeardown" binary :inputId="`app_${app.appId}_canTeardown`" />
                    <label :for="`app_${app.appId}_canTeardown`">Teardown App</label>
                  </div>
                  <div class="flex items-center gap-2">
                    <Checkbox v-model="app.canUpdate" binary :inputId="`app_${app.appId}_canUpdate`" />
                    <label :for="`app_${app.appId}_canUpdate`">Update App</label>
                  </div>
                  <div class="flex items-center gap-2">
                    <Checkbox v-model="app.canViewLogs" binary :inputId="`app_${app.appId}_canViewLogs`" />
                    <label :for="`app_${app.appId}_canViewLogs`">View App Logs</label>
                  </div>
                  <div class="flex items-center gap-2">
                    <Checkbox v-model="app.canModifyTags" binary :inputId="`app_${app.appId}_canModifyTags`" />
                    <label :for="`app_${app.appId}_canModifyTags`">Modify catalog tags</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
    <div class="flex justify-end gap-2 mt-4">
      <Button label="Cancel" icon="fa fa-times-circle" @click="showEditDialog = false" />
      <Button label="Save" icon="fa fa-save" @click="handleEditUserSubmit" />
    </div>
  </Dialog>

  <Dialog v-model:visible="isFetchingUserList" :closable="false" header="Updating user list" :modal="true"
    :pt="{ mask: { class: 'settings-modal-child' } }">
    <div class="flex-1 flex justify-center">
      <ProgressSpinner />
    </div>
  </Dialog>

</template>
