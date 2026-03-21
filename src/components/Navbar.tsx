import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useCart } from '../lib/CartContext';
import { ShoppingBag, LogOut, Crown } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { playRoyalSound } from '../utils/sound';

export default function Navbar() {
  const { user, role } = useAuth();
  const { cart } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-[#f5f2ed]/95 backdrop-blur-xl border-b border-black/5 shadow-[0_4px_30px_rgba(0,0,0,0.03)]' : 'bg-gradient-to-b from-[#f5f2ed]/90 to-transparent border-b border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between items-center transition-all duration-500 ${scrolled ? 'h-20' : 'h-28'}`}>
          <Link to="/" className="flex items-center gap-4 group">
            <div className="p-2 border border-[#C5A059]/30 rounded-full group-hover:border-[#C5A059] transition-all duration-500 group-hover:shadow-[0_0_15px_rgba(197,160,89,0.3)]">
              <Crown className="w-5 h-5 text-[#C5A059]" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-serif tracking-[0.2em] text-[#1a1a1a] uppercase font-light">
              RedStone
            </span>
          </Link>

          <div className="flex items-center gap-8">
            <button
              onClick={() => {
                playRoyalSound();
                window.dispatchEvent(new CustomEvent('open-booking-modal'));
              }}
              className="relative group cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 text-[#1a1a1a]/70 group-hover:text-[#C5A059] transition-colors duration-300" strokeWidth={1.5} />
              <AnimatePresence>
                {cart.length > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-2 -right-2 bg-[#C5A059] text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(197,160,89,0.5)]"
                  >
                    {cart.length}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {user ? (
              <div className="flex items-center gap-6">
                {role === 'admin' && (
                  <Link to="/admin" className="relative group text-xs font-sans text-[#C5A059] hover:text-[#1a1a1a] transition-colors uppercase tracking-[0.15em]">
                    Admin
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#1a1a1a] transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                )}
                <Link to="/profile" className="relative group text-xs font-sans text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors uppercase tracking-[0.15em]">
                  Profile
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#C5A059] transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <button
                  onClick={() => {
                    playRoyalSound();
                    signOut(auth);
                  }}
                  className="p-2 hover:bg-black/5 rounded-full transition-all duration-300 hover:scale-110"
                >
                  <LogOut className="w-4 h-4 text-[#1a1a1a]/60 hover:text-[#1a1a1a]" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  playRoyalSound();
                  window.dispatchEvent(new CustomEvent('open-auth-modal'));
                }}
                className="px-6 py-2.5 border border-[#C5A059]/50 text-[#C5A059] text-xs font-sans tracking-[0.2em] uppercase hover:bg-[#C5A059] hover:text-black transition-all duration-500 hover:shadow-[0_0_20px_rgba(197,160,89,0.4)]"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
