/**
 * WebhookTriggerNode - Triggered by incoming webhook
 */

import React, { memo } from 'react';
import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function WebhookTriggerNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { method?: string } | undefined;
  const configPreview = config?.method ? `${config.method} request` : undefined;

  return (
    <BaseNode
      category="trigger"
      icon="🔗"
      label={data.label || 'Webhook Trigger'}
      description={data.description}
      selected={selected}
      configPreview={configPreview}
      inputHandles={0}
      outputHandles={1}
      status={data.status}
      error={data.error}
    />
  );
}

export const WebhookTriggerNode = memo(WebhookTriggerNodeComponent);
export default WebhookTriggerNode;
