// Zajedničke konstante — koristi ih i server (validacija) i frontend (prikaz).
// Jedan izvor istine: ako se ovdje promijeni usluga, mijenja se svuda.

export const SERVICES = [
  'Korekcija noktiju',
  'Gel lak / izlivanje',
  'Pedikir',
  'Depilacija lica',
  'Depilacija tela',
  'Ekstra volumen trepavice',
  'Prirodne trepavice',
] as const;

export const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00'] as const;

export const MONTH_NAMES = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
] as const;

export const DAY_NAMES = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'] as const;

/** Salon radi ponedjeljak–subota; nedjelja je zatvorena. */
export const CLOSED_WEEKDAY = 0; // 0 = nedjelja (JS getDay/getUTCDay)

export const TIMEZONE = 'Europe/Belgrade';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Koliko unaprijed se smije rezervisati (sprječava rezervacije za 2099.). */
export const MAX_BOOKING_DAYS_AHEAD = 180;

// ─── Datumski helperi (bez timezone bugova) ──────────────────────────────────

/**
 * Današnji datum u vremenskoj zoni salona, kao 'YYYY-MM-DD'.
 * NE koristiti toISOString() — on vraća UTC i noću/ujutru daje pogrešan dan.
 */
export function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** Trenutno vrijeme u zoni salona, kao 'HH:MM'. */
export function nowTimeStr(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date());
}

/** Formatira lokalni Date u 'YYYY-MM-DD' (bez UTC pomaka). */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Dan u sedmici za 'YYYY-MM-DD' string, nezavisno od timezone servera.
 * Parsiramo kao UTC podne da nas pomak zone nikad ne prebaci na susjedni dan.
 */
export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

/** Da li je datum kalendarski validan (npr. '2026-02-31' je nevažeći). */
export function isRealDate(dateStr: string): boolean {
  if (!DATE_RE.test(dateStr)) return false;
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return toDateStrUTC(d) === dateStr;
}

function toDateStrUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Datum + n dana, kao 'YYYY-MM-DD'. */
export function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStrUTC(d);
}

/** Prikaz '2026-07-21' → '21.07.2026' */
export function formatDisplayDate(dateStr: string): string {
  return dateStr.split('-').reverse().join('.');
}
