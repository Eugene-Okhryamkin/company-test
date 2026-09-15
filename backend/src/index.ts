import { createApp } from '@/app.js';
import { loadConfig } from '@/config.js';
import { createAppContainer } from '@/di/container.js';
import { LIVE_UPDATES_PATH } from '@/gateways/live-updates.gateway.js';

const container = createAppContainer(loadConfig(process.env));
const config = container.resolve('config');
const app = createApp(container);

const onListening = () => {
  console.log(`[backend] listening on port ${config.port} (${config.env}), live updates on ${LIVE_UPDATES_PATH}`);
};

const server = config.host
  ? app.listen(config.port, config.host, onListening)
  : app.listen(config.port, onListening);

server.on('error', (err) => {
  console.error('[backend] failed to start:', err);
  process.exit(1);
});

container.resolve('liveUpdatesGateway').attach(server);
if (config.liveUpdates.enabled) {
  container.resolve('liveUpdateSimulator').start();
}

function shutdown(signal: NodeJS.Signals) {
  console.log(`[backend] ${signal} received, shutting down`);
  // Disposers stop the simulator and close WebSocket clients, then the HTTP server can close.
  void container.dispose().finally(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
