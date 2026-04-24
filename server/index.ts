import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getBookings, getAvailableSlots, createBooking, deleteBooking } from './db.js';
import { generateToken, verifyToken } from './auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!verifyToken(token)) {
    res.status(401).json({ error: 'Neautorizovano' });
    return;
  }
  next();
};

// --- Auth ---
app.post('/api/auth/login', (req: Request, res: Response): void => {
  const { password } = req.body as { password: string };
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Pogrešna lozinka' });
    return;
  }
  res.json({ token: generateToken() });
});

// --- Available slots (public — returns only free times, no client data) ---
app.get('/api/bookings/available', async (req: Request, res: Response): Promise<void> => {
  const { date } = req.query as { date: string };
  if (!date) { res.status(400).json({ error: 'Datum je obavezan' }); return; }
  try {
    const availableSlots = await getAvailableSlots(date);
    res.json({ availableSlots });
  } catch {
    res.status(500).json({ error: 'Greška servera' });
  }
});

// --- Create booking (public) ---
app.post('/api/bookings', async (req: Request, res: Response): Promise<void> => {
  const { date, time, service, clientName, clientPhone } = req.body as {
    date: string; time: string; service: string; clientName: string; clientPhone: string;
  };
  if (!date || !time || !service || !clientName || !clientPhone) {
    res.status(400).json({ error: 'Sva polja su obavezna' });
    return;
  }
  try {
    const booking = await createBooking({ date, time, service, clientName, clientPhone });
    res.json(booking);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Greška servera';
    res.status(409).json({ error: message });
  }
});

// --- Get all bookings (admin only) ---
app.get('/api/bookings', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await getBookings();
    res.json(bookings);
  } catch {
    res.status(500).json({ error: 'Greška servera' });
  }
});

// --- Delete booking (admin only) ---
app.delete('/api/bookings/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteBooking(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Greška servera' });
  }
});

// --- Serve React build in production ---
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server pokrenut na portu ${PORT}`));
  })
  .catch(err => {
    console.error('Greška pri inicijalizaciji baze:', err);
    process.exit(1);
  });
