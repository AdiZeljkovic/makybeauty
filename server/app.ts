import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  getBookings, getAvailableSlots, createBooking, deleteBooking, healthCheck,
} from './db.js';
import { generateToken, verifyToken, checkPassword } from './auth.js';
import {
  ValidationError, validateBookingInput, validateDateFormat, validateId, singleQueryParam,
} from './validation.js';

export type AppOptions = {
  /**
   * Isključuje rate limiting. SAMO za testove koji provjeravaju druge stvari —
   * u produkciji ostaje uključen (limiti su glavna zaštita ovog sajta).
   */
  rateLimits?: boolean;
};

/**
 * Sastavlja Express aplikaciju. Odvojeno od index.ts (koji je bootstrap) da bi
 * se HTTP sloj mogao testirati bez pokretanja baze i bez zauzimanja porta.
 */
export function createApp({ rateLimits = true }: AppOptions = {}): Express {
  const isProd = process.env.NODE_ENV === 'production';
  const app = express();

  // Iza nginx-a smo: bez ovoga bi rate limiter vidio sve zahtjeve kao 127.0.0.1
  // i jedan posjetilac bi mogao zaključati cijeli sajt svima.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // ─── Sigurnosni headeri ─────────────────────────────────────────────────────

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],   // zaštita od clickjackinga na /admin
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        ...(isProd ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false, // slike se učitavaju s Unsplasha
    hsts: isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  }));

  // Nijedan legitiman zahtjev nije veći od ovoga.
  app.use(express.json({ limit: '10kb' }));

  // ─── Rate limiting ──────────────────────────────────────────────────────────

  const passThrough = (_req: Request, _res: Response, next: NextFunction) => next();

  const limitHandler = (message: string) =>
    (_req: Request, res: Response) => { res.status(429).json({ error: message }); };

  /** Brute-force zaštita: 5 pogrešnih lozinki po IP-u u 15 minuta. */
  const loginLimiter = !rateLimits ? passThrough : rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true, // uspješna prijava ne troši kvotu
    handler: limitHandler('Previše pokušaja prijave. Pokušajte ponovo za 15 minuta.'),
  });

  /** Anti-spam: sprječava da skripta popuni sve termine za mjesece unaprijed. */
  const bookingLimiter = !rateLimits ? passThrough : rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => isAdmin(req), // admin ručno dodaje termine bez ograničenja
    handler: limitHandler('Previše rezervacija s ove adrese. Pokušajte kasnije ili nas pozovite.'),
  });

  /** Opšti štit za ostatak API-ja. */
  const apiLimiter = !rateLimits ? passThrough : rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: limitHandler('Previše zahtjeva. Sačekajte trenutak.'),
  });

  app.use('/api', apiLimiter);

  // ─── Auth ───────────────────────────────────────────────────────────────────

  function bearerToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (typeof header !== 'string') return undefined;
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' ? token : undefined;
  }

  function isAdmin(req: Request): boolean {
    return verifyToken(bearerToken(req));
  }

  const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (!isAdmin(req)) {
      res.status(401).json({ error: 'Neautorizovano' });
      return;
    }
    next();
  };

  /** Prosljeđuje odbijene Promise-e u error middleware umjesto da vise zauvijek. */
  type AsyncHandler = (req: Request, res: Response) => Promise<void>;
  const wrap = (fn: AsyncHandler) =>
    (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

  // ─── Rute ───────────────────────────────────────────────────────────────────

  app.get('/api/health', wrap(async (_req, res) => {
    try {
      await healthCheck();
      res.json({ status: 'ok', db: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'unreachable' });
    }
  }));

  app.post('/api/auth/login', loginLimiter, (req: Request, res: Response): void => {
    const { password } = (req.body ?? {}) as { password?: unknown };
    if (!checkPassword(password)) {
      res.status(401).json({ error: 'Pogrešna lozinka' });
      return;
    }
    res.json({ token: generateToken() });
  });

  /** Javno — vraća samo slobodna vremena, nikad podatke o klijentima. */
  app.get('/api/bookings/available', wrap(async (req, res) => {
    const date = validateDateFormat(singleQueryParam(req.query.date, 'date'));
    res.json({ availableSlots: await getAvailableSlots(date) });
  }));

  app.post('/api/bookings', bookingLimiter, wrap(async (req, res) => {
    // Admin smije unijeti i termin u prošlosti (naknadni upis); posjetilac ne.
    const admin = isAdmin(req);
    const data = validateBookingInput(req.body, { allowPast: admin });

    if (!admin) {
      const stillFree = await getAvailableSlots(data.date);
      if (!stillFree.includes(data.time)) {
        throw new ValidationError('Termin je već zauzet', 409);
      }
    }
    res.status(201).json(await createBooking(data));
  }));

  app.get('/api/bookings', requireAuth, wrap(async (_req, res) => {
    res.json(await getBookings());
  }));

  app.delete('/api/bookings/:id', requireAuth, wrap(async (req, res) => {
    const deleted = await deleteBooking(validateId(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Termin ne postoji ili je već obrisan' });
      return;
    }
    res.json({ success: true });
  }));

  // Nepoznata API ruta mora vratiti JSON, a ne HTML iz SPA fallbacka ispod.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Ruta ne postoji' });
  });

  // ─── React build u produkciji ───────────────────────────────────────────────

  if (isProd) {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.join(dirname, '../dist');

    // Fajlovi u /assets imaju hash u imenu → smiju se keširati zauvijek.
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      immutable: true,
      maxAge: '1y',
    }));
    app.use(express.static(distPath, { index: false, maxAge: '1h' }));

    app.get('*', (_req: Request, res: Response) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ─── Centralna obrada grešaka ───────────────────────────────────────────────

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof ValidationError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    // Neispravan JSON ili preveliko tijelo zahtjeva.
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Neispravan format zahtjeva' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.too.large') {
      res.status(413).json({ error: 'Zahtjev je prevelik' });
      return;
    }
    // Sve ostalo je naša greška: logujemo detalje, klijentu šaljemo generičku
    // poruku. Nikad ne prosljeđujemo err.message — curili bi detalji o bazi.
    console.error('[greška]', err);
    res.status(500).json({ error: 'Greška servera. Pokušajte ponovo.' });
  });

  return app;
}
