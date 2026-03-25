import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { playClickSound, playSuccessSound, playCloseSound } from '../utils/sound';
import { useAuth } from '../lib/AuthContext';
import { Service } from '../lib/CartContext';

interface Booking {
  id: string;
  userId: string;
  customerName: string;
  serviceIds: string[];
}

export default function ReviewModal({ 
  isOpen, 
  onClose, 
  booking 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  booking: Booking | null;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'services'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setAvailableServices(data);
      } catch (error) {
        console.error("Error fetching services for review modal:", error);
      }
    };
    if (isOpen) fetchServices();
  }, [isOpen]);

  const handleClose = () => {
    playCloseSound();
    onClose();
    // Reset state after animation
    setTimeout(() => {
      setRating(0);
      setReviewText('');
      setSubmitted(false);
    }, 300);
  };

  const submitReview = async () => {
    if (!user || !booking || !rating) return;
    setIsSubmitting(true);
    try {
      const reviewRef = doc(collection(db, 'reviews'));
      
      // Fetch services to get names
      const q = query(collection(db, 'services'), where('id', 'in', booking.serviceIds));
      const snapshot = await getDocs(q);
      const services = snapshot.docs.map(doc => doc.data() as Service);
      
      const serviceNames = booking.serviceIds.map(id => {
        const service = services.find(s => s.id === id);
        return service ? service.name : 'Unknown Service';
      });

      await setDoc(reviewRef, {
        id: reviewRef.id,
        userId: user.uid,
        customerName: booking.customerName,
        serviceIds: booking.serviceIds,
        serviceNames,
        rating,
        text: reviewText,
        createdAt: new Date()
      });
      playSuccessSound();
      setSubmitted(true);
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, 'reviews');
      } catch (e) { /* Logged by handleFirestoreError */ }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white border border-black/5 overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-black/5">
              <h2 className="text-sm font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]">
                Rate Your Experience
              </h2>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleClose} className="p-2 text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </motion.button>
            </div>

            <div className="p-6">
              {!submitted ? (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs text-[#1a1a1a]/60 mb-4 font-sans">
                      For: {booking?.serviceIds.map(id => availableServices.find(s => s.id === id)?.name || 'Service').join(', ')}
                    </p>
                    
                    <div className="flex gap-2 mb-6">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => {
                          playClickSound();
                          setRating(star);
                        }}>
                          <Star className={`w-8 h-8 ${rating >= star ? 'text-[#C5A059] fill-[#C5A059]' : 'text-black/20'}`} />
                        </button>
                      ))}
                    </div>
                    
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Tell us what you liked or how we can improve..."
                      className="w-full bg-[#f5f2ed] border border-black/10 p-4 text-sm font-sans focus:outline-none focus:border-[#C5A059]/50 mb-6 resize-none"
                      rows={4}
                    />
                    
                    <button
                      onClick={submitReview}
                      disabled={!rating || isSubmitting}
                      className="w-full py-4 bg-[#1a1a1a] text-white text-xs font-semibold tracking-[0.2em] uppercase hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8"
                >
                  <p className="text-sm font-sans font-semibold tracking-[0.2em] uppercase text-[#C5A059] mb-2">Thank You!</p>
                  <p className="text-xs text-[#1a1a1a]/60 font-sans">Your review has been submitted successfully.</p>
                  <button
                    onClick={handleClose}
                    className="mt-8 px-6 py-3 bg-[#1a1a1a] text-white text-[10px] font-sans font-semibold uppercase tracking-[0.2em] hover:bg-black transition-colors"
                  >
                    Close
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
