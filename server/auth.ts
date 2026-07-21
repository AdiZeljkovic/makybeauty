import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ADMIN_PASSWORD, JWT_SECRET } from './env.js';

const TOKEN_TTL = '12h';

export function generateToken(): string {
  return jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return typeof payload === 'object' && payload !== null && (payload as { admin?: boolean }).admin === true;
  } catch {
    return false;
  }
}

/**
 * Poređenje lozinke u konstantnom vremenu.
 * Obično `===` curi informaciju kroz vrijeme izvršavanja (prekida se na prvom
 * različitom znaku), pa napadač može pogađati lozinku znak po znak.
 * Heširamo obje strane da timingSafeEqual uvijek dobije jednake dužine —
 * inače bi sama dužina lozinke procurila kroz izuzetak.
 */
export function checkPassword(candidate: unknown): boolean {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}
