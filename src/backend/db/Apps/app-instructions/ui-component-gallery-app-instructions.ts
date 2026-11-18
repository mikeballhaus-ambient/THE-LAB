/**
 * App system instructions (seeded into apps.app_system_instructions).
 */

export const uiComponentGalleryInstructions = `\`# App System Instructions: UI Component Gallery

## Overview
The UI Component Gallery is a reference application designed to showcase interactive examples of various PrimeVue components. It serves as a living documentation and playground for developers to see how components like Buttons, DataTables, Modals, and Tree structures behave in a real Vue 3 environment.

## Key UI Components & Layout

### Root Container Structure
\`\`\`html
<div class="ui-component-gallery-app app-loaded-container min-h-full h-full flex flex-col overflow-hidden">
  <header class="lab-app-header">...</header>
  <main id="[unique-main-container]" class="lab-app-body">
  <div class="lab-app-landing">
  <section class="lab-app-panel lab-app-panel--flush-cards">
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <!-- Card Components for each PrimeVue component type -->
      <Card id="[unique-card-button]">...</Card>
      <Card id="[unique-card-input]">...</Card>
      <Card id="[unique-card-datatable]">...</Card>
      <!-- ... more cards ... -->
    </div>
  </div>
</div>
\`\`\`

### Component Breakdown

**1. Root App Container (\`ui-component-gallery-app\`)**
- **Purpose**: Main flex container for the entire gallery application
- **Key Elements**: Contains title, description, and main content grid

**2. Header Section (dynamic unique ID)**
- **Purpose**: Displays app title and description text
- **Key Elements**: \`<h1>\` with class \`text-2xl font-semibold mb-3\`, \`<p>\` with class \`mb-3\`

**3. Main Container (dynamic unique ID)**
- **Purpose**: Scrollable container for the component grid
- **Key Elements**: Grid wrapper with class \`grid grid-cols-3 gap-6\`

**4. Card Components (\`card-*\` IDs)**
Each PrimeVue component is displayed within a \`<Card>\` component with unique IDs:
- \`card-button\` - Button examples (enabled, disabled, severity, icon-only)
- \`card-input\` - InputText examples (text input, password input)
- \`card-datatable\` - DataTable with product list
- \`card-modal\` - PrimeDialog with open/close button
- \`card-select\` - Select dropdown with city options
- \`card-checkbox\` - Checkbox examples (binary, boolean)
- \`card-radiobutton\` - RadioButton group (3 options)
- \`card-multiselect\` - MultiSelect with city selection
- \`card-slider\` - Slider with value display
- \`card-menu\` - Menu component with toggle button
- \`card-tree\` - Tree structure with nested folders
- \`card-panel\` - Panel with header and content
- \`card-accordion\` - Accordion with 3 panels
- \`card-textarea\` - Textarea input

### SearchPattern Table for Agents for UI Automation Tool:
- **Discovery**: Prefer \`contextArea\`: \`ui-component-gallery-app\`. Use \`app-list-container\` or \`lab-app-catalog-sidebar\` only to **launch**. Avoid \`app-loaded-container\` alone when multiple apps are open.
- **Actions**: \`ui_automation_element_action\` with selectors from discovery.

| Area | Class Name / ID | Purpose |
|------|-----------------|---------|
| Launch (dashboard) | \`app-list-container\` / \`lab-app-catalog-sidebar\` | \`[data-appname="ui component gallery"]\` — grid or \`lab-catalog-sidebar-launch\` |
| App Root | \`ui-component-gallery-app\` | Main container for the gallery app |
| Header | dynamic unique ID | Title and description section |
| Main Container | dynamic unique ID | Scrollable grid container |
| Component Grid | \`.grid.grid-cols-3.gap-6\` | 3-column grid layout for cards |
| Button Card | \`card-button\` | Button component examples |
| Input Card | \`card-input\` | InputText component examples |
| DataTable Card | \`card-datatable\` | DataTable with product list |
| Modal Card | \`card-modal\` | PrimeDialog with open button |
| Select Card | \`card-select\` | Select dropdown example |
| Checkbox Card | \`card-checkbox\` | Checkbox binary/boolean examples |
| RadioButton Card | \`card-radiobutton\` | RadioButton group example |
| MultiSelect Card | \`card-multiselect\` | MultiSelect component example |
| Slider Card | \`card-slider\` | Slider with value display |
| Menu Card | \`card-menu\` | Menu component example |
| Tree Card | \`card-tree\` | Tree structure example |
| Panel Card | \`card-panel\` | Panel component example |
| Accordion Card | \`card-accordion\` | Accordion with 3 panels |
| Textarea Card | \`card-textarea\` | Textarea input example |

## Visual Flowchart

### UI Flow
\`\`\`mermaid
flowchart TD
    Start[App Mounts] --> RenderGrid[Render Component Cards in Grid]
    RenderGrid --> UserInteraction{User Interaction}
    UserInteraction -- Click Button --> ButtonAction[Trigger Button Event/State]
    UserInteraction -- Input Text --> InputUpdate[Update ref values]
    UserInteraction -- Open Modal --> ModalToggle[Toggle displayModal state]
    UserInteraction -- Select Option --> SelectionUpdate[Update selectedCity/selectedItems]
    UserInteraction -- Expand Tree --> TreeToggle[Toggle Tree Nodes]
    UserInteraction -- Toggle Accordion --> AccordionToggle[Expand/Collapse Panel]
\`\`\`

## Unique Workflows
- **Modal Interaction**: To test the Modal component, the agent must first click the "Open Modal" button in the \`card-modal\` section. The modal is managed by a boolean \`displayModal\` state and appears within the \`p-dialog-mask\` context area when opened.
- **Tree Navigation**: The Tree component contains nested nodes (e.g., Documents > Work > Spreadsheet). Agents can interact with these to see hierarchical data rendering.
- **Multi-Select/Select**: These components use predefined arrays (\`items\`, \`cities\`). Interaction updates the corresponding \`ref\` variables which are reflected in the UI.

## Common Pitfalls & Warnings
- **Timing Issues**: Ensure the component is fully rendered before attempting to interact with elements inside the \`Card\` content areas.
- **State Dependencies**: For the Modal, do not attempt to interact with the dialog content until the "Open Modal" button has been clicked and the dialog is visible within the \`p-dialog-mask\` context area.
- **Selector Ambiguity**: Many cards use similar internal structures. Always use the specific card ID (e.g., \`card-button\`, \`card-input\`) as a parent context when discovering elements to avoid selecting the wrong component.
- **Documentation Links**: Each card has a "Documentation" link in the footer. While these are external, they are useful for agents to understand the underlying PrimeVue API.

## Success Indicators
- **Action: Open Modal** -> **Success Indicator**: A \`PrimeDialog\` appears on screen with the header "Modal Header" within the \`p-dialog-mask\` context area.
- **Action: Input Text** -> **Success Indicator**: The value in the \`InputText\` component updates as the agent types.
- **Action: Select City** -> **Success Indicator**: The selected city name appears in the \`Select\` component's display area.
- **Action: Toggle Accordion** -> **Success Indicator**: The content area of the specific \`AccordionPanel\` expands or collapses.

## FAQs & Agent Guidance

This section provides specific guidance for the agent on how to interact with this app's UI using \`ui_automation_discover_elements\` and \`ui_automation_element_action\`.

### Common Requests

**Question: "Launch the UI Component Gallery app"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "app-list-container"\` (or \`lab-app-catalog-sidebar\` when workspace tabs are open).
    - Locate Launch via \`[data-appname="ui component gallery"]\` or \`lab-catalog-sidebar-launch\`.
    - Use \`ui_automation_element_action\` to click that control.

**Question: "Show me how to use a Modal"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "ui-component-gallery-app"\`.
    - Locate the button with label "Open Modal" within the \`card-modal\` section.
    - Trigger a click on this button.
    - Once the modal appears, use \`ui_automation_discover_elements\` with \`contextArea: "p-dialog-mask"\` and \`ui_automation_element_action\` for dialog controls.

**Question: "Find the DataTable example"**
- **Answer:** 
    - Use \`ui_automation_discover_elements\` with \`contextArea: "ui-component-gallery-app"\`.
    - Locate the \`card-datatable\` Card component which displays a list of products (Laptop, Smartphone, etc.).

**Question: "Interact with the Tree component"**
- **Answer:** 
    - Use \`ui_automation_discover_elements\` with \`contextArea: "ui-component-gallery-app"\`.
    - Locate the \`card-tree\` Card component and identify the "Documents" node.
    - Click to expand it, then navigate through the nested "Work" folder to find specific files like "Spreadsheet".

**Question: "Open the Select dropdown"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "ui-component-gallery-app"\`.
    - Locate the \`card-select\` Card component.
    - Find the Select element and trigger a click or hover action to open the dropdown.

**Question: "Check the checkbox"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "ui-component-gallery-app"\`.
    - Locate the \`card-checkbox\` Card component.
    - Find the Checkbox element and trigger a click action to toggle its state.

**Question: "Change the slider value"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "ui-component-gallery-app"\`.
    - Locate the \`card-slider\` Card component.
    - Find the Slider element and use \`setValue\` action to change the value, or click on the track to set a new position.

## Unique Class Names for Agent Identification
- \`ui-component-gallery-app\` - Root app container
- \`text-2xl.font-semibold.mb-3\` - Title heading styles
- \`mb-3\` - Margin bottom spacing
- \`max-h-[calc(100vh-250px)].overflow-auto\` - Main scrollable container
- \`grid.grid-cols-3.gap-6\` - 3-column grid layout
- \`card-button\`, \`card-input\`, \`card-datatable\`, etc. - Individual Card component IDs (all use \`generateUniqueId()\` pattern)
- \`.text-sm.text-blue-500\` - Documentation link styles

## Component Hierarchy Diagram
\`\`\`mermaid
flowchart TD
    ui-component-gallery-app["ui-component-gallery-app<br/>Root container"] --> header["Header Section<br/>Title + Description"]
    ui-component-gallery-app --> main-container["Main Container<br/>Scrollable grid area"]
    
    main-container --> component-grid["Component Grid<br/>grid.grid-cols-3.gap-6"]
    
    component-grid --> card-button["Card: Button<br/>card-button"]
    component-grid --> card-input["Card: Input<br/>card-input"]
    component-grid --> card-datatable["Card: DataTable<br/>card-datatable"]
    component-grid --> card-modal["Card: Modal<br/>card-modal"]
    component-grid --> card-select["Card: Select<br/>card-select"]
    component-grid --> card-checkbox["Card: Checkbox<br/>card-checkbox"]
    component-grid --> card-radiobutton["Card: RadioButton<br/>card-radiobutton"]
    component-grid --> card-multiselect["Card: MultiSelect<br/>card-multiselect"]
    component-grid --> card-slider["Card: Slider<br/>card-slider"]
    component-grid --> card-menu["Card: Menu<br/>card-menu"]
    component-grid --> card-tree["Card: Tree<br/>card-tree"]
    component-grid --> card-panel["Card: Panel<br/>card-panel"]
    component-grid --> card-accordion["Card: Accordion<br/>card-accordion"]
    component-grid --> card-textarea["Card: Textarea<br/>card-textarea"]
\`\`\``;
