# quietkit

Small developer tools that run in your browser. Nothing is uploaded, nothing is tracked,
and the site keeps working with the network off.

Live at https://quietkit.frelikh.dev (in development).

## Develop

```
npm install
npm run dev          # http://127.0.0.1:4330
npm run verify       # types, lint, unit tests, build, CSP check
npm run e2e          # browser tests in Docker (needs Docker)
```

`CLAUDE.md` is the working guide, `docs/SPEC.md` the product and architecture document,
`DEPLOY.md` the deploy chain. Design tokens come from
[stark-ui-kit](https://github.com/maksimfrelikh/stark-ui-kit).
