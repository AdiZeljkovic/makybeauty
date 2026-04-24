import { motion } from 'motion/react';
import { Sparkles, Flower2, Eye } from 'lucide-react';

const services = [
  {
    title: 'Profesionalna nega noktiju',
    description: 'Vrhunski manikir i pedikir uz korišćenje najkvalitetnijih materijala. Od klasičnog gel laka do umetničkog dizajna noktiju.',
    icon: <Sparkles className="text-gold" size={32} />,
    image: 'https://images.unsplash.com/photo-1604654894611-6973b376cbde?q=80&w=2574&auto=format&fit=crop'
  },
  {
    title: 'Depilacija i nega kože',
    description: 'Nežna i efikasna depilacija uz tretmane nege kože koji je čine svilenkastom i zdravom. Vaša koža zaslužuje najbolje.',
    icon: <Flower2 className="text-gold" size={32} />,
    image: 'https://images.unsplash.com/photo-1570172619380-4104bf75fa65?q=80&w=2670&auto=format&fit=crop'
  },
  {
    title: 'Nadogradnja trepavica',
    description: 'Profesionalna nadogradnja trepavica koja naglašava Vašu prirodnu lepotu. Od diskretnog 1 na 1 do dramatičnog volumena.',
    icon: <Eye className="text-gold" size={32} />,
    image: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?q=80&w=2574&auto=format&fit=crop'
  }
];

export default function Services() {
  return (
    <section id="services" className="flex flex-col gap-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-neutral-200/60 pb-12">
        <div className="max-w-2xl">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-sans text-sm md:text-base text-gold font-medium mb-3 block"
          >
            Ekskluzivna nega
          </motion.span>
          <h2 className="serif text-5xl md:text-7xl font-bold leading-tight text-neutral-900">Usluge lepote & <span className="italic font-light text-gold">wellnessa</span></h2>
        </div>
        <p className="font-sans text-base md:text-lg text-neutral-500 max-w-sm leading-relaxed mb-2 md:mb-4">
          Svaki tretman je prilagođen Vašim potrebama, koristeći najkvalitetnije proizvode za vrhunske rezultate.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {services.map((service, i) => (
          <motion.div 
            key={service.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.8 }}
            className="service-card-editorial group flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-blush rounded-[2rem] flex items-center justify-center mb-8 mx-auto group-hover:scale-110 group-hover:rotate-6 group-hover:bg-gold transition-all duration-700 shadow-sm">
              <div className="text-gold group-hover:text-white transition-all duration-500">
                {service.icon}
              </div>
            </div>
            <h3 className="serif text-2xl font-bold mb-5 text-neutral-900 group-hover:text-gold transition-colors">{service.title}</h3>
            <p className="font-sans text-sm md:text-base leading-relaxed text-neutral-600 px-2 sm:px-6">
              {service.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
