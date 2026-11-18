import fs from 'fs';
import path from 'path';

/**
 * Generate a directory tree representation of a folder
 * @param {string} dirPath - Path to the directory
 * @param {number} depth - Current indentation level
 * @returns {Array<{name: string, type: string, depth: number}>} - Array of items with depth context
 */
function generateTree(dirPath, depth = 0) {
    let items = [];
    try {
        if (!fs.existsSync(dirPath)) return items;
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        // Sort: folders first (alphabetically), then files (alphabetically)
        entries.sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory()) {
                return a.isDirectory() ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                items.push({ name: entry.name, type: 'folder', depth });
                // Recursively add sub-items with increased depth
                const subItems = generateTree(fullPath, depth + 1);
                items = items.concat(subItems);
            } else {
                items.push({ name: entry.name, type: 'file', depth });
            }
        }
    } catch (error) {
        console.error('Error reading directory ' + dirPath + ':', error.message);
    }
    return items;
}

/**
 * Convert items array to tree string with proper branch indentation
 * @param {Array<{name: string, type: string, depth: number}>} items - Array of items
 * @returns {string} - Tree string representation
 */
function itemsToTree(items) {
    if (items.length === 0) return '';

    const result = [];
    
    // Group items by depth level
    const byDepth = {};
    for (const item of items) {
        if (!byDepth[item.depth]) byDepth[item.depth] = [];
        byDepth[item.depth].push(item);
    }
    
    // Process each depth level
    for (const depth in byDepth) {
        const levelItems = byDepth[depth];
        for (let i = 0; i < levelItems.length; i++) {
            const item = levelItems[i];
            const isLast = i === levelItems.length - 1;
            
            // Build prefix based on depth and sibling status
            let prefix = '';
            for (let d = 0; d < depth; d++) {
                // Check if there are more siblings after this one at the same level
                let parentHasMore = false;
                for (let j = i + 1; j < levelItems.length; j++) {
                    if (levelItems[j].depth === depth) {
                        parentHasMore = true;
                        break;
                    }
                    if (levelItems[j].depth < depth) {
                        break;
                    }
                }
                prefix += parentHasMore ? '│   ' : '    ';
            }
            
            const connector = isLast ? '└── ' : '├── ';
            const suffix = item.type === 'folder' ? '/' : '';
            
            result.push(prefix + connector + item.name + suffix);
        }
    }

    return result.join('\n');
}

/**
 * Generate the complete documentation tree content
 * @param {string} refactorDir - Directory to generate tree for
 * @returns {string} - Tree string representation
 */
function generateDocumentation(refactorDir) {
    const items = generateTree(refactorDir);
    const treeString = itemsToTree(items);

    const content = 'Source: ' + refactorDir + '\n\n' + '```\n' + treeString + '\n```\n';

    return content;
}

/**
 * Main function to build and update the documentation tree
 */
function main() {
    // Get arguments from command line
    const args = process.argv.slice(2);
    
    let refactorDir = path.join(process.cwd(), args[0]);
    
    console.log('Building directory tree for: ' + refactorDir);
    try {
        // Ensure the output directory exists
        const outputDir = path.dirname(args[1]);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const content = generateDocumentation(refactorDir);

        fs.writeFileSync(args[1], content, 'utf8');
        console.log('Successfully updated: ' + args[1]);
    } catch (error) {
        console.error('Error writing documentation:', error.message);
        process.exit(1);
    }
}

main();
