import React, { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { BoundingBox, OverlayInstruction } from './types';
import { buildAnnotationConfig } from './drawing/rendererUtils';

interface AnnotationLayerProps {
  instruction: OverlayInstruction | null;
  viewportWidth: number;
  viewportHeight: number;
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  instruction,
  viewportWidth,
  viewportHeight
}) => {
  const boundingBox = useMemo(
    () => computeBoundingBox(instruction, viewportWidth, viewportHeight),
    [instruction, viewportWidth, viewportHeight]
  );

  if (!instruction || !boundingBox) {
    return null;
  }

  const config = buildAnnotationConfig(instruction.shape, boundingBox);
  const labelStyle = getLabelStyle(boundingBox, viewportWidth, viewportHeight);

  return (
    <div className="annotation-layer">
      {config.type === 'box' && <div className="annotation-box" style={config.boxStyle} />}
      {config.type === 'circle' && <div className="annotation-circle" style={config.boxStyle} />}
      {config.type === 'arrow' && config.arrowPath && (
        <svg
          className="annotation-arrow"
          viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <path d={config.arrowPath} />
        </svg>
      )}
      <div className="annotation-label" style={labelStyle}>
        {instruction.label}
      </div>
    </div>
  );
};

function computeBoundingBox(
  instruction: OverlayInstruction | null,
  viewportWidth: number,
  viewportHeight: number
): BoundingBox | null {
  if (!instruction) {
    return null;
  }

  const fallbackWidth = viewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
  const fallbackHeight = viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080);

  const sourceWidth = instruction.viewport?.width ?? fallbackWidth;
  const sourceHeight = instruction.viewport?.height ?? fallbackHeight;
  const scaleX = sourceWidth ? fallbackWidth / sourceWidth : 1;
  const scaleY = sourceHeight ? fallbackHeight / sourceHeight : 1;

  const sourceBox: BoundingBox | null = instruction.bboxPixels
    ? {
        x: instruction.bboxPixels.x,
        y: instruction.bboxPixels.y,
        width: instruction.bboxPixels.width,
        height: instruction.bboxPixels.height
      }
    : instruction.bbox
    ? {
        x: instruction.bbox.x * sourceWidth,
        y: instruction.bbox.y * sourceHeight,
        width: instruction.bbox.width * sourceWidth,
        height: instruction.bbox.height * sourceHeight
      }
    : null;

  if (!sourceBox) {
    return null;
  }

  return clampBoundingBox(
    {
      x: sourceBox.x * scaleX,
      y: sourceBox.y * scaleY,
      width: sourceBox.width * scaleX,
      height: sourceBox.height * scaleY
    },
    fallbackWidth,
    fallbackHeight
  );
}

function clampBoundingBox(box: BoundingBox, maxWidth: number, maxHeight: number): BoundingBox {
  const width = Math.min(box.width, maxWidth);
  const height = Math.min(box.height, maxHeight);

  return {
    x: Math.min(Math.max(box.x, 0), Math.max(0, maxWidth - width)),
    y: Math.min(Math.max(box.y, 0), Math.max(0, maxHeight - height)),
    width: Math.max(1, width),
    height: Math.max(1, height)
  };
}

function getLabelStyle(box: BoundingBox, viewportWidth: number, viewportHeight: number): CSSProperties {
  const padding = 12;
  const maxLeft = Math.max(0, viewportWidth - 220);
  const left = Math.min(Math.max(box.x, 0), maxLeft);
  const top = Math.min(box.y + box.height + padding, Math.max(0, viewportHeight - 60));

  return {
    left: `${left}px`,
    top: `${top}px`
  };
}

