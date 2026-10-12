/** Entry point: build the app and start listening. */
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
// Unset = all interfaces (dev). In production, bind to the docker0 address so
// the app is reachable only through the reverse proxy, not the public IP.
const host = process.env.HOST;

try {
  const app = createApp();
  const onListening = () => {
    console.log(`Backend listening on http://${host ?? 'localhost'}:${port}`);
  };
  if (host) {
    app.listen(port, host, onListening);
  } else {
    app.listen(port, onListening);
  }
} catch (err) {
  console.error('Failed to start backend:', err);
  process.exit(1);
}
