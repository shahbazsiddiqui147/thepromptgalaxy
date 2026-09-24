module.exports = {
  apps: [
    {
      name: 'thepromptgalaxy',
      cwd: '/opt/apps/thepromptgalaxy',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3006 -H 127.0.0.1',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '700M',
    },
  ],
}
