import * as THREE from 'three';

/**
 * Lightweight visual effects: a pool of soft sprites (exhaust, dust, sparks, debris)
 * and a field of speed streaks. World scrolls towards +z, so ground-bound particles
 * drift with the road speed.
 */

interface Particle {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  life: number;
  max: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  grow: number;
  gravity: number;
  ground: boolean;
  alpha: number;
}

const POOL = 90;
const STREAKS = 46;

export class Fx {
  private parts: Particle[] = [];
  private next = 0;
  private tex: THREE.CanvasTexture;
  private streak: THREE.LineSegments;
  private streakPos: Float32Array;
  private streakMat: THREE.LineBasicMaterial;
  private streakOpacity = 0;
  enabled = true;

  constructor(private scene: THREE.Scene) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.45, 'rgba(255,255,255,0.55)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
    }
    this.tex = new THREE.CanvasTexture(c);
    this.tex.colorSpace = THREE.SRGBColorSpace;

    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, opacity: 0 });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.scene.add(sprite);
      this.parts.push({ sprite, mat, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 1, grow: 1, gravity: 0, ground: true, alpha: 1 });
    }

    this.streakPos = new Float32Array(STREAKS * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.streakPos, 3));
    this.streakMat = new THREE.LineBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.streak = new THREE.LineSegments(geo, this.streakMat);
    this.streak.frustumCulled = false;
    this.streak.visible = false;
    this.scene.add(this.streak);
    for (let i = 0; i < STREAKS; i++) this.resetStreak(i, true);
  }

  private resetStreak(i: number, anywhere: boolean) {
    const o = i * 6;
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (3 + Math.random() * 9);
    const y = 0.4 + Math.random() * 6;
    const z = anywhere ? -70 + Math.random() * 80 : -75;
    this.streakPos[o] = this.streakPos[o + 3] = x;
    this.streakPos[o + 1] = this.streakPos[o + 4] = y;
    this.streakPos[o + 2] = z;
    this.streakPos[o + 5] = z - 1;
  }

  emit(opts: {
    x: number;
    y: number;
    z: number;
    vx?: number;
    vy?: number;
    vz?: number;
    life?: number;
    size?: number;
    grow?: number;
    color?: number;
    alpha?: number;
    gravity?: number;
    additive?: boolean;
    ground?: boolean;
  }) {
    if (!this.enabled) return;
    const p = this.parts[this.next];
    this.next = (this.next + 1) % POOL;
    p.life = p.max = opts.life ?? 0.6;
    p.vx = opts.vx ?? 0;
    p.vy = opts.vy ?? 0;
    p.vz = opts.vz ?? 0;
    p.size = opts.size ?? 0.5;
    p.grow = opts.grow ?? 1.5;
    p.gravity = opts.gravity ?? 0;
    p.ground = opts.ground ?? true;
    p.alpha = opts.alpha ?? 0.6;
    p.mat.color.setHex(opts.color ?? 0xbfb6a6);
    p.mat.blending = opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    p.sprite.position.set(opts.x, opts.y, opts.z);
    p.sprite.scale.setScalar(p.size);
    p.mat.opacity = p.alpha;
    p.sprite.visible = true;
  }

  /** collision burst: sparks + debris + a puff of dust */
  crash(x: number, z: number) {
    for (let i = 0; i < 16; i++) {
      this.emit({
        x, y: 0.9, z,
        vx: (Math.random() - 0.5) * 14,
        vy: 2 + Math.random() * 6,
        vz: (Math.random() - 0.5) * 10 - 2,
        life: 0.5 + Math.random() * 0.4,
        size: 0.22 + Math.random() * 0.18,
        grow: 0.4,
        gravity: 16,
        color: Math.random() < 0.5 ? 0xffc24a : 0xff7a2a,
        alpha: 1,
        additive: true,
        ground: false
      });
    }
    for (let i = 0; i < 6; i++) {
      this.emit({
        x, y: 0.6, z,
        vx: (Math.random() - 0.5) * 5,
        vy: 0.6 + Math.random() * 1.6,
        vz: (Math.random() - 0.5) * 4,
        life: 0.9,
        size: 1.1,
        grow: 2.6,
        color: 0x9a948a,
        alpha: 0.55
      });
    }
  }

  /** collect sparkle (coin / chai / battery) */
  sparkle(x: number, y: number, z: number, color: number) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      this.emit({
        x, y, z,
        vx: Math.cos(a) * 3.2,
        vy: 1.5 + Math.random() * 2,
        vz: Math.sin(a) * 3.2,
        life: 0.5,
        size: 0.3,
        grow: 0.3,
        gravity: 5,
        color,
        alpha: 1,
        additive: true,
        ground: false
      });
    }
  }

  update(dt: number, speed: number, boosting: boolean, running: boolean) {
    const rush = speed;
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      const k = p.life / p.max;
      p.vy -= p.gravity * dt;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y = Math.max(0.05, p.sprite.position.y + p.vy * dt);
      p.sprite.position.z += (p.vz + (p.ground ? rush : rush * 0.6)) * dt;
      p.sprite.scale.setScalar(p.size + (1 - k) * p.grow);
      p.mat.opacity = p.alpha * k;
    }

    // speed streaks
    const want = running ? Math.max(0, Math.min(0.4, (speed - 23) / 36)) + (boosting ? 0.12 : 0) : 0;
    this.streakOpacity += (want - this.streakOpacity) * Math.min(1, 4 * dt);
    this.streakMat.opacity = this.streakOpacity;
    this.streak.visible = this.enabled && this.streakOpacity > 0.02;
    if (this.streak.visible) {
      const len = 2 + speed * 0.28;
      for (let i = 0; i < STREAKS; i++) {
        const o = i * 6;
        this.streakPos[o + 2] += speed * 1.5 * dt;
        this.streakPos[o + 5] = this.streakPos[o + 2] - len;
        if (this.streakPos[o + 2] > 14) this.resetStreak(i, false);
      }
      (this.streak.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  dispose() {
    this.tex.dispose();
    for (const p of this.parts) {
      this.scene.remove(p.sprite);
      p.mat.dispose();
    }
    this.scene.remove(this.streak);
    this.streak.geometry.dispose();
    this.streakMat.dispose();
  }
}
