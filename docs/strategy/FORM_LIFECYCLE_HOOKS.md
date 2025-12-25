# Form Lifecycle Hooks - Design Document

> **Status**: Ready for Implementation (Phase 1)
> **Created**: December 2024
> **Priority**: Next feature after chat assistant stabilization

---

## Overview

Enable form creators to define automated actions at different stages of the form lifecycle:
- **Pre-load**: Before form renders to the user
- **Post-submit**: After successful form submission

---

## Phase 1 Scope (Build First)

### Data Model

```typescript
interface FormLifecycleConfig {
  // Pre-load hooks
  prefill?: {
    /** Enable pre-filling fields from URL parameters */
    fromUrlParams?: boolean;
    /** Custom mapping: URL param name → field path */
    urlParamMapping?: Record<string, string>;
  };

  // Post-submit hooks
  onSubmit?: {
    /** Custom success message (supports variables like {{fieldName}}) */
    successMessage?: string;

    /** Custom error message */
    errorMessage?: string;

    /** Redirect configuration */
    redirect?: {
      url: string;
      /** Seconds before redirect (0 = immediate) */
      delay?: number;
      /** Append ?responseId=xxx to URL */
      includeResponseId?: boolean;
      /** Append field values as query params */
      includeFields?: string[];
    };

    /** Webhook notification */
    webhook?: {
      url: string;
      method?: 'POST' | 'PUT';
      /** Custom headers (for auth tokens, API keys) */
      headers?: Record<string, string>;
      /** Which fields to include: 'all' or specific field paths */
      includeFields?: string[] | 'all';
      /** Retry on failure */
      retryOnFailure?: boolean;
      /** Max retries */
      maxRetries?: number;
    };
  };
}
```

### Integration with Existing Types

Add to `FormConfiguration` in `src/types/form.ts`:

```typescript
interface FormConfiguration {
  // ... existing fields ...

  /** Lifecycle hooks for pre-load and post-submit actions */
  lifecycle?: FormLifecycleConfig;
}
```

Note: There's already a `FormLifecycle` type that handles scheduling (start/end dates, limits).
The new `FormLifecycleConfig` is different - it handles **actions/hooks**, not scheduling.
Consider renaming for clarity:
- `FormLifecycle` → `FormScheduling` or `FormAvailability`
- `FormLifecycleConfig` → `FormHooks` or `FormActions`

---

## UI Design

### Location
New tab in Form Settings: **"Actions & Automation"**

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  Form Settings                                                  │
├──────────┬──────────┬──────────────────┬───────────────────────┤
│  General │  Theme   │  Access Control  │  Actions & Automation │
├──────────┴──────────┴──────────────────┴───────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ON FORM LOAD                                           │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  ☑ Pre-fill fields from URL parameters                 │   │
│  │                                                         │   │
│  │    Example: yourform.com/form?email=test@example.com   │   │
│  │                                                         │   │
│  │    Parameter Mapping (optional):                        │   │
│  │    ┌──────────────┐    ┌──────────────────┐            │   │
│  │    │ URL Param    │ →  │ Field            │  [+ Add]   │   │
│  │    ├──────────────┤    ├──────────────────┤            │   │
│  │    │ email        │ →  │ email_address  ▼ │  [×]       │   │
│  │    │ ref          │ →  │ referral_code  ▼ │  [×]       │   │
│  │    └──────────────┘    └──────────────────┘            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  AFTER SUCCESSFUL SUBMISSION                            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  Success Message:                                       │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ Thank you, {{name}}! Your response has been     │   │   │
│  │  │ recorded.                                        │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │  💡 Use {{fieldPath}} to include field values          │   │
│  │                                                         │   │
│  │  ─────────────────────────────────────────────────     │   │
│  │                                                         │   │
│  │  ☐ Redirect after submission                           │   │
│  │    ┌─────────────────────────────────────────────┐     │   │
│  │    │ https://example.com/thank-you               │     │   │
│  │    └─────────────────────────────────────────────┘     │   │
│  │    Delay: [ 3 ] seconds                                │   │
│  │    ☐ Include response ID in URL                        │   │
│  │    ☐ Include fields: [Select fields...]                │   │
│  │                                                         │   │
│  │  ─────────────────────────────────────────────────     │   │
│  │                                                         │   │
│  │  ☐ Send webhook notification                           │   │
│  │    ┌─────────────────────────────────────────────┐     │   │
│  │    │ https://hooks.zapier.com/hooks/catch/...    │     │   │
│  │    └─────────────────────────────────────────────┘     │   │
│  │    Method: ○ POST  ○ PUT                               │   │
│  │    Include: ○ All fields  ○ Select fields...          │   │
│  │                                                         │   │
│  │    Headers (optional):                                  │   │
│  │    ┌────────────────┐  ┌────────────────────────┐      │   │
│  │    │ Authorization  │  │ Bearer sk_live_xxx...  │ [×]  │   │
│  │    └────────────────┘  └────────────────────────┘      │   │
│  │    [+ Add Header]                                       │   │
│  │                                                         │   │
│  │    ☐ Retry on failure (up to 3 times)                  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ON SUBMISSION ERROR                                    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  Error Message:                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ Something went wrong. Please try again or       │   │   │
│  │  │ contact support@example.com                     │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                          [ Save Changes ]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Files to Create

| File | Purpose |
|------|---------|
| `src/types/formHooks.ts` | Type definitions for lifecycle config |
| `src/components/FormBuilder/LifecycleSettingsTab.tsx` | UI for the settings tab |
| `src/lib/hooks/executeWebhook.ts` | Server-side webhook execution |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/form.ts` | Add `lifecycle` field to `FormConfiguration` |
| `src/components/FormBuilder/FormSettingsDrawer.tsx` | Add new tab |
| `src/app/api/forms/[formId]/submit/route.ts` | Execute post-submit hooks |
| `src/components/FormRenderer/FormRenderer.tsx` | Handle pre-fill and success/redirect |
| `src/app/api/ai/chat/route.ts` | Add lifecycle hook knowledge |

### Implementation Order

1. **Types** - Define `FormLifecycleConfig` types
2. **UI** - Build the settings tab (can save config but not execute yet)
3. **Pre-fill** - Implement URL param pre-filling in FormRenderer
4. **Success/Error Messages** - Custom messages after submit
5. **Redirect** - Post-submit redirect with delay
6. **Webhook** - Server-side webhook execution
7. **AI Assistant** - Teach chat assistant about hooks

---

## Webhook Execution Details

### Request Format
```typescript
// POST to webhook URL
{
  "event": "form_submission",
  "formId": "abc123",
  "formName": "Customer Feedback",
  "responseId": "resp_xyz789",
  "submittedAt": "2024-12-25T10:30:00Z",
  "data": {
    // Field values (all or selected)
    "name": "John Doe",
    "email": "john@example.com",
    "rating": 5
  }
}
```

### Error Handling
- Webhook failures should NOT block the form submission
- Log failures for debugging
- Optional retry with exponential backoff
- Store webhook status with response record

### Security Considerations
- Validate webhook URLs (no internal/localhost)
- Rate limit webhook calls
- Timeout after 10 seconds
- Headers stored encrypted (contains auth tokens)

---

## AI Assistant Integration

Update system prompt to include:

```
## Form Lifecycle Hooks
You can help users configure automation for their forms:

**Pre-fill from URL:**
- Enable pre-filling fields from URL parameters
- Example: ?email=test@example.com fills the email field
- Custom mapping available for different param names

**Post-submit actions:**
- Custom success/error messages (can include {{fieldName}} variables)
- Redirect to URL after submission
- Webhook notifications to external services (Zapier, Make, custom APIs)

When users ask about:
- "Send data to Zapier" → suggest webhook configuration
- "Redirect after submit" → explain redirect options
- "Pre-fill from link" → explain URL parameter pre-filling
- "Custom thank you message" → explain success message customization
```

---

## Phase 2 Features (Future)

After Phase 1 is stable, consider:

| Feature | Description |
|---------|-------------|
| **Email notifications** | Built-in email sending (to submitter, to admin) |
| **Conditional webhooks** | Only fire webhook if certain conditions are met |
| **Multiple webhooks** | Send to multiple endpoints |
| **Pre-load from API** | Fetch data from external API to populate form |
| **Field-level triggers** | Execute actions when specific fields change |

---

## Testing Checklist

### Pre-fill
- [ ] Fields pre-fill from matching URL params
- [ ] Custom param mapping works
- [ ] Special characters in values handled correctly
- [ ] Non-existent params ignored gracefully

### Success/Error Messages
- [ ] Custom success message displays
- [ ] {{fieldName}} variables replaced correctly
- [ ] Default message shown if not configured
- [ ] Error message displays on failure

### Redirect
- [ ] Immediate redirect works (delay: 0)
- [ ] Delayed redirect shows countdown
- [ ] Response ID appended when configured
- [ ] Field values appended as query params

### Webhook
- [ ] POST request sent with correct payload
- [ ] Custom headers included
- [ ] Auth tokens work (Bearer, API key)
- [ ] Timeout handled gracefully
- [ ] Retry logic works on failure
- [ ] Webhook failure doesn't block submission

---

## Open Questions

1. **Webhook logging**: Should we show webhook execution history in the responses view?

2. **Template variables**: Beyond {{fieldName}}, should we support:
   - {{responseId}}
   - {{submittedAt}}
   - {{formName}}
   - Expressions like {{total | currency}}?

3. **Webhook testing**: Should we provide a "Test Webhook" button that sends sample data?

---

*Document ready for implementation. Start with types and UI, iterate from there.*
