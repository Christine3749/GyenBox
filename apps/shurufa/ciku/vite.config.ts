import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import express from 'express';
import { apiRouter } from './src/server/apiRouter';

function cikuApiPlugin(): Plugin {
  return {
    name: 'ciku-api-plugin',
    configureServer(server) {
      const app = express();
      app.use(express.json());
      app.use('/api/ciku', apiRouter);
      server.middlewares.use(app);
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cikuApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
