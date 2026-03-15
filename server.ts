import express from 'express';
import cors from 'cors';
import path from 'path';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/api';
import { initScheduler } from './server/tasks/scheduler';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Initialize Background Scheduler (Cron jobs)
  initScheduler();

  // Start Node.js Worker
  import('./server/worker').then(({ startNodeWorker }) => {
    startNodeWorker();
  }).catch(err => console.error('Failed to start Node worker:', err));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
