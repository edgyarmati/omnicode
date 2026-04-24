# Spec

## Problem

OmniCode needs a clear policy for which `.omni/` files are durable shared memory and which are session/runtime state. Ignoring the whole directory prevents useful durable context from living with the repo, but committing everything creates noisy churn and stale state.

## Requested Behavior

- keep durable `.omni` files committable by default
- ignore runtime/generated `.omni` files by default
- generate a selective `.omni/.gitignore` in bootstrapped projects
- apply the same policy to the OmniCode repo itself

## Constraints

- policy must be simple and understandable
- runtime state should remain local and regenerable
- durable files should map to project intent, standards, planning, and configuration

## Success Criteria

- `.omni/.gitignore` exists and ignores only runtime state files
- `ensureOmniDir()` creates the selective ignore file automatically
- this repo tracks durable `.omni` files and does not track runtime `.omni` files
