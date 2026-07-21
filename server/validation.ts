import {
  SERVICES, TIME_SLOTS, CLOSED_WEEKDAY, MAX_BOOKING_DAYS_AHEAD,
  isRealDate, weekdayOf, todayStr, addDaysStr,
} from '../shared/constants.js';

/** Greška koju je izazvao korisnik — server je vraća kao 400/409, nikad kao 500. */
export class ValidationError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
  }
}

const NAME_RE = /^[\p{L}\p{M}\s'’.-]{2,80}$/u;
const PHONE_RE = /^[+\d][\d\s()/-]{5,24}$/;
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;

/** Uklanja kontrolne znakove i višestruke razmake iz korisničkog unosa. */
function clean(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ValidationError(`Polje "${field}" je obavezno`);
  const trimmed = value.replace(CONTROL_CHARS_RE, '').replace(/\s+/g, ' ').trim();
  if (trimmed.length === 0) throw new ValidationError(`Polje "${field}" je obavezno`);
  return trimmed;
}

export function validateDate(raw: unknown, { allowPast = false } = {}): string {
  const date = clean(raw, 'datum');
  if (!isRealDate(date)) {
    throw new ValidationError('Datum nije ispravan (očekivani format: YYYY-MM-DD)');
  }
  if (!allowPast && date < todayStr()) {
    throw new ValidationError('Ne možete rezervisati termin u prošlosti');
  }
  if (date > addDaysStr(todayStr(), MAX_BOOKING_DAYS_AHEAD)) {
    throw new ValidationError(`Termini se mogu zakazati najviše ${MAX_BOOKING_DAYS_AHEAD} dana unaprijed`);
  }
  if (weekdayOf(date) === CLOSED_WEEKDAY) {
    throw new ValidationError('Nedjeljom ne radimo — izaberite drugi dan');
  }
  return date;
}

/**
 * Samo provjera formata — za javni upit "koji su termini slobodni?".
 * Nedjelju i prošle datume ovdje NE odbijamo greškom: kalendar smije pitati za
 * bilo koji dan, a odgovor je jednostavno prazna lista slobodnih termina.
 */
export function validateDateFormat(raw: unknown): string {
  const date = clean(raw, 'datum');
  if (!isRealDate(date)) {
    throw new ValidationError('Datum nije ispravan (očekivani format: YYYY-MM-DD)');
  }
  return date;
}

export function validateTime(raw: unknown): string {
  const time = clean(raw, 'termin');
  if (!(TIME_SLOTS as readonly string[]).includes(time)) {
    throw new ValidationError('Izabrani termin ne postoji');
  }
  return time;
}

export function validateService(raw: unknown): string {
  const service = clean(raw, 'usluga');
  if (!(SERVICES as readonly string[]).includes(service)) {
    throw new ValidationError('Izabrana usluga ne postoji');
  }
  return service;
}

export function validateName(raw: unknown): string {
  const name = clean(raw, 'ime i prezime');
  if (!NAME_RE.test(name)) {
    throw new ValidationError('Ime i prezime mora imati 2–80 slova (bez brojeva i posebnih znakova)');
  }
  return name;
}

export function validatePhone(raw: unknown): string {
  const phone = clean(raw, 'broj telefona');
  if (!PHONE_RE.test(phone)) {
    throw new ValidationError('Broj telefona nije ispravan');
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) {
    throw new ValidationError('Broj telefona nije ispravan');
  }
  return phone;
}

export type ValidatedBooking = {
  date: string; time: string; service: string; clientName: string; clientPhone: string;
};

/** Validira cijeli zahtjev za rezervaciju. `allowPast` koristi admin panel. */
export function validateBookingInput(body: unknown, { allowPast = false } = {}): ValidatedBooking {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Neispravan zahtjev');
  }
  const b = body as Record<string, unknown>;
  return {
    date: validateDate(b.date, { allowPast }),
    time: validateTime(b.time),
    service: validateService(b.service),
    clientName: validateName(b.clientName),
    clientPhone: validatePhone(b.clientPhone),
  };
}

/** Query parametri mogu stići kao niz (?date=a&date=b) ili objekat — odbijamo oboje. */
export function singleQueryParam(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ValidationError(`Parametar "${field}" je obavezan`);
  return value;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateId(raw: unknown): string {
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    throw new ValidationError('Neispravan ID termina');
  }
  return raw;
}
