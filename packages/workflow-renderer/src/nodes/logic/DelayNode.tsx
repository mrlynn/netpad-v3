/**
 * DelayNode - Wait for a specified duration
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function formatDuration(ms?: number): string | undefined {
  if (!ms) return undefined;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

function DelayNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { duration?: number; durationMs?: number } | undefined;
  const duration = config?.duration || config?.durationMs;
  const configPreview = formatDuration(duration);

  return (
    <BaseNode
      category="logic"
      icon="⏳"
      label={data.label || 'Delay'}
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

export const DelayNode = memo(DelayNodeComponent);
export default DelayNode;
