export default function Footer() {
  return (
    <footer className="bg-blush text-neutral-900 py-16 px-6 lg:px-12 border-t border-neutral-200/60">
      <div className="flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="serif text-3xl tracking-tighter font-bold">
           MAKY <span className="text-gold italic font-light">BEAUTY BAR</span>
        </div>
        
        <div className="flex gap-10 flex-wrap justify-center font-sans">
          <a href="#hero" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-all duration-300">Početna</a>
          <a href="#services" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-all duration-300">Usluge</a>
          <a href="#gallery" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-all duration-300">Galerija</a>
          <a href="#contact" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-all duration-300">Kontakt</a>
        </div>
        
        <div className="text-sm text-neutral-400 text-center md:text-right font-medium">
          <p>© {new Date().getFullYear()} Maky Beauty Bar • Zrenjanin</p>
          <p className="mt-2 text-neutral-300">Kreirano sa ljubavlju i strašću</p>
        </div>
      </div>
    </footer>
  );
}
