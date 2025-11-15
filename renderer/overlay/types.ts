export type AnnotationType = 'circle' | 'arrow' | 'tooltip';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GuidanceStep {
  id: string;
  title: string;
  description: string;
  actionHint: string;
  annotation: AnnotationType;
  target: BoundingBox;
  screenshotUrl?: string;
}

import type { CSSProperties } from 'react';

export interface AnnotationConfig {
  type: AnnotationType;
  boxStyle: CSSProperties;
  arrowPath?: string;
  tooltipPosition?: CSSProperties;
}
