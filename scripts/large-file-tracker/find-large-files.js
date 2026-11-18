#!/usr/bin/env node

/**
 * Script to find all files in the repository that exceed 500 lines of code/text
 */

import fs from 'fs';
import path from 'path';

const LINE_THRESHOLD = 600;
const EXCLUDED_DIRS = ['.roo', '.git', '.vscode', 'chroma-data', 'dist', 'logs', 'node_modules'];
const CODE_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx', '.vue', '.html', '.css', '.scss', '.sql', '.cjs'];
const EXCLUDED_FILES = ['AGENTS.md', 'CLAUDE.md', 'search-repository-tool.test.ts', 'todo-list-tool.test.ts', 'app-management-non-database.test.ts', 'app-database-service.test.ts'];

function getLineCount(filePath) {
    try {
        const ext = path.extname(filePath).toLowerCase();
        // Skip binary files (audio, images, etc.)
        if (ext === '.mp3' || ext === '.png' || ext === '.jpg' || ext === '.jpeg'
            || ext === '.gif' || ext === '.webp' || ext === '.ico' || ext === '.svg') {
            return 0;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split('\n').length;
    } catch {
        return 0;
    }
}

function shouldExcludeFile(filePath) {
    const fileName = path.basename(filePath);
    return EXCLUDED_FILES.includes(fileName);
}

function shouldIncludeFile(dirPath) {
    const parts = path.relative('.', dirPath).split(path.sep);
    return !parts.some(part => EXCLUDED_DIRS.includes(part));
}

function findLargeFiles(baseDir) {
    const largeFiles = [];
    
    function traverseDirectory(currentDir) {
        if (!fs.existsSync(currentDir)) return;
        
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            
            if (entry.isDirectory()) {
                if (shouldIncludeFile(fullPath)) {
                    traverseDirectory(fullPath);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(fullPath).toLowerCase();
                // Only process code/text files
                if (CODE_EXTENSIONS.includes(ext) && !shouldExcludeFile(fullPath)) {
                    const lineCount = getLineCount(fullPath);
                    if (lineCount > LINE_THRESHOLD) {
                        largeFiles.push({
                            path: fullPath,
                            lines: lineCount
                        });
                    }
                }
            }
        }
    }
    
    traverseDirectory(baseDir);
    return largeFiles.sort((a, b) => b.lines - a.lines);
}

function main() {
    const start = Date.now();
    console.log(`Searching for files with over ${LINE_THRESHOLD} lines...\n`);
    
    const largeFiles = findLargeFiles('.');
    
    if (largeFiles.length === 0) {
        console.log('No files exceed the line threshold.');
    } else {
        console.log(`Found ${largeFiles.length} file(s) with over ${LINE_THRESHOLD} lines:\n`);
        console.log('=' .repeat(80));
        
        largeFiles.forEach(file => {
            console.log(`${file.lines.toString().padEnd(6)} lines  |  ${file.path}`);
        });
        
        console.log('='.repeat(80));
        console.log(`\nSearch completed in ${(Date.now() - start) / 1000} seconds.`);
    }
    
    // Save results to markdown file
    let mdContent = `# Files with Over ${LINE_THRESHOLD} Lines\n\n` +
        `Found **${largeFiles.length}** file(s) exceeding the line threshold.\n\n` +
        `| Lines | File Path |\n` +
        `|-------|-----------|\n`;
    
    for (const file of largeFiles) {
        mdContent += `| ${file.lines} | [${file.path}](${file.path}) |\n`;
    }
    
    const reportPath = 'docs/large-file-refactor/large-files-report.md';
    fs.writeFileSync(reportPath, mdContent);
    console.log(`\nResults saved to ${reportPath}`);
}

main();
