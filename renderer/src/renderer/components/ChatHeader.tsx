import React from 'react';
import { ipcRenderer } from 'electron';

const ChatHeader: React.FC = () => {
  const handleClose = () => {
    ipcRenderer.send('window-close');
  };

  return (
    <div className="chat-header" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="header-content">
        <div className="header-spacer"></div>
        <button
          className="close-button"
          onClick={handleClose}
          title="Close"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 1L11 11M1 11L11 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;

