import React, { createContext, useContext, useState } from 'react';

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
  isActive: boolean;
}

interface CartContextType {
  cart: Service[];
  addToCart: (service: Service) => void;
  removeFromCart: (serviceId: string) => void;
  clearCart: () => void;
  totalAmount: number;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  totalAmount: 0,
});

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<Service[]>([]);

  const addToCart = (service: Service) => {
    setCart((prev) => {
      if (prev.find((s) => s.id === service.id)) return prev;
      return [...prev, service];
    });
  };

  const removeFromCart = (serviceId: string) => {
    setCart((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const clearCart = () => setCart([]);

  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
