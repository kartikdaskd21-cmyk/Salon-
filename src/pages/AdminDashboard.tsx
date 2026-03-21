import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, MoreVertical } from 'lucide-react';

interface Booking {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  serviceIds: string[];
  totalAmount: number;
  date: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: any;
}

export default function AdminDashboard() {
  const { role, loading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (role !== 'admin') return;

    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => unsubscribe();
  }, [role]);

  const updateStatus = async (bookingId: string, newStatus: Booking['status']) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed] text-[#1a1a1a]/60 font-sans text-sm tracking-widest uppercase">Loading...</div>;
  if (role !== 'admin') return <Navigate to="/" />;

  const columns = [
    { id: 'pending', title: 'Pending', icon: Clock, color: 'text-[#C5A059]', bg: 'bg-[#C5A059]/10' },
    { id: 'confirmed', title: 'Confirmed', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 'completed', title: 'Completed', icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f2ed] p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-16">
        <h1 className="text-3xl font-sans font-light tracking-widest uppercase mb-2 text-[#1a1a1a]">
          Admin Dashboard
        </h1>
        <p className="text-[#1a1a1a]/60 font-sans text-sm tracking-wide">Manage incoming appointments and salon operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {columns.map(col => (
          <div key={col.id} className="bg-white border border-[#1a1a1a]/10 p-8 flex flex-col h-[70vh] shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className={`p-2 ${col.bg}`}>
                <col.icon className={`w-4 h-4 ${col.color}`} strokeWidth={1.5} />
              </div>
              <h2 className="text-sm font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]">{col.title}</h2>
              <span className="ml-auto bg-[#1a1a1a]/5 text-[10px] font-sans font-semibold tracking-widest px-3 py-1 text-[#1a1a1a]/70">
                {bookings.filter(b => b.status === col.id).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
              {bookings.filter(b => b.status === col.id).map(booking => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={booking.id}
                  className="bg-[#1a1a1a]/5 border border-[#1a1a1a]/5 p-6 hover:border-[#1a1a1a]/20 transition-colors group relative"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-sans text-sm tracking-wide text-[#1a1a1a] mb-1">{booking.customerName}</h3>
                      <p className="text-xs text-[#1a1a1a]/60 font-sans tracking-widest">{booking.customerPhone || 'No Phone'}</p>
                    </div>
                    <div className="relative">
                      <button className="p-1 text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors">
                        <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                      <div className="absolute right-0 top-6 bg-white border border-[#1a1a1a]/10 shadow-lg p-2 hidden group-hover:flex flex-col gap-1 z-10 w-32">
                        {col.id === 'pending' && (
                          <button onClick={() => updateStatus(booking.id, 'confirmed')} className="text-left px-4 py-3 text-[10px] font-sans font-semibold tracking-[0.2em] uppercase hover:bg-[#1a1a1a]/5 text-emerald-600 transition-colors">Confirm</button>
                        )}
                        {col.id === 'confirmed' && (
                          <button onClick={() => updateStatus(booking.id, 'completed')} className="text-left px-4 py-3 text-[10px] font-sans font-semibold tracking-[0.2em] uppercase hover:bg-[#1a1a1a]/5 text-blue-600 transition-colors">Complete</button>
                        )}
                        {col.id !== 'cancelled' && (
                          <button onClick={() => updateStatus(booking.id, 'cancelled')} className="text-left px-4 py-3 text-[10px] font-sans font-semibold tracking-[0.2em] uppercase hover:bg-[#1a1a1a]/5 text-red-600 transition-colors">Cancel</button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-sans tracking-widest">
                      <span className="text-[#1a1a1a]/60 uppercase">Date</span>
                      <span className="text-[#1a1a1a]/80">{booking.date}</span>
                    </div>
                    <div className="flex justify-between text-xs font-sans tracking-widest">
                      <span className="text-[#1a1a1a]/60 uppercase">Time</span>
                      <span className="text-[#1a1a1a]/80">{booking.timeSlot}</span>
                    </div>
                    <div className="flex justify-between text-xs font-sans tracking-widest pt-3 border-t border-[#1a1a1a]/10">
                      <span className="text-[#1a1a1a]/60 uppercase">Amount</span>
                      <span className="text-[#C5A059] font-semibold">₹{booking.totalAmount}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
