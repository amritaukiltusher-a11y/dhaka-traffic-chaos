import * as THREE from 'three';
import type { InputState } from './input';
import type { SoundEngine } from './audio';
import type { Quality } from '../lib/storage';

/* ------------------------------------------------------------------ types */

export type EventType =
  | 'crash'
  | 'nearMiss'
  | 'pickup'
  | 'pothole'
  | 'pedestrian'
  | 'horn'
  | 'boost'
  | 'levelUp'
  | 'lowBattery'
  | 'pursuit'
  | 'shield';

export interface GameEvent {
  type: EventType;
  value?: number;
}

export interface HudState {
  speed: number; // km/h
  battery: number; // 0..100
  score: number;
  distance: number; // metres
  time: number; // seconds
  collisions: number;
  damage: number; // fictional taka
  level: number;
  gap: number; // 0..30, distance to the chaser (0 = caught)
  shield: number; // seconds of shield left
  shieldCd: number; // seconds until shield is ready
  boosting: boolean;
  invuln: boolean;
}

export interface GameResult {
  score: number;
  distance: number;
  collisions: number;
  battery: number;
  time: number;
  damage: number;
  level: number;
  reason: 'battery' | 'caught';
}

export interface EngineCallbacks {
  onHud: (h: HudState) => void;
  onEvent: (e: GameEvent) => void;
  onOver: (r: GameResult) => void;
  onError: (msg: string) => void;
}

export type EngineMode = 'demo' | 'playing' | 'paused' | 'over';

/* -------------------------------------------------------------- constants */

const LANES = [-4.5, -1.5, 1.5, 4.5];
const LANE_SPEED = [7, 11, 14, 17]; // m/s, slow lane on the left
const ROAD_W = 12;
const SEG = 26;
const SEG_COUNT = 13;
const SPAWN_Z = -190;
const DESPAWN_Z = 24;
const PW = 0.8; // player half-width
const PL = 1.3; // player half-length
const MAX_X = 5.3;
const GAP_MAX = 30;

type Kind = 'car' | 'bus' | 'truck' | 'cng' | 'bike' | 'rickshaw' | 'barrier' | 'pothole' | 'stall' | 'pedestrian' | 'pickup';

interface Entity {
  kind: Kind;
  obj: THREE.Object3D;
  x: number;
  z: number;
  hw: number;
  hl: number;
  speed: number;
  vx: number;
  targetX?: number;
  laneChangeCd: number;
  hit: boolean;
  near: boolean;
  prevZ: number;
  isVehicle: boolean;
  spin?: THREE.Object3D;
}

const CRASH_BATTERY: Partial<Record<Kind, number>> = { bus: 14, truck: 14, car: 10, cng: 8, bike: 6, rickshaw: 6, barrier: 8, stall: 7 };
const CRASH_DAMAGE: Partial<Record<Kind, number>> = {
  bus: 450_000,
  truck: 520_000,
  car: 260_000,
  cng: 90_000,
  bike: 40_000,
  rickshaw: 30_000,
  barrier: 60_000,
  stall: 35_000,
  pothole: 8_000,
  pedestrian: 15_000
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const SHOP_NAMES = ['আলো চা স্টল', 'জুগাড় ইলেকট্রনিক্স', 'ঝাল-মজা ফুচকা', 'মামার দোকান', 'চলো কাবাব ঘর', 'রঙিন কাপড় ঘর', 'মোবাইল ক্লিনিক', 'নতুন বাজার স্টোর', 'ভাই-ভাই মিষ্টান্ন'];
const SIGN_TEXTS = ['ধীরে চলুন', 'জ্যাম এলাকা', 'হর্ন বাজান (ফ্রি)', 'গর্ত সামনে', 'জুগাড় জোন'];

/* ------------------------------------------------------------ the factory */

/** Builds all procedural geometry. Geometries and materials are cached and shared. */
class Factory {
  private geos = new Map<string, THREE.BufferGeometry>();
  private mats = new Map<string, THREE.Material>();

  g(w: number, h: number, d: number) {
    const k = `b${w}|${h}|${d}`;
    let g = this.geos.get(k);
    if (!g) this.geos.set(k, (g = new THREE.BoxGeometry(w, h, d)));
    return g;
  }
  cyl(rt: number, rb: number, h: number, seg = 14) {
    const k = `c${rt}|${rb}|${h}|${seg}`;
    let g = this.geos.get(k);
    if (!g) this.geos.set(k, (g = new THREE.CylinderGeometry(rt, rb, h, seg)));
    return g;
  }
  sph(r: number, ws = 12, hs = 8) {
    const k = `s${r}|${ws}|${hs}`;
    let g = this.geos.get(k);
    if (!g) this.geos.set(k, (g = new THREE.SphereGeometry(r, ws, hs)));
    return g;
  }
  plane(w: number, h: number) {
    const k = `p${w}|${h}`;
    let g = this.geos.get(k);
    if (!g) this.geos.set(k, (g = new THREE.PlaneGeometry(w, h)));
    return g;
  }
  lam(color: number) {
    const k = `l${color}`;
    let m = this.mats.get(k);
    if (!m) this.mats.set(k, (m = new THREE.MeshLambertMaterial({ color })));
    return m;
  }
  basic(color: number) {
    const k = `u${color}`;
    let m = this.mats.get(k);
    if (!m) this.mats.set(k, (m = new THREE.MeshBasicMaterial({ color })));
    return m;
  }
  glass(color: number, opacity: number) {
    const k = `t${color}|${opacity}`;
    let m = this.mats.get(k);
    if (!m) this.mats.set(k, (m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })));
    return m;
  }
  keep<T extends THREE.Material>(key: string, m: T): T {
    this.mats.set(key, m);
    return m;
  }
  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.geos.clear();
    this.mats.clear();
  }

  private add(grp: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    grp.add(m);
    return m;
  }

  private wheel(r: number, w: number) {
    const holder = new THREE.Group();
    const m = new THREE.Mesh(this.cyl(r, r, w, 12), this.lam(0x15161a));
    m.rotation.z = Math.PI / 2;
    holder.add(m);
    return holder;
  }

  private tailLights(grp: THREE.Object3D, halfW: number, y: number, z: number) {
    this.add(grp, this.g(0.22, 0.12, 0.05), this.basic(0xff2b2b), -halfW, y, z);
    this.add(grp, this.g(0.22, 0.12, 0.05), this.basic(0xff2b2b), halfW, y, z);
  }

  /** player's electric auto-rickshaw (front points to -z) */
  rickshaw() {
    const grp = new THREE.Group();
    const wheels: THREE.Object3D[] = [];
    const body = this.lam(0x1fa35a);
    const yellow = this.lam(0xf4c20d);
    const dark = this.lam(0x1a1c22);
    this.add(grp, this.g(1.3, 0.45, 2.3), body, 0, 0.62, 0.1);
    this.add(grp, this.g(1.0, 0.8, 0.9), body, 0, 0.98, -0.95);
    this.add(grp, this.g(1.3, 0.1, 1.75), yellow, 0, 1.98, 0.35);
    for (const x of [-0.58, 0.58]) {
      this.add(grp, this.g(0.07, 1.05, 0.07), dark, x, 1.45, -0.42);
      this.add(grp, this.g(0.07, 1.05, 0.07), dark, x, 1.45, 1.1);
    }
    this.add(grp, this.g(1.1, 0.28, 0.6), dark, 0, 0.95, 0.75);
    this.add(grp, this.g(1.1, 0.6, 0.12), dark, 0, 1.3, 1.08);
    this.add(grp, this.g(1.0, 0.6, 0.05), this.glass(0x9fd8ff, 0.35), 0, 1.6, -0.45);
    this.add(grp, this.sph(0.13), this.basic(0xfff2b0), 0, 0.95, -1.42);
    this.tailLights(grp, 0.5, 0.78, 1.27);
    for (const x of [-0.66, 0.66]) this.add(grp, this.g(0.04, 0.22, 0.55), this.basic(0xffd400), x, 0.65, 0.1);
    const f = this.wheel(0.3, 0.18);
    f.position.set(0, 0.3, -0.95);
    grp.add(f);
    wheels.push(f);
    for (const x of [-0.72, 0.72]) {
      const w = this.wheel(0.3, 0.2);
      w.position.set(x, 0.3, 0.85);
      grp.add(w);
      wheels.push(w);
    }
    return { grp, wheels };
  }

  car() {
    const grp = new THREE.Group();
    const color = pick([0xd94a4a, 0x3a7bd5, 0xe8e8e8, 0x2b2f38, 0xe0b030, 0x4aa36a, 0x8e5bd0]);
    this.add(grp, this.g(1.7, 0.3, 3.9), this.lam(0x101114), 0, 0.35, 0);
    this.add(grp, this.g(1.8, 0.55, 4.2), this.lam(color), 0, 0.72, 0);
    this.add(grp, this.g(1.5, 0.5, 2.2), this.lam(0x1b2733), 0, 1.22, 0.25);
    this.tailLights(grp, 0.65, 0.8, 2.12);
    return { grp, hw: 0.95, hl: 2.1 };
  }

  bus() {
    const grp = new THREE.Group();
    const color = pick([0xd8382f, 0x2a6fd0, 0xe58a1f, 0x2f9a5b, 0xb02f8f]);
    this.add(grp, this.g(2.5, 2.8, 9), this.lam(color), 0, 1.8, 0);
    this.add(grp, this.g(2.54, 0.85, 8.2), this.lam(0x18202c), 0, 2.45, 0);
    this.add(grp, this.g(2.54, 0.35, 9.02), this.lam(0xf2efe6), 0, 1.15, 0);
    this.add(grp, this.g(2.0, 0.25, 4), this.lam(0x30343c), 0, 3.35, 0.5);
    this.tailLights(grp, 1.0, 0.9, 4.52);
    return { grp, hw: 1.25, hl: 4.5 };
  }

  truck() {
    const grp = new THREE.Group();
    const color = pick([0x6b8e4e, 0x8b5a2b, 0x3f5f8a, 0xa14a3a]);
    this.add(grp, this.g(2.4, 2.2, 2.2), this.lam(0xdadada), 0, 1.5, -2.9);
    this.add(grp, this.g(2.5, 2.8, 5.8), this.lam(color), 0, 1.8, 0.9);
    this.add(grp, this.g(2.3, 0.3, 8), this.lam(0x16171b), 0, 0.5, 0);
    this.tailLights(grp, 0.95, 0.75, 3.82);
    return { grp, hw: 1.25, hl: 4 };
  }

  cng() {
    const grp = new THREE.Group();
    this.add(grp, this.g(1.4, 0.5, 2.4), this.lam(0x22262c), 0, 0.5, 0);
    this.add(grp, this.g(1.4, 0.95, 2.4), this.lam(0x1f9d58), 0, 1.15, 0);
    this.add(grp, this.g(1.45, 0.08, 1.6), this.lam(0x16603a), 0, 1.7, 0.3);
    this.tailLights(grp, 0.5, 0.8, 1.22);
    return { grp, hw: 0.75, hl: 1.25 };
  }

  bike() {
    const grp = new THREE.Group();
    this.add(grp, this.g(0.35, 0.5, 1.5), this.lam(0x1b1c20), 0, 0.5, 0);
    this.add(grp, this.g(0.38, 0.6, 0.32), this.lam(pick([0xd04040, 0x3a6ed0, 0xe0a020, 0x40a060])), 0, 1.05, 0.1);
    this.add(grp, this.sph(0.19), this.lam(0x222222), 0, 1.5, 0.1);
    this.add(grp, this.g(0.2, 0.1, 0.05), this.basic(0xff2b2b), 0, 0.7, 0.78);
    return { grp, hw: 0.4, hl: 0.8 };
  }

  cycleRickshaw() {
    const grp = new THREE.Group();
    const c = pick([0xff4fa0, 0x38c6ff, 0xffd23f, 0x7bdc5a, 0xff7a3d]);
    this.add(grp, this.g(0.9, 0.45, 1.8), this.lam(c), 0, 0.65, 0.1);
    this.add(grp, this.g(0.95, 0.12, 1.2), this.lam(pick([0xe83c3c, 0x2f6fe0, 0xf0a020])), 0, 1.55, 0.35);
    for (const x of [-0.42, 0.42]) this.add(grp, this.g(0.05, 0.85, 0.05), this.lam(0x222222), x, 1.1, 0.7);
    this.add(grp, this.g(0.3, 0.5, 0.25), this.lam(0x55708a), 0, 1.2, -0.55);
    this.add(grp, this.sph(0.15), this.lam(0xd8a77a), 0, 1.6, -0.55);
    this.add(grp, this.g(0.18, 0.1, 0.05), this.basic(0xff2b2b), 0, 0.8, 1.02);
    return { grp, hw: 0.55, hl: 1.2 };
  }

  barrier() {
    const grp = new THREE.Group();
    for (let i = -1; i <= 1; i++) this.add(grp, this.g(0.8, 0.5, 0.25), this.lam(i === 0 ? 0xf5f5f5 : 0xe03030), i * 0.8, 0.85, 0);
    for (const x of [-1, 1]) this.add(grp, this.g(0.08, 0.85, 0.08), this.lam(0x30343c), x, 0.42, 0);
    this.add(grp, this.sph(0.1), this.basic(0xffa500), 0, 1.2, 0);
    return { grp, hw: 1.25, hl: 0.35 };
  }

  pothole() {
    const grp = new THREE.Group();
    this.add(grp, this.cyl(1.05, 1.05, 0.01, 18), this.lam(0x3a3c42), 0, 0.012, 0);
    this.add(grp, this.cyl(0.85, 0.85, 0.02, 18), this.basic(0x050506), 0, 0.02, 0);
    return { grp, hw: 0.85, hl: 0.85 };
  }

  stall() {
    const grp = new THREE.Group();
    this.add(grp, this.g(1.7, 0.6, 1.2), this.lam(0x8b5a2b), 0, 0.75, 0);
    for (let i = 0; i < 5; i++) this.add(grp, this.sph(0.17), this.lam(pick([0xe03a2f, 0xf0a010, 0x4aa04a])), -0.64 + i * 0.32, 1.17, 0);
    this.add(grp, this.cyl(0.04, 0.04, 1.5, 6), this.lam(0x30343c), 0, 1.75, 0);
    this.add(grp, this.cyl(0.02, 1.3, 0.35, 10), this.lam(pick([0xe04080, 0x2fa0e0, 0xe0b020])), 0, 2.55, 0);
    this.add(grp, this.cyl(0.25, 0.25, 0.1, 10), this.lam(0x15161a), -0.75, 0.25, 0.7).rotation.z = Math.PI / 2;
    return { grp, hw: 0.95, hl: 0.75 };
  }

  pedestrian() {
    const grp = new THREE.Group();
    this.add(grp, this.cyl(0.18, 0.22, 0.95, 8), this.lam(pick([0xe05a5a, 0x4a7ad0, 0xf0c040, 0x5ab07a, 0xf2f2f2])), 0, 0.7, 0);
    this.add(grp, this.sph(0.17), this.lam(pick([0xd8a77a, 0xb98058, 0x8a5a3a])), 0, 1.4, 0);
    this.add(grp, this.cyl(0.14, 0.14, 0.4, 6), this.lam(0x222a38), 0, 0.2, 0);
    return { grp, hw: 0.32, hl: 0.32 };
  }

  pickup() {
    const grp = new THREE.Group();
    const core = new THREE.Group();
    this.add(core, this.sph(0.5, 10, 8), this.glass(0xffe14d, 0.85), 0, 0, 0);
    this.add(core, this.g(0.16, 0.7, 0.16), this.basic(0xfff7b0), 0, 0, 0);
    this.add(core, this.g(0.5, 0.14, 0.14), this.basic(0xfff7b0), 0, 0.12, 0);
    core.position.y = 1.2;
    grp.add(core);
    this.add(grp, this.cyl(0.8, 0.8, 0.02, 20), this.glass(0x3dff88, 0.35), 0, 0.03, 0);
    return { grp, core, hw: 0.8, hl: 0.8 };
  }

  chaserBus() {
    const grp = new THREE.Group();
    this.add(grp, this.g(2.8, 3.2, 9), this.lam(0xb3121c), 0, 2, 0);
    this.add(grp, this.g(2.84, 0.5, 9.02), this.lam(0x1a1c22), 0, 1.0, 0);
    // angry face on the back (+z side), because that is the side the camera sees
    for (const x of [-0.8, 0.8]) {
      this.add(grp, this.sph(0.42), this.basic(0xffffff), x, 2.7, 4.5);
      this.add(grp, this.sph(0.2), this.basic(0xff1111), x, 2.7, 4.85);
      const brow = this.add(grp, this.g(0.95, 0.14, 0.1), this.basic(0x110000), x, 3.25, 4.6);
      brow.rotation.z = x < 0 ? -0.45 : 0.45;
    }
    for (let i = -3; i <= 3; i++) this.add(grp, this.g(0.26, 0.3, 0.12), this.basic(0xffffff), i * 0.32, 1.6, 4.52);
    this.add(grp, this.g(2.4, 0.18, 0.1), this.basic(0x220000), 0, 1.78, 4.51);
    const l1 = new THREE.Mesh(this.g(0.7, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    const l2 = new THREE.Mesh(this.g(0.7, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0x2060ff }));
    l1.position.set(-0.8, 3.75, 0);
    l2.position.set(0.8, 3.75, 0);
    grp.add(l1, l2);
    this.keep('chaser-l1', l1.material as THREE.Material);
    this.keep('chaser-l2', l2.material as THREE.Material);
    return { grp, l1, l2 };
  }
}

/* ------------------------------------------------------------ the engine */

interface Segment {
  grp: THREE.Group;
  bl: THREE.Mesh;
  br: THREE.Mesh;
  awn: THREE.Mesh[];
  sign: THREE.Mesh[];
  lamps: THREE.Group[];
  gantry: THREE.Group;
  post: THREE.Group;
  postPlate: THREE.Mesh;
}

export class DriveGame {
  private canvas: HTMLCanvasElement;
  private cb: EngineCallbacks;
  private input: InputState;
  private audio: SoundEngine;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, 1, 0.1, 600);
  private f = new Factory();
  private textures: THREE.Texture[] = [];

  private player: THREE.Group;
  private playerWheels: THREE.Object3D[];
  private shieldMesh: THREE.Mesh;
  private headLight: THREE.PointLight;
  private chaser: { grp: THREE.Group; l1: THREE.Mesh; l2: THREE.Mesh };
  private roadTex: THREE.CanvasTexture;
  private segments: Segment[] = [];
  private lampMats: { red: THREE.MeshBasicMaterial; yellow: THREE.MeshBasicMaterial; green: THREE.MeshBasicMaterial };

  private ents: Entity[] = [];
  private aiInput: InputState = { left: false, right: false, accel: false, brake: false, boost: false, horn: false, special: false };
  private prev = { horn: false, special: false, boost: false };

  mode: EngineMode = 'demo';
  private raf = 0;
  private lastT = 0;
  private disposed = false;
  private hudT = 0;
  private resizeObs: ResizeObserver | null = null;

  // run state
  private px = 1.5;
  private vx = 0;
  private speed = 14;
  private battery = 100;
  private time = 0;
  private distance = 0;
  private bonus = 0;
  private collisions = 0;
  private damage = 0;
  private level = 1;
  private gap = 24;
  private shield = 0;
  private shieldCd = 0;
  private invuln = 0;
  private hornCd = 0;
  private boosting = false;
  private shake = 0;
  private spawnT = 0;
  private pickupT = 8;
  private lowWarned = false;
  private pursuitWarned = false;
  private lampPhase = 0;
  private camX = 1.5;
  private chaserX = 1.5;
  private quality: Quality;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks, input: InputState, audio: SoundEngine, quality: Quality) {
    this.canvas = canvas;
    this.cb = cb;
    this.input = input;
    this.audio = audio;
    this.quality = quality;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.applyQuality();
    canvas.addEventListener('webglcontextlost', this.onContextLost as EventListener);

    const sky = 0x0d1226;
    this.scene.background = new THREE.Color(sky);
    this.scene.fog = new THREE.Fog(sky, 45, 200);

    this.scene.add(new THREE.HemisphereLight(0x8fa4ff, 0x20202a, 1.25));
    const sun = new THREE.DirectionalLight(0xffd9a0, 0.9);
    sun.position.set(-20, 40, 30);
    this.scene.add(sun);

    this.headLight = new THREE.PointLight(0xfff0c0, 26, 26, 1.6);
    this.scene.add(this.headLight);

    // road
    this.roadTex = this.makeRoadTexture();
    const roadMat = new THREE.MeshLambertMaterial({ map: this.roadTex });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 520), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -200);
    this.scene.add(road);
    this.f.keep('road', roadMat);

    // sidewalks + curb
    for (const s of [-1, 1]) {
      const walk = new THREE.Mesh(this.f.g(4.6, 0.22, 520), this.f.lam(0x6c6a66));
      walk.position.set(s * 8.3, 0.11, -200);
      this.scene.add(walk);
    }

    this.addSky();

    // traffic light lamp materials (shared by every gantry)
    this.lampMats = {
      red: new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
      yellow: new THREE.MeshBasicMaterial({ color: 0x4a3a05 }),
      green: new THREE.MeshBasicMaterial({ color: 0x053a15 })
    };
    this.f.keep('lamp-r', this.lampMats.red);
    this.f.keep('lamp-y', this.lampMats.yellow);
    this.f.keep('lamp-g', this.lampMats.green);

    this.buildSegments();

    const r = this.f.rickshaw();
    this.player = r.grp;
    this.playerWheels = r.wheels;
    this.scene.add(this.player);

    this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(2.1, 18, 12), new THREE.MeshBasicMaterial({ color: 0x4de1ff, transparent: true, opacity: 0.22, depthWrite: false }));
    this.shieldMesh.position.y = 1.1;
    this.shieldMesh.visible = false;
    this.player.add(this.shieldMesh);

    this.chaser = this.f.chaserBus();
    this.chaser.grp.visible = false;
    this.scene.add(this.chaser.grp);

    this.resize();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);

    this.resetWorld(true);
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ------------------------------------------------------------ public api */

  setQuality(q: Quality) {
    this.quality = q;
    this.applyQuality();
    this.resize();
  }

  startDemo() {
    this.resetWorld(true);
    this.mode = 'demo';
    this.audio.setEngine(0, false, false);
  }

  startRun() {
    this.resetWorld(false);
    this.mode = 'playing';
    this.audio.startEngine();
    this.emitHud();
  }

  pause() {
    if (this.mode === 'playing') {
      this.mode = 'paused';
      this.audio.setEngine(0, false, false);
    }
  }

  resume() {
    if (this.mode === 'paused') {
      this.mode = 'playing';
      this.lastT = performance.now();
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost as EventListener);
    this.audio.stopEngine();
    // shared geometries/materials are disposed by the factory; disposing twice is harmless in three.js
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.f.dispose();
    this.textures.forEach((t) => t.dispose());
    this.roadTex.dispose();
    this.renderer.dispose();
  }

  /* ------------------------------------------------------------- internals */

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.cb.onError('webgl-context-lost');
  };

  private applyQuality() {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.renderer.setPixelRatio(this.quality === 'high' ? Math.min(dpr, 1.75) : 1);
  }

  private resize() {
    const host = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = this.camera.aspect < 1 ? 78 : this.camera.aspect < 1.5 ? 66 : 58;
    this.camera.updateProjectionMatrix();
  }

  private canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d')!);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    this.textures.push(t);
    return t;
  }

  private makeRoadTexture() {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    g.fillStyle = '#26292f';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 5000; i++) {
      const v = 30 + Math.floor(Math.random() * 28);
      g.fillStyle = `rgb(${v},${v},${v + 4})`;
      g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
    }
    const px = (m: number) => ((m + ROAD_W / 2) / ROAD_W) * S; // metres -> canvas x
    // tire-worn lanes
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (const x of LANES) g.fillRect(px(x - 0.9), 0, (1.8 / ROAD_W) * S, S);
    // edge lines
    g.fillStyle = '#d9d9d2';
    g.fillRect(px(-5.8), 0, 5, S);
    g.fillRect(px(5.8) - 5, 0, 5, S);
    // centre double yellow
    g.fillStyle = '#e8b923';
    g.fillRect(px(0) - 7, 0, 4, S);
    g.fillRect(px(0) + 3, 0, 4, S);
    // dashed lane lines (3 m dash, 9 m gap on a 12 m tile)
    g.fillStyle = '#d9d9d2';
    for (const x of [-3, 3]) g.fillRect(px(x) - 2, 0, 4, S * 0.25);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 520 / ROAD_W);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    return t;
  }

  private addSky() {
    const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff3c9, fog: false }));
    moon.position.set(-60, 70, -300);
    this.scene.add(moon);
    const N = 220;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * 0.9 + 0.12;
      pos[i * 3] = Math.cos(a) * 400 * Math.cos(e);
      pos[i * 3 + 1] = 400 * Math.sin(e);
      pos[i * 3 + 2] = -Math.abs(Math.sin(a)) * 400 * Math.cos(e) - 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })));
  }

  /* ---------------------------------------------------------- roadside city */

  private buildSegments() {
    // window textures: one 256px tile = 4x4 cells of 3.2 x 3.4 m
    const lit = Array.from({ length: 16 }, () => Math.random() < 0.45);
    const wall = this.canvasTex(256, 256, (g) => {
      g.fillStyle = '#b9b4aa';
      g.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          g.fillStyle = '#1c2230';
          g.fillRect(c * 64 + 14, r * 64 + 12, 36, 40);
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.fillRect(c * 64, r * 64 + 60, 64, 4);
        }
    });
    const glow = this.canvasTex(256, 256, (g) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, 256, 256);
      lit.forEach((on, i) => {
        if (!on) return;
        g.fillStyle = Math.random() < 0.8 ? '#ffd98a' : '#9fd0ff';
        g.fillRect((i % 4) * 64 + 14, Math.floor(i / 4) * 64 + 12, 36, 40);
      });
    });
    for (const t of [wall, glow]) t.wrapS = t.wrapT = THREE.RepeatWrapping;

    const floors = [4, 6, 8, 10];
    const tints = [0xc8cfe0, 0xe0c8c0, 0xc4dccb, 0xe0d9b8, 0xd0c0e0];
    const bMats: THREE.MeshLambertMaterial[][] = floors.map((fl) => {
      const w = wall.clone();
      const gl = glow.clone();
      for (const t of [w, gl]) {
        t.repeat.set(2, fl / 4);
        t.needsUpdate = true;
        this.textures.push(t);
      }
      return tints.map((tint) => this.f.keep(`b${fl}-${tint}`, new THREE.MeshLambertMaterial({ color: tint, map: w, emissive: 0xffffff, emissiveMap: gl, emissiveIntensity: 0.85 })));
    });
    this.bMats = bMats;
    this.bHeights = floors.map((fl) => fl * 3.4);

    // shop signs and road-sign plates (Bengali text; fonts are awaited before the engine is created)
    const font = (px: number) => `700 ${px}px "Hind Siliguri","Noto Sans Bengali","Kalpurush",sans-serif`;
    this.signTex = SHOP_NAMES.map((name, i) =>
      this.canvasTex(512, 96, (g) => {
        const bg = ['#c62f2f', '#1f6fb5', '#e49a1f', '#2f9a5b', '#8f2fa5', '#d9468f'][i % 6];
        g.fillStyle = bg;
        g.fillRect(0, 0, 512, 96);
        g.strokeStyle = 'rgba(255,255,255,0.85)';
        g.lineWidth = 6;
        g.strokeRect(6, 6, 500, 84);
        g.fillStyle = '#fff';
        g.font = font(52);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(name, 256, 52, 470);
      })
    );
    this.plateTex = SIGN_TEXTS.map((txt, i) =>
      this.canvasTex(256, 128, (g) => {
        g.fillStyle = i % 2 ? '#f2c230' : '#1d5fb4';
        g.fillRect(0, 0, 256, 128);
        g.strokeStyle = i % 2 ? '#222' : '#fff';
        g.lineWidth = 7;
        g.strokeRect(7, 7, 242, 114);
        g.fillStyle = i % 2 ? '#1a1a1a' : '#fff';
        g.font = font(36);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(txt, 128, 66, 220);
      })
    );

    // light pool texture
    const pool = this.canvasTex(64, 64, (g) => {
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,190,90,0.9)');
      grd.addColorStop(1, 'rgba(255,190,90,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
    });
    const poolMat = this.f.keep('pool', new THREE.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));

    const f = this.f;
    const awnColors = [0xd83a3a, 0x2f7fd0, 0xe8a020, 0x30a060, 0xb040c0];
    for (let i = 0; i < SEG_COUNT; i++) {
      const grp = new THREE.Group();
      const mk = (s: number) => {
        const b = new THREE.Mesh(f.g(1, 1, 1), bMats[0][0]);
        b.position.x = s * 15;
        grp.add(b);
        return b;
      };
      const bl = mk(-1);
      const br = mk(1);
      const awn: THREE.Mesh[] = [];
      const sign: THREE.Mesh[] = [];
      for (const s of [-1, 1]) {
        const a = new THREE.Mesh(f.g(1.5, 0.14, SEG - 6), f.lam(awnColors[0]));
        a.position.set(s * 9.9, 3.4, 0);
        grp.add(a);
        awn.push(a);
        const sg = new THREE.Mesh(f.plane(7.5, 1.4), new THREE.MeshBasicMaterial({ map: this.signTex[0] }));
        this.f.keep(`sign-${i}-${s}`, sg.material as THREE.Material);
        sg.position.set(s * 10.45, 4.5, 0);
        sg.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
        grp.add(sg);
        sign.push(sg);
      }
      // street lamps (left / right), one of them shown per segment
      const lamps: THREE.Group[] = [];
      for (const s of [-1, 1]) {
        const lg = new THREE.Group();
        const pole = new THREE.Mesh(f.cyl(0.08, 0.11, 6.4, 8), f.lam(0x2b2e36));
        pole.position.set(s * 6.5, 3.2, 0);
        const arm = new THREE.Mesh(f.g(1.8, 0.1, 0.1), f.lam(0x2b2e36));
        arm.position.set(s * 5.6, 6.35, 0);
        const bulb = new THREE.Mesh(f.sph(0.24, 8, 6), f.basic(0xffd699));
        bulb.position.set(s * 4.8, 6.2, 0);
        const poolMesh = new THREE.Mesh(f.plane(9, 9), poolMat);
        poolMesh.rotation.x = -Math.PI / 2;
        poolMesh.position.set(s * 3.2, 0.06, 0);
        lg.add(pole, arm, bulb, poolMesh);
        grp.add(lg);
        lamps.push(lg);
      }
      // traffic-light gantry (purely decorative)
      const gantry = new THREE.Group();
      const gp = new THREE.Mesh(f.cyl(0.14, 0.18, 6.8, 8), f.lam(0x30343c));
      gp.position.set(-6.4, 3.4, 0);
      const ga = new THREE.Mesh(f.g(11, 0.18, 0.18), f.lam(0x30343c));
      ga.position.set(-0.9, 6.7, 0);
      gantry.add(gp, ga);
      for (const x of [-3.4, 0.4, 3.8]) {
        const box = new THREE.Mesh(f.g(0.5, 1.4, 0.4), f.lam(0x0e0f12));
        box.position.set(x, 6.0, 0);
        gantry.add(box);
        const mats = [this.lampMats.red, this.lampMats.yellow, this.lampMats.green];
        mats.forEach((m, k) => {
          const l = new THREE.Mesh(f.sph(0.15, 8, 6), m);
          l.position.set(x, 6.4 - k * 0.4, 0.22);
          gantry.add(l);
        });
      }
      grp.add(gantry);
      // road sign post
      const post = new THREE.Group();
      const sp = new THREE.Mesh(f.cyl(0.05, 0.05, 2.6, 6), f.lam(0x555a66));
      sp.position.set(6.6, 1.3, 0);
      const plate = new THREE.Mesh(f.plane(1.5, 0.75), new THREE.MeshBasicMaterial({ map: this.plateTex[0] }));
      this.f.keep(`plate-${i}`, plate.material as THREE.Material);
      plate.position.set(6.6, 2.7, 0);
      plate.rotation.y = Math.PI / 2 + Math.PI; // faces the road
      post.add(sp, plate);
      grp.add(post);
      // decorative pedestrians on the footpath
      for (const s of [-1, 1]) {
        if (Math.random() < 0.6) {
          const p = f.pedestrian().grp;
          p.position.set(s * rand(7.2, 9), 0.22, rand(-10, 10));
          grp.add(p);
        }
      }

      grp.position.z = 30 - i * SEG;
      this.scene.add(grp);
      const seg: Segment = { grp, bl, br, awn, sign, lamps, gantry, post, postPlate: plate };
      this.randomizeSegment(seg, i);
      this.segments.push(seg);
    }
  }

  private bMats: THREE.MeshLambertMaterial[][] = [];
  private bHeights: number[] = [];
  private signTex: THREE.Texture[] = [];
  private plateTex: THREE.Texture[] = [];

  private randomizeSegment(seg: Segment, idx: number) {
    const awnColors = [0xd83a3a, 0x2f7fd0, 0xe8a020, 0x30a060, 0xb040c0];
    [seg.bl, seg.br].forEach((b, k) => {
      const hv = Math.floor(Math.random() * this.bHeights.length);
      const h = this.bHeights[hv];
      b.material = pick(this.bMats[hv]);
      b.scale.set(8 + Math.random() * 6, h, SEG - 0.4);
      b.position.set((k === 0 ? -1 : 1) * (10.5 + b.scale.x / 2), h / 2, 0);
    });
    seg.awn.forEach((a) => {
      a.material = this.f.lam(pick(awnColors));
    });
    seg.sign.forEach((s) => {
      (s.material as THREE.MeshBasicMaterial).map = pick(this.signTex);
      (s.material as THREE.MeshBasicMaterial).needsUpdate = true;
    });
    const lampSide = idx % 2;
    seg.lamps.forEach((l, k) => (l.visible = k === lampSide));
    seg.gantry.visible = Math.random() < 0.16;
    seg.post.visible = Math.random() < 0.35;
    (seg.postPlate.material as THREE.MeshBasicMaterial).map = pick(this.plateTex);
    (seg.postPlate.material as THREE.MeshBasicMaterial).needsUpdate = true;
  }

  /* ----------------------------------------------------------- world reset */

  private resetWorld(demo: boolean) {
    for (const e of this.ents) this.scene.remove(e.obj);
    this.ents = [];
    this.px = 1.5;
    this.vx = 0;
    this.speed = demo ? 16 : 12;
    this.battery = 100;
    this.time = 0;
    this.distance = 0;
    this.bonus = 0;
    this.collisions = 0;
    this.damage = 0;
    this.level = 1;
    this.gap = 24;
    this.shield = 0;
    this.shieldCd = 0;
    this.invuln = 0;
    this.hornCd = 0;
    this.boosting = false;
    this.shake = 0;
    this.spawnT = 0.4;
    this.pickupT = 7;
    this.lowWarned = false;
    this.pursuitWarned = false;
    this.camX = this.px;
    this.chaserX = this.px;
    this.player.visible = true;
    this.shieldMesh.visible = false;
    this.chaser.grp.visible = false;
    // pre-populate the road so it never starts empty
    for (let z = -25; z > -170; z -= rand(12, 22)) this.spawnTraffic(z);
  }

  /* ------------------------------------------------------------- spawning */

  private laneFree(lane: number, z: number, minGap: number) {
    const lx = LANES[lane];
    return !this.ents.some((e) => Math.abs(e.x - lx) < 1.6 && Math.abs(e.z - z) < minGap + e.hl);
  }

  private makeEntity(kind: Kind, lane: number, z: number): Entity | null {
    const lx = LANES[lane];
    let b: { grp: THREE.Group; hw: number; hl: number; core?: THREE.Group };
    let speed = 0;
    switch (kind) {
      case 'car':
        b = this.f.car();
        speed = LANE_SPEED[lane] + rand(-0.8, 0.8);
        break;
      case 'cng':
        b = this.f.cng();
        speed = LANE_SPEED[lane] + rand(-0.8, 0.8);
        break;
      case 'bike':
        b = this.f.bike();
        speed = LANE_SPEED[lane] + rand(-0.5, 1.2);
        break;
      case 'bus':
        b = this.f.bus();
        speed = LANE_SPEED[lane] * 0.95;
        break;
      case 'truck':
        b = this.f.truck();
        speed = LANE_SPEED[lane] * 0.92;
        break;
      case 'rickshaw':
        b = this.f.cycleRickshaw();
        speed = 4.5 + rand(0, 1);
        break;
      case 'barrier':
        b = this.f.barrier();
        break;
      case 'pothole':
        b = this.f.pothole();
        break;
      case 'stall':
        b = this.f.stall();
        break;
      case 'pedestrian':
        b = this.f.pedestrian();
        break;
      case 'pickup':
        b = this.f.pickup();
        break;
    }
    const e: Entity = {
      kind,
      obj: b.grp,
      x: lx,
      z,
      hw: b.hw,
      hl: b.hl,
      speed,
      vx: 0,
      laneChangeCd: 0,
      hit: false,
      near: false,
      prevZ: z,
      isVehicle: ['car', 'bus', 'truck', 'cng', 'bike', 'rickshaw'].includes(kind),
      spin: b.core
    };
    if (kind === 'pedestrian') {
      const side = Math.random() < 0.5 ? -1 : 1;
      e.x = side * 7.4;
      e.vx = -side * rand(1.5, 2.3);
      b.grp.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    b.grp.position.set(e.x, kind === 'pedestrian' ? 0.02 : 0, z);
    this.scene.add(b.grp);
    return e;
  }

  private spawnTraffic(z = SPAWN_Z - rand(0, 14)) {
    if (this.ents.length > 42) return;
    const lvl = this.level;
    const table: [Kind, number][] = [
      ['car', 30],
      ['cng', 16],
      ['bus', 12],
      ['truck', 8],
      ['bike', 10],
      ['rickshaw', 7],
      ['barrier', 3 + lvl],
      ['pothole', 8],
      ['stall', 3 + lvl * 0.3],
      ['pedestrian', 5 + lvl * 0.6]
    ];
    const total = table.reduce((s, t) => s + t[1], 0);
    let r = Math.random() * total;
    let kind: Kind = 'car';
    for (const [k, w] of table) {
      if ((r -= w) <= 0) {
        kind = k;
        break;
      }
    }

    let lane = Math.floor(Math.random() * 4);
    if (kind === 'rickshaw') lane = Math.random() < 0.7 ? 0 : 1;
    if (kind === 'bus' || kind === 'truck') lane = Math.floor(Math.random() * 3);

    if (kind === 'pedestrian') {
      const e = this.makeEntity(kind, 0, z);
      if (e) this.ents.push(e);
      return;
    }

    const isStatic = kind === 'barrier' || kind === 'pothole' || kind === 'stall';
    for (let attempt = 0; attempt < 4; attempt++) {
      const gapNeeded = isStatic ? 14 : 18;
      let ok = this.laneFree(lane, z, gapNeeded);
      if (ok && isStatic) {
        // never drop a static obstacle in a lane where moving traffic is still behind it
        const lx = LANES[lane];
        ok = !this.ents.some((e) => e.speed > 0 && Math.abs(e.x - lx) < 1.6 && e.z < -25);
      }
      if (ok) {
        const e = this.makeEntity(kind, lane, z);
        if (e) this.ents.push(e);
        return;
      }
      lane = (lane + 1) % 4;
    }
  }

  private spawnPickup() {
    for (let attempt = 0; attempt < 4; attempt++) {
      const lane = Math.floor(Math.random() * 4);
      if (this.laneFree(lane, SPAWN_Z, 16)) {
        const e = this.makeEntity('pickup', lane, SPAWN_Z);
        if (e) this.ents.push(e);
        return;
      }
    }
  }

  private removeEntity(i: number) {
    this.scene.remove(this.ents[i].obj);
    this.ents.splice(i, 1);
  }

  /* ----------------------------------------------------------------- loop */

  private loop = (t: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (document.hidden) {
      this.lastT = t;
      return;
    }
    const dt = Math.min(0.05, Math.max(0, (t - this.lastT) / 1000));
    this.lastT = t;
    if (this.mode === 'demo' || this.mode === 'playing') this.step(dt);
    this.updateVisuals(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private autopilot() {
    const ai = this.aiInput;
    ai.accel = this.speed < 17;
    ai.brake = this.speed > 22;
    ai.boost = ai.horn = ai.special = false;
    let best = 0;
    let bestScore = -Infinity;
    LANES.forEach((lx, i) => {
      let clear = 120;
      for (const e of this.ents) {
        if (e.kind === 'pickup' || e.z > 3 || e.z < -75) continue;
        if (Math.abs(e.x - lx) < e.hw + PW + 0.6) clear = Math.min(clear, -e.z - e.hl);
      }
      const score = clear - Math.abs(lx - this.px) * 4 + (Math.abs(lx - this.px) < 0.5 ? 10 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    const dx = LANES[best] - this.px;
    ai.left = dx < -0.35;
    ai.right = dx > 0.35;
  }

  private step(dt: number) {
    const demo = this.mode === 'demo';
    if (demo) this.autopilot();
    const inp = demo ? this.aiInput : this.input;

    const hornEdge = inp.horn && !this.prev.horn;
    const specialEdge = inp.special && !this.prev.special;
    const boostEdge = inp.boost && !this.prev.boost;
    this.prev = { horn: inp.horn, special: inp.special, boost: inp.boost };

    this.time += dt;
    const newLevel = Math.min(10, 1 + Math.floor(this.time / 18));
    if (newLevel > this.level && !demo) {
      this.level = newLevel;
      this.emit('levelUp', newLevel);
      this.audio.levelUp();
    }
    this.level = demo ? 2 : this.level;

    /* ---- speed */
    const maxBase = 22 + this.level * 1.4;
    this.boosting = inp.boost && (this.battery > 3 || demo);
    if (this.boosting && boostEdge) {
      this.emit('boost');
      this.audio.boost();
    }
    const max = maxBase * (this.boosting ? 1.45 : 1);
    if (inp.accel) this.speed += (this.boosting ? 16 : 9) * dt;
    else if (inp.brake) this.speed -= 24 * dt;
    else this.speed -= 3.2 * dt;
    if (inp.brake && inp.accel) this.speed -= 9 * dt;
    if (this.speed > max) this.speed = Math.max(max, this.speed - 14 * dt);
    this.speed = clamp(this.speed, 4, max + 2);

    /* ---- steering */
    const steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const target = steer * (7 + this.speed * 0.12);
    this.vx += (target - this.vx) * Math.min(1, 9 * dt);
    this.px += this.vx * dt;
    if (this.px > MAX_X || this.px < -MAX_X) {
      this.px = clamp(this.px, -MAX_X, MAX_X);
      this.vx = 0;
    }
    if (Math.abs(this.px) > 5.0) this.speed = Math.max(4, this.speed - 4 * dt); // scraping the kerb

    this.distance += this.speed * dt;
    this.roadTex.offset.y += (this.speed * dt) / ROAD_W;

    /* ---- timers */
    this.shield = Math.max(0, this.shield - dt);
    this.shieldCd = Math.max(0, this.shieldCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hornCd = Math.max(0, this.hornCd - dt);
    this.shake = Math.max(0, this.shake - dt * 1.6);

    /* ---- actions */
    if (hornEdge && this.hornCd <= 0) this.doHorn();
    if (specialEdge && !demo && this.shieldCd <= 0 && this.battery > 8 && this.shield <= 0) {
      this.battery -= 8;
      this.shield = 1.6;
      this.shieldCd = 9;
      this.emit('shield');
      this.audio.shield();
    }

    /* ---- battery / pursuit (not in demo) */
    if (!demo) {
      this.battery -= (0.7 + this.speed * 0.028) * dt + (this.boosting ? 4.5 * dt : 0);
      if (this.battery < 25 && !this.lowWarned) {
        this.lowWarned = true;
        this.emit('lowBattery');
        this.audio.warn();
      } else if (this.battery > 38) this.lowWarned = false;

      const chaserSpeed = 14 + this.level * 1.6;
      this.gap = clamp(this.gap + (this.speed - chaserSpeed) * dt * 0.35, 0, GAP_MAX);
      if (this.gap < 9 && !this.pursuitWarned) {
        this.pursuitWarned = true;
        this.emit('pursuit');
        this.audio.warn();
      } else if (this.gap > 15) this.pursuitWarned = false;
    }

    /* ---- spawning */
    this.spawnT -= dt * (this.speed / 18);
    if (this.spawnT <= 0) {
      this.spawnTraffic();
      this.spawnT = rand(0.5, 1.0) / (1 + this.level * 0.12);
    }
    this.pickupT -= dt;
    if (this.pickupT <= 0) {
      this.spawnPickup();
      this.pickupT = rand(12, 18) + this.level * 0.8;
    }

    /* ---- entities */
    for (let i = this.ents.length - 1; i >= 0; i--) {
      const e = this.ents[i];
      e.prevZ = e.z;
      e.z += (this.speed - e.speed) * dt;
      e.laneChangeCd = Math.max(0, e.laneChangeCd - dt);
      if (e.targetX !== undefined) {
        const d = e.targetX - e.x;
        e.x += Math.sign(d) * Math.min(Math.abs(d), 2.8 * dt);
        if (Math.abs(e.targetX - e.x) < 0.01) e.targetX = undefined;
      } else if (e.vx) e.x += e.vx * dt;
      e.obj.position.x = e.x;
      e.obj.position.z = e.z;
      if (e.spin) e.spin.rotation.y += dt * 3;

      if (e.z > DESPAWN_Z || e.z < SPAWN_Z - 60 || Math.abs(e.x) > 13) {
        this.removeEntity(i);
        continue;
      }
      if (e.hit) continue;

      const dx = Math.abs(e.x - this.px);
      const dz = Math.abs(e.z);
      const overlap = dx < (PW + e.hw) * 0.9 && dz < (PL + e.hl) * 0.9;
      if (overlap && !demo) {
        const removed = this.onTouch(e);
        if (removed) {
          this.removeEntity(i);
          if (this.mode === 'over') return;
        }
        continue;
      }
      // near miss: the vehicle's centre line crossed ours with a thin gap
      if (!demo && e.isVehicle && !e.near && e.prevZ < 0 !== e.z < 0) {
        const gapX = dx - (PW + e.hw);
        if (gapX >= 0 && gapX < 1.0) {
          e.near = true;
          const bonus = Math.round(30 + this.speed);
          this.bonus += bonus;
          this.emit('nearMiss', bonus);
          this.audio.nearMiss();
        }
      }
    }

    /* ---- scenery */
    for (const seg of this.segments) {
      seg.grp.position.z += this.speed * dt;
      if (seg.grp.position.z > 30 + SEG) {
        seg.grp.position.z -= SEG * SEG_COUNT;
        this.randomizeSegment(seg, Math.floor(Math.random() * 1000));
      }
    }

    /* ---- end conditions */
    if (!demo) {
      if (this.battery <= 0) {
        this.battery = 0;
        this.finish('battery');
      } else if (this.gap <= 0) {
        this.finish('caught');
      }
    }

    /* ---- hud + engine sound */
    if (this.mode === 'playing') {
      this.hudT += dt;
      if (this.hudT > 0.1) {
        this.hudT = 0;
        this.emitHud();
      }
      this.audio.setEngine(this.speed / maxBase, this.boosting, true);
    }
  }

  private doHorn() {
    this.hornCd = 0.6;
    this.audio.horn();
    let moved = 0;
    for (const e of this.ents) {
      if (e.z > 2 || e.z < -50) continue;
      if (e.isVehicle && Math.abs(e.x - this.px) < 2.4 && e.speed < this.speed && e.laneChangeCd <= 0 && e.targetX === undefined) {
        const cur = LANES.reduce((best, lx, i) => (Math.abs(lx - e.x) < Math.abs(LANES[best] - e.x) ? i : best), 0);
        const options = [cur - 1, cur + 1].filter((l) => l >= 0 && l < 4 && this.laneFree(l, e.z, 8));
        if (options.length) {
          e.targetX = LANES[pick(options)];
          e.laneChangeCd = 2;
          moved++;
        }
      } else if (e.kind === 'pedestrian' && e.z > -45) {
        e.vx *= 1.8;
      }
    }
    this.emit('horn', moved);
  }

  /** returns true when the entity should be removed */
  private onTouch(e: Entity): boolean {
    e.hit = true;
    switch (e.kind) {
      case 'pickup':
        this.battery = Math.min(100, this.battery + 22);
        this.bonus += 120;
        this.emit('pickup');
        this.audio.pickup();
        return true;
      case 'pothole':
        if (this.shield > 0) return false;
        this.speed *= 0.75;
        this.battery -= 3;
        this.damage += this.dmg('pothole');
        this.shake = 0.35;
        this.emit('pothole');
        return false;
      case 'pedestrian':
        if (this.shield > 0) return false;
        // the pedestrian hops out of the way (no gore, just a penalty)
        e.vx = (e.x >= this.px ? 1 : -1) * 7;
        this.speed *= 0.6;
        this.battery -= 4;
        this.gap = Math.max(0, this.gap - 3);
        this.damage += this.dmg('pedestrian');
        this.shake = 0.4;
        this.emit('pedestrian');
        this.audio.crash();
        return false;
      default:
        if (this.shield > 0 || this.invuln > 0) return false;
        this.crash(e);
        return false;
    }
  }

  private dmg(kind: Kind) {
    return Math.round(((CRASH_DAMAGE[kind] ?? 20_000) * rand(0.6, 1.4)) / 1000) * 1000;
  }

  private crash(e: Entity) {
    this.collisions++;
    this.battery -= CRASH_BATTERY[e.kind] ?? 8;
    this.speed *= 0.35;
    this.invuln = 1.0;
    this.shake = 0.7;
    this.damage += this.dmg(e.kind);
    this.gap = Math.max(0, this.gap - 5);
    // shove the other vehicle aside so the same crash is not counted twice
    e.vx = (e.x === this.px ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(e.x - this.px)) * 5;
    if (e.speed > 0) e.speed = Math.max(2, e.speed * 0.7);
    this.emit('crash');
    this.audio.crash();
    if (this.battery <= 0) {
      this.battery = 0;
      this.finish('battery');
    }
  }

  private finish(reason: 'battery' | 'caught') {
    if (this.mode === 'over') return;
    this.mode = 'over';
    this.audio.setEngine(0, false, false);
    this.audio.over();
    this.emitHud();
    this.cb.onOver({
      score: this.score(),
      distance: Math.round(this.distance),
      collisions: this.collisions,
      battery: Math.max(0, Math.round(this.battery)),
      time: Math.round(this.time),
      damage: this.damage,
      level: this.level,
      reason
    });
  }

  private score() {
    return Math.floor(this.distance * 0.4) + this.bonus;
  }

  private emit(type: EventType, value?: number) {
    this.cb.onEvent({ type, value });
  }

  private emitHud() {
    this.cb.onHud({
      speed: Math.round(this.speed * 3.6),
      battery: Math.max(0, this.battery),
      score: this.score(),
      distance: Math.round(this.distance),
      time: this.time,
      collisions: this.collisions,
      damage: this.damage,
      level: this.level,
      gap: this.gap,
      shield: this.shield,
      shieldCd: this.shieldCd,
      boosting: this.boosting,
      invuln: this.invuln > 0
    });
  }

  /* ------------------------------------------------------------- visuals */

  private updateVisuals(dt: number) {
    const t = performance.now() / 1000;
    const running = this.mode === 'demo' || this.mode === 'playing';

    // player
    this.player.position.x = this.px;
    this.player.rotation.z = -this.vx * 0.025;
    this.player.rotation.y = -this.vx * 0.02;
    this.player.position.y = running ? Math.sin(t * 22) * 0.012 * (this.speed / 20) : 0;
    this.player.visible = this.invuln > 0 ? Math.floor(t * 14) % 2 === 0 : true;
    if (running) for (const w of this.playerWheels) w.rotation.x -= this.speed * dt * 3.2;
    this.shieldMesh.visible = this.shield > 0;
    this.headLight.position.set(this.px, 2.2, -5);

    // camera
    this.camX += (this.px * 0.55 - this.camX) * Math.min(1, 4 * dt);
    const sh = running ? this.shake * 0.35 : 0;
    const boostPull = this.boosting ? 0.6 : 0;
    this.camera.position.set(this.camX + (Math.random() - 0.5) * sh, 5.8 + (Math.random() - 0.5) * sh, 11.5 + boostPull);
    this.camera.lookAt(this.camX * 0.5, 1.0, -16);

    // chaser
    const showChaser = this.mode !== 'demo' && this.gap < 22;
    this.chaser.grp.visible = showChaser;
    if (showChaser) {
      this.chaserX += (this.px - this.chaserX) * Math.min(1, 2 * dt);
      this.chaser.grp.position.set(this.chaserX, 0, 3.2 + this.gap * 0.17);
      const flip = Math.floor(t * 6) % 2 === 0;
      (this.chaser.l1.material as THREE.MeshBasicMaterial).color.setHex(flip ? 0xff2020 : 0x300000);
      (this.chaser.l2.material as THREE.MeshBasicMaterial).color.setHex(flip ? 0x001040 : 0x2060ff);
    }

    // traffic lights (decorative cycle: 4s green, 1s yellow, 3s red)
    this.lampPhase = (this.lampPhase + dt) % 8;
    const p = this.lampPhase;
    this.lampMats.green.color.setHex(p < 4 ? 0x2bff6a : 0x053a15);
    this.lampMats.yellow.color.setHex(p >= 4 && p < 5 ? 0xffd32a : 0x4a3a05);
    this.lampMats.red.color.setHex(p >= 5 ? 0xff2a2a : 0x3a0808);

    // pickups bob
    for (const e of this.ents) if (e.spin) e.spin.position.y = 1.2 + Math.sin(t * 3 + e.z) * 0.15;
  }
}
