module.exports = {
  apps: [
    {
      name: 'otrok-bot',
      cwd: __dirname,
      script: 'bot/src/index.js',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'otrok-dashboard',
      cwd: __dirname,
      script: 'dashboard/src/server.js',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
