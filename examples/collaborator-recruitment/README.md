# Collaborator Recruitment Application

A complete example application demonstrating how to build a collaborator/co-founder recruitment system using NetPad's form builder, conversational AI, and workflow automation.

## Overview

This example shows how to create a recruitment landing page that:
- Collects candidate information via **traditional form** or **AI-powered conversation**
- Stores submissions in MongoDB with full conversation transcripts
- Sends email notifications to the project owner
- Provides a polished, marketing-ready landing page

## Features

### Dual-Mode Intake
- **Conversational Mode**: AI-guided conversation that naturally learns about candidates
- **Traditional Form**: Standard form for users who prefer direct input
- Toggle between modes with a single click

### Conversational AI
- Friendly, co-founder-like persona
- Deep-dive topics for understanding candidate background
- Automatic data extraction with confidence scoring
- Full transcript capture for review

### 10-Field Form
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | text | Yes | Candidate's full name |
| email | email | Yes | Contact email |
| location | text | No | City/country for timezone |
| lane | dropdown | Yes | Area of interest |
| availability | dropdown | Yes | Weekly time commitment |
| workPreference | tags | No | Working style preferences |
| workLinks | textarea | No | Portfolio/GitHub links |
| shipped | textarea | Yes | Projects they've built (min 100 chars) |
| whyNetpad | textarea | Yes | Why interested (min 50 chars) |
| anythingElse | textarea | No | Additional comments |

### Workflow Automation
- Triggered on form submission
- Saves to MongoDB `collaborator_submissions` collection
- Transforms enum values to readable text
- Sends formatted email notification

## File Structure

```
collaborator-recruitment/
├── README.md                 # This file
├── TESTING.md               # Test scenarios and validation
├── templates/
│   ├── manifest.json        # Application metadata and contract
│   ├── form.json            # Form definition with conversational config
│   └── workflow.json        # Email notification workflow
├── src/
│   └── landing-page.tsx     # Example landing page component
└── import-bundle.js         # Script to import via API
```

## Quick Start

### Option 1: Import via NetPad UI

1. Go to your NetPad project
2. Navigate to **Templates** → **Import**
3. Upload the `templates/` folder or paste the JSON files
4. Configure your MongoDB connection and email integration
5. Publish the form and activate the workflow

### Option 2: Import via API

```bash
# Set your credentials
export NETPAD_ORG_ID="org_your_id"
export NETPAD_PROJECT_ID="proj_your_id"
export NETPAD_API_URL="https://your-netpad-instance.com"

# Run the import script
node import-bundle.js
```

### Option 3: Use the Seed Script

If you're running NetPad locally:

```bash
# From the netpad-3 root directory
npm run seed:collaborator-form
```

## Configuration

### Environment Variables

For the workflow to function, configure these in your NetPad project:

| Variable | Description |
|----------|-------------|
| `CONNECTION_ID` | MongoDB connection vault ID |
| `EMAIL_CREDENTIAL_ID` | Email integration credential ID |

### Workflow Variables

Edit these in the workflow to customize notifications:

```json
{
  "ownerEmail": "your-email@example.com",
  "ownerName": "Your Name",
  "projectName": "Your Project"
}
```

## Customization

### Changing the Lanes (Areas of Interest)

Edit `form.json` → `fieldConfigs` → find the `lane` field:

```json
{
  "path": "lane",
  "validation": {
    "options": [
      { "label": "Your Lane 1", "value": "lane_1" },
      { "label": "Your Lane 2", "value": "lane_2" }
    ]
  }
}
```

Also update:
- `conversationalConfig.topics` (lane topic)
- `conversationalConfig.extractionSchema` (lane field options)
- `workflow.json` → `format_lane` transform expressions

### Customizing the AI Persona

Edit `form.json` → `conversationalConfig` → `persona`:

```json
{
  "persona": {
    "style": "friendly",
    "tone": "your custom tone description",
    "behaviors": [
      "Be genuinely curious about...",
      "Ask follow-up questions when..."
    ],
    "restrictions": [
      "Never be formal or corporate",
      "Do not ask multiple questions at once"
    ]
  }
}
```

### Adding Conversation Transcript Capture

The form is pre-configured to capture full transcripts:

```json
{
  "captureOptions": {
    "captureTranscript": true,
    "includeTimestamps": true,
    "includeTopicCoverage": true,
    "includeFieldConfidence": true
  }
}
```

## Building the Landing Page

See [src/landing-page.tsx](src/landing-page.tsx) for a complete example. Key patterns:

### Fetching the Form

```typescript
const response = await fetch(`/api/forms/${FORM_SLUG}?public=true`);
const { form } = await response.json();
```

### Handling Submission

```typescript
const handleSubmit = async (data) => {
  await fetch(`/api/forms/${FORM_SLUG}/submit`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
};
```

### Using Conversational Mode

```tsx
import { ConversationalFormChat } from '@/components/ConversationalForm';

<ConversationalFormChat
  formId="collaborator-intake"
  config={conversationalConfig}
  onComplete={handleConversationalComplete}
  endpoint="/api/conversational/stream"
/>
```

### Capturing Transcripts on Completion

```typescript
const handleConversationalComplete = async (conversationState) => {
  await fetch(`/api/forms/${FORM_SLUG}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      data: conversationState.partialExtractions,
      conversationalData: {
        conversationId: conversationState.conversationId,
        transcript: conversationState.messages,
        topicsCovered: conversationState.topics,
        turnCount: conversationState.turnCount,
        overallConfidence: conversationState.confidence,
      },
    }),
  });
};
```

## Data Schema

### MongoDB Document Structure

Submissions are stored with this structure:

```json
{
  "_id": "ObjectId(...)",
  "name": "Jane Developer",
  "email": "jane@example.com",
  "location": "San Francisco, CA",
  "lane": "engineering",
  "availability": "5-10_hours",
  "workPreference": ["async", "pairing"],
  "workLinks": "https://github.com/jane",
  "shipped": "Built a real-time collaboration tool...",
  "whyNetpad": "Interested in the MongoDB-native approach...",
  "anythingElse": "Looking forward to chatting!",
  "_meta": {
    "submissionType": "conversational",
    "conversationId": "conv_abc123",
    "turnCount": 12,
    "confidence": 0.85
  },
  "submittedAt": "2026-01-20T12:00:00.000Z",
  "status": "new"
}
```

### Platform Submission (with transcript)

When using the platform database, additional data is captured:

```json
{
  "submissionId": "sub_abc123",
  "formId": "collaborator-intake",
  "data": { /* form data above */ },
  "conversationalData": {
    "conversationId": "conv_abc123",
    "transcript": [
      { "role": "assistant", "content": "Hi! I'm excited to learn about you...", "timestamp": "..." },
      { "role": "user", "content": "Hi, I'm Jane...", "timestamp": "..." }
    ],
    "topicsCovered": [
      { "topicId": "greeting", "name": "Introduction", "covered": true, "depth": 1.0 },
      { "topicId": "shipped", "name": "What They've Shipped", "covered": true, "depth": 0.8 }
    ],
    "overallConfidence": 0.85,
    "turnCount": 12,
    "durationSeconds": 480
  },
  "metadata": {
    "ipAddress": "...",
    "userAgent": "...",
    "deviceType": "desktop"
  }
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/forms/{slug}?public=true` | GET | Fetch published form configuration |
| `/api/forms/{slug}/submit` | POST | Submit form data |
| `/api/conversational/stream` | POST | SSE endpoint for AI conversation |
| `/api/demo/conversational-stream` | POST | Public demo endpoint (no auth) |

## Viewing Submissions

### In NetPad Dashboard

1. Go to your project → Forms → Collaborator Interest Form
2. Click "Responses" tab
3. Click any submission to see details
4. Expand "Conversation Transcript" to view the full conversation

### Programmatically

```typescript
// Fetch submissions
const response = await fetch('/api/forms/collaborator-intake/submissions');
const { submissions } = await response.json();

// Each submission includes conversationalData if captured
submissions.forEach(sub => {
  if (sub.conversationalData?.transcript) {
    console.log(`${sub.data.name}: ${sub.conversationalData.turnCount} turns`);
  }
});
```

## Troubleshooting

### Form not found
- Ensure the form is published
- Check the slug matches exactly (`collaborator-intake`)
- Verify the form exists in `published_forms` collection

### Workflow not triggering
- Confirm workflow is activated
- Check the trigger `formId` matches the form
- Verify MongoDB and email integrations are configured

### AI conversation issues
- Check `OPENAI_API_KEY` is set
- Verify `/api/conversational/stream` or `/api/demo/conversational-stream` endpoints work
- Check browser console for SSE connection errors

### Transcript not captured
- Ensure `captureOptions.captureTranscript` is `true` in form config
- Verify `conversationalData` is being passed in the submit request
- Check the submission service logs for errors

## Related Documentation

- [Conversational Forms Guide](/docs/conversational-forms.md)
- [Workflow Automation](/docs/workflows.md)
- [Form Builder](/docs/form-builder.md)
- [Template System](/docs/templates.md)

## License

MIT - Feel free to use this as a starting point for your own recruitment pages.
