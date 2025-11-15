import React from 'react';
import { createRoot } from 'react-dom/client';
import { OverlayApp } from './OverlayApp';
import './overlay.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Overlay root element not found');
}

const root = createRoot(container);
root.render(<OverlayApp />);
