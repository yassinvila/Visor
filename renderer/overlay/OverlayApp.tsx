import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number }>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const defaultWidth = 320;
    const padding = 32;
    return { x: Math.max(0, w - defaultWidth - padding), y: padding };
  });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);

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
      // Keep the card inside viewport on resize
      setCardPosition((pos) => {
        const el = cardRef.current;
        const width = el ? el.offsetWidth : 320;
        const height = el ? el.offsetHeight : 200;
        const maxX = Math.max(0, window.innerWidth - width - 8);
        const maxY = Math.max(0, window.innerHeight - height - 8);
        return {
          x: Math.max(0, Math.min(pos.x, maxX)),
          y: Math.max(0, Math.min(pos.y, maxY))
        };
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

  // Drag handlers for the overlay card
  const onCardMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      x: cardPosition.x,
      y: cardPosition.y
    };
    // ensure window catches mouse
    overlayBridge?.setPointerMode?.('interactive');
  }, [cardPosition, overlayBridge]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const el = cardRef.current;
      const width = el ? el.offsetWidth : 320;
      const height = el ? el.offsetHeight : 200;
      const maxX = Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : viewportSize.width) - width - 8);
      const maxY = Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : viewportSize.height) - height - 8);
      setCardPosition({
        x: Math.max(0, Math.min(maxX, dragStartRef.current.x + dx)),
        y: Math.max(0, Math.min(maxY, dragStartRef.current.y + dy))
      });
    };
    const onUp = () => {
      setDragging(false);
      dragStartRef.current = null;
      overlayBridge?.setPointerMode?.('passthrough');
    };
    if (dragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp, { once: true });
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, overlayBridge, viewportSize.height, viewportSize.width]);

  return (
    <div className="overlay-shell">
      <AnnotationLayer
        instruction={currentStep}
        viewportWidth={viewportSize.width}
        viewportHeight={viewportSize.height}
      />

      <section
        ref={(el) => { cardRef.current = el as HTMLElement; }}
        className={`overlay-card ${dragging ? 'overlay-card-dragging' : ''}`}
        style={{ position: 'absolute', left: `${cardPosition.x}px`, top: `${cardPosition.y}px`, cursor: dragging ? 'grabbing' : 'grab' } as React.CSSProperties}
        onMouseEnter={() => setPointerMode('interactive')}
        onMouseLeave={() => !dragging && setPointerMode('passthrough')}
        onMouseDown={onCardMouseDown}
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
