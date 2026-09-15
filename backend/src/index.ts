import { createApp } from '@/app.js';
import { loadConfig } from '@/config.js';
import { createAppContainer } from '@/di/container.js';

const container = createAppContainer(loadConfig(process.env));
const config = container.resolve('config');
const app = createApp(container);

const onListening = () => {
  console.log(`[backend] listening on port ${config.port} (${config.env})`);
};

const server = config.host
  ? app.listen(config.port, config.host, onListening)
  : app.listen(config.port, onListening);

server.on('error', (err) => {
  console.error('[backend] failed to start:', err);
  process.exit(1);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`[backend] ${signal} received, shutting down`);
  server.close(() => {
    void container.dispose().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
