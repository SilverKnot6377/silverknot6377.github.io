import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CommunityPost } from '../types';
import { apiFetch } from '../utils/api';
import { useToast } from './Toast';
import { useI18n } from '../contexts/I18nContext';

interface CommunitySectionProps {
  username: string;
  isOwnProfile: boolean;
}

export default function CommunitySection({ username, isOwnProfile }: CommunitySectionProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const fetchPosts = async () => {
    try {
      const data = await apiFetch(`/api/users/${username}/community`);
      setPosts(data);
    } catch (err: any) {
      console.error('Failed to fetch community posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setIsPosting(true);
    try {
      await apiFetch(`/api/users/${username}/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost }),
      });
      setNewPost('');
      showToast(t('postShared'), 'success');
      fetchPosts();
    } catch (err: any) {
      console.error('Failed to post to community:', err);
      showToast(err.message || t('failedToPost'), 'error');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          {t('communityBoard')}
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          {t('shareYourThoughts')} @{username}!
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={t('writeSomething')}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            rows={3}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newPost.trim() || isPosting}
              className="bg-white text-black font-bold px-6 py-2 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('post')}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={post.id}
              className="bg-zinc-900/50 rounded-2xl p-4 border border-white/5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10">
                  {post.author_avatar ? (
                    <img src={post.author_avatar} alt={post.author_username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm">@{post.author_username}</h4>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
                {post.author_username === username && (
                  <span className="ml-auto bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {t('creator')}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <MessageSquare className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">{t('noPostsYet')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
