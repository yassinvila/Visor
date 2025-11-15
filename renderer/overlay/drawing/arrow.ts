import type { BoundingBox } from '../types';

const DEFAULT_VIEWBOX = { width: 1920, height: 1080 };

function getViewbox() {
  if (typeof window === 'undefined') {
    return DEFAULT_VIEWBOX;
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

export function clampToViewbox(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

export function boxCenter(box: BoundingBox): { x: number; y: number } {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };
}

export function buildArrowPath(target: BoundingBox, origin: BoundingBox = target): string {
  const viewbox = getViewbox();
  const start = boxCenter(origin);
  const end = boxCenter(target);
  const curveOffset = Math.max(Math.abs(end.y - start.y), 120);

  const controlPoint = {
    x: clampToViewbox((start.x + end.x) / 2, viewbox.width),
    y: clampToViewbox(Math.min(start.y, end.y) - curveOffset, viewbox.height)
  };

  const startX = clampToViewbox(start.x, viewbox.width);
  const startY = clampToViewbox(start.y, viewbox.height);
  const endX = clampToViewbox(end.x, viewbox.width);
  const endY = clampToViewbox(end.y, viewbox.height);

  return `M ${startX} ${startY} Q ${controlPoint.x} ${controlPoint.y} ${endX} ${endY}`;
}
