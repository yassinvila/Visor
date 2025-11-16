import React, { useEffect, useState } from 'react';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import './chat.css';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
};

const seedMessages: ChatMessage[] = [
  { 
    id: 'c1', 
    role: 'assistant', 
    content: 'Hi! What workflow should we tackle?',
    timestamp: new Date()
  }
];

export const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const chatBridge = typeof window !== 'undefined' ? window.visor?.chat : undefined;

  // Subscribe to new messages (no history preload — start with a single Visor seed message)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const hydrate = async () => {
      // For now, just mark connected if the bridge exists; do not backfill history.
      setIsConnected(Boolean(chatBridge));
    };

    hydrate();

    if (chatBridge?.onMessage) {
      unsubscribe = chatBridge.onMessage((message) => {
        setMessages((prev) => [...prev, {
          ...message,
          timestamp: new Date()
        }]);
        setIsTyping(false);
      });
    }

    return () => unsubscribe?.();
  }, [chatBridge]);

  const handleSendMessage = async (content: string) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsTyping(true);

    // Send to Visor backend via IPC
    chatBridge?.sendMessage?.(newMessage.content);

    // Fallback demo mode if no backend
    if (!chatBridge?.sendMessage) {
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Working on it! I will highlight the next action on screen.',
            timestamp: new Date()
          }
        ]);
        setIsTyping(false);
      }, 1000);
    }
  };

  return (
    <div className={`app-container ${isCollapsed ? 'collapsed' : ''}`}>
      {!isCollapsed && <ChatHeader isConnected={isConnected} />}
      {!isCollapsed && <MessageList messages={messages} isTyping={isTyping} />}
      <ChatInput
        onSendMessage={handleSendMessage}
        onFocusInput={() => setIsCollapsed(false)}
      />
    </div>
  );
};
