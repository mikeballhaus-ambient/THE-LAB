import type { IApp } from '../../../shared/types';

import appsService from '../../db/Apps/apps-service';

import type { TemplateResolverFn } from './types';

import { buildActiveAppsSection } from '../../../shared/config/lab-system-prompt';



/** Resolves `{{ACTIVE_APPS}}` from the app registry (rm-46 **4.4**). */

export const resolveActiveAppsTemplate: TemplateResolverFn = async (

  _ctx,

  _sessionId,

  _persona,

  _isDeveloperMode,

  _providerData,

  templateData,

) => {

  const apps = appsService.getAllApps() as IApp[];

  return templateData.replace(/{{ACTIVE_APPS}}/, buildActiveAppsSection(apps, _isDeveloperMode));

};

