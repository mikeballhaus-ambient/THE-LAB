import { z } from 'zod';

const HostContextSchema = z.record(z.string(), z.string()).optional();

export const LabNotificationActionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('launch_app'),
    label: z.string().min(1).max(60),
    appId: z.string().min(1).max(120),
    hostContext: HostContextSchema,
  }),
  z.object({
    kind: z.literal('open_settings'),
    label: z.string().min(1).max(60),
    settingsView: z.string().min(1).max(80),
    hostContext: HostContextSchema,
  }),
]);

export const LabNotificationActionsSchema = z.array(LabNotificationActionSchema).max(3);
