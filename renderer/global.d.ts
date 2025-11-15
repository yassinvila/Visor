import type { GuidanceStep } from './overlay/types';

declare global {
  interface Window {
    visor?: {
      overlay?: {
        ready?: () => void;
        toggle?: () => void;
        markDone?: (stepId: string) => void;
        setAutoAdvance?: (enabled: boolean) => void;
        setPointerMode?: (mode: 'interactive' | 'passthrough') => void;
        onStepUpdate?: (cb: (step: GuidanceStep) => void) => () => void;
        onReset?: (cb: () => void) => () => void;
      };
      chat?: {
        sendMessage?: (message: string) => void;
        onMessage?: (
          cb: (payload: { id: string; role: 'user' | 'assistant'; content: string }) => void
        ) => () => void;
        loadHistory?: () => Promise<
          { id: string; role: 'user' | 'assistant'; content: string }[]
        >;
      };
    };
  }
}

export {};
