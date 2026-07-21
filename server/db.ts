import pg from 'pg';
import { DATABASE_URL } from './env.js';
import {
  TIME_SLOTS, CLOSED_WEEKDAY, todayStr, nowTimeStr, weekdayOf,
} from '../shared/constants.js';
import { ValidationError } from './validation.js';

const { Pool } = pg;

// SSL se traži u produkciji, osim kad je baza dokazano lokalna: na istom
// hostu, ili izričito isključena preko standardnog `sslmode=disable`
// (npr. Postgres kontejner na privatnoj Docker mreži, koji SSL i nema).
const dbIsLocal =
  /localhost|127\.0\.0\.1/.test(DATABASE_URL) ||
  /[?&]sslmode=disable/.test(DATABASE_URL);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' && !dbIsLocal
    ? { rejectUnauthorized: true }
    : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
});

/**
 * KRITIČNO: bez ovog handlera, greška na idle konekciji (restart baze, prekid
 * mreže) emituje neuhvaćen 'error' event i Node UBIJA cijeli proces.
 */
pool.on('error', (err) => {
  console.error('[db] Neočekivana greška na idle konekciji:', err.message);
});

export type BookingRow = {
  id: string;
  date: string;
  time: string;
  service: string;
  clientName: string;
  clientPhone: string;
};

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date        VARCHAR(10)  NOT NULL,
      time        VARCHAR(10)  NOT NULL,
      service     VARCHAR(255) NOT NULL,
      client_name VARCHAR(255) NOT NULL,
      client_phone VARCHAR(50) NOT NULL,
      created_at  TIMESTAMPTZ  DEFAULT NOW()
    )
  `);

  // Indeks na date — svaki upit za slobodne termine filtrira po datumu.
  await pool.query('CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings (date)');

  await ensureUniqueSlotConstraint();
}

/**
 * Jedinstvenost (date, time) na nivou BAZE — jedina pouzdana zaštita od duplih
 * rezervacija. Provjera "da li je slobodno" pa insert je race condition:
 * dva istovremena zahtjeva oba prođu provjeru i oba upišu isti termin.
 */
async function ensureUniqueSlotConstraint(): Promise<void> {
  const { rows } = await pool.query<{ date: string; time: string; count: string }>(`
    SELECT date, time, COUNT(*) AS count
    FROM bookings GROUP BY date, time HAVING COUNT(*) > 1
  `);

  if (rows.length > 0) {
    console.error('\n  UPOZORENJE: baza već sadrži duple termine — constraint nije dodan.');
    console.error('  Riješite ručno pa restartujte server. Dupli termini:');
    for (const r of rows) console.error(`   • ${r.date} u ${r.time} — ${r.count} rezervacije`);
    console.error('');
    return;
  }

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_date_time_unique'
      ) THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_date_time_unique UNIQUE (date, time);
      END IF;
    END $$;
  `);
}

export async function healthCheck(): Promise<void> {
  await pool.query('SELECT 1');
}

export async function closePool(): Promise<void> {
  await pool.end();
}

/** Admin lista. Podrazumijevano bez arhive starije od `sinceDays` dana. */
export async function getBookings(sinceDays = 90): Promise<BookingRow[]> {
  const result = await pool.query(
    `SELECT * FROM bookings
     WHERE date >= TO_CHAR(NOW() - ($1 || ' days')::interval, 'YYYY-MM-DD')
     ORDER BY date, time`,
    [String(sinceDays)]
  );
  return result.rows.map(toRow);
}

export async function getAvailableSlots(date: string): Promise<string[]> {
  // Nedjeljom se ne radi.
  if (weekdayOf(date) === CLOSED_WEEKDAY) return [];

  const today = todayStr();
  if (date < today) return [];

  const result = await pool.query('SELECT time FROM bookings WHERE date = $1', [date]);
  const booked = new Set<string>(result.rows.map((r: { time: string }) => r.time));

  // Za današnji dan ne nudimo termine koji su već prošli.
  const cutoff = date === today ? nowTimeStr() : null;

  return TIME_SLOTS.filter(s => !booked.has(s) && (cutoff === null || s > cutoff));
}

export async function createBooking(data: Omit<BookingRow, 'id'>): Promise<BookingRow> {
  try {
    const result = await pool.query(
      `INSERT INTO bookings (date, time, service, client_name, client_phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.date, data.time, data.service, data.clientName, data.clientPhone]
    );
    return toRow(result.rows[0]);
  } catch (err) {
    // 23505 = unique_violation → termin je u međuvremenu zauzet.
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
      throw new ValidationError('Termin je već zauzet', 409);
    }
    throw err;
  }
}

/**
 * Brisanje ličnih podataka starijih od `months` mjeseci.
 * Klijent pri rezervaciji pristaje na čuvanje podataka 12 mjeseci — ovo je
 * tehnička provedba tog obećanja (ZZPL / GDPR: ograničenje roka čuvanja).
 */
export async function deleteOldBookings(months = 12): Promise<number> {
  const result = await pool.query(
    `DELETE FROM bookings
     WHERE date < TO_CHAR(NOW() - ($1 || ' months')::interval, 'YYYY-MM-DD')`,
    [String(months)]
  );
  return result.rowCount ?? 0;
}

/** Vraća true ako je termin zaista obrisan, false ako nije postojao. */
export async function deleteBooking(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

function toRow(r: Record<string, string>): BookingRow {
  return {
    id: r.id,
    date: r.date,
    time: r.time,
    service: r.service,
    clientName: r.client_name,
    clientPhone: r.client_phone,
  };
}
