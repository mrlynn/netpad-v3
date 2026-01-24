/**
 * HttpRequestNode - Make HTTP request
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function truncateUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.length <= 25) return url;
  return url.substring(0, 22) + '...';
}

function HttpRequestNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { method?: string; url?: string } | undefined;
  const method = config?.method || 'GET';
  const url = truncateUrl(config?.url);
  const configPreview = url ? `${method} ${url}` : method;

  return (
    <BaseNode
      category="action"
      icon="🔌"
      label={data.label || 'HTTP Request'}
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

export const HttpRequestNode = memo(HttpRequestNodeComponent);
export default HttpRequestNode;
