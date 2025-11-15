import React, { useEffect, useRef, useState } from 'react';
import { LoadingSpinner } from '@components/loadingSpinner';
import './chat.css';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const seedMessages: ChatMessage[] = [
  { id: 'c1', role: 'assistant', content: 'Hi! What workflow should we tackle?' }
];

export const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [input, setInput] = useState('Show me how to create a Jira ticket.');
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const chatBridge = typeof window !== 'undefined' ? window.visor?.chat : undefined;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const hydrate = async () => {
      if (!chatBridge?.loadHistory) {
        setIsConnected(false);
        return;
      }
      const history = await chatBridge.loadHistory();
      if (history?.length) {
        setMessages(history);
      }
      setIsConnected(true);
    };

    hydrate();

    if (chatBridge?.onMessage) {
      unsubscribe = chatBridge.onMessage((message) => {
        setMessages((prev) => [...prev, message]);
      });
    }

    return () => unsubscribe?.();
  }, [chatBridge]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim()
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setIsSending(true);

    chatBridge?.sendMessage?.(newMessage.content);

    if (!chatBridge?.sendMessage) {
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Working on it! I will highlight the next action on screen.'
          }
        ]);
        setIsSending(false);
      }, 600);
      return;
    }

    // When we have a backend we rely on the onMessage listener for responses
    setIsSending(false);
  };

  const expandPanel = () => setIsExpanded(true);
  const collapsePanel = () => setIsExpanded(false);

  return (
    <div className="chat-shell">
      <div className={`chat-panel ${isExpanded ? 'expanded' : 'collapsed'} no-drag`}>
        {isExpanded && (
          <>
            <header className="chat-header">
              <span className="chat-status-dot" data-connected={isConnected} />
              <p>Visor Copilot</p>
              <button
                type="button"
                className="icon-button"
                onClick={collapsePanel}
                aria-label="Collapse panel"
              >
                ⌄
              </button>
            </header>

            <div className="chat-messages" ref={listRef}>
              {messages.map((message) => (
                <article key={message.id} className={`chat-bubble chat-${message.role}`}>
                  <p>{message.content}</p>
                </article>
              ))}
              {isSending && (
                <div className="chat-bubble chat-assistant">
                  <LoadingSpinner label="Visor thinking" />
                </div>
              )}
            </div>
          </>
        )}

        <form
          className="chat-input-bar"
          onSubmit={handleSubmit}
          onFocus={expandPanel}
          onClick={expandPanel}
        >
          <button type="button" className="icon-button" aria-label="Add attachment">
            +
          </button>
          <button type="button" className="icon-button" aria-label="Choose model">
            🌐
          </button>
          <button type="button" className="icon-button" aria-label="Enable recording">
            🎙️
          </button>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask anything"
          />
          <button type="button" className="icon-button" aria-label="Voice input">
            🔘
          </button>
          <button type="submit" className="send-button" disabled={!input.trim()}>
            ↑
          </button>
        </form>
      </div>
    </div>
  );
};
