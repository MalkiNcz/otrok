const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Přihlášení' });
});

module.exports = router;
