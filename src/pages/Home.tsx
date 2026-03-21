import { useState } from 'react';
import HeroMap from '../components/HeroMap';
import ServiceCatalog from '../components/ServiceCatalog';
import BookingModal from '../components/BookingModal';
import AuthModal from '../components/AuthModal';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck } from 'lucide-react';
import { playRoyalSound } from '../utils/sound';

export default function Home() {
  const { cart, totalAmount } = useCart();
  const { user } = useAuth();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const handleBookNow = () => {
    playRoyalSound();
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return;
    }
    setIsBookingModalOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-[#f5f2ed]">
      <HeroMap />
      <ServiceCatalog />
      
      <AuthModal />
      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)} 
      />

      {/* Floating Book Now Button */}
      <AnimatePresence>
        {cart.length > 0 && !isBookingModalOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4"
          >
            <button
              onClick={handleBookNow}
              className="w-full py-4 px-8 bg-[#1a1a1a] text-white font-sans text-[11px] font-semibold tracking-[0.2em] uppercase rounded-none hover:bg-black transition-all flex items-center justify-between group shadow-2xl shadow-black/10"
            >
              <span className="flex items-center gap-3">
                <CalendarCheck className="w-4 h-4" strokeWidth={1.5} />
                Book {cart.length} Service{cart.length > 1 ? 's' : ''}
              </span>
              <span className="font-sans font-medium text-sm tracking-widest">
                ₹{totalAmount}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
