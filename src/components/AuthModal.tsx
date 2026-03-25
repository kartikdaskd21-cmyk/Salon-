import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { playSuccessSound, playCloseSound } from '../utils/sound';

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-auth-modal', handleOpen);
    return () => window.removeEventListener('open-auth-modal', handleOpen);
  }, []);

  const handleGoogleSignIn = async () => {
    playSuccessSound();
    try {
      setErrorMsg('');
      await signInWithPopup(auth, googleProvider);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      if (error.code === 'auth/unauthorized-domain') {
        setErrorMsg(`Domain not authorized. Please add "${window.location.hostname}" to your Firebase Auth Authorized Domains in the Firebase Console.`);
      } else {
        setErrorMsg(error.message || 'Failed to sign in.');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white border border-black/5 p-10 overflow-hidden shadow-2xl"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </motion.button>

            <div className="text-center mb-10">
              <h2 className="text-2xl font-sans font-light tracking-widest uppercase mb-3 text-[#1a1a1a]">Welcome Back</h2>
              <p className="text-[#1a1a1a]/50 font-sans text-sm tracking-wide">Sign in to book your appointment.</p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-sans leading-relaxed rounded-sm">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playSuccessSound();
                  handleGoogleSignIn();
                }}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#1a1a1a] text-white font-sans text-xs font-semibold tracking-[0.2em] uppercase hover:bg-black transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
