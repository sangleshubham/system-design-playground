// sd-deployment.config.cjs
module.exports = {
  apps: [{
    name: 'sd-playground',
    script: 'backend/dist/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    // Auto-restart on crash
    autorestart: true,
    // Restart if memory exceeds 5GB
    max_memory_restart: '5000M',
    cwd:'/home/mrsilent/sites/system-design-interactive',
    // Log paths
    error_file: './logs/sd-err.log',
    out_file: './logs/sd-out.log',
    merge_logs: true,
  }]
};
