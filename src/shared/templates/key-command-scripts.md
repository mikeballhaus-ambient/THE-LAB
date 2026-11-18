## KEY COMMAND SCRIPTS

There are helpers scripts available to run to assist you in completing tasks

- Execute Jest test by using the path/file of the test
`npm run test:path "mcp/readfiletool"`

- Execute Just test by using the test description
`npm run test:name "<test-name>"`

- Type check (full repo)
`npm run type-check`

- Type check (CI / Azure scope)
`npm run type-check`

- eslint (full repo)
`npm run lint`

- eslint (CI / Azure scope)
`npm run lint:ci`

- CI v1 chain (lint + type-check + test + build)
`npm run lint && npm run type-check && npm run test && npm run build`

- Playwright smoke (start stack first, or use lab:start)
`npm run lab:start -- --wait-ready --detach`
`npm run test:smoke`
`npm run lab:stop`

- Restart one hybrid/server app after back-end code changes (shared process; stops that app's port only)
`npm run restart:app-server -- --list`
`npm run restart:app-server -- app-lab-formsbuilder`

- Stop orphaned app server processes (Windows; last resort — prefer restart:app-server for one app)
`npm run kill:app-servers`