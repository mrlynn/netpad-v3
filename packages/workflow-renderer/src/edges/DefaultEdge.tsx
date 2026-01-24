/**
 * DefaultEdge - Standard workflow connection
 */

import React, { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useRendererTheme } from '../hooks/useTheme';

function DefaultEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
  markerEnd,
}: EdgeProps) {
  const theme = useRendererTheme();

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const edgeStyle = {
    stroke: selected ? theme.edge.selected : theme.edge.default,
    strokeWidth: selected ? 2.5 : 2,
    ...style,
  };

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={edgeStyle}
      markerEnd={markerEnd}
    />
  );
}

export const DefaultEdge = memo(DefaultEdgeComponent);
export default DefaultEdge;
