import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVICES } from '../constants';
import { useCart } from '../lib/CartContext';
import { ShoppingBag, X } from 'lucide-react';

export default function BookingFlow() {
  const [step, setStep] = useState(1);
  const { cart, addToCart, removeFromCart, totalAmount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [flyingItem, setFlyingItem] = useState<{ id: string; x: number; y: number } | null>(null);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>, service: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyingItem({ id: service.id, x: rect.left, y: rect.top });
    setTimeout(() => {
      addToCart(service);
      setFlyingItem(null);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] p-8 relative">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-serif">Luxe-Aesthetic Salon</h1>
        <button onClick={() => setIsCartOpen(true)} className="relative p-2">
          <ShoppingBag />
          {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">{cart.length}</span>}
        </button>
      </div>
      
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="catalog"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {SERVICES.map(service => (
              <div key={service.id} className="p-6 bg-white/50 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl">
                <h3 className="text-xl font-semibold">{service.name}</h3>
                <p className="text-sm text-gray-600 my-2">{service.description}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-lg font-bold">₹{service.price}</span>
                  <button 
                    onClick={(e) => handleAddToCart(e, service)}
                    className="px-4 py-2 bg-black text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/50 z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 h-full w-80 bg-white z-50 p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-serif">Your Cart</h2>
                <button onClick={() => setIsCartOpen(false)}><X /></button>
              </div>
              {cart.map(item => (
                <div key={item.id} className="flex justify-between mb-4">
                  <span>{item.name}</span>
                  <span>₹{item.price}</span>
                </div>
              ))}
              <div className="mt-6 pt-6 border-t font-bold">Total: ₹{totalAmount}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Flying Animation */}
      <AnimatePresence>
        {flyingItem && (
          <motion.div
            initial={{ position: 'fixed', left: flyingItem.x, top: flyingItem.y, scale: 1 }}
            animate={{ left: window.innerWidth - 50, top: 20, scale: 0.2 }}
            exit={{ opacity: 0 }}
            className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center z-50"
          >
            +1
          </motion.div>
        )}
      </AnimatePresence>
      
      <button 
        onClick={() => setStep(step + 1)}
        className="mt-8 px-6 py-3 bg-black text-white rounded-lg"
      >
        Next
      </button>
    </div>
  );
}
