import React, { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input">
      <div className="input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything"
          rows={1}
          className="input-field"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="send-button"
          title="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L12 4M12 4L19.071 11.071M12 4L4.929 11.071M12 20L12 22M12 20L19.071 12.929M12 20L4.929 12.929M4.929 11.071L2.1 10.1L10.1 2.1L11.071 4.929M19.071 11.071L21.9 10.1L13.9 2.1L12.929 4.929M4.929 12.929L2.1 13.9L10.1 21.9L11.071 19.071M19.071 12.929L21.9 13.9L13.9 21.9L12.929 19.071" />
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
            <path d="M7 12 L12 7 L17 12 L12 17 Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;

