import React, { useState, useEffect } from 'react';
import { Send, X, MessageSquare, CornerDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Comment } from '../types';
import { apiFetch } from '../utils/api';
import { useToast } from './Toast';
import { useI18n } from '../contexts/I18nContext';

interface CommentSectionProps {
  videoId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function CommentSection({ videoId, isOpen, onClose }: CommentSectionProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [username, setUsername] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const data = await apiFetch(`/api/videos/${videoId}/comments`);
      setComments(data);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, videoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !username.trim()) return;

    setIsLoading(true);
    try {
      await apiFetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          content: newComment,
          parent_id: replyTo
        }),
      });

      setNewComment('');
      setReplyTo(null);
      showToast(t('commentPosted'), 'success');
      fetchComments();
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      showToast(err.message || t('failedToPostComment'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: number) => comments.filter(c => c.parent_id === parentId);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute bottom-0 left-0 right-0 h-[70%] bg-zinc-900 rounded-t-3xl z-50 flex flex-col shadow-2xl border-t border-white/10"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <h3 className="font-bold">{t('comments')} ({comments.length})</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
            {rootComments.length > 0 ? (
              rootComments.map(comment => (
                <div key={comment.id} className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold overflow-hidden">
                      {comment.avatar_url ? (
                        <img src={comment.avatar_url} alt={comment.username} className="w-full h-full object-cover" />
                      ) : (
                        comment.username[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">@{comment.username}</span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{comment.content}</p>
                      <button 
                        onClick={() => {
                          setReplyTo(comment.id);
                          setNewComment(`@${comment.username} `);
                        }}
                        className="text-xs text-gray-500 font-bold mt-2 hover:text-white transition-colors"
                      >
                        {t('reply')}
                      </button>
                    </div>
                  </div>

                  {/* Replies */}
                  {getReplies(comment.id).map(reply => (
                    <div key={reply.id} className="flex gap-3 ml-8">
                      <CornerDownRight className="w-4 h-4 text-gray-600 mt-1" />
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                        {reply.avatar_url ? (
                          <img src={reply.avatar_url} alt={reply.username} className="w-full h-full object-cover" />
                        ) : (
                          reply.username[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs">@{reply.username}</span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(reply.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <MessageSquare className="w-12 h-12 text-zinc-800 mb-4" />
                <p className="text-gray-500">{t('noCommentsYet')}</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-zinc-950 border-t border-white/10">
            <form onSubmit={handleSubmit} className="space-y-3">
              {!username && (
                <input
                  type="text"
                  placeholder={t('yourUsername')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  required
                />
              )}
              {replyTo && (
                <div className="flex items-center justify-between bg-white/5 px-3 py-1 rounded text-[10px] text-gray-400">
                  <span>{t('replyingTo')} comment</span>
                  <button onClick={() => setReplyTo(null)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={username ? `${t('commentAs')} @${username}...` : t('writeAComment')}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading || !newComment.trim()}
                  className="bg-white text-black p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
