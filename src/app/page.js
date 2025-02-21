'use client';

import { useChat } from '@ai-sdk/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    maxSteps: 5,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md shadow-lg bg-white dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="h-96 overflow-y-auto space-y-4">
            {messages.map(m => (
              <div
                key={m.id}
                className={`p-3 rounded-lg ${
                  m.role === 'user'
                    ? 'bg-blue-500 text-white self-end'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                {m.role === 'user' ? 'You: ' : 'AI: '}
                {m.toolInvocations ? (
                  <pre>{JSON.stringify(m.toolInvocations, null, 2)}</pre>
                ) : (
                  <p>{m.content}</p>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
            <Input
              className="flex-1"
              value={input}
              placeholder="Say something..."
              onChange={handleInputChange}
            />
            <Button type="submit">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}