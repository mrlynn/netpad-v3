# Changelog

All notable changes to `@netpad/workflow-renderer` will be documented in this file.

## [1.0.0] - 2025-01-23

### Added

- Initial release
- `WorkflowRenderer` main component
- 29 built-in node types across 6 categories:
  - Triggers: `form_trigger`, `webhook_trigger`, `schedule_trigger`, `manual_trigger`
  - Logic: `filter`, `switch`, `delay`, `loop`, `parallel`, `merge`
  - Data: `mongodb_query`, `mongodb_insert`, `mongodb_update`, `mongodb_delete`, `transform`
  - Actions: `email_send`, `slack_send`, `webhook_call`, `http_request`, `sms_send`, `push_notification`, `function`
  - AI: `llm_generate`, `llm_classify`, `llm_extract`, `llm_summarize`
  - Utility: `note`, `variable_set`, `variable_get`
- 4 edge types: `default`, `conditional`, `error`, `animated`
- Auto-layout with Dagre (4 directions: TB, BT, LR, RL)
- Dark and light themes
- Custom theme support via `createTheme()`
- Minimap and controls components
- TypeScript support with full type definitions
