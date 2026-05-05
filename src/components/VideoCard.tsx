import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, User, Play, Eye, Crown, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Video } from '../types';
import CommentSection from './CommentSection';
import { apiFetch } from '../utils/api';
import { useToast } from './Toast';
import { useI18n } from '../contexts/I18nContext';

interface VideoCardProps {
  video: Video & { is_vip?: boolean };
  isActive: boolean;
  onProfileClick: (username: string) => void;
  onDelete?: (videoId: number) => void;
  key?: React.Key;
}

export default function VideoCard({ video, isActive, onProfileClick, onDelete }: VideoCardProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [doubleTapHearts, setDoubleTapHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTap = useRef<number>(0);
  
  // Check if current user is owner
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/auth/me').then(user => {
      setCurrentUser(user.username);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isActive && !isCommentsOpen && !isDeleteModalOpen) {
      videoRef.current?.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isActive, isCommentsOpen, isDeleteModalOpen]);

  const handleDelete = async () => {
    try {
      await apiFetch(`/api/videos/${video.id}`, { method: 'DELETE' });
      showToast('Video deleted successfully', 'success');
      setIsDeleteModalOpen(false);
      if (onDelete) onDelete(video.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete video', 'error');
    }
  };

  const handleLike = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (liked) return;
    
    setLiked(true);
    setLikesCount(prev => prev + 1);
    
    try {
      await apiFetch(`/api/videos/${video.id}/like`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to like video:', err);
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      handleDoubleTap(e);
    } else {
      // Single tap - toggle play
      togglePlay();
    }
    lastTap.current = now;
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    // Trigger like if not already liked
    if (!liked) {
      handleLike();
    }
    
    // Add heart animation (centered)
    const newHeart = { id: Date.now() };
    setDoubleTapHearts(prev => [...prev, newHeart as any]);
    
    // Remove heart after animation
    setTimeout(() => {
      setDoubleTapHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1000);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="video-container h-full w-full relative snap-start bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={video.video_url}
        className="h-full w-full object-cover"
        loop
        playsInline
        onClick={handleVideoClick}
      />

      {/* Double Tap Heart Animations */}
      <AnimatePresence>
        {doubleTapHearts.map(heart => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              scale: [0, 1.5, 1.2, 1],
              y: -50
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <Heart className="w-32 h-32 text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Play/Pause Overlay */}
      <AnimatePresence>
        {!isPlaying && !isCommentsOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/40 p-6 rounded-full">
              <Play className="w-12 h-12 text-white fill-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Sidebar */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-10">
        <div className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-white/10">
            <Eye className="w-7 h-7 text-white" />
          </div>
          <span className="text-xs font-medium">{video.views}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleLike}
            className={`p-3 rounded-full transition-all ${liked ? 'bg-red-500 scale-110' : 'bg-white/10 hover:bg-white/20'}`}
          >
            <Heart className={`w-7 h-7 ${liked ? 'fill-white' : 'text-white'}`} />
          </button>
          <span className="text-xs font-medium">{likesCount}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={() => setIsCommentsOpen(true)}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </button>
          <span className="text-xs font-medium">{t('comments')}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all">
            <Share2 className="w-7 h-7 text-white" />
          </button>
          <span className="text-xs font-medium">{t('share')}</span>
        </div>

        {currentUser === video.username && (
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-3 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-all text-red-500"
            >
              <Trash2 className="w-7 h-7" />
            </button>
            <span className="text-xs font-medium text-red-400">{t('delete')}</span>
          </div>
        )}

        <div className="mt-4 relative">
          <button 
            onClick={() => onProfileClick(video.username)}
            className={`w-12 h-12 rounded-full border-2 overflow-hidden bg-zinc-800 flex items-center justify-center hover:scale-110 transition-transform ${video.is_vip ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-white'}`}
          >
            {video.avatar_url ? (
              <img src={video.avatar_url} alt={video.username} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-white" />
            )}
          </button>
          {video.is_vip && (
            <div className="absolute -top-1 -right-1 bg-yellow-400 text-black p-1 rounded-full shadow-lg border border-black z-10">
              <Crown className="w-3 h-3 fill-black" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="max-w-[400px]">
          <button 
            onClick={() => onProfileClick(video.username)}
            className="font-bold text-lg mb-1 hover:underline text-left flex items-center gap-2"
          >
            @{video.username}
            {video.is_vip && <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
          </button>
          <p className="text-sm text-gray-200 line-clamp-2 mb-2">
            {video.title} - {video.description}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white/20 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">{t('originalAudio')} - {video.username}</span>
          </div>
        </div>
      </div>

      <CommentSection 
        videoId={video.id} 
        isOpen={isCommentsOpen} 
        onClose={() => setIsCommentsOpen(false)} 
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('deleteVideo')}</h3>
              <p className="text-gray-400 text-sm mb-6">
                {t('deleteVideoConfirm')}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 transition-colors text-white"
                >
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
