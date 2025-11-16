import React from 'react';
import './components.css';

type Variant = 'primary' | 'ghost';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

export const VisorButton: React.FC<Props> = ({ variant = 'primary', className = '', loading = false, disabled, children, ...rest }) => {
  const classes = [
    'visor-button',
    variant === 'ghost' ? 'visor-button--ghost' : 'visor-button--primary',
    loading ? 'visor-button--loading' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

    return (
      <button className={classes} disabled={disabled || loading} {...rest}>
        {loading ? (
          <>
            <span className="visor-button-spinner" />
            <span style={{ opacity: 0.7 }}>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
};
