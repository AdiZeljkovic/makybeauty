import jwt from 'jsonwebtoken';

const secret = () => process.env.JWT_SECRET ?? 'maky-dev-secret-change-in-production';

export function generateToken(): string {
  return jwt.sign({ admin: true }, secret(), { expiresIn: '12h' });
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    jwt.verify(token, secret());
    return true;
  } catch {
    return false;
  }
}
