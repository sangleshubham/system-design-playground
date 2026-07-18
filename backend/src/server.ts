/** Entry point: build the app and start listening. */
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);

try {
  const app = createApp();
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
} catch (err) {
  console.error('Failed to start backend:', err);
  process.exit(1);
}
