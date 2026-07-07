module.exports = {
  apps: [
    {
      name: 'thepromptgalaxy',
      cwd: '/opt/apps/thepromptgalaxy',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
      },
    },
  ],
}
