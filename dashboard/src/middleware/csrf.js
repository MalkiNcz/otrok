const crypto = require('crypto');

function ensureCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrfToken(req, res, next) {
  const submitted = req.body?._csrf;
  if (!submitted || submitted !== req.session.csrfToken) {
    return res.status(403).render('error', { title: 'Neplatný požadavek', message: 'Bezpečnostní token vypršel, zkus stránku načíst znovu.' });
  }
  next();
}

module.exports = { ensureCsrfToken, verifyCsrfToken };
