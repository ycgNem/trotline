// One directional light (the sun, or the moon at night) and one hemisphere light (THREEJS-NOTES
// rule 3), set from the clock: the sun rises in the east at 06:00, is highest at noon and sets in
// the west at 18:00. Colours from the palette; intensities are tuned by eye in the shots.
import * as THREE from 'three';
import { C } from '../data/palette';
import { col } from './util';

export class Lights {
  sun = new THREE.DirectionalLight(0xffffff, 2.2);
  hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.0);
  /** 0 night .. 1 full day, for the water's brightness and the sky */
  daylight = 1;
  sky = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.sun.name = 'sun';
    this.hemi.name = 'sky';
    scene.add(this.sun, this.sun.target, this.hemi);
  }

  set(minute: number) {
    const h = minute / 60;
    // sun angle: 0 at 06:00, PI at 18:00
    const a = ((h - 6) / 12) * Math.PI;
    const elev = Math.sin(a);
    const day = THREE.MathUtils.smoothstep(elev, -0.15, 0.25);
    this.daylight = 0.28 + 0.72 * day;
    const low = 1 - THREE.MathUtils.smoothstep(elev, 0.05, 0.5);
    if (elev > -0.1) {
      // azimuth swings east -> south -> west; keep the sun a little south so the bluff faces it
      this.sun.position.set(Math.cos(a) * 60, Math.max(8, elev * 90), 25);
      this.sun.color.copy(col(C.bone)).lerp(col(C.gold), low * 0.7);
      this.sun.intensity = 0.4 + 2.0 * day;
    } else {
      // the moon: a cool low light from the south-west
      this.sun.position.set(-40, 50, 30);
      this.sun.color.copy(col(C.ice));
      this.sun.intensity = 0.45;
    }
    this.hemi.color.copy(col(C.cyan)).lerp(col(C.deep), 1 - day);
    this.hemi.groundColor.copy(col(C.clay)).lerp(col(C.dusk), 1 - day);
    this.hemi.intensity = 0.55 + 0.6 * day;
    this.sky.copy(col(C.cyan)).lerp(col(C.orange), low * day * 0.5).lerp(col(C.night), 1 - day);
  }
}
