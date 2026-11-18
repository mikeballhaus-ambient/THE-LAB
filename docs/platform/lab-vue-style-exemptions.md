# Vue scoped CSS — simulation / geometry exemptions

Files listed here may keep scoped CSS for **game board, canvas, 3D, map tiles, or physics** geometry (established during rm-67; closeout in [docs/archive/programmes/rm-67/](../archive/programmes/rm-67/EXECUTOR-CLOSEOUT.md)). **Chrome** around those surfaces (lobby, aside, dialogs) still migrates to Tailwind + tokens (wave W8 / per-app passes).

| Path | Rationale | Chrome migrated? |
|------|-----------|------------------|
| `src/apps/battleship/front-end/components/GameBoard.vue` | Fleet grid cells and hit/miss geometry | no |
| `src/apps/billiards/front-end/components/BilliardsBallChip.vue` | Ball render chip on table | no |
| `src/apps/billiards/front-end/components/BilliardsBallInHandStageRail.vue` | Cue-ball placement rail geometry | no |
| `src/apps/billiards/front-end/components/BilliardsCollectedBallTray.vue` | Pocketed ball tray layout | no |
| `src/apps/billiards/front-end/components/BilliardsCueAim.vue` | Aim line / ghost-ball overlay | no |
| `src/apps/billiards/front-end/components/BilliardsCueEnglishSection.vue` | English pad control geometry | no |
| `src/apps/billiards/front-end/components/BilliardsDevGrid.vue` | Dev alignment grid overlay | no |
| `src/apps/billiards/front-end/components/BilliardsEnglishPad.vue` | Spin pad hit targets | no |
| `src/apps/billiards/front-end/components/BilliardsMatchAsideChrome.vue` | Aside shell — table geometry; lobby in `App.vue` | partial |
| `src/apps/billiards/front-end/components/BilliardsMatchPocketTrays.vue` | Pocket tray positions | no |
| `src/apps/billiards/front-end/components/BilliardsNineBallObjectTray.vue` | Object-ball rack geometry | no |
| `src/apps/billiards/front-end/components/BilliardsRailSights.vue` | Rail diamond sights | no |
| `src/apps/billiards/front-end/components/BilliardsSpareCue.vue` | Spare-cue widget layout | no |
| `src/apps/billiards/front-end/components/BilliardsTable.vue` | 2D table plane / cushions | no |
| `src/apps/billiards/front-end/components/BilliardsTable3D.vue` | Three.js host sizing | no |
| `src/apps/billiards/front-end/components/BilliardsTableChrome.vue` | Felt frame geometry | no |
| `src/apps/billiards/front-end/components/BilliardsTrayBall.vue` | Tray ball sprites | no |
| `src/apps/blackjack/front-end/components/BlackjackTableSurface.vue` | Felt, seats, card lanes | no |
| `src/apps/checkers/front-end/games/Checkers/CheckersGameBoard.vue` | Checker grid and piece motion | no |
| `src/apps/chess/front-end/games/Chess/ChessGameBoard.vue` | Chess grid, highlights, animation | no |
| `src/apps/connect-four/front-end/components/GameBoard.vue` | Column grid and discs | no |
| `src/apps/dnd-examples/front-end/apps/Modifier/DropZone.vue` | DnD teaching sample geometry | no |
| `src/apps/dnd-examples/front-end/apps/PromiseDrop/DropZone.vue` | DnD teaching sample geometry | no |
| `src/apps/dnd-examples/front-end/apps/PromiseDrop/InstantDropZone.vue` | DnD teaching sample geometry | no |
| `src/apps/dnd-examples/front-end/apps/SnapGrid/GridCanvas.vue` | Snap-grid canvas cells | no |
| `src/apps/hangman/front-end/components/GameBoard.vue` | Gallows + letter slots | no |
| `src/apps/lab-formsbuilder/front-end/components/form-designer/DesignCanvas.vue` | Designer canvas / drop targets | no |
| `src/apps/poker-holdem/front-end/components/HoldemTableSurface.vue` | Table felt and seat layout | no |
| `src/apps/solitaire/front-end/games/klondike/KlondikeCard.vue` | Card stack offsets / dealing | no |
| `src/apps/solitaire/front-end/games/klondike/KlondikeDropZone.vue` | Foundation/tableau hit zones | no |
| `src/apps/solitaire/front-end/games/klondike/KlondikeGame.vue` | Klondike tableau layout | no |
| `src/apps/tic-tac-toe/front-end/components/GameBoard.vue` | 3×3 cell grid | no |
| `src/apps/weather-dashboard/front-end/components/WeatherMapPanel.vue` | Map tile host / leaflet chrome | no |
| `src/apps/word-tile/front-end/games/tile-word-grid/TileBoardCell.vue` | Word-grid cell geometry | no |
| `src/apps/word-tile/front-end/games/tile-word-grid/TileBoardStagedTile.vue` | Staged tile drag layer | no |
| `src/dashboard/components/settings/lab-workflows/LabWorkflowGraphCanvas.vue` | Vue Flow canvas edges/nodes | no |
| `src/shared/game-platform/ui/GameBoardRow.vue` | Board+aside grid — aside height sync via ResizeObserver | yes (W4) |

**Phase 0.3 notes (2026-11-11):** 21 **L** bucket files reviewed — all `pending` migration (no blanket exempt). `billiards/front-end/App.vue` (L) is not exempt; chrome migration in W6/W8.
