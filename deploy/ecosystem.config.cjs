/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");

/**
 * PM2 production entrypoint.
 *
 * Do not point PM2 at .next/standalone/server.js directly: doing so bypasses
 * migrations, storage checks, content bootstrap and administrator validation.
 */
module.exports = {
  apps: [
    {
      name: "honest-nutri-report-h5",
      cwd: path.resolve(__dirname, ".."),
      script: "./deploy/start-production.sh",
      interpreter: "/bin/sh",
      exec_mode: "fork",
      autorestart: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
