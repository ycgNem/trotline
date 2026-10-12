// Entry: the 3D canvas, the HUD canvas over it, and the app. window.__app is the e2e harness's handle.
import { App } from './app/app';

const view = document.getElementById('view') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLCanvasElement;
const app = new App(view, hud);
(window as any).__app = app;
app.start().catch((err) => {
  console.error('Trotline failed to start', err);
});
