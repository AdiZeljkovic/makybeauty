import { motion } from 'motion/react';

const galleryItems = [
  {
    url: 'https://images.unsplash.com/photo-1604654894611-6973b376cbde?q=80&w=800&auto=format&fit=crop'
  },
  {
    url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=800&auto=format&fit=crop'
  },
  {
    url: 'https://images.unsplash.com/photo-1632345033839-23c719cd91f3?q=80&w=800&auto=format&fit=crop'
  },
  {
    url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?q=80&w=800&auto=format&fit=crop'
  },
  {
    url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=800&auto=format&fit=crop'
  },
  {
    url: 'https://images.unsplash.com/photo-1599387737877-09f984360e6e?q=80&w=800&auto=format&fit=crop'
  },
  {
    url: 'https://images.unsplash.com/photo-1616161560417-66d4db5892ec?q=80&w=800&auto=format&fit=crop'
  },
  {
    url: 'https://images.unsplash.com/photo-1558231908-724d67809986?q=80&w=800&auto=format&fit=crop'
  }
];

export default function Gallery() {
  return (
    <div id="gallery" className="flex flex-col gap-12">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-neutral-200/60 pb-8">
        <h2 className="serif text-5xl md:text-7xl font-bold text-neutral-900">Galerija</h2>
        <a 
          href="https://www.instagram.com/maky_beauty_bar?utm_source=qr&igsh=NDB6NnZjdmdtaTI2"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm md:text-base font-semibold text-gold hover:text-neutral-900 transition-colors underline underline-offset-4"
        >
          @maky_beauty_bar
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {galleryItems.map((img, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.8 }}
            className={`aspect-square bg-neutral-900 overflow-hidden relative group rounded-[2rem] shadow-[0_10px_30px_rgb(0,0,0,0.06)] cursor-pointer`}
          >
            <img 
              src={img.url} 
              alt="Salon work" 
              className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
