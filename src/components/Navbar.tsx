import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useCart } from '../lib/CartContext';
import { ShoppingBag, LogOut, Crown, X, Calendar } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { playOpenSound, playCloseSound } from '../utils/sound';

export default function Navbar() {
  const { user, role } = useAuth();
  const { cart, removeFromCart, totalAmount } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
            <div className="relative group">
              <div 
                className="cursor-pointer"
                onClick={() => setIsCartOpen(!isCartOpen)}
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
              </div>

              {/* Cart Dropdown */}
              <AnimatePresence>
                {isCartOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsCartOpen(false)}
                      className="fixed inset-0 z-40"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-80 bg-white border border-black/5 shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-black/5 flex justify-between items-center bg-[#f5f2ed]">
                        <h3 className="text-xs font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]">Your Cart</h3>
                        <button onClick={() => setIsCartOpen(false)} className="text-[#1a1a1a]/50 hover:text-[#1a1a1a]">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="max-h-[60vh] overflow-y-auto">
                        {cart.length === 0 ? (
                          <div className="p-8 text-center text-[#1a1a1a]/50 text-sm font-sans">
                            Your cart is empty
                          </div>
                        ) : (
                          <div className="p-2">
                            {cart.map((item) => (
                              <div key={item.id} className="flex justify-between items-center p-3 hover:bg-black/5 transition-colors group">
                                <div className="flex flex-col">
                                  <span className="text-sm font-sans text-[#1a1a1a]">{item.name}</span>
                                  <span className="text-xs font-sans tracking-widest text-[#C5A059]">₹{item.price}</span>
                                </div>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="p-2 text-[#1a1a1a]/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {cart.length > 0 && (
                        <div className="p-4 border-t border-black/5 bg-[#f5f2ed]">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/70">Total</span>
                            <span className="text-lg font-sans tracking-widest text-[#C5A059]">₹{totalAmount}</span>
                          </div>
                          <button
                            onClick={() => {
                              setIsCartOpen(false);
                              // The floating Book Now button will handle the actual booking modal
                              // Or we can scroll to services if they want to add more
                            }}
                            className="w-full py-3 bg-[#1a1a1a] text-white font-sans text-xs font-semibold tracking-[0.2em] uppercase hover:bg-black transition-colors"
                          >
                            Close & Book
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

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
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playOpenSound();
                    window.dispatchEvent(new CustomEvent('open-booking-modal'));
                  }}
                  className="px-4 py-2 bg-[#1a1a1a] text-white text-[10px] font-sans tracking-[0.2em] uppercase hover:bg-black transition-all flex items-center gap-2"
                >
                  <Calendar className="w-3 h-3" /> Book
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    playCloseSound();
                    try {
                      await signOut(auth);
                    } catch (error) {
                      console.error('Error signing out', error);
                    }
                  }}
                  className="p-2 hover:bg-black/5 rounded-full transition-all duration-300 hover:scale-110"
                >
                  <LogOut className="w-4 h-4 text-[#1a1a1a]/60 hover:text-[#1a1a1a]" strokeWidth={1.5} />
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playOpenSound();
                  window.dispatchEvent(new CustomEvent('open-auth-modal'));
                }}
                className="px-6 py-2.5 border border-[#C5A059]/50 text-[#C5A059] text-xs font-sans tracking-[0.2em] uppercase hover:bg-[#C5A059] hover:text-black transition-all duration-500 hover:shadow-[0_0_20px_rgba(197,160,89,0.4)]"
              >
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
