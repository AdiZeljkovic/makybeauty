import Header from '../components/Header';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Booking from '../components/Booking';
import Gallery from '../components/Gallery';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { motion, useScroll, useSpring } from 'motion/react';

export default function HomePage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="relative">
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gold z-[60] origin-left"
        style={{ scaleX }}
      />

      <Header />

      <main className="mt-[70px]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col gap-24 py-12 md:py-20 overflow-hidden">
          <Hero />
          <Services />
          <Gallery />
          <Booking />
          <Contact />
        </div>
      </main>

      <Footer />

      <motion.a
        href="#booking"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 z-40 sm:hidden w-14 h-14 bg-gold text-white rounded-full flex items-center justify-center shadow-2xl"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v4" /><path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
      </motion.a>
    </div>
  );
}
