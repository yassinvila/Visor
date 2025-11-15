import React, { useState } from 'react';
import { ipcRenderer } from 'electron';

const ChatHeader: React.FC = () => {
  const [isPinned, setIsPinned] = useState(true);

  const handleMinimize = () => {
    ipcRenderer.send('window-minimize');
  };

  const handleClose = () => {
    ipcRenderer.send('window-close');
  };

  const handleTogglePin = () => {
    setIsPinned(!isPinned);
    ipcRenderer.send('window-toggle-pin');
  };

  return (
    <div className="chat-header" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="header-content">
        <div className="header-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>ChatBox</span>
        </div>
        <div className="header-controls" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            className={`control-button ${isPinned ? 'active' : ''}`}
            onClick={handleTogglePin}
            title={isPinned ? 'Unpin window' : 'Pin window on top'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M16 3L8 3L8 10L5 10L12 17L19 10L16 10L16 3Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            className="control-button"
            onClick={handleMinimize}
            title="Minimize"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12H19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            className="control-button close"
            onClick={handleClose}
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;

