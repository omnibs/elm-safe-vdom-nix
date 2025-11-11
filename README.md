# `elm-safe-virtual-dom` in a Nix shell

This is a sample repository demonstrating how automate applying `lydell/elm-safe-virtual-dom`
patches in a Nix shell environment.

## How it works

We use Nix to fetch patched versions of the necessary Elm packages from
`lydell/elm-safe-virtual-dom` and place them in a structure compatible
with Elm's package cache.

We create a wrapper around the `elm` executable that:
- Uses `flock` to prevent concurrent patching
- Runs Lydell's `replace-kernel-packages` script

The `replace-kernel-packages` script has been modified to:
- Require an `ELM_HOME` environment variable to be set, so we don't accidentally patch the global Elm package cache
- Require an argument for the directory where to find the forks
- Handle read-only files from Nix's store
- Allow running in projects that don't use all of the patched packages

All modifications were committed individually, so changes are easy to follow
and reapply in case the script gets updated.

## Structure

- `shell.nix`
  -  Defines the Nix shell environment with our custom Elm executable.
- `nix/overlays/elm/`
  - Contains Nix expressions to fetch patched Elm packages and place them in the appropriate location
  - Contains the Nix overlay that wraps `elm` with logic to patch dependencies
  - Includes the `replace-kernel-packages.js` script that handles the patching process

