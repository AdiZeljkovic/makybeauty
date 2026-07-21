<div align="center">

# Maky Beauty Bar

**Sajt i sistem online zakazivanja za beauty salon u Zrenjaninu**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)

[maky.beauty](https://maky.beauty) · [Instagram](https://www.instagram.com/maky_beauty_bar)

</div>

---

## O projektu

Jednostranični sajt salona sa ugrađenim sistemom zakazivanja. Posjetilac bira uslugu,
datum i slobodan termin i rezerviše ga bez registracije. Vlasnica salona kroz zaštićeni
admin panel vidi sve rezervacije, dodaje termine ručno i briše otkazane.

Aplikacija je namjerno mala i bez suvišnih zavisnosti — jedan Express proces poslužuje
i API i statički React build, iza nginx-a na VPS-u.

## Funkcionalnosti

### Za posjetioce
- Kalendar sa slobodnim terminima u realnom vremenu — zauzeti i prošli termini se ne nude
- Nedjelje su zatvorene, rezervacija je moguća do 180 dana unaprijed
- Rezervacija bez registracije: ime, telefon, usluga, termin
- Pristanak na obradu podataka prije slanja (ZZPL / GDPR)
- Responzivan dizajn, optimizovan za mobilne uređaje

### Za vlasnicu salona (`/admin`)
- Prijava lozinkom, sesija traje 12 sati
- Pregled svih termina, filtriranje po danu preko kalendara
- Statistika: termini danas, nadolazeći, ukupno
- Ručno dodavanje termina (uključujući naknadni upis u prošlost)
- Brisanje termina sa potvrdom u dva koraka

## Tehnologije

| Sloj | Tehnologija |
|---|---|
| Frontend | React 19, TypeScript (strict), Vite 6, Tailwind CSS 4, Motion, React Router 7 |
| Backend | Node.js, Express 4, TypeScript preko `tsx` |
| Baza | PostgreSQL |
| Autentikacija | JWT (`jsonwebtoken`) |
| Sigurnost | `helmet`, `express-rate-limit` |
| Testovi | `node:test` (ugrađeni runner, bez dodatnih zavisnosti) |
| Deploy | PM2 + nginx na HestiaCP VPS |

## Struktura projekta

```
├── server/                   Express API
│   ├── app.ts                Sastavljanje aplikacije — rute, middleware, headeri
│   ├── index.ts              Bootstrap — env, baza, graceful shutdown, GDPR čišćenje
│   ├── env.ts                Validacija konfiguracije pri startu
│   ├── db.ts                 PostgreSQL sloj, migracije, connection pool
│   ├── auth.ts               JWT tokeni i provjera lozinke u konstantnom vremenu
│   ├── validation.ts         Validacija svih ulaznih podataka
│   └── __tests__/            38 testova (ne zahtijevaju bazu)
│
├── shared/
│   └── constants.ts          Usluge, termini, datumski helperi — dijele ih server i klijent
│
├── src/                      React aplikacija
│   ├── components/           Header, Hero, Services, Gallery, Booking, Contact, Footer
│   ├── pages/                HomePage, AdminPage
│   ├── App.tsx               Rutiranje (admin panel je lazy-loaded)
│   └── index.css             Tailwind tema salona
│
├── DEPLOYMENT.md             Vodič za deploy na VPS
└── vite.config.ts
```

> `shared/constants.ts` je jedini izvor istine za listu usluga i termina. Server ih koristi
> za validaciju, frontend za prikaz — pa nije moguće da se raziđu.

## Pokretanje lokalno

**Preduslovi:** Node.js 20+ i PostgreSQL

```bash
git clone https://github.com/AdiZeljkovic/makybeauty.git
cd makybeauty
npm install
```

Kreiraj `.env` prema `.env.example`:

```bash
cp .env.example .env
```

Generiši `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Pokreni backend i frontend u dva terminala:

```bash
npm run server:dev    # API na portu 3001
npm run dev           # Sajt na portu 3000
```

Sajt: <http://localhost:3000> · Admin panel: <http://localhost:3000/admin>

Tabela `bookings` se kreira automatski pri prvom pokretanju.

## Konfiguracija

Server **odbija da se pokrene** ako obavezna vrijednost nedostaje, prekratka je,
ili je ostavljena na primjer-vrijednosti iz `.env.example`.

| Varijabla | Obavezna | Opis |
|---|:---:|---|
| `DATABASE_URL` | ✅ | PostgreSQL konekcija |
| `ADMIN_PASSWORD` | ✅ | Lozinka za admin panel (min. 12 znakova u produkciji) |
| `JWT_SECRET` | ✅ | Ključ za potpisivanje tokena (min. 32 znaka, preporučeno 64+) |
| `PORT` | — | Port servera (default: `3001`) |
| `NODE_ENV` | — | `production` na serveru, `development` lokalno |

## npm skripte

| Komanda | Šta radi |
|---|---|
| `npm run dev` | Vite dev server sa HMR-om (port 3000) |
| `npm run server:dev` | API sa automatskim restartom (port 3001) |
| `npm run build` | Produkcijski build u `dist/` |
| `npm start` | Produkcijski server — API + statički build |
| `npm test` | 38 testova (baza nije potrebna) |
| `npm run lint` | TypeScript provjera (strict mode) |

## API

| Metod | Ruta | Pristup | Opis |
|---|---|---|---|
| `GET` | `/api/health` | javno | Status servera i baze |
| `POST` | `/api/auth/login` | javno | Prijava — vraća JWT token |
| `GET` | `/api/bookings/available?date=` | javno | Slobodni termini za datum |
| `POST` | `/api/bookings` | javno | Nova rezervacija |
| `GET` | `/api/bookings` | admin | Svi termini (zadnjih 90 dana i nadalje) |
| `DELETE` | `/api/bookings/:id` | admin | Brisanje termina |

Zaštićene rute traže `Authorization: Bearer <token>`.
Javni endpoint za slobodne termine vraća **samo vremena** — nikad podatke o klijentima.

<details>
<summary>Primjeri</summary>

```bash
# Slobodni termini
curl "https://maky.beauty/api/bookings/available?date=2026-08-10"
# → {"availableSlots":["10:00","12:00","14:00","16:00"]}

# Rezervacija
curl -X POST https://maky.beauty/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-10","time":"12:00","service":"Pedikir",
       "clientName":"Ana Savić","clientPhone":"+381 65 355 7366"}'

# Prijava
curl -X POST https://maky.beauty/api/auth/login \
  -H "Content-Type: application/json" -d '{"password":"..."}'
# → {"token":"eyJ..."}
```
</details>

## Sigurnost

| Zaštita | Implementacija |
|---|---|
| Brute-force na prijavu | 5 pokušaja / 15 min po IP-u |
| Spam rezervacija | 5 rezervacija / sat po IP-u (admin izuzet) |
| Opšti API limit | 120 zahtjeva / min po IP-u |
| Poređenje lozinke | `crypto.timingSafeEqual` nad SHA-256 heševima |
| Tajne | Obavezne pri startu — bez tihih fallback vrijednosti |
| Dupli termini | `UNIQUE (date, time)` constraint u bazi |
| SQL injection | Isključivo parametrizovani upiti |
| Validacija | Datum, vrijeme, usluga, ime i telefon se provjeravaju na serveru |
| HTTP headeri | `helmet` — CSP, `frame-ancestors 'none'`, HSTS, `nosniff` |
| Poruke o greškama | Interne greške u log, klijentu generička poruka |
| Rok čuvanja podataka | Termini stariji od 12 mjeseci se brišu automatski |

Server-side validacija je namjerno nezavisna od frontenda: kalendar blokira nedjelje i
prošle datume, ali ih i API odbija — pravila ne smiju postojati samo u pretraživaču.

## Testovi

```bash
npm test
```

38 testova, bez potrebe za bazom podataka:

- **Datumska logika** — prestupne godine, prelazi mjeseca, vremenske zone
- **Validacija** — nepostojeći datumi, usluge van liste, SQL injection u ID-u
- **Autentikacija** — falsifikovani i istekli tokeni, timing-safe poređenje lozinke
- **HTTP sloj** — rate limiting, sigurnosni headeri, obrada grešaka kad je baza nedostupna

## Deploy

Detaljan vodič za HestiaCP VPS (nginx, PM2, SSL, migracija baze) nalazi se u
**[DEPLOYMENT.md](DEPLOYMENT.md)**.

```bash
git pull origin main
npm install
npm run build
pm2 restart maky-beauty
```

---

<div align="center">

Privatni komercijalni projekat · Maky Beauty Bar, Zrenjanin

</div>
