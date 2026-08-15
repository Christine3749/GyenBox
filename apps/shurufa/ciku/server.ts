import express from 'express';
import path from 'path';
import { apiRouter } from './src/server/apiRouter';

const app = express();
const port = Number(process.env.PORT ?? 8080);

app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));

// This service is the only runtime for shurufa.gyenbox.com.  Cloudflare may
// proxy to it, but never serves this product's application shell itself.
app.get('/api/shurufa/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'gyenbox-shurufa',
    runtime: 'cloud-run',
    api: ['/api/ciku/*', '/api/shurufa/health'],
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/ciku', apiRouter);

const publicDirectory = __dirname;
app.use(express.static(publicDirectory, { index: false, fallthrough: true }));

app.get('*', (_request, response) => {
  response.sendFile(path.join(publicDirectory, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`gyenbox-shurufa listening on :${port}`);
});
