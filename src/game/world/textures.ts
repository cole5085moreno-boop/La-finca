import * as THREE from 'three';

export interface WorldTextures {
  ground: THREE.CanvasTexture;
  adobe: THREE.CanvasTexture;
  wood: THREE.CanvasTexture;
  zincRoof: THREE.CanvasTexture;
  dirtRoad: THREE.CanvasTexture;
  stone: THREE.CanvasTexture;
}

function makeCanvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeatX: number,
  repeatY: number,
  anisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  return tex;
}

export function createWorldTextures(renderer: THREE.WebGLRenderer): WorldTextures {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const ground = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#252118';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2400; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const r = 1 + Math.random() * 4;
        ctx.fillStyle =
          Math.random() > 0.45
            ? 'rgba(42, 54, 30, 0.35)'
            : 'rgba(65, 47, 32, 0.32)';
        ctx.fillRect(x, y, r, r);
      }
    },
    36,
    36,
    maxAniso
  );

  const adobe = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#8b7760';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1200; i++) {
        ctx.fillStyle =
          Math.random() > 0.5
            ? 'rgba(64, 52, 40, 0.14)'
            : 'rgba(170, 152, 128, 0.12)';
        ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
      }
      // Subtle plaster cracks
      ctx.strokeStyle = 'rgba(42, 34, 26, 0.25)';
      ctx.lineWidth = 1;
      for (let c = 0; c < 6; c++) {
        ctx.beginPath();
        let px = Math.random() * s;
        let py = Math.random() * s;
        ctx.moveTo(px, py);
        for (let k = 0; k < 5; k++) {
          px += (Math.random() - 0.5) * 28;
          py += Math.random() * 24;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    },
    2,
    2,
    maxAniso
  );

  const wood = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#4a3322';
      ctx.fillRect(0, 0, s, s);
      const planks = 8;
      const pw = s / planks;
      for (let i = 0; i < planks; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,220,180,0.04)';
        ctx.fillRect(i * pw, 0, pw, s);
        ctx.fillStyle = '#24170f';
        ctx.fillRect(i * pw, 0, 2, s);
        for (let g = 0; g < 18; g++) {
          ctx.fillStyle = 'rgba(30, 18, 10, 0.22)';
          ctx.fillRect(i * pw + Math.random() * pw, Math.random() * s, 1.5, 22);
        }
      }
    },
    2,
    2,
    maxAniso
  );

  const zincRoof = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#464e54';
      ctx.fillRect(0, 0, s, s);
      for (let x = 0; x < s; x += 12) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, 0, 5, s);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(x + 6, 0, 5, s);
      }
      // Rust patches
      for (let i = 0; i < 45; i++) {
        ctx.fillStyle = 'rgba(110, 58, 28, 0.24)';
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 4 + Math.random() * 14, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    4,
    3,
    maxAniso
  );

  const dirtRoad = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#3b2c1e';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle =
          Math.random() > 0.5
            ? 'rgba(24, 18, 12, 0.35)'
            : 'rgba(92, 70, 48, 0.22)';
        ctx.fillRect(Math.random() * s, Math.random() * s, 4, 4);
      }
    },
    1,
    18,
    maxAniso
  );

  const stone = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#53565a';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle =
          Math.random() > 0.5 ? 'rgba(30,32,36,0.28)' : 'rgba(130,134,140,0.18)';
        ctx.fillRect(Math.random() * s, Math.random() * s, 5, 5);
      }
    },
    3,
    3,
    maxAniso
  );

  return { ground, adobe, wood, zincRoof, dirtRoad, stone };
}
