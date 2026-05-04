import { motion } from 'motion/react';
import { Phone, Instagram, Clock } from 'lucide-react';

const contacts = [
  {
    icon: <Phone size={28} />,
    label: 'Telefon',
    value: '+381 65 355 7366',
    href: 'tel:+381653557366',
  },
  {
    icon: <Instagram size={28} />,
    label: 'Instagram',
    value: '@maky_beauty_bar',
    href: 'https://www.instagram.com/maky_beauty_bar?utm_source=qr&igsh=NDB6NnZjdmdtaTI2',
    external: true,
  },
  {
    icon: <Clock size={28} />,
    label: 'Radno vreme',
    value: null,
    hours: [
      { days: 'Pon – Pet', time: '08:00 – 20:00' },
      { days: 'Subota', time: '08:00 – 20:00' },
      { days: 'Nedjelja', time: 'Zatvoreno', muted: true },
    ],
  },
];

export default function Contact() {
  return (
    <section id="contact" className="flex flex-col gap-16">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-neutral-200/60 pb-12">
        <div className="max-w-2xl">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-sans text-sm md:text-base text-gold font-medium mb-3 block"
          >
            Posetite nas
          </motion.span>
          <h2 className="serif text-5xl md:text-7xl font-bold leading-tight text-neutral-900">
            Pronađite nas u <span className="italic font-light text-gold">Zrenjaninu</span>
          </h2>
        </div>
        <p className="font-sans text-base md:text-lg text-neutral-500 max-w-sm leading-relaxed mb-2 md:mb-4">
          Uvijek smo tu za Vas. Zakažite termin ili nas kontaktirajte — odgovaramo brzo.
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contacts.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.7 }}
          >
            {item.href ? (
              <a
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="group flex flex-col gap-6 bg-white p-8 md:p-10 rounded-3xl border border-neutral-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500 h-full"
              >
                <div className="w-16 h-16 rounded-[1.5rem] bg-blush flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-white transition-all duration-500 shadow-sm">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">{item.label}</p>
                  <p className="serif text-2xl md:text-3xl font-bold text-neutral-900 group-hover:text-gold transition-colors duration-300 leading-tight">
                    {item.value}
                  </p>
                </div>
              </a>
            ) : (
              <div className="flex flex-col gap-6 bg-white p-8 md:p-10 rounded-3xl border border-neutral-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
                <div className="w-16 h-16 rounded-[1.5rem] bg-blush flex items-center justify-center text-gold shadow-sm">
                  {item.icon}
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{item.label}</p>
                  {item.hours?.map(h => (
                    <div key={h.days} className="flex justify-between items-center border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                      <span className={`font-sans text-sm font-semibold ${h.muted ? 'text-neutral-400' : 'text-neutral-700'}`}>
                        {h.days}
                      </span>
                      <span className={`font-sans text-sm font-bold ${h.muted ? 'text-neutral-300' : 'text-gold'}`}>
                        {h.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Quote Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden bg-neutral-900 rounded-3xl px-10 md:px-20 py-14 md:py-20 flex flex-col md:flex-row items-center justify-between gap-8"
      >
        {/* Decorative circle */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gold/10 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gold/5 pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <p className="serif text-2xl md:text-4xl italic font-light text-white leading-relaxed mb-4">
            "Lepota počinje onog trenutka kada odlučiš da budeš ono što jesi."
          </p>
          <span className="text-gold font-semibold text-sm md:text-base tracking-wide">— Maky Beauty Bar, Zrenjanin</span>
        </div>

        <a
          href="#booking"
          className="relative z-10 shrink-0 btn-gold-editorial shadow-[0_10px_30px_rgba(200,169,126,0.25)]"
        >
          Zakažite termin
        </a>
      </motion.div>

    </section>
  );
}
