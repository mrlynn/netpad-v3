/**
 * AnimatedEdge - Edge with animated flow
 */

import React, { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useRendererTheme } from '../hooks/useTheme';

function AnimatedEdgeComponent({
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
    stroke: selected ? theme.edge.selected : theme.edge.animated,
    strokeWidth: selected ? 2.5 : 2,
    ...style,
  };

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={edgeStyle}
      markerEnd={markerEnd}
      className="wr-animated-edge"
    />
  );
}

export const AnimatedEdge = memo(AnimatedEdgeComponent);
export default AnimatedEdge;
