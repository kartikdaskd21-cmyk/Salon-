export type Category = 'Haircuts' | 'Luxury' | 'Color' | 'Styling';

export interface Service {
  id: string;
  category: Category;
  name: string;
  description: string;
  price: number;
  duration: string;
  durationMinutes: number;
  imageUrl: string;
  isActive: boolean;
}
