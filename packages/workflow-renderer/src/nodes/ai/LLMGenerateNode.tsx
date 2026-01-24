/**
 * LLMGenerateNode - Generate text with LLM
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function LLMGenerateNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { model?: string } | undefined;
  const configPreview = config?.model || undefined;

  return (
    <BaseNode
      category="ai"
      icon="🤖"
      label={data.label || 'LLM Generate'}
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

export const LLMGenerateNode = memo(LLMGenerateNodeComponent);
export default LLMGenerateNode;
