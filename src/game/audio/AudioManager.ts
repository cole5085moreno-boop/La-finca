import { CreatureId, GameSettings } from '../types';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private initialized = false;
  private muted = false;
  private settings: GameSettings;
  private lastFootstepTime = 0;
  private lastBreathTime = 0;
  private lastAmbientNoteTime = 0;
  private cricketTimer = 0;

  constructor(settings: GameSettings) {
    this.settings = settings;
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = settings;
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(
      this.muted ? 0 : settings.masterVolume,
      now,
      0.05
    );
    this.musicGain.gain.setTargetAtTime(settings.musicVolume, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(settings.sfxVolume, now, 0.05);
  }

  public init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.settings.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.settings.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      // Shared white/pinkish noise buffer (2 seconds)
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * 2, sr);
      const data = buf.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        data[i] = Math.max(-1, Math.min(1, b0 + b1 + b2 + white * 0.12));
      }
      this.noiseBuffer = buf;

      // Continuous rain loop
      const rainSrc = this.ctx.createBufferSource();
      rainSrc.buffer = this.noiseBuffer;
      rainSrc.loop = true;
      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1450;
      rainFilter.Q.value = 0.7;
      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;
      rainSrc.connect(rainFilter);
      rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.sfxGain);
      rainSrc.start();

      // Continuous wind loop
      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = this.noiseBuffer;
      windSrc.loop = true;
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 340;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.04;
      windSrc.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.sfxGain);
      windSrc.start();

      this.initialized = true;
    } catch {
      // AudioContext unavailable in restricted browser context
    }
  }

  public setEnvironmentLevels(
    rainIntensity: number,
    windIntensity: number,
    indoors: boolean,
    dt: number,
    threatLevel: number
  ): void {
    if (!this.ctx || !this.rainGain || !this.windGain) return;
    const now = this.ctx.currentTime;
    const indoorFactor = indoors ? 0.32 : 1.0;
    this.rainGain.gain.setTargetAtTime(
      rainIntensity * 0.22 * indoorFactor,
      now,
      0.25
    );
    this.windGain.gain.setTargetAtTime(
      (0.03 + windIntensity * 0.16) * (indoors ? 0.45 : 1.0),
      now,
      0.3
    );

    // Crickets when not pouring
    this.cricketTimer += dt;
    if (rainIntensity < 0.35 && !indoors && this.cricketTimer > 1.8 + Math.random() * 2.5) {
      this.cricketTimer = 0;
      this.playCricketChirp();
    }

    // Sparse haunting northern folk horror drones (silence is part of horror)
    const noteInterval = threatLevel > 0.45 ? 7 : 16;
    if (now - this.lastAmbientNoteTime > noteInterval) {
      this.lastAmbientNoteTime = now;
      this.playFolkHorrorTone(threatLevel);
    }
  }

  private playCricketChirp(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.4;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.015, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 4100 + Math.random() * 450;
    osc.connect(gain);
    gain.connect(pan);
    pan.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playFolkHorrorTone(threatLevel: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    // Dissonant Argentine Andean/Salta minor scale drone (D2, Eb2, A2, Bb2)
    const freqs = threatLevel > 0.5 ? [73.42, 77.78, 110.0] : [146.83, 174.61, 220.0, 233.08];
    const baseFreq = freqs[Math.floor(Math.random() * freqs.length)];

    const osc = this.ctx.createOscillator();
    osc.type = threatLevel > 0.5 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.992, now + 4.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = threatLevel > 0.5 ? 280 : 520;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(threatLevel > 0.5 ? 0.09 : 0.055, now + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 5.4);
  }

  private createSpatialPan(
    listenerPos: { x: number; z: number },
    listenerYaw: number,
    sourcePos: { x: number; z: number },
    maxDist = 55
  ): { gainFactor: number; pan: number } {
    const dx = sourcePos.x - listenerPos.x;
    const dz = sourcePos.z - listenerPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist >= maxDist) return { gainFactor: 0, pan: 0 };

    const gainFactor = Math.pow(1 - dist / maxDist, 1.6);
    // Right vector in Three.js yaw space: forward = (-sin(yaw), -cos(yaw)), right = (cos(yaw), -sin(yaw))
    const rightX = Math.cos(listenerYaw);
    const rightZ = -Math.sin(listenerYaw);
    const dirX = dist > 0.01 ? dx / dist : 0;
    const dirZ = dist > 0.01 ? dz / dist : 0;
    const pan = Math.max(-1, Math.min(1, dirX * rightX + dirZ * rightZ));
    return { gainFactor, pan };
  }

  public playThunder(distanceFactor: number): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220 + (1 - distanceFactor) * 420, now);
    filter.frequency.exponentialRampToValueAtTime(55, now + 2.8);

    const gain = this.ctx.createGain();
    const peak = 0.25 + (1 - distanceFactor) * 0.55;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 3.3);
  }

  public playFootstep(sprinting: boolean, crouching: boolean, wet: boolean): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const interval = sprinting ? 0.3 : crouching ? 0.62 : 0.46;
    if (now - this.lastFootstepTime < interval) return;
    this.lastFootstepTime = now;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = wet ? 900 : 420;
    filter.Q.value = 1.4;

    const gain = this.ctx.createGain();
    const vol = crouching ? 0.035 : sprinting ? 0.14 : 0.075;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.12);
  }

  public playHeavyBreathing(fear: number, stamina: number): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    if (fear < 55 && stamina > 25) return;
    if (now - this.lastBreathTime < 1.35) return;
    this.lastBreathTime = now;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650;
    filter.Q.value = 2.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.7);
  }

  public playWeaponSound(weapon: 'escopeta' | 'revolver' | 'machete' | 'cuchillo'): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    if (weapon === 'escopeta' || weapon === 'revolver') {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(weapon === 'escopeta' ? 2200 : 3200, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + 0.45);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(weapon === 'escopeta' ? 0.8 : 0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.6);
    } else {
      // Whoosh slash
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.18);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.22);
    }
  }

  public playClick(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playDoorCreak(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(210, now + 0.35);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 6;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playDogBark(
    listenerPos: { x: number; z: number },
    listenerYaw: number,
    dogPos: { x: number; z: number }
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const { gainFactor, pan } = this.createSpatialPan(listenerPos, listenerYaw, dogPos, 65);
    if (gainFactor <= 0.02) return;

    const now = this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.22;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(135, t + 0.14);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 600;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22 * gainFactor, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      osc.start(t);
      osc.stop(t + 0.17);
    }
    panner.connect(this.sfxGain);
  }

  public playCreatureSound(
    creature: CreatureId,
    kind: 'alert' | 'chase' | 'attack',
    listenerPos: { x: number; z: number },
    listenerYaw: number,
    sourcePos: { x: number; z: number }
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const { gainFactor, pan } = this.createSpatialPan(listenerPos, listenerYaw, sourcePos, 72);
    if (gainFactor <= 0.02) return;

    const now = this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.sfxGain);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (creature === 'lobizon' || creature === 'familiar') {
      // Deep howl or menacing growl
      osc.type = 'sawtooth';
      if (kind === 'alert') {
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(290, now + 0.45);
        osc.frequency.exponentialRampToValueAtTime(95, now + 1.4);
      } else {
        osc.frequency.setValueAtTime(92, now);
        osc.frequency.linearRampToValueAtTime(62, now + 0.55);
      }
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.32 * gainFactor, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      osc.start(now);
      osc.stop(now + 1.5);
    } else if (creature === 'mulanima' || creature === 'alma_mula') {
      // Metallic chain clank + eerie spectral whinny
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.6);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28 * gainFactor, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(panner);
      osc.start(now);
      osc.stop(now + 0.75);
    } else if (creature === 'duende') {
      // Unsettling high whistle/chuckle
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.linearRampToValueAtTime(1480, now + 0.14);
      osc.frequency.linearRampToValueAtTime(920, now + 0.35);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18 * gainFactor, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(panner);
      osc.start(now);
      osc.stop(now + 0.42);
    } else {
      // Ocumar uncanny vocal call
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.linearRampToValueAtTime(620, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.65);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24 * gainFactor, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(panner);
      osc.start(now);
      osc.stop(now + 0.72);
    }
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.initialized = false;
    }
  }
}
