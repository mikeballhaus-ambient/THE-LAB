import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { createReadStream } from 'node:fs';
import { parseFile } from 'music-metadata';
import { createAppServer } from '@/shared/services/create-app-server';
import type { MP3Metadata } from '../shared/types/mp3';
import { resolveFormsBuilderUrl } from '@/shared/config/resolveFormsBuilderUrl.node';

/** Forms Builder API base (FORMS_BUILDER_URL / platform default). */
export const formsBuilderUrl = resolveFormsBuilderUrl();

const mp3Directory = path.join(process.cwd(), 'src/apps/ai-tunes/back-end/mp3-files');
const cacheFilePath = path.join(process.cwd(), 'src/apps/ai-tunes/back-end/mp3FilesList.json');
let mp3Files: MP3Metadata[] = [];
let mp3FilesLoaded = false;

const _port = process.env?.PORT ? parseInt(process.env.PORT, 10) : 3002;

function loadCache(): MP3Metadata[] | null {
  try {
    if (!fs.existsSync(cacheFilePath)) {
      return null;
    }

    const data = fs.readFileSync(cacheFilePath, 'utf-8');
    const parsed = JSON.parse(data);

    if (Array.isArray(parsed)) {
      return parsed as MP3Metadata[];
    }

    console.warn('Invalid cache format, regenerating');
    return null;
  } catch (error) {
    console.warn('Failed to load cache:', error);
    return null;
  }
}

function saveCache(data: MP3Metadata[]): void {
  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save cache:', error);
  }
}

function normalizeFilePath(file_path: string): string {
  let normalized = path.normalize(file_path);
  const absMp3Dir = path.resolve(mp3Directory);

  const isWindowsAbs = /^[A-Za-z]:[\\/]/.test(normalized);

  if (isWindowsAbs) {
    const absPath = path.resolve(normalized);
    if (absPath.startsWith(absMp3Dir)) {
      const relative = path.relative(absMp3Dir, absPath);
      normalized = relative;
    }
  }

  normalized = normalized.replace(/\\/g, '/');
  return normalized;
}

async function parseMp3Metadata(file_path: string): Promise<MP3Metadata> {
  try {
    const metadata = await parseFile(file_path);

    return {
      title: metadata.common.title || null,
      artist: metadata.common.artist?.split(',').map((_) => _.trim()) || null,
      album: metadata.common.album || null,
      year: metadata.common.year || null,
      track: metadata.common.track?.no || null,
      genre: Array.isArray(metadata.common.genre)
        ? metadata.common.genre
        : metadata.common.genre
          ? [metadata.common.genre]
          : null,
      duration_seconds: metadata.format.duration || null,
      bitrate: metadata.format.bitrate || null,
      sample_rate: metadata.format.sampleRate || null,
      channels: metadata.format.numberOfChannels || null,
      file_path: normalizeFilePath(file_path),
    } as MP3Metadata;
  } catch (error) {
    console.error(`Failed to parse metadata for ${file_path}:`, error);
    return {
      title: null,
      artist: [],
      album: null,
      year: null,
      track: null,
      genre: null,
      duration_seconds: null,
      bitrate: null,
      sample_rate: null,
      channels: null,
      file_path: normalizeFilePath(file_path),
    } as MP3Metadata;
  }
}

async function getAllMP3Files(): Promise<MP3Metadata[]> {
  try {
    const cachedData = loadCache();
    const currentFiles = fs.readdirSync(mp3Directory);
    const currentMp3Count = currentFiles.filter((f) => f.endsWith('.mp3')).length;

    if (cachedData && cachedData.length === currentMp3Count) {
      console.log(`Using cached MP3 metadata (${cachedData.length} files)`);
      return cachedData;
    }

    const result: MP3Metadata[] = [];

    for (const file of currentFiles) {
      if (file.endsWith('.mp3')) {
        const filePath = path.join(mp3Directory, file);
        const metadata = await parseMp3Metadata(filePath);
        result.push(metadata);
      }
    }

    saveCache(result);
    return result;
  } catch (error) {
    console.error('Error reading MP3 directory:', error);
    throw error;
  }
}

function validateFilePath(requestedPath: string): string | null {
  try {
    const normalized = path.normalize(requestedPath);
    const resolved = path.join(mp3Directory, normalized);
    const absMp3Dir = path.resolve(mp3Directory);
    const absResolved = path.resolve(resolved);

    if (!absResolved.startsWith(absMp3Dir)) {
      return null;
    }

    const stats = fs.statSync(absResolved);
    if (!stats.isFile() || !absResolved.endsWith('.mp3')) {
      return null;
    }

    const mimeType = mime.lookup(absResolved);
    if (mimeType !== 'audio/mpeg') {
      return null;
    }

    return absResolved;
  } catch {
    return null;
  }
}

const start = async () => {
  try {
    mp3Files = await getAllMP3Files();
    mp3FilesLoaded = true;
    console.log(`Loaded ${mp3Files.length} MP3 files`);
  } catch (error) {
    console.error('Failed to load MP3 files:', error);
  }

  const { listen } = await createAppServer({
    attachSocketIO: true,
    additionalPublicPathPrefixes: ['/stream/'],
    healthExtras: () => ({
      mp3FilesLoaded,
      mp3FileCount: mp3Files.length,
    }),
    registerRoutes: async (server) => {
      server.get('/stream/*', async (request, reply) => {
        try {
          const requestedPath = decodeURIComponent((request.params as { '*': string })['*'] || '');
          const validatedPath = validateFilePath(requestedPath);

          if (!validatedPath) {
            console.error('  - VALIDATION FAILED for path:', requestedPath);
            return reply.status(404).send({ error: 'File not found' });
          }

          reply.headers({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="${path.basename(validatedPath)}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });

          const stream = createReadStream(validatedPath);
          return reply.send(stream);
        } catch {
          return reply.status(500).send({ error: 'Failed to stream file' });
        }
      });
    },
    onSocketConnection: (io) => {
      io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('get_mp3_list', async () => {
          try {
            socket.emit('mp3_data', { mp3s: mp3Files });
          } catch {
            socket.emit('error', { message: 'Failed to retrieve MP3 list' });
          }
        });

        socket.on('disconnect', () => {
          console.log(`Client disconnected: ${socket.id}`);
        });
      });
    },
  });

  await listen(_port);
};

export const startServer = start;
