import type { CSSProperties } from 'react';
import type { BoundingBox } from '../types';

export function circleStyle(target: BoundingBox): CSSProperties {
  const diameter = Math.max(target.width, target.height) * 1.5;
  const centerX = target.x + target.width / 2 - diameter / 2;
  const centerY = target.y + target.height / 2 - diameter / 2;

  return {
    left: `${centerX}px`,
    top: `${centerY}px`,
    width: `${diameter}px`,
    height: `${diameter}px`,
    borderRadius: `${diameter}px`,
    border: '1.5px solid rgba(255, 255, 255, 0.92)',
    boxShadow:
      '0 0 0 1px rgba(255, 255, 255, 0.22) inset, 0 10px 26px rgba(0, 0, 0, 0.28)',
    background: 'transparent'
  };
}
