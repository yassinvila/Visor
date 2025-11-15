import type { CSSProperties } from 'react';
import type { BoundingBox } from '../types';

export function tooltipStyle(target: BoundingBox): CSSProperties {
  const tooltipWidth = 220;
  const tooltipHeight = 80;

  let left = target.x + target.width + 16;
  let top = target.y - tooltipHeight / 2 + target.height / 2;

  if (left + tooltipWidth > window.innerWidth) {
    left = target.x - tooltipWidth - 16;
  }
  if (top + tooltipHeight > window.innerHeight) {
    top = window.innerHeight - tooltipHeight - 24;
  }
  if (top < 24) {
    top = 24;
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${tooltipWidth}px`,
    height: `${tooltipHeight}px`
  };
}
