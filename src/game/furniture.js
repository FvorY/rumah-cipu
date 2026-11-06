import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { rugTexture, codeTexture, paintingTexture } from './textures'

const mats = new Map()
export const M = (color, roughness = 0.8, extra = {}) => {
  const key = `${color}|${roughness}|${JSON.stringify(extra)}`
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness, ...extra }))
  return mats.get(key)
}

const shadow = (m) => {
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// y = titik tengah
export const B = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const m = shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat))
  m.position.set(x, y, z)
  return m
}
export const R = (w, h, d, mat, x = 0, y = 0, z = 0, r = 0.04) => {
  const m = shadow(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat))
  m.position.set(x, y, z)
  return m
}
export const C = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 20) => {
  const m = shadow(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat))
  m.position.set(x, y, z)
  return m
}
export const S = (r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat))
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sz)
  return m
}

const WOOD = '#8a5a3b'
const WOOD_LIGHT = '#c49a6c'

// ---------- builder per furnitur (lokal: depan = +z, alas di y=0) ----------

const legs = (g, w, d, h, mat, inset = 0.05, r = 0.025) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(C(r, r, h, mat, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset), 8))
}

const bed = (w, d, blanket) => {
  const g = new THREE.Group()
  g.add(B(w, 0.26, d, M(WOOD, 0.7), 0, 0.13, 0))
  g.add(R(w - 0.06, 0.2, d - 0.08, M('#f7f3ea', 0.9), 0, 0.36, 0.02, 0.05))
  const len = d * 0.6
  g.add(R(w + 0.02, 0.24, len, M(blanket, 0.95), 0, 0.37, d / 2 - len / 2, 0.05))
  const fold = new THREE.Color(blanket).offsetHSL(0, 0, 0.12)
  g.add(R(w + 0.03, 0.08, 0.14, M(`#${fold.getHexString()}`, 0.95), 0, 0.5, d / 2 - len, 0.03))
  const n = w > 1.3 ? 2 : 1
  for (let i = 0; i < n; i++) {
    const pw = w / n - 0.14
    const p = R(pw, 0.12, 0.34, M('#fbfaf6', 0.95), -w / 2 + (w / n) * (i + 0.5), 0.52, -d / 2 + 0.3, 0.05)
    p.rotation.x = -0.12
    g.add(p)
  }
  g.add(R(w + 0.04, 0.95, 0.07, M(WOOD, 0.7), 0, 0.475, -d / 2 + 0.035, 0.02))
  return g
}

const wardrobe = (w, d) => {
  const g = new THREE.Group()
  g.add(B(w, 2.0, d, M(WOOD_LIGHT, 0.65), 0, 1.0, 0))
  const line = M('#6b4a33', 0.6)
  const doors = Math.max(2, Math.round(w / 0.45))
  for (let i = 1; i < doors; i++) g.add(B(0.01, 1.9, 0.01, line, -w / 2 + (w / doors) * i, 1.0, d / 2 + 0.003))
  const handle = M('#d6c08a', 0.3, { metalness: 0.7 })
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + (w / doors) * (i + 0.5) + (i % 2 ? -1 : 1) * (w / doors) * 0.32
    g.add(B(0.02, 0.18, 0.025, handle, x, 1.05, d / 2 + 0.012))
  }
  g.add(B(w + 0.02, 0.05, d + 0.02, M('#6b4a33', 0.6), 0, 2.02, 0))
  return g
}

const chair = (color = WOOD) => {
  const g = new THREE.Group()
  const m = M(color, 0.7)
  g.add(B(0.42, 0.04, 0.4, m, 0, 0.45, 0))
  legs(g, 0.42, 0.4, 0.45, m, 0.03, 0.018)
  g.add(B(0.42, 0.42, 0.03, m, 0, 0.68, -0.19))
  return g
}

const desk = (w, d) => {
  const g = new THREE.Group()
  const m = M(WOOD_LIGHT, 0.6)
  g.add(B(w, 0.04, d, m, 0, 0.74, 0))
  legs(g, w, d, 0.72, M('#3a3a3a', 0.5), 0.04, 0.02)
  // laptop, buat yang suka ngoding malem-malem
  const lap = new THREE.Group()
  lap.add(B(0.34, 0.015, 0.23, M('#b9bcc1', 0.35, { metalness: 0.6 }), 0, 0.008, 0))
  const lid = new THREE.Group()
  lid.add(B(0.34, 0.22, 0.01, M('#b9bcc1', 0.35, { metalness: 0.6 }), 0, 0.11, 0))
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.31, 0.19),
    new THREE.MeshStandardMaterial({ map: codeTexture(), emissive: '#ffffff', emissiveIntensity: 0.55, emissiveMap: null }),
  )
  screen.material.emissiveMap = screen.material.map
  screen.position.set(0, 0.11, 0.006)
  lid.add(screen)
  lid.position.set(0, 0.015, -0.11)
  lid.rotation.x = -0.25
  lap.add(lid)
  lap.position.set(-w * 0.15, 0.76, 0.02)
  g.add(lap)
  const mug = C(0.035, 0.03, 0.09, M('#e4572e', 0.6), w * 0.3, 0.805, 0.05)
  g.add(mug)
  const c = chair('#3d3d3d')
  c.position.z = d / 2 + 0.12
  c.rotation.y = Math.PI
  g.add(c)
  return g
}

const sofa = (w, d, color, accent = '#e7b85b') => {
  const g = new THREE.Group()
  const fabric = M(color, 0.95)
  const darker = new THREE.Color(color).offsetHSL(0, 0, -0.06)
  const base = M(`#${darker.getHexString()}`, 0.95)
  g.add(R(w, 0.22, d, base, 0, 0.19, 0, 0.04))
  const n = Math.max(1, Math.round((w - 0.3) / 0.62))
  const cw = (w - 0.3) / n
  for (let i = 0; i < n; i++) g.add(R(cw - 0.02, 0.14, d - 0.26, fabric, -w / 2 + 0.15 + cw * (i + 0.5), 0.36, 0.08, 0.05))
  g.add(R(w, 0.5, 0.22, fabric, 0, 0.5, -d / 2 + 0.11, 0.06))
  for (const s of [-1, 1]) g.add(R(0.16, 0.44, d, fabric, s * (w / 2 - 0.08), 0.36, 0, 0.06))
  if (w > 1.2) {
    for (const s of [-1, 1]) {
      const p = R(0.34, 0.32, 0.1, M(accent, 0.95), s * (w / 2 - 0.4), 0.55, -d / 2 + 0.3, 0.05)
      p.rotation.set(-0.25, s * 0.25, 0)
      g.add(p)
    }
  }
  legs(g, w, d, 0.08, M('#3a2a1f', 0.6), 0.08, 0.02)
  return g
}

const coffeeTable = (w, d) => {
  const g = new THREE.Group()
  const m = M(WOOD, 0.55)
  g.add(R(w, 0.05, d, m, 0, 0.4, 0, 0.02))
  g.add(B(w - 0.1, 0.02, d - 0.1, m, 0, 0.14, 0))
  legs(g, w, d, 0.4, m, 0.06, 0.025)
  return g
}

const sideboard = (w, d) => {
  const g = new THREE.Group()
  g.add(B(w, 0.72, d, M(WOOD_LIGHT, 0.6), 0, 0.4, 0))
  legs(g, w, d, 0.06, M('#3a2a1f', 0.6), 0.05, 0.02)
  g.add(B(w + 0.02, 0.03, d + 0.02, M(WOOD, 0.5), 0, 0.775, 0))
  return g
}

export const pottedPlant = (size = 1, potColor = '#b8653f') => {
  const g = new THREE.Group()
  g.add(C(0.13 * size, 0.1 * size, 0.24 * size, M(potColor, 0.9), 0, 0.12 * size, 0))
  g.add(C(0.12 * size, 0.12 * size, 0.02, M('#4f3322', 1), 0, 0.235 * size, 0))
  const leafMat = M('#4f8a3c', 0.8, { side: THREE.DoubleSide })
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const leaf = S(0.11 * size, leafMat, 0, 0, 0, 0.55, 0.12, 1)
    const stem = new THREE.Group()
    leaf.position.set(0, 0, 0.13 * size)
    stem.add(leaf)
    stem.position.y = 0.24 * size + (i % 3) * 0.06 * size
    stem.rotation.set(-0.5 - (i % 2) * 0.3, a, 0)
    g.add(stem)
  }
  return g
}

const tvUnit = (w, d) => {
  const g = new THREE.Group()
  g.add(B(w, 0.42, d, M('#5e4433', 0.6), 0, 0.25, 0))
  legs(g, w, d, 0.05, M('#2a2a2a', 0.5), 0.05, 0.02)
  const tv = new THREE.Group()
  const tw = Math.min(1.25, w * 0.8)
  tv.add(R(tw, tw * 0.58, 0.05, M('#161616', 0.4), 0, 0, 0, 0.012))
  const screenMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.2, emissive: '#000000' })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(tw - 0.04, tw * 0.58 - 0.04), screenMat)
  screen.position.z = 0.026
  tv.add(screen)
  tv.position.set(0, 0.46 + 0.05 + tw * 0.29, -d / 2 + 0.12)
  g.add(tv)
  g.add(B(0.25, 0.03, 0.14, M('#161616', 0.4), 0, 0.475, -d / 2 + 0.12))
  g.add(B(0.05, 0.06, 0.04, M('#161616', 0.4), 0, 0.5, -d / 2 + 0.12))
  // speaker kecil + remote
  g.add(B(0.12, 0.02, 0.05, M('#2b2b2b', 0.5), w * 0.3, 0.47, 0.05))
  return { g, screenMat }
}

// TV tipis (lokal: layar menghadap +z, titik tengah di tengah layar)
const flatTv = (w) => {
  const g = new THREE.Group()
  const h = w * 0.58
  g.add(R(w, h, 0.035, M('#151515', 0.4), 0, 0, 0, 0.008))
  const screenMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.2, emissive: '#000000' })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, h - 0.03), screenMat)
  screen.position.z = 0.019
  g.add(screen)
  g.add(B(0.03, 0.008, 0.006, M('#c33', 0.5, { emissive: '#900' }), w / 2 - 0.05, -h / 2 + 0.01, 0.02))
  return { g, screenMat, h }
}

const counter = (w, d, withDoors = true) => {
  const g = new THREE.Group()
  g.add(B(w, 0.84, d - 0.02, M('#efe9de', 0.7), 0, 0.42, -0.01))
  g.add(B(w + 0.02, 0.05, d + 0.02, M('#4a4542', 0.35), 0, 0.865, 0))
  if (withDoors) {
    const n = Math.max(1, Math.round(w / 0.5))
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w / n) * (i + 0.5)
      g.add(B(w / n - 0.03, 0.7, 0.01, M('#e2d8c6', 0.6), x, 0.42, d / 2 - 0.01))
      g.add(B(0.1, 0.015, 0.02, M('#a0a0a0', 0.3, { metalness: 0.7 }), x, 0.68, d / 2 + 0.005))
    }
  }
  return g
}

const fridge = (w, d) => {
  const g = new THREE.Group()
  const body = M('#e9edef', 0.35)
  g.add(R(w, 1.7, d, body, 0, 0.85, 0, 0.04))
  g.add(B(w - 0.02, 0.01, 0.01, M('#b9bec2', 0.5), 0, 1.18, d / 2 + 0.001))
  const h = M('#b9bec2', 0.3, { metalness: 0.6 })
  g.add(B(0.025, 0.3, 0.03, h, w / 2 - 0.08, 1.42, d / 2 + 0.02))
  g.add(B(0.025, 0.4, 0.03, h, w / 2 - 0.08, 0.85, d / 2 + 0.02))
  // magnet kulkas
  g.add(B(0.07, 0.07, 0.01, M('#f2b134', 0.6), -0.1, 1.45, d / 2 + 0.005))
  g.add(B(0.06, 0.08, 0.01, M('#5aa0c8', 0.6), 0.02, 1.32, d / 2 + 0.005))
  return g
}

const toilet = () => {
  const g = new THREE.Group()
  const p = M('#f7f7f4', 0.25)
  g.add(C(0.15, 0.12, 0.38, p, 0, 0.19, 0.05))
  g.add(S(0.19, p, 0, 0.36, 0.08, 1, 0.3, 1.2))
  g.add(B(0.38, 0.32, 0.16, p, 0, 0.55, -0.16))
  return g
}

// area shower: tray, partisi kaca, shower head di dinding
// glassSide = sisi lokal x yang dikasih kaca samping (-1 / 1)
const shower = (glassSide) => (w, d) => {
  const g = new THREE.Group()
  const chrome = M('#d5d9dc', 0.15, { metalness: 0.9 })
  g.add(B(w, 0.05, d, M('#f4f4f1', 0.3), 0, 0.025, 0))
  g.add(B(0.09, 0.006, 0.09, M('#8f969a', 0.3, { metalness: 0.7 }), 0, 0.052, 0.04))
  // pipa + kepala shower
  g.add(C(0.012, 0.012, 1.0, chrome, 0, 1.45, -d / 2 + 0.035, 8))
  const arm = C(0.01, 0.01, 0.2, chrome, 0, 1.95, -d / 2 + 0.13, 8)
  arm.rotation.x = Math.PI / 2
  g.add(arm)
  const head = C(0.085, 0.06, 0.025, chrome, 0, 1.93, -d / 2 + 0.24, 24)
  head.rotation.x = 0.35
  g.add(head)
  g.add(B(0.14, 0.08, 0.05, chrome, 0, 1.05, -d / 2 + 0.03))
  g.add(B(0.02, 0.03, 0.07, chrome, 0.04, 1.05, -d / 2 + 0.07))
  // rak sabun kecil
  g.add(B(0.22, 0.02, 0.1, chrome, glassSide * -w * 0.22, 1.2, -d / 2 + 0.06))
  g.add(C(0.025, 0.025, 0.12, M('#7fb8a4', 0.4), glassSide * -w * 0.27, 1.27, -d / 2 + 0.06, 12))
  g.add(C(0.022, 0.022, 0.1, M('#f2c14e', 0.4), glassSide * -w * 0.16, 1.26, -d / 2 + 0.06, 12))
  // kaca
  const glass = new THREE.MeshStandardMaterial({
    color: '#d4ebf1',
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.9, d - 0.02), glass)
  side.position.set(glassSide * (w / 2 - 0.01), 1.0, 0)
  g.add(side)
  const fw = w * 0.55
  const front = new THREE.Mesh(new THREE.BoxGeometry(fw, 1.9, 0.012), glass)
  front.position.set(glassSide * (w / 2 - fw / 2), 1.0, d / 2 - 0.01)
  g.add(front)
  g.add(B(0.02, 0.02, d, chrome, glassSide * (w / 2 - 0.01), 1.95, 0))
  g.add(B(fw, 0.02, 0.02, chrome, glassSide * (w / 2 - fw / 2), 1.95, d / 2 - 0.01))
  // handuk di gantungan
  const towel = R(0.05, 0.42, 0.26, M('#e9a56a', 1), -glassSide * (w / 2 - 0.03), 1.3, -d / 2 + 0.25, 0.02)
  g.add(towel)
  return g
}

const basin = () => {
  const g = new THREE.Group()
  g.add(B(0.42, 0.14, 0.34, M('#f7f7f4', 0.25), 0, 0.82, 0))
  g.add(C(0.04, 0.05, 0.75, M('#f7f7f4', 0.25), 0, 0.37, -0.05))
  g.add(B(0.4, 0.55, 0.02, new THREE.MeshStandardMaterial({ color: '#cfe0e6', roughness: 0.05, metalness: 0.9 }), 0, 1.35, -0.16))
  return g
}

const catTree = () => {
  const g = new THREE.Group()
  const carpet = M('#b9a38a', 1)
  const rope = M('#d1b88d', 1)
  g.add(B(0.56, 0.06, 0.56, carpet, 0, 0.03, 0))
  g.add(C(0.06, 0.06, 1.2, rope, -0.12, 0.6, -0.1, 12))
  g.add(C(0.06, 0.06, 0.82, rope, 0.15, 0.41, 0.12, 12))
  g.add(C(0.22, 0.22, 0.05, carpet, 0.08, 0.55, 0.08, 20))
  g.add(C(0.2, 0.2, 0.05, carpet, -0.05, 0.85, -0.02, 20))
  g.add(C(0.24, 0.24, 0.06, carpet, -0.06, 1.21, -0.06, 20))
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 24), carpet)
  rim.rotation.x = Math.PI / 2
  rim.position.set(-0.06, 1.25, -0.06)
  g.add(shadow(rim))
  const ball = S(0.04, M('#e04f5f', 0.8), 0.2, 0.62, 0.2)
  g.add(ball)
  return g
}

const bowl = (color) => {
  const pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.075, 0),
    new THREE.Vector2(0.09, 0.05),
    new THREE.Vector2(0.075, 0.05),
    new THREE.Vector2(0.06, 0.012),
    new THREE.Vector2(0, 0.012),
  ]
  const g = new THREE.Group()
  g.add(shadow(new THREE.Mesh(new THREE.LatheGeometry(pts, 24), M(color, 0.4))))
  return g
}

const catBed = () => {
  const g = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 10, 24), M('#d98c6a', 1))
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.07
  g.add(shadow(ring))
  g.add(C(0.2, 0.2, 0.05, M('#f0d6b8', 1), 0, 0.03, 0))
  return g
}

const tree = () => {
  const g = new THREE.Group()
  const trunk = C(0.08, 0.13, 1.8, M('#7a5a3f', 1), 0, 0.9, 0, 10)
  g.add(trunk)
  const leaf = [M('#5f8f43', 1), M('#73a252', 1), M('#4d7b38', 1)]
  const blobs = [
    [0, 2.1, 0, 0.75], [0.45, 1.85, 0.2, 0.55], [-0.45, 1.9, -0.1, 0.55], [0.1, 2.5, -0.2, 0.55], [-0.2, 1.8, 0.4, 0.45],
  ]
  blobs.forEach(([x, y, z, r], i) => {
    const b = shadow(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf[i % 3]))
    b.position.set(x, y, z)
    g.add(b)
  })
  return g
}

const bush = (r = 0.25, color = '#5d8f41', flowers = '#f3a6b8') => {
  const g = new THREE.Group()
  const m = M(color, 1)
  for (let i = 0; i < 4; i++) {
    const b = shadow(new THREE.Mesh(new THREE.IcosahedronGeometry(r * (0.7 + (i % 2) * 0.3), 1), m))
    b.position.set(Math.cos(i * 1.7) * r * 0.6, r * 0.7, Math.sin(i * 1.7) * r * 0.6)
    g.add(b)
  }
  if (flowers) {
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39
      g.add(S(0.03, M(flowers, 0.8), Math.cos(a) * r * 0.9, r * (0.9 + (i % 3) * 0.2), Math.sin(a) * r * 0.9))
    }
  }
  return g
}

const dispenser = () => {
  const g = new THREE.Group()
  g.add(B(0.3, 0.9, 0.3, M('#f0f0ee', 0.5), 0, 0.45, 0))
  g.add(B(0.1, 0.04, 0.03, M('#d33b3b', 0.5), -0.06, 0.62, 0.16))
  g.add(B(0.1, 0.04, 0.03, M('#3b6fd3', 0.5), 0.06, 0.62, 0.16))
  const galon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.4, 20),
    new THREE.MeshStandardMaterial({ color: '#8fc6e8', roughness: 0.1, transparent: true, opacity: 0.7 }),
  )
  galon.position.y = 1.12
  g.add(galon)
  g.add(C(0.06, 0.13, 0.08, M('#8fc6e8', 0.1), 0, 0.92, 0))
  return g
}

const tabungGas = () => {
  // tabung melon 3 kg
  const g = new THREE.Group()
  const green = M('#6fae3b', 0.5)
  g.add(C(0.06, 0.07, 0.05, green, 0, 0.025, 0, 16))
  g.add(S(0.13, green, 0, 0.2, 0, 1, 1.1, 1))
  g.add(C(0.03, 0.03, 0.08, M('#c9c9c9', 0.3, { metalness: 0.8 }), 0, 0.38, 0, 10))
  return g
}

// ---------- tata letak sesuai denah ----------

export function buildFurniture(scene, physics) {
  const root = new THREE.Group()
  root.name = 'furniture'
  scene.add(root)
  const interactables = {}
  const perches = []
  const tall = [] // furnitur tinggi yang ikut dibikin transparan kalau nutupin karakter
  const deco = [] // hiasan dinding, disembunyikan pas mode dinding rendah

  // pasang objek berdasarkan rect denah & arah hadap
  const put = (rect, face, build, { collide = true, pad = 0, tag, fade = 0 } = {}) => {
    const [x0, z0, x1, z1] = rect
    const alongZ = face[0] === 0
    const w = alongZ ? x1 - x0 : z1 - z0
    const d = alongZ ? z1 - z0 : x1 - x0
    const obj = build(w, d)
    const g = obj.g || obj
    g.position.set((x0 + x1) / 2, 0, -(z0 + z1) / 2)
    g.rotation.y = Math.atan2(face[0], -face[1])
    root.add(g)
    if (collide) physics.addPlan(x0 + pad, z0 + pad, x1 - pad, z1 - pad, tag)
    if (fade) tall.push({ object: g, y1: fade, rect: { minX: x0, maxX: x1, minZ: -z1, maxZ: -z0 } })
    return obj
  }
  const at = (obj, x, z, rotY = 0, y = 0) => {
    obj.position.set(x, y, -z)
    obj.rotation.y = rotY
    root.add(obj)
    return obj
  }
  const rug = (x0, z0, x1, z1, tex) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }))
    m.rotation.x = -Math.PI / 2
    m.position.set((x0 + x1) / 2, 0.014, -(z0 + z1) / 2)
    m.receiveShadow = true
    root.add(m)
  }
  const perch = (id, x, z, y, room) => perches.push({ id, x, z: -z, y, room })
  // tempat duduk karakter: posisi pantat (denah), tinggi dudukan, arah hadap
  const seats = []
  const seat = (label, x, z, y, face) => seats.push({ label, x, z: -z, y, facing: Math.atan2(face[0], -face[1]) })
  seat('Duduk di sofa', 4.85, 6.45, 0.43, [0, -1])
  seat('Duduk di sofa', 5.27, 6.45, 0.43, [0, -1])
  seat('Duduk di sofa', 5.7, 6.45, 0.43, [0, -1])
  seat('Duduk di kursi', 6.55, 5.42, 0.43, [-1, 0])
  seat('Duduk di sofa', 4.12, 7.95, 0.43, [1, 0])
  seat('Duduk di sofa', 4.12, 9.08, 0.43, [1, 0])
  seat('Duduk di kursi makan', 4.675, 13.38, 0.47, [0, -1])
  seat('Duduk di kursi makan', 5.175, 13.38, 0.47, [0, -1])
  seat('Duduk di kursi makan', 4.675, 12.27, 0.47, [0, 1])
  seat('Duduk di kursi makan', 5.175, 12.27, 0.47, [0, 1])
  seat('Duduk di meja kerja', 0.71, 2.72, 0.47, [0, -1])
  // Kasur dengan slot ganda agar bisa duduk & tidur berdua sebelahan
  seat('Duduk di kasur', 1.95, 3.45, 0.5, [1, 0])
  seat('Duduk di kasur', 1.95, 4.2, 0.5, [1, 0])
  seat('Duduk di kasur', 1.95, 10.45, 0.5, [1, 0])
  seat('Duduk di kasur', 1.95, 11.05, 0.5, [1, 0])
  seat('Duduk di kasur', 1.95, 14.95, 0.5, [1, 0])
  seat('Duduk di kasur', 1.95, 15.55, 0.5, [1, 0])
  const beds = [
    { id: 'utama', centerZ: -3.825, width: 1.65 },
    { id: 'tengah', centerZ: -10.75, width: 1.2 },
    { id: 'belakang', centerZ: -15.265, width: 1.23 },
  ]
  seats.slice(-6).forEach((s, i) => {
    const bed = beds[Math.floor(i / 2)]
    const offset = bed.width / 4
    s.bed = bed.id
    s.sleepSlots = [-offset, offset].map((dz) => ({ x: 1.65, y: 0.78, z: bed.centerZ + dz, facing: Math.PI / 2 }))
  })
  interactables.tvs = []
  // TV dinding di kamar tidur (menghadap kasur, dinding as 3)
  const bedroomTv = (z, y, w, standX) => {
    const t = flatTv(w)
    at(t.g, 2.905, z, -Math.PI / 2, y)
    interactables.tvs.push({ x: standX, z: -z, screenMat: t.screenMat, on: false })
    tall.push({ object: t.g, y1: y + t.h / 2, rect: { minX: 2.84, maxX: 2.97, minZ: -z - w / 2, maxZ: -z + w / 2 } })
    return t
  }

  // ===== Kamar tidur utama =====
  put([0.1, 3.0, 2.15, 4.65], [1, 0], (w, d) => bed(w, d, '#7f9fc2'))
  perch('kasurUtama', 1.25, 3.85, 0.5, 'utama')
  put([0.1, 4.75, 0.55, 5.15], [1, 0], (w, d) => {
    const g = new THREE.Group()
    g.add(B(w, 0.5, d, M(WOOD_LIGHT, 0.6), 0, 0.25, 0))
    g.add(C(0.08, 0.1, 0.06, M('#f2e6c9', 0.8), 0, 0.53, 0))
    g.add(C(0.01, 0.01, 0.22, M('#888', 0.5), 0, 0.66, 0))
    g.add(C(0.06, 0.11, 0.14, M('#f7e8c8', 0.9, { emissive: '#ffcf7a', emissiveIntensity: 0.25 }), 0, 0.8, 0))
    return g
  })
  put([0.08, 5.3, 0.68, 6.42], [1, 0], wardrobe, { fade: 2.05 })
  put([0.12, 2.08, 1.3, 2.58], [0, 1], desk, { pad: 0 })
  interactables.laptop = { x: 0.6, z: -3.0, label: 'Lihat laptop' }
  rug(0.6, 4.75, 2.6, 6.3, rugTexture('#8ca6b8', '#eef1ea'))
  bedroomTv(3.83, 1.2, 1.1, 2.5)
  // rak gantung di bawah TV
  at(B(0.14, 0.035, 1.2, M(WOOD, 0.55)), 2.855, 3.83, 0, 0.58)
  at(B(0.08, 0.1, 0.14, M('#2b2b2b', 0.5)), 2.86, 3.45, 0, 0.65)
  at(pottedPlant(0.45), 2.86, 4.25, 0, 0.6)

  // ===== Ruang tamu =====
  put([4.5, 6.2, 6.05, 6.78], [0, -1], (w, d) => sofa(w, d, '#7f8f6a'))
  put([4.65, 5.05, 5.9, 5.75], [0, -1], coffeeTable)
  put([6.2, 5.0, 6.88, 5.85], [-1, 0], (w, d) => sofa(w, d, '#7f8f6a'))
  perch('kursiTamu', 6.5, 5.42, 0.42, 'tamu')
  at(pottedPlant(1.3), 6.6, 6.45)
  physics.addPlan(6.45, 6.3, 6.75, 6.6)
  at(pottedPlant(1.1, '#d9cfc0'), 4.5, 4.78)
  physics.addPlan(4.36, 4.64, 4.64, 4.92)
  // lukisan kucing di dinding kamar utama (sisi ruang tamu)
  const painting = new THREE.Group()
  painting.add(B(0.04, 0.62, 0.82, M('#3b2f2a', 0.6), 0, 0, 0))
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.54), new THREE.MeshStandardMaterial({ map: paintingTexture(), roughness: 0.9 }))
  pic.position.x = 0.025
  pic.rotation.y = Math.PI / 2
  painting.add(pic)
  at(painting, 3.1, 5.6, 0, 1.55)
  deco.push({ object: painting, y1: 1.9, rect: { minX: 3.05, maxX: 3.15, minZ: -6.05, maxZ: -5.15 } })

  // sekat bufet antara ruang tamu & keluarga
  put([3.9, 6.85, 5.25, 7.25], [0, 1], sideboard)
  put([5.4, 6.85, 6.88, 7.25], [0, 1], sideboard)
  at(pottedPlant(0.6), 4.2, 7.05, 0, 0.79)
  at(B(0.22, 0.28, 0.03, M('#3b2f2a', 0.6)), 6.0, 7.1, 0, 0.93)

  // ===== Ruang keluarga =====
  put([3.75, 7.55, 4.45, 9.5], [1, 0], (w, d) => sofa(w, d, '#c7845b', '#f1dfc2'))
  perch('sofaKeluarga', 4.1, 8.5, 0.44, 'keluarga')
  rug(4.5, 7.6, 6.1, 9.55, rugTexture())
  put([5.0, 8.2, 5.65, 8.85], [1, 0], (w, d) => coffeeTable(w, d))
  const tv = put([6.32, 7.6, 6.88, 9.45], [-1, 0], tvUnit)
  interactables.tv = { x: 5.95, z: -8.5, label: 'Nyalakan TV', screenMat: tv.screenMat, on: false }
  const tvBounds = new THREE.Box3().setFromObject(tv.g)
  tall.push({ object: tv.g, y1: tvBounds.max.y, rect: { minX: tvBounds.min.x, maxX: tvBounds.max.x, minZ: tvBounds.min.z, maxZ: tvBounds.max.z } })
  interactables.tvs.unshift(interactables.tv)
  const painting2 = painting.clone()
  at(painting2, 5.6, 9.9, -Math.PI / 2, 1.6)
  deco.push({ object: painting2, y1: 1.95, rect: { minX: 5.19, maxX: 6.01, minZ: -9.95, maxZ: -9.85 } })
  // jam dinding
  const clock = new THREE.Group()
  clock.add(C(0.16, 0.16, 0.03, M('#fbf6ec', 0.5), 0, 0, 0, 24))
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 6, 24), M('#3b2f2a', 0.5))
  rim.rotation.x = Math.PI / 2
  clock.add(rim)
  const handM = M('#3b2f2a', 0.5)
  const hour = B(0.012, 0.004, 0.08, handM, 0, 0.02, 0.03)
  const min = B(0.008, 0.004, 0.12, handM, 0.03, 0.022, 0)
  min.rotation.y = 1.2
  clock.add(hour, min)
  clock.rotation.x = Math.PI / 2
  const clockWrap = new THREE.Group()
  clockWrap.add(clock)
  at(clockWrap, 2.05, 8.6, Math.PI / 2, 1.9)
  deco.push({ object: clockWrap, y1: 2.1, rect: { minX: 2.0, maxX: 2.1, minZ: -8.76, maxZ: -8.44 } })

  // ===== Kamar mandi =====
  // KM dalam: pintu dari kamar utama, shower di pojok atas
  put([0.08, 7.55, 0.85, 8.17], [1, 0], shower(-1))
  at(toilet(), 0.32, 6.95, Math.PI / 2)
  physics.addPlan(0.08, 6.73, 0.6, 7.17)
  at(basin(), 1.35, 8.05, 0)
  physics.addPlan(1.13, 7.88, 1.57, 8.17)
  // KM 2: kebalikannya, pintu di atas
  put([0.08, 8.33, 0.85, 8.95], [1, 0], shower(1))
  at(toilet(), 0.32, 9.55, Math.PI / 2)
  physics.addPlan(0.08, 9.33, 0.6, 9.77)
  at(basin(), 1.35, 8.45, Math.PI)
  physics.addPlan(1.13, 8.33, 1.57, 8.62)

  // ===== Kamar tidur 2 =====
  put([0.1, 10.15, 2.15, 11.35], [1, 0], (w, d) => bed(w, d, '#d98f6c'))
  perch('kasur2', 1.3, 10.75, 0.5, 'kamar2')
  put([0.08, 11.6, 0.68, 12.85], [1, 0], wardrobe, { fade: 2.05 })
  rug(1.0, 11.5, 2.6, 12.7, rugTexture('#d8c49e', '#fff8e8'))
  bedroomTv(10.75, 1.15, 0.9, 2.5)
  at(B(0.14, 0.035, 1.0, M(WOOD_LIGHT, 0.55)), 2.855, 10.75, 0, 0.58)

  // ===== Kamar tidur 3 =====
  put([0.1, 14.65, 2.15, 15.88], [1, 0], (w, d) => bed(w, d, '#8fb38a'))
  perch('kasur3', 1.3, 15.25, 0.5, 'kamar3')
  put([0.08, 13.12, 0.68, 14.35], [1, 0], wardrobe, { fade: 2.05 })
  put([2.45, 14.8, 2.9, 15.7], [-1, 0], (w, d) => {
    const g = new THREE.Group()
    g.add(B(w, 0.04, d, M(WOOD_LIGHT, 0.6), 0, 0.74, 0))
    legs(g, w, d, 0.72, M(WOOD_LIGHT, 0.6), 0.04, 0.02)
    // tumpukan buku di ujung meja
    const cols = ['#c94f4f', '#3f7cac', '#e0b04a']
    cols.forEach((c, i) => g.add(B(0.2, 0.04, 0.24, M(c, 0.8), 0.33, 0.78 + i * 0.04, -0.05)))
    return g
  })
  // kamar 3: jendelanya pas di depan kasur, jadi TV-nya pakai kaki di atas meja
  {
    const t = flatTv(0.68)
    const stand = new THREE.Group()
    stand.add(B(0.22, 0.015, 0.14, M('#1b1b1b', 0.4), 0, 0.008, 0))
    stand.add(B(0.04, 0.09, 0.03, M('#1b1b1b', 0.4), 0, 0.06, -0.01))
    t.g.position.y = 0.1 + t.h / 2
    stand.add(t.g)
    at(stand, 2.72, 15.35, -Math.PI / 2, 0.76)
    interactables.tvs.push({ x: 2.3, z: -14.5, screenMat: t.screenMat, on: false })
  }

  // ===== Ruang kucing =====
  at(catTree(), 6.55, 10.45)
  physics.addPlan(6.25, 10.15, 6.88, 10.75, 'catTree')
  perch('catTree', 6.6, 10.5, 1.27, 'kucing')
  at(catBed(), 5.45, 11.2)
  perch('catBed', 5.45, 11.2, 0.06, 'kucing')
  put([6.35, 11.3, 6.88, 11.88], [-1, 0], (w, d) => {
    const g = new THREE.Group()
    g.add(B(w, 0.16, d, M('#7fb7a7', 0.6), 0, 0.08, 0))
    g.add(B(w - 0.06, 0.02, d - 0.06, M('#d9cdb0', 1), 0, 0.15, 0))
    return g
  })
  const bowls = new THREE.Group()
  const b1 = bowl('#e86a5c')
  b1.position.x = -0.12
  const b2 = bowl('#5c9ee8')
  b2.position.x = 0.12
  bowls.add(b1, b2)
  const water = C(0.065, 0.065, 0.01, new THREE.MeshStandardMaterial({ color: '#8cc8e8', roughness: 0.05 }), 0.12, 0.04, 0)
  bowls.add(water)
  const kibble = new THREE.Group()
  const kib = M('#a0612f', 0.9)
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4
    const r = 0.012 + (i % 5) * 0.011
    kibble.add(S(0.014, kib, Math.cos(a) * r, 0.03 + (i % 3) * 0.006, Math.sin(a) * r))
  }
  kibble.position.x = -0.12
  bowls.add(kibble)
  at(bowls, 5.6, 11.75)
  interactables.bowl = { x: 5.6, z: -11.75, label: 'Isi mangkuk makan', kibble, food: 1 }
  at(S(0.045, M('#d84a5a', 0.9)), 6.1, 11.25, 0, 0.045)

  // ===== Dapur =====
  put([6.25, 12.05, 6.92, 12.72], [-1, 0], fridge, { fade: 1.7 })
  interactables.fridge = { x: 6.0, z: -12.4, label: 'Ambil churu' }
  put([6.3, 12.72, 6.92, 13.85], [-1, 0], counter)
  put([5.0, 13.85, 6.92, 14.42], [0, -1], counter)
  // kompor
  const stove = new THREE.Group()
  stove.add(B(0.62, 0.05, 0.4, M('#2a2a2a', 0.4), 0, 0.025, 0))
  for (const x of [-0.15, 0.15]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), M('#555', 0.3, { metalness: 0.6 }))
    ring.rotation.x = Math.PI / 2
    ring.position.set(x, 0.055, 0)
    stove.add(ring)
  }
  const pan = C(0.12, 0.1, 0.06, M('#3a3a3a', 0.35, { metalness: 0.5 }), 0.15, 0.09, 0)
  stove.add(pan)
  at(stove, 5.65, 14.15, 0, 0.89)
  // wastafel cuci piring di sisi kanan
  const sink = new THREE.Group()
  sink.add(B(0.4, 0.02, 0.5, M('#c9ced2', 0.2, { metalness: 0.8 }), 0, 0.005, 0))
  const tap = C(0.012, 0.012, 0.28, M('#c9ced2', 0.2, { metalness: 0.8 }), 0.18, 0.14, 0, 8)
  sink.add(tap)
  at(sink, 6.6, 13.3, 0, 0.89)
  // rice cooker
  const rc = new THREE.Group()
  rc.add(C(0.13, 0.12, 0.2, M('#f4f1ea', 0.4), 0, 0.1, 0))
  rc.add(S(0.13, M('#f4f1ea', 0.4), 0, 0.2, 0, 1, 0.35, 1))
  rc.add(S(0.03, M('#e57c8c', 0.5), 0, 0.12, 0.12, 1, 1, 0.3))
  at(rc, 6.65, 12.95, 0, 0.89)
  // kabinet atas
  const upper = at(B(1.9, 0.6, 0.34, M('#e2d8c6', 0.6)), 5.95, 14.3, 0, 1.85)
  deco.push({ object: upper, y1: 2.15, rect: { minX: 5.0, maxX: 6.9, minZ: -14.47, maxZ: -14.13 } })
  at(tabungGas(), 4.9, 14.25)
  physics.addPlan(4.78, 14.13, 5.0, 14.4)
  // meja makan
  put([4.4, 12.45, 5.45, 13.2], [0, 1], (w, d) => {
    const g = new THREE.Group()
    const m = M(WOOD, 0.55)
    g.add(B(w, 0.04, d, m, 0, 0.74, 0))
    legs(g, w, d, 0.72, m, 0.05, 0.03)
    for (const sx of [-0.25, 0.25]) {
      const c1 = chair()
      c1.position.set(sx, 0, d / 2 + 0.18)
      c1.rotation.y = Math.PI
      g.add(c1)
      const c2 = chair()
      c2.position.set(sx, 0, -d / 2 - 0.18)
      g.add(c2)
    }
    // tudung saji
    const tud = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#d8a24a', 0.9))
    tud.position.y = 0.76
    tud.scale.y = 0.7
    g.add(shadow(tud))
    return g
  })
  put([4.6, 11.45, 4.95, 11.85], [-1, 0], dispenser)

  // ===== Teras =====
  // teras dibiarin lega, sisi kanannya buat parkir motor (motor.js)
  // keset
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42), M('#8a6b4a', 1))
  mat.rotation.x = -Math.PI / 2
  mat.position.set(3.55, 0.016, -4.22)
  root.add(mat)
  // rak sepatu pindah ke dalam, di samping pintu utama
  put([3.98, 4.6, 4.32, 4.9], [0, 1], (w, d) => {
    const g = new THREE.Group()
    const m = M(WOOD, 0.6)
    for (const y of [0.05, 0.25, 0.45]) g.add(B(w, 0.03, d, m, 0, y, 0))
    for (const s of [-1, 1]) g.add(B(0.03, 0.5, d, m, s * (w / 2), 0.25, 0))
    const colors = ['#e9e9e9', '#3a3a3a', '#d65f4c', '#4a6fa5']
    colors.forEach((c, i) => g.add(R(0.1, 0.07, 0.24, M(c, 0.7), -0.055 + (i % 2) * 0.11, 0.1 + Math.floor(i / 2) * 0.2, 0, 0.03)))
    return g
  })

  // ===== Halaman depan =====
  at(tree(), 1.95, 1.0)
  physics.addPlan(1.8, 0.85, 2.1, 1.15)
  at(bush(0.28), 0.4, 1.55)
  at(bush(0.26, '#4f8a3c', '#ffd35c'), 0.42, 0.55)
  at(bush(0.22), 2.7, 0.35)
  physics.addPlan(0.1, 0.25, 0.7, 1.85)
  const stoneMat = M('#c8c1b5', 0.95)
  for (const z of [0.4, 1.0, 1.6]) at(B(0.62, 0.04, 0.36, stoneMat), 3.65, z, 0, 0.02)

  // ===== Taman belakang: area jemur beratap =====
  // tali jemuran digantung dari rangka kanopi (lihat roof.js), jadi nggak ada tiang
  const jem = new THREE.Group()
  const rodM = M('#2b2d30', 0.45, { metalness: 0.5 })
  const ropeM = M('#eeeeea', 0.5)
  const canopyY = (z) => 2.62 - ((z - 14.9) / 1.15) * 0.42
  const clothesSets = [
    [['#e5735a', 0.34, 0.5], ['#f1e7cf', 0.5, 0.32], ['#5b86b5', 0.38, 0.55], ['#7fb8a4', 0.22, 0.3]],
    [['#f3c34a', 0.3, 0.45], ['#ffffff', 0.55, 0.28], ['#c75b7a', 0.34, 0.5], ['#3a3f47', 0.26, 0.6]],
  ]
  ;[15.2, 15.6].forEach((z, row) => {
    const y = 2.0
    const rope = C(0.006, 0.006, 1.75, ropeM, 0, y, -z, 4)
    rope.rotation.z = Math.PI / 2
    rope.position.x = 5.98
    jem.add(rope)
    for (const x of [5.12, 6.84]) {
      const h = canopyY(z) - y
      jem.add(C(0.008, 0.008, h, rodM, x, y + h / 2, -z, 4))
    }
    let cx = 5.25
    for (const [c, w, h] of clothesSets[row]) {
      const cloth = B(w, h, 0.012, M(c, 1, { side: THREE.DoubleSide }), cx + w / 2, y - h / 2 - 0.02, -z)
      cloth.rotation.y = (Math.random() - 0.5) * 0.25
      jem.add(cloth)
      // jepitan
      jem.add(B(0.015, 0.04, 0.02, M('#e8564a', 0.5), cx + 0.04, y - 0.01, -z))
      jem.add(B(0.015, 0.04, 0.02, M('#e8564a', 0.5), cx + w - 0.04, y - 0.01, -z))
      cx += w + 0.1
    }
  })
  root.add(jem)

  // mesin cuci + keranjang
  put([6.3, 15.32, 6.92, 15.94], [-1, 0], (w, d) => {
    const g = new THREE.Group()
    g.add(R(w, 0.85, d, M('#f2f3f1', 0.35), 0, 0.425, 0, 0.04))
    g.add(B(w - 0.04, 0.1, 0.02, M('#d8dbdd', 0.4), 0, 0.76, d / 2))
    g.add(C(0.02, 0.02, 0.012, M('#4a90d9', 0.3), w * 0.25, 0.76, d / 2 + 0.012, 12).rotateX(Math.PI / 2))
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 10, 28), M('#c9ccd0', 0.25, { metalness: 0.6 }))
    ring.position.set(0, 0.4, d / 2 + 0.01)
    g.add(ring)
    const glass = C(0.155, 0.155, 0.02, new THREE.MeshStandardMaterial({ color: '#7f97a8', roughness: 0.05, metalness: 0.3 }), 0, 0.4, d / 2 + 0.005, 28)
    glass.rotation.x = Math.PI / 2
    g.add(glass)
    return g
  })
  const basket = new THREE.Group()
  basket.add(C(0.2, 0.17, 0.3, M('#c9a46a', 1), 0, 0.15, 0, 16))
  basket.add(S(0.15, M('#8fb3d9', 1), 0.02, 0.3, 0, 1, 0.4, 1))
  at(basket, 5.35, 15.75)
  physics.addPlan(5.15, 15.55, 5.55, 15.95)

  // keran air
  const tap2 = new THREE.Group()
  tap2.add(C(0.02, 0.02, 0.5, M('#9a9a96', 0.4, { metalness: 0.5 }), 0, 0.25, 0, 8))
  tap2.add(B(0.08, 0.03, 0.03, M('#d0b14a', 0.3, { metalness: 0.7 }), 0, 0.5, 0.03))
  const ember = C(0.13, 0.11, 0.22, M('#4f9fd9', 0.6), 0.05, 0.11, 0.18)
  tap2.add(ember)
  at(tap2, 6.88, 14.72, -Math.PI / 2)
  physics.addPlan(6.62, 14.58, 6.95, 14.9)

  return { root, interactables, perches, tall, deco, seats }
}
