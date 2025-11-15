import React from 'react';
import './components.css';

type Props = {
  label?: string;
};

export const LoadingSpinner: React.FC<Props> = ({ label = 'Loading…' }) => {
  return (
    <div className="loading-spinner">
      <span className="loading-spinner__icon" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
};
