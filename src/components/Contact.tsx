import { motion } from 'motion/react';
import { MapPin, Phone, Instagram, Clock } from 'lucide-react';

const MAP_LINK = 'https://www.google.com/maps/search/?api=1&query=Suboti%C4%87eva+3%2C+23000+Zrenjanin';

export default function Contact() {
  return (
    <section id="contact" className="flex flex-col gap-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-neutral-200/60 pb-12">
        <div className="max-w-2xl">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-sans text-sm md:text-base text-gold font-medium mb-3 block"
          >
            Posetite nas
          </motion.span>
          <h2 className="serif text-5xl md:text-7xl font-bold leading-tight text-neutral-900">Gde se <span className="italic font-light text-gold">nalazimo</span></h2>
        </div>
        <p className="font-sans text-base md:text-lg text-neutral-500 max-w-sm leading-relaxed mb-2 md:mb-4">
          Nalazimo se u samom srcu Zrenjanina. Dođite da zajedno kreiramo Vašu savršenu priču o lepoti.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
        <div className="bg-white p-10 md:p-14 rounded-3xl border border-neutral-200/50 shadow-[0_10px_30px_rgb(0,0,0,0.06)] flex flex-col justify-between gap-16">
          <div className="space-y-10">
            <a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className="flex items-start gap-6 group">
              <div className="w-16 h-16 rounded-[1.5rem] bg-blush flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-white transition-all duration-500 shadow-sm shrink-0">
                <MapPin size={28} />
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-medium text-neutral-400 mb-1 block">Adresa</h4>
                <p className="font-sans text-lg md:text-xl font-medium text-neutral-900 leading-tight group-hover:text-gold transition-colors">Subotićeva 3, <br /> 23000 Zrenjanin</p>
              </div>
            </a>

            <a href="tel:+38123555000" className="flex items-start gap-6 group">
              <div className="w-16 h-16 rounded-[1.5rem] bg-blush flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-white transition-all duration-500 shadow-sm shrink-0">
                <Phone size={28} />
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-medium text-neutral-400 mb-1 block">Telefon</h4>
                <p className="font-sans text-lg md:text-xl font-medium text-neutral-900 leading-tight group-hover:text-gold transition-colors">+381 23 555 000</p>
              </div>
            </a>

            <a href="https://instagram.com/maky_beauty_zr" target="_blank" rel="noopener noreferrer" className="flex items-start gap-6 group">
              <div className="w-16 h-16 rounded-[1.5rem] bg-blush flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-white transition-all duration-500 shadow-sm shrink-0">
                <Instagram size={28} />
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-medium text-neutral-400 mb-1 block">Mreže</h4>
                <p className="font-sans text-lg md:text-xl font-medium text-neutral-900 leading-tight group-hover:text-gold transition-colors">@maky_beauty_zr</p>
              </div>
            </a>

            <div className="flex items-start gap-6 group">
              <div className="w-16 h-16 rounded-[1.5rem] bg-blush flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-white transition-all duration-500 shadow-sm shrink-0">
                <Clock size={28} />
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-medium text-neutral-400 mb-1 block">Radno vreme</h4>
                <p className="font-sans text-base font-medium text-neutral-900 leading-relaxed">
                  Pon – Pet: 09:00 – 20:00 <br />
                  Subota: 09:00 – 17:00 <br />
                  <span className="text-neutral-400">Nedjelja: Zatvoreno</span>
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 bg-neutral-50 rounded-2xl border border-neutral-100 italic">
            <p className="text-sm md:text-base font-sans leading-relaxed text-neutral-500">
              "Lepota počinje onog trenutka kada odlučiš da budeš ono što jesi." <br className="hidden md:block" /> — <span className="font-semibold mt-2 block">Maky Beauty Bar</span>
            </p>
          </div>
        </div>

        <div className="min-h-[450px] w-full bg-neutral-100 border border-neutral-200/50 rounded-3xl overflow-hidden shadow-[0_10px_30px_rgb(0,0,0,0.06)] relative group">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2801.378772392817!2d20.38883!3d45.3813!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x475ade6152a55555%3A0x1234567890abcdef!2sZrenjanin!5e0!3m2!1sen!2srs!4v1713690000000!5m2!1sen!2srs"
            width="100%"
            height="100%"
            style={{ border: 0, filter: 'grayscale(1) contrast(1.05) brightness(1.05) opacity(0.9)' }}
            allowFullScreen={true}
            loading="lazy"
            className="group-hover:filter-none transition-all duration-1000"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
          <a
            href={MAP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-6 right-6 px-6 py-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/50 hover:bg-white transition-colors duration-300"
          >
            <span className="text-sm font-medium text-neutral-800">Otvori na mapi</span>
          </a>
        </div>
      </div>
    </section>
  );
}
