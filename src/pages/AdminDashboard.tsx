import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, MoreVertical, Plus, Edit2, Trash2, Power, Upload, Loader2, Sparkles, X, AlertCircle } from 'lucide-react';
import { Service } from '../lib/CartContext';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'sonner';
import { INITIAL_SERVICES } from '../constants';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface Booking {
  id: string;
  userId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  serviceIds: string[];
  totalAmount: number;
  date: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: any;
}

const INITIAL_SERVICES_PLACEHOLDER = []; // Removed local INITIAL_SERVICES

export default function AdminDashboard() {
  const { role, loading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'services'>('bookings');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  
  // Service Form State
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    durationMinutes: '',
    imageUrl: '',
    isActive: true
  });

  useEffect(() => {
    if (role !== 'admin') return;

    // Bookings Listener
    const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      } catch (e) { /* Logged by handleFirestoreError */ }
    });

    // Services Listener
    const servicesQuery = query(collection(db, 'services'), orderBy('name', 'asc'));
    const unsubscribeServices = onSnapshot(servicesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(data);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'services');
      } catch (e) { /* Logged by handleFirestoreError */ }
    });

    return () => {
      unsubscribeBookings();
      unsubscribeServices();
    };
  }, [role]);

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Starting service submission...");
    setIsUploading(true);
    setError(null);
    
    try {
      let finalImageUrl = serviceForm.imageUrl;

      if (selectedFile) {
        console.log("Selected file detected, starting upload...", selectedFile.name);
        if (!storage) {
          console.error("Storage instance is missing!");
          throw new Error("Firebase Storage is not available. Please ensure it is enabled in your Firebase project.");
        }
        const storageRef = ref(storage, `services/${Date.now()}_${selectedFile.name}`);
        console.log("Storage ref created:", storageRef.fullPath);
        
        const snapshot = await uploadBytes(storageRef, selectedFile);
        console.log("Upload completed, snapshot received:", snapshot.metadata.fullPath);
        
        finalImageUrl = await getDownloadURL(snapshot.ref);
        console.log("Download URL obtained:", finalImageUrl);
      } else {
        console.log("No new file selected, using existing/provided image URL:", finalImageUrl);
      }

      const serviceData = {
        ...serviceForm,
        imageUrl: finalImageUrl,
        price: Number(serviceForm.price),
        durationMinutes: Number(serviceForm.durationMinutes),
      };
      console.log("Service data prepared:", serviceData);

      if (editingService) {
        console.log("Updating existing service:", editingService.id);
        await updateDoc(doc(db, 'services', editingService.id), serviceData);
        console.log("Update successful");
        toast.success('Service updated successfully');
      } else {
        console.log("Creating new service...");
        const newServiceRef = doc(collection(db, 'services'));
        console.log("New service ref created:", newServiceRef.id);
        await setDoc(newServiceRef, { ...serviceData, id: newServiceRef.id });
        console.log("Creation successful");
        toast.success('Service created successfully');
      }
      
      console.log("Resetting form and closing modal...");
      setIsServiceModalOpen(false);
      setEditingService(null);
      setSelectedFile(null);
      setPreviewUrl('');
      setServiceForm({ name: '', description: '', price: '', category: '', durationMinutes: '', imageUrl: '', isActive: true });
    } catch (err: any) {
      console.error("Service submission error:", err);
      const errorMessage = err.message || "An unexpected error occurred while saving the service.";
      setError(errorMessage);
      toast.error(errorMessage);
      
      try {
        handleFirestoreError(err, editingService ? OperationType.UPDATE : OperationType.CREATE, 'services');
      } catch (e) {
        // Logged by handleFirestoreError
      }
    } finally {
      console.log("Submission process finished (finally block)");
      setIsUploading(false);
    }
  };

  const toggleServiceStatus = async (service: Service) => {
    try {
      await updateDoc(doc(db, 'services', service.id), { isActive: !service.isActive });
      toast.success(`Service ${service.isActive ? 'deactivated' : 'activated'}`);
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, `services/${service.id}`);
      } catch (e) { /* Logged by handleFirestoreError */ }
    }
  };

  const deleteService = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Service',
      message: 'Are you sure you want to delete this service? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'services', id));
          toast.success('Service deleted successfully');
          setConfirmModal(null);
        } catch (error) {
          try {
            handleFirestoreError(error, OperationType.DELETE, `services/${id}`);
          } catch (e) { /* Logged by handleFirestoreError */ }
        }
      }
    });
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      category: service.category || '',
      durationMinutes: service.durationMinutes.toString(),
      imageUrl: service.imageUrl || '',
      isActive: service.isActive
    });
    setPreviewUrl(service.imageUrl || '');
    setSelectedFile(null);
    setIsServiceModalOpen(true);
  };

  const seedServices = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Seed Catalogue',
      message: 'This will generate 4K images using Gemini and seed the catalogue. This may take a few minutes. Continue?',
      onConfirm: async () => {
        setConfirmModal(null);
        console.log("Starting seedServices process...");
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          console.log("Has API key:", hasKey);
          if (!hasKey) {
            console.log("Opening API key selection dialog...");
            await window.aistudio.openSelectKey();
          }

          console.log("Setting isUploading to true...");
          setIsUploading(true);
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          console.log("GoogleGenAI initialized");

          for (const service of INITIAL_SERVICES) {
            console.log(`Processing service: ${service.name}...`);
            try {
              console.log(`Generating image for ${service.name} with prompt: ${service.prompt}`);
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
              console.log(`Gemini response received for ${service.name}`);

              let imageUrl = '';
              for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                  imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                  console.log(`Image data extracted for ${service.name}`);
                  break;
                }
              }

              if (!imageUrl) {
                console.warn(`No image generated for ${service.name}`);
              }

              const newServiceRef = doc(collection(db, 'services'));
              console.log(`Saving ${service.name} to Firestore with ID: ${newServiceRef.id}`);
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
              console.log(`Successfully added ${service.name}`);
            } catch (err) {
              console.error(`Failed to generate/add ${service.name}:`, err);
            }
          }
          console.log("Seed process completed successfully");
          toast.success('Catalogue seeded successfully!');
        } catch (error) {
          console.error("Seed services error:", error);
          try {
            handleFirestoreError(error, OperationType.CREATE, 'services');
          } catch (e) { /* Logged by handleFirestoreError */ }
        } finally {
          console.log("Seed process finished (finally block)");
          setIsUploading(false);
        }
      }
    });
  };

  const updateStatus = async (bookingId: string, newStatus: Booking['status']) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus });
      
      // Find the booking to get customer details
      const booking = bookings.find(b => b.id === bookingId);
      if (booking && booking.customerEmail) {
        // Send status update email
        try {
          const bookedServices = booking.serviceIds.map(id => services.find(s => s.id === id)).filter(Boolean);
          
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: booking.customerEmail,
              subject: `Booking ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} - RedStone Salon`,
              html: `
                <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
                  <h1 style="color: #1a1a1a; text-transform: uppercase; letter-spacing: 2px;">Booking ${newStatus}</h1>
                  <p>Hello ${booking.customerName},</p>
                  <p>Your appointment at RedStone Salon has been <strong>${newStatus}</strong>.</p>
                  <div style="background: #f5f2ed; padding: 20px; margin: 20px 0;">
                    <p><strong>Date:</strong> ${booking.date}</p>
                    <p><strong>Time:</strong> ${booking.timeSlot}</p>
                    <p><strong>Services Booked:</strong></p>
                    <ul style="margin-top: 5px;">
                      ${bookedServices.map(s => `<li style="margin-bottom: 5px;">${s?.name} - ₹${s?.price}</li>`).join('')}
                    </ul>
                    <p style="margin-top: 15px;"><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
                  </div>
                  <p>Thank you for choosing RedStone Salon.</p>
                  <p style="color: #C5A059; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 40px;">RedStone Salon</p>
                </div>
              `
            })
          });
        } catch (e) {
          console.error('Failed to send status update email:', e);
        }
      }
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
      } catch (e) { /* Logged by handleFirestoreError */ }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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
      <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-sans font-light tracking-widest uppercase mb-2 text-[#1a1a1a]">
            Admin Dashboard
          </h1>
          <p className="text-[#1a1a1a]/60 font-sans text-sm tracking-wide">Manage incoming appointments and salon operations.</p>
        </div>
        
        <div className="flex bg-white border border-black/5 p-1 shadow-sm">
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-2 text-[10px] font-sans font-semibold tracking-[0.2em] uppercase transition-all ${activeTab === 'bookings' ? 'bg-[#1a1a1a] text-white' : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]'}`}
          >
            Bookings
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`px-6 py-2 text-[10px] font-sans font-semibold tracking-[0.2em] uppercase transition-all ${activeTab === 'services' ? 'bg-[#1a1a1a] text-white' : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]'}`}
          >
            Services
          </button>
        </div>
      </div>

      {activeTab === 'bookings' ? (
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
      ) : (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]">Manage Services</h2>
            <div className="flex gap-4">
              <button 
                onClick={seedServices}
                disabled={isUploading}
                className="px-6 py-3 border border-[#1a1a1a]/10 text-[#1a1a1a]/60 text-[10px] font-sans font-semibold tracking-[0.2em] uppercase hover:bg-[#1a1a1a]/5 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate & Seed Catalogue
              </button>
              <button 
                onClick={() => {
                  setEditingService(null);
                  setServiceForm({ name: '', description: '', price: '', category: '', durationMinutes: '', imageUrl: '', isActive: true });
                  setIsServiceModalOpen(true);
                }}
                className="px-6 py-3 bg-[#1a1a1a] text-white text-[10px] font-sans font-semibold tracking-[0.2em] uppercase hover:bg-black transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Service
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(service => (
              <motion.div 
                layout
                key={service.id}
                className={`bg-white border p-8 shadow-sm transition-all ${service.isActive ? 'border-black/5' : 'border-red-100 opacity-60'}`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-serif text-xl text-[#1a1a1a] mb-1">{service.name}</h3>
                    <p className="text-[#C5A059] font-sans text-xs tracking-widest uppercase">₹{service.price} • {service.durationMinutes} MIN</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(service)} className="p-2 text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors">
                      <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => toggleServiceStatus(service)} className={`p-2 transition-colors ${service.isActive ? 'text-emerald-500 hover:text-emerald-600' : 'text-red-400 hover:text-red-500'}`}>
                      <Power className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => deleteService(service.id)} className="p-2 text-red-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                <p className="text-[#1a1a1a]/50 text-sm font-sans leading-relaxed line-clamp-2">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Service Modal */}
      <AnimatePresence>
        {isServiceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsServiceModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white p-8 shadow-2xl"
            >
              <h2 className="text-sm font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a] mb-8">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>
              
              <form onSubmit={handleServiceSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-100 p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <p className="text-xs text-red-600 font-sans leading-relaxed">{error}</p>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/50 mb-2">Service Name</label>
                  <input 
                    required
                    type="text" 
                    value={serviceForm.name}
                    onChange={e => setServiceForm({...serviceForm, name: e.target.value})}
                    className="w-full bg-[#f5f2ed] border-none p-4 text-sm font-sans focus:ring-1 focus:ring-[#C5A059]/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/50 mb-2">Description</label>
                  <textarea 
                    rows={3}
                    value={serviceForm.description}
                    onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
                    className="w-full bg-[#f5f2ed] border-none p-4 text-sm font-sans focus:ring-1 focus:ring-[#C5A059]/30 outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/50 mb-2">Category</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Haircuts"
                      value={serviceForm.category}
                      onChange={e => setServiceForm({...serviceForm, category: e.target.value})}
                      className="w-full bg-[#f5f2ed] border-none p-4 text-sm font-sans focus:ring-1 focus:ring-[#C5A059]/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/50 mb-2">Price (₹)</label>
                    <input 
                      required
                      type="number" 
                      value={serviceForm.price}
                      onChange={e => setServiceForm({...serviceForm, price: e.target.value})}
                      className="w-full bg-[#f5f2ed] border-none p-4 text-sm font-sans focus:ring-1 focus:ring-[#C5A059]/30 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/50 mb-2">Duration (Min)</label>
                  <input 
                    required
                    type="number" 
                    value={serviceForm.durationMinutes}
                    onChange={e => setServiceForm({...serviceForm, durationMinutes: e.target.value})}
                    className="w-full bg-[#f5f2ed] border-none p-4 text-sm font-sans focus:ring-1 focus:ring-[#C5A059]/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/50 mb-2">Service Image</label>
                  <div className="relative group">
                    <div className="w-full h-40 bg-[#f5f2ed] border-2 border-dashed border-[#1a1a1a]/10 flex flex-col items-center justify-center overflow-hidden">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-[#1a1a1a]/30">
                          <Upload className="w-8 h-8 mb-2" strokeWidth={1.5} />
                          <span className="text-[10px] uppercase tracking-widest">Upload Image</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    {previewUrl && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="text-white text-[10px] uppercase tracking-widest font-semibold">Change Image</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      setIsServiceModalOpen(false);
                      setSelectedFile(null);
                      setPreviewUrl('');
                    }}
                    className="flex-1 py-4 text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 py-4 bg-[#1a1a1a] text-white text-[10px] font-sans font-semibold tracking-[0.2em] uppercase hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      editingService ? 'Save Changes' : 'Create Service'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
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
                  className="flex-1 py-4 bg-red-600 text-white text-[10px] font-sans font-semibold tracking-[0.2em] uppercase hover:bg-red-700 transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
