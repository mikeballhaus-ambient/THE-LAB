/**
 * App system instructions (seeded into apps.app_system_instructions).
 */

export const dndExamplesInstructions = `\`# App System Instructions: Drag & Drop Examples

## Overview

Drag & Drop Examples is a comprehensive gallery of 24 interactive components demonstrating various drag-and-drop patterns using the \`@vue-dnd-kit/core\` framework. The app serves as a reference for developers to understand and implement specific behaviors such as sorting, grid snapping, custom overlays, multi-selection, keyboard navigation, and more.

The application consists of two views:
1. **Gallery View**: A responsive 4-column grid displaying all available D&D examples. Each card shows the example name and description. Clicking a card activates that specific example in a focused container.
2. **Active App View**: When an example is selected, it renders in a focused container with a "Close" button at the top right to return to the gallery.

## Key UI Components & Layout

### Root Container Structure

\`\`\`html
<div class="drag-drop-examples-app app-loaded-container min-h-full h-full flex flex-col overflow-hidden">
  <header class="lab-app-header">...</header>
  <main class="lab-app-body">
  <!-- Gallery View (when no app is active) -->
  <div v-if="!activeAppId" class="lab-app-landing">
    <section class="lab-app-panel">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <!-- Example Cards (button.dnd-example-card) -->
      <button v-for="app in APP_REGISTRY" :key="app.id"
        type="button"
        class="dnd-example-card ..."
        @click="activateApp(app.id)">
        <h3 :id="[unique-h3]" class="text-xl font-semibold text-slate-300 mb-2">{{ app.name }}</h3>
        <p :id="[unique-p-desc]" class="text-slate-400 text-sm mb-4">{{ app.description }}</p>
      </div>
    </div>
  </div>

  <!-- Active App View (when an app is active) -->
  <div v-else class="lab-app-landing">
    <section class="lab-app-panel flex flex-col gap-4 lg:flex-row">
    <!-- Dynamic Component Container -->
    <div v-if="activeAppId && components" class="h-full overflow-auto">
      <component :is="components" />
    </div>

    <!-- Close Button -->
    <div class="flex justify-end">
      <Button :pt="{ root: { attrs: { id: [unique-btn-close] } } }" label="Close" class="text-white hover:bg-slate-700 rounded-lg transition-colors px-3 py-2"
        @click="deactivateApp" />
    </div>
  </div>
</div>
\`\`\`

### Component Breakdown

**1. Main App Container (\`drag-drop-examples-app\`)**
- **Purpose**: Root wrapper for the entire Drag & Drop Examples application
- **Key Elements**:
  - Header with title and description (using \`useUniqueElementId()\`)
  - Gallery view container (conditional rendering via \`v-if="!activeAppId"\`)
  - Active app view container (conditional rendering via \`v-else\`)

**2. Gallery Grid Container**
- **Class**: \`grid grid-cols-4 gap-4\`
- **Purpose**: Responsive 4-column grid displaying all example cards
- **Key Elements**:
  - Each card is a clickable div with hover effects
  - Cards dynamically render app name and description from APP_REGISTRY

**3. Example Card Component**
- **Class**: \`bg-slate-700/75 border-slate-500 rounded-lg border p-5\`
- **Purpose**: Individual card representing each D&D example in the gallery
- **Key Elements**:
  - Title (\`text-xl font-semibold text-slate-300\`)
  - Description (\`text-slate-400 text-sm\`)
  - Hover effects: \`hover:bg-slate-600/75 hover:border-slate-400\`
  - Click handler to activate the example

**4. Active App Container**
- **Class**: \`bg-slate-700/75 border-slate-500 border rounded-lg shadow-lg p-6 flex items-start justify-center gap-6\`
- **Purpose**: Container for dynamically loaded example when active
- **Key Elements**:
  - Dynamic component container (\`h-full overflow-auto\`)
  - Close button (PrimeVue Button)

**5. Close Button**
- **Component**: PrimeVue Button with \`:pt="{ root: { attrs: { id: generateUniqueId('btn-close') } } }"\`
- **Class**: \`text-white hover:bg-slate-700 rounded-lg transition-colors px-3 py-2\`
- **Purpose**: Returns user to gallery view when an example is active
- **Key Elements**:
  - Unique ID generated via \`useUniqueElementId()\`
  - Triggers \`deactivateApp()\` function

### SearchPattern Table for Agents for UI Automation Tool:
- **Discovery**: Prefer \`contextArea\`: \`drag-drop-examples-app\`. Use \`app-list-container\` or \`lab-app-catalog-sidebar\` only to **launch**. Avoid \`app-loaded-container\` alone when multiple apps are open.
- **Actions**: \`ui_automation_element_action\` with selectors from discovery.

| Area | Class Name / ID | Purpose |
|------|-----------------|---------|
| Launch (dashboard) | \`app-list-container\` / \`lab-app-catalog-sidebar\` | \`[data-appname="drag & drop examples"]\` — grid or \`lab-catalog-sidebar-launch\` |
| App Root | \`drag-drop-examples-app\` | Main container for the entire app |
| Gallery Grid | \`grid grid-cols-4 gap-4\` | Container for example cards in gallery view |
| Example Card | \`bg-slate-700/75 border-slate-500 rounded-lg border p-5\` | Individual clickable card in gallery |
| Active App Container | \`h-full overflow-auto\` | Container for dynamically loaded example |
| Close Button | \`[unique-id-from-useUniqueElementId]\` | Button to return to gallery view |
| Header Title | \`[unique-h1]\` | Main heading with unique ID |
| Header Description | \`[unique-p]\` | App description text with unique ID |

## Visual Flowchart

### UI Flow
\`\`\`mermaid
flowchart TD
    Start[App Mounts] --> GenerateIDs[Generate Unique IDs via useUniqueElementId]
    GenerateIDs --> Gallery[Display D&D Examples Gallery Grid]
    Gallery --> UserClick{User Clicks Card?}
    UserClick -- No --> Gallery
    UserClick -- Yes --> Activate[Dynamically Load Selected Example]
    Activate --> Render[Render Active Example in Container]
    Render --> Interact[User Interacts with D&D Elements]
    Interact --> CloseClick{User Clicks Close Button?}
    CloseClick -- No --> Interact
    CloseClick -- Yes --> Deactivate[Clear Component Reference & Active App ID]
    Deactivate --> Gallery
\`\`\`

### Back-end Flow
\`\`\`mermaid
flowchart TD
    Client[Client Browser] --> LoadApp[Load DragDropExamples.vue Component]
    LoadApp --> GenerateIDs[Generate Unique IDs for UI Elements]
    GenerateIDs --> MountGallery[Mount Gallery Grid View]
    MountGallery --> UserAction{User Action}
    UserAction -- Click Card --> ImportComponent[Dynamically Import Example.vue]
    ImportComponent --> ValidateExport[Check for default Export]
    ValidateExport --> SetComponent[Set components.value Reference]
    SetComponent --> RenderActive[Render Active Component]
    RenderActive --> UserInteraction{User Interaction}
    UserInteraction -- Click Close --> ClearState[Clear activeAppId & components.value]
    ClearState --> ShowGallery[Display Gallery View Again]
    UserInteraction -- D&D Action --> ExampleLogic[Execute Example-Specific Logic]
    ExampleLogic --> UpdateUI[Update UI State]
\`\`\`

## Unique Workflows

- **Dynamic Component Loading**: Examples are loaded on-demand using dynamic imports. The agent must:
  1. Identify the desired pattern in the gallery grid
  2. Click the example card to trigger \`activateApp(appId)\`
  3. Wait for the component to load and render
  4. Interact with the active example's D&D elements

- **Pattern Isolation**: Each of the 24 examples is a self-contained demo of a specific \`@vue-dnd-kit/core\` feature:
  - \`activation\`: Triggers on drag start, over, drop or leave events
  - \`animation\`: Smooth animations for draggable items and zones
  - \`autoscroll\`: Automatically scrolls list when dragging near edges
  - \`basedrop\`: Basic drag-and-drop with zone validation
  - \`changingoverlay\`: Dynamic overlay changes based on dragged element type
  - \`checkers\`: Classic checkers game with piece movement rules
  - \`chess\`: Full chess implementation with move validation
  - \`constraintarea\`: Drag items within defined boundary constraints
  - \`copy\`: Clone draggable item to drop zone instead of moving
  - \`customoverlay\`: Context-aware overlays showing related tasks or notes
  - \`disabled\`: Toggleable drag-and-drop zones and items
  - \`draggablezone\`: Nested zones with hierarchical item management
  - \`draghandle\`: Multi-handle dragging for grouped elements
  - \`groups\`: Group items together and move as a unit
  - \`groupvalidation\`: Validate group composition before allowing drop
  - \`keyboard\`: Full keyboard navigation for drag-and-drop
  - \`modifier\`: Shift/Ctrl modifiers enable multi-selection dragging
  - \`multiselection\`: Select and move multiple items simultaneously
  - \`overlaytransition\`: Smooth transitions between overlay states
  - \`promisedrop\`: Async drop operations with loading feedback
  - \`snapgrid\`: Snaps items to grid positions during drag
  - \`sortinglists\`: Sort items within list columns by dragging
  - \`swap\`: Exchange items between two zones with animation
  - \`tree\`: Nested tree structure with expand/collapse drag support

- **State Management**: The app uses reactive state (\`activeAppId\` and \`components\`) to manage which example is currently active. When deactivating, both are cleared to return to gallery view.

## Common Pitfalls & Warnings

- **Timing Issues**: Wait for the dynamic component to fully mount and stabilize before attempting to interact with draggable elements or drop zones. The component rendering may take a moment after clicking an example card.

- **Selector Ambiguity**: Many examples use similar class names for draggables (e.g., \`.chip\`, \`.dropzone\`, \`.item\`). Always prefer using unique IDs generated by \`useUniqueElementId()\` or specific data attributes provided in each example's source code.

- **Copy vs. Move Behavior**: Note that some examples (like \`Copy\`) use "copy" behavior where the source list remains unchanged, while others may simulate destructive moves. Check the description of each card before assuming behavior.

- **Dynamic Import Timing**: The dynamic import of Example.vue files is asynchronous. Agents should wait briefly after clicking a gallery card before attempting interactions within the active view.

- **useUniqueElementId() Usage**: All interactive elements use \`useUniqueElementId()\` for automation reliability. Generic selectors like \`.btn-close\` may not work; agents must use the generated unique IDs from tool responses.

## Success Indicators

- **Action: Launch App** -> **Success Indicator**: The app loads and displays a 4-column grid of example cards with titles and descriptions.
- **Action: Activate Example** -> **Success Indicator**: The gallery view is replaced by a specific example UI, the example content is visible in a focused container, and a "Close" button appears at the top right.
- **Action: Close Example** -> **Success Indicator**: The app returns to the main gallery grid view with all 24 example cards visible.
- **Action: Drag Item** -> **Success Indicator**: The dragged element shows visual feedback (ghost image, drop zone highlighting) and moves to the target position upon release.

## FAQs & Agent Guidance

This section provides specific guidance for the agent on how to interact with this app's UI using \`ui_automation_discover_elements\` and \`ui_automation_element_action\`.

### Common Requests

**Question: "Launch the Drag & Drop Examples app"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "app-list-container"\` (or \`lab-app-catalog-sidebar\` when workspace tabs are open).
    - Locate Launch via \`[data-appname="drag & drop examples"]\` or \`lab-catalog-sidebar-launch\`.
    - Use \`ui_automation_element_action\` to click that control.

**Question: "Show me how to implement a snapping grid"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "drag-drop-examples-app"\`.
    - Locate and click the card for "SnapGrid" (description mentions "Snaps items to grid positions during drag").
    - Once activated, use \`ui_automation_element_action\` to interact with the draggable chip element.
    - The chip will snap to a 40x40px or 80x40px grid depending on the selected tab.

**Question: "How do I see the sorting list example?"**
- **Answer:**
    - Find the "SortingLists" card in the gallery (description: "Sort items within list columns by dragging").
    - Click it to activate the view.
    - Use \`ui_automation_element_action\` to interact with the draggable items within the two vertical columns.
    - Drag items between columns or reorder within a column.

**Question: "Close the current example and go back"**
- **Answer:**
    - Locate the "Close" button in the top right of the active app view (unique ID generated by \`useUniqueElementId()\`).
    - Use \`ui_automation_element_action\` to click that button.
    - The gallery grid will reappear with all 24 examples.

**Question: "How do I use keyboard navigation in an example?"**
- **Answer:**
    - Activate the "Keyboard" example from the gallery.
    - Use \`ui_automation_element_action\` to discover and focus on a draggable item.
    - Press Tab to navigate between items, Space/Enter to drag, Arrow keys to move, Esc to cancel.

**Question: "Show me how multi-selection works"**
- **Answer:**
    - Activate the "MultiSelection" or "Modifier" example from the gallery.
    - Use \`ui_automation_element_action\` to click checkboxes or hold Ctrl while dragging items.
    - Multiple items will be selected and can be moved together.

**Question: "How do I test async drop operations?"**
- **Answer:**
    - Activate the "PromiseDrop" example from the gallery.
    - Drag an item from the "Start area" to the "Async confirm zone".
    - A browser \`confirm()\` dialog will appear; respond OK or Cancel to see different results.

**Question: "Show me the checkers game"**
- **Answer:**
    - Activate the "Checkers" example from the gallery (description: "Classic checkers game with piece movement rules").
    - Use \`ui_automation_element_action\` to interact with the checker pieces on the board.
    - Drag pieces to valid moves following standard checkers rules.

**Question: "Show me the chess implementation"**
- **Answer:**
    - Activate the "Chess" example from the gallery (description: "Full chess implementation with move validation").
    - Use \`ui_automation_element_action\` to interact with the chess pieces on the board.
    - Drag pieces to valid moves following standard chess rules.

**Question: "How do I test the changing overlay feature?"**
- **Answer:**
    - Activate the "ChangingOverlay" example from the gallery (description: "Dynamic overlay changes based on dragged element type").
    - Drag different reagents (H, O, Na, Cl) into the reaction zone.
    - Observe how the overlay changes based on the element being dragged.

**Question: "Show me the custom overlay with tasks and notes"**
- **Answer:**
    - Activate the "CustomOverlay" example from the gallery (description: "Context-aware overlays showing related tasks or notes").
    - Drag tasks or notes into the "Done" zone.
    - Observe how the overlay changes based on the item type being dragged.

**Question: "How do I test the tree structure drag support?"**
- **Answer:**
    - Activate the "Tree" example from the gallery (description: "Nested tree structure with expand/collapse drag support").
    - Use \`ui_automation_element_action\` to interact with the file tree nodes.
    - Drag items to reorder within a folder or nest into another folder.

**Question: "Show me the swap feature between teams"**
- **Answer:**
    - Activate the "Swap" example from the gallery (description: "Exchange items between two zones with animation").
    - Hover over a member in one team list.
    - Drag to swap positions with a member in the other team list.

**Question: "How do I test the constraint area feature?"**
- **Answer:**
    - Activate the "ConstraintArea" example from the gallery (description: "Drag items within defined boundary constraints").
    - Use \`ui_automation_element_action\` to interact with the draggable chips.
    - Observe how items are constrained within defined boundaries.

## Unique Class Names for Agent Identification

- \`drag-drop-examples-app\` - Root app container
- \`grid grid-cols-4 gap-4\` - Gallery grid layout
- \`bg-slate-700/75 border-slate-500 rounded-lg border p-5\` - Example card styling
- \`text-xl font-semibold text-slate-300 mb-2\` - Card title styling
- \`text-slate-400 text-sm mb-4\` - Card description styling
- \`bg-slate-700/75 border-slate-500 border rounded-lg shadow-lg p-6 flex items-start justify-center gap-6\` - Active app container
- \`h-full overflow-auto\` - Dynamic component container
- \`text-white hover:bg-slate-700 rounded-lg transition-colors px-3 py-2\` - Close button styling
- \`[unique-h1]\` - Header title (ID generated by useUniqueElementId)
- \`[unique-p]\` - Header description (ID generated by useUniqueElementId)
- \`[unique-h3]\` - Card title ID (generated per card)
- \`[unique-p-desc]\` - Card description ID (generated per card)
- \`[unique-btn-close]\` - Close button ID (generated by useUniqueElementId)

## Component Hierarchy Diagram

\`\`\`mermaid
flowchart TD
    drag-drop-examples-app["drag-drop-examples-app<br/>Root Container"] --> header["Header Section<br/>Title + Description"]
    drag-drop-examples-app --> gallery-view["Gallery View<br/>v-if='!activeAppId'"]
    drag-drop-examples-app --> active-view["Active App View<br/>v-else"]
    
    gallery-view --> grid-container["Grid Container<br/>grid grid-cols-4 gap-4"]
    grid-container --> example-card["Example Card<br/>bg-slate-700/75 rounded-lg"]
    
    active-view --> dynamic-container["Dynamic Component<br/>h-full overflow-auto"]
    active-view --> close-button["Close Button<br/>PrimeVue Button"]
    
    example-card --> card-title["Card Title<br/>text-xl font-semibold"]
    example-card --> card-desc["Card Description<br/>text-slate-400 text-sm"]
\`\`\``;
