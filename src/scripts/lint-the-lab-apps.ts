import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
// Configuration
const APPS_DIR = join(process.cwd(), 'src', 'apps');
const VUE_EXTENSIONS = ['.vue'];

// HTML interactive elements that require unique IDs
const INTERACTIVE_ELEMENTS = [
  'button', 'input', 'select', 'textarea', 'a', 'form', 'label',
  'details', 'summary', 'dialog', 'menu', 'menuitem',
  'nav', 'aside', 'main',
  'section', 'article', 'header', 'footer', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'thead', 'tbody',
  'tfoot', 'tr', 'th', 'td', 'iframe', 'video', 'audio', 'canvas', 
  'map', 'progress', 'meter', 'object', 'embed', 'img'
];

// Map of PrimeVue module paths to PascalCase component names used in templates
const PRIMEVUE_COMPONENT_MAP: Record<string, string[]> = {
  'primevue/button': ['Button', 'PrimeVueButton'],
  'primevue/select': ['Select'],
  'primevue/inputtext': ['InputText'],
  'primevue/checkbox': ['Checkbox'],
  'primevue/radiobutton': ['RadioButton'],
  'primevue/multiselect': ['MultiSelect'],
  'primevue/slider': ['Slider'],
  'primevue/menu': ['Menu'],
  'primevue/tree': ['Tree'],
  'primevue/panel': ['Panel'],
  'primevue/accordion': ['Accordion'],
  'primevue/accordionpanel': ['AccordionPanel'],
  'primevue/accordionheader': ['AccordionHeader'],
  'primevue/accordioncontent': ['AccordionContent'],
  'primevue/card': ['Card'],
  'primevue/dialog': ['Dialog', 'PrimeDialog'],
  'primevue/datatable': ['DataTable'],
  'primevue/column': ['Column'],
  'primevue/inputnumber': ['InputNumber'],
  'primevue/password': ['Password'],
  'primevue/textarea': ['Textarea'],
  'primevue/cascadeselect': ['CascadeSelect'],
  'primevue/chips': ['Chips'],
  'primevue/colorpicker': ['ColorPicker'],
  'primevue/datepicker': ['DatePicker'],
  'primevue/dropdown': ['Dropdown'],
  'primevue/fileupload': ['FileUpload'],
  'primevue/galleria': ['Galleria'],
  'primevue/inplace': ['Inplace'],
  'primevue/listbox': ['ListBox'],
  'primevue/megamenu': ['Megamenu'],
  'primevue/orderlist': ['OrderList'],
  'primevue/picklist': ['PickList'],
  'primevue/scrollpanel': ['ScrollPanel'],
  'primevue/splitbutton': ['SplitButton'],
  'primevue/stepper': ['Stepper'],
  'primevue/tabmenu': ['TabMenu'],
  'primevue/tabpanel': ['TabPanel'],
  'primevue/terminal': ['Terminal'],
  'primevue/tieredmenu': ['TieredMenu'],
  'primevue/toast': ['Toast'],
  'primevue/toolbar': ['Toolbar'],
  'primevue/tooltip': ['Tooltip'],
  'primevue/contextmenu': ['ContextMenu'],
  'primevue/confirmdialog': ['ConfirmDialog'],
  'primevue/treetable': ['TreeTable'],
  'primevue/virtualscroller': ['VirtualScroller'],
  'primevue/speeddial': ['SpeedDial'],
  'primevue/autocomplete': ['AutoComplete']
};

interface Violation {
  file: string;
  line: number;
  column: number;
  message: string;
  type: ViolationType;
}

type ViolationType =
  | 'missing-primevue-id'
  | 'missing-native-id'
  | 'missing-vfor-id'
  | 'missing-conditional-id'
  | 'missing-dynamic-id'
  | 'missing-portal-id'
  | 'missing-ssr-id';

class LintTheLabApps {
  private violations: Violation[] = [];
  private filesScanned: number = 0;

  run(): boolean {
    console.log('='.repeat(80));
    console.log('THE-LAB APPS BUILD-TIME VALIDATION');
    console.log('='.repeat(80));
    console.log(`\nScanning directory: ${APPS_DIR}`);
    console.log(`\nValidating interactive elements have unique ID patterns:\n`);

    const vueFiles = this.findVueFiles(APPS_DIR);
    this.filesScanned = vueFiles.length;

    console.log(`Found ${vueFiles.length} Vue file(s) to scan\n`);

    for (const filePath of vueFiles) {
      const relativePath = relative(process.cwd(), filePath);
      const result = this.validateFile(filePath, relativePath);
      this.violations.push(...result.violations);
    }

    console.log('='.repeat(80));
    console.log(`VALIDATION COMPLETE`);
    console.log('='.repeat(80));
    console.log(`\nFiles scanned: ${this.filesScanned}`);
    console.log(`Total violations found: ${this.violations.length}\n`);

    if (this.violations.length > 0) {
      console.log('\n--- VIOLATIONS ---');
      for (const violation of this.violations) {
        console.log(`\n[${violation.type.toUpperCase()}] ${violation.file}:${violation.line}:${violation.column}`);
        console.log(`  ${violation.message}`);
      }
      console.log('\n' + '='.repeat(80));
      console.log('BUILD FAILED: Interactive elements missing unique ID patterns');
      console.log('='.repeat(80));
      throw new Error(`Lint validation failed with ${this.violations.length} violation(s)`);
    } else {
      console.log('\n✓ All interactive elements have proper unique ID patterns');
      console.log('='.repeat(80));
      console.log('BUILD PASSED');
      console.log('='.repeat(80));
      return true;
    }
  }

  private findVueFiles(dir: string): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) {
      console.warn(`Directory not found: ${dir}`);
      return files;
    }

    const items = readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = join(dir, item.name);

      if (item.isDirectory()) {
        files.push(...this.findVueFiles(fullPath));
      } else {
        for (const ext of VUE_EXTENSIONS) {
          if (item.name.endsWith(ext)) {
            files.push(fullPath);
            break;
          }
        }
      }
    }

    return files;
  }

  private validateFile(filePath: string, relativePath: string): ValidationResult {
    const content = readFileSync(filePath, 'utf-8');
    const violations: Violation[] = [];

    // Check for PrimeVue components with :pt directive
    this.checkPrimeVueComponents(content, relativePath, violations);

    // Check for native interactive elements with :id binding
    this.checkNativeInteractiveElements(content, relativePath, violations);

    // Check v-for loops for ID patterns
    this.checkVForLoops(content, relativePath, violations);

    // Check conditional rendering (v-if, v-show)
    this.checkConditionalRendering(content, relativePath, violations);

    // Check dynamically created elements (v-html, v-text with innerHTML)
    this.checkDynamicElements(content, relativePath, violations);

    // Check portal patterns (Teleport)
    this.checkPortals(content, relativePath, violations);

    // Check SSR content patterns
    this.checkSSRContent(content, relativePath, violations);

    return { file: relativePath, violations };
  }

  private checkPrimeVueComponents(content: string, relativePath: string, violations: Violation[]): void {
    // Split content into script and template sections
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    const templateMatch = content.match(/<template>([\s\S]*)<\/template>/);

    if (!templateMatch) return;

    const templateContent = templateMatch[1];

    // Extract PrimeVue imports from script section
    const primevueImports: Set<string> = new Set();
    if (scriptMatch) {
      const importPattern = /import\s+(?:[\w,\s]+from\s+)?['"]primevue\/([^'"]+)['"]/g;
      let importMatch;
      while ((importMatch = importPattern.exec(scriptMatch[1])) !== null) {
        primevueImports.add(importMatch[1]);
      }
    }

    // Pattern to match PrimeVue components in template (PascalCase)
    const componentPattern = /<([A-Z][\w-]+)([^>]*?)(\/?>)/g;
    let match;

    while ((match = componentPattern.exec(templateContent)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      const lineNum = this.getLineNumber(content, match.index);

      // Check if this is a PrimeVue component (imported from primevue/*)
      const isPrimeVueComponent = Object.entries(PRIMEVUE_COMPONENT_MAP).some(([module, names]: [string, string[]]) =>
        names.includes(tagName) && primevueImports.has(module)
      );

      if (isPrimeVueComponent) {
        // Check for :pt directive with generateUniqueId
        const hasPtWithId = /:pt\s*=\s*["'][^"']*generateUniqueId[^"']*/.test(attributes);

        // Also check for any :id binding
        const hasAnyId = /:\s*(?:id|pt)\s*=\s*["'][^"']*generateUniqueId/.test(attributes);

        if (!hasPtWithId && !hasAnyId) {
          violations.push({
            file: relativePath,
            line: lineNum,
            column: 1,
            message: `PrimeVue component <${tagName}> missing unique ID pattern. Use: :pt="{ root: { attrs: { id: generateUniqueId(...) } }}"`,
            type: 'missing-primevue-id'
          });
        }
      }
    }
  }

  private checkNativeInteractiveElements(content: string, relativePath: string, violations: Violation[]): void {
    // Pattern to match HTML elements with their attributes (case-sensitive to avoid matching PrimeVue components)
    const elementPattern = /<([a-z][a-z0-9]*)\s*([^>]*?)(\/?>)/g;
    let match;

    while ((match = elementPattern.exec(content)) !== null) {
      const tagName = match[1].toLowerCase();
      const attributes = match[2];
      const lineNum = this.getLineNumber(content, match.index);

      // Check if it's an interactive element
      if (INTERACTIVE_ELEMENTS.includes(tagName)) {
        // Check for :id binding with generateUniqueId
        const hasIdWithGenerate = /:\s*id\s*=\s*["'][^"']*generateUniqueId/.test(attributes);

        if (!hasIdWithGenerate) {
          violations.push({
            file: relativePath,
            line: lineNum,
            column: 1,
            message: `Native interactive element <${tagName}> missing unique ID pattern. Use: :id="generateUniqueId(...)"`,
            type: 'missing-native-id'
          });
        }
      }
    }
  }

  private checkVForLoops(content: string, relativePath: string, violations: Violation[]): void {
    // Pattern to match v-for directives on interactive elements (case-sensitive)
    const vforPattern = /(<([a-z][a-z0-9]*)\s+v-for\s*=\s*["'][^"']*)([^>]*?)(\/?>)/g;
    let match;

    while ((match = vforPattern.exec(content)) !== null) {
      const tagName = match[2].toLowerCase();
      const attributes = match[3];
      const lineNum = this.getLineNumber(content, match.index);

      // Check if it's an interactive element
      if (INTERACTIVE_ELEMENTS.includes(tagName)) {
        // Check for :id binding with generateUniqueId
        const hasIdWithGenerate = /:\s*id\s*=\s*["'][^"']*generateUniqueId/.test(attributes);

        if (!hasIdWithGenerate) {
          violations.push({
            file: relativePath,
            line: lineNum,
            column: 1,
            message: `v-for loop on <${tagName}> missing unique ID pattern. Add :id="generateUniqueId(...)" to the element`,
            type: 'missing-vfor-id'
          });
        }
      }
    }
  }

  private checkConditionalRendering(content: string, relativePath: string, violations: Violation[]): void {
    // Pattern to match v-if/v-show directives on interactive elements (case-sensitive)
    const conditionalPattern = /(<([a-z][a-z0-9]*)\s+(?:v-if|v-show)\s*=\s*["'][^"']*)([^>]*?)(\/?>)/g;
    let match;

    while ((match = conditionalPattern.exec(content)) !== null) {
      const tagName = match[2].toLowerCase();
      const attributes = match[3];
      const lineNum = this.getLineNumber(content, match.index);

      // Check if it's an interactive element
      if (INTERACTIVE_ELEMENTS.includes(tagName)) {
        // Check for :id binding with generateUniqueId
        const hasIdWithGenerate = /:\s*id\s*=\s*["'][^"']*generateUniqueId/.test(attributes);

        if (!hasIdWithGenerate) {
          violations.push({
            file: relativePath,
            line: lineNum,
            column: 1,
            message: `Conditional element <${tagName}> with v-if/v-show missing unique ID pattern. Add :id="generateUniqueId(...)"`,
            type: 'missing-conditional-id'
          });
        }
      }
    }
  }

  private checkDynamicElements(content: string, relativePath: string, violations: Violation[]): void {
    // Pattern to match v-html directives on interactive elements (case-sensitive)
    const vhtmlPattern = /(<([a-z][a-z0-9]*)\s+v-html\s*=\s*["'][^"']*)([^>]*?)(\/?>)/g;
    let match;

    while ((match = vhtmlPattern.exec(content)) !== null) {
      const tagName = match[2].toLowerCase();
      const attributes = match[3];
      const lineNum = this.getLineNumber(content, match.index);

      // Check if it's an interactive element
      if (INTERACTIVE_ELEMENTS.includes(tagName)) {
        // Check for :id binding with generateUniqueId
        const hasIdWithGenerate = /:\s*id\s*=\s*["'][^"']*generateUniqueId/.test(attributes);

        if (!hasIdWithGenerate) {
          violations.push({
            file: relativePath,
            line: lineNum,
            column: 1,
            message: `Dynamic element <${tagName}> with v-html missing unique ID pattern. Add :id="generateUniqueId(...)"`,
            type: 'missing-dynamic-id'
          });
        }
      }
    }

    // Pattern to match v-text directives on interactive elements (case-sensitive)
    const vtextPattern = /(<([a-z][a-z0-9]*)\s+v-text\s*=\s*["'][^"']*)([^>]*?)(\/?>)/g;
    let match2;

    while ((match2 = vtextPattern.exec(content)) !== null) {
      const tagName = match2[2].toLowerCase();
      const attributes = match2[3];
      const lineNum = this.getLineNumber(content, match2.index);

      // Check if it's an interactive element
      if (INTERACTIVE_ELEMENTS.includes(tagName)) {
        // Check for :id binding with generateUniqueId
        const hasIdWithGenerate = /:\s*id\s*=\s*["'][^"']*generateUniqueId/.test(attributes);

        if (!hasIdWithGenerate) {
          violations.push({
            file: relativePath,
            line: lineNum,
            column: 1,
            message: `Dynamic element <${tagName}> with v-text missing unique ID pattern. Add :id="generateUniqueId(...)"`,
            type: 'missing-dynamic-id'
          });
        }
      }
    }
  }

  private checkPortals(content: string, relativePath: string, violations: Violation[]): void {
    // Pattern to match teleport() function calls
    const teleportPattern = /teleport\s*\(\s*["']([^"']+)["']/g;
    let match;

    while ((match = teleportPattern.exec(content)) !== null) {
      const lineNum = this.getLineNumber(content, match.index);

      // Check if the teleported content has interactive elements without IDs
      const teleportContent = match[1];
      const hasInteractiveWithoutId = /<(button|input|select|textarea|a)\s[^>]*>(?![^<]*:\s*id\s*=)/.test(teleportContent);

      if (hasInteractiveWithoutId) {
        violations.push({
          file: relativePath,
          line: lineNum,
          column: 1,
          message: `Teleported element missing unique ID pattern. Add :id="generateUniqueId(...)"`,
          type: 'missing-portal-id'
        });
      }
    }
  }

  private checkSSRContent(content: string, relativePath: string, violations: Violation[]): void {
    // Pattern to match SSR-related directives
    const ssrPattern = /(<([a-z][a-z0-9]*)\s+(?:ssr|server-render|client-only)\s*=\s*["'][^"']*)([^>]*?)(\/?>)/gi;
    let match;

    while ((match = ssrPattern.exec(content)) !== null) {
      const tagName = match[2].toLowerCase();
      const attributes = match[3];
      const lineNum = this.getLineNumber(content, match.index);

      // Check if it's an interactive element
      if (INTERACTIVE_ELEMENTS.includes(tagName)) {
        // Check for :id binding with generateUniqueId
        const hasIdWithGenerate = /:\s*id\s*=\s*["'][^"']*generateUniqueId/.test(attributes);

        if (!hasIdWithGenerate) {
          violations.push({
            file: relativePath,
            line: lineNum,
            column: 1,
            message: `SSR-rendered element <${tagName}> missing unique ID pattern. Add :id="generateUniqueId(...)"`,
            type: 'missing-ssr-id'
          });
        }
      }
    }
  }

  private getLineNumber(content: string, position: number): number {
    const lastNewline = content.lastIndexOf('\n', position);
    return lastNewline === -1 ? 1 : content.substring(0, lastNewline).split('\n').length;
  }
}

interface ValidationResult {
  file: string;
  violations: Violation[];
}

// Export for programmatic use
export default LintTheLabApps;
// CLI entry point
if (import.meta.url.startsWith('file://')) {
  const linter = new LintTheLabApps();
  const success = linter.run();
  process.exit(success ? 0 : 1);
}

