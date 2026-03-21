import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { playRoyalSound } from '../utils/sound';

const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'
];

export default function BookingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { cart, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = startOfToday();
  const next7Days = Array.from({ length: 7 }).map((_, i) => addDays(today, i));

  const handleConfirm = async () => {
    if (!user || !selectedDate || !selectedTime || cart.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const bookingRef = doc(collection(db, 'bookings'));
      const newBooking = {
        id: bookingRef.id,
        userId: user.uid,
        customerName: user.displayName || 'Guest',
        customerPhone: user.phoneNumber || '',
        serviceIds: cart.map(s => s.id),
        totalAmount,
        date: format(selectedDate, 'yyyy-MM-dd'),
        timeSlot: selectedTime,
        status: 'pending',
        createdAt: new Date()
      };

      await setDoc(bookingRef, newBooking);
      
      // Simulate cloud function trigger for notifications
      console.log('Booking confirmed! Cloud Functions would send Email/WhatsApp here.');
      
      setStep(3);
      clearCart();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
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
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-white border border-black/5 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-black/5">
              <h2 className="text-sm font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]">
                {step === 1 && 'Schedule Appointment'}
                {step === 2 && 'Checkout Summary'}
                {step === 3 && 'Booking Confirmed'}
              </h2>
              <button onClick={onClose} className="p-2 text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-grow">
              {step === 1 && (
                <div className="space-y-8">
                  {/* Date Picker */}
                  <div>
                    <h3 className="text-xs font-sans font-semibold tracking-[0.2em] uppercase mb-4 flex items-center gap-2 text-[#1a1a1a]/70">
                      <CalendarIcon className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} /> Select Date
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 snap-x hide-scrollbar">
                      {next7Days.map((date) => {
                        const isSelected = selectedDate?.getTime() === date.getTime();
                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => {
                              playRoyalSound();
                              setSelectedDate(date);
                            }}
                            className={`snap-start flex-shrink-0 w-20 h-24 border flex flex-col items-center justify-center gap-1 transition-all ${
                              isSelected 
                                ? 'bg-[#C5A059] border-[#C5A059] text-white' 
                                : 'bg-transparent border-black/10 text-[#1a1a1a]/50 hover:border-black/30 hover:text-[#1a1a1a]'
                            }`}
                          >
                            <span className="text-[10px] font-sans uppercase tracking-widest">{format(date, 'EEE')}</span>
                            <span className="text-2xl font-sans font-light">{format(date, 'd')}</span>
                            <span className="text-[10px] font-sans uppercase tracking-widest">{format(date, 'MMM')}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Picker */}
                  <div>
                    <h3 className="text-xs font-sans font-semibold tracking-[0.2em] uppercase mb-4 flex items-center gap-2 text-[#1a1a1a]/70">
                      <Clock className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} /> Select Time
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {TIME_SLOTS.map((time) => {
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            onClick={() => {
                              playRoyalSound();
                              setSelectedTime(time);
                            }}
                            className={`py-3 border text-xs font-sans tracking-widest transition-all ${
                              isSelected
                                ? 'bg-[#C5A059] border-[#C5A059] text-white'
                                : 'bg-transparent border-black/10 text-[#1a1a1a]/50 hover:border-black/30 hover:text-[#1a1a1a]'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="bg-[#f5f2ed] p-6 border border-black/5">
                    <h3 className="text-xs font-sans font-semibold tracking-[0.2em] uppercase text-[#C5A059] mb-6">Order Summary</h3>
                    <div className="space-y-4 mb-6">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <span className="text-[#1a1a1a]/80 font-sans text-sm tracking-wide">{item.name}</span>
                          <span className="font-sans text-sm tracking-widest text-[#1a1a1a]">₹{item.price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-6 border-t border-black/10 flex justify-between items-center">
                      <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/70">Total</span>
                      <span className="font-sans text-lg tracking-widest text-[#C5A059]">₹{totalAmount}</span>
                    </div>
                  </div>

                  <div className="bg-[#f5f2ed] p-6 border border-black/5">
                    <h3 className="text-xs font-sans font-semibold tracking-[0.2em] uppercase text-[#C5A059] mb-6">Appointment Details</h3>
                    <div className="space-y-3 text-[#1a1a1a]/80 font-sans text-sm tracking-wide">
                      <p className="flex justify-between">
                        <span className="text-[#1a1a1a]/50">Date:</span> 
                        <span>{selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-[#1a1a1a]/50">Time:</span> 
                        <span>{selectedTime}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                  >
                    <CheckCircle2 className="w-20 h-20 text-[#C5A059] mb-8" strokeWidth={1} />
                  </motion.div>
                  <h3 className="text-2xl font-sans font-light tracking-widest uppercase mb-4 text-[#1a1a1a]">You're Booked</h3>
                  <p className="text-[#1a1a1a]/50 max-w-sm font-sans text-sm tracking-wide leading-relaxed">
                    Your appointment for {selectedDate ? format(selectedDate, 'MMM d') : ''} at {selectedTime} is confirmed. We've sent the details to your email.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {step !== 3 && (
              <div className="p-6 border-t border-black/5 bg-[#f5f2ed] flex justify-end gap-4">
                {step === 2 && (
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                  >
                    Back
                  </button>
                )}
                
                {step === 1 ? (
                  <button
                    onClick={() => {
                      playRoyalSound();
                      setStep(2);
                    }}
                    disabled={!selectedDate || !selectedTime}
                    className="px-8 py-3 bg-[#1a1a1a] text-white font-sans text-xs font-semibold tracking-[0.2em] uppercase hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                  >
                    Continue <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      playRoyalSound();
                      handleConfirm();
                    }}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-[#C5A059] text-white font-sans text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b26a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                  >
                    {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
