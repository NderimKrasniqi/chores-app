# Automated Verification

The repository has one deterministic fast verification entry point:

```bash
npm run verify
```

It performs:

1. TypeScript verification with `tsc --noEmit`.
2. Convex code generation and function validation.
1. The curated zero-argument backend regression and security smoke manifest.

The backend manifest is explicit in `scripts/verify-backend.mjs`. New smoke functions are not silently added to the release gate; they must be added deliberately after confirming that they are self-contained and accept no required arguments.

## Local development

On a normal developer machine, `npm run verify` uses the currently configured Convex development deployment.

Successful backend smoke output is intentionally suppressed. The runner prints detailed Convex output only when a smoke fails.

## GitHub CI

`.github/workflows/verify.yml` runs the same `npm run verify` command for pull requests and pushes to `main`.

In a non-interactive runner with no Convex deployment configured and no dCONVEX_DEPLOY_KEY` set, the Convex CLI provisions an anonymous local backend. The CI gate therefore does not require production credentials or access to production data.

## Mobile regression

Maestro remains a separate simulator/mobile gate. It is intentionally not part of this fast GitHub workflow because it requires an appropriate simulator or device runtime and validates a different layer of the application.

## Release verification

Before a release checkpoint:

1. Run `npm run verify`.
2. Run the permanent Maestro suite.
3. Run any release-specific physical-device checks that cannot be represented by backend or simulator automation.
