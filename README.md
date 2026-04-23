# OmniCode

OmniCode is an **OpenCode plugin + launcher** that brings the Omni workflow into OpenCode without forking OpenCode or replacing its UI.

## What OmniCode owns

- `.omni/` durable project memory
- Omni workflow enforcement
- repo map generation for codebase awareness
- skill discovery and required-skill loading
- an `omnicode` launcher that starts OpenCode with OmniCode-specific config

## What OpenCode owns

- terminal UI
- model/provider/auth UX
- sessions and core runtime
- built-in tools and host application behavior

## Packages

- `packages/plugin` — `@omnicode/plugin`
- `packages/launcher` — `omnicode`

## Current status

Initial scaffold complete. The first build focuses on:

1. isolated OpenCode launch path
2. `.omni` bootstrap
3. custom OmniCode tools
4. default OmniCode agent instructions
5. workflow guardrails for planning before editing

## Development

```bash
npm install
npm run build
npm run check
npm test
```
