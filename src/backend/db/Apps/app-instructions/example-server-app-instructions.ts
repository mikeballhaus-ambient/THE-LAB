/**
 * App system instructions (seeded into apps.app_system_instructions).
 */

export const exampleServerInstructions = `\`# App System Instructions: Example Server App

## Overview

Example Server App is a hybrid Vue 3 application designed to demonstrate and test interactions with a Fastify-based backend server running on port 3001. It provides a simple interface for fetching mock data from the server, monitoring server health metrics (uptime, connections, requests/min), resetting server state, and clearing local response data. The app uses Socket.IO for WebSocket communication and HTTP fetch for REST API calls to verify that frontend components can correctly consume and display real-time data from a stable backend service.

## Key UI Components & Layout

### Root Container Structure
\`\`\`html
<div class="example-server-app app-loaded-container min-h-full h-full flex flex-col overflow-hidden">
  <header class="lab-app-header">...</header>
  <main class="lab-app-body">
  <div class="lab-app-landing">
  <section class="lab-app-panel">
    <!-- Description Text -->
    <div class="mb-6">...</div>

    <!-- Action Buttons Row -->
    <div class="flex flex-wrap gap-3 mb-6">
      <!-- btn-fetch, btn-reset, btn-health, btn-clear buttons -->
    </div>

    <!-- Health Check Card (conditional) -->
    <div v-if="health" class="mt-6">...</div>

    <!-- Response Data Card (conditional) -->
    <div v-if="data" class="mt-6">...</div>

    <!-- Footer Info -->
    <div class="flex items-center justify-between text-sm ...">...</div>
  </div>
</div>
\`\`\`

### Component Breakdown

**1. App Root Container (\`.example-server-app\`)**
- **Purpose**: Main wrapper for the entire Example Server App component
- **Key Elements**: Title, description, main content card container, action buttons, conditional data cards, footer info bar

**2. Title Section (\`h1\` with unique ID)**
- **Purpose**: Displays the app title "Example Server App"
- **Key Elements**: Generated unique ID via \`useUniqueElementId()\` for UI automation
- **Classes**: \`text-2xl font-semibold mb-3\`

**3. Description Paragraph (\`p\`)**
- **Purpose**: Provides brief description of the app's purpose
- **Classes**: \`mb-3\`

**4. Main Content Card Container (\`.p-6 bg-slate-700 rounded-lg min-h-[calc(100vh-250px)]!\`)**
- **Purpose**: Central dashboard area containing all interactive elements and data displays
- **Key Elements**: Description text, action buttons, health card, data card, footer

**5. Action Buttons Row (\`.flex flex-wrap gap-3 mb-6\`)**
- **Purpose**: Contains four primary action buttons for server interaction
- **Key Elements**:
  - **Get Mock Data Button** (\`btn-fetch\`): Fetches mock data from \`/data\` endpoint
  - **Reset Data Button** (\`btn-reset\`): Resets server state via \`/data/update\` endpoint
  - **Check Health Button** (\`btn-health\`): Checks server health via \`/health\` endpoint
  - **Clear Response Button** (\`btn-clear\`): Clears local data and health state

**6. Health Check Card (\`.card-health\`)**
- **Purpose**: Displays server health metrics when health check is successful
- **Key Elements**:
  - Header with heartbeat icon and "Health Check" title
  - Badge showing "Status: OK" (\`badge-health\`)
  - List of metrics (\`health-list\`): Server Status, Uptime, Connections, Requests/min
- **Conditional**: Only visible when \`health\` data is populated

**7. Response Data Card (\`.card-data\`)**
- **Purpose**: Displays raw JSON response data from server endpoints
- **Key Elements**:
  - Header with database icon and "Response Data" title
  - Badge showing "JSON" (\`badge-data\`)
  - Pre-formatted JSON content (\`pre-data\`)
- **Conditional**: Only visible when \`data\` is populated

**8. Footer Info Bar**
- **Purpose**: Displays server URL information
- **Classes**: \`flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4\`

### SearchPattern Table for Agents for UI Automation Tool: 
- **Discovery**: Prefer \`contextArea\`: \`example-server-app\`. Use \`app-list-container\` or \`lab-app-catalog-sidebar\` only to **launch**. Avoid \`app-loaded-container\` alone when multiple apps are open.
- **Actions**: \`ui_automation_element_action\` with selectors from discovery (prefer \`btn-fetch\`, \`btn-reset\`, etc.).

| Area | Class Name / ID | Purpose |
|------|-----------------|---------|
| Launch (dashboard) | \`app-list-container\` / \`lab-app-catalog-sidebar\` | \`[data-appname="example server"]\` — grid or \`lab-catalog-sidebar-launch\` |
| App Root | \`example-server-app\` | Main wrapper container for the entire app |
| Main Content Card | \`.p-6 bg-slate-700 rounded-lg\` | Central dashboard containing all interactive elements |
| Get Mock Data Button | \`btn-fetch\` | Triggers data fetch from \`/data\` endpoint |
| Reset Data Button | \`btn-reset\` | Resets server state via \`/data/update\` |
| Check Health Button | \`btn-health\` | Checks server health via \`/health\` |
| Clear Response Button | \`btn-clear\` | Clears local data and health state |
| Health Card | \`card-health\` | Displays server health metrics |
| Health Badge | \`badge-health\` | Shows "Status: OK" indicator |
| Health List | \`health-list\` | Lists uptime, connections, requests/min metrics |
| Data Card | \`card-data\` | Displays raw JSON response data |
| Pre-formatted Data | \`pre-data\` | Contains the JSON string output |

## Visual Flowchart

### UI Flow
\`\`\`mermaid
flowchart TD
    Start[App Mounts] --> Connect[Establish Socket.IO Connection]
    Connect --> Ready[Ready for Interaction]
    Ready --> Action{User Action}
    Action -- Get Mock Data --> Fetch[Click btn-fetch Button]
    Fetch --> Loading1[Loading State: true]
    Loading1 --> FetchData[HTTP GET /data]
    FetchData --> DisplayData[Show Response Data Card with JSON]
    FetchData --> Toast1[Show Success Toast]

    Action -- Reset Data --> Reset[Click btn-reset Button]
    Reset --> Loading2[Loading State: true]
    Loading2 --> ResetServer[HTTP GET /data/update]
    ResetServer --> UpdateData[Update Response Data Card]
    ResetServer --> Toast2[Show Success Toast]

    Action -- Check Health --> Health[Click btn-health Button]
    Health --> Loading3[Loading State: true]
    Loading3 --> GetHealth[HTTP GET /health]
    GetHealth --> DisplayHealth[Show Health Check Card with Metrics]
    GetHealth --> Toast3[Show Success Toast]

    Action -- Clear Response --> Clear[Click btn-clear Button]
    Clear --> HideCards[Hide Both Cards]
    Clear --> Toast4[Show Warn Toast]
\`\`\`

### Back-end Flow
\`\`\`mermaid
flowchart TD
    Client[Browser App] --> HTTP[HTTP Request to Fastify Server]
    HTTP --> Route{Route Match}
    Route -- /data --> GetData[Retrieve Mock Data from State]
    Route -- /data/update --> UpdateData[Reset Mock Data State]
    Route -- /health --> GetHealth[Collect Server Metrics]

    GetData --> JSONResponse[JSON Response Body]
    UpdateData --> JSONResponse
    GetHealth --> HealthMetrics[JSON with uptime, connections, requests/min]

    JSONResponse --> Client
    HealthMetrics --> Client

    subgraph Database
        MockDataState[In-Memory Mock Data Store]
        MetricsState[Server Runtime Metrics]
    end

    GetData -.-> MockDataState
    UpdateData -.-> MockDataState
    GetHealth -.-> MetricsState
\`\`\`

## Unique Workflows

- **Stateful Interaction**: The "Reset Data" action modifies the server's in-memory state. Subsequent "Get Mock Data" calls will return the reset data, demonstrating state persistence across requests.
- **Conditional Visibility**: Both the Health Check and Response Data cards are conditionally rendered using \`v-if\` directives. Cards only appear when their respective data objects (\`health\` or \`data\`) are populated with non-null values.
- **Loading State Management**: All async operations set a shared \`loading\` ref to \`true\`, which disables all action buttons until the operation completes. This prevents concurrent requests and provides visual feedback.
- **Toast Notification Pattern**: Every action triggers a PrimeVue toast notification with severity levels (success, warn) to provide immediate user feedback on action outcomes.

## Common Pitfalls & Warnings

- **Timing Issues**: The agent must wait for the \`loading\` state to complete (indicated by buttons becoming enabled again) before verifying if the data was successfully displayed in the cards or checking for toast notifications.
- **Server Connectivity**: Ensure the backend server is running at the specified URL (defaulting to port 3001). If any action fails, verify the backend service status and that the \`serverUrl\` prop is correctly configured.
- **Selector Ambiguity**: Use specific IDs generated by \`useUniqueElementId()\` for interacting with elements. \`ui_automation_element_action\` should target buttons via their unique IDs (\`btn-fetch\`, \`btn-reset\`, \`btn-health\`, \`btn-clear\`) rather than relying on text labels.
- **Conditional Rendering**: Do not attempt to interact with Health Check or Response Data cards if they are not visible in the DOM (i.e., when \`health\` or \`data\` is null). First verify the card exists before attempting actions within it.
- **Shared Loading State**: All four action buttons share the same \`loading\` ref. When one action is in progress, all buttons are disabled. Agents should check the loading state before initiating new actions.

## Success Indicators

- **Action: Get Mock Data** -> **Success Indicator**: A success toast appears with message "Data Fetched", and the "Response Data" card becomes visible containing formatted JSON in the \`pre-data\` element.
- **Action: Reset Data** -> **Success Indicator**: A success toast appears with message "Data Reset", and the "Response Data" card updates its content to reflect the reset state.
- **Action: Check Health** -> **Success Indicator**: A success toast appears with message "Health Check Passed", and the "Health Check" card becomes visible showing a green "Status: OK" badge (\`badge-health\`) along with server metrics in the \`health-list\`.
- **Action: Clear Response** -> **Success Indicator**: A warn toast appears with message "Cleared", and both the "Health Check" and "Response Data" cards are removed from the UI (hidden via \`v-if\` condition).

## FAQs & Agent Guidance

This section provides specific guidance for the agent on how to interact with this app's UI using \`ui_automation_discover_elements\` and \`ui_automation_element_action\`.

### Common Requests

**Question: "Launch the Example Server App"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "app-list-container"\` (or \`lab-app-catalog-sidebar\` when workspace tabs are open).
    - Locate Launch via \`[data-appname="example server"]\` or \`lab-catalog-sidebar-launch\`.
    - Use \`ui_automation_element_action\` to click that control.

**Question: "Fetch mock data from the server"**
- **Answer:**
    - First, use \`ui_automation_discover_elements\` with \`contextArea: "example-server-app"\`.
    - Locate the "Get Mock Data" button using its unique ID (\`btn-fetch\`).
    - Use \`ui_automation_element_action\` to click the button.
    - Wait for the loading state to finish (button becomes enabled again).
    - Verify that the "Response Data" card is visible and contains JSON content in the \`pre-data\` element.

**Question: "Check the server's health status"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "example-server-app"\`.
    - Locate the "Check Health" button using its unique ID (\`btn-health\`).
    - Use \`ui_automation_element_action\` to click the button.
    - Wait for the loading state to finish.
    - Verify that the "Health Check" card is visible and contains a green "Status: OK" badge with server metrics listed below.

**Question: "Reset the server data"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "example-server-app"\`.
    - Locate the "Reset Data" button using its unique ID (\`btn-reset\`).
    - Use \`ui_automation_element_action\` to click the button.
    - Wait for the loading state to finish.
    - Verify that a success toast appears and the data in the "Response Data" card is updated.

**Question: "Clear all response data"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "example-server-app"\`.
    - Locate the "Clear Response" button using its unique ID (\`btn-clear\`).
    - Use \`ui_automation_element_action\` to click the button.
    - Verify that both the "Health Check" and "Response Data" cards are removed from the UI.

**Question: "Verify server URL configuration"**
- **Answer:**
    - Use \`ui_automation_discover_elements\` with \`contextArea: "example-server-app"\`.
    - Locate the footer info bar which displays "Server: \${process.env.VITE_API_BASE_URL}:3001" or the configured \`serverUrl\`.
    - Verify the URL matches the expected backend server address.

## Unique Class Names for Agent Identification

- \`example-server-app\` - Root app container wrapper
- \`text-2xl font-semibold mb-3\` - Title styling class
- \`.p-6 bg-slate-700 rounded-lg min-h-[calc(100vh-250px)]!\` - Main content card container
- \`flex flex-wrap gap-3 mb-6\` - Action buttons row container
- \`btn-fetch\` - Unique ID for Get Mock Data button
- \`btn-reset\` - Unique ID for Reset Data button
- \`btn-health\` - Unique ID for Check Health button
- \`btn-clear\` - Unique ID for Clear Response button
- \`card-health\` - Unique ID for Health Check card root
- \`badge-health\` - Unique ID for Status: OK badge
- \`health-list\` - Unique ID for health metrics list
- \`card-data\` - Unique ID for Response Data card root
- \`pre-data\` - Unique ID for JSON content pre-formatted element
- \`badge-data\` - Unique ID for JSON badge in data card

## Component Hierarchy Diagram

\`\`\`mermaid
flowchart TD
    example-server-app["example-server-app<br/>Root Container"] --> title["h1 Title<br/>text-2xl font-semibold"]
    example-server-app --> description["p Description<br/>mb-3"]
    example-server-app --> main-card["Main Content Card<br/>.p-6 bg-slate-700 rounded-lg"]

    main-card --> desc-text["Description Text<br/>mb-6"]
    main-card --> buttons-row["Buttons Row<br/>flex flex-wrap gap-3"]
    main-card --> health-card["Health Check Card<br/>v-if=health"]
    main-card --> data-card["Response Data Card<br/>v-if=data"]
    main-card --> footer["Footer Info Bar<br/>border-t border-gray-200"]

    buttons-row --> btn-fetch["Get Mock Data<br/>btn-fetch"]
    buttons-row --> btn-reset["Reset Data<br/>btn-reset"]
    buttons-row --> btn-health["Check Health<br/>btn-health"]
    buttons-row --> btn-clear["Clear Response<br/>btn-clear"]

    health-card --> card-header["Card Header<br/>Health Check Title"]
    health-card --> health-badge["Status: OK Badge<br/>badge-health"]
    health-card --> health-list["Metrics List<br/>health-list"]

    data-card --> data-header["Card Header<br/>Response Data Title"]
    data-card --> json-content["JSON Pre-formatted<br/>pre-data"]
\`\`\``;
