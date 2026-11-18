# Structured logging (rm-46 **5.6**)

## Enable JSON log lines

Set **`LAB_STRUCTURED_LOGS=1`** (or `true` / `yes`) on the main backend process.

Also set **`VITE_LOGGING_ENABLED=1`** so `VSCodeLogger` writes to `logs/the-lab.log`.

Each structured line is a single JSON object with:

- `ts`, `level`, `event`
- `correlationId` / `sessionId` when a request or chat context is active
- Event-specific fields

Platform audit writes event **`platform_audit`** when an audit row is inserted.

## HTTP correlation

Responses include header **`x-lab-correlation-id`**. Clients may send the same header on subsequent requests to tie logs together.

Optional: **`x-lab-session-id`** on HTTP requests (chat session id).

## Chat session id

Socket **`MESSAGE`** handlers call `mergeSessionIntoCorrelation(sessionId)` so structured logs during chat turns can include **`sessionId`** when logging is enabled.
