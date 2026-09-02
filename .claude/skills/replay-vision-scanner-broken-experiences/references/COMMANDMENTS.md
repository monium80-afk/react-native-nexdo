## Replay Vision scanner rules

- Scope monitor queries to the product's relevant URL or completion route; the agent must fill route placeholders before creating scanners.
- Use Session Replay recordings as the source for observations, including Expo and React Native recordings.
- Never gate scanner queries on `$exception`; visual breakage can occur without an exception event.
- Create and validate each scanner through the Replay Vision scanner workflow, recording skipped scanners and reasons.
