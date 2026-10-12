// Entry: one canvas and the app. window.__app is the e2e harness's handle.
import { App } from './app/app';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const app = new App(canvas);
(window as any).__app = app;
app.start().catch((err: unknown) => {
  console.error('Trotline failed to start', err);
});
