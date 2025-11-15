import React, { useCallback, useEffect, useState } from 'react';
import { VisorButton } from '@components/button';
import type { GuidanceStep } from './types';
import './overlay.css';

const mockSteps: GuidanceStep[] = [
  {
    id: 'step-1',
    title: 'Open Settings',
    description: 'Click the gear icon to open the settings drawer.',
    actionHint: 'Look for the small gear on the top right.',
    annotation: 'circle',
    target: { x: 1180, y: 40, width: 48, height: 48 }
  },
  {
    id: 'step-2',
    title: 'Enable Feature',
    description: 'Toggle on "Guided Mode".',
    actionHint: 'The switch will turn blue when active.',
    annotation: 'arrow',
    target: { x: 1050, y: 220, width: 180, height: 50 }
  }
];

export const OverlayApp: React.FC = () => {
  const [steps, setSteps] = useState<GuidanceStep[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const overlayBridge = typeof window !== 'undefined' ? window.visor?.overlay : undefined;
  const currentStep = steps[activeIndex];
  const remainingSteps = steps.slice(activeIndex);

  useEffect(() => {
    if (steps.length === 0) {
      setSteps(mockSteps);
    }
  }, [steps.length]);

  useEffect(() => {
    if (!overlayBridge) return;

    overlayBridge.ready?.();

    const unsubscribeStep = overlayBridge.onStepUpdate?.((incomingStep) => {
      setSteps((prev) => {
        const existingIndex = prev.findIndex((step) => step.id === incomingStep.id);
        if (existingIndex >= 0) {
          const clone = [...prev];
          clone[existingIndex] = incomingStep;
          return clone;
        }
        return [...prev, incomingStep];
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
    setActiveIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [currentStep, overlayBridge, steps.length]);

  const setPointerMode = useCallback(
    (mode: 'interactive' | 'passthrough') => {
      overlayBridge?.setPointerMode?.(mode);
    },
    [overlayBridge]
  );

  return (
    <div className="overlay-shell">
      <section
        className="overlay-card"
        onMouseEnter={() => setPointerMode('interactive')}
        onMouseLeave={() => setPointerMode('passthrough')}
      >
        <p className="overlay-label">Next steps</p>
        <h1 className="overlay-title">{currentStep?.title ?? 'Waiting for instructions'}</h1>
        <p className="overlay-text">
          {currentStep?.description ?? 'Trigger a task from the chat window to get started.'}
        </p>

        {remainingSteps.length > 0 && (
          <ol className="overlay-step-list">
            {remainingSteps.map((step, idx) => (
              <li key={step.id} className={idx === 0 ? 'overlay-step-active' : ''}>
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </li>
            ))}
          </ol>
        )}

        <VisorButton onClick={markStepComplete} disabled={!currentStep}>
          Done
        </VisorButton>
      </section>
    </div>
  );
};
