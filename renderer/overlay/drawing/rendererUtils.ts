import type { CSSProperties } from 'react';
import type { AnnotationConfig, AnnotationType, BoundingBox } from '../types';
import { circleStyle } from './circle';
import { buildArrowPath } from './arrow';

export function buildAnnotationConfig(shape: AnnotationType, target: BoundingBox): AnnotationConfig {
  const baseBox: CSSProperties = {
    left: `${target.x}px`,
    top: `${target.y}px`,
    width: `${target.width}px`,
    height: `${target.height}px`
  };

  if (shape === 'circle') {
    return {
      type: shape,
      boxStyle: circleStyle(target)
    };
  }

  if (shape === 'arrow') {
    return {
      type: shape,
      boxStyle: baseBox,
      arrowPath: buildArrowPath(target)
    };
  }

  return {
    type: 'box',
    boxStyle: {
      ...baseBox,
      borderRadius: '12px'
    }
  };
}
