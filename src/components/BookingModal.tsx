import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Clock, ArrowRight, CheckCircle2, Star, Scissors, ChevronLeft } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import { useCart, Service } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { playClickSound, playSuccessSound, playCloseSound } from '../utils/sound';
import DateTimePicker from './DateTimePicker';

const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'
];

export default function BookingModal({ 
  isOpen, 
  onClose,
  initialCustomerName,
  initialCustomerPhone
}: { 
  isOpen: boolean; 
  onClose: () => void;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
}) {
  const { cart, totalAmount, clearCart, addToCart, removeFromCart } = useCart();
  const { user } = useAuth();
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedServices, setBookedServices] = useState<Service[]>([]);
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  
  // Customer details state
  const [customerName, setCustomerName] = useState(initialCustomerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone || '');
  const [availableServices, setAvailableServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDate) {
        setBookedTimeSlots([]);
        return;
      }
      
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const q = query(
          collection(db, 'busy_slots'), 
          where('date', '==', dateStr)
        );
        const snapshot = await getDocs(q);
        const slots = snapshot.docs.map(doc => doc.data().timeSlot);
        setBookedTimeSlots(slots);
      } catch (error) {
        console.error("Error fetching booked slots:", error);
      }
    };

    fetchBookedSlots();
  }, [selectedDate]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const q = query(collection(db, 'services'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        // Sort client-side to avoid index requirement
        data.sort((a, b) => a.name.localeCompare(b.name));
        setAvailableServices(data);
      } catch (error) {
        console.error("Error fetching services for booking:", error);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedDate(null);
      setSelectedTime(null);
      
      if (initialCustomerName) setCustomerName(initialCustomerName);
      else if (user?.displayName && !customerName) setCustomerName(user.displayName);
      
      if (initialCustomerPhone) setCustomerPhone(initialCustomerPhone);
      else if (user?.phoneNumber && !customerPhone) setCustomerPhone(user.phoneNumber);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
        customerName: customerName || user.displayName || 'Guest',
        customerEmail: user.email || '',
        customerPhone: customerPhone || user.phoneNumber || '',
        serviceIds: cart.map(s => s.id),
        totalAmount,
        date: format(selectedDate, 'yyyy-MM-dd'),
        timeSlot: selectedTime,
        status: 'pending',
        createdAt: new Date()
      };

      await setDoc(bookingRef, newBooking);
      
      // Mark slot as busy
      const slotId = `${newBooking.date}_${newBooking.timeSlot.replace(/\s/g, '_')}`;
      await setDoc(doc(db, 'busy_slots', slotId), {
        id: slotId,
        date: newBooking.date,
        timeSlot: newBooking.timeSlot
      });
      
      // Send confirmation email
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            subject: 'Booking Confirmation - RedStone Salon',
            html: `
              <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
                <h1 style="color: #1a1a1a; text-transform: uppercase; letter-spacing: 2px;">Booking Confirmed</h1>
                <p>Hello ${newBooking.customerName},</p>
                <p>Your appointment at RedStone Salon has been confirmed.</p>
                <div style="background: #f5f2ed; padding: 20px; margin: 20px 0;">
                  <p><strong>Date:</strong> ${newBooking.date}</p>
                  <p><strong>Time:</strong> ${newBooking.timeSlot}</p>
                  <p><strong>Services Booked:</strong></p>
                  <ul style="margin-top: 5px;">
                    ${cart.map(s => `<li style="margin-bottom: 5px;">${s.name} - ₹${s.price}</li>`).join('')}
                  </ul>
                  <p style="margin-top: 15px;"><strong>Total Amount:</strong> ₹${newBooking.totalAmount}</p>
                </div>
                <p>We look forward to seeing you!</p>
                <p style="color: #C5A059; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 40px;">RedStone Salon</p>
              </div>
            `
          })
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
      
      setBookedServices([...cart]);
      setStep(4);
      clearCart();
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, 'bookings');
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
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]">
                  {step === 1 && 'Schedule Appointment'}
                  {step === 2 && 'Checkout Summary'}
                  {step === 3 && 'Booking Confirmed'}
                </h2>
                {step !== 4 && (
                  <div className="flex gap-1">
                    {[1, 2, 3].map((s) => (
                      <div 
                        key={s} 
                        className={`h-1 w-8 rounded-full transition-all duration-500 ${
                          step >= s ? 'bg-[#C5A059]' : 'bg-black/5'
                        }`} 
                      />
                    ))}
                  </div>
                )}
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => {
                playCloseSound();
                onClose();
              }} className="p-2 text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-grow bg-[#fcfcfc]">
              {step === 1 && (
                <div className="space-y-8">
                  {/* Service Selection */}
                  <div>
                    <h3 className="text-xs font-sans font-semibold tracking-[0.2em] uppercase mb-4 flex items-center gap-2 text-[#1a1a1a]/70">
                      <Scissors className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} /> Review Services
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableServices.map((service) => {
                        const isSelected = cart.some(s => s.id === service.id);
                        return (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            key={service.id}
                            onClick={() => {
                              playClickSound();
                              if (isSelected) {
                                removeFromCart(service.id);
                              } else {
                                addToCart(service);
                              }
                            }}
                            className={`p-4 border text-left transition-all flex flex-col gap-2 ${
                              isSelected
                                ? 'bg-[#C5A059]/10 border-[#C5A059] text-[#1a1a1a]'
                                : 'bg-transparent border-black/10 text-[#1a1a1a]/70 hover:border-black/30'
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-sans text-sm font-semibold">{service.name}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-[#C5A059]" />}
                            </div>
                            <span className="font-sans text-xs tracking-widest text-[#C5A059]">₹{service.price} • {service.durationMinutes} MIN</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Running Total */}
                  {cart.length > 0 && (
                    <div className="mt-8">
                      <div className="pt-6 border-t border-black/10 flex justify-between items-center bg-[#f5f2ed] p-4">
                        <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/70">Current Total</span>
                        <span className="font-sans text-lg tracking-widest text-[#C5A059]">₹{totalAmount}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <DateTimePicker
                  selectedDate={selectedDate}
                  onDateSelect={(date) => {
                    playClickSound();
                    setSelectedDate(date);
                  }}
                  selectedTime={selectedTime}
                  onTimeSelect={(time) => {
                    playClickSound();
                    setSelectedTime(time);
                  }}
                  bookedSlots={bookedTimeSlots}
                />
              )}

              {step === 3 && (
                <div className="space-y-6">
                  {/* Customer Details */}
                  <div className="bg-[#f5f2ed] p-6 border border-black/5 space-y-4">
                    <h3 className="text-xs font-sans font-semibold tracking-[0.2em] uppercase text-[#C5A059] mb-4">Your Details</h3>
                    <div>
                      <label className="block text-xs font-sans tracking-widest uppercase text-[#1a1a1a]/70 mb-2">Full Name</label>
                      <input 
                        type="text" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-white border border-black/10 p-3 text-sm font-sans focus:outline-none focus:border-[#C5A059]/50 transition-colors"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-sans tracking-widest uppercase text-[#1a1a1a]/70 mb-2">Phone Number</label>
                      <input 
                        type="tel" 
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white border border-black/10 p-3 text-sm font-sans focus:outline-none focus:border-[#C5A059]/50 transition-colors"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

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

              {step === 4 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                  >
                    <CheckCircle2 className="w-20 h-20 text-[#C5A059] mb-6" strokeWidth={1} />
                  </motion.div>
                  <h3 className="text-2xl font-sans font-light tracking-widest uppercase mb-4 text-[#1a1a1a]">You're Booked</h3>
                  <p className="text-[#1a1a1a]/50 max-w-sm font-sans text-sm tracking-wide leading-relaxed mb-8">
                    Your appointment for {selectedDate ? format(selectedDate, 'MMM d') : ''} at {selectedTime} is confirmed. We've sent the details to your email.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {step !== 4 && (
              <div className="p-6 border-t border-black/5 bg-[#f5f2ed] flex justify-between items-center">
                <div>
                  {step > 1 && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        playClickSound();
                        setStep((prev) => (prev - 1) as any);
                      }}
                      className="flex items-center gap-2 font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </motion.button>
                  )}
                </div>
                
                <div className="flex gap-4">
                  {step === 1 && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        playClickSound();
                        setStep(2);
                      }}
                      disabled={cart.length === 0}
                      className="px-8 py-3 bg-[#1a1a1a] text-white font-sans text-xs font-semibold tracking-[0.2em] uppercase hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                      Next: Date & Time <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </motion.button>
                  )}

                  {step === 2 && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        playClickSound();
                        setStep(3);
                      }}
                      disabled={!selectedDate || !selectedTime}
                      className="px-8 py-3 bg-[#1a1a1a] text-white font-sans text-xs font-semibold tracking-[0.2em] uppercase hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                      Next: Details <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </motion.button>
                  )}

                  {step === 3 && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        playSuccessSound();
                        await handleConfirm();
                      }}
                      disabled={isSubmitting || !customerName || !customerPhone}
                      className="px-8 py-3 bg-[#C5A059] text-white font-sans text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#d4b26a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                      {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
                    </motion.button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
