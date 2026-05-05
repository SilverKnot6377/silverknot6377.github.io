import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Globe, Twitter, Instagram, Grid, Plus, Edit3, Check, Camera, Loader2, MessageSquare, MoreVertical, Settings, Shield, LogOut, X, Mail, Phone, Crown, LifeBuoy, Trash2, AlertTriangle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Video } from '../types';
import { apiFetch } from '../utils/api';
import ChatSystem from './ChatSystem';
import CommunitySection from './CommunitySection';
import { useToast } from './Toast';
import { useI18n } from '../contexts/I18nContext';

interface ProfileViewProps {
  username: string;
  isOwnProfile: boolean;
  currentUserUsername?: string;
  onBack: () => void;
  onVideoClick: (video: Video) => void;
  onProfileUpdate?: (updatedProfile: UserProfile) => void;
  onUserClick?: (username: string) => void;
  onLoginRequired?: () => void;
  onLogout?: () => void;
  onSwitchAccount?: () => void;
  key?: React.Key;
}

export default function ProfileView({ 
  username, 
  isOwnProfile, 
  currentUserUsername, 
  onBack, 
  onVideoClick, 
  onProfileUpdate, 
  onUserClick,
  onLoginRequired,
  onLogout,
  onSwitchAccount
}: ProfileViewProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'community'>('videos');
  const [videoToDelete, setVideoToDelete] = useState<number | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Form state
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const fetchProfile = async () => {
    try {
      const data = await apiFetch(`/api/users/${username}`);
      setProfile(data);
      setBio(data.bio || '');
      setWebsite(data.website || '');
      setTwitter(data.twitter || '');
      setInstagram(data.instagram || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      showToast(t('failedToLoadProfile'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const handleSave = async () => {
    try {
      const updated = await apiFetch(`/api/users/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, website, twitter, instagram, email, phone }),
      });
      
      const newProfile = profile ? { ...profile, ...updated } : updated;
      setProfile(newProfile);
      if (onProfileUpdate) onProfileUpdate(newProfile);
      
      setIsEditing(false);
      setIsSettingsOpen(false);
      showToast(t('profileUpdatedSuccessfully'), 'success');
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      showToast(err.message || t('failedToUpdateProfile'), 'error');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic validation
      if (!file.type.startsWith('image/')) {
        showToast(t('pleaseSelectImage'), 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(t('imageSizeLimit'), 'error');
        return;
      }

      setIsAvatarUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const data = await apiFetch(`/api/users/${encodeURIComponent(username)}/avatar`, {
          method: 'POST',
          body: formData,
        });
        
        const cacheBuster = `?t=${Date.now()}`;
        const updatedAvatarUrl = data.avatar_url + cacheBuster;
        
        if (profile) {
          const updated = { ...profile, avatar_url: updatedAvatarUrl };
          setProfile(updated);
          if (onProfileUpdate) onProfileUpdate(updated);
        }

        showToast(t('profilePictureUpdated'), 'success');
      } catch (err: any) {
        console.error('Failed to upload avatar:', err);
        showToast(err.message || t('failedToUploadAvatar'), 'error');
      } finally {
        setIsAvatarUploading(false);
        // Reset input
        if (avatarInputRef.current) avatarInputRef.current.value = '';
      }
    }
  };

  const handleUpgradeVIP = async () => {
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

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      await apiFetch(`/api/videos/${videoToDelete}`, { method: 'DELETE' });
      
      if (profile && profile.videos) {
        const updatedVideos = profile.videos.filter(v => v.id !== videoToDelete);
        const updatedProfile = { ...profile, videos: updatedVideos };
        setProfile(updatedProfile);
        if (onProfileUpdate) onProfileUpdate(updatedProfile);
      }
      
      showToast(t('videoDeletedSuccessfully'), 'success');
      setVideoToDelete(null);
    } catch (err: any) {
      showToast(err.message || t('failedToDeleteVideo'), 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">{t('userNotFound')}</h2>
        <button onClick={onBack} className="bg-white text-black px-6 py-2 rounded-xl font-bold">
          {t('goBack')}
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col bg-black overflow-y-auto no-scrollbar"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 border-b border-white/10 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">@{profile.username}</h1>
        {isOwnProfile && (
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="ml-auto p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <MoreVertical className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Profile Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-bold shadow-xl overflow-hidden border-2 ${profile.is_vip ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-white/10'}`}>
              {profile.avatar_url ? (
                <img 
                  key={profile.avatar_url} // Force re-render on URL change
                  src={profile.avatar_url} 
                  alt={profile.username} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                profile.username[0].toUpperCase()
              )}
            </div>
            
            {profile.is_vip && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-black p-1.5 rounded-full shadow-lg border-2 border-black z-10">
                <Crown className="w-4 h-4 fill-black" />
              </div>
            )}
            
            {isOwnProfile && (
              <button 
                onClick={() => avatarInputRef.current?.click()}
                disabled={isAvatarUploading}
                className="absolute -bottom-1 -right-1 bg-white text-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg hover:scale-105 transition-transform disabled:opacity-50 border border-black/10"
                title={t('changeProfilePicture')}
              >
                {isAvatarUploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
                <span className="text-[10px] font-bold uppercase">{t('change')}</span>
              </button>
            )}
            
            <input 
              ref={avatarInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarChange}
            />
          </div>
          
          {isOwnProfile ? (
            <button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${isEditing ? 'bg-emerald-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {isEditing ? (
                <><Check className="w-4 h-4" /> {t('save')}</>
              ) : (
                <><Edit3 className="w-4 h-4" /> {t('editProfile')}</>
              )}
            </button>
          ) : null}
        </div>

        {isEditing ? (
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('bio')}</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-white/30 resize-none"
                rows={3}
                placeholder={t('tellUsAboutYourself')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('website')}</label>
                <input 
                  type="text" 
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-white/30"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('twitter')}</label>
                <input 
                  type="text" 
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-white/30"
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('instagram')}</label>
                <input 
                  type="text" 
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-white/30"
                  placeholder="@username"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <p className="text-gray-300 mb-4 leading-relaxed">
              {profile.bio || t('noBioYet')}
            </p>
            <div className="flex flex-wrap gap-4">
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-indigo-400 hover:underline">
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}
              {profile.twitter && (
                <a href={`https://twitter.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-sky-400 hover:underline">
                  <Twitter className="w-4 h-4" /> Twitter
                </a>
              )}
              {profile.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-pink-400 hover:underline">
                  <Instagram className="w-4 h-4" /> Instagram
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-8 border-y border-white/10 py-4 mb-8 relative">
          <div className="text-center">
            <span className="block text-xl font-bold">{profile.videos?.length || 0}</span>
            <span className="text-xs text-gray-500 uppercase font-semibold">{t('videos')}</span>
          </div>
          
          {!isOwnProfile && currentUserUsername && (
            <button 
              onClick={() => setIsChatOpen(true)}
              className="absolute right-0 bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
              title="Message Creator"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Modals */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    {t('settings')}
                  </h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                  {/* VIP Section */}
                  {!profile.is_vip ? (
                    <div className="bg-gradient-to-br from-yellow-400/10 to-orange-500/10 border border-yellow-400/20 rounded-xl p-4 text-center">
                      <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Crown className="w-6 h-6 text-yellow-400" />
                      </div>
                      <h3 className="font-bold text-yellow-400 mb-1">{t('vipUpgrade')}</h3>
                      <p className="text-xs text-yellow-200/70 mb-4">{t('vipBenefits')}</p>
                      <button 
                        onClick={handleUpgradeVIP}
                        className="w-full bg-yellow-400 text-black font-bold py-2 rounded-lg text-sm hover:bg-yellow-300 transition-colors"
                      >
                        {t('vipUpgrade')}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center">
                        <Crown className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-yellow-400 text-sm">{t('vipMember')}</h3>
                        <p className="text-xs text-yellow-200/70">{t('activeSince')} 2026</p>
                      </div>
                    </div>
                  )}

                  {/* Language & Currency - REMOVED as per request */}
                  
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      {t('security')}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1 ml-1">{t('recoveryEmail')}</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="your@email.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1 ml-1">{t('recoveryPhone')}</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input 
                            type="tel" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    {profile.is_vip && (
                      <button 
                        className="w-full bg-indigo-500/10 text-indigo-400 font-bold py-3 rounded-xl hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <LifeBuoy className="w-4 h-4" />
                        {t('contactSupport')}
                      </button>
                    )}

                    <button 
                      onClick={handleSave}
                      className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      {t('save')}
                    </button>
                    
                    {onLogout && (
                      <>
                        <button 
                          onClick={() => {
                            setIsSettingsOpen(false);
                            if (onSwitchAccount) onSwitchAccount();
                            else if (onLogout) onLogout();
                          }}
                          className="w-full bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          {t('switchAccount')}
                        </button>
                        <button 
                          onClick={() => {
                            setIsSettingsOpen(false);
                            onLogout();
                          }}
                          className="w-full bg-red-500/10 text-red-500 font-bold py-3 rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('logout')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {currentUserUsername && (
          <ChatSystem 
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            otherUsername={profile.username}
            currentUsername={currentUserUsername}
          />
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          <button 
            onClick={() => setActiveTab('videos')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'videos' ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Grid className="w-4 h-4" />
            {t('creations')}
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'community' ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <MessageSquare className="w-4 h-4" />
            {t('community')}
          </button>
        </div>

        {activeTab === 'videos' ? (
          <div className="grid grid-cols-3 gap-1">
            {profile.videos && profile.videos.length > 0 ? (
              profile.videos.map(video => (
                <div 
                  key={video.id} 
                  className="aspect-[9/16] bg-zinc-900 relative group cursor-pointer overflow-hidden"
                >
                  <video 
                    src={video.video_url} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                    onClick={() => onVideoClick(video)}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors pointer-events-none" />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-bold pointer-events-none">
                    <Plus className="w-3 h-3 rotate-45" /> {video.likes}
                  </div>
                  {isOwnProfile && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoToDelete(video.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-3 py-20 text-center bg-white/5 rounded-2xl">
                <p className="text-gray-500">{t('noVideosYet')}</p>
              </div>
            )}
          </div>
        ) : (
          <CommunitySection username={profile.username} isOwnProfile={isOwnProfile} />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {videoToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
                  onClick={() => setVideoToDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleDeleteVideo}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 transition-colors text-white"
                >
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
