/** Curated Font Awesome class names (registry `faIcon` style: `fa-*`). */
export interface LabAppIconOption {
  id: string;
  label: string;
  keywords: string;
}

export const LAB_APP_ICON_CATALOG: LabAppIconOption[] = [
  { id: 'fa-hammer', label: 'Hammer', keywords: 'build tool construct' },
  { id: 'fa-wrench', label: 'Wrench', keywords: 'tool settings fix' },
  { id: 'fa-screwdriver-wrench', label: 'Tools', keywords: 'build repair' },
  { id: 'fa-cube', label: 'Cube', keywords: 'app package block' },
  { id: 'fa-cubes', label: 'Cubes', keywords: 'modules stack' },
  { id: 'fa-box', label: 'Box', keywords: 'package product' },
  { id: 'fa-briefcase', label: 'Briefcase', keywords: 'business work office' },
  { id: 'fa-building', label: 'Building', keywords: 'company crm office' },
  { id: 'fa-city', label: 'City', keywords: 'enterprise urban' },
  { id: 'fa-chart-line', label: 'Chart line', keywords: 'analytics growth finance' },
  { id: 'fa-chart-pie', label: 'Chart pie', keywords: 'analytics report' },
  { id: 'fa-chart-bar', label: 'Chart bar', keywords: 'metrics dashboard' },
  { id: 'fa-book', label: 'Book', keywords: 'ledger finance read' },
  { id: 'fa-clipboard-check', label: 'Clipboard check', keywords: 'approvals tasks' },
  { id: 'fa-list-check', label: 'List check', keywords: 'tasks todo' },
  { id: 'fa-calendar', label: 'Calendar', keywords: 'schedule events' },
  { id: 'fa-clock', label: 'Clock', keywords: 'time schedule' },
  { id: 'fa-bell', label: 'Bell', keywords: 'notifications alerts' },
  { id: 'fa-envelope', label: 'Envelope', keywords: 'mail message' },
  { id: 'fa-comments', label: 'Comments', keywords: 'chat support' },
  { id: 'fa-life-ring', label: 'Life ring', keywords: 'help support desk' },
  { id: 'fa-headset', label: 'Headset', keywords: 'support call center' },
  { id: 'fa-users', label: 'Users', keywords: 'team people hr' },
  { id: 'fa-user', label: 'User', keywords: 'person profile' },
  { id: 'fa-user-group', label: 'User group', keywords: 'team community' },
  { id: 'fa-handshake', label: 'Handshake', keywords: 'sales deal partner' },
  { id: 'fa-cart-shopping', label: 'Shopping cart', keywords: 'commerce retail' },
  { id: 'fa-store', label: 'Store', keywords: 'shop retail' },
  { id: 'fa-credit-card', label: 'Credit card', keywords: 'payments billing' },
  { id: 'fa-wallet', label: 'Wallet', keywords: 'money finance' },
  { id: 'fa-file-invoice-dollar', label: 'Invoice', keywords: 'billing accounting' },
  { id: 'fa-database', label: 'Database', keywords: 'data storage sql' },
  { id: 'fa-server', label: 'Server', keywords: 'backend api hybrid' },
  { id: 'fa-cloud', label: 'Cloud', keywords: 'saas online' },
  { id: 'fa-laptop-code', label: 'Laptop code', keywords: 'developer software' },
  { id: 'fa-code', label: 'Code', keywords: 'developer programming' },
  { id: 'fa-diagram-project', label: 'Diagram', keywords: 'workflow project' },
  { id: 'fa-sitemap', label: 'Sitemap', keywords: 'structure org' },
  { id: 'fa-pen-fancy', label: 'Pen', keywords: 'forms write design' },
  { id: 'fa-palette', label: 'Palette', keywords: 'design creative theme' },
  { id: 'fa-image', label: 'Image', keywords: 'media gallery photo' },
  { id: 'fa-camera', label: 'Camera', keywords: 'photo media' },
  { id: 'fa-music', label: 'Music', keywords: 'audio player' },
  { id: 'fa-gamepad', label: 'Gamepad', keywords: 'games fun' },
  { id: 'fa-dice', label: 'Dice', keywords: 'games random' },
  { id: 'fa-graduation-cap', label: 'Graduation', keywords: 'education training' },
  { id: 'fa-lightbulb', label: 'Lightbulb', keywords: 'ideas innovation' },
  { id: 'fa-rocket', label: 'Rocket', keywords: 'launch startup fast' },
  { id: 'fa-flag', label: 'Flag', keywords: 'milestone goal' },
  { id: 'fa-map', label: 'Map', keywords: 'location logistics' },
  { id: 'fa-truck', label: 'Truck', keywords: 'shipping logistics' },
  { id: 'fa-warehouse', label: 'Warehouse', keywords: 'inventory stock' },
  { id: 'fa-industry', label: 'Industry', keywords: 'manufacturing plant' },
  { id: 'fa-hospital', label: 'Hospital', keywords: 'health medical' },
  { id: 'fa-heart-pulse', label: 'Heart pulse', keywords: 'health wellness' },
  { id: 'fa-shield-halved', label: 'Shield', keywords: 'security safety' },
  { id: 'fa-lock', label: 'Lock', keywords: 'security privacy' },
  { id: 'fa-key', label: 'Key', keywords: 'access auth' },
  { id: 'fa-globe', label: 'Globe', keywords: 'web world browser' },
  { id: 'fa-wifi', label: 'Wifi', keywords: 'network connect' },
  { id: 'fa-mobile-screen', label: 'Mobile', keywords: 'phone app' },
  { id: 'fa-tablet-screen', label: 'Tablet', keywords: 'device' },
  { id: 'fa-th-large', label: 'Grid', keywords: 'gallery tiles dashboard' },
  { id: 'fa-table-cells', label: 'Table cells', keywords: 'grid spreadsheet' },
  { id: 'fa-folder', label: 'Folder', keywords: 'files documents' },
  { id: 'fa-file-lines', label: 'Document', keywords: 'report doc' },
  { id: 'fa-magnifying-glass', label: 'Search', keywords: 'find lookup' },
  { id: 'fa-filter', label: 'Filter', keywords: 'sort refine' },
  { id: 'fa-tags', label: 'Tags', keywords: 'labels catalog' },
  { id: 'fa-star', label: 'Star', keywords: 'favorite featured' },
  { id: 'fa-heart', label: 'Heart', keywords: 'favorite like' },
  { id: 'fa-leaf', label: 'Leaf', keywords: 'green eco' },
  { id: 'fa-sun', label: 'Sun', keywords: 'weather bright' },
  { id: 'fa-moon', label: 'Moon', keywords: 'night dark' },
];

/** Registry-style `faIcon` id (e.g. `fa-hammer`). Does not guarantee the glyph exists in the loaded FA set. */
export function isLabAppFaIconId(value: string): boolean {
  const v = value.trim();
  return /^fa-[a-z0-9-]+$/i.test(v);
}

export function searchLabAppIcons(query: string, limit = 48): LabAppIconOption[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return LAB_APP_ICON_CATALOG.slice(0, limit);
  }
  const scored = LAB_APP_ICON_CATALOG.map((icon) => {
    const hay = `${icon.id} ${icon.label} ${icon.keywords}`.toLowerCase();
    const idx = hay.indexOf(q);
    const score = idx === -1 ? 0 : 100 - idx + (icon.label.toLowerCase().startsWith(q) ? 50 : 0);
    return { icon, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((row) => row.icon);
}
