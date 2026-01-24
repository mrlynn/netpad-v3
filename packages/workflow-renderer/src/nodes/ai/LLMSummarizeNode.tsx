/**
 * LLMSummarizeNode - Summarize text content
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function LLMSummarizeNodeComponent({ data, selected }: RendererNodeProps) {
  return (
    <BaseNode
      category="ai"
      icon="📝"
      label={data.label || 'LLM Summarize'}
      description={data.description}
      selected={selected}
      inputHandles={1}
      outputHandles={1}
      status={data.status}
      error={data.error}
    />
  );
}

export const LLMSummarizeNode = memo(LLMSummarizeNodeComponent);
export default LLMSummarizeNode;
