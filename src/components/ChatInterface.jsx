import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { chatWithInvoice } from '../services/chatService';
import ReactMarkdown from 'react-markdown';

const QuickAction = ({ text, onClick }) => (
  <button
    onClick={onClick}
    className="text-sm px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors"
  >
    {text}
  </button>
);

const ChatInterface = ({ invoiceData }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    "Summarize the invoice",
    "Calculate total with tax",
    "Check payment status",
    "Verify vendor details",
    "Extract dates",
    "Compare with standard terms"
  ];

  const handleQuickAction = (action) => {
    setInputMessage(action);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let assistantMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      const response = await chatWithInvoice(
        inputMessage,
        invoiceData,
        (progress) => {
          setMessages(prev => [
            ...prev.slice(0, -1),
            { ...assistantMessage, content: progress },
          ]);
        }
      );

      assistantMessage.content = response;
      setMessages(prev => [...prev.slice(0, -1), assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'error',
          content: 'Sorry, there was an error processing your request.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-[1px] rounded-xl mt-8">
      <div className="bg-gray-900/70 backdrop-blur-md rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Chat with Invoice</h3>
        
        <div className="flex flex-col space-y-4">
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto space-y-4 pr-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="text-white text-center py-4">
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto mb-4">
                    <img 
                      src="/chat-icon.svg" 
                      alt="Chat Icon" 
                      className="w-full h-full opacity-50 [filter:invert(1)_brightness(100)]" 
                    />
                  </div>
                  <p className="text-lg text-white font-medium">Ask questions about this invoice!</p>
                  <p className="text-sm text-white/80 mt-2">Use the quick actions above or type your question below</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`relative max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.role === 'error'
                        ? 'bg-red-600/20 text-red-200'
                        : 'bg-gray-700/50 text-white'
                    }`}
                  >
                    <ReactMarkdown 
                      className="text-white space-y-4"
                      components={{
                        p: ({ node, ...props }) => <p className="text-white" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-white text-2xl mb-4" {...props} />,
                        ul: ({ node, ...props }) => <ul className="space-y-3" {...props} />,
                        li: ({ node, ...props }) => (
                          <p className="text-white" {...props}>
                            {props.children}
                          </p>
                        )
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                    <div className="text-xs text-white/60 mt-1">
                      {message.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions - Only show when no messages */}
          {messages.length === 0 && (
            <div className="flex flex-wrap justify-center gap-2 pb-4">
              {quickActions.map((action, index) => (
                <QuickAction
                  key={index}
                  text={action}
                  onClick={() => handleQuickAction(action)}
                />
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="flex items-center space-x-2 bg-gray-800/30 rounded-lg p-2 backdrop-blur-sm">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question about this invoice..."
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-white placeholder-white/60"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputMessage.trim()}
              className={`p-2 rounded-lg ${
                isLoading || !inputMessage.trim()
                  ? 'bg-gray-700/50 text-gray-400'
                  : 'bg-blue-600/80 text-white hover:bg-blue-600 transition-colors'
              }`}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
