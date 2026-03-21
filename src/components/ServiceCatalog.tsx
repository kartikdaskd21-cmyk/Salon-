import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Plus, Check, Crown } from 'lucide-react';
import { useCart, Service } from '../lib/CartContext';
import { playRoyalSound } from '../utils/sound';

const SERVICES: Service[] = [
  {
    id: 's1',
    name: 'The Royal Crown',
    description: 'Classic scissor cut, precision styling, and hot towel finish.',
    price: 500,
    durationMinutes: 45,
    imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800',
    isActive: true,
  },
  {
    id: 's2',
    name: 'Imperial Shave',
    description: 'Traditional hot towel straight razor shave with premium oils.',
    price: 300,
    durationMinutes: 30,
    imageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=800',
    isActive: true,
  },
  {
    id: 's3',
    name: 'Majestic Fade',
    description: 'Precision skin fade finished with gold-flake pomade.',
    price: 600,
    durationMinutes: 45,
    imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=800',
    isActive: true,
  },
  {
    id: 's4',
    name: 'Monarch\'s Grooming',
    description: 'Full hair, beard, and facial treatment for the modern king.',
    price: 1500,
    durationMinutes: 90,
    imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800',
    isActive: true,
  },
];

function ServiceCard({ service, index, cart, handleAddToCart }: any) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"]
  });

  // Parallax effect for the image
  const imageY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  
  const inCart = cart.some((s: Service) => s.id === service.id);
  const imageUrl = service.imageUrl;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="group relative bg-white border border-black/5 rounded-none overflow-hidden hover:border-[#C5A059]/30 transition-colors flex flex-col h-full shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      <div className="aspect-[4/5] overflow-hidden relative bg-[#f5f2ed] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
        
        {imageUrl ? (
          <motion.img
            style={{ y: imageY, scale: 1.1 }}
            src={imageUrl}
            alt={service.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out opacity-80 group-hover:opacity-100"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-black/10 z-20">
            <Crown className="w-8 h-8 mb-2" strokeWidth={1} />
          </div>
        )}

        <div className="absolute bottom-4 left-4 z-20">
          <span className="px-3 py-1 bg-white/80 backdrop-blur-md text-[10px] font-sans text-[#1a1a1a] border border-black/10 uppercase tracking-[0.2em]">
            {service.durationMinutes} MIN
          </span>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-serif text-[#1a1a1a] font-light">{service.name}</h3>
          <span className="font-sans text-[#C5A059] font-medium text-sm tracking-widest">
            ₹{service.price}
          </span>
        </div>
        <p className="text-[#1a1a1a]/60 text-sm mb-8 font-light flex-grow leading-relaxed">
          {service.description}
        </p>

        <button
          onClick={(e) => !inCart && handleAddToCart(e, service)}
          disabled={inCart}
          className={`w-full py-4 font-sans uppercase tracking-[0.2em] text-[11px] font-medium flex items-center justify-center gap-3 transition-all duration-500 ${
            inCart
              ? 'bg-black/5 text-black/30 cursor-not-allowed'
              : 'bg-transparent border border-[#C5A059]/50 text-[#C5A059] hover:bg-[#C5A059] hover:text-white'
          }`}
        >
          {inCart ? (
            <>
              <Check className="w-3 h-3" /> Reserved
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" /> Add to Cart
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default function ServiceCatalog() {
  const { cart, addToCart } = useCart();
  const [flyingItem, setFlyingItem] = useState<{ id: string; x: number; y: number } | null>(null);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>, service: Service) => {
    playRoyalSound();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Trigger flying animation
    setFlyingItem({ id: service.id, x: rect.left, y: rect.top });
    
    setTimeout(() => {
      addToCart(service);
      setFlyingItem(null);
    }, 800); // match animation duration
  };

  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative bg-[#f5f2ed]">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="mb-24 text-center"
      >
        <h2 className="text-5xl md:text-7xl font-serif text-[#1a1a1a] font-light mb-6">
          Our Services
        </h2>
        <p className="text-[#C5A059] max-w-2xl mx-auto font-sans tracking-[0.2em] uppercase text-xs md:text-sm font-medium">
          A Masterpiece Tailored For Royalty
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {SERVICES.map((service, index) => (
          <ServiceCard 
            key={service.id}
            service={service}
            index={index}
            cart={cart}
            handleAddToCart={handleAddToCart}
          />
        ))}
      </div>

      {/* Flying Item Animation */}
      <AnimatePresence>
        {flyingItem && (
          <motion.div
            initial={{ 
              position: 'fixed', 
              left: flyingItem.x, 
              top: flyingItem.y, 
              scale: 1, 
              opacity: 1,
              zIndex: 100 
            }}
            animate={{ 
              left: window.innerWidth - 100,
              top: 40,
              scale: 0.2,
              opacity: 0,
            }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="w-12 h-12 bg-[#C5A059] rounded-full flex items-center justify-center"
          >
            <Crown className="w-5 h-5 text-white" strokeWidth={1.5} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
