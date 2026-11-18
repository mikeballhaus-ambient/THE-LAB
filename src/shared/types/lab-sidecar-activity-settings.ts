import { z } from 'zod';

export const LabSidecarActivitySettingsSchema = z.object({
  thinkingLabel: z.string().min(1).max(80),
  workingLabels: z
    .array(z.string().min(1).max(120))
    .min(1, 'At least one working label is required')
    .max(30),
  rotateIntervalMs: z.number().int().min(1500).max(15000),
});

export type LabSidecarActivitySettings = z.infer<typeof LabSidecarActivitySettingsSchema>;

export const DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS: LabSidecarActivitySettings = {
  thinkingLabel: 'Thinking…',
  workingLabels: [
    'Filling flasks…',
    'Calibrating beakers…',
    'Adjusting the centrifuge…',
    'Warming the Bunsen burner…',
    'Labeling samples…',
    'Consulting the lab notebook…',
    'Running it through the spectrometer…',
    'Measuring twice, pipetting once…',
    'Spinning up the experiment…',
    'Checking the periodic table twice…',
    'Donning safety goggles…',
    'Stirring the solution…',
  ],
  rotateIntervalMs: 2800,
};

export function parseLabSidecarActivitySettings(input: unknown): LabSidecarActivitySettings {
  return LabSidecarActivitySettingsSchema.parse(input);
}
