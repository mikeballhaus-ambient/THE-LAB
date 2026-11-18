import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const DOMAIN_EVENT_MANIFEST_FILE = 'lab-domain-events.manifest.ts';
const PLATFORM_MANIFEST = 'src/shared/lab-domain-events/platform-lab-domain-events.manifest.ts';

export interface DiscoveredDomainEventManifest {
  /** Absolute path to the manifest module. */
  absolutePath: string;
  /** Repo-relative path with forward slashes. */
  repoPath: string;
  /** `platform` or registry app id (e.g. app-lab-tasklist). */
  ownerId: string;
}

function fileHelpersStyleForward(p: string): string {
  return p.replace(/\\/g, '/');
}

export function discoverDomainEventManifests(repoRoot: string = process.cwd()): DiscoveredDomainEventManifest[] {
  const appsRoot = join(repoRoot, 'src', 'apps');
  const appManifests: DiscoveredDomainEventManifest[] = [];
  let topEntries: string[];
  try {
    topEntries = readdirSync(appsRoot);
  } catch {
    topEntries = [];
  }
  for (const folder of topEntries) {
    const appDir = join(appsRoot, folder);
    try {
      if (!statSync(appDir).isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }
    const sharedManifest = join(appDir, 'shared', DOMAIN_EVENT_MANIFEST_FILE);
    if (!existsSync(sharedManifest)) {
      continue;
    }
    const ownerId = `app-${folder}`;
    appManifests.push({
      absolutePath: sharedManifest,
      repoPath: fileHelpersStyleForward(relative(repoRoot, sharedManifest)),
      ownerId,
    });
  }
  appManifests.sort((a, b) => a.repoPath.localeCompare(b.repoPath));

  const platformPath = join(repoRoot, PLATFORM_MANIFEST);
  const platform: DiscoveredDomainEventManifest[] = existsSync(platformPath)
    ? [
        {
          absolutePath: platformPath,
          repoPath: PLATFORM_MANIFEST,
          ownerId: 'platform',
        },
      ]
    : [];

  return [...platform, ...appManifests];
}

/** Paths listed in domain-event-manifest-index.ts import lines. */
export function parseManifestIndexImportPaths(indexSource: string): string[] {
  const paths: string[] = [];
  const importRe = /from\s+['"](@\/[^'"]+lab-domain-events\.manifest(?:\.ts)?)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(indexSource)) !== null) {
    let repoPath = match[1].replace(/^@\//, 'src/');
    if (!repoPath.endsWith('.ts')) {
      repoPath += '.ts';
    }
    paths.push(repoPath.replace(/\\/g, '/'));
  }
  const platformRe = /from\s+['"](\.\/platform-lab-domain-events\.manifest(?:\.ts)?)['"]/;
  const platformMatch = platformRe.exec(indexSource);
  if (platformMatch) {
    paths.push('src/shared/lab-domain-events/platform-lab-domain-events.manifest.ts');
  }
  return [...new Set(paths)].sort();
}