import fs from 'fs/promises';
import path from 'path';
import { SearchResult } from '../../../../../shared/types';
import { fileHelpers } from '../../../../../backend/utils/file-helpers';

/**
 * Glob pattern to file extensions mapping
 */
export function globPatternToExtensions(globPattern: string): string[] {
    /**
     * Parse pattern and extract all extension mappings
     * Handles:
     * - "*.ts" -> ['.ts']
     * - "*.ts,*.js" -> ['.ts', '.js']
     * - "*.*.ts" -> ['.ts']
     * - "src/*.js" -> ['.js']
     * - "*" -> [] (wildcard - no filter)
     * - "" -> [] (empty pattern)
     * - "*.{ts,tsx,vue,js,jsx}" -> ['.ts', '.tsx', '.vue', '.js', '.jsx'] (brace expansion)
     */

    if (!globPattern || globPattern.trim() === '') {
        // Empty pattern means no filter - all files
        return [];
    }

    // Check for wildcard only pattern (e.g., "*")
    const wildcardOnlyMatch = globPattern.match(/^\*$/);
    if (wildcardOnlyMatch) {
        return []; // No extension filter - all files
    }

    // Check for brace expansion pattern: *.{ext,ext} or *.ext1,*.ext2
    // This handles patterns like "*.{ts,tsx,vue}"
    const braceExpansionMatch = globPattern.match(/^\*\.\{([^}]+)\}$/);

    if (braceExpansionMatch) {
        // Handle "*.{ts,tsx,vue}" - extract extensions from brace expansion
        const extensionsStr = braceExpansionMatch[1];
        // Split by comma to get individual extensions, then add the dot prefix
        const extensions = extensionsStr.split(',').map(ext => `.${ext.trim()}`.toLowerCase());

        return [...new Set(extensions)]; // Remove duplicates
    }

    // Split on comma to handle multiple patterns
    // e.g., "*.ts,*.js" -> ["*.ts", "*.js"]
    const patterns = globPattern.split(',').map(p => p.trim()).filter(p => p.length > 0);

    const extensions: string[] = [];

    for (const pattern of patterns) {
        // Handle patterns like "*.ts" or "*.tsx,*.jsx"
        const extensionMatch = pattern.match(/^(\*+)\.([^/\s{]+)$/);
        if (extensionMatch) {
            // extensionMatch[1] = asterisks, extensionMatch[2] = extension without dot
            const ext = `.${extensionMatch[2]}`.toLowerCase();
            if (!extensions.includes(ext)) {
                extensions.push(ext);
            }
        } else {
            // For complex patterns like "src/**/*.ts", extract the extension
            const complexExtensionMatch = pattern.match(/([^/\s{]+)$/);
            if (complexExtensionMatch) {
                const ext = `.${complexExtensionMatch[1]}`.toLowerCase();
                if (!extensions.includes(ext)) {
                    extensions.push(ext);
                }
            }
        }
    }

    const finalExtensions = extensions; // For debugging, keep the same name
    return finalExtensions;
}

/**
 * Normalize path separators and resolve to absolute path
 */
export function normalizePath(inputPath: string): string {
    return path.normalize(inputPath).replace(/\\/g, '/');
}

/**
 * Check if a file matches a glob pattern
 */
export function fileMatchesPattern(filePath: string, pattern?: string): boolean {
    if (!pattern) return true;

    const fileExt = path.extname(filePath).toLowerCase();
    const extensions = globPatternToExtensions(pattern);

    if (extensions.length === 0) {
        return true; // Wildcard pattern matches all
    }

    return extensions.some(ext => fileExt.toLowerCase() === ext);
}

/**
 * Process a single file for regex matches
 * Reads line-by-line for memory efficiency
 */
export async function searchFile(
    filePath: string,
    regex: RegExp
): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
        if (regex.test(filePath)) {
            results.push({
                file: filePath,
                line: 0, // or null if you prefer
                match: filePath,
                context: '' // filenames have no context
            } as SearchResult);
        }

        const content = await fs.readFile(filePath, 'utf-8');

        // Skip binary files by checking for BOM or null bytes
        if (content.includes('\0')) {
            return []; // Continue processing other files
        }

        const lines = content.split('\n');

        // Line-by-line regex matching
        for (let i = 0; i < lines.length; i++) {

            const lineNumber = i + 1; // 1-indexed

            const lineMatched = regex.test(lines[i]);
            if (lineMatched) {
                // Extract context (3 lines before and after)
                const contextLines = extractContext(lines, i, 2);

                results.push({
                    file: filePath,
                    line: lineNumber,
                    match: lines[i].trim(),
                    context: contextLines.join('\n')
                } as SearchResult);
            }
        }
    } catch {
        // Silently skip files that can't be read
        return results;
    }

    return results;
}

/**
 * Extract context lines around a match
 */
function extractContext(lines: string[], matchIndex: number, contextLines: number): string[] {
    const start = Math.max(0, matchIndex - contextLines);
    const end = Math.min(lines.length, matchIndex + contextLines + 1);
    return lines.slice(start, end);
}

/**
 * Fetch all matching files for the search repository tool
 * Uses existing fileHelpers.fetchRepoFiles for reliable directory traversal
 */
export async function findMatchingFiles(
    filePattern?: string
): Promise<string[]> {
    const rootPath = path.resolve(process.cwd());

    // Use existing fetchRepoFiles which handles directory traversal cleanly
    const allFiles = await fileHelpers.fetchRepoFiles();

    // Convert to absolute paths and filter by search path
    const absolutePaths = allFiles.map(file => {
        const absolute = path.join(rootPath, file).replace(/\\/g, '/');
        return absolute;
    });

    // Filter files that actually exist
    const existingFilesResults = await Promise.all(
        absolutePaths.map(async (file) => {
            try {
                await fs.access(file);
                return file;
            } catch {
                return null;
            }
        })
    );
    const existingFiles = existingFilesResults.filter((f): f is string => f !== null);

    // Apply extension filter if pattern is provided
    let filteredPaths: string[] = existingFiles;
    if (filePattern) {
        const extensions = globPatternToExtensions(filePattern);
        if (extensions.length > 0) {
            filteredPaths = filteredPaths.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return extensions.includes(ext);
            });
        }
    }

    return filteredPaths;
}

/**
 * Main search helper - orchestrates file traversal and content search
 */
export async function performSearch(
    regexPattern: string,
    filePattern?: string,
    limit: number = 50,
    matchCase: boolean = false
): Promise<SearchResult[]> {

    // Compile regex with appropriate flags
    // If matchCase is false (default), the search is case-insensitive (use 'i' flag)
    const flags = matchCase ? 'gm' : 'gmi';
    const regex = new RegExp(regexPattern, flags);

    const results: SearchResult[] = [];
    const matches: string[] = [];

    try {
        // Find all matching files using fetchRepoFiles
        const matchingFiles = await findMatchingFiles(
            filePattern
        );
        matches.push(...matchingFiles);

        // If no files found, return empty results
        if (matches.length === 0) {
            return results;
        }

        // Process each file
        await Promise.all(
            matches.map(async (file: string) => {
                // Stop early if limit reached
                if (results.length >= limit) return;

                const fileResults = await searchFile(file, regex);

                // Append only up to the remaining limit
                const remaining = limit - results.length;
                results.push(...fileResults.slice(0, remaining));
            })
        );

    } catch (error) {
        // Handle path resolution errors
        throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
}
