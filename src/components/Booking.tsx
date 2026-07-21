import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock, Scissors, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import {
  SERVICES, MONTH_NAMES, DAY_NAMES, CLOSED_WEEKDAY,
  toDateStr, formatDisplayDate,
} from '../../shared/constants';

export default function Booking() {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [consent, setConsent] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Potvrđeni termin "zamrzavamo" da poruka uspjeha ostane tačna i nakon reseta.
  const [confirmed, setConfirmed] = useState<{ name: string; service: string; date: string; time: string } | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Ne dozvoljavamo listanje unazad prije tekućeg mjeseca.
  const isCurrentMonth =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();

  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const prevMonth = () => {
    if (!isCurrentMonth) setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const generateDateStr = (day: number) => toDateStr(new Date(currentYear, currentMonth, day));
  const isPastDate = (day: number) => new Date(currentYear, currentMonth, day) < today;

  // Dohvat slobodnih termina za izabrani datum.
  useEffect(() => {
    if (!selectedDateStr) { setAvailableSlots([]); return; }

    // Odgovor na zastarjeli zahtjev ne smije pregaziti noviji izbor datuma.
    const controller = new AbortController();
    setSlotsLoading(true);
    setSelectedTime('');

    fetch(`/api/bookings/available?date=${encodeURIComponent(selectedDateStr)}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() as Promise<{ availableSlots: string[] }> : Promise.reject(new Error('fetch')))
      .then(d => setAvailableSlots(d.availableSlots ?? []))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== 'AbortError') setAvailableSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSlotsLoading(false);
      });

    return () => controller.abort();
  }, [selectedDateStr]);

  const reset = () => {
    setSelectedService('');
    setSelectedDateStr(null);
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setConsent(false);
    setIsConfirmed(false);
    setConfirmed(null);
    setSubmitError('');
    setAvailableSlots([]);
  };

  const refreshSlots = async (date: string) => {
    try {
      const res = await fetch(`/api/bookings/available?date=${encodeURIComponent(date)}`);
      if (!res.ok) return;
      const slots = await res.json() as { availableSlots: string[] };
      setAvailableSlots(slots.availableSlots ?? []);
      setSelectedTime('');
    } catch {
      /* tiho — korisnik već vidi poruku o grešci */
    }
  };

  const handleBook = async () => {
    if (!canSubmit) return;
    setSubmitLoading(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDateStr,
          time: selectedTime,
          service: selectedService,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
        }),
      });

      let data: { error?: string } = {};
      try { data = await res.json() as { error?: string }; } catch { /* prazan odgovor */ }

      if (!res.ok) {
        setSubmitError(data.error ?? 'Greška pri zakazivanju. Pokušajte ponovo.');
        // 409 = neko je bio brži; 429 = rate limit. U prvom slučaju osvježi termine.
        if (res.status === 409 && selectedDateStr) await refreshSlots(selectedDateStr);
        return;
      }

      setConfirmed({
        name: clientName.trim(),
        service: selectedService,
        date: selectedDateStr!,
        time: selectedTime,
      });
      setIsConfirmed(true);
    } catch {
      setSubmitError('Greška pri povezivanju. Provjerite internet konekciju.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formReady = !!selectedService && clientName.trim().length >= 2 && clientPhone.trim().length >= 6;
  const canSubmit = formReady && !!selectedDateStr && !!selectedTime && consent && !submitLoading;

  return (
    <section id="booking" className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/5 pb-8">
        <div className="max-w-2xl">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-sans text-sm md:text-base text-gold font-medium mb-3 block"
          >
            Sistem zakazivanja
          </motion.span>
          <h2 className="serif text-4xl md:text-6xl font-bold leading-tight">
            Zakažite vaš{' '}
            <span className="italic font-light text-gold">trenutak</span>
          </h2>
        </div>
        <p className="font-sans text-[14px] text-black/50 max-w-xs leading-relaxed italic md:text-right">
          Izaberite uslugu i termin koji Vam najviše odgovara.
        </p>
      </div>

      <div className="flex justify-center w-full">
        <div className="calendar-widget-editorial w-full max-w-5xl relative overflow-hidden">
          <AnimatePresence mode="popLayout">
            {!isConfirmed ? (
              <motion.div
                key="booking-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16"
              >
                {/* Left: Name, Phone, Service */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">Vaši podaci</h3>
                    <p className="text-sm font-medium text-neutral-500">Unesite podatke i odaberite tretman</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="booking-name" className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
                        Ime i prezime <span className="text-gold">*</span>
                      </label>
                      <input
                        id="booking-name"
                        type="text"
                        autoComplete="name"
                        maxLength={80}
                        placeholder="Vaše ime i prezime..."
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full px-5 py-4 border border-neutral-200/80 rounded-xl bg-neutral-50 text-neutral-900 font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="booking-phone" className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
                        Broj telefona <span className="text-gold">*</span>
                      </label>
                      <input
                        id="booking-phone"
                        type="tel"
                        autoComplete="tel"
                        maxLength={25}
                        placeholder="Vaš broj telefona..."
                        value={clientPhone}
                        onChange={e => setClientPhone(e.target.value)}
                        className="w-full px-5 py-4 border border-neutral-200/80 rounded-xl bg-neutral-50 text-neutral-900 font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                      />
                    </div>
                    <p className="text-xs text-neutral-400 font-medium"><span className="text-gold">*</span> Obavezna polja</p>

                    <div className="flex flex-col gap-3 mt-2">
                      <span className="text-sm font-bold text-neutral-700 mb-1">Usluga</span>
                      {SERVICES.map(service => (
                        <button
                          key={service}
                          type="button"
                          aria-pressed={selectedService === service}
                          onClick={() => setSelectedService(service)}
                          className={`text-left px-5 py-4 text-sm rounded-xl transition-all font-sans border font-medium ${
                            selectedService === service
                              ? 'bg-neutral-900 text-white border-neutral-900 shadow-[0_5px_15px_rgba(0,0,0,0.1)] scale-[1.02]'
                              : 'bg-neutral-50 border-neutral-200/60 hover:border-gold hover:bg-white text-neutral-800'
                          }`}
                        >
                          {service}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Calendar + Time */}
                <div className="lg:col-span-7 flex flex-col pt-8 lg:pt-0 border-t border-dashed lg:border-t-0 lg:border-l border-neutral-200 lg:pl-16">
                  <div className={!formReady ? 'opacity-30 pointer-events-none transition-opacity duration-300 flex-1' : 'transition-opacity duration-300 flex-1'}>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-lg font-bold text-neutral-900">{MONTH_NAMES[currentMonth]} {currentYear}.</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={prevMonth}
                          disabled={isCurrentMonth}
                          aria-label="Prethodni mjesec"
                          className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={nextMonth}
                          aria-label="Sljedeći mjesec"
                          className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2 text-sm text-center mb-4 font-semibold text-neutral-400">
                      {DAY_NAMES.map(d => <div key={d} className="py-2">{d}</div>)}
                    </div>

                    <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-8">
                      {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`empty-${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const d = i + 1;
                        const dStr = generateDateStr(d);
                        const past = isPastDate(d);
                        const isClosed = new Date(currentYear, currentMonth, d).getDay() === CLOSED_WEEKDAY;
                        const disabled = past || isClosed;
                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={disabled}
                            aria-label={`${d}. ${MONTH_NAMES[currentMonth]}${isClosed ? ' — zatvoreno' : ''}`}
                            aria-pressed={selectedDateStr === dStr}
                            onClick={() => setSelectedDateStr(dStr)}
                            className={`aspect-square flex items-center justify-center text-sm md:text-base rounded-xl transition-all font-bold ${
                              disabled
                                ? 'text-neutral-300 cursor-not-allowed'
                                : selectedDateStr === dStr
                                ? 'bg-gold text-white shadow-[0_8px_20px_rgba(200,169,126,0.3)] scale-[1.08] relative z-10'
                                : 'bg-neutral-100/50 hover:bg-gold/10 hover:text-gold text-neutral-700'
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {selectedDateStr && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          className="bg-neutral-50/50 rounded-2xl border border-neutral-100 p-5 mt-4"
                        >
                          <h4 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                            Slobodni termini
                            {slotsLoading && <Loader2 size={14} className="animate-spin text-gold" />}
                          </h4>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                            {slotsLoading ? (
                              <div className="col-span-full py-4 flex justify-center">
                                <Loader2 size={24} className="animate-spin text-gold" />
                              </div>
                            ) : availableSlots.length > 0 ? availableSlots.map(time => (
                              <button
                                key={time}
                                type="button"
                                aria-pressed={selectedTime === time}
                                onClick={() => setSelectedTime(time)}
                                className={`py-3 rounded-lg border text-sm transition-all font-sans font-semibold shadow-sm ${
                                  selectedTime === time
                                    ? 'bg-neutral-900 text-white border-neutral-900 scale-105'
                                    : 'border-neutral-200/80 bg-white hover:border-gold hover:text-gold text-neutral-700'
                                }`}
                              >
                                {time}
                              </button>
                            )) : (
                              <div className="col-span-full py-4 flex items-center justify-center gap-2 text-sm font-medium text-neutral-400">
                                <CalendarIcon size={16} /> Nema slobodnih termina za ovaj datum.
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-10 pt-6 flex flex-col gap-3">
                    {/* Pristanak na obradu podataka (ZZPL / GDPR) */}
                    <label className="flex items-start gap-3 text-xs text-neutral-500 leading-relaxed cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={e => setConsent(e.target.checked)}
                        className="mt-0.5 w-4 h-4 shrink-0 accent-[#C8A97E] cursor-pointer"
                      />
                      <span>
                        Saglasan/na sam da se moje ime i broj telefona koriste isključivo radi
                        zakazivanja i potvrde termina. Podaci se ne dijele s trećim licima i brišu se
                        nakon 12 mjeseci. <span className="text-gold">*</span>
                      </span>
                    </label>

                    <AnimatePresence>
                      {submitError && (
                        <motion.div
                          role="alert"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 px-4 py-3 rounded-xl"
                        >
                          <AlertCircle size={16} /> {submitError}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <button
                      type="button"
                      disabled={!canSubmit}
                      onClick={handleBook}
                      className="luxury-button w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neutral-900 disabled:hover:scale-100"
                    >
                      {submitLoading
                        ? <><Loader2 size={18} className="animate-spin" /> Zakazivanje...</>
                        : <>
                            <Scissors size={18} /> Rezerviši termin
                          </>
                      }
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 bg-gold text-white rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl animate-float">
                  <Check size={48} />
                </div>
                <div className="mb-12 text-center max-w-md mx-auto">
                  <span className="text-sm md:text-base text-gold font-medium mb-3 block">Hvala, {confirmed?.name}!</span>
                  <h4 className="serif italic text-4xl mb-6 text-neutral-900">Termin je rezervisan</h4>
                  <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6 flex flex-col gap-3">
                    <p className="text-lg font-sans text-neutral-800 font-bold">{confirmed?.service}</p>
                    <div className="flex items-center justify-center gap-3 text-neutral-500 font-medium">
                      <CalendarIcon size={16} />
                      <span>{confirmed ? formatDisplayDate(confirmed.date) : ''}</span>
                      <span>•</span>
                      <Clock size={16} />
                      <span>{confirmed?.time}</span>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={reset} className="luxury-button w-full max-w-xs mx-auto">
                  Novi termin
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
