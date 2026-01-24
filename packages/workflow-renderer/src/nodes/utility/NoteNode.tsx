/**
 * NoteNode - Annotation/comment node
 */

import React, { memo, type CSSProperties } from 'react';
import { useRendererTheme } from '../../hooks/useTheme';
import type { RendererNodeProps } from '../../types/workflow';

function NoteNodeComponent({ data, selected }: RendererNodeProps) {
  const theme = useRendererTheme();

  const config = data.config as {
    text?: string;
    width?: number;
    height?: number;
    backgroundColor?: string;
  } | undefined;

  const noteStyles: CSSProperties = {
    minWidth: config?.width || 200,
    minHeight: config?.height || 100,
    padding: 12,
    backgroundColor: config?.backgroundColor || '#FEF3C7',
    borderRadius: 4,
    border: selected ? `2px solid ${theme.nodeCategories.utility}` : '1px solid #F59E0B30',
    boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
    fontSize: 12,
    color: '#78350F',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  return (
    <div className="wr-note-node" style={noteStyles}>
      {config?.text || data.label || 'Note'}
    </div>
  );
}

export const NoteNode = memo(NoteNodeComponent);
export default NoteNode;
