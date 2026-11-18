/**
 * App system instructions (seeded into apps.app_system_instructions).
 */

export const aiTunesInstructions = `\`# App System Instructions: AI Tunes

## Overview
AI Tunes is an MP3 music player application that provides a grid-based interface for browsing and playing music files. It uses WebSockets to fetch metadata from a backend server and streams audio content directly to the client using WaveSurfer.js for visualization.

## Key UI Components & Layout

### Root Container Structure
The app uses a flex-based layout with scoped CSS classes:
\`\`\`html
<div class="ai-tunes-app app-loaded-container min-h-full h-full flex flex-col overflow-hidden">
  <header class="ai-tunes-header lab-app-header">
    <!-- Title, SortableHeader, SearchBar -->
  </header>
  <main class="lab-app-body">
    <div class="lab-app-landing">
      <!-- lab-app-kpi row: library, showing, playing, server -->
      <section class="ai-tunes-searchresults lab-app-panel">
        <!-- MP3Grid: flex-1 min-h-0 overflow-auto grid -->
      </section>
    </div>
  </main>
</div>
\`\`\`

### Component Breakdown

**1. Header Section (\`ai-tunes-header\`)**
- **Title**: Static text "AI Tunes" with class \`text-2xl font-semibold text-900 dark:text-100\`
- **SortableHeader Component** (line 78-98): Container div with class \`flex items-center gap-2 px-4 py-3 border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-950 focus:outline-none transition-colors rounded\`
  - Contains two PrimeVue Select components for sort field and direction
  - Uses \`useUniqueElementId()\` for unique IDs on select roots
- **SearchBar Component** (line 36-40): Container div with class \`mp3-song-search flex w-full gap-2\`
  - Contains PrimeVue InputText with class \`bg-slate-800 text-sm px-4 py-2 w-[250px]\`

**2. Main Content Area (\`ai-tunes-searchresults\`)**
- **MP3Grid Component**: Container \`mp3-song-container\` — \`flex-1 min-h-0\` grid with \`overflow-auto\` (fills app pane, no viewport calc)
  - Responsive grid layout (1 column mobile, 2 columns large screens)
  - Maximum height constraint with auto overflow

**3. MP3Card Component (line 76-129)**
Each card displays:
- **Outer Container**: \`mp3-song-item bg-slate-800 border-slate-500 p-3 border rounded-lg shadow-lg\`
- **Card Content Wrapper**: \`mp3-song-item-card flex flex-col gap-2 text-xs\`
  - **Header Row** (\`mp3-song-item-card-header flex justify-between\`):
    - Title badge: \`mp3-song-item-card-header-title px-3 py-0.5 rounded bg-slate-500 text-slate-200 text-sm\`
    - Album/Year badge: \`mp3-song-item-card-header-album px-3 py-0.5 rounded bg-mist-600 text-slate-300 text-sm\`
  - **Content Section** (\`mp3-song-item-card-content flex gap-2 items-center\`):
    - Info panel (175px height) with artist, bitrate, duration, track #, and file path
    - Media panel (\`mp3-song-item-card-content-media h-[175px] w-full flex-2 relative\`) containing WaveSurfer.js waveform

### SearchPattern Table for Agents for UI Automation Tool: 
- **Discovery**: Prefer \`contextArea\`: \`ai-tunes-app\`. Use \`app-list-container\` or \`lab-app-catalog-sidebar\` only to **launch**. Avoid \`app-loaded-container\` alone when multiple apps are open.
- **Actions**: \`ui_automation_element_action\` with selectors from discovery.

| Area | Class Name / ID | Purpose |
|------|-----------------|---------|
| Launch (dashboard) | \`app-list-container\` / \`lab-app-catalog-sidebar\` | \`[data-appname="ai tunes"]\` — grid or \`lab-catalog-sidebar-launch\` |
| App Root | \`ai-tunes-app\` | Main flex container for the entire app |
| Header | \`ai-tunes-header\` | Contains title, sort controls, and search bar |
| Search Results | \`ai-tunes-searchresults\` | Container for MP3 grid display |
| Grid Container | \`mp3-song-container\` | Responsive grid holding all MP3 cards |
| Individual Card | \`mp3-song-item\` | Each track's card component |
| Search Input | \`mp3-song-search\` | Search bar container with input field |

### Component Hierarchy Diagram
\`\`\`mermaid
flowchart TD
    ai-tunes-app["ai-tunes-app<br/>flex-col gap-1"] --> ai-tunes-header["ai-tunes-header<br/>flex items-start justify-between"]
    ai-tunes-app --> ai-tunes-searchresults["ai-tunes-searchresults"]
    
    ai-tunes-header --> title["AI Tunes Title<br/>text-2xl font-semibold"]
    ai-tunes-header --> sortable-header["SortableHeader Component<br/>flex items-center gap-2 rounded"]
    ai-tunes-header --> search-bar["SearchBar Component<br/>mp3-song-search flex w-full"]
    
    ai-tunes-searchresults --> mp3-grid["MP3Grid Component<br/>mp3-song-container<br/>grid grid-cols-1 lg:grid-cols-2"]
    
    mp3-grid --> mp3-card["MP3Card Component<br/>mp3-song-item<br/>bg-slate-800 rounded-lg"]
    
    mp3-card --> card-header["mp3-song-item-card-header<br/>flex justify-between"]
    mp3-card --> card-content["mp3-song-item-card-content<br/>flex gap-2 items-center"]
    
    card-content --> info-panel["Info Panel<br/>175px height<br/>artist, bitrate, duration, track, file"]
    card-content --> media-panel["Media Panel<br/>mp3-song-item-card-content-media<br/>WaveSurfer.js waveform"]
\`\`\`

### Unique Class Names for Agent Identification
- \`ai-tunes-app\` - Root app container
- \`ai-tunes-header\` - Header section with controls
- \`ai-tunes-searchresults\` - Grid results area
- \`mp3-song-container\` - Main grid layout
- \`mp3-song-item\` - Individual track card
- \`mp3-song-item-card\` - Card content wrapper
- \`mp3-song-item-card-header\` - Title/album header row
- \`mp3-song-item-card-content\` - Detailed info section
- \`mp3-song-search\` - Search bar container

## Visual Flowchart

### UI Flow
\`\`\`mermaid
flowchart TD
    Start[App Mounts] --> Connect[Establish WebSocket Connection]
    Connect --> DataReceived[Receive mp3_data via Socket]
    DataReceived --> PopulateGrid[Populate MP3Grid with Cards]
    PopulateGrid --> UserInteraction{User Action}
    UserInteraction -- Search --> FilterGrid[Filter Grid by Term - 500ms Debounce]
    UserInteraction -- Sort --> SortGrid[Reorder Grid based on Header Selection]
    UserInteraction -- Play --> StreamAudio[Stream Audio via WaveSurfer.js]
\`\`\`

### Back-end Flow
\`\`\`mermaid
flowchart TD
    Client[Client Browser] --> WS_Connect[WebSocket Connect to Server]
    WS_Connect --> GetList[Emit 'get_mp3_list']
    GetList --> DB_Query[Server Queries Database for MP3 Metadata]
    DB_Query --> SendData[Send 'mp3_data' to Client]
    SendData --> StreamReq[Client Requests /stream/file_path]
    StreamReq --> FileStream[Server Streams MP3 File]
\`\`\`

## Unique Workflows
- **Automatic Connection**: The app automatically attempts to connect to the WebSocket server on mount. If connection fails, a "WebSocket connection timeout" error is displayed.
- **Debounced Search**: Searching for tracks uses a 500ms debounce. Agents should wait briefly after inputting text before verifying results.
- **Waveform Streaming**: Audio playback is handled by WaveSurfer.js using a specific streaming URL format: \`serverUrl/stream/{file_path}\`.

## Common Pitfalls & Warnings
- **Timing Issues**: Do not attempt to interact with the grid or search until the WebSocket connection is established and \`mp3_data\` has been received.
- **Autoplay Restrictions**: Browsers may block audio from playing automatically. The agent might need to simulate a click on an \`MP3Card\` to initiate playback if it's blocked.
- **Selector Ambiguity**: Use specific attributes for cards, such as the title or file path, to identify target tracks in the grid.

## Success Indicators
- **Action: Load App** -> **Success Indicator**: The loading spinner disappears and \`MP3Grid\` displays at least one card.
- **Action: Search** -> **Success Indicator**: The number of visible cards in the grid updates to reflect the search query.
- **Action: Play Track** -> **Success Indicator**: The WaveSurfer waveform in the selected \`MP3Card\` shows progress or the media controls indicate "playing".

## FAQs & Agent Guidance

This section provides specific guidance for the agent on how to interact with this app's UI using \`ui_automation_discover_elements\` and \`ui_automation_element_action\`.

### Common Requests

**Question: "Launch the AI Tunes app"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "app-list-container"\` (or \`lab-app-catalog-sidebar\` when workspace tabs are open).
    - Locate Launch via \`[data-appname="ai tunes"]\` or \`lab-catalog-sidebar-launch\`.
    - Use \`ui_automation_element_action\` to click that control.

**Question: "Load and show all tracks"**
- **Answer:**
    - Wait for the app to mount and establish a WebSocket connection.
    - Verify that the loading state is false and \`mp3_data\` has been received.
    - Use \`ui_automation_discover_elements\` with \`contextArea: "ai-tunes-app"\`.
    - Locate the \`mp3-song-container\` element within the app-loaded container.

**Question: "Search for a specific song"**
- **Answer:** 
    - First, use \`ui_automation_discover_elements\` with \`contextArea: "ai-tunes-app"\`.
    - Locate the search bar with class \`mp3-song-search\`.
    - Use \`ui_automation_element_action\` to type the search term into the input field within the search bar.
    - Wait ~500ms for the debounce to complete before checking the grid results.

**Question: "Sort by artist"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "ai-tunes-app"\`.
    - Locate the SortableHeader component within \`ai-tunes-header\`.
    - Find the first Select element (sort field selector) and select "Artist" from the dropdown options.

**Question: "Change sort direction to descending"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "ai-tunes-app"\`.
    - Locate the SortableHeader component within \`ai-tunes-header\`.
    - Find the second Select element (sort direction selector) and select "Descending" from the dropdown options.`;
