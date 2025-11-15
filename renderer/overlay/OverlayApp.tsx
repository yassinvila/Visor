import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { VisorButton } from '@components/button';
import { LoadingSpinner } from '@components/loadingSpinner';
import type { AnnotationConfig, GuidanceStep } from './types';
import { buildAnnotationConfig } from './drawing/rendererUtils';
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

type OverlayStatus = 'idle' | 'guiding' | 'paused';

export const OverlayApp: React.FC = () => {
  const [steps, setSteps] = useState<GuidanceStep[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState<OverlayStatus>('idle');
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const overlayBridge = typeof window !== 'undefined' ? window.visor?.overlay : undefined;

  const currentStep = steps[activeIndex];
  const annotationConfig: AnnotationConfig | undefined = currentStep
    ? buildAnnotationConfig(currentStep)
    : undefined;

  const isReady = Boolean(currentStep) && status !== 'idle';

  useEffect(() => {
    if (steps.length === 0) {
      setSteps(mockSteps);
      setStatus('guiding');
    }
  }, [steps.length]);

  useEffect(() => {
    if (!overlayBridge) {
      return;
    }

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
      setIsLoading(false);
      setStatus('guiding');
    });

    const unsubscribeReset = overlayBridge.onReset?.(() => {
      setSteps([]);
      setActiveIndex(0);
      setStatus('idle');
    });

    return () => {
      unsubscribeStep?.();
      unsubscribeReset?.();
    };
  }, [overlayBridge]);

  const toggleOverlay = useCallback(() => {
    setStatus((prev) => (prev === 'guiding' ? 'paused' : 'guiding'));
    overlayBridge?.toggle?.();
  }, [overlayBridge]);
  const setPointerMode = useCallback(
    (mode: 'interactive' | 'passthrough') => {
      overlayBridge?.setPointerMode?.(mode);
    },
    [overlayBridge]
  );


  const markStepComplete = useCallback(() => {
    if (!currentStep) return;

    setIsLoading(true);
    overlayBridge?.markDone?.(currentStep.id);

    setActiveIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= steps.length) {
        setStatus('idle');
        setIsLoading(false);
        return prev;
      }
      return nextIndex;
    });
  }, [currentStep, overlayBridge, steps.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey || !event.shiftKey) return;

      switch (event.key.toLowerCase()) {
        case 'o':
          event.preventDefault();
          toggleOverlay();
          break;
        case 'd':
          event.preventDefault();
          markStepComplete();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleOverlay, markStepComplete]);

  const goToPrevious = () => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  };

  const toggleAutoAdvance = () => {
    const newValue = !autoAdvance;
    setAutoAdvance(newValue);
    overlayBridge?.setAutoAdvance?.(newValue);
  };

  const timeline = useMemo(
    () =>
      steps.map((step, index) => ({
        ...step,
        status:
          index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'
      })),
    [steps, activeIndex]
  );

  return (
    <div className={`overlay-shell status-${status}`}>
      <AnnotationLayer config={annotationConfig} isActive={status === 'guiding'} />

      <aside
        className="overlay-panel"
        onMouseEnter={() => setPointerMode('interactive')}
        onMouseLeave={() => setPointerMode('passthrough')}
      >
        <header className="overlay-panel__header">
          <div>
            <p className="panel-label">Visor Guidance</p>
            <h1 className="panel-title">{currentStep?.title ?? 'Waiting for task'}</h1>
          </div>
          <div className="panel-shortcuts">
            <span>⌘⇧O Pause/Resume</span>
            <span>⌘⇧D Done</span>
          </div>
        </header>

        {!isReady && (
          <div className="panel-empty">
            {isLoading ? (
              <LoadingSpinner label="Waiting for next instruction" />
            ) : (
              <p>No active guidance. Trigger a task to begin.</p>
            )}
          </div>
        )}

        {isReady && currentStep && (
          <div className="panel-body">
            <p className="step-description">{currentStep.description}</p>
            <p className="step-hint">{currentStep.actionHint}</p>
            <div className="panel-controls">
              <VisorButton variant="ghost" onClick={goToPrevious} disabled={activeIndex === 0}>
                Back
              </VisorButton>
              <VisorButton variant="ghost" onClick={toggleOverlay}>
                {status === 'guiding' ? 'Pause' : 'Resume'}
              </VisorButton>
              <VisorButton onClick={markStepComplete} disabled={isLoading}>
                {autoAdvance ? 'Auto moving…' : 'Done'}
              </VisorButton>
            </div>
          </div>
        )}

        <section className="panel-timeline">
          {timeline.map((item) => (
            <article key={item.id} className={`timeline-step timeline-${item.status}`}>
              <div className="timeline-marker" />
              <div>
                <p className="timeline-title">{item.title}</p>
                <p className="timeline-description">{item.description}</p>
              </div>
            </article>
          ))}
        </section>
      </aside>
    </div>
  );
};

interface AnnotationLayerProps {
  config?: AnnotationConfig;
  isActive: boolean;
}

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({ config, isActive }) => {
  const viewportWidth =
    typeof window !== 'undefined' ? window.innerWidth : 1920;
  const viewportHeight =
    typeof window !== 'undefined' ? window.innerHeight : 1080;

  if (!config) {
    return <div className="annotation-layer" />;
  }

  const { boxStyle, type, arrowPath, tooltipPosition } = config;

  return (
    <div className={`annotation-layer ${isActive ? 'active' : 'paused'}`}>
      <div className={`annotation-target annotation-${type}`} style={boxStyle} />
      {type === 'arrow' && arrowPath && (
        <svg
          className="annotation-arrow"
          viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
        >
          <path d={arrowPath} />
        </svg>
      )}
      {type === 'tooltip' && tooltipPosition && (
        <div className="annotation-tooltip" style={tooltipPosition}>
          Action here
        </div>
      )}
    </div>
  );
};
