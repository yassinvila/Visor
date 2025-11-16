import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { VisorButton } from '@components/button';
import { AnnotationLayer } from './AnnotationLayer';
import type { OverlayInstruction } from './types';
import './overlay.css';

const DEFAULT_VIEWPORT = {
  width: typeof window !== 'undefined' ? window.innerWidth : 1920,
  height: typeof window !== 'undefined' ? window.innerHeight : 1080
};

export const OverlayApp: React.FC = () => {
  const [steps, setSteps] = useState<OverlayInstruction[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportSize, setViewportSize] = useState(DEFAULT_VIEWPORT);

  const overlayBridge = typeof window !== 'undefined' ? window.visor?.overlay : undefined;
  const currentStep = steps[activeIndex] ?? null;
  const remainingSteps = useMemo(() => steps.slice(activeIndex), [steps, activeIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!overlayBridge) return;

    overlayBridge.ready?.();

    const unsubscribeStep = overlayBridge.onStepUpdate?.((incomingStep: OverlayInstruction) => {
      setSteps((prev) => {
        const existingIndex = prev.findIndex((step) => step.id === incomingStep.id);
        let nextSteps: OverlayInstruction[];
        let nextActiveIndex: number;

        if (existingIndex >= 0) {
          nextSteps = [...prev];
          nextSteps[existingIndex] = incomingStep;
          nextActiveIndex = existingIndex;
        } else {
          nextSteps = [...prev, incomingStep];
          nextActiveIndex = nextSteps.length - 1;
        }

        setActiveIndex(nextActiveIndex);
        return nextSteps;
      });
    });

    const unsubscribeReset = overlayBridge.onReset?.(() => {
      setSteps([]);
      setActiveIndex(0);
    });

    return () => {
      unsubscribeStep?.();
      unsubscribeReset?.();
    };
  }, [overlayBridge]);

  const markStepComplete = useCallback(() => {
    if (!currentStep) return;
    overlayBridge?.markDone?.(currentStep.id);
  }, [currentStep, overlayBridge]);

  const setPointerMode = useCallback(
    (mode: 'interactive' | 'passthrough') => {
      overlayBridge?.setPointerMode?.(mode);
    },
    [overlayBridge]
  );

  return (
    <div className="overlay-shell">
      <AnnotationLayer
        instruction={currentStep}
        viewportWidth={viewportSize.width}
        viewportHeight={viewportSize.height}
      />

      <section
        className="overlay-card"
        onMouseEnter={() => setPointerMode('interactive')}
        onMouseLeave={() => setPointerMode('passthrough')}
      >
        <p className="overlay-label">{currentStep ? 'Next step' : 'Waiting for instructions'}</p>
        <h1 className="overlay-title">{currentStep?.label ?? 'No instruction yet'}</h1>
        <p className="overlay-text">
          {currentStep?.step_description ?? 'Trigger a task from the chat window to get started.'}
        </p>

        {remainingSteps.length > 0 && (
          <ol className="overlay-step-list">
            {remainingSteps.map((step, idx) => (
              <li key={step.id} className={idx === 0 ? 'overlay-step-active' : ''}>
                <strong>{step.label}</strong>
                <span>{step.step_description}</span>
              </li>
            ))}
          </ol>
        )}

        <VisorButton onClick={markStepComplete} disabled={!currentStep}>
          Mark done
        </VisorButton>
      </section>
    </div>
  );
};
