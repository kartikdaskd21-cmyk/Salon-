import { useState, useRef } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';

export default function HeroMap() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  
  const { scrollYProgress } = useScroll({
    target: element ? { current: element } : undefined,
    offset: ["start start", "end end"]
  });

  // Apple-like cinematic scroll animations
  // Sequence 1: Main Title
  const text1Opacity = useTransform(scrollYProgress, [0, 0.15, 0.25], [1, 1, 0]);
  const text1Scale = useTransform(scrollYProgress, [0, 0.25], [1, 1.05]);
  const text1Y = useTransform(scrollYProgress, [0, 0.25], [0, -100]);

  // Sequence 2: Subtitle
  const text2Opacity = useTransform(scrollYProgress, [0.2, 0.35, 0.45], [0, 1, 0]);
  const text2Scale = useTransform(scrollYProgress, [0.2, 0.45], [0.95, 1.05]);
  const text2Y = useTransform(scrollYProgress, [0.2, 0.45], [100, -100]);

  // Sequence 3: Map Reveal (scales up from a card to full width)
  const mapOpacity = useTransform(scrollYProgress, [0.4, 0.6], [0, 1]);
  const mapScale = useTransform(scrollYProgress, [0.4, 0.7], [0.85, 1]);
  const mapWidth = useTransform(scrollYProgress, [0.5, 0.8], ["60%", "100%"]);
  const mapBorderRadius = useTransform(scrollYProgress, [0.5, 0.8], ["24px", "0px"]);

  return (
    <div ref={setElement} className="relative h-[400vh] bg-[#f5f2ed]">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        
        {/* Background gradient for royal feel */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.05)_0%,rgba(245,242,237,1)_100%)] pointer-events-none" />

        <motion.div style={{ opacity: text1Opacity, scale: text1Scale, y: text1Y }} className="absolute text-center px-4 w-full">
          <h1 className="text-6xl md:text-9xl font-serif text-[#1a1a1a] font-light tracking-tight mb-6">RedStone</h1>
          <p className="text-xs md:text-sm text-[#C5A059] font-sans tracking-[0.4em] uppercase font-medium">The Royal Standard</p>
        </motion.div>

        <motion.div style={{ opacity: text2Opacity, scale: text2Scale, y: text2Y }} className="absolute text-center px-4 w-full">
          <h2 className="text-5xl md:text-7xl font-serif text-[#1a1a1a] font-light mb-8 leading-[1.1]">Precision.<br/><span className="italic text-[#1a1a1a]/70">Elegance.</span><br/>Mastery.</h2>
          <p className="text-sm md:text-base text-[#1a1a1a]/50 font-sans tracking-[0.1em] uppercase">Experience grooming elevated to an art form.</p>
        </motion.div>

        <motion.div 
          style={{ 
            opacity: mapOpacity, 
            scale: mapScale,
            width: mapWidth,
            borderRadius: mapBorderRadius
          }} 
          className="absolute flex flex-col items-center overflow-hidden border border-black/10 bg-white z-20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="w-full h-[60vh] md:h-[80vh] relative flex items-center justify-center bg-[#1a1a1a]">
            {/* Background image of salon */}
            <div className="absolute inset-0 opacity-40">
              <img src="https://picsum.photos/seed/luxurysalon/1920/1080" alt="Salon Interior" className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
            </div>
            
            <div className="relative z-10 text-center p-8 md:p-12 bg-white/95 backdrop-blur-md border border-black/10 shadow-2xl max-w-md mx-4">
              <h3 className="text-sm md:text-base font-sans tracking-[0.2em] uppercase text-[#C5A059] mb-4 font-semibold">
                Our Sanctuary
              </h3>
              <h4 className="text-2xl md:text-3xl font-serif text-[#1a1a1a] mb-6">RedStone Flagship</h4>
              <p className="text-[#1a1a1a]/70 font-sans text-sm tracking-widest leading-relaxed mb-8 uppercase">
                123 Royal Crown Avenue<br/>
                Prestige District<br/>
                London, UK
              </p>
              <div className="w-12 h-[1px] bg-[#C5A059] mx-auto"></div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
