'use client';

import { useState } from 'react';
import { useAssistant } from 'ai/react';

export default function Chat() {
  const { status, messages, input, submitMessage, handleInputChange } = useAssistant({
    api: '/api/assistant',
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{`${message.role}: `}</strong>
          {message.content}
        </div>
      ))}
      {status === 'in_progress' && <div>Loading...</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitMessage();
        }}
      >
        <input
          disabled={status !== 'awaiting_message'}
          value={input}
          placeholder="Ask a question..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}
