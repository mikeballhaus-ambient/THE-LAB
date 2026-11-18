# Billiards

**Registry id:** `app-billiards` · **Port:** 4119 · **Type:** hybrid

Billiards ships three modes: **practice** (solo), **vs Lab Assistant** (8-ball or 9-ball), and **invite a friend** (same competitive rules, optional Quarks wager).

## Practice

1. Open **Billiards** from the catalog.
2. Choose **Free table** (fouls + ball-in-hand only) or **8-ball** / **9-ball** (competitive rules on a solo table).
3. **Open practice table**.
4. **Setup:** drag balls from the **ball tray**, use **Auto rack**, or **Clear object balls**. **Start practice** locks the layout.
5. **Aim:** drag the **aim handle**; pull the **cue butt** back — **release** to shoot. **0%** power + release **cancels** without a shot.
6. Set **english** on the cue-ball pad (top = follow, bottom = draw, left/right = side spin).
7. After a **scratch**, place the cue; **break fouls** use the **kitchen** (shaded band behind the head string).
8. **Free table:** **Edit layout** returns to setup; **End practice** starts fresh. **8-ball** / **9-ball** practice can end with a win/loss dialog when the frame completes.

Sign in is required for server-backed practice.

## Vs Lab Assistant

1. Under **Table rules**, pick **8-ball** or **9-ball** (not open practice).
2. In **Play vs Lab Assistant**, optional **Quarks** wager — stake follows difficulty (checkbox in that section).
3. Choose difficulty and **Play vs Lab Assistant**.
4. Who **breaks** is random each frame. Opponent strokes **replay** on your screen; turn feed and pocket trays match vs-AI matches.

Sidecar banter is available during vs Lab Assistant play.

## Friend match (PvP)

1. Under **Table rules**, pick **8-ball** or **9-ball**.
2. In **Invite a friend**, choose someone from the Lab roster. Optionally check **Wager Quarks** and pick a stake (50 / 250 / 500 / 1000 — same tiers as vs Lab Assistant). **Send invite**. The invite goes through **Lab Messages**; the card shows the wager before accept/decline.
3. When they accept, both clients open the same match; winner/loser settle through the virtual bank when the frame ends.
4. Each player sees the other’s shots via the same opponent-replay pipeline as vs Lab Assistant. Match state is ordered by `stateRevision` so acks, opponent pushes, and refreshes cannot overwrite newer layouts.

To play again with the same friend, send a **new invite** from the lobby after the frame ends.

## Sync & rendering

Engineering detail: [src/apps/billiards/docs/authoritative-sync.md](../../src/apps/billiards/docs/authoritative-sync.md).
