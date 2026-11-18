# Backup & restore drill (rm-46 **5.1**)

## Script

From repo root:

```bash
npm run backup:lab
```

On Windows you can also run `pwsh -File scripts/backup-lab-data.ps1` (same layout).

Creates a timestamped folder under `backups/lab-YYYYMMDD-HHMMSS/` containing:

- Main SQLite (`db/the_lab.db` and WAL sidecars if present)
- Per-app SQLite under `src/apps/*/db/the_lab.db`
- Chroma directory `chroma-data/` (if present)

## Restore drill (staging)

1. Stop THE-LAB (`npm run dev` Ctrl+C or stop services).
2. Copy current `db/` and `chroma-data/` aside (safety).
3. Copy backup files back to original paths.
4. Start stack; verify login, one chat turn, one app launch (e.g. task-list).
5. Record date + operator in your change log.

### Sandbox verify (no live overwrite)

Automated gate before a full live restore:

```bash
npm run backup:lab
npm run backup:verify-sandbox
```

Copies the latest `backups/lab-*` tree into `backups/_sandbox-restore-verify/`, runs SQLite `integrity_check` on each `.db`, and confirms `chroma-data/chroma.sqlite3` exists. Exit code **0** = pass. **Full live restore** (steps 1–4 above) remains optional post-merge smoke.

**Verified:** sandbox pass **2026-10-05** (main DB + app DBs + Chroma); live restore not run in this pass.

## Notes

- Do not commit `backups/` or live DB files.
- For production, prefer volume snapshots + this script for logical export.
- App registry metadata lives in main DB — restoring main DB restores app rows.
