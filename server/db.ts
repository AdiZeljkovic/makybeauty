import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const ALL_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];

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
}

export async function getBookings(): Promise<BookingRow[]> {
  const result = await pool.query('SELECT * FROM bookings ORDER BY date, time');
  return result.rows.map(toRow);
}

export async function getAvailableSlots(date: string): Promise<string[]> {
  const result = await pool.query('SELECT time FROM bookings WHERE date = $1', [date]);
  const booked = new Set<string>(result.rows.map((r: { time: string }) => r.time));
  return ALL_SLOTS.filter(s => !booked.has(s));
}

export async function createBooking(data: Omit<BookingRow, 'id'>): Promise<BookingRow> {
  const available = await getAvailableSlots(data.date);
  if (!available.includes(data.time)) {
    throw new Error('Termin je već zauzet');
  }
  const result = await pool.query(
    `INSERT INTO bookings (date, time, service, client_name, client_phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.date, data.time, data.service, data.clientName, data.clientPhone]
  );
  return toRow(result.rows[0]);
}

export async function deleteBooking(id: string): Promise<void> {
  await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
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
