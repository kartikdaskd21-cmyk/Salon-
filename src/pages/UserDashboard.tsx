import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle2, XCircle, Scissors, RefreshCw, Star } from 'lucide-react';
import { useCart, Service } from '../lib/CartContext';
import BookingModal from '../components/BookingModal';
import ReviewModal from '../components/ReviewModal';

interface Booking {
  id: string;
  userId: string;
  customerName: string;
  serviceIds: string[];
  totalAmount: number;
  date: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: any;
}

export default function UserDashboard() {
  const { user, loading } = useAuth();
  const { addToCart, clearCart } = useCart();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);

  const handleBookAgain = (booking: Booking) => {
    clearCart();
    booking.serviceIds.forEach(id => {
      const service = availableServices.find(s => s.id === id);
      if (service) {
        addToCart(service);
      }
    });
    setSelectedBooking(booking);
    setIsBookingModalOpen(true);
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'services'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setAvailableServices(data);
      } catch (error) {
        console.error("Error fetching services for dashboard:", error);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      // Sort client-side to avoid index requirement
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      setBookings(data);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      } catch (e) { /* Logged by handleFirestoreError */ }
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed] text-[#1a1a1a]/60 font-sans text-sm tracking-widest uppercase">Loading...</div>;
  if (!user) return <Navigate to="/" />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-[#C5A059] border-[#C5A059]/30';
      case 'confirmed': return 'text-emerald-600 border-emerald-600/30';
      case 'completed': return 'text-blue-600 border-blue-600/30';
      case 'cancelled': return 'text-red-600 border-red-600/30';
      default: return 'text-[#1a1a1a]/60 border-[#1a1a1a]/10';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-16 flex items-center gap-8">
        <div className="w-24 h-24 rounded-full border border-[#1a1a1a]/10 p-1">
          <div className="w-full h-full bg-white rounded-full overflow-hidden shadow-sm">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover grayscale opacity-80" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white text-2xl font-sans font-light text-[#1a1a1a]/50">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-sans font-light tracking-widest uppercase mb-2 text-[#1a1a1a]">
            {user.displayName || 'My Profile'}
          </h1>
          <p className="text-[#1a1a1a]/60 font-sans text-sm tracking-wide">{user.email}</p>
        </div>
      </div>

      <div className="space-y-8">
        <h2 className="text-sm font-sans font-semibold tracking-[0.2em] uppercase text-[#C5A059] border-b border-[#1a1a1a]/10 pb-4 flex items-center gap-3">
          <Calendar className="w-4 h-4" strokeWidth={1.5} /> Booking History
        </h2>

        {bookings.length === 0 ? (
          <div className="text-center py-20 bg-white border border-[#1a1a1a]/10 shadow-sm">
            <Scissors className="w-8 h-8 text-[#1a1a1a]/20 mx-auto mb-6" strokeWidth={1} />
            <p className="text-[#1a1a1a]/60 font-sans text-sm tracking-wide">No bookings yet. Time for an appointment?</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {bookings.map((booking) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={booking.id}
                className="bg-white border border-[#1a1a1a]/10 p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-8 hover:border-[#1a1a1a]/20 transition-colors shadow-sm"
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-[10px] font-sans font-semibold uppercase tracking-[0.2em] border ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                    <span className="font-sans text-sm tracking-widest text-[#1a1a1a] font-semibold">₹{booking.totalAmount}</span>
                  </div>
                  
                  <div className="flex items-center gap-8 text-xs text-[#1a1a1a]/60 font-sans tracking-widest uppercase">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
                      {booking.date}
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
                      {booking.timeSlot}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-4">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {booking.serviceIds.map((id, index) => {
                      const serviceName = availableServices.find(s => s.id === id)?.name || `Service #${index + 1}`;
                      return (
                        <span key={index} className="px-4 py-2 bg-[#1a1a1a]/5 text-[10px] text-[#1a1a1a]/60 border border-[#1a1a1a]/10 font-sans uppercase tracking-[0.2em]">
                          {serviceName}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.status === 'completed' && (
                      <button
                        onClick={() => {
                          setReviewBooking(booking);
                          setIsReviewModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-[#f5f2ed] text-[#C5A059] border border-[#C5A059]/30 text-[10px] font-sans font-semibold uppercase tracking-[0.2em] hover:bg-[#C5A059] hover:text-white transition-colors"
                      >
                        <Star className="w-3 h-3" /> Leave a Review
                      </button>
                    )}
                    <button
                      onClick={() => handleBookAgain(booking)}
                      className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-white text-[10px] font-sans font-semibold uppercase tracking-[0.2em] hover:bg-black transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Book Again
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedBooking(null);
        }}
        initialCustomerName={selectedBooking?.customerName}
        initialCustomerPhone={(selectedBooking as any)?.customerPhone}
      />

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewBooking(null);
        }}
        booking={reviewBooking}
      />
    </div>
  );
}
