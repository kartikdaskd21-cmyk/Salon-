import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { Plus, Check, Crown, Loader2, AlertCircle } from 'lucide-react';
import { useCart, Service } from '../lib/CartContext';
import { playCartSound, playOpenSound } from '../utils/sound';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'sonner';
import { INITIAL_SERVICES } from '../constants';

export default function ServiceCatalog({ onBookNow }: { onBookNow?: () => void }) {
  const { cart, addToCart } = useCart();
  const { role } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [flyingItem, setFlyingItem] = useState<{ id: string; x: number; y: number } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    console.log("ServiceCatalog: Fetching services...");
    const q = query(
      collection(db, 'services')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("ServiceCatalog: Snapshot received, count:", snapshot.docs.length);
      if (snapshot.docs.length === 0) {
        console.log("ServiceCatalog: No services found with isActive == true.");
      }
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      // Sort client-side to avoid index requirement
      data.sort((a, b) => a.name.localeCompare(b.name));
      setServices(data);

      // Auto-prompt admin to seed if empty
      if (data.length === 0 && role === 'admin' && !isSeeding) {
        // We don't want to spam, so maybe just log or show a more prominent hint
        console.log("ServiceCatalog: Catalogue is empty, admin can seed.");
      }
    }, (error) => {
      console.error("ServiceCatalog: Error fetching services:", error);
    });

    return () => {
        unsubscribe();
    };
  }, []);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>, service: Service) => {
    playCartSound();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Trigger flying animation
    setFlyingItem({ id: service.id, x: rect.left, y: rect.top });
    
    setTimeout(() => {
      addToCart(service);
      setFlyingItem(null);
    }, 800); // match animation duration
  };

  const seedCatalogue = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Seed Catalogue',
      message: 'This will clear existing services and generate 4K images using Gemini to seed a fresh catalogue. This may take a few minutes. Continue?',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) {
            await window.aistudio.openSelectKey();
          }

          setIsSeeding(true);
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

          // Clear existing services for "fresh data"
          const existingServices = services;
          for (const s of existingServices) {
            try {
              await deleteDoc(doc(db, 'services', s.id));
            } catch (e) {
              console.error("Failed to clear service:", s.id);
            }
          }

          for (const service of INITIAL_SERVICES) {
            try {
              const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-image-preview',
                contents: {
                  parts: [{ text: service.prompt }]
                },
                config: {
                  imageConfig: {
                    aspectRatio: "3:4",
                    imageSize: "4K"
                  }
                }
              });

              let imageUrl = '';
              for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                  imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                  break;
                }
              }

              const newServiceRef = doc(collection(db, 'services'));
              await setDoc(newServiceRef, {
                id: newServiceRef.id,
                name: service.name,
                description: service.description,
                price: service.price,
                category: service.category,
                durationMinutes: service.durationMinutes,
                imageUrl: imageUrl,
                isActive: true,
                createdAt: serverTimestamp()
              });
            } catch (err) {
              console.error(`Failed to generate/add ${service.name}:`, err);
            }
          }
          toast.success('Catalogue seeded successfully!');
        } catch (error) {
          console.error('Error seeding catalogue:', error);
          toast.error('Failed to seed catalogue');
          try {
            handleFirestoreError(error, OperationType.CREATE, 'services');
          } catch (e) { /* Logged by handleFirestoreError */ }
        } finally {
          setIsSeeding(false);
        }
      }
    });
  };

  const categories = Array.from(new Set(services.map(s => s.category || 'Other')));

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

      {services.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-black/10 flex flex-col items-center gap-6">
          <p className="text-[#1a1a1a]/40 font-sans text-sm tracking-widest uppercase">No services available at the moment.</p>
          {role === 'admin' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={seedCatalogue}
              disabled={isSeeding}
              className="px-8 py-4 bg-[#C5A059] text-white font-sans text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b26a] transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Catalogue...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  Seed Service Catalogue
                </>
              )}
            </motion.button>
          )}
        </div>
      ) : (
        <div className="space-y-24">
          {categories.map(category => (
            <div key={category}>
              <div className="flex items-center gap-4 mb-12">
                <h3 className="text-sm font-sans font-semibold tracking-[0.3em] uppercase text-[#C5A059]">{category}</h3>
                <div className="h-[1px] flex-grow bg-black/5" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {services.filter(s => (s.category || 'Other') === category).map((service, index) => (
                  <ServiceCard 
                    key={service.id}
                    service={service}
                    index={index}
                    cart={cart}
                    handleAddToCart={handleAddToCart}
                    onBookNow={onBookNow}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white p-8 shadow-2xl"
            >
              <h2 className="text-sm font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a] mb-4">
                {confirmModal.title}
              </h2>
              <p className="text-[#1a1a1a]/60 text-sm font-sans leading-relaxed mb-8">
                {confirmModal.message}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-4 text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-4 bg-[#C5A059] text-white text-[10px] font-sans font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b26a] transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ServiceCard({ service, index, cart, handleAddToCart, onBookNow }: any) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Parallax effect for the image
  const imageY = useTransform(smoothProgress, [0, 1], ["-10%", "10%"]);
  
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

        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => !inCart && handleAddToCart(e, service)}
            disabled={inCart}
            className={`flex-1 py-4 font-sans uppercase tracking-[0.2em] text-[11px] font-medium flex items-center justify-center gap-3 transition-all duration-500 ${
              inCart
                ? 'bg-black/5 text-black/30 cursor-not-allowed'
                : 'bg-transparent border border-[#C5A059]/50 text-[#C5A059] hover:bg-[#C5A059] hover:text-white'
            }`}
          >
            {inCart ? (
              <>
                <Check className="w-3 h-3" /> In Cart
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" /> Add to Cart
              </>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              if (!inCart) handleAddToCart(e, service);
              if (onBookNow) onBookNow();
            }}
            className="flex-1 py-4 font-sans uppercase tracking-[0.2em] text-[11px] font-medium flex items-center justify-center gap-3 transition-all duration-500 bg-[#1a1a1a] text-white hover:bg-black"
          >
            Book Now
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
