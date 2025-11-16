import React, { forwardRef } from 'react';

type PillHeaderProps = {
  label: string;
  ariaLabel?: string;
  className?: string;
  onActivate: () => void;
};

const PillHeader = forwardRef<HTMLButtonElement, PillHeaderProps>(
  ({ label, ariaLabel, className, onActivate }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        className={className ?? 'pill-header'}
        aria-label={ariaLabel || label}
        onClick={onActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
          }
        }}
      >
        <span className="pill-label">{label}</span>
      </button>
    );
  }
);

PillHeader.displayName = 'PillHeader';

export default PillHeader;
