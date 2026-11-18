import { User } from "../../shared/types";
import { UserService } from "../db/Auth/auth-service";

export type PermissionType = 'global' | 'app' | 'all';

export type GlobalAction = 'launch-apps' | 'teardown-apps' | 'update-apps' | 'view-logs' | 'manage-users' | 'delete-apps' | 'manage-apps' | 'create-apps'
export type AppAction = 'launch-app' | 'teardown-app' | 'update-app' | 'view-logs'

export interface AuthorizationRequest {
  userId: number,
  permissionType: PermissionType,
  globalAction?: GlobalAction,
  appAction?: AppAction,
  appId?: string
}

export class userPermission {
  static isAuthorized(request: AuthorizationRequest): boolean {
    if (this.validateRequest(request)) {
      const _user = UserService.getInstance().getUserById(request.userId)
      if (_user) {
        switch (request.permissionType) {
          case 'global': return this.validateGlobalPermissionRequest(_user, request.globalAction)
          case 'app': return this.validateAppPermissionRequest(_user, request.appAction, request.appId)
          case 'all': return this.validateGlobalPermissionRequest(_user, request.globalAction) || this.validateAppPermissionRequest(_user, request.appAction, request.appId)
        }
      }
    }

    return false
  }

  static validateAppPermissionRequest(user: User, appAction: AppAction | undefined, appId: string | undefined): boolean {
    if (!appAction || !appId) return false
    if (user.permissions?.app && user.permissions?.app?.length > 0) {
      const userAppPermission = user.permissions?.app.filter(_ => _.appId == appId)[0]
      if (userAppPermission) {
        switch (appAction) {
          case 'launch-app': return userAppPermission.canLaunch ?? false
          case 'teardown-app': return userAppPermission.canTeardown ?? false
          case 'update-app': return userAppPermission.canUpdate ?? false
          case 'view-logs': return userAppPermission.canViewLogs ?? false
        }
      }
    }
    return false
  }

  static validateGlobalPermissionRequest(user: User, globalAction: GlobalAction | undefined): boolean {
    if (!globalAction) return false
    switch (globalAction) {
      case 'launch-apps': return user.permissions?.global?.canLaunchApps ?? false
      case 'teardown-apps': return user.permissions?.global?.canTeardownApps ?? false
      case 'update-apps': return user.permissions?.global?.canUpdateApps ?? false
      case 'view-logs': return user.permissions?.global?.canViewLogs ?? false
      case 'manage-users': return user.permissions?.global?.canManageUsers ?? false
      case 'delete-apps': return user.permissions?.global?.canDeleteApps ?? false
      case 'manage-apps': return user.permissions?.global?.canManageApps ?? false
      case 'create-apps': return user.permissions?.global?.canCreateApps ?? false
      default: return false
    }
  }

  static validateRequest(request: AuthorizationRequest): boolean {
    if (!request.userId) return false
    if ((request.globalAction == undefined || request.globalAction == null) && (request.appAction == undefined || request.appAction == null)) return false
    if (request.appAction && !request.appId) return false
    if (request.permissionType == 'all' &&
      (
        ((request.globalAction == undefined || request.globalAction == null)) ||
        ((request.appAction == undefined || request.appAction == null) && !request.appId)
      )
    ) return false
    return true
  }
}
