import React, { useState, useEffect, useRef } from 'react';
import { Home, PlusSquare, User, Search, TrendingUp, LogOut, MessageSquare, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VideoCard from './components/VideoCard';
import UploadModal from './components/UploadModal';
import ProfileView from './components/ProfileView';
import AuthView from './components/AuthView';
import SearchView from './components/SearchView';
import MessagesListView from './components/MessagesListView';
import LanguageSelector from './components/LanguageSelector';
import VipSuccessView from './components/VipSuccessView';
import { Video, UserProfile } from './types';
import { apiFetch, CookieError } from './utils/api';
import { useToast } from './components/Toast';
import { useI18n } from './contexts/I18nContext';

export default function App() {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<{ type: 'feed' | 'profile' | 'auth' | 'search' | 'messages' | 'vip-success'; username?: string }>({ type: 'feed' });
  const [isCookieError, setIsCookieError] = useState(false);
  const [isStripeConfigured, setIsStripeConfigured] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    if (!currentUser) return;
    try {
      const data = await apiFetch('/api/chat/unread-count');
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  const fetchVideos = async (pageNum = 0, append = false) => {
    if (pageNum > 0) setIsFetchingMore(true);
    else setIsLoading(true);

    try {
      const limit = 5;
      const offset = pageNum * limit;
      const data = await apiFetch(`/api/videos?limit=${limit}&offset=${offset}`);
      
      setIsCookieError(false);
      if (data.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (append) {
        setVideos(prev => [...prev, ...data]);
      } else {
        setVideos(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch videos:', err);
      if (err instanceof CookieError) {
        setIsCookieError(true);
      } else {
        showToast(t('failedToLoadVideos'), 'error');
      }
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const handleFixConnection = () => {
    window.open('/api/cookie-fix', 'cookie_fix', 'width=500,height=500');
    // Reload after a short delay
    setTimeout(() => {
      fetchVideos(0, false);
    }, 4000);
  };

  const loadMore = () => {
    if (!isFetchingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVideos(nextPage, true);
    }
  };

  const checkAuth = async () => {
    try {
      const user = await apiFetch('/api/auth/me');
      setCurrentUser(user);
      setIsCookieError(false);
    } catch (err: any) {
      if (err instanceof CookieError) {
        setIsCookieError(true);
        return;
      }
      // Silent for 401/Not authenticated as it's expected for guest users
      const isUnauthenticated = err.message.includes('401') || err.message.includes('Not authenticated');
      if (!isUnauthenticated) {
        console.error('Auth check failed:', err);
      }
    }
  };

  useEffect(() => {
    // Check for VIP success URL
    if (window.location.pathname === '/vip-success') {
      setView({ type: 'vip-success' });
    }
    fetchVideos(0, false);
    checkAuth();

    // Check Stripe config
    apiFetch('/api/config').then(data => {
      setIsStripeConfigured(data.stripeConfigured);
    }).catch(err => console.error("Failed to check config:", err));
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 10000); // Poll every 10s
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [currentUser, view.type]); // re-fetch when view changes (e.g. leaving messages)

  const handleScroll = () => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      const index = Math.round(scrollTop / clientHeight);
      
      if (index !== activeIndex) {
        setActiveIndex(index);
        // Increment view for the new active video
        const activeVideo = videos[index];
        if (activeVideo) {
          apiFetch(`/api/videos/${activeVideo.id}/view`, { method: 'POST' }).catch(() => {});
        }
      }

      // Check if we need to load more
      if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        loadMore();
      }
    }
  };

  const handleProfileClick = (username: string) => {
    setView({ type: 'profile', username });
  };

  const handleMyProfileClick = () => {
    if (currentUser) {
      setView({ type: 'profile', username: currentUser.username });
    } else {
      setView({ type: 'auth' });
    }
  };

  const handleUploadClick = () => {
    if (currentUser) {
      setIsUploadOpen(true);
    } else {
      setView({ type: 'auth' });
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    }
    localStorage.removeItem('workshorts_token');
    setCurrentUser(null);
    setView({ type: 'feed' });
  };

  const handleSwitchAccount = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    }
    localStorage.removeItem('workshorts_token');
    setCurrentUser(null);
    setView({ type: 'auth' });
  };

  const handleVipUpgrade = async () => {
    if (!currentUser) {
      setView({ type: 'auth' });
      return;
    }

    try {
      const { url } = await apiFetch('/api/vip/create-checkout-session', { method: 'POST' });
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      console.error('VIP Upgrade Error:', err);
      showToast(err.message || t('failedToStartCheckout'), 'error');
    }
  };

  const handleAuthSuccess = (user: any) => {
    if (user.token) {
      localStorage.setItem('workshorts_token', user.token);
    }
    setCurrentUser(user);
    setView({ type: 'feed' });
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-64 border-r border-white/10 p-6 gap-8 bg-zinc-950">
        <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => setView({ type: 'feed' })}>
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter">Quickee</h1>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setView({ type: 'feed' })}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all ${view.type === 'feed' ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Home className="w-6 h-6" />
            {t('home')}
          </button>
          <button 
            onClick={() => setView({ type: 'search' })}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all ${view.type === 'search' ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Search className="w-6 h-6" />
            {t('search')}
          </button>
          <button 
            onClick={() => currentUser ? setView({ type: 'messages' }) : setView({ type: 'auth' })}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all relative ${view.type === 'messages' ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <div className="relative">
              <MessageSquare className="w-6 h-6" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>
            {t('messages')}
          </button>
          <button 
            onClick={handleMyProfileClick}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all ${view.type === 'profile' && view.username === currentUser?.username ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <User className="w-6 h-6" />
            {currentUser ? t('myProfile') : t('signIn')}
          </button>
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex justify-center">
            <LanguageSelector />
          </div>
          
          {/* VIP Button */}
          {!currentUser?.is_vip && (
            <div className="w-full relative group">
              <button 
                onClick={handleVipUpgrade}
                disabled={!isStripeConfigured}
                className={`w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-orange-500/20 ${!isStripeConfigured ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              >
                <Crown className="w-5 h-5 fill-black" />
                {t('vipUpgrade')}
              </button>
              {!isStripeConfigured && (
                <div className="absolute bottom-full left-0 w-full mb-2 p-2 bg-red-500 text-white text-xs rounded-lg text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {t('paymentNotConfigured')}
                </div>
              )}
            </div>
          )}

          <button 
            onClick={handleUploadClick}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all shadow-lg shadow-white/5"
          >
            <PlusSquare className="w-6 h-6" />
            {t('postVideos')}
          </button>

          {currentUser && (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all"
            >
              <LogOut className="w-6 h-6" />
              {t('logout')}
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative h-full flex justify-center bg-zinc-900 overflow-hidden">
        <AnimatePresence mode="wait">
          {view.type === 'feed' ? (
            <motion.div 
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={feedRef}
              onScroll={handleScroll}
              className="h-full w-full max-w-md overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black relative"
            >
              <div className="md:hidden fixed top-4 left-4 z-50">
                <LanguageSelector />
              </div>

              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : isCookieError ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="bg-red-500/10 p-8 rounded-full mb-6 border border-red-500/20">
                    <LogOut className="w-16 h-16 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{t('connectionBlocked')}</h2>
                  <p className="text-gray-400 mb-8">{t('connectionBlockedDesc')}</p>
                  <button 
                    onClick={handleFixConnection}
                    className="bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition-all"
                  >
                    {t('fixConnection')}
                  </button>
                </div>
              ) : videos.length > 0 ? (
                videos.map((video, index) => (
                  <VideoCard 
                    key={`${video.id}-${index}`} 
                    video={video} 
                    isActive={index === activeIndex} 
                    onProfileClick={handleProfileClick}
                    onDelete={(deletedId) => setVideos(prev => prev.filter(v => v.id !== deletedId))}
                  />
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="bg-white/5 p-8 rounded-full mb-6">
                    <PlusSquare className="w-16 h-16 text-gray-600" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{t('noWorkShared')}</h2>
                  <p className="text-gray-400 mb-8">{t('beTheFirst')}</p>
                  <button 
                    onClick={handleUploadClick}
                    className="bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition-all"
                  >
                    {t('uploadVideo')}
                  </button>
                </div>
              )}
            </motion.div>
          ) : view.type === 'profile' ? (
            <div className="h-full w-full max-w-md bg-black overflow-hidden flex flex-col">
              <ProfileView 
                key={`profile-${view.username}`}
                username={view.username!} 
                isOwnProfile={currentUser?.username === view.username}
                currentUserUsername={currentUser?.username}
                onBack={() => setView({ type: 'feed' })}
                onVideoClick={() => setView({ type: 'feed' })}
                onLoginRequired={() => setView({ type: 'auth' })}
                onProfileUpdate={(updated) => {
                  if (currentUser?.username === updated.username) {
                    setCurrentUser(updated);
                    fetchVideos(); // Refresh feed to show new avatar
                  }
                }}
                onUserClick={(username) => setView({ type: 'profile', username })}
                onLogout={handleLogout}
                onSwitchAccount={handleSwitchAccount}
              />
            </div>
          ) : view.type === 'search' ? (
            <div className="h-full w-full max-w-md bg-black overflow-hidden flex flex-col">
              <SearchView 
                onUserClick={(username) => setView({ type: 'profile', username })} 
                currentUserUsername={currentUser?.username}
              />
            </div>
          ) : view.type === 'messages' ? (
            <div className="h-full w-full max-w-md bg-black overflow-hidden flex flex-col">
              {currentUser ? (
                <MessagesListView currentUsername={currentUser.username} />
              ) : (
                <AuthView onAuthSuccess={handleAuthSuccess} />
              )}
            </div>
          ) : view.type === 'vip-success' ? (
            <div className="h-full w-full max-w-md bg-black overflow-hidden flex flex-col">
              <VipSuccessView onNavigateHome={() => setView({ type: 'feed' })} />
            </div>
          ) : (
            <div className="h-full w-full max-w-md bg-black flex flex-col">
              <AuthView 
                key="auth"
                onAuthSuccess={handleAuthSuccess}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-lg border-t border-white/10 flex items-center justify-around px-6 z-40">
          <button onClick={() => setView({ type: 'feed' })} className={`p-2 ${view.type === 'feed' ? 'text-white' : 'text-gray-400'}`}>
            <Home className="w-7 h-7" />
          </button>
          <button className="p-2 text-gray-400">
            <Search className="w-7 h-7" />
          </button>
          <button 
            onClick={handleUploadClick}
            className="p-2 bg-white text-black rounded-lg -mt-8 shadow-xl"
          >
            <PlusSquare className="w-8 h-8" />
          </button>
          <button 
            onClick={() => currentUser ? setView({ type: 'messages' }) : setView({ type: 'auth' })}
            className={`p-2 relative ${view.type === 'messages' ? 'text-white' : 'text-gray-400'}`}
          >
            <div className="relative">
              <MessageSquare className="w-7 h-7" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>
          </button>
          <button 
            onClick={handleMyProfileClick}
            className={`p-2 ${view.type === 'profile' ? 'text-white' : 'text-gray-400'}`}
          >
            <User className="w-7 h-7" />
          </button>
        </nav>
      </main>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUploadSuccess={fetchVideos}
      />
    </div>
  );
}
