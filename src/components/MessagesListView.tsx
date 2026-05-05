import React, { useState, useEffect } from 'react';
import { MessageSquare, User, Loader2, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../utils/api';
import ChatSystem from './ChatSystem';
import { useToast } from './Toast';
import { useI18n } from '../contexts/I18nContext';

interface Conversation {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  unread_count: number;
}

interface MessagesListViewProps {
  currentUsername: string;
}

export default function MessagesListView({ currentUsername }: MessagesListViewProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      const data = await apiFetch('/api/chat/conversations');
      setConversations(data);
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        // Silent or handled by parent
      } else {
        showToast(t('failedToLoadConversations'), 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <div className="h-full flex flex-col bg-black p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2 tracking-tighter">{t('messages')}</h2>
        <p className="text-gray-500 text-sm">{t('connectWithCreators')}</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : conversations.length > 0 ? (
          conversations.map((conv) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={conv.username}
              onClick={() => setSelectedChat(conv.username)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 cursor-pointer transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-white/20 transition-all">
                {conv.avatar_url ? (
                  <img src={conv.avatar_url} alt={conv.username} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">@{conv.username}</h3>
                {conv.bio && <p className="text-sm text-gray-400 line-clamp-1">{conv.bio}</p>}
              </div>
              {conv.unread_count > 0 && (
                <div className="bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {conv.unread_count > 9 ? '9+' : conv.unread_count}
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="bg-white/5 p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 opacity-20" />
            </div>
            <p className="mb-4">{t('noConversationsYet')}</p>
            <p className="text-xs">{t('visitCreatorProfiles')}</p>
          </div>
        )}
      </div>

      {selectedChat && (
        <ChatSystem
          isOpen={!!selectedChat}
          onClose={() => {
            setSelectedChat(null);
            fetchConversations(); // Refresh unread counts
          }}
          otherUsername={selectedChat}
          currentUsername={currentUsername}
        />
      )}
    </div>
  );
}
