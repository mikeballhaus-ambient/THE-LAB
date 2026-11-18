<script setup lang="ts">
import Dialog from 'primevue/dialog';
import { computed, ref, watch } from 'vue';
import '@/assets/styles/platform-catalog-app.css';
import AboutTopicBlock from './AboutTopicBlock.vue';

const props = withDefaults(defineProps<{
  visible: boolean,
  activeTopicTab?: string,
  handleAboutVisible: (visible: boolean) => void
}>(), { visible: false, activeTopicTab: 'Getting Started' })

const emit = defineEmits<{
  'update:activeTopicTab': [tab: string]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (newVal: boolean) => {
    props.handleAboutVisible(newVal)
  }
})

const activeTab = ref(props.activeTopicTab)

watch(
  () => props.activeTopicTab,
  (tab) => {
    if (tab && tab !== activeTab.value) {
      activeTab.value = tab;
    }
  },
);

watch(activeTab, (tab) => {
  if (tab !== props.activeTopicTab) {
    emit('update:activeTopicTab', tab);
  }
});

const tabs = [
  {
    label: 'Getting Started',
    icon: 'fa-rocket',
    description: 'Sign in, launch apps, chat with the Lab Assistant, and build together.',
  },
  {
    label: 'Navigation Guide',
    icon: 'fa-map-marked',
    description: 'Apps workspace, Lab Sidecar, quick nav, and Laboratory full-screen chat.',
  },
  {
    label: 'Chat Interface',
    icon: 'fa-terminal',
    description: 'Lab Sidecar vs Laboratory, personas, tools, slash commands, and attachments.',
  },
  {
    label: 'Session Management',
    icon: 'fa-layer-group',
    description: 'Local chat sessions, selection, and cleanup in Settings.',
  },
  {
    label: 'Settings Overview',
    icon: 'fa-cog',
    description: 'API providers, personas, MCP, context, and administration.',
  },
  {
    label: 'Themes & Look',
    icon: 'fa-palette',
    description: 'Platform-wide colors, 20 presets, live preview, and custom themes.',
  },
  {
    label: 'Apps & integrations',
    icon: 'fa-puzzle-piece',
    description: 'Platform vs catalog apps, integration bindings, Workflow Studio, and wiring forms and charts.',
  },
  {
    label: 'Games & Quarks',
    icon: 'fa-coins',
    description: 'Quarks play-money, wallet in quick nav, catalog games, and Play vs Lab Assistant on your configured LLM.',
  },
  {
    label: 'Messages & team chat',
    icon: 'fa-comments',
    description: 'Human direct messages, presence, and unread badges — separate from Laboratory and Sidecar.',
  },
  {
    label: 'Pro Tips',
    icon: 'fa-lightbulb',
    description: 'Developer mode and what each persona is best at.',
  },
]

const activeTabMeta = computed(() => tabs.find((tab) => tab.label === activeTab.value))
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    class="lab-settings-dialog about-dialog w-[min(1200px,92vw)]! h-[min(860px,90vh)]! max-h-[90vh]!"
    :pt="{
      mask: { class: 'settings-modal' },
      content: { class: 'flex! flex-col! flex-1! min-h-0! overflow-hidden!' },
      root: { class: 'flex! flex-col! max-h-[90vh]!' },
    }"
    :breakouts="{ disabled: true }"
  >
    <template #header>
      <h1 class="lab-settings-dialog__title m-0">
        <i class="fa-solid fa-flask lab-settings-dialog__title-icon rotate-4" aria-hidden="true" />
        About THE-LAB
      </h1>
    </template>

    <div class="settings-container lab-settings-shell about-shell lab-platform-catalog-app text-sm! text-lab-general-text">
      <nav class="lab-settings-nav" aria-label="About topics">
        <p class="lab-settings-nav__heading">Topics</p>
        <ul class="lab-settings-nav__list">
          <li v-for="tab in tabs" :key="tab.label">
            <button
              type="button"
              class="lab-settings-nav__btn"
              :class="{ 'lab-settings-nav__btn--active': activeTab === tab.label }"
              @click="activeTab = tab.label"
            >
              <i class="fa-solid shrink-0" :class="tab.icon" aria-hidden="true" />
              <span>{{ tab.label }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <div class="lab-settings-main">
        <header v-if="activeTabMeta" class="lab-settings-main__header">
          <h2 class="lab-settings-main__title">{{ activeTabMeta.label }}</h2>
          <p v-if="activeTabMeta.description" class="lab-settings-main__desc">
            {{ activeTabMeta.description }}
          </p>
        </header>

        <div class="lab-settings-main__body about-main__body">
          <section v-show="activeTab === tabs[0].label" class="about-section w-full">
            <div class="flex flex-col lg:flex-row gap-3 mb-5 about-intro-cards">
              <AboutTopicBlock
                class="flex-1 min-w-0"
                :nested="false"
                title="What is THE-LAB?"
                icon-class="fa-solid fa-microchip text-lab-button-outlined-text"
              >
                THE-LAB is an intelligent development environment powered by specialized AI personas that collaborate on
                tasks, leveraging multiple expert perspectives including strategic planning, technical implementation, and
                systematic troubleshooting to help you build software efficiently.
              </AboutTopicBlock>
              <AboutTopicBlock
                class="flex-1 min-w-0"
                :nested="false"
                title="THE-LAB Apps"
                icon-class="fa-solid fa-wand-magic-sparkles text-amber-400"
              >
                THE-LAB ships <strong>platform apps</strong> (CRM, Task List, Help Desk, Forms Builder, Workflow Studio,
                and more) plus a growing <strong>catalog</strong> of tagged apps on the apps home grid. Browser, hybrid,
                and server apps share one registry; hybrid/server apps use isolated processes and per-app databases where
                needed. Apps connect through <strong>integration manifests and bindings</strong> (forms and charts via
                Forms Builder and Chart Builder) instead of one-off hard-coded dialogs. The Lab Assistant can launch apps,
                wire integrations, and use UI automation on the screen you are viewing.
              </AboutTopicBlock>
              <AboutTopicBlock
                class="flex-1 min-w-0"
                :nested="false"
                title="Who is THE-LAB Assistant?"
                icon-class="fa-solid fa-users-gear text-emerald-400"
              >
                The <strong>Lab Assistant</strong> is your AI teammate—specialized personas with MCP tools that help you
                use and build THE-LAB Apps. On the <strong>apps workspace</strong>, open the <strong>Lab Assistant</strong>
                panel (top-right <strong>Lab Sidecar</strong>) to navigate catalogs, launch apps, and get in-context help
                while you work on screen. For heavy lifting—long plans, file attachments, full tool visibility, and
                repo-wide changes—team up in <strong>Laboratory</strong> (quick nav or the comment-dots beside
                THE-LAB). Same chat sessions and personas in both places; only the workspace and on-screen context differ.
              </AboutTopicBlock>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AboutTopicBlock title="Sign In" icon-class="fa fa-right-to-bracket text-blue-400">
                    Open <strong>Settings</strong> and use <strong>Login</strong> in the dialog header. Sign in with your
                    local password or enterprise SSO (Google, GitHub, or Microsoft Entra) when your admin has enabled
                    providers under <strong>Auth Providers</strong>. Most features require a signed-in user with the
                    right role (for example, <strong>member</strong> or above to launch apps).
                </AboutTopicBlock>
                <AboutTopicBlock title="Launch Apps" icon-class="fa fa-rocket text-emerald-400">
                    Click <strong>Launch</strong> on an app card. <strong>Browser</strong> apps mount in the dashboard;
                    <strong>hybrid</strong> and <strong>server</strong> apps also start an app backend (ports
                    4000–4999) with an isolated SQLite database when applicable. <strong>Viewer</strong> role cannot
                    launch apps.
                </AboutTopicBlock>
                <AboutTopicBlock title="Start Chat" icon-class="fa fa-comment-dots text-lab-button-outlined-text">
                    On the <strong>apps workspace</strong>, use the <strong>Lab Assistant</strong> chip (top-right
                    Sidecar) for quick, context-aware chat. For full focus — tool activity, files, and long sessions —
                    open <strong>Laboratory</strong> from quick nav or the comment-dots control next to THE-LAB.
                </AboutTopicBlock>
                <AboutTopicBlock title="Build Apps" icon-class="fa fa-code text-emerald-400">
                    Use the <strong>App Builder</strong> catalog app for a guided wizard, or ask the Lab Assistant in
                    <strong>Laboratory</strong> to scaffold and edit apps. New apps can publish the same integration
                    services and slots as first-party hosts so other apps and workflows can call them.
                </AboutTopicBlock>
                <AboutTopicBlock title="Work Together" icon-class="fa fa-users text-lab-button-outlined-text">
                    The Lab Assistant can interact directly with the UI to perform actions on your behalf. It has full
                    access to navigate menus, click buttons, fill forms, and complete complex tasks within any launched
                    application, making it a powerful companion for both using and customizing THE-LAB's features.
                </AboutTopicBlock>
              </div>
          </section>

          <section v-show="activeTab === tabs[1].label" class="about-section w-full">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <AboutTopicBlock title="Apps View" icon-class="fa fa-desktop text-purple-400">
                    <strong>Display:</strong> Apps home shows hero platform apps, <strong>catalog tags</strong>
                    (Productivity, Platform, games, and more), search, and pins.

                    <br><br>

                    <strong>Launch Apps:</strong> Open browser apps in-place or start hybrid/server backends as needed.
                    Dependent apps (for example Chart Builder when a host has chart bindings) can launch in order
                    automatically.

                    <br><br>

                    <strong>Focus Mode:</strong> Laboratory becomes blurred and pushed down, allowing you to
                    focus
                    on launching and managing applications without distraction.

                    <br><br>

                    <i class="fa fa-circle-info text-blue-400"></i> Use the <strong>Lab Assistant</strong> Sidecar
                    (top-right) while you stay on apps — scoped catalog or app context. Open <strong>Laboratory</strong>
                    when you need
                    tool logs, <code>@</code> files, or repo-wide work.
                </AboutTopicBlock>
                <AboutTopicBlock title="Laboratory" icon-class="fa fa-comment-dots text-lab-button-outlined-text">
                    <strong>Focus Chat:</strong> Toggle to focus the chat interface and interact with specialized AI
                    personas (Architect, Code, Debug, QA, etc.) that collaborate on tasks.

                    <br><br>

                    <strong>When to Use:</strong> Detailed planning, technical implementation guidance, systematic
                    troubleshooting, or building/customizing applications.

                    <br><br>

                    <strong>Switching:</strong> <strong>Laboratory</strong> in quick nav (or the title-bar comment
                    dots) focuses chat. Click the app/catalog area to return to the apps workspace. You can keep working in apps
                    with the Sidecar without entering full focus.

                    <br><br>

                    <i class="fa fa-info-circle text-lab-button-outlined-text"></i> <strong>Messages</strong> in quick nav
                    is team chat (humans only) — not Laboratory or Sidecar.
                </AboutTopicBlock>
                <AboutTopicBlock title="Settings" icon-class="fa fa-gear text-lab-general-text-muted">
                    <strong>User Management:</strong> Manage users with role-based permissions
                    (owner/admin/member/viewer).
                    Only owners can delete users.

                    <br><br>

                    <strong>Persona Configuration:</strong> Customize AI personas by assigning slash commands and
                    configuring capabilities, output format, and rules.

                    <br><br>

                    <strong>Session History:</strong> View, export, or delete chat session history. Sessions are tied to
                    personas and maintain conversation context.

                    <br><br>

                    <strong>System Preferences:</strong> Adjust AI provider settings (OpenAI/Ollama), context retention
                    thresholds, auto-summarization triggers, API key management, command definitions, and interface
                    preferences to tailor THE-LAB's behavior, security, and performance to your workflow needs.
                </AboutTopicBlock>
              </div>
          </section>

          <section v-show="activeTab === tabs[2].label" class="about-section w-full">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AboutTopicBlock title="Lab Sidecar" icon-class="fa fa-comment-dots text-lab-button-outlined-text">
                    On the apps workspace, expand <strong>Lab Assistant</strong> (top-right) for the same chat session with
                    view-scoped instructions — catalog, mounted app, or split tabs. The Sidecar shows user and assistant
                    messages only (no MCP tool chips). Ask it to launch apps via automation — it will retry until the app
                    appears or report a timeout (about 30 seconds).
                    Use <strong>Open Laboratory</strong> inside the panel when you need tool visibility or
                    attachments.
                </AboutTopicBlock>
                <AboutTopicBlock title="Persona Selector" icon-class="fa fa-user-tag text-purple-400">
                    Choose from available personas (Architect, Code, Debug, QA, etc.) in the dropdown. Switching
                    personas updates the Lab Assistant's available MCP tools to match that persona's capabilities and
                    expertise.
                </AboutTopicBlock>
                <AboutTopicBlock title="Slash Commands" icon-class="fa fa-bolt text-yellow-400">
                    Type <code class="bg-lab-general-bg px-1 py-0.5 rounded text-lab-button-outlined-text">/</code> to access slash commands.
                    Each
                    persona has custom commands for their capabilities.
                </AboutTopicBlock>
                <AboutTopicBlock title="@mention Files" icon-class="fa fa-file text-emerald-400">
                    In <strong>Laboratory</strong>, type
                    <code class="bg-lab-general-bg px-1 py-0.5 rounded text-lab-button-outlined-text">@</code> to browse
                    repository files and attach context. Use <strong>Open Laboratory</strong> from the Sidecar when you
                    need attachments or full tool visibility.
                </AboutTopicBlock>
                <AboutTopicBlock title="Summarize" icon-class="fa fa-list-check text-blue-400">
                    Click the Summarize button to condense conversation history. Useful for maintaining context in long
                    discussions.
                </AboutTopicBlock>
                <!-- Streaming Toggle -->
                <AboutTopicBlock title="Enable Streaming" icon-class="fa fa-tachometer-alt text-lab-button-outlined-text">
                    Toggle streaming to receive real-time responses as they're generated. Enables faster feedback and
                    reduces perceived latency during long conversations.
                </AboutTopicBlock>
                <!-- Voice Interaction -->
                <AboutTopicBlock title="Voice Interaction" icon-class="fa fa-microphone text-pink-400">
                    Click the microphone icon to speak directly to the Lab Assistant. Voice input is transcribed in
                    real-time,
                    allowing hands-free interaction with the AI.
                </AboutTopicBlock>
              </div>
          </section>

          <section v-show="activeTab === tabs[3].label" class="about-section w-full">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <AboutTopicBlock title="Multiple Chat Sessions" icon-class="fa fa-plus-circle text-lab-button-outlined-text">
                    <strong>Create Sessions:</strong> Start multiple independent chat sessions, each paired with a
                    different
                    persona.

                    <br><br>

                    <strong>Isolated Context:</strong> Every session preserves its own conversation history and context,
                    enabling parallel discussions on separate topics without cross-contamination of information or
                    ideas.
                </AboutTopicBlock>
                <AboutTopicBlock title="Switch Sessions" icon-class="fa fa-exchange-alt text-lab-button-outlined-text">
                    <strong>Navigate Conversations:</strong> In <strong>Laboratory</strong>, use session tabs at the
                    bottom of chat. In the <strong>Sidecar</strong>, switch sessions from tabs under the panel header
                    (same underlying sessions; create or delete sessions in Laboratory only).

                    <br><br>

                    <strong>Visual Identification:</strong> Each tab shows the active persona so you can run parallel
                    threads without mixing context.
                </AboutTopicBlock>
                <AboutTopicBlock title="Delete Sessions" icon-class="fa fa-trash-can text-red-400">
                    <strong>Clean Up History:</strong> Click the trash icon on any inactive session tab to permanently
                    delete it.

                    <br><br>

                    <strong>Active Protection:</strong> Active sessions are protected from deletion to prevent
                    accidental
                    loss of ongoing conversations. Use the Settings dialog to view, export, or manage your complete
                    session
                    history and configure retention policies.
                </AboutTopicBlock>
              </div>
          </section>

          <section v-show="activeTab === tabs[4].label" class="about-section w-full">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- Developer Mode -->
                <AboutTopicBlock title="Developer Mode" icon-class="fa fa-code text-emerald-400">
                    <strong>Toggle Response Style:</strong> Switch between Developer Mode (technical, detailed) and Non-Developer Mode (simple). Dynamically adapts AI responses to your expertise level.
                </AboutTopicBlock>
                <!-- User Management -->
                <AboutTopicBlock title="User Management" icon-class="fa fa-users text-blue-400">
                    <strong>User Roles:</strong> Manage users with role-based permissions (owner/admin/member/viewer). Configure team access and control administrative actions. Visible to admins who can manage users.
                </AboutTopicBlock>
                <AboutTopicBlock title="Auth Providers" icon-class="fa fa-shield-halved text-indigo-400">
                    <strong>SSO:</strong> Owners and admins configure Google, GitHub, and Microsoft Entra OIDC apps here
                    (client IDs, secrets, redirect URLs). End users sign in from Settings → Login — no per-machine `.env`
                    setup required for SSO.
                </AboutTopicBlock>
                <AboutTopicBlock title="Persona Configuration" icon-class="fa fa-user-tag text-purple-400">
                    <strong>Customize Personas:</strong> Assign slash commands and configure capabilities, output format, and rules. Create custom personas with unique system messages and MCP tools.
                </AboutTopicBlock>
                <AboutTopicBlock title="Session Management" icon-class="fa fa-history text-lab-button-outlined-text">
                    <strong>View History:</strong> Access chat session history organized by persona and timestamp. Export or delete conversations as needed.
                </AboutTopicBlock>
                <AboutTopicBlock title="Context Settings" icon-class="fa fa-sliders text-amber-400">
                    <strong>Token Thresholds:</strong> Configure context usage limits, auto-summarization triggers, and warning levels. Optimize AI context for efficiency.
                </AboutTopicBlock>
                <!-- API Management -->
                <AboutTopicBlock title="API Management" icon-class="fa fa-bolt text-yellow-400">
                    <strong>Provider Configuration:</strong> Set up LLM providers (OpenAI/Ollama) with API keys and model preferences. Configure temperature and generation parameters.
                </AboutTopicBlock>
                <AboutTopicBlock title="Command Management" icon-class="fa fa-terminal text-emerald-400">
                    <strong>Create Commands:</strong> Define custom slash commands with descriptions. Build specialized commands that trigger MCP tools through simple chat invocations.
                </AboutTopicBlock>
                <!-- MCP Servers -->
                <AboutTopicBlock title="MCP Servers" icon-class="fa fa-plug text-lab-button-outlined-text">
                    <strong>Configure External Tools:</strong> Add MCP servers to extend agents. Built-ins include
                    datetime, THE-LAB database, file/repo tools, <strong>lab integrations</strong> (manifests,
                    bindings, stubs), and <strong>workflow</strong> automation.<br />
                    <strong>Hint:</strong> Use Persona Configuration to assign tools to each persona.
                </AboutTopicBlock>
                <AboutTopicBlock title="Platform themes" icon-class="fa fa-palette text-lab-button-outlined-text">
                    <strong>Admin only:</strong> Settings → Administration → <strong>Themes</strong>. Pick dark or light,
                    choose from built-in presets, fine-tune chat and shell colors, then Save. See the
                    <strong>Themes &amp; Look</strong> topic here for details.
                </AboutTopicBlock>
              </div>
          </section>

          <section v-show="activeTab === tabs[5].label" class="about-section w-full">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AboutTopicBlock class="md:col-span-2" title="One theme for the whole lab" icon-class="fa fa-palette text-lab-button-outlined-text">
                    Colors apply to the app catalog, Laboratory (messages, tabs, composer), Settings, About, and every
                    launched app. Members and viewers see the saved theme but cannot edit it.
                </AboutTopicBlock>
                <AboutTopicBlock title="Presets" icon-class="fa fa-moon text-indigo-400">
                    <strong>10 dark + 10 light</strong> built-ins (Cloud Grey, Slate Indigo, Forest Emerald, Sky Daylight,
                    Paper Warm, and more). Defaults: Cloud Grey (dark) and Slate Lab (light).
                </AboutTopicBlock>
                <AboutTopicBlock title="Fine-tuning" icon-class="fa fa-sliders text-amber-400">
                    Adjust semantic groups (buttons, cards, chat bubbles, composer). Color fields use Tailwind palette
                    dropdowns; the platform stores resolved hex/rgb values.
                </AboutTopicBlock>
                <AboutTopicBlock title="Live draft" icon-class="fa fa-eye text-emerald-400">
                    Edits preview on the real UI immediately. An unsaved banner offers <strong>Save theme</strong> or
                    <strong>Discard</strong> until you persist changes for all users.
                </AboutTopicBlock>
                <AboutTopicBlock title="Custom themes" icon-class="fa fa-copy text-blue-400">
                    <strong>Duplicate to custom</strong> forks a preset you can rename and save separately. Built-in
                    presets cannot be deleted.
                </AboutTopicBlock>
              </div>
          </section>

          <section v-show="activeTab === tabs[6].label" class="about-section w-full">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AboutTopicBlock class="md:col-span-2" title="One integration model" icon-class="fa fa-puzzle-piece text-lab-button-outlined-text">
                    <strong>Host</strong> apps declare slots (create/edit dialogs, reports charts) in their registry
                    manifest. <strong>Bindings</strong> in the platform database point each slot at a form or chart in
                    <strong>Forms Builder</strong> or <strong>Chart Builder</strong>. At runtime, hosts render
                    <strong>LabIntegrationSurface</strong> — no copy-pasted form keys in every app. Platform apps and
                    catalog apps share this model (lab app integrations shipped across the portfolio); new apps you
                    create can participate as hosts or integration services.
                </AboutTopicBlock>
                <AboutTopicBlock title="Wire with the Lab Assistant" icon-class="fa fa-wand-magic-sparkles text-purple-400">
                    Ask in the <strong>Sidecar</strong> or <strong>Laboratory</strong> what is wired on an app, or to
                    bind create/edit forms and report charts. The assistant uses integration MCP tools to provision
                    stubs and update bindings; check readiness before expecting dialogs to work.
                </AboutTopicBlock>
                <AboutTopicBlock title="Workflow Studio" icon-class="fa fa-diagram-project text-indigo-400">
                    Automate on the <strong>domain event bus</strong>: triggers, conditions, branches, notifications,
                    team DMs, <strong>integration</strong> steps that call app connector APIs, and HTTP requests.
                    Open the Workflow Studio app to design graphs; demo workflows may be seeded on fresh installs.
                </AboutTopicBlock>
                <AboutTopicBlock title="CRM &amp; peers" icon-class="fa fa-building text-amber-400">
                    <strong>CRM</strong> ties records to Task List tasks, Help Desk tickets, platform
                    <strong>Approvals</strong>, <strong>Ledger</strong> entries, and dashboard charts — all via
                    integration slots, not embedded legacy dialogs.
                </AboutTopicBlock>
                <AboutTopicBlock title="Connectors on port 3000" icon-class="fa fa-server text-emerald-400">
                    Integration discovery and many platform services (approvals, ledger, events) live on the main lab
                    backend. Hybrid app servers warm up on backend start so connectors work without opening every app
                    in the UI first.
                </AboutTopicBlock>
              </div>
          </section>

          <section v-show="activeTab === 'Games & Quarks'" class="about-section w-full">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AboutTopicBlock class="md:col-span-2" title="Quarks — play money, not real currency" icon-class="fa fa-coins text-amber-400">
                    THE-LAB uses <strong>Quarks</strong> as platform play-money for games and lab participation. Balances
                    live on your signed-in user account in the main lab database — not cash, not withdrawable. New users
                    get an opening balance; a <strong>daily allotment</strong> credits on the first balance read each
                    UTC day (you may see a green toast when it lands). Overdraft is allowed for streaky game sessions.
                </AboutTopicBlock>
                <AboutTopicBlock title="Wallet in quick nav" icon-class="fa fa-wallet text-emerald-400">
                    After you sign in, <strong>Quarks</strong> and your balance appear in the top quick nav (next to
                    notifications). Click to open the wallet dialog: current balance, daily allotment policy, and recent
                    ledger lines. Many game apps also show a balance badge in the app header.
                </AboutTopicBlock>
                <AboutTopicBlock class="md:col-span-2" title="Play vs Lab Assistant" icon-class="fa fa-robot text-lab-button-outlined-text">
                    Turn-based catalog games offer <strong>Play vs Lab Assistant</strong> — you pick a difficulty
                    (<strong>easy</strong> through <strong>boss</strong>), and the opponent uses the same lab LLM
                    providers you configure in Settings (not a hidden chess engine or canned script). Chess, Checkers,
                    Connect Four, Battleship, Hangman, Texas Hold'em, Tic-Tac-Toe, Word Tile, and Blackjack (you plus a
                    Lab Assistant tablemate vs the house dealer) all use this flow. Prefer humans? Use
                    <strong>Invite a friend</strong> for head-to-head matches on the same titles.
                </AboutTopicBlock>
                <AboutTopicBlock title="Sidecar at the table" icon-class="fa fa-comment-dots text-lab-button-outlined-text">
                    While a vs–Lab Assistant match is running, open the top-right <strong>Lab Assistant</strong> Sidecar
                    on the apps workspace. It can react to big moments (captures, checks, match end) with short
                    commentary — separate from the move the model plays on the board. Tune auto-open and banter under
                    <strong>Settings → Games &amp; Sidecar</strong>.
                </AboutTopicBlock>
                <AboutTopicBlock title="Games &amp; settlements" icon-class="fa fa-dice text-purple-400">
                    Catalog apps under the <strong>games</strong> tag also include solitaire and other solo titles.
                    When a match or hand finishes, wins and losses adjust your Quark balance (toasts reflect gains and
                    losses after refresh). Turn-based titles share the same match and invite flow across the portfolio.
                </AboutTopicBlock>
                <AboutTopicBlock title="Lab activities" icon-class="fa fa-star text-yellow-400">
                    Signed-in participation in catalog apps can earn one-time Quark bonuses (wallet and ledger update on
                    the platform). Examples: submit a response in <strong>Polls &amp; Surveys</strong>, RSVP in
                    <strong>Event RSVP</strong>, pass a quiz in <strong>Training &amp; Quizzes</strong>, or post a new
                    idea in <strong>Suggestion Box</strong>. Repeat actions on the same poll, event, or quiz do not
                    double-credit; each new suggestion earns its own reward.
                </AboutTopicBlock>
                <AboutTopicBlock title="Fair play reminder" icon-class="fa fa-circle-info text-blue-400">
                    Quarks are for fun and experimentation inside THE-LAB. Do not treat them as financial instruments.
                    Admins tune policy constants on the platform; user-facing labels stay consistent lab-wide.
                </AboutTopicBlock>
              </div>
          </section>

          <section v-show="activeTab === tabs[8].label" class="about-section w-full">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AboutTopicBlock class="md:col-span-2" title="Not Laboratory or Sidecar" icon-class="fa fa-comments text-lab-button-outlined-text">
                    <strong>Messages</strong> (quick nav, <code>fa-comments</code>) is for <strong>person-to-person</strong>
                    chat on your THE-LAB instance. <strong>Laboratory</strong> (<code>fa-comment-dots</code>) is full-screen AI chat;
                    the Sidecar <strong>Lab Assistant</strong> chip is the in-app panel on the apps workspace.
                </AboutTopicBlock>
                <AboutTopicBlock title="Unread badges" icon-class="fa fa-bell text-amber-400">
                    Unread count appears on the <strong>Messages</strong> quick-nav item. Inside the dialog, other tabs
                    show per-partner counts; the <strong>active</strong> tab marks incoming messages read automatically.
                    Use <strong>×</strong> on a tab to close it without deleting history.
                </AboutTopicBlock>
                <AboutTopicBlock title="Presence" icon-class="fa fa-circle text-emerald-400">
                    <strong>Green</strong> = on Messages socket and active within 10 minutes.
                    <strong>Yellow</strong> = connected but idle 10+ minutes.
                    <strong>Red</strong> = not connected. Online teammates sort to the top of the user list.
                </AboutTopicBlock>
              </div>
          </section>

          <section v-show="activeTab === tabs[9].label" class="about-section w-full">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- Developer Mode -->
                <AboutTopicBlock title="Developer Mode" icon-class="fa fa-code text-emerald-400">
                    <strong>Toggle Response Style:</strong> Switch between Developer Mode (technical, detailed) and Non-Developer Mode (simple). Dynamically adapts AI responses to your expertise level.
                </AboutTopicBlock>
                <!-- Persona Specializations -->
                <!-- Chat -->
                <AboutTopicBlock title="Chat" icon-class="fa fa-comment-dots text-blue-400">
                    <strong>General Assistance:</strong> Your primary conversational interface and welcoming guide.
                    Provides navigation help, feature discovery, and answers general questions about the lab
                    environment.
                </AboutTopicBlock>
                <!-- Orchestrator -->
                <AboutTopicBlock title="Orchestrator" icon-class="fa fa-project-diagram text-indigo-400">
                    <strong>Task Coordination:</strong> Manages complex multi-step projects by breaking down tasks,
                    delegating to specialized personas, and coordinating work across the team for comprehensive
                    project
                    delivery.
                </AboutTopicBlock>
                <!-- Architect -->
                <AboutTopicBlock title="Architect" icon-class="fa fa-pencil-ruler text-purple-400">
                    <strong>System Design:</strong> Creates comprehensive technical specifications, designs scalable
                    system architecture, performs trade-off analysis, and produces architectural decision records
                    for
                    implementation teams.
                </AboutTopicBlock>
                <!-- Code -->
                <AboutTopicBlock title="Code" icon-class="fa fa-code text-green-400">
                    <strong>Implementation:</strong> Writes clean, idiomatic production-ready code with proper error
                    handling, performs refactoring, implements unit tests, and follows best practices for all major
                    frameworks.
                </AboutTopicBlock>
                <!-- Debug -->
                <AboutTopicBlock title="Debug" icon-class="fa fa-bug text-yellow-400">
                    <strong>Troubleshooting:</strong> Performs systematic root cause analysis, analyzes error logs
                    and
                    stack traces, reproduces issues through targeted testing, and provides clear actionable
                    solutions.
                </AboutTopicBlock>
                <!-- QA -->
                <AboutTopicBlock title="QA" icon-class="fa fa-shield-halved text-red-400">
                    <strong>Quality Assurance:</strong> Designs comprehensive testing strategies, identifies edge
                    cases
                    and requirements gaps, performs code reviews from a quality perspective, and validates outputs
                    against
                    specifications.
                </AboutTopicBlock>
              </div>
          </section>
        </div>
      </div>
    </div>
  </Dialog>
</template>