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
  const [loading, setLoading] = useState(false);
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
  const [isMoving, setIsMoving] = useState(false);
  const moveTimeoutRef = useRef<number | null>(null);

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
      setLoading(false);
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

        // Position the overlay card near the annotation if possible.
        try {
          // compute bounding box in viewport coords
          const sourceWidth = incomingStep.viewport?.width ?? viewportSize.width;
          const sourceHeight = incomingStep.viewport?.height ?? viewportSize.height;
          const scaleX = sourceWidth ? viewportSize.width / sourceWidth : 1;
          const scaleY = sourceHeight ? viewportSize.height / sourceHeight : 1;

          const sourceBox = incomingStep.bboxPixels
            ? {
                x: incomingStep.bboxPixels.x,
                y: incomingStep.bboxPixels.y,
                width: incomingStep.bboxPixels.width,
                height: incomingStep.bboxPixels.height
              }
            : incomingStep.bbox
            ? {
                x: incomingStep.bbox.x * sourceWidth,
                y: incomingStep.bbox.y * sourceHeight,
                width: incomingStep.bbox.width * sourceWidth,
                height: incomingStep.bbox.height * sourceHeight
              }
            : null;

          if (sourceBox) {
            const box = {
              x: Math.max(0, Math.min(sourceBox.x * scaleX, viewportSize.width)),
              y: Math.max(0, Math.min(sourceBox.y * scaleY, viewportSize.height)),
              width: Math.max(1, sourceBox.width * scaleX),
              height: Math.max(1, sourceBox.height * scaleY)
            };

            // compute desired card position to the right of the box, or left if no space
            const padding = 12;
            const defaultCardWidth = 320;
            const defaultCardHeight = 200;
            const el = cardRef.current;
            const cardW = el ? el.offsetWidth : defaultCardWidth;
            const cardH = el ? el.offsetHeight : defaultCardHeight;

            let desiredX = box.x + box.width + padding;
            let desiredY = box.y;

            // if placing to the right would overflow, place to the left
            if (desiredX + cardW + 8 > viewportSize.width) {
              desiredX = Math.max(8, box.x - cardW - padding);
            }

            // clamp vertical position
            if (desiredY + cardH + 8 > viewportSize.height) {
              desiredY = Math.max(8, viewportSize.height - cardH - 8);
            }

            // apply position
            const margin = 24; // keep card away from edges
            const finalX = Math.max(margin, Math.min(Math.round(desiredX), Math.max(margin, viewportSize.width - cardW - margin)));
            const finalY = Math.max(margin, Math.min(Math.round(desiredY), Math.max(margin, viewportSize.height - cardH - margin)));

            // avoid overlapping the annotation: if the computed card rect
            // intersects the annotation box, try alternate placements
            const willOverlap = (x: number, y: number) => {
              const cardRect = { x, y, width: cardW, height: cardH };
              const overlapX = Math.max(0, Math.min(cardRect.x + cardRect.width, box.x + box.width) - Math.max(cardRect.x, box.x));
              const overlapY = Math.max(0, Math.min(cardRect.y + cardRect.height, box.y + box.height) - Math.max(cardRect.y, box.y));
              return overlapX > 0 && overlapY > 0;
            };

            let chosenX = finalX;
            let chosenY = finalY;

            if (willOverlap(chosenX, chosenY)) {
              // Try placing to the left
              const leftX = Math.max(margin, Math.min(Math.round(box.x - cardW - padding), viewportSize.width - cardW - margin));
              if (!willOverlap(leftX, box.y)) {
                chosenX = leftX;
                chosenY = Math.max(margin, Math.min(box.y, viewportSize.height - cardH - margin));
              } else {
                // Try above
                const aboveY = Math.max(margin, Math.min(Math.round(box.y - cardH - padding), viewportSize.height - cardH - margin));
                if (!willOverlap(box.x, aboveY)) {
                  chosenX = Math.max(margin, Math.min(Math.round(box.x), viewportSize.width - cardW - margin));
                  chosenY = aboveY;
                } else {
                  // Try below
                  const belowY = Math.max(margin, Math.min(Math.round(box.y + box.height + padding), viewportSize.height - cardH - margin));
                  chosenX = Math.max(margin, Math.min(Math.round(box.x), viewportSize.width - cardW - margin));
                  chosenY = belowY;
                }
              }
            }

            setIsMoving(true);
            if (moveTimeoutRef.current) {
              window.clearTimeout(moveTimeoutRef.current);
            }
            moveTimeoutRef.current = window.setTimeout(() => {
              setIsMoving(false);
              moveTimeoutRef.current = null;
            }, 320);

            setCardPosition({ x: chosenX, y: chosenY });
          }
        } catch (e) {
          // Ignore positioning errors — keep existing card position
        }
        return nextSteps;
      });
    });

    const unsubscribeReset = overlayBridge.onReset?.(() => {
      setSteps([]);
      setActiveIndex(0);
      setLoading(false); 
    });

    return () => {
      unsubscribeStep?.();
      unsubscribeReset?.();
    };
  }, [overlayBridge]);

  const markStepComplete = useCallback(() => {
    if (!currentStep) return;
    setLoading(true);
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
        className={`overlay-card ${dragging ? 'overlay-card-dragging' : ''} ${isMoving ? 'overlay-moving' : ''}`}
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

<VisorButton onClick={markStepComplete} disabled={!currentStep} loading={loading}>
          Mark done
        </VisorButton>
      </section>
    </div>
  );
};
