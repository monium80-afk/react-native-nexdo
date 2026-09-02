# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured for the Nexdo Expo task-management app. Session Replay and Error Tracking were already enabled; Support was enabled. Health, error-tracking, support, and GitHub Issues responders are enabled, and two Replay Vision monitors now send corroborated findings to the Self-driving inbox.

Fresh scout configurations are picked up within about 30 minutes. Findings will begin appearing in the [Self-driving inbox](https://us.posthog.com/project/590613/inbox) as data arrives.

## AI data processing

Approved by the wizard's organization-level gate.

## GitHub

The PostHog GitHub App was already connected. GitHub Issues was selected, but the repository connection was skipped during confirmation, so no warehouse source was created. Its responder is enabled and remains dormant until a GitHub Issues warehouse source begins syncing.

## Products enabled

| Product | Result | Notes |
|---|---|---|
| Session Replay | already enabled | The Expo React Native SDK is configured. No recordings were found yet. |
| Error Tracking | already enabled | The app has PostHog exception capture in its authentication flow. |
| Support (Conversations) | enabled | Connect an inbound email, inbox, or Slack channel in PostHog before tickets can arrive. |

This is a mobile app, not a `posthog-js` web application, so there was no web-init override to inspect.

## Signal sources

| Signal source | Action |
|---|---|
| `signals_scout` / `cross_source_issue` | Already enabled by default; no configuration row is required. |
| `health_checks` / `health_issue` | Enabled. |
| `error_tracking` / `issue_created` | Enabled. |
| `error_tracking` / `issue_reopened` | Enabled. |
| `error_tracking` / `issue_spiking` | Enabled. |
| `conversations` / `ticket` | Enabled. |
| `github` / `issue` | Enabled as a dormant responder pending a GitHub Issues warehouse source. |
| `session_replay` / `session_analysis_cluster` | Deliberately skipped; Replay Vision scanners cover replay findings. |

## Connected tools

| Tool | Status |
|---|---|
| GitHub Issues | Selected, but no warehouse source was connected. The responder is enabled and dormant until a source is added and begins syncing. |
| Linear, Jira, Sentry, Zendesk, and other catalog tools | Not used in this run. |

## Scout troop

**Enabled (3 of 27):**

- `signals-scout-general` — watches cross-product correlations and unowned surfaces.
- `signals-scout-product-analytics` — watches core task-flow funnels, retention, lifecycle, and path regressions.
- `signals-scout-health-checks` — prioritizes actionable PostHog setup health issues.

**Disabled (24):**

- `signals-scout-ai-observability` — no confirmed LLM observability telemetry.
- `signals-scout-anomaly-detection` — product analytics is the more focused monitor for the current app surface.
- `signals-scout-apm` — no distributed-tracing surface was found.
- `signals-scout-conversations` — Support has no inbound channel yet.
- `signals-scout-csp-violations` — no CSP reporting was found.
- `signals-scout-customer-analytics` — no B2B account analytics surface was found.
- `signals-scout-data-pipelines` — no CDP destination, batch-export, or Hog Flow surface was found.
- `signals-scout-data-warehouse` — no warehouse source is currently connected.
- `signals-scout-error-tracking` — covered by the native Error Tracking responder.
- `signals-scout-experiments` — no active experiment evidence was found.
- `signals-scout-feature-flags` — no active feature-flag usage was confirmed.
- `signals-scout-inbox-validation` — this fresh setup has no shipped fixes to validate yet.
- `signals-scout-insight-alerts` — no insight alerts were confirmed.
- `signals-scout-logs` — no active Logs usage was confirmed.
- `signals-scout-mcp-tool-calls` — no MCP analytics surface was confirmed.
- `signals-scout-observability-gaps` — the focused product and health scouts are sufficient at this stage.
- `signals-scout-replay-vision` — no earlier scanner observations exist; Replay Vision monitors are configured separately.
- `signals-scout-revenue-analytics` — no payments or revenue data surface was found.
- `signals-scout-session-replay` — covered by the Replay Vision scanners below.
- `signals-scout-skills-store` — no project skill-store monitoring need was found.
- `signals-scout-surveys` — no surveys exist.
- `signals-scout-tasks` — no PostHog Tasks delivery-health usage was found.
- `signals-scout-web-analytics` — this is a mobile-first Expo app, not a tracked web-traffic surface.
- `signals-scout-web-vitals` — no web-vitals surface was found.

**Run budget:** 100 maximum runs/day, 0 used today, 100 remaining today. Announcement: “Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more.”

## Custom scouts

No custom scouts were created: the proposal was cancelled. Two candidates were offered:

- **Onboarding conversion** — based on `app/onboarding.tsx` and the signup completion events; it would speak up only when account-creation completion falls while onboarding entries remain steady.
- **Next-task recommendation acceptance** — based on `app/(tabs)/index.tsx`; it would watch whether users start the suggested task rather than skip, plan, or analyze it while traffic holds steady.

The general and product-analytics scouts cover broad product behavior, while native Error Tracking and Replay Vision own errors and recording-based breakage. If a future custom scout is noisy, set `emit: false` in its PostHog config to leave it in dry-run mode.

## Replay Vision scanners

A scanner is an LLM that watches individual session recordings on a schedule and pushes qualifying findings to the Self-driving inbox. These are the only items in this setup that spend Replay Vision quota. Individual findings enter at half weight and need independent corroboration before promotion into an inbox report.

| Scanner | Status | Scope | Sampling | Estimate |
|---|---|---|---:|---:|
| Nexdo onboarding breakage | Created | Recordings whose current URL contains `/onboarding`; this is the identified account-creation completion path. | 50% | 0 observations/month; 0 credits/month |
| Nexdo task-flow frustration | Created | Recordings containing `$rageclick` only, covering visible struggle across task start, planning, analysis, and task-context actions. | 100% | 0 observations/month; 0 credits/month |

No recordings exist yet, so both scanners are armed and will start observing when recordings arrive. The organization currently has 2,500 Replay Vision credits remaining and no existing projected scanner spend.

## Follow-ups

- [ ] Connect an inbound Support channel (email, inbox, or Slack) so Conversations tickets can reach the enabled responder.
- [ ] Add the GitHub Issues warehouse source for the intended repository at [New data warehouse source](https://us.posthog.com/project/590613/pipeline/new/source). The existing responder will begin working when its issues table syncs.
- [ ] Generate real app usage and session recordings so the Replay Vision monitors and scouts have data to inspect.
- [ ] Consider re-enabling a custom scout later if targeted onboarding or next-task recommendation monitoring is desired.

## What happens next

The scout coordinator picks up fresh configurations within about 30 minutes. Scout runs use the daily run budget; findings cluster into reports in the Self-driving inbox, where immediately actionable reports can become coding tasks.

## Files modified or created

- Created `posthog-self-driving-report.md`.
- No application source files were modified.
