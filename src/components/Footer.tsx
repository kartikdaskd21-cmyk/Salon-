import { MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-[#f5f2ed] py-16 px-4 sm:px-6 lg:px-8 border-t border-[#C5A059]/20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <h3 className="text-2xl font-serif font-light tracking-widest uppercase mb-6 text-[#C5A059]">RedStone</h3>
          <p className="text-[#f5f2ed]/60 font-sans text-sm tracking-wide leading-relaxed max-w-xs">
            Experience grooming elevated to an art form. The royal standard in men's care and styling.
          </p>
        </div>
        
        <div>
          <h4 className="text-sm font-sans font-semibold tracking-[0.2em] uppercase mb-6">Contact Us</h4>
          <ul className="space-y-4 text-[#f5f2ed]/60 font-sans text-sm tracking-wide">
            <li className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#C5A059] shrink-0" strokeWidth={1.5} />
              <span>123 Royal Crown Avenue,<br />Prestige District, London, UK</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-[#C5A059] shrink-0" strokeWidth={1.5} />
              <span>+44 20 7123 4567</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#C5A059] shrink-0" strokeWidth={1.5} />
              <span>concierge@redstone.com</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-sans font-semibold tracking-[0.2em] uppercase mb-6">Hours</h4>
          <ul className="space-y-4 text-[#f5f2ed]/60 font-sans text-sm tracking-wide">
            <li className="flex items-center justify-between border-b border-[#f5f2ed]/10 pb-2">
              <span>Monday - Friday</span>
              <span>9:00 AM - 8:00 PM</span>
            </li>
            <li className="flex items-center justify-between border-b border-[#f5f2ed]/10 pb-2">
              <span>Saturday</span>
              <span>10:00 AM - 6:00 PM</span>
            </li>
            <li className="flex items-center justify-between border-b border-[#f5f2ed]/10 pb-2">
              <span>Sunday</span>
              <span className="text-[#C5A059]">Closed</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#f5f2ed]/10 text-center text-[#f5f2ed]/40 text-xs font-sans tracking-widest uppercase">
        &copy; {new Date().getFullYear()} RedStone Barbershop. All rights reserved.
      </div>
    </footer>
  );
}
