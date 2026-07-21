import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogOut, Trash2, Clock, User, Scissors, Phone,
  ChevronLeft, ChevronRight, Plus, X, AlertCircle,
  Calendar as CalendarIcon, Check, Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  SERVICES, MONTH_NAMES, DAY_NAMES, CLOSED_WEEKDAY,
  todayStr, toDateStr, weekdayOf, formatDisplayDate,
} from '../../shared/constants';

const TOKEN_KEY = 'maky_admin_token';

type Booking = {
  id: string;
  date: string;
  time: string;
  service: string;
  clientName: string;
  clientPhone: string;
};

type Tab = 'termini' | 'novi';

// ─── API helpers ─────────────────────────────────────────────────────────────

/** Bacamo je kad server vrati 401 — poziv iznad tada odjavljuje korisnika. */
class UnauthorizedError extends Error {
  constructor() { super('Sesija je istekla'); this.name = 'UnauthorizedError'; }
}

async function apiFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (res.status === 401) throw new UnauthorizedError();
  return res;
}

/** Poruka o grešci iz JSON odgovora, sa sigurnim fallbackom. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json() as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Provjerava `exp` iz JWT-a bez verifikacije potpisa — samo da izbjegnemo
 * prikaz admin panela sa sigurno isteklim tokenom. Pravu provjeru radi server.
 */
function isTokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split('.');
    const { exp } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true; // neispravan token — tretiraj kao istekao
  }
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(await errorMessage(res, 'Prijava nije uspjela'));
        return;
      }
      const data = await res.json() as { token?: string };
      if (!data.token) { setError('Neispravan odgovor servera'); return; }
      onLogin(data.token);
    } catch {
      setError('Greška pri povezivanju sa serverom');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blush flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <h1 className="serif text-4xl font-bold tracking-tighter mb-2">
            MAKY <span className="italic font-light text-gold">ADMIN</span>
          </h1>
          <p className="text-sm text-neutral-400 font-medium">Pristup za vlasnike salona</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-neutral-200/60 shadow-[0_20px_40px_rgb(0,0,0,0.06)] p-8 flex flex-col gap-5">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">Lozinka</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full px-5 py-4 border border-neutral-200 rounded-xl bg-neutral-50 text-neutral-900 font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 px-4 py-3 rounded-xl"
              >
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || !password}
            className="luxury-button disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neutral-900 disabled:hover:scale-100"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Prijavi se'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-neutral-400 hover:text-gold transition-colors underline underline-offset-4">
            Nazad na sajt
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onDelete,
}: {
  booking: Booking;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:border-gold/30 transition-colors"
    >
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2 text-neutral-900 font-bold">
            <User size={15} className="text-gold shrink-0" />
            <span>{booking.clientName}</span>
          </div>
          <a href={`tel:${booking.clientPhone}`} className="flex items-center gap-2 text-sm text-neutral-500 mt-1 hover:text-gold transition-colors">
            <Phone size={13} className="shrink-0" />
            {booking.clientPhone}
          </a>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold bg-gold/10 text-gold px-3 py-1.5 rounded-full shrink-0">
          <Clock size={13} />
          {booking.time}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-neutral-700 font-medium">
            <Scissors size={13} className="text-gold shrink-0" />
            {booking.service}
          </div>
          <div className="text-xs text-neutral-400 mt-1 font-medium">
            {formatDisplayDate(booking.date)}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {confirmDelete ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => onDelete(booking.id)}
                className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
              >
                Obriši
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="delete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(true)}
              className="p-2 text-neutral-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Add Booking Form ─────────────────────────────────────────────────────────

function AddBookingForm({
  token, onSuccess, onUnauthorized,
}: { token: string; onSuccess: () => void; onUnauthorized: () => void }) {
  const [form, setForm] = useState({
    clientName: '', clientPhone: '', service: '', date: '', time: '',
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!form.date) { setAvailableSlots([]); return; }

    const controller = new AbortController();
    setSlotsLoading(true);
    fetch(`/api/bookings/available?date=${encodeURIComponent(form.date)}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() as Promise<{ availableSlots: string[] }> : Promise.reject(new Error('fetch')))
      .then(d => setAvailableSlots(d.availableSlots ?? []))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== 'AbortError') setAvailableSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSlotsLoading(false);
      });
    setForm(f => ({ ...f, time: '' }));

    return () => controller.abort();
  }, [form.date]);

  // Nedjeljom salon ne radi — ista pravila kao na javnoj strani.
  const isClosedDay = !!form.date && weekdayOf(form.date) === CLOSED_WEEKDAY;

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.clientPhone || !form.service || !form.date || !form.time) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/api/bookings', token, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError(await errorMessage(res, 'Termin nije dodan'));
        return;
      }
      setSuccess(true);
      setForm({ clientName: '', clientPhone: '', service: '', date: '', time: '' });
      setTimeout(() => { setSuccess(false); onSuccess(); }, 1500);
    } catch (err) {
      if (err instanceof UnauthorizedError) { onUnauthorized(); return; }
      setError('Greška pri slanju');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 gap-4"
      >
        <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center shadow-lg">
          <Check size={32} className="text-white" />
        </div>
        <p className="font-semibold text-neutral-900">Termin dodan!</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Ime i prezime</label>
          <input
            type="text"
            value={form.clientName}
            onChange={e => set('clientName')(e.target.value)}
            placeholder="Ana Savić"
            className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 text-sm font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Telefon</label>
          <input
            type="tel"
            value={form.clientPhone}
            onChange={e => set('clientPhone')(e.target.value)}
            placeholder="+381 64 000 0000"
            className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 text-sm font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Usluga</label>
        <select
          value={form.service}
          onChange={e => set('service')(e.target.value)}
          className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 text-sm font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all appearance-none"
        >
          <option value="">Odaberite uslugu...</option>
          {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Datum</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date')(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 text-sm font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">
            Termin {slotsLoading && <Loader2 size={12} className="inline animate-spin ml-1" />}
          </label>
          <select
            value={form.time}
            onChange={e => set('time')(e.target.value)}
            disabled={!form.date || slotsLoading}
            className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 text-sm font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed appearance-none"
          >
            <option value="">{form.date ? 'Odaberite termin...' : 'Prvo odaberite datum'}</option>
            {availableSlots.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {form.date && !slotsLoading && availableSlots.length === 0 && (
            <p className="text-xs text-neutral-400 mt-1">
              {isClosedDay ? 'Nedjeljom salon ne radi.' : 'Nema slobodnih termina za ovaj datum.'}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 px-4 py-3 rounded-xl"
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={submitting || !form.clientName || !form.clientPhone || !form.service || !form.date || !form.time}
        className="luxury-button disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neutral-900 disabled:hover:scale-100 mt-2"
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Dodaj termin</>}
      </button>
    </form>
  );
}

// ─── Calendar ────────────────────────────────────────────────────────────────

function AdminCalendar({
  bookings,
  selectedDate,
  onSelectDate,
}: {
  bookings: Booking[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const [cal, setCal] = useState(new Date());
  const year = cal.getFullYear();
  const month = cal.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const firstDayIndex = firstDay === 0 ? 6 : firstDay - 1;

  const dateStr = (d: number) => toDateStr(new Date(year, month, d));

  return (
    <div className="bg-neutral-50 border border-neutral-200/60 rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-neutral-900 text-base">{MONTH_NAMES[month]} {year}.</h4>
        <div className="flex gap-1">
          <button onClick={() => setCal(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setCal(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2 font-semibold text-neutral-400">
        {DAY_NAMES.map(d => <div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const ds = dateStr(d);
          const hasBookings = bookings.some(b => b.date === ds);
          const isSelected = selectedDate === ds;
          return (
            <button
              key={d}
              onClick={() => onSelectDate(isSelected ? null : ds)}
              className={`aspect-square relative flex items-center justify-center text-sm rounded-lg transition-all font-semibold ${
                isSelected
                  ? 'bg-neutral-900 text-white scale-105'
                  : hasBookings
                  ? 'bg-gold/15 hover:bg-gold/25 text-neutral-800'
                  : 'hover:bg-neutral-200 text-neutral-500'
              }`}
            >
              {d}
              {hasBookings && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-gold rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  // Istekao token iz localStorage ne treba ni prikazati kao prijavljenu sesiju.
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored || isTokenExpired(stored)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return stored;
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('termini');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setBookings([]);
    setSelectedDate(null);
  }, []);

  const fetchBookings = useCallback(async (t: string) => {
    setLoadingBookings(true);
    setFetchError('');
    try {
      const res = await apiFetch('/api/bookings', t);
      if (!res.ok) {
        setFetchError(await errorMessage(res, 'Greška pri dohvatu rezervacija'));
        return;
      }
      const data = await res.json() as unknown;
      if (!Array.isArray(data)) {
        setFetchError('Neispravan odgovor servera');
        return;
      }
      setBookings(data as Booking[]);
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleLogout(); return; }
      setFetchError('Greška pri dohvatu rezervacija');
    } finally {
      setLoadingBookings(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      fetchBookings(token);
    }
  }, [token, fetchBookings]);

  const handleLogin = (t: string) => setToken(t);

  /**
   * Brisanje se potvrđuje TEK nakon uspješnog odgovora servera.
   * Ranije se kartica uklanjala iz UI-ja bez provjere, pa je istekla sesija ili
   * pad baze ostavljao termin u bazi dok je vlasnica mislila da je obrisan.
   */
  const handleDelete = async (id: string) => {
    if (!token) return;
    setFetchError('');
    try {
      const res = await apiFetch(`/api/bookings/${id}`, token, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        setFetchError(await errorMessage(res, 'Termin nije obrisan. Pokušajte ponovo.'));
        return;
      }
      // 404 znači da ga više nema — uklanjanje iz liste je i tada ispravno.
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      if (err instanceof UnauthorizedError) { handleLogout(); return; }
      setFetchError('Greška pri brisanju. Provjerite konekciju i pokušajte ponovo.');
    }
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;

  const filtered = selectedDate
    ? bookings.filter(b => b.date === selectedDate)
    : [...bookings].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  // toISOString() vraća UTC i noću bi prikazivao jučerašnji dan — koristimo
  // lokalni datum salona (Europe/Belgrade).
  const today = todayStr();
  const todayCount = bookings.filter(b => b.date === today).length;
  const upcomingCount = bookings.filter(b => b.date >= today).length;

  return (
    <div className="min-h-screen bg-blush">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-blush/90 backdrop-blur-xl border-b border-neutral-200/60 px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="serif text-xl font-bold tracking-tighter">
            MAKY <span className="italic font-light text-gold">ADMIN</span>
          </Link>
          <span className="hidden sm:block text-xs text-neutral-400 font-medium border border-neutral-200 px-2 py-0.5 rounded-full">
            Panel
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Odjavi se</span>
        </button>
      </header>

      {/* Mobile Tabs */}
      <div className="sm:hidden sticky top-16 z-30 bg-blush border-b border-neutral-200/60 px-4 pt-3 pb-0 flex gap-0">
        {(['termini', 'novi'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 pb-3 text-sm font-bold capitalize border-b-2 transition-all ${
              activeTab === tab
                ? 'border-gold text-gold'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            {tab === 'termini' ? 'Termini' : 'Novi termin'}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl border border-neutral-200/60 p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)]">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Danas</p>
            <p className="text-3xl font-bold text-neutral-900">{todayCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200/60 p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)]">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Nadolazeći</p>
            <p className="text-3xl font-bold text-gold">{upcomingCount}</p>
          </div>
          <div className="hidden sm:block bg-white rounded-2xl border border-neutral-200/60 p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)]">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Ukupno</p>
            <p className="text-3xl font-bold text-neutral-900">{bookings.length}</p>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-8">
          {/* Left: Calendar + Add form */}
          <div className="sm:col-span-4 flex flex-col gap-6">
            <div>
              <h2 className="serif text-2xl font-bold mb-4">Kalendar</h2>
              <AdminCalendar
                bookings={bookings}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="w-full mt-2 text-xs font-semibold text-neutral-400 hover:text-neutral-600 transition-colors py-2"
                >
                  Prikaži sve termine
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="serif text-2xl font-bold">Novi termin</h2>
                <button
                  onClick={() => setShowAddForm(v => !v)}
                  className="p-2 rounded-xl hover:bg-neutral-200 transition-colors text-neutral-500"
                >
                  {showAddForm ? <X size={18} /> : <Plus size={18} />}
                </button>
              </div>
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-6">
                      <AddBookingForm
                        token={token}
                        onSuccess={() => { fetchBookings(token); setShowAddForm(false); }}
                        onUnauthorized={handleLogout}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-neutral-200 rounded-2xl text-sm font-semibold text-neutral-400 hover:border-gold hover:text-gold transition-all"
                >
                  <Plus size={18} /> Dodaj ručno
                </button>
              )}
            </div>
          </div>

          {/* Right: Booking list */}
          <div className="sm:col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="serif text-2xl font-bold">
                {selectedDate
                  ? `Termini: ${formatDisplayDate(selectedDate)}`
                  : 'Svi termini'}
              </h2>
              <button
                onClick={() => token && fetchBookings(token)}
                disabled={loadingBookings}
                className="p-2 rounded-xl hover:bg-neutral-200 transition-colors text-neutral-400 disabled:opacity-40"
              >
                <Loader2 size={16} className={loadingBookings ? 'animate-spin' : ''} />
              </button>
            </div>

            {fetchError && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 px-4 py-3 rounded-xl mb-4">
                <AlertCircle size={16} /> {fetchError}
              </div>
            )}

            {loadingBookings ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-gold" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200/60">
                <CalendarIcon size={40} className="mx-auto mb-3 text-neutral-200" />
                <p className="text-sm font-medium text-neutral-400">Nema termina za odabrani period.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {filtered.map(b => (
                    <BookingCard key={b.id} booking={b} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="sm:hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'termini' ? (
              <motion.div
                key="termini"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <div className="mb-4">
                  <AdminCalendar
                    bookings={bookings}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                  />
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="w-full mt-2 text-xs font-semibold text-neutral-400 py-2"
                    >
                      Prikaži sve termine
                    </button>
                  )}
                </div>

                <h3 className="font-bold text-neutral-700 text-sm uppercase tracking-wider mb-3">
                  {selectedDate
                    ? `Termini — ${formatDisplayDate(selectedDate)}`
                    : 'Svi termini'}
                </h3>

                {loadingBookings ? (
                  <div className="flex justify-center py-12">
                    <Loader2 size={28} className="animate-spin text-gold" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200/60">
                    <CalendarIcon size={32} className="mx-auto mb-2 text-neutral-200" />
                    <p className="text-sm font-medium text-neutral-400">Nema termina.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <AnimatePresence>
                      {filtered.map(b => (
                        <BookingCard key={b.id} booking={b} onDelete={handleDelete} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="novi"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white rounded-2xl border border-neutral-200/60 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5"
              >
                <AddBookingForm
                  token={token}
                  onSuccess={() => { fetchBookings(token); setActiveTab('termini'); }}
                  onUnauthorized={handleLogout}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
