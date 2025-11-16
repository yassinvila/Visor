import React from 'react';
import { createRoot } from 'react-dom/client';
import './chat.css';
import { ChatApp } from './ChatApp';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Chat root element not found');
}

const root = createRoot(container);
root.render(<ChatApp />);
