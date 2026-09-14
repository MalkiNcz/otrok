const path = require('path');
const express = require('express');
const session = require('express-session');
const { config } = require('@otrok/shared');
const { flash } = require('./middleware/flash');
const { ensureCsrfToken } = require('./middleware/csrf');

if (!config.token || !config.clientId || !config.clientSecret) {
  console.error('Chybí DISCORD_TOKEN, DISCORD_CLIENT_ID nebo DISCORD_CLIENT_SECRET v .env souboru.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    name: 'otrok.sid',
    secret: config.dashboard.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.dashboard.baseUrl.startsWith('https://'),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(flash);
app.use(ensureCsrfToken);
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/home'));
app.use('/dashboard', require('./routes/dashboard'));

app.use((req, res) => {
  res.status(404).render('error', { title: 'Stránka nenalezena', message: 'Tato stránka neexistuje.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Chyba serveru', message: 'Došlo k neočekávané chybě.' });
});

app.listen(config.dashboard.port, () => {
  console.log(`🌐 Dashboard běží na ${config.dashboard.baseUrl} (port ${config.dashboard.port})`);
});
