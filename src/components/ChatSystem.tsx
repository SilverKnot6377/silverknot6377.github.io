import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../utils/api';
import { useToast } from './Toast';
import { useI18n } from '../contexts/I18nContext';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  sender_username: string;
  receiver_username: string;
  created_at: string;
}

interface ChatSystemProps {
  isOpen: boolean;
  onClose: () => void;
  otherUsername: string;
  currentUsername: string;
}

export default function ChatSystem({ isOpen, onClose, otherUsername, currentUsername }: ChatSystemProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const data = await apiFetch(`/api/chat/messages/${otherUsername}`);
      setMessages(data);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, otherUsername]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await apiFetch(`/api/chat/messages/${otherUsername}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });
      setNewMessage('');
      fetchMessages();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        showToast(t('sessionExpired'), 'error');
      } else {
        showToast(err.message || t('failedToSend'), 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg glass-panel h-[600px] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                  {otherUsername[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold">{t('chatWith')} @{otherUsername}</h2>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> {t('online')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-black/20">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isMine = msg.sender_username === currentUsername;
                  return (
                    <div 
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        isMine 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-zinc-800 text-gray-200 rounded-tl-none'
                      }`}>
                        <p>{msg.content}</p>
                        <span className="text-[10px] opacity-50 mt-1 block text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-8">
                  <div className="bg-white/5 p-4 rounded-full mb-4">
                    <Send className="w-8 h-8" />
                  </div>
                  <p className="text-sm">{t('noMessagesYet')}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-zinc-900/50">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('typeAMessage')}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="bg-white text-black p-2 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
