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
    height: `${tooltipHeight}px`,
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    background: 'rgba(8, 10, 16, 0.95)',
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.7), 0 0 0 0.5px rgba(255, 255, 255, 0.18)',
    color: '#f6fbff',
    padding: '12px 14px'
  };
}
