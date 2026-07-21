/**
 * Testovi čiste logike — pokreni sa: npm test
 * Ne zahtijevaju bazu podataka.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import {
  isRealDate, weekdayOf, addDaysStr, toDateStr, todayStr, nowTimeStr, formatDisplayDate,
  SERVICES, TIME_SLOTS,
} from '../../shared/constants.js';

// env.ts se čita pri importu, pa ga postavljamo prije dinamičkog importa auth-a.
process.env.ADMIN_PASSWORD = 'test-lozinka-123';
process.env.JWT_SECRET = 'test-tajna-vrijednost-najmanje-32-znaka';
process.env.DATABASE_URL = 'postgresql://test@localhost:5432/test';

// ─── Datumski helperi ─────────────────────────────────────────────────────────

test('isRealDate odbija nepostojeće datume', () => {
  assert.equal(isRealDate('2026-02-31'), false, '31. februar ne postoji');
  assert.equal(isRealDate('2025-02-29'), false, '2025. nije prestupna');
  assert.equal(isRealDate('2026-13-01'), false, '13. mjesec');
  assert.equal(isRealDate('2026-00-10'), false, '0. mjesec');
  assert.equal(isRealDate('26-01-01'), false, 'kratka godina');
  assert.equal(isRealDate('2026-1-1'), false, 'bez vodećih nula');
  assert.equal(isRealDate('abcdefghij'), false, 'smeće');
  assert.equal(isRealDate(''), false, 'prazno');
});

test('isRealDate prihvata ispravne datume', () => {
  assert.equal(isRealDate('2026-07-21'), true);
  assert.equal(isRealDate('2024-02-29'), true, '2024. jeste prestupna');
  assert.equal(isRealDate('2026-12-31'), true);
});

test('weekdayOf vraća tačan dan nezavisno od timezone', () => {
  assert.equal(weekdayOf('2026-07-19'), 0, '19.07.2026. je nedjelja');
  assert.equal(weekdayOf('2026-07-20'), 1, 'ponedjeljak');
  assert.equal(weekdayOf('2026-07-25'), 6, 'subota');
});

test('addDaysStr ispravno prelazi granice mjeseca i godine', () => {
  assert.equal(addDaysStr('2026-01-31', 1), '2026-02-01');
  assert.equal(addDaysStr('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysStr('2024-02-28', 1), '2024-02-29', 'prestupna godina');
  assert.equal(addDaysStr('2026-07-21', 180), '2027-01-17');
  assert.equal(addDaysStr('2026-03-01', -1), '2026-02-28');
});

test('toDateStr ne koristi UTC (ovo je bio bug sa brojačem "Danas")', () => {
  // Lokalna ponoć — toISOString() bi ovdje u UTC+2 vratio prethodni dan.
  const localMidnight = new Date(2026, 6, 21, 0, 30, 0);
  assert.equal(toDateStr(localMidnight), '2026-07-21');
});

test('todayStr i nowTimeStr vraćaju ispravan format', () => {
  assert.match(todayStr(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(nowTimeStr(), /^\d{2}:\d{2}$/);
});

test('formatDisplayDate okreće datum za prikaz', () => {
  assert.equal(formatDisplayDate('2026-07-21'), '21.07.2026');
});

// ─── Validacija ───────────────────────────────────────────────────────────────

const { validateDate, validateTime, validateService, validateName, validatePhone, validateId, validateBookingInput, ValidationError } =
  await import('../validation.js');

const throwsValidation = (fn: () => unknown, msg: string) =>
  assert.throws(fn, (e: unknown) => e instanceof ValidationError, msg);

test('validateDate odbija prošlost, nedjelju i predaleku budućnost', () => {
  throwsValidation(() => validateDate('2020-01-01'), 'prošlost');
  throwsValidation(() => validateDate('2026-07-19'), 'nedjelja');
  throwsValidation(() => validateDate(addDaysStr(todayStr(), 400)), '400 dana unaprijed');
  throwsValidation(() => validateDate('2026-02-31'), 'nepostojeći datum');
  throwsValidation(() => validateDate(null), 'null');
  throwsValidation(() => validateDate(12345), 'broj');
});

test('validateDate prihvata radni dan u bliskoj budućnosti', () => {
  let d = addDaysStr(todayStr(), 3);
  while (weekdayOf(d) === 0) d = addDaysStr(d, 1); // preskoči nedjelju
  assert.equal(validateDate(d), d);
});

test('validateTime prihvata samo postojeće slotove', () => {
  for (const t of TIME_SLOTS) assert.equal(validateTime(t), t);
  throwsValidation(() => validateTime('11:00'), 'nepostojeći slot');
  throwsValidation(() => validateTime('25:00'), 'nevažeće vrijeme');
  throwsValidation(() => validateTime(''), 'prazno');
});

test('validateService prihvata samo usluge iz liste', () => {
  for (const s of SERVICES) assert.equal(validateService(s), s);
  throwsValidation(() => validateService('Šišanje pudlice'), 'nepostojeća usluga');
  throwsValidation(() => validateService('<script>alert(1)</script>'), 'injection pokušaj');
});

test('validateName prihvata naša slova, odbija brojeve i smeće', () => {
  assert.equal(validateName('Ana Savić'), 'Ana Savić');
  assert.equal(validateName('Đorđe Šešelj-Žarković'), 'Đorđe Šešelj-Žarković');
  assert.equal(validateName("  Marija   Petrović  "), 'Marija Petrović', 'trim + sabijanje razmaka');
  throwsValidation(() => validateName('Ana123'), 'brojevi');
  throwsValidation(() => validateName('A'), 'prekratko');
  throwsValidation(() => validateName('x'.repeat(200)), 'predugo');
  throwsValidation(() => validateName('<script>'), 'html');
});

test('validatePhone prihvata realne formate', () => {
  assert.equal(validatePhone('+381 65 355 7366'), '+381 65 355 7366');
  assert.equal(validatePhone('0653557366'), '0653557366');
  assert.equal(validatePhone('065/355-7366'), '065/355-7366');
  throwsValidation(() => validatePhone('abc'), 'slova');
  throwsValidation(() => validatePhone('123'), 'prekratak');
  throwsValidation(() => validatePhone('1'.repeat(40)), 'predug');
});

test('validateId prihvata samo UUID', () => {
  const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  assert.equal(validateId(uuid), uuid);
  throwsValidation(() => validateId('1'), 'nije uuid');
  throwsValidation(() => validateId("' OR 1=1--"), 'sql injection pokušaj');
  throwsValidation(() => validateId(undefined), 'undefined');
});

test('validateBookingInput odbija nepotpun i neispravan zahtjev', () => {
  throwsValidation(() => validateBookingInput(null), 'null body');
  throwsValidation(() => validateBookingInput({}), 'prazan objekat');
  throwsValidation(() => validateBookingInput('string'), 'string body');
});

test('validateBookingInput prolazi za ispravan zahtjev', () => {
  let d = addDaysStr(todayStr(), 3);
  while (weekdayOf(d) === 0) d = addDaysStr(d, 1);
  const result = validateBookingInput({
    date: d, time: TIME_SLOTS[0], service: SERVICES[0],
    clientName: 'Ana Savić', clientPhone: '+381 65 355 7366',
  });
  assert.equal(result.date, d);
  assert.equal(result.service, SERVICES[0]);
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

const { generateToken, verifyToken, checkPassword } = await import('../auth.js');

test('checkPassword prihvata tačnu i odbija netačnu lozinku', () => {
  assert.equal(checkPassword('test-lozinka-123'), true);
  assert.equal(checkPassword('test-lozinka-124'), false);
  assert.equal(checkPassword('test-lozinka-1234'), false, 'duža lozinka');
  assert.equal(checkPassword('test-lozinka-12'), false, 'kraća lozinka');
  assert.equal(checkPassword(''), false);
  assert.equal(checkPassword(null), false, 'ne smije puknuti na null');
  assert.equal(checkPassword(undefined), false);
  assert.equal(checkPassword({ toString: () => 'test-lozinka-123' }), false, 'objekat nije string');
});

test('verifyToken prihvata svoj token, odbija tuđi i izmijenjen', () => {
  const token = generateToken();
  assert.equal(verifyToken(token), true);
  assert.equal(verifyToken(undefined), false);
  assert.equal(verifyToken(''), false);
  assert.equal(verifyToken('nije.jwt.token'), false);
  assert.equal(verifyToken(token.slice(0, -3) + 'aaa'), false, 'izmijenjen potpis');

  // Token potpisan starim hardkodiranim fallback-om ne smije više proći.
  const forged = jwt.sign({ admin: true }, 'maky-dev-secret-change-in-production');
  assert.equal(verifyToken(forged), false, 'stari hardkodirani secret');
});

test('verifyToken odbija validno potpisan token bez admin claima', () => {
  const noAdmin = jwt.sign({ admin: false }, process.env.JWT_SECRET!);
  assert.equal(verifyToken(noAdmin), false);
});

test('verifyToken odbija istekao token', () => {
  const expired = jwt.sign({ admin: true }, process.env.JWT_SECRET!, { expiresIn: '-1h' });
  assert.equal(verifyToken(expired), false);
});
