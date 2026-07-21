# Deployment Guide — Maky Beauty Bar
## Domena: maky.beauty · Server: HestiaCP VPS

---

## A. BACKUP POSTOJEĆE BAZE (radi se NA SERVERU, prije svega)

SSH na server, zatim:

```bash
# Kreiraj backup direktorij
mkdir -p ~/backups

# Backup baze (unesi lozinku za maky_user kad zatraži)
pg_dump -U maky_user -d maky_db -h localhost > ~/backups/maky_backup_$(date +%Y%m%d_%H%M).sql

# Provjeri da je backup kreiran i nije prazan
ls -lh ~/backups/
```

Sačuvaj taj `.sql` fajl i lokalno (opciono):
```bash
# S lokalnog računara (zamijeni IP adresom servera)
scp adizeljkovic@167.235.19.21:~/backups/maky_backup_*.sql .
```

---

## B. PRIPREMA DOMENE U HESTIACP

U HestiaCP web panelu (pod nalogom `adizeljkovic`):

1. **Web → Add Web Domain** → unesi `maky.beauty`
2. Uključi **SSL** (Let's Encrypt dugme) — HestiaCP automatski kreira nginx konfiguraciju i SSL
3. HestiaCP će kreirati direktorij: `/home/adizeljkovic/web/maky.beauty/public_html/`

---

## C. DEPLOY APLIKACIJE

### 1. Kloniraj repozitorij

```bash
# Aplikacija NE ide u public_html nego u app/ pored njega
cd /home/adizeljkovic/web/maky.beauty
git clone https://github.com/AdiZeljkovic/makybeauty.git app
cd app
```

### 2. Kreiraj `.env` fajl

```bash
nano .env
```

```env
DATABASE_URL=postgresql://maky_user:LOZINKA_IZ_STARE_INSTALACIJE@localhost:5432/maky_db
ADMIN_PASSWORD=TVOJA_ADMIN_LOZINKA
JWT_SECRET=DUGACAK_NASUMICAN_STRING_MIN_64_KARAKTERA
PORT=3005
NODE_ENV=production
```

> **Server sada odbija da se pokrene** ako `DATABASE_URL`, `ADMIN_PASSWORD` ili
> `JWT_SECRET` nedostaju, ako su prekratki, ili ako su ostavljeni na primjer-vrijednostima.
> Ako `pm2 logs` pokaže „Konfiguracija nije ispravna", pročitaj ispisanu listu — tačno
> kaže šta fali. To je namjerno: prije je nedostajući `JWT_SECRET` značio da aplikacija
> koristi javno poznat ključ iz repozitorija i da svako može ući u admin panel.

> **Važno:** `DATABASE_URL` koristi istu bazu (`maky_db`) — svi postojeći termini su sačuvani.  
> `PORT=3005` (3004 koristi stara instalacija dok ne ugasiš)

Generiši novi JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Instaliraj zavisnosti i buildi

```bash
npm install
npm run build

# Provjeri da je dist/ kreiran
ls dist/
```

### 4. Pokreni sa PM2

```bash
pm2 start npm --name "maky-beauty" -- run start
pm2 save

# Provjeri da radi
pm2 status
pm2 logs maky-beauty --lines 30
```

Trebalo bi da vidiš: `Server pokrenut na portu 3005`

---

## D. NGINX KONFIGURACIJA ZA maky.beauty

HestiaCP kreira nginx konfig automatski, ali ga trebamo promijeniti da proxira na Node.js.

```bash
# Otvori HestiaCP nginx SSL konfig za maky.beauty
nano /home/adizeljkovic/conf/web/maky.beauty/nginx.ssl.conf
```

Pronađi `location /` blok i zamijeni ga ovako (ostatak fajla ostavi netaknut):

```nginx
location / {
    proxy_pass http://127.0.0.1:3005;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

Isto uradi za HTTP konfig ako postoji `nginx.conf`:
```bash
nano /home/adizeljkovic/conf/web/maky.beauty/nginx.conf
```

Provjeri i primijeni:
```bash
nginx -t && systemctl reload nginx && echo "USPJESNO"
```

---

## E. PROVJERA

```bash
# Health check — provjerava i konekciju na bazu
curl https://maky.beauty/api/health
# Treba vratiti: {"status":"ok","db":"ok"}
# Ako vrati 503 {"status":"degraded"} — server radi, ali baza nije dostupna.

# Test API
curl "https://maky.beauty/api/bookings/available?date=2026-08-10"
# Treba vratiti: {"availableSlots":["10:00","12:00","14:00","16:00"]}

# Sigurnosni headeri su postavljeni
curl -sI https://maky.beauty | grep -i "content-security-policy\|x-content-type"

# Rate limiting radi (6. pokušaj mora vratiti 429)
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code} " -X POST https://maky.beauty/api/auth/login \
    -H "Content-Type: application/json" -d '{"password":"pogresna"}'
done; echo
# Očekivano: 401 401 401 401 401 429

# PM2 status
pm2 status
```

Otvori browser:
- **https://maky.beauty** — stranica
- **https://maky.beauty/admin** — admin panel

---

## F. GAŠENJE STARE INSTALACIJE (termin.adizeljkovic.com)

Kada potvrdiš da `maky.beauty` radi ispravno:

```bash
# Zaustavi stari PM2 proces
pm2 stop maky
pm2 delete maky
pm2 save

# Stara instalacija ostaje na disku kao backup
# /home/adizeljkovic/web/termin.adizeljkovic.com/public_html/
```

---

## G. PREBACIVANJE NA NOVI REPOZITORIJ

> Radi se **jednom**, samo ako je aplikacija na serveru već klonirana iz starog
> repoa `AdiZeljkovic/Maky`. Kod se od sada objavljuje na `AdiZeljkovic/makybeauty` —
> bez ovog koraka `git pull` bi tiho povlačio staru verziju.

```bash
cd /home/adizeljkovic/web/maky.beauty/app

# Provjeri odakle trenutno povlači
git remote -v

# Prebaci na novi repozitorij
git remote set-url origin https://github.com/AdiZeljkovic/makybeauty.git
git remote -v          # mora pokazivati makybeauty.git

git fetch origin
git reset --hard origin/main
```

> `git reset --hard` briše sve lokalne izmjene u `app/` direktoriju.
> `.env` **nije** pogođen jer je u `.gitignore`-u — ali ga ipak kopiraj za svaki slučaj:
> `cp .env ~/env-backup-$(date +%Y%m%d)`

Zatim nastavi sa `npm install && npm run build && pm2 restart maky-beauty`.

---

## H. AŽURIRANJE APLIKACIJE (budući deployevi)

```bash
cd /home/adizeljkovic/web/maky.beauty/app

git pull origin main
npm install
npm run build
pm2 restart maky-beauty

# Provjeri
pm2 logs maky-beauty --lines 20
curl https://maky.beauty/api/health
```

---

## Korisne komande

```bash
# PM2 logovi
pm2 logs maky-beauty

# Real-time monitoring
pm2 monit

# nginx logovi
tail -f /var/log/nginx/error.log

# PostgreSQL — pregled termina
psql -U maky_user -d maky_db -h localhost -c "SELECT * FROM bookings ORDER BY date, time;"

# Backup baze
pg_dump -U maky_user -d maky_db -h localhost > ~/backups/maky_backup_$(date +%Y%m%d).sql

# Restore baze (ako ikad zatreba)
psql -U maky_user -d maky_db -h localhost < ~/backups/maky_backup_20260504.sql
```

---

## DNS podešavanje za maky.beauty

Na DNS provajderu za domenu `maky.beauty` dodaj:

| Tip | Ime | Vrijednost | TTL |
|-----|-----|------------|-----|
| A | @ | 167.235.19.21 | 300 |
| A | www | 167.235.19.21 | 300 |

> DNS propagacija traje 5–30 min (ponekad do 24h).  
> Provjeri: `nslookup maky.beauty`

---

## Sigurnosne napomene

- `.env` se **nikad** ne commituje (zaštićen `.gitignore`-om)
- `ADMIN_PASSWORD` — min. 12 karaktera, simboli i brojevi
- `JWT_SECRET` — nasumičan string min. 64 karaktera
- HestiaCP automatski obnavlja SSL certifikat

### Šta je ugrađeno u aplikaciju

| Zaštita | Detalj |
|---|---|
| Brute-force na login | 5 pokušaja / 15 min po IP-u, pa 429 |
| Spam rezervacija | 5 rezervacija / sat po IP-u (admin izuzet) |
| Opšti API limit | 120 zahtjeva / min po IP-u |
| Dupli termini | `UNIQUE (date, time)` na nivou baze |
| Sigurnosni headeri | `helmet` — CSP, `frame-ancestors 'none'`, HSTS, nosniff |
| Validacija | Datum, vrijeme, usluga, ime i telefon se provjeravaju na serveru |
| Curenje grešaka | Interne greške se logiraju, klijent dobija generičku poruku |
| Rok čuvanja podataka | Termini stariji od 12 mjeseci se brišu automatski, dnevno |

> **Važno:** `app.set('trust proxy', 1)` je uključen jer aplikacija stoji iza nginx-a.
> Ako ikad promijeniš broj proxy slojeva ispred aplikacije, promijeni i ovu vrijednost —
> inače rate limiter vidi sve zahtjeve kao da dolaze sa `127.0.0.1` i jedan posjetilac
> može zaključati sajt svima.

### Migracija baze pri prvom pokretanju nove verzije

Pri startu se automatski dodaje indeks na `date` i `UNIQUE` constraint na `(date, time)`.

Ako baza **već sadrži** duple termine, constraint se **neće** dodati i u logu ćeš vidjeti
listu duplikata. Riješi ih ručno pa restartuj:

```bash
# Pregled duplikata
psql -U maky_user -d maky_db -h localhost -c \
  "SELECT date, time, COUNT(*) FROM bookings GROUP BY date, time HAVING COUNT(*) > 1;"

# Nakon što ručno obrišeš viškove:
pm2 restart maky-beauty && pm2 logs maky-beauty --lines 20
```

### Testovi

```bash
npm test        # 38 testova, ne zahtijevaju bazu
npm run lint    # TypeScript provjera (strict mode)
```
