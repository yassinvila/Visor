import React from 'react';
import './components.css';

type Variant = 'primary' | 'ghost';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export const VisorButton: React.FC<Props> = ({ variant = 'primary', className = '', ...rest }) => {
  const classes = [
    'visor-button',
    variant === 'ghost' ? 'visor-button--ghost' : 'visor-button--primary',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...rest} />;
};
