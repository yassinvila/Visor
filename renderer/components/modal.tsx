import React from 'react';
import './components.css';
import { VisorButton } from './button';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export const VisorModal: React.FC<ModalProps> = ({ title, onClose, children }) => {
  return (
    <div className="visor-modal__backdrop">
      <div className="visor-modal">
        <header className="visor-modal__header">
          <h2>{title}</h2>
          <VisorButton variant="ghost" onClick={onClose} aria-label="Close">
            ✕
          </VisorButton>
        </header>
        <div className="visor-modal__body">{children}</div>
      </div>
    </div>
  );
};
