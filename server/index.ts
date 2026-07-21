import 'dotenv/config';

import { assertEnv, PORT } from './env.js';
assertEnv(); // Pada odmah ako .env nije ispravan — prije nego što išta krene.

import { createApp } from './app.js';
import { initDb, closePool, deleteOldBookings } from './db.js';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const RETENTION_MONTHS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Periodično briše lične podatke starije od roka čuvanja (vidi pristanak u formi). */
async function runRetentionCleanup(): Promise<void> {
  try {
    const removed = await deleteOldBookings(RETENTION_MONTHS);
    if (removed > 0) {
      console.log(`[gdpr] Obrisano ${removed} termina starijih od ${RETENTION_MONTHS} mjeseci.`);
    }
  } catch (err) {
    console.error('[gdpr] Čišćenje starih termina nije uspjelo:', err);
  }
}

/** Baza zna kasniti s podizanjem nakon reboota — ne ulazimo u PM2 restart petlju. */
async function initDbWithRetry(attempts = 5): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await initDb();
      return;
    } catch (err) {
      if (i === attempts) throw err;
      const message = err instanceof Error ? err.message : String(err);
      const delay = Math.min(1000 * 2 ** (i - 1), 15_000);
      console.warn(`[db] Pokušaj ${i}/${attempts} nije uspio (${message}). Ponovo za ${delay}ms...`);
      await sleep(delay);
    }
  }
}

initDbWithRetry()
  .then(() => {
    const app = createApp();
    const server = app.listen(PORT, () => console.log(`Server pokrenut na portu ${PORT}`));

    void runRetentionCleanup();
    // unref() — tajmer ne smije držati proces živim pri gašenju.
    setInterval(() => void runRetentionCleanup(), DAY_MS).unref();

    // Graceful shutdown — zahtjevi u toku se završe prije gašenja.
    let shuttingDown = false;
    const shutdown = (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`\n${signal} primljen — gasim server...`);

      server.close(() => {
        closePool()
          .catch(err => console.error('[db] Greška pri zatvaranju poola:', err))
          .finally(() => process.exit(0));
      });

      setTimeout(() => {
        console.error('Gašenje predugo traje — prisilni izlaz.');
        process.exit(1);
      }, 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch(err => {
    console.error('Greška pri inicijalizaciji baze:', err);
    process.exit(1);
  });
