/**
 * Validacija okruženja pri startu.
 *
 * Aplikacija NAMJERNO odbija da se pokrene ako tajne nedostaju ili su slabe.
 * Ranije je JWT_SECRET imao hardkodirani fallback — to je značilo da jedan
 * zaboravljen .env tiho pretvori admin panel u javno dostupan panel.
 */

const isProd = process.env.NODE_ENV === 'production';

const errors: string[] = [];
const warnings: string[] = [];

function required(name: string, minLength = 1): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    errors.push(`${name} nije postavljen u .env fajlu`);
    return '';
  }
  if (value.length < minLength) {
    errors.push(`${name} je prekratak (${value.length} znakova, minimum ${minLength})`);
  }
  return value;
}

export const DATABASE_URL = required('DATABASE_URL');
// Minimum spušten sa 12 na 7 na izričit zahtjev vlasnika, da bi se zadržala
// postojeća admin lozinka. Admin panel je javno dostupan, pa duža lozinka
// ostaje preporuka — vratiti na 12 čim se lozinka promijeni.
export const ADMIN_PASSWORD = required('ADMIN_PASSWORD', isProd ? 7 : 4);
export const JWT_SECRET = required('JWT_SECRET', isProd ? 32 : 16);
export const PORT = Number(process.env.PORT) || 3001;

// Vrijednosti iz .env.example ne smiju nikad završiti u produkciji.
const PLACEHOLDERS = [
  'vasa_sigurna_lozinka',
  'vasa_jwt_tajna_vrijednost_min_32_karaktera',
  'maky-dev-secret-change-in-production',
  'TVOJA_ADMIN_LOZINKA',
  'DUGACAK_NASUMICAN_STRING_MIN_64_KARAKTERA',
];
for (const [name, value] of Object.entries({ ADMIN_PASSWORD, JWT_SECRET })) {
  if (value && PLACEHOLDERS.includes(value)) {
    errors.push(`${name} još uvijek ima primjer-vrijednost iz .env.example — promijenite je`);
  }
}

if (isProd && JWT_SECRET && JWT_SECRET.length < 64) {
  warnings.push('JWT_SECRET je kraći od 64 znaka — preporučeno: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
}

if (Number.isNaN(Number(process.env.PORT)) && process.env.PORT !== undefined) {
  errors.push(`PORT nije broj: "${process.env.PORT}"`);
}

export function assertEnv(): void {
  for (const w of warnings) console.warn(`[upozorenje] ${w}`);
  if (errors.length > 0) {
    console.error('\n  Konfiguracija nije ispravna — server se ne pokreće:\n');
    for (const e of errors) console.error(`   • ${e}`);
    console.error('\n  Provjerite .env fajl (pogledajte .env.example za format).\n');
    process.exit(1);
  }
}
