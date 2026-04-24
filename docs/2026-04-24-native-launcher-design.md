# OmniCode Native Launcher Design

## Goal

Ship OmniCode as a standalone cross-platform launcher binary with polished installers, while keeping OpenCode as the upstream host runtime that OmniCode acquires and orchestrates rather than owns.

## Problem

The npm/npx-based setup flow is too fragile and too dependent on Node package execution semantics:

- `curl | bash` is only a thin wrapper around `npx`
- Windows is not a first-class install target in that model
- setup failures are tied to npm package publishing and executable resolution details
- end users still effectively need a Node-centric environment just to get started

OmniCode needs a more product-like installation story for macOS, Linux, and Windows.

## Product Boundary

OmniCode should **not** become a fork or bundled distribution of OpenCode.

Instead:

- OmniCode owns the installer, launcher, workflow layer, `.omni/` memory, and runtime orchestration
- OpenCode remains the upstream host app/runtime
- OmniCode acquires a compatible upstream OpenCode release when needed
- OmniCode does not mutate or depend on the user’s normal global `opencode` installation by default

This preserves the boundary:

- **OmniCode** = productized workflow launcher
- **OpenCode** = upstream conversational host runtime

## Version Policy

### OpenCode compatibility model

OmniCode uses a **pinned default, optional upgrade** policy.

That means:

- each OmniCode release declares a tested default OpenCode version or version range
- OmniCode installs that compatible version into an OmniCode-managed user-level location
- if the managed OpenCode runtime is missing or older than required, OmniCode upgrades it
- advanced/manual upgrades can happen later, but the default path is the tested version

### Runtime ownership

OmniCode should manage **one per-user OpenCode runtime**, not one per project.

Reasons:

- simpler mental model
- easier support and debugging
- less duplication on disk
- fewer downloads
- more consistent behavior across projects

### Relationship to user-installed OpenCode

By default:

- OmniCode should **not** overwrite the user’s normal/global `opencode`
- OmniCode should **not** automatically prefer a newer system `opencode`
- OmniCode should use its own managed OpenCode runtime

This avoids ambiguity and protects the user’s normal OpenCode usage from OmniCode-specific compatibility decisions.

## Primary User Experience

### macOS/Linux

Users should be able to run:

```bash
curl -fsSL https://raw.githubusercontent.com/edgyarmati/omnicode/main/install.sh | bash
omnicode
```

### Windows

Users should be able to run a PowerShell installer such as:

```powershell
irm https://raw.githubusercontent.com/edgyarmati/omnicode/main/install.ps1 | iex
omnicode
```

### First run

On first launch, `omnicode` should:

1. check for an OmniCode-managed OpenCode runtime
2. install or upgrade that runtime if needed
3. write OmniCode-specific isolated OpenCode config/plugin wiring
4. launch the managed OpenCode runtime

## Recommended Approach

Use a **native/self-contained OmniCode launcher binary** plus **platform-specific installers**.

### Why this approach

- removes end-user dependency on Node/npm/npx for installation
- gives Windows a first-class install path
- keeps OmniCode responsible for setup/orchestration, not OpenCode internals
- produces a more stable, supportable release channel
- avoids the fragility of npm executable resolution during bootstrap

### Rejected alternatives

#### Keep npm/npx as the primary install path

Rejected because it is too fragile, too Node-centric, and not a clean cross-platform product install story.

#### Bundle OpenCode inside OmniCode releases

Rejected because it would make OmniCode responsible for distributing and effectively maintaining an OpenCode payload rather than orchestrating upstream releases.

#### Fork OpenCode

Explicitly rejected. It breaks the product boundary and creates long-term maintenance burden.

## System Design

### 1. OmniCode launcher binary

Ship `omnicode` as a standalone binary for supported platforms.

Responsibilities:

- implement the OmniCode launcher behavior without requiring a user-managed Node install
- know the current compatible OpenCode version target
- acquire/install/update the managed OpenCode runtime when needed
- prepare isolated OmniCode config/plugin state
- launch the managed OpenCode process with the right environment

### 2. Managed OpenCode runtime

OmniCode keeps a per-user managed OpenCode runtime in an OmniCode-owned location.

Suggested shape:

- user-scoped data/cache directory
- versioned OpenCode runtime subdirectories
- current-version marker or metadata file

Responsibilities:

- store the tested OpenCode version OmniCode wants to use
- support install, upgrade, and integrity checks
- stay separate from the user’s normal global `opencode`

### 3. Installers

Provide platform-native installers:

- `install.sh` for macOS/Linux
- `install.ps1` for Windows

Installer responsibilities:

- detect platform/architecture
- download the appropriate OmniCode launcher binary from release artifacts
- place it in a user-appropriate install location
- ensure it is invokable as `omnicode`
- print clear next steps and PATH guidance if needed

Installer non-responsibilities:

- do not install provider credentials
- do not rewrite the user’s global OpenCode config
- do not bundle or patch OpenCode source

### 4. OpenCode acquisition

The launcher must acquire official upstream OpenCode releases, not a fork.

Responsibilities:

- know where to fetch official compatible OpenCode artifacts
- install the tested default version when missing
- upgrade the managed runtime when it is older than the required version
- optionally allow future manual upgrades without changing the default compatibility model

### 5. Isolated configuration

The launcher should continue using isolated OmniCode config state, conceptually similar to the current config model:

- OmniCode-owned config root
- OmniCode-owned plugin/config wiring
- environment overrides only inside `omnicode` launches

This ensures normal `opencode` remains untouched.

## Components

### Release artifacts

Expected artifacts per release:

- macOS arm64 OmniCode binary
- macOS x64 OmniCode binary
- Linux x64 OmniCode binary
- Linux arm64 OmniCode binary
- Windows x64 OmniCode binary
- install scripts (`install.sh`, `install.ps1`)
- release metadata describing the compatible OpenCode version target

### Installer scripts

#### `install.sh`

Expected flow:

1. detect OS and architecture
2. download the matching OmniCode binary
3. install it into a user-level bin location
4. print PATH instructions if needed
5. verify `omnicode --help`

#### `install.ps1`

Expected flow:

1. detect OS and architecture
2. download the matching OmniCode binary
3. install it into a user-level location on Windows
4. ensure the launcher location is on PATH or print instructions
5. verify `omnicode --help`

### Launcher runtime flow

Expected flow inside `omnicode`:

1. resolve the user-scoped OmniCode home/config/runtime directories
2. read OmniCode release metadata for the compatible OpenCode version target
3. inspect the currently managed OpenCode runtime
4. install or upgrade OpenCode if missing or too old
5. write OmniCode-specific config/plugin shim files
6. launch the managed OpenCode runtime with OmniCode environment overrides

## Error Handling

### Installer failures

Installer errors should be explicit and actionable:

- unsupported platform/architecture
- failed download
- checksum/integrity failure if implemented
- no writable install location
- PATH not updated or binary not discoverable

### Launcher failures

Launcher errors should cover:

- failed OpenCode download/acquisition
- incompatible or corrupted managed runtime
- config/bootstrap write failures
- managed OpenCode launch failure

Each should include the exact file path or artifact involved when possible.

## Testing Strategy

### Automated

Add coverage for:

- platform/architecture detection logic
- install-path selection logic
- version comparison logic for managed OpenCode runtime
- release metadata parsing
- managed runtime path resolution
- existing launcher/config tests adapted to the native launcher architecture

### Manual smoke tests

Before release, verify:

1. macOS install via `install.sh`
2. Linux install via `install.sh`
3. Windows install via `install.ps1`
4. first-run OpenCode acquisition works on a clean machine
5. repeat runs reuse the managed runtime when already compatible
6. managed runtime upgrades when the required version target increases
7. normal user-installed `opencode` remains untouched

## Non-goals

Not included in the first native-launcher slice:

- bundling OpenCode into OmniCode release artifacts
- forking OpenCode
- per-project OpenCode runtime overrides
- provider credential automation
- system package manager support like Homebrew/apt/scoop in the first slice

## Success Criteria

A new user can:

1. install OmniCode on macOS, Linux, or Windows with a platform-native installer
2. run `omnicode` without needing Node/npm/npx installed first
3. have OmniCode acquire and manage one compatible OpenCode runtime per user
4. have normal `opencode` remain untouched
5. reach a working OmniCode session through the managed OpenCode runtime
