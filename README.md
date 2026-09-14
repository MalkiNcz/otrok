# 🤖 Otrok

Otrok je kompletní multifunkční Discord bot postavený na **discord.js v14**, doplněný o
**webový dashboard** (Express + EJS + Discord OAuth2), přes který lze celý bot pohodlně
ovládat z prohlížeče bez nutnosti znát jediný příkaz.

## Obsah

- [Funkce](#-funkce)
- [Architektura projektu](#-architektura-projektu)
- [Požadavky](#-požadavky)
- [1. Vytvoření Discord aplikace a bota](#1-vytvoření-discord-aplikace-a-bota)
- [2. Instalace projektu](#2-instalace-projektu)
- [3. Konfigurace (.env)](#3-konfigurace-env)
- [4. Registrace slash příkazů](#4-registrace-slash-příkazů)
- [5. Spuštění pro lokální vývoj](#5-spuštění-pro-lokální-vývoj)
- [6. Nasazení na VPS (produkce)](#6-nasazení-na-vps-produkce)
- [Přehled slash příkazů](#-přehled-slash-příkazů)
- [Používání webového dashboardu](#-používání-webového-dashboardu)
- [Bezpečnost](#-bezpečnost)
- [Řešení problémů](#-řešení-problémů)
- [Aktualizace bota](#-aktualizace-bota)

---

## ✨ Funkce

- **Webový dashboard** - přihlášení přes Discord OAuth2, přehledná správa všech funkcí bota
  pro každý server zvlášť (bez nutnosti psát příkazy).
- **Uvítací zprávy** - automatická zpráva (text nebo embed) do zvoleného kanálu při
  příchodu nového člena, s placeholdery `{user}`, `{username}`, `{server}`, `{membercount}`.
- **Zprávy o odchodu** - obdobně při odchodu člena ze serveru.
- **Přiřazení role kliknutím na pravidla** - bot zveřejní zprávu s pravidly a tlačítkem;
  klikem člen automaticky získá zvolenou roli.
- **Audit log** - ukládá se kompletní historie: **join, leave, ban, kick, mute/unmute,
  připojení/odpojení od voice kanálu, smazané a upravené zprávy**. Vše se zapisuje do
  databáze a volitelně i posílá jako embed do zvoleného kanálu (typy událostí lze zvlášť
  zapínat/vypínat).
- **Moderace** - `/ban`, `/kick`, `/mute` (časový timeout), `/unmute`, vždy s podporou
  uvedení důvodu; dostupné jak jako slash příkazy, tak z dashboardu.
- **Hromadné mazání zpráv** - `/purge`, i s možností mazat jen zprávy konkrétního uživatele,
  dostupné také z dashboardu.
- **Statistické kanály** - název hlasového kanálu nebo kategorie se automaticky
  přejmenovává a zobrazuje aktuální počet členů, lidí (bez botů) nebo botů.
- Vše je konfigurovatelné **na úrovni jednotlivého serveru** (bot může být na více
  serverech současně).

---

## 🧱 Architektura projektu

Projekt je npm **monorepo** (workspaces) se třemi balíčky, které sdílí jednu SQLite
databázi:

```
Otrok/
├── bot/                  # Discord bot (gateway klient, discord.js)
│   └── src/
│       ├── commands/     # Slash příkazy (moderace, setup, misc)
│       ├── events/       # Discord gateway eventy (join, leave, ban, voice, zprávy...)
│       ├── handlers/     # Načítání příkazů a eventů
│       └── utils/        # Audit log, embed helpery, cron pro statistické kanály
├── dashboard/             # Webový dashboard (Express + EJS)
│   └── src/
│       ├── routes/       # OAuth2 login, výběr serveru, nastavení per-server
│       ├── middleware/   # Autentizace, CSRF ochrana, flash zprávy
│       ├── views/        # EJS šablony
│       └── discordApi.js # Přímé volání Discord REST API (bez gateway spojení)
├── shared/                 # Sdílený kód mezi botem a dashboardem
│   └── src/
│       ├── database.js   # SQLite (better-sqlite3) - schéma a přístupové funkce
│       ├── auditLogger.js# Sdílená logika audit logu (bot i dashboard ji používají)
│       ├── config.js     # Načítání .env
│       └── placeholders.js / duration.js
├── data/                  # Zde vznikne otrok.db (SQLite soubor, v .gitignore)
├── ecosystem.config.js    # Konfigurace pro PM2 (spouští bot i dashboard)
└── .env                   # Konfigurace (vytvoříš z .env.example)
```

**Proč dva procesy?** Bot (`bot/`) drží živé gateway spojení s Discordem a reaguje na
eventy v reálném čase (příchody, mazání zpráv, voice...). Dashboard (`dashboard/`) je
samostatný webový server - nekomunikuje s botem přímo, ale volá Discord REST API stejným
bot tokenem a čte/zapisuje do stejné SQLite databáze. Díky tomu lze oba procesy
restartovat nezávisle na sobě a dashboard nijak nezpomaluje reakce bota.

---

## 📋 Požadavky

- **Node.js 18.17 nebo novější** (doporučeno 20 LTS nebo 22 LTS)
- **npm** (součást Node.js)
- Účet na [Discord Developer Portal](https://discord.com/developers/applications)
- Pro nasazení na VPS: Linux server (Ubuntu/Debian doporučeno), ideálně s vlastní doménou
  pro HTTPS (dashboard vyžaduje HTTPS kvůli Discord OAuth2 redirect URI - viz níže)

---

## 1. Vytvoření Discord aplikace a bota

1. Jdi na [Discord Developer Portal](https://discord.com/developers/applications) a
   klikni na **New Application**. Pojmenuj ji (např. "Otrok") a potvrď.
2. V levém menu otevři **Bot**:
   - Klikni na **Reset Token** (nebo **View Token**) a zkopíruj si token - budeš ho
     potřebovat jako `DISCORD_TOKEN`. **Nikomu ho nesdílej.**
   - V sekci **Privileged Gateway Intents** zapni:
     - ✅ **Server Members Intent** (nutné pro join/leave, uvítací zprávy, statistiky)
     - ✅ **Message Content Intent** (nutné pro logování obsahu smazaných/upravených zpráv)
3. V levém menu otevři **OAuth2 → General**:
   - Zkopíruj **Client ID** → bude to `DISCORD_CLIENT_ID`.
   - Klikni na **Reset Secret** a zkopíruj **Client Secret** → bude to
     `DISCORD_CLIENT_SECRET` (potřebuje ho jen dashboard pro přihlašování přes Discord).
   - V sekci **Redirects** přidej URL, na které poběží tvůj dashboard, s příponou
     `/auth/callback`, např.:
     - pro lokální vývoj: `http://localhost:3000/auth/callback`
     - pro produkci: `https://tvoje-domena.cz/auth/callback`
4. V levém menu otevři **OAuth2 → URL Generator** (jen orientačně - přímý pozvánkový
   odkaz s korektními oprávněními najdeš i přímo v dashboardu po přihlášení):
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: minimálně `Kick Members`, `Ban Members`, `Moderate Members`,
     `Manage Channels`, `Manage Roles`, `Manage Messages`, `View Audit Log`,
     `View Channels`, `Send Messages`, `Embed Links`, `Read Message History`.
   - Vygenerovaným odkazem pozvi bota na svůj testovací server. **Role bota musí být
     v seznamu rolí serveru výše než role, které má bot přiřazovat/moderovat.**

---

## 2. Instalace projektu

```bash
git clone <adresa-tvého-repozitáře> Otrok
cd Otrok
npm install
```

Díky npm workspaces tento jeden příkaz nainstaluje závislosti pro `bot/`, `dashboard/`
i `shared/` najednou.

> **Poznámka k better-sqlite3:** balíček obsahuje nativní modul, který se při instalaci
> kompiluje/stahuje jako prebuilt binárka. Pokud tvůj systém vyžaduje kompilaci ze zdroje,
> ujisti se, že máš nainstalované build nástroje (na Debianu/Ubuntu: `build-essential`,
> `python3`). Na běžných VPS s Node 18/20/22 LTS se typicky stáhne hotová binárka a nic
> dalšího řešit nemusíš.

---

## 3. Konfigurace (.env)

Zkopíruj vzorový soubor a uprav hodnoty:

```bash
cp .env.example .env
```

| Proměnná | Popis |
|---|---|
| `DISCORD_TOKEN` | Token bota z kroku 1. |
| `DISCORD_CLIENT_ID` | Client ID aplikace z kroku 1. |
| `DISCORD_CLIENT_SECRET` | Client Secret aplikace (jen pro dashboard OAuth2 login). |
| `DEV_GUILD_ID` | (Volitelné) ID tvého vývojového serveru - když je vyplněné, slash příkazy se registrují jen na tento server a projeví se okamžitě. Nech prázdné pro globální registraci (může trvat až ~1 hodinu, než se projeví na všech serverech). |
| `BOT_OWNER_IDS` | (Volitelné) Tvé Discord ID (případně více, oddělené čárkou) - tito uživatelé mají přístup do dashboardu pro libovolný server, na kterém je bot, i bez role "Spravovat server". |
| `DATABASE_PATH` | Cesta k SQLite souboru, výchozí `./data/otrok.db`. |
| `DASHBOARD_PORT` | Port, na kterém poběží webový dashboard (výchozí `3000`). |
| `DASHBOARD_BASE_URL` | Veřejná URL dashboardu - **musí** odpovídat Redirect URI nastavenému v Developer Portalu (viz krok 1). |
| `SESSION_SECRET` | Náhodný dlouhý řetězec pro podepisování session cookie. Vygeneruješ příkazem `openssl rand -hex 32`. |

Jak zjistit své Discord ID pro `BOT_OWNER_IDS`: v Discordu zapni **Nastavení → Pokročilé →
Vývojářský režim**, pak klikni pravým tlačítkem na svůj profil a zvol **Kopírovat ID
uživatele**.

---

## 4. Registrace slash příkazů

Slash příkazy je potřeba jednorázově zaregistrovat u Discordu (a znovu kdykoliv přidáš/
upravíš nějaký příkaz):

```bash
npm run deploy:commands
```

- Pokud máš v `.env` vyplněné `DEV_GUILD_ID`, příkazy se objeví na daném serveru okamžitě.
- Bez `DEV_GUILD_ID` se registrují globálně - projeví se na všech serverech, ale
  propagace může trvat až ~1 hodinu.

---

## 5. Spuštění pro lokální vývoj

Ve dvou samostatných terminálech:

```bash
# Terminál 1 - Discord bot
npm run dev:bot

# Terminál 2 - webový dashboard
npm run dev:dashboard
```

Dashboard poběží na `http://localhost:3000` (nebo portu z `.env`). Oba příkazy používají
`node --watch`, takže se automaticky restartují při úpravě kódu.

---

## 6. Nasazení na VPS (produkce)

Návod počítá s čerstvým **Ubuntu/Debian** serverem a doménou nasměrovanou na jeho IP
adresu (doména je potřeba kvůli HTTPS, které Discord OAuth2 pro produkční Redirect URI
vyžaduje).

### 6.1 Příprava serveru

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git build-essential python3 curl
```

Nainstaluj Node.js 20 LTS (přes NodeSource repozitář):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # ověř, že je nainstalovaná verze 18.17+
```

### 6.2 Stažení a instalace projektu

```bash
cd /opt
sudo git clone <adresa-tvého-repozitáře> otrok
sudo chown -R $USER:$USER otrok
cd otrok
npm install
cp .env.example .env
nano .env   # vyplň všechny hodnoty podle kroku 3, DASHBOARD_BASE_URL nastav na https://tvoje-domena.cz
```

Nezapomeň v Discord Developer Portalu (OAuth2 → General → Redirects) přidat produkční
URL: `https://tvoje-domena.cz/auth/callback`.

### 6.3 Registrace slash příkazů

```bash
npm run deploy:commands
```

### 6.4 Spuštění přes PM2 (autorestart, běh na pozadí)

```bash
sudo npm install -g pm2
npm run pm2:start          # spustí bot i dashboard podle ecosystem.config.js
pm2 status                 # ověř, že oba procesy běží (otrok-bot, otrok-dashboard)
pm2 logs                   # sledování logů obou procesů
```

Nastav automatický start po restartu serveru:

```bash
pm2 save
pm2 startup    # vypíše příkaz, který je potřeba spustit se sudo - zkopíruj ho a spusť
```

Užitečné příkazy:

```bash
npm run pm2:restart   # restart obou procesů (např. po git pull)
npm run pm2:stop       # zastavení obou procesů
pm2 logs otrok-bot     # logy jen bota
pm2 logs otrok-dashboard
```

### 6.5 Reverzní proxy a HTTPS (Nginx + Let's Encrypt)

Dashboard běží interně na `DASHBOARD_PORT` (výchozí 3000). Pro veřejný přístup přes
HTTPS na doméně nastav Nginx jako reverzní proxy:

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/otrok
```

Obsah souboru:

```nginx
server {
    listen 80;
    server_name tvoje-domena.cz;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/otrok /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Získej HTTPS certifikát zdarma přes Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tvoje-domena.cz
```

Certbot automaticky upraví Nginx konfiguraci pro HTTPS a nastaví obnovování certifikátu.

### 6.6 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Port `DASHBOARD_PORT` (3000) zůstává dostupný jen lokálně (přes Nginx proxy), není
potřeba ho otvírat navenek.

Po dokončení je dashboard dostupný na `https://tvoje-domena.cz` a bot běží nepřetržitě
na pozadí spravovaný PM2.

---

## 📜 Přehled slash příkazů

Všechny moderátorské příkazy vyžadují odpovídající Discord oprávnění (Discord sám
příkaz v UI skryje uživatelům bez daného oprávnění).

| Příkaz | Oprávnění | Popis |
|---|---|---|
| `/ban uzivatel [duvod] [smazat_zpravy_dny]` | Ban Members | Zabanuje uživatele, volitelně smaže jeho zprávy za posledních 0-7 dní. |
| `/kick uzivatel [duvod]` | Kick Members | Vykopne uživatele ze serveru. |
| `/mute uzivatel doba [duvod]` | Moderate Members | Umlčí uživatele (Discord timeout) na zadanou dobu, např. `10m`, `2h`, `1d` (max 28 dní). |
| `/unmute uzivatel [duvod]` | Moderate Members | Zruší umlčení. |
| `/purge pocet [uzivatel]` | Manage Messages | Smaže zadaný počet zpráv v aktuálním kanálu, volitelně jen od konkrétního uživatele. |
| `/setwelcome zapnout kanal [zprava]` / `vypnout` | Manage Server | Nastaví/vypne uvítací zprávy. |
| `/setleave zapnout kanal [zprava]` / `vypnout` | Manage Server | Nastaví/vypne zprávy o odchodu. |
| `/setlog kanal` | Manage Server | Nastaví kanál pro audit log. |
| `/setrules kanal role [nadpis] [text] [tlacitko]` | Manage Server | Zveřejní zprávu s pravidly a tlačítkem pro přiřazení role. |
| `/setstats pridat kanal metrika [sablona]` / `odebrat kanal` | Manage Server | Přidá/odebere statistický kanál zobrazující počet členů v názvu. |
| `/dashboard` | Manage Server | Zobrazí odkaz na webový dashboard pro daný server. |
| `/help` | - | Přehled dostupných příkazů. |

Kompletně stejné (a přehlednější) ovládání nabízí i webový **dashboard** - viz další
sekce.

---

## 🌐 Používání webového dashboardu

1. Otevři dashboard (`http://localhost:3000` lokálně, nebo tvou produkční doménu) a
   klikni na **Přihlásit se přes Discord**.
2. Po přihlášení uvidíš seznam serverů, na kterých máš oprávnění **Spravovat server**.
   Servery, kde bot ještě není pozvaný, mají tlačítko **Pozvat**.
3. U serveru, kde bot už je, klikni na **Spravovat** - otevře se postranní menu se
   sekcemi:
   - **📊 Přehled** - základní statistiky serveru a posledních 8 událostí z audit logu.
   - **👋 Uvítání** - zapnutí/vypnutí, výběr kanálu, text zprávy (s placeholdery) a
     přepínač embed/prostý text.
   - **🚪 Odchody** - obdobně pro zprávy o odchodu.
   - **📜 Pravidla a role** - výběr kanálu, role, nadpisu a textu pravidel; tlačítkem
     **Zveřejnit zprávu** bot pošle zprávu s tlačítkem do zvoleného kanálu. Kliknutím na
     tlačítko člen automaticky získá nastavenou roli.
   - **🛡️ Moderace** - rychlé formuláře pro ban/kick/mute/unmute (zadáváš Discord ID
     uživatele) a pro hromadné mazání zpráv v kanálu.
   - **🧾 Audit log** - kompletní filtrovatelná a stránkovaná historie všech událostí.
   - **⚙️ Nastavení logu** - výběr kanálu pro audit log a zapnutí/vypnutí jednotlivých
     typů událostí (join, leave, ban, kick, mute, voice, smazané/upravené zprávy).
   - **🔢 Statistiky** - přidávání a odebírání kanálů/kategorií, jejichž název se
     automaticky aktualizuje podle šablony (např. `👥 Členové: {count}`).

> **Jak zjistit Discord ID uživatele pro moderační formuláře:** zapni si ve svém
> Discordu **Nastavení → Pokročilé → Vývojářský režim**, pak klikni pravým tlačítkem na
> uživatele a zvol **Kopírovat ID uživatele**.

---

## 🔒 Bezpečnost

- `.env` soubor (obsahuje token bota a session secret) je v `.gitignore` - nikdy ho
  neverzuj ani nikam nesdílej.
- Dashboard je chráněný Discord OAuth2 přihlášením a ověřuje, že přihlášený uživatel má
  na daném serveru oprávnění **Spravovat server** (případně je v `BOT_OWNER_IDS`).
- Formuláře v dashboardu jsou chráněné proti CSRF útokům (synchronizer token).
- Session cookie je `HttpOnly` a v produkci (HTTPS) i `Secure`.
- Pro produkční nasazení vždy používej HTTPS (viz krok 6.5) - bez něj Discord OAuth2
  redirect ani nefunguje mimo `localhost`.

---

## 🛠️ Řešení problémů

**Bot je v Discordu offline.**
Zkontroluj `pm2 logs otrok-bot` - nejčastější příčinou je špatný `DISCORD_TOKEN` nebo
nezapnuté privilegované intenty (Server Members Intent, Message Content Intent) v
Developer Portalu (krok 1, bod 2).

**Slash příkazy se v Discordu nezobrazují.**
Spustil jsi `npm run deploy:commands`? Bez `DEV_GUILD_ID` může globální registrace trvat
až ~1 hodinu. Pro okamžité testování nastav `DEV_GUILD_ID` na ID svého serveru.

**Dashboard po přihlášení hlásí chybu OAuth2 / "invalid redirect_uri".**
`DASHBOARD_BASE_URL` v `.env` musí přesně (včetně `http`/`https` a bez lomítka na konci)
odpovídat jedné z hodnot v Developer Portal → OAuth2 → Redirects, jen s příponou
`/auth/callback`.

**Bot nemůže zabanovat/vykopnout/umlčet/přejmenovat kanál.**
Role bota musí být v hierarchii rolí serveru **výše** než role cílového uživatele
(respektive výše než role přiřazovaná přes `/setrules`), a bot musí mít odpovídající
oprávnění (Ban Members, Kick Members, Moderate Members, Manage Channels).

**Statistický kanál se nepřejmenovává hned.**
Discord dovoluje jen 2 přejmenování kanálu za 10 minut - bot proto názvy aktualizuje v
dávce jednou za 10 minut (běží automaticky, nic není potřeba spouštět ručně).

**Instalace `better-sqlite3` selhává při `npm install`.**
Nainstaluj build nástroje: na Debianu/Ubuntu `sudo apt install -y build-essential
python3`, poté spusť `npm install` znovu.

---

## 🔄 Aktualizace bota

```bash
cd /opt/otrok
git pull
npm install
npm run deploy:commands   # jen pokud přibyly/změnily se slash příkazy
npm run pm2:restart
```

---

## Licence

MIT
