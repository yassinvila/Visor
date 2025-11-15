import type { CSSProperties } from 'react';
import type { BoundingBox } from '../types';

export function circleStyle(target: BoundingBox): CSSProperties {
  const diameter = Math.max(target.width, target.height) * 1.4;
  const centerX = target.x + target.width / 2 - diameter / 2;
  const centerY = target.y + target.height / 2 - diameter / 2;

  return {
    left: `${centerX}px`,
    top: `${centerY}px`,
    width: `${diameter}px`,
    height: `${diameter}px`,
    borderRadius: `${diameter}px`
  };
}
