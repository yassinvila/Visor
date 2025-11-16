import type { CSSProperties } from 'react';

export type AnnotationType = 'circle' | 'arrow' | 'box';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StepViewport {
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export interface OverlayInstruction {
  id: string;
  step_description: string;
  shape: AnnotationType;
  label: string;
  bbox: NormalizedBoundingBox;
  bboxPixels?: BoundingBox | null;
  viewport?: StepViewport;
  is_final_step: boolean;
  screenshotMeta?: {
    width: number;
    height: number;
    timestamp?: number;
    mock?: boolean;
  };
}

export interface AnnotationConfig {
  type: AnnotationType;
  boxStyle: CSSProperties;
  arrowPath?: string;
}
