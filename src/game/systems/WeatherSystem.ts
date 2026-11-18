import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager';
import { WeatherCondition } from '../types';

export class WeatherSystem {
  public condition: WeatherCondition = 'nublado';
  public rainIntensity = 0;
  public windIntensity = 0.25;
  public lightningFlash = 0;
  public isFullMoon = false;

  private rainPoints: THREE.Points;
  private rainGeo: THREE.BufferGeometry;
  private rainMat: THREE.PointsMaterial;
  private rainPositions: Float32Array;
  private rainCount = 900;

  private moonLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private lightningLight: THREE.DirectionalLight;
  private scene: THREE.Scene;
  private nextLightningTimer = 7;
  private pendingThunderDelay = -1;
  private pendingThunderDist = 0.5;

  constructor(
    scene: THREE.Scene,
    moonLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight
  ) {
    this.scene = scene;
    this.moonLight = moonLight;
    this.hemiLight = hemiLight;

    this.lightningLight = new THREE.DirectionalLight(0xcbe2ff, 0);
    this.lightningLight.position.set(-40, 60, -40);
    scene.add(this.lightningLight);

    // Rain particle sheet centered around player
    this.rainPositions = new Float32Array(this.rainCount * 3);
    for (let i = 0; i < this.rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 44;
      this.rainPositions[i * 3 + 1] = Math.random() * 18;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.rainPositions, 3)
    );
    this.rainMat = new THREE.PointsMaterial({
      color: 0x9ab3cc,
      size: 0.14,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainPoints = new THREE.Points(this.rainGeo, this.rainMat);
    this.rainPoints.frustumCulled = false;
    scene.add(this.rainPoints);

    this.setCondition('nublado');
  }

  public setCondition(cond: WeatherCondition): void {
    this.condition = cond;
    this.isFullMoon = cond === 'luna_llena';

    const fog = this.scene.fog as THREE.FogExp2;
    switch (cond) {
      case 'despejado':
        this.rainIntensity = 0;
        this.windIntensity = 0.15;
        this.moonLight.intensity = 1.05;
        this.moonLight.color.setHex(0x88a8d9);
        this.hemiLight.intensity = 0.48;
        if (fog) fog.density = 0.015;
        break;
      case 'luna_llena':
        this.rainIntensity = 0;
        this.windIntensity = 0.3;
        this.moonLight.intensity = 1.65;
        this.moonLight.color.setHex(0xb3cdf2);
        this.hemiLight.intensity = 0.62;
        if (fog) fog.density = 0.018;
        break;
      case 'nublado':
        this.rainIntensity = 0;
        this.windIntensity = 0.35;
        this.moonLight.intensity = 0.65;
        this.moonLight.color.setHex(0x6d84a6);
        this.hemiLight.intensity = 0.38;
        if (fog) fog.density = 0.024;
        break;
      case 'neblina':
        this.rainIntensity = 0.1;
        this.windIntensity = 0.2;
        this.moonLight.intensity = 0.55;
        this.hemiLight.intensity = 0.42;
        if (fog) fog.density = 0.052;
        break;
      case 'viento_fuerte':
        this.rainIntensity = 0.15;
        this.windIntensity = 0.95;
        this.moonLight.intensity = 0.72;
        this.hemiLight.intensity = 0.36;
        if (fog) fog.density = 0.028;
        break;
      case 'lluvia_intensa':
        this.rainIntensity = 0.9;
        this.windIntensity = 0.65;
        this.moonLight.intensity = 0.52;
        this.hemiLight.intensity = 0.32;
        if (fog) fog.density = 0.036;
        break;
      case 'tormenta_electrica':
        this.rainIntensity = 0.65;
        this.windIntensity = 0.8;
        this.moonLight.intensity = 0.5;
        this.hemiLight.intensity = 0.3;
        if (fog) fog.density = 0.032;
        break;
      case 'tormenta_total':
        this.rainIntensity = 1.0;
        this.windIntensity = 1.0;
        this.moonLight.intensity = 0.42;
        this.hemiLight.intensity = 0.28;
        if (fog) fog.density = 0.042;
        break;
    }
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    audio: AudioManager,
    onLightning?: () => void
  ): void {
    // Animate rain sheet centered around player
    this.rainPoints.position.set(playerPos.x, 0, playerPos.z);
    this.rainMat.opacity = this.rainIntensity * 0.55;
    this.rainPoints.visible = this.rainIntensity > 0.05;

    if (this.rainPoints.visible) {
      const fallSpeed = 24 + this.rainIntensity * 12;
      const windDrift = this.windIntensity * 4.5;
      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 3;
        this.rainPositions[idx] += windDrift * dt;
        this.rainPositions[idx + 1] -= fallSpeed * dt;
        if (this.rainPositions[idx + 1] < 0) {
          this.rainPositions[idx + 1] = 17 + Math.random() * 2;
          this.rainPositions[idx] = (Math.random() - 0.5) * 44;
          this.rainPositions[idx + 2] = (Math.random() - 0.5) * 44;
        }
      }
      this.rainGeo.attributes.position.needsUpdate = true;
    }

    // Lightning & Thunder
    const canLightning =
      this.condition === 'tormenta_electrica' ||
      this.condition === 'tormenta_total' ||
      this.condition === 'lluvia_intensa';

    if (canLightning) {
      this.nextLightningTimer -= dt;
      if (this.nextLightningTimer <= 0) {
        this.nextLightningTimer =
          this.condition === 'tormenta_total'
            ? 4 + Math.random() * 6
            : 8 + Math.random() * 11;
        this.lightningFlash = 1.0;
        this.lightningLight.position.set(
          (Math.random() - 0.5) * 90,
          65,
          (Math.random() - 0.5) * 90
        );
        this.pendingThunderDist = 0.15 + Math.random() * 0.75;
        this.pendingThunderDelay = 0.35 + this.pendingThunderDist * 1.4;
        onLightning?.();
      }
    }

    if (this.pendingThunderDelay > 0) {
      this.pendingThunderDelay -= dt;
      if (this.pendingThunderDelay <= 0) {
        audio.playThunder(this.pendingThunderDist);
        this.pendingThunderDelay = -1;
      }
    }

    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.8);
      this.lightningLight.intensity = this.lightningFlash * 7.5;
    } else {
      this.lightningLight.intensity = 0;
    }
  }

  public dispose(): void {
    this.rainGeo.dispose();
    this.rainMat.dispose();
  }
}
