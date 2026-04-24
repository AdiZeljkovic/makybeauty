# Deployment Guide — Maky Beauty Bar
## Domena: termin.adizeljkovic.com

---

## 1. Priprema servera (Ubuntu 22.04 LTS)

```bash
# Ažuriraj sistem
sudo apt update && sudo apt upgrade -y

# Instaliraj potrebne pakete
sudo apt install -y curl git nginx certbot python3-certbot-nginx ufw
```

---

## 2. Instaliraj Node.js 20 LTS (via nvm)

```bash
# Instaliraj nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Učitaj nvm u trenutnu sesiju
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Instaliraj Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Provjeri
node -v
npm -v
```

---

## 3. Instaliraj PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib

# Pokreni i omogući autostart
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Kreiraj bazu i korisnika
sudo -u postgres psql -c "CREATE USER maky_user WITH PASSWORD 'TVOJA_JAKA_LOZINKA';"
sudo -u postgres psql -c "CREATE DATABASE maky_db OWNER maky_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE maky_db TO maky_user;"

# Provjeri konekciju
psql -U maky_user -d maky_db -h localhost -c "SELECT 1;"
```

---

## 4. Instaliraj PM2 (process manager)

```bash
npm install -g pm2

# Postavi PM2 da se pokreće pri rebootu
pm2 startup
# Izvrši komandu koju PM2 ispiše (izgleda otprilike kao):
# sudo env PATH=$PATH:/home/user/.nvm/versions/node/v20.x.x/bin pm2 startup systemd -u user --hp /home/user
```

---

## 5. Kloniraj repozitorij

```bash
# Idi u /var/www
cd /var/www

# Kloniraj
git clone https://github.com/AdiZeljkovic/Maky.git maky
cd maky
```

---

## 6. Kreiraj .env fajl

```bash
nano .env
```

Unesi sljedeći sadržaj (prilagodi vrijednosti):

```env
DATABASE_URL=postgresql://maky_user:TVOJA_JAKA_LOZINKA@localhost:5432/maky_db
ADMIN_PASSWORD=TVOJA_ADMIN_LOZINKA_ZA_PANEL
JWT_SECRET=DUGACAK_NASUMICAN_STRING_MIN_32_KARAKTERA
PORT=3001
NODE_ENV=production
APP_URL=https://termin.adizeljkovic.com
```

> **Savjet za JWT_SECRET** — generiši nasumični string:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

---

## 7. Instaliraj zavisnosti i buildi projekat

```bash
# Instaliraj npm pakete
npm install

# Buildi React aplikaciju
npm run build

# Provjeri da je dist/ kreiran
ls dist/
```

---

## 8. Pokreni server sa PM2

```bash
# Pokreni Express server
pm2 start npm --name "maky" -- run start

# Provjeri status
pm2 status

# Provjeri logove
pm2 logs maky

# Sačuvaj PM2 konfiguraciju
pm2 save
```

> Express server sluša na portu **3001** i servira i API i React build.

---

## 9. Konfiguriši nginx kao reverse proxy

```bash
sudo nano /etc/nginx/sites-available/maky
```

Unesi sljedeći sadržaj:

```nginx
server {
    listen 80;
    server_name termin.adizeljkovic.com;

    # Maksimalna veličina upload-a
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Omogući site
sudo ln -s /etc/nginx/sites-available/maky /etc/nginx/sites-enabled/

# Ukloni default site (opciono)
sudo rm -f /etc/nginx/sites-enabled/default

# Provjeri nginx konfiguraciju
sudo nginx -t

# Restartaj nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 10. DNS podešavanje

Na svom DNS provideru (gdje upravljaš `adizeljkovic.com`) dodaj:

| Tip | Ime | Vrijednost | TTL |
|-----|-----|------------|-----|
| A | termin | IP_ADRESA_TVOG_VPS_A | 300 |

> Provjeri IP VPS-a komandom: `curl ifconfig.me`

Provjeri da li se DNS propagovao:
```bash
nslookup termin.adizeljkovic.com
# ili
dig termin.adizeljkovic.com
```

---

## 11. SSL certifikat (Let's Encrypt — besplatno)

```bash
# Dobij SSL certifikat i automatski konfiguriši nginx
sudo certbot --nginx -d termin.adizeljkovic.com

# Unesi email kad zatraži
# Odaberi da preusmjeri HTTP na HTTPS (opcija 2)

# Provjeri auto-renewal
sudo systemctl status certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

Nakon certbota, nginx konfiguracija se automatski ažurira sa HTTPS.

---

## 12. Firewall (UFW)

```bash
# Dozvoli SSH, HTTP i HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Blokiraj direktan pristup Node.js portu izvana
sudo ufw deny 3001

# Omogući firewall
sudo ufw enable

# Provjeri status
sudo ufw status
```

---

## 13. Provjera

```bash
# Provjeri da server radi
pm2 status

# Provjeri nginx
sudo systemctl status nginx

# Provjeri PostgreSQL
sudo systemctl status postgresql

# Test API
curl https://termin.adizeljkovic.com/api/bookings/available?date=2026-05-01
# Treba vratiti: {"availableSlots":["09:00","10:00",...]}
```

Otvori browser: **https://termin.adizeljkovic.com**
Admin panel: **https://termin.adizeljkovic.com/admin**

---

## 14. Update aplikacije (za buduće deploymente)

```bash
cd /var/www/maky

# Povuci nove promjene
git pull origin main

# Instaliraj nove pakete (ako ima)
npm install

# Rebuildi frontend
npm run build

# Restartaj server
pm2 restart maky

# Provjeri
pm2 logs maky --lines 20
```

---

## Korisne komande

```bash
# Logovi aplikacije
pm2 logs maky

# Real-time monitoring
pm2 monit

# Restart servera
pm2 restart maky

# Nginx logovi
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# PostgreSQL — pregled tabele
psql -U maky_user -d maky_db -h localhost -c "SELECT * FROM bookings ORDER BY date, time;"

# Backup baze
pg_dump -U maky_user -d maky_db -h localhost > backup_$(date +%Y%m%d).sql

# Restore baze
psql -U maky_user -d maky_db -h localhost < backup_20260424.sql
```

---

## Struktura projekta na serveru

```
/var/www/maky/
├── dist/              ← React build (generira npm run build)
├── server/            ← Express backend
│   ├── index.ts
│   ├── db.ts
│   └── auth.ts
├── src/               ← React izvorni kod
├── .env               ← Tajne varijable (NIKAD u git!)
├── package.json
└── ...
```

---

## Sigurnosne napomene

- `.env` fajl se **nikad** ne commituje u git (zaštićeno `.gitignore`-om)
- Promijeni `ADMIN_PASSWORD` na nešto jako (min. 12 karaktera, simboli, brojevi)
- `JWT_SECRET` treba biti nasumičan string od min. 64 karaktera
- PostgreSQL lozinka treba biti jaka i različita od admin lozinke
- Certbot automatski obnavlja SSL certifikat svaka 90 dana
