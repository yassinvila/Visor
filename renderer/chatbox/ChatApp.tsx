import React, { useEffect, useRef, useState } from 'react';
import { VisorButton } from '@components/button';
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

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <div>
          <p className="chat-label">Visor Copilot</p>
          <h1>Describe the task you need help with</h1>
        </div>
        <span className={`status-pill ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Connected' : 'Offline mock'}
        </span>
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

      <form className="chat-input" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Example: Walk me through updating Salesforce lead status"
          rows={3}
        />
        <div className="chat-actions">
          <VisorButton type="submit" disabled={!input.trim()}>
            Ask Visor
          </VisorButton>
        </div>
      </form>
    </div>
  );
};
