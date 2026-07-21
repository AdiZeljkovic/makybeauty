/**
 * Integracioni testovi HTTP sloja.
 *
 * Baza NIJE potrebna: DATABASE_URL pokazuje na nepostojeći port, pa ove rute
 * provjeravaju upravo ono što mora raditi i kad je baza nedostupna —
 * autentikaciju, rate limiting, validaciju, headere i obradu grešaka.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';

const PASSWORD = 'integracijska-lozinka-123';
process.env.ADMIN_PASSWORD = PASSWORD;
process.env.JWT_SECRET = 'integracijska-tajna-najmanje-32-znaka-duga';
process.env.DATABASE_URL = 'postgresql://nikoga:nema@127.0.0.1:59999/nepostoji';
process.env.NODE_ENV = 'test';

const { createApp } = await import('../app.js');
const { closePool } = await import('../db.js');

let server: Server;
let base: string;
let limitedServer: Server;
let limitedBase: string;

before(async () => {
  // Glavni app bez rate limita — inače bi limiter blokirao same testove.
  server = createApp({ rateLimits: false }).listen(0);
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const addr = server.address();
  if (typeof addr === 'string' || addr === null) throw new Error('nema porta');
  base = `http://127.0.0.1:${addr.port}`;

  // Zaseban app SA limitima, samo za testove rate limitinga.
  limitedServer = createApp({ rateLimits: true }).listen(0);
  await new Promise<void>(resolve => limitedServer.once('listening', () => resolve()));
  const laddr = limitedServer.address();
  if (typeof laddr === 'string' || laddr === null) throw new Error('nema porta');
  limitedBase = `http://127.0.0.1:${laddr.port}`;
});

after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await new Promise<void>(resolve => limitedServer.close(() => resolve()));
  await closePool().catch(() => { /* pool nikad nije ni spojen */ });
});

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

// ─── Autentikacija ────────────────────────────────────────────────────────────

test('login odbija pogrešnu lozinku', async () => {
  const res = await post('/api/auth/login', { password: 'pogresna' });
  assert.equal(res.status, 401);
  const body = await res.json() as { error: string };
  assert.equal(body.error, 'Pogrešna lozinka');
});

test('login ne puca na neispravan tip lozinke', async () => {
  for (const password of [null, 123, { a: 1 }, ['x'], undefined]) {
    const res = await post('/api/auth/login', { password });
    assert.equal(res.status, 401, `tip: ${typeof password}`);
  }
  const res = await post('/api/auth/login', {});
  assert.equal(res.status, 401, 'bez polja password');
});

test('login vraća token za tačnu lozinku', async () => {
  const res = await post('/api/auth/login', { password: PASSWORD });
  assert.equal(res.status, 200);
  const body = await res.json() as { token: string };
  assert.ok(body.token, 'token mora postojati');
  assert.equal(body.token.split('.').length, 3, 'validan JWT oblik');
});

test('zaštićene rute traže token', async () => {
  assert.equal((await fetch(`${base}/api/bookings`)).status, 401);
  assert.equal((await fetch(`${base}/api/bookings`, {
    headers: { Authorization: 'Bearer nijetoken' },
  })).status, 401);
  assert.equal((await fetch(`${base}/api/bookings`, {
    headers: { Authorization: 'Basic dXNlcjpwYXNz' },
  })).status, 401, 'pogrešna auth šema');
});

test('token potpisan starim hardkodiranim secretom se odbija', async () => {
  const forged = jwt.sign({ admin: true }, 'maky-dev-secret-change-in-production');
  const res = await fetch(`${base}/api/bookings`, {
    headers: { Authorization: `Bearer ${forged}` },
  });
  assert.equal(res.status, 401, 'stari fallback secret više ne važi');
});

test('DELETE bez tokena je odbijen prije nego što dotakne bazu', async () => {
  const res = await fetch(`${base}/api/bookings/3f2504e0-4f89-41d3-9a0c-0305e82c3301`, {
    method: 'DELETE',
  });
  assert.equal(res.status, 401);
});

// ─── Validacija ───────────────────────────────────────────────────────────────

test('rezervacija sa neispravnim podacima vraća 400 i jasnu poruku', async () => {
  const cases: Array<[string, unknown]> = [
    ['prazan objekat', {}],
    ['datum u prošlosti', { date: '2020-01-01', time: '10:00', service: 'Pedikir', clientName: 'Ana Savić', clientPhone: '0651234567' }],
    ['nepostojeći slot', { date: '2027-01-04', time: '03:00', service: 'Pedikir', clientName: 'Ana Savić', clientPhone: '0651234567' }],
    ['nepostojeća usluga', { date: '2027-01-04', time: '10:00', service: 'Hakovanje', clientName: 'Ana Savić', clientPhone: '0651234567' }],
    ['ime sa brojevima', { date: '2027-01-04', time: '10:00', service: 'Pedikir', clientName: 'Ana123', clientPhone: '0651234567' }],
    ['neispravan telefon', { date: '2027-01-04', time: '10:00', service: 'Pedikir', clientName: 'Ana Savić', clientPhone: 'abc' }],
  ];
  for (const [naziv, body] of cases) {
    const res = await post('/api/bookings', body);
    assert.equal(res.status, 400, naziv);
    const json = await res.json() as { error: string };
    assert.ok(json.error.length > 0, `${naziv}: mora imati poruku`);
    assert.ok(!/relation|column|postgres|pg_|syntax error/i.test(json.error),
      `${naziv}: poruka ne smije curiti detalje baze — dobijeno: ${json.error}`);
  }
});

test('nedjelja se odbija na serveru, ne samo u kalendaru', async () => {
  const res = await post('/api/bookings', {
    date: '2027-01-03', // nedjelja
    time: '10:00', service: 'Pedikir', clientName: 'Ana Savić', clientPhone: '0651234567',
  });
  assert.equal(res.status, 400);
  const json = await res.json() as { error: string };
  assert.match(json.error, /Nedjelj/i);
});

test('neispravan datum u query-ju vraća 400', async () => {
  assert.equal((await fetch(`${base}/api/bookings/available?date=smece`)).status, 400);
  assert.equal((await fetch(`${base}/api/bookings/available`)).status, 400, 'bez parametra');
  assert.equal((await fetch(`${base}/api/bookings/available?date=a&date=b`)).status, 400, 'niz umjesto stringa');
});

test('neispravan JSON vraća 400, ne 500', async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{nije validan json',
  });
  assert.equal(res.status, 400);
});

test('preveliko tijelo zahtjeva se odbija', async () => {
  const res = await post('/api/auth/login', { password: 'x'.repeat(200_000) });
  assert.equal(res.status, 413);
});

// ─── Ponašanje kad je baza nedostupna ─────────────────────────────────────────

test('health endpoint javlja degradaciju umjesto da sruši proces', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 503, 'baza je nedostupna');
  const json = await res.json() as { status: string; db: string };
  assert.equal(json.db, 'unreachable');
});

test('greška baze vraća 500 sa generičkom porukom, bez internih detalja', async () => {
  const res = await fetch(`${base}/api/bookings/available?date=2027-01-04`);
  assert.equal(res.status, 500);
  const json = await res.json() as { error: string };
  assert.equal(json.error, 'Greška servera. Pokušajte ponovo.');
  assert.ok(!/ECONNREFUSED|127\.0\.0\.1|59999|postgres/i.test(json.error),
    'poruka ne smije otkrivati infrastrukturu');
});

// ─── Sigurnosni headeri i rutiranje ───────────────────────────────────────────

test('sigurnosni headeri su postavljeni', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.ok(res.headers.get('content-security-policy'), 'CSP');
  assert.match(res.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null, 'Express se ne smije reklamirati');
});

test('nepoznata API ruta vraća JSON 404, ne HTML', async () => {
  const res = await fetch(`${base}/api/nepostojeca-ruta`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
});

// ─── Rate limiting (na zasebnoj instanci sa uključenim limitima) ─────────────

/** POST na instancu koja IMA rate limite. */
const limitedPost = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${limitedBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

test('brute-force na login se zaustavlja nakon 5 pokušaja', async () => {
  const statuses: number[] = [];
  for (let i = 0; i < 8; i++) {
    const res = await limitedPost('/api/auth/login', { password: `pokusaj-${i}` });
    statuses.push(res.status);
  }
  // Prvih 5 su obični 401; nakon toga limiter preuzima.
  assert.deepEqual(statuses.slice(0, 5), [401, 401, 401, 401, 401], `dobijeno: ${statuses.join(',')}`);
  assert.equal(statuses.at(-1), 429, 'posljednji pokušaj mora biti blokiran');

  const blocked = await limitedPost('/api/auth/login', { password: PASSWORD });
  assert.equal(blocked.status, 429, 'čak i tačna lozinka je blokirana dok traje kazna');
});

test('spam rezervacija se zaustavlja nakon 5 u satu', async () => {
  const valid = {
    date: '2027-01-04', time: '10:00', service: 'Pedikir',
    clientName: 'Ana Savić', clientPhone: '0651234567',
  };
  const statuses: number[] = [];
  for (let i = 0; i < 8; i++) {
    statuses.push((await limitedPost('/api/bookings', valid)).status);
  }
  assert.equal(statuses.at(-1), 429, `očekivan 429, dobijeno: ${statuses.join(',')}`);
  assert.equal(statuses.filter(s => s === 429).length, 3, 'tačno 3 blokirana od 8');
});

test('admin token zaobilazi limit za rezervacije', async () => {
  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  const valid = {
    date: '2027-01-04', time: '10:00', service: 'Pedikir',
    clientName: 'Ana Savić', clientPhone: '0651234567',
  };
  // Limit je već potrošen prethodnim testom — admin ipak mora proći dalje.
  const res = await limitedPost('/api/bookings', valid, { Authorization: `Bearer ${token}` });
  assert.notEqual(res.status, 429, 'admin ne smije biti rate-limitovan');
  assert.equal(res.status, 500, 'prolazi validaciju i pada tek na nedostupnoj bazi');
});
