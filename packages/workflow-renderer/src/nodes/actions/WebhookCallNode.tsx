/**
 * WebhookCallNode - Call external webhook
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function truncateUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.length <= 30) return url;
  return url.substring(0, 27) + '...';
}

function WebhookCallNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { url?: string } | undefined;
  const configPreview = truncateUrl(config?.url);

  return (
    <BaseNode
      category="action"
      icon="🌐"
      label={data.label || 'Webhook Call'}
      description={data.description}
      selected={selected}
      configPreview={configPreview}
      inputHandles={1}
      outputHandles={1}
      status={data.status}
      error={data.error}
    />
  );
}

export const WebhookCallNode = memo(WebhookCallNodeComponent);
export default WebhookCallNode;
