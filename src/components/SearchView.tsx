import React, { useState, useEffect } from 'react';
import { Search, User, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../utils/api';
import { useI18n } from '../contexts/I18nContext';

interface SearchUser {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
}

interface SearchViewProps {
  onUserClick: (username: string) => void;
  currentUserUsername?: string;
}

export default function SearchView({ onUserClick, currentUserUsername }: SearchViewProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const url = `/api/users?q=${encodeURIComponent(query)}&exclude=${encodeURIComponent(currentUserUsername || '')}`;
        const data = await apiFetch(url);
        setResults(data);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(fetchUsers, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="h-full flex flex-col bg-black p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-6 tracking-tighter">{t('searchCreators')}</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchByUsername')}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-white/30 transition-all text-lg"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : results.length > 0 ? (
          results.map((user) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={user.username}
              onClick={() => onUserClick(user.username)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 cursor-pointer transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-white/20 transition-all">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">@{user.username}</h3>
                {user.bio && <p className="text-sm text-gray-400 line-clamp-1">{user.bio}</p>}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            {query.trim() ? `${t('noCreatorsFound')} "${query}"` : t('startTypingToFind')}
          </div>
        )}
      </div>
    </div>
  );
}
