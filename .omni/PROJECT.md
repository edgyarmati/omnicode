# Project

## Goal

Build OmniCode as an OpenCode plugin plus launcher that preserves the Omni workflow while relying on OpenCode for the host UX and runtime.

## Users

- developers who want Omni-style workflow enforcement inside OpenCode
- contributors extending OmniCode's workflow, durable memory, repo map, and skill routing

## Constraints

- OpenCode remains the host product; no custom shell/fork direction
- keep launcher thin and plugin thick
- preserve the user's normal OpenCode setup unless launched through `omnicode`
- keep runtime/generated `.omni` state out of git by default

## Success Criteria

- OmniCode launches OpenCode with isolated config and the OmniCode plugin loaded
- `.omni/` bootstrap, standards import, repo map, skill sync, and workflow enforcement work in real OpenCode sessions
- durable `.omni` docs remain committable while runtime state stays ignored
