# App System Instructions: [App Name]

## Overview
[Provide an executive summary of the app and its purpose here. Describe what the app does, who it is for, and the primary value it provides.]

## Key UI Components & Layout

### Root Container Structure
[Show the actual HTML structure with class names if available. Example:]
```html
<div class="[root-class-name]">
  <!-- Header Section -->
  <div class="[header-class-name]">...</div>
  <!-- Main Content Section -->
  <div class="[main-content-class-name]">...</div>
</div>
```

### Component Breakdown
[Detail each major component with exact class names and purposes.]

**1. [Component Name]** (`[class-name]`)
- **Purpose**: [What this component does]
- **Key Elements**: [List important child elements or sub-components]

**2. [Component Name]** (`[class-name]`)
- **Purpose**: [What this component does]
- **Key Elements**: [List important child elements or sub-components]

### SearchPattern Table for Agents for UI Automation Tool: 
- **Discovery:** `ui_automation_discover_elements` with `contextArea` (prefer this app's root class, e.g. `[app-root-class]`). For **launch from Lab catalog** only: `app-list-container` + `searchPattern` / `data-appname` on Launch buttons.
- **Actions:** `ui_automation_element_action` with `target` selectors from discovery (prefer `id` or `data-*` from the tool response).
- Inside a mounted app, avoid bare `app-loaded-container` when multiple apps are visible — scope to the app root class.

| Area | Class Name / ID | Purpose |
|------|-----------------|---------|
| App Root | `[root-class]` | [Description] |
| Header | `[header-class]` | [Description] |
| Main Content | `[main-class]` | [Description] |
| [Other Areas] | `[class/id]` | [Description] |

## Visual Flowchart

### UI Flow
```mermaid
flowchart TD
    %% Describe how views and elements interact
    %% Demonstrate how actionable elements trigger API calls or state changes
    [View A] --> [Action 1]
    [Action 1] --> [API Call / State Change]
    [API Call / State Change] --> [View B]
```

### Back-end Flow
```mermaid
flowchart TD
    %% Demonstrate how the server code functions to support the UI
    [Client Request] --> [Server Endpoint]
    [Server Endpoint] --> [Business Logic]
    [Business Logic] --> [Database Query]

    %% Key Database Tables & Columns
    subgraph Database
        [Table Name 1]
        [Table Name 2]
    end
```

## Unique Workflows
[Describe any multi-step processes or complex sequences unique to this app. For example, a specific sequence of clicks and inputs required to complete a complex task like "Onboarding a new user" or "Generating a monthly report".]

## Common Pitfalls & Warnings
[List common mistakes agents might make when interacting with this UI. Examples include:]
- **Timing Issues**: "Wait for the loading spinner to disappear before attempting to click [Element]."
- **State Dependencies**: "Do not attempt to [Action B] until [Action A] has successfully completed and updated the UI."
- **Selector Ambiguity**: "Avoid using generic labels; prefer specific data attributes like `data-testid` or unique IDs where available."
- **Permissions**: "Note that certain actions are only available for users with [Role Name] permissions."

## Success Indicators
[Define how the agent can verify that an action was successful.]
- **Action: [e.g., Create Task]** -> **Success Indicator**: [e.g., A toast notification appears saying 'Task Created' or the new item appears at the top of the list.]
- **Action: [e.g., Save Profile]** -> **Success Indicator**: [e.g., The page redirects to /profile/success.]

## FAQs & Agent Guidance

This section provides specific guidance for the agent on how to interact with this app's UI using `ui_automation_discover_elements` and `ui_automation_element_action`.

### Common Requests

**Question: "[Example Question, e.g., Launch the app]"**
- **Answer:** 
    - `ui_automation_discover_elements` with `contextArea: [contextAreaID]`.
    - Locate the element with [attribute/label, e.g., `data-appname="App Display Name"` on catalog Launch].
    - `ui_automation_element_action` to click/fill as needed.

**Question: "[Example Question, e.g., Create a new item]"**
- **Answer:** 
    - `ui_automation_discover_elements` with `contextArea: [contextAreaID]`.
    - Locate the element with [attribute/label].
    - `ui_automation_element_action` for click/input.
    - [Describe subsequent steps, e.g., "The modal form will then open; discover form fields with `contextArea: [modalContextArea]`."]

**Question: "[Example Question]"**
- **Answer:**
    - [Step-by-step instructions for the agent]

## Unique Class Names for Agent Identification
[List all unique scoped CSS class names that agents can use to identify and interact with UI elements.]
- `[class-name-1]` - [Purpose/Location]
- `[class-name-2]` - [Purpose/Location]
- `[class-name-3]` - [Purpose/Location]

## Component Hierarchy Diagram
[Optional: Include a Mermaid flowchart showing the component hierarchy for complex apps.]
```mermaid
flowchart TD
    [Root Component] --> [Child Component 1]
    [Root Component] --> [Child Component 2]
    [Child Component 1] --> [Grandchild Component]
```
