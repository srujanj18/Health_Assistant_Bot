import React from 'react';

interface ChatHistoryProps {
  messages: { text: string; sender: 'bot' | 'user' }[];
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  return (
    <div className="chat-history">
      <h2 className="text-xl font-bold mb-4">Chat History</h2>
      {messages.map((message, index) => (
        <div key={index} className={`mb-2 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
          <div className={`inline-block p-3 rounded-lg max-w-[80%] ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}>
            {message.text}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatHistory; 