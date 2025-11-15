import type { CSSProperties } from 'react';
import type { AnnotationConfig, GuidanceStep } from '../types';
import { circleStyle } from './circle';
import { buildArrowPath } from './arrow';
import { tooltipStyle } from './tooltip';

export function buildAnnotationConfig(step: GuidanceStep): AnnotationConfig {
  const baseBox: CSSProperties = {
    left: `${step.target.x}px`,
    top: `${step.target.y}px`,
    width: `${step.target.width}px`,
    height: `${step.target.height}px`
  };

  if (step.annotation === 'circle') {
    return {
      type: step.annotation,
      boxStyle: circleStyle(step.target)
    };
  }

  if (step.annotation === 'arrow') {
    return {
      type: step.annotation,
      boxStyle: baseBox,
      arrowPath: buildArrowPath(step.target)
    };
  }

  if (step.annotation === 'tooltip') {
    return {
      type: step.annotation,
      boxStyle: baseBox,
      tooltipPosition: tooltipStyle(step.target)
    };
  }

  return {
    type: 'circle',
    boxStyle: baseBox
  };
}
