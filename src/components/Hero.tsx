import { motion } from 'motion/react';

export default function Hero() {
  return (
    <section id="hero" className="hero-banner-editorial group">
      <div className="absolute inset-0 overflow-hidden">
        <motion.img 
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=2670&auto=format&fit=crop" 
          alt="Beauty Bar" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/90 via-neutral-900/50 to-transparent" />
      </div>

      <div className="relative z-10 text-left px-8 md:px-20 w-full animate-float">
        <motion.div
           initial={{ opacity: 0, x: -30 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="serif text-5xl md:text-7xl lg:text-8xl mb-6 leading-[1.1] text-white">
            Elegancija <br />
            <span className="italic font-light text-gold leading-none">redefinisana.</span>
          </h1>
          <p className="font-sans text-sm md:text-base font-medium mb-10 text-neutral-200 max-w-md leading-relaxed">
            Maky Beauty Bar Zrenjanin <br className="hidden md:block" /> Vaš kutak luksuzne nege i opuštanja
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#booking" className="btn-gold-editorial shadow-[0_10px_30px_rgba(200,169,126,0.3)]">
              Zakažite termin
            </a>
            <a href="#services" className="text-sm font-semibold text-white hover:text-gold transition-colors underline underline-offset-8">
              Otkrijte usluge
            </a>
          </div>
        </motion.div>
      </div>

      {/* Decorative vertical badge */}
      <div className="absolute right-10 bottom-10 hidden md:block">
        <div className="flex items-center gap-4 origin-right -rotate-90 translate-x-1/2">
          <span className="text-sm text-white/60 whitespace-nowrap">Zrenjanin • Od 2024.</span>
          <div className="w-16 h-[1px] bg-white/30" />
        </div>
      </div>
    </section>
  );
}
