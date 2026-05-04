import { motion } from 'motion/react';
import { Instagram, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Početna', href: '#hero' },
    { name: 'Usluge', href: '#services' },
    { name: 'Rezervacije', href: '#booking' },
    { name: 'Galerija', href: '#gallery' },
    { name: 'Kontakt', href: '#contact' },
  ];

  return (
    <header className="editorial-header fixed top-0 left-0 right-0 z-50">
      <div className="flex-1 flex justify-start">
        <a href="#hero" className="serif text-2xl tracking-tighter hover:text-gold transition-all duration-300 font-bold group">
          MAKY <span className="font-light italic text-gold group-hover:text-black transition-colors">BEAUTY BAR</span>
        </a>
      </div>
        
      <nav className="hidden lg:flex gap-10 items-center justify-center flex-1">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-all duration-300 relative group"
          >
            {item.name}
            <span className="absolute -bottom-1.5 left-0 w-0 h-[1.5px] bg-gold transition-all duration-300 group-hover:w-full" />
          </a>
        ))}
      </nav>

      <div className="flex items-center justify-end gap-6 flex-1">
        <a href="tel:+381653557366" className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-600 hover:text-gold transition-all duration-300">
          <Phone size={18} />
        </a>
        <a href="https://www.instagram.com/maky_beauty_bar?utm_source=qr&igsh=NDB6NnZjdmdtaTI2" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-600 hover:text-gold transition-all duration-300">
          <Instagram size={18} />
        </a>
        <a 
          href="#booking"
          className="hidden sm:inline-flex px-8 py-3 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-gold transition-all duration-300 shadow-md hover:shadow-lg"
        >
          Zakaži termin
        </a>
      </div>
    </header>
  );
}
