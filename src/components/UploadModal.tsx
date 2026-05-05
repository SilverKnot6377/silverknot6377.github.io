import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiUpload } from '../utils/api';
import { useToast } from './Toast';
import { useI18n } from '../contexts/I18nContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userName, setUserName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validation
      if (!selectedFile.type.startsWith('video/')) {
        const msg = t('invalidVideoFile');
        setError(msg);
        showToast(msg, 'error');
        setFile(null);
        return;
      }

      if (selectedFile.size > 50 * 1024 * 1024) {
        const msg = t('fileSizeExceeds');
        setError(msg);
        showToast(msg, 'error');
        setFile(null);
        return;
      }

      setError(null);
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('username', userName);

    try {
      await apiUpload('/api/videos', formData, (percent) => {
        setUploadProgress(percent);
      });

      setIsSuccess(true);
      showToast(t('videoUploadedSuccessfully'), 'success');
      setTimeout(() => {
        setIsSuccess(false);
        setFile(null);
        setTitle('');
        setDescription('');
        setUserName('');
        setUploadProgress(0);
        onUploadSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message);
      showToast(err.message || t('uploadFailed'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="relative w-full max-w-md glass-panel p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold mb-6">{t('postVideos')}</h2>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {isSuccess ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                <h3 className="text-xl font-semibold">{t('uploadComplete')}</h3>
                <p className="text-gray-400 mt-2">{t('videoLive')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-colors bg-white/5"
                >
                  {file ? (
                    <div className="text-center">
                      <div className="bg-emerald-500/20 p-3 rounded-full inline-block mb-2">
                        <Upload className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-500 mb-3" />
                      <p className="text-sm font-medium">{t('clickToSelectVideo')}</p>
                      <p className="text-xs text-gray-500 mt-1">{t('videoFormat')}</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{t('yourName')}</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={t('egDesignerJane')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-white/30 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{t('videoTitle')}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('whatAreYouShowing')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-white/30 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{t('description')}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('tellUsMore')}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-white/30 transition-colors resize-none"
                  />
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <span>{t('uploading')}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-white"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!file || isUploading}
                  className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    t('shareNow')
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
