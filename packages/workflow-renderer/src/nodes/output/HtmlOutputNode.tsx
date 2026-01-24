/**
 * HtmlOutputNode - Render HTML output from workflow data
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

interface HtmlOutputConfig {
  template?: string;
  format?: 'html' | 'markdown';
  title?: string;
}

function HtmlOutputNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as HtmlOutputConfig | undefined;

  // Show title or format as preview
  const configPreview = config?.title || config?.format || 'HTML';

  return (
    <BaseNode
      category="output"
      icon="📄"
      label={data.label || 'HTML Output'}
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

export const HtmlOutputNode = memo(HtmlOutputNodeComponent);
export default HtmlOutputNode;
