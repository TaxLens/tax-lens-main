'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { api, ChatMessage } from '@/lib/api';
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Trash2,
  Calendar,
  Info,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function TaxGPTPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { isCollapsed: sidebarCollapsed } = useSidebar();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.chatWithTaxGPT(trimmedInput, messages, selectedYear);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const suggestedQuestions = [
    "What is the limit for lifestyle tax relief?",
    "How much can I claim for medical expenses?",
    "What expenses qualify for education relief?",
    "What is the SSPN contribution limit?",
    "Can I claim childcare fees?",
  ];

  return (
    <div className="min-h-screen mesh-bg">
      <Sidebar />

      <main
        className={`h-screen flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        } ml-0 pt-16 md:pt-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-midnight-800 bg-midnight-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">TaxGPT</h1>
              <p className="text-xs text-midnight-400">Ask anything about Malaysian tax rules</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-midnight-400" />
              <select
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
                className="px-3 py-1.5 bg-midnight-800 border border-midnight-700 rounded-lg text-sm text-white focus:border-accent-500 focus:outline-none"
              >
                <option value="">All Years</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 text-midnight-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-accent-500/20 to-accent-600/20 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-accent-400" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">Welcome to TaxGPT</h2>
              <p className="text-midnight-400 mb-8 max-w-md">
                I can help you understand Malaysian tax rules, relief categories, and filing requirements based on the documents you've uploaded.
              </p>
              
              {/* Suggested Questions */}
              <div className="w-full max-w-2xl">
                <p className="text-sm text-midnight-500 mb-3">Try asking:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(question);
                        inputRef.current?.focus();
                      }}
                      className="text-left p-3 bg-midnight-800/50 hover:bg-midnight-800 border border-midnight-700 hover:border-accent-500/30 rounded-xl text-sm transition-all"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Note */}
              <div className="mt-8 p-4 bg-midnight-800/30 border border-midnight-700 rounded-xl max-w-md">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-midnight-400">
                    Upload tax rule documents in the <span className="text-accent-400">Tax Rules</span> page to get accurate answers based on official guidelines.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-accent-500 text-white rounded-br-md'
                        : 'bg-midnight-800 border border-midnight-700 rounded-bl-md'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-midnight-200">{children}</li>,
                            strong: ({ children }) => <strong className="text-accent-400 font-semibold">{children}</strong>,
                            code: ({ children }) => <code className="bg-midnight-700 px-1 py-0.5 rounded text-accent-300">{children}</code>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-midnight-700 rounded-lg flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-midnight-300" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-midnight-800 border border-midnight-700 rounded-2xl rounded-bl-md p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-accent-400" />
                      <span className="text-sm text-midnight-400">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-midnight-800 bg-midnight-950/50 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Malaysian tax rules..."
                rows={1}
                className="w-full px-4 py-3 bg-midnight-800 border border-midnight-700 rounded-xl text-white placeholder-midnight-500 focus:border-accent-500 focus:outline-none resize-none"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          <p className="text-xs text-midnight-500 mt-2 text-center">
            TaxGPT uses your uploaded documents to provide accurate answers. Always verify with official LHDN sources.
          </p>
        </div>
      </main>
    </div>
  );
}

