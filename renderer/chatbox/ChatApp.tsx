import React, { useEffect, useRef, useState } from 'react';
import MessageList from './components/MessageList';
import PillHeader from './components/PillHeader';
import './chat.css';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
};

type MessageListProps = {
  messages: ChatMessage[];
  isTyping?: boolean;
};

const seedMessages: ChatMessage[] = [
  {
    id: 'c1',
    role: 'assistant',
    content: 'Hi! What workflow should we tackle?',
    timestamp: new Date(),
  },
];

export const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [expanded, setExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const expand = () => {
    setExpanded(true);
    composerRef.current?.focus();
    rootRef.current?.setAttribute('aria-expanded', 'true');
  };

  const collapse = () => {
    setExpanded(false);
    headerRef.current?.focus();
    rootRef.current?.setAttribute('aria-expanded', 'false');
  };

  const toggleExpand = () => {
    expanded ? collapse() : expand();
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (expanded && rootRef.current && !rootRef.current.contains(e.target as Node)) {
      collapse();
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expanded) {
        e.preventDefault();
        collapse();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  // Load persisted chat history on mount
  // Clear history on mount and start fresh
  useEffect(() => {
    (async () => {
      try { await (window as any)?.visor?.chat?.clearHistory?.(); } catch (_) {}
    })();
    setMessages([]);
  }, []);

  // Focus composer when expanded becomes true
  useEffect(() => {
    if (expanded) {
      requestAnimationFrame(() => composerRef.current?.focus());
    }
  }, [expanded]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    const newMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    try { (window as any)?.visor?.chat?.sendMessage?.(text); } catch (_) {}
    // Show a brief typing indicator while backend works
    setIsTyping(true);
    window.setTimeout(() => setIsTyping(false), 2000);
    // Keep focus for quick follow-ups
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const handleClearHistory = async () => {
    try {
      const res = await (window as any)?.visor?.chat?.clearHistory?.();
      setMessages([]);
    } catch (_) {}
  };

  return (
    <div
      id="chat-root"
      ref={rootRef}
      className={`chat ${expanded ? 'expanded' : 'compact'}`}
      aria-expanded={expanded}
    >
      <div className="pill-container">
        <PillHeader
          ref={headerRef}
          className="pill-header"
          ariaLabel="Chat with VISOR"
          label="Ask VISOR..."
          onActivate={toggleExpand}
        />
        {expanded && (
          <div className="pill-toolbar">
            <button className="clear-history" onClick={handleClearHistory} title="Clear chat history">Clear</button>
          </div>
        )}
        <section className="messages" aria-live="polite" hidden={!expanded}>
          <MessageList messages={messages} isTyping={isTyping} />
        </section>
        {expanded && (
          <div className="composer">
            <textarea
              ref={composerRef}
              className="composer-input"
              placeholder="Ask VISOR..."
              aria-label="Chat input"
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                const isModEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
                if ((e.key === 'Enter' && !e.shiftKey) || isModEnter) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              autoFocus
            />
            <button className="send-button" onClick={handleSend} disabled={!inputValue.trim()}>
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
