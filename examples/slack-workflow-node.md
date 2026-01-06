# Example: Using Slack in Workflows

This shows how to use the Slack integration in a workflow node.

## Workflow Node Example

```typescript
// In your workflow node handler
import { getSlackClient } from '@/lib/integrations/slack/client';

export async function executeSlackNode(
  organizationId: string,
  credentialId: string,
  config: {
    channel: string;
    message: string;
    blocks?: any[];
  }
) {
  const slack = await getSlackClient(organizationId, credentialId);

  // Send a simple message
  await slack.sendMessage({
    channel: config.channel,
    text: config.message,
    blocks: config.blocks,
  });

  return { success: true };
}
```

## Form Submission → Slack Notification

```typescript
// In form submission handler
import { getSlackClient } from '@/lib/integrations/slack/client';

export async function notifySlackOnFormSubmit(
  organizationId: string,
  credentialId: string,
  formData: Record<string, any>
) {
  const slack = await getSlackClient(organizationId, credentialId);

  const message = {
    channel: '#notifications',
    text: `New form submission received`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'New Form Submission',
        },
      },
      {
        type: 'section',
        fields: Object.entries(formData).map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}*: ${value}`,
        })),
      },
    ],
  };

  await slack.sendMessage(message);
}
```

## Workflow Node Configuration

In your workflow node config:

```json
{
  "type": "slack-message",
  "config": {
    "credentialId": "{{workflow.variables.slackCredentialId}}",
    "channel": "#alerts",
    "message": "Workflow completed successfully",
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Workflow *{{workflow.name}}* has completed"
        }
      }
    ]
  }
}
```
