import * as THREE from 'three'
import { ROOMS } from './plan'
import { labelTexture } from './textures'

export const CATS = [
  {
    id: 'cipu',
    name: 'Cipu',
    gender: 'betina',
    desc: 'Belang telon, dominan hitam. Cuek, hobinya tidur di kasur orang.',
    eye: '#c4cf45',
    nose: '#2b2323',
    scale: 1.0,
    wide: 1.0,
    speed: 0.5,
    voice: 1.0,
    hungerRate: 1 / 28,
    likes: ['kasurUtama', 'catTree', 'kasur3'],
    weights: { wander: 2, nap: 5, sit: 2, groom: 2 },
    moody: true,
    start: [1.6, 5.6],
  },
  {
    id: 'gimbul',
    name: 'Gimbul',
    gender: 'betina',
    desc: 'Oren putih, badannya bulet. Paling cepet dateng kalau dengar mangkuk.',
    eye: '#e09f2c',
    nose: '#e8939a',
    scale: 1.05,
    wide: 1.32,
    speed: 0.42,
    voice: 0.9,
    hungerRate: 1 / 14,
    likes: ['sofaKeluarga', 'catBed', 'kursiTamu'],
    weights: { wander: 2, nap: 3, sit: 2, groom: 1, beg: 3 },
    heavy: true,
    start: [5.4, 8.9],
  },
  {
    id: 'cipi',
    name: 'Cipi',
    gender: 'betina',
    desc: 'Calico oren-hitam-putih. Paling lincah, suka lari-lari nggak jelas.',
    eye: '#86bf55',
    nose: '#c97575',
    scale: 0.9,
    wide: 0.95,
    speed: 0.68,
    voice: 1.2,
    hungerRate: 1 / 24,
    likes: ['catTree', 'kursiTamu', 'kasur2', 'jokMotor'],
    weights: { wander: 5, zoom: 3, nap: 1, sit: 1, groom: 1 },
    start: [5.9, 11.0],
  },
  {
    id: 'mujaer',
    name: 'Mujaer',
    gender: 'jantan',
    desc: 'Abu-abu belang kayak ikan mujaer. Suka ngintil dan nongkrong di kap mobil.',
    eye: '#dcbf3c',
    nose: '#a8645a',
    scale: 1.13,
    wide: 1.08,
    speed: 0.55,
    voice: 0.72,
    hungerRate: 1 / 22,
    likes: ['carHood', 'sofaKeluarga', 'kasur2'],
    weights: { wander: 3, follow: 3, garden: 2, nap: 2, sit: 1 },
    start: [3.9, 3.3],
  },
]

// ---------- noise buat corak bulu ----------
const hash = (x, y, z, s) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) + Math.imul(s, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
const smooth = (t) => t * t * (3 - 2 * t)
const noise3 = (x, y, z, s) => {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = smooth(x - xi)
  const yf = smooth(y - yi)
  const zf = smooth(z - zi)
  const l = (a, b, t) => a + (b - a) * t
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz, s)
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  )
}
const fbm = (p, f, s) => noise3(p.x * f, p.y * f, p.z * f, s) * 0.62 + noise3(p.x * f * 2.1, p.y * f * 2.1, p.z * f * 2.1, s + 7) * 0.38

const col = (hex) => new THREE.Color(hex)
const C = {
  black: col('#1d1b1a'),
  orange: col('#d8853b'),
  white: col('#f3eee5'),
  ginger: col('#e99a4f'),
  gingerD: col('#c97330'),
  grey: col('#8f969b'),
  greyD: col('#4e555b'),
  greyL: col('#c9cdcf'),
}

// p = posisi verteks di ruang kucing (belum di-scale), info.local = posisi lokal mesh
const PATTERNS = {
  cipu(p, part, info) {
    const n = fbm(p, 9, 11)
    if (part === 'paw' || part === 'chin') return C.white
    if (part === 'muzzle') return info.local.y < 0.002 ? C.white : C.black
    if (part === 'leg' && p.y < 0.07 && p.z > 0) return C.white
    if (part === 'body' && p.y < 0.13 + (fbm(p, 5, 3) - 0.5) * 0.04 && p.z > -0.06) return C.white
    if (part === 'chest' && p.y < 0.17) return C.white
    return n > 0.63 ? C.orange : C.black
  },
  gimbul(p, part, info) {
    const n = fbm(p, 7, 21)
    if (part === 'paw' || part === 'chin' || part === 'muzzle') return C.white
    if (part === 'leg' && p.y < 0.1) return C.white
    if ((part === 'body' || part === 'haunch') && p.y < 0.165 + (n - 0.5) * 0.06) return C.white
    if (part === 'chest' && p.y < 0.24) return C.white
    if (part === 'head') {
      if (Math.abs(p.x) < 0.014 + Math.max(0, 0.36 - p.y) * 0.4 && p.z > 0.24) return C.white
      if (p.y > 0.37 && Math.sin(p.x * 95) > 0.55) return C.gingerD
      return C.ginger
    }
    if (part === 'tail') return Math.sin(info.d * 60) > 0.35 ? C.gingerD : C.ginger
    if (part === 'leg') return Math.sin(p.y * 80) > 0.6 ? C.gingerD : C.ginger
    return Math.sin(p.z * 55 + n * 4) > 0.5 ? C.gingerD : C.ginger
  },
  cipi(p, part, info) {
    const n = fbm(p, 6, 37)
    if (part === 'paw' || part === 'chin' || part === 'muzzle') return C.white
    if (part === 'leg' && p.y < 0.09) return C.white
    if ((part === 'body' || part === 'chest') && p.y < 0.15 + (n - 0.5) * 0.04) return C.white
    if (part === 'head') {
      if (Math.abs(p.x) < 0.012 && p.y < 0.36) return C.white
      return p.x > 0 ? C.orange : C.black
    }
    if (part === 'ear') return info.side > 0 ? C.orange : C.black
    if (n > 0.56) return C.orange
    if (n < 0.4) return C.black
    return C.white
  },
  mujaer(p, part, info) {
    const n = fbm(p, 8, 53)
    if (part === 'paw' || part === 'chin' || part === 'muzzle') return C.greyL
    if (part === 'ear') return C.greyD
    if (part === 'head') {
      if (p.y > 0.36 && Math.sin(p.x * 85 + 1.5) > 0.45) return C.greyD
      if (Math.abs(p.x) > 0.06 && Math.sin(p.y * 90) > 0.6) return C.greyD
      return C.grey
    }
    if (part === 'tail') return Math.sin(info.d * 55) > 0 || info.d > 0.28 ? C.greyD : C.grey
    if (part === 'leg') return Math.sin(p.y * 75) > 0.35 ? C.greyD : C.grey
    if ((part === 'body' || part === 'chest') && p.y < 0.135) return C.greyL
    // garis-garis vertikal kayak ikan mujaer
    return Math.sin(p.z * 62 + (n - 0.5) * 2) > 0.3 ? C.greyD : C.grey
  },
}

// ---------- bikin model kucing ----------
function buildCat(def) {
  const root = new THREE.Group()
  const fur = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 })
  const furMeshes = []
  const add = (geo, parent, part, x, y, z, sx = 1, sy = 1, sz = 1, extra = {}) => {
    const m = new THREE.Mesh(geo, fur)
    m.position.set(x, y, z)
    m.scale.set(sx, sy, sz)
    m.castShadow = true
    m.userData.part = part
    Object.assign(m.userData, extra)
    parent.add(m)
    furMeshes.push(m)
    return m
  }
  const sph = (r, ws = 24, hs = 18) => new THREE.SphereGeometry(r, ws, hs)
  const w = def.wide

  const body = new THREE.Group()
  body.position.set(0, 0.19, 0)
  root.add(body)
  add(sph(0.1, 32, 24), body, 'body', 0, 0, 0, w, 0.92, 1.95)
  add(sph(0.085), body, 'chest', 0, 0.015, 0.125, w * 0.98, 1, 1)
  add(sph(0.09), body, 'haunch', 0, 0.0, -0.12, w * 1.02, 1, 1)

  const legs = []
  const legGeo = new THREE.CylinderGeometry(0.021, 0.019, 0.15, 10)
  legGeo.translate(0, -0.075, 0)
  const legPos = [
    [-0.048, 0.13, 'F'],
    [0.048, 0.13, 'F'],
    [-0.055, -0.13, 'B'],
    [0.055, -0.13, 'B'],
  ]
  for (const [x, z, kind] of legPos) {
    const pivot = new THREE.Group()
    pivot.position.set(x * w, -0.01, z)
    add(legGeo.clone(), pivot, 'leg', 0, 0, 0)
    if (kind === 'B') add(sph(0.042, 12, 10), pivot, 'leg', 0, -0.02, -0.005, 1, 1.3, 1.2)
    add(sph(0.027, 12, 10), pivot, 'paw', 0, -0.153, 0.008, 1, 0.6, 1.3)
    body.add(pivot)
    legs.push({ pivot, kind, side: Math.sign(x) })
  }

  // kepala
  const neck = new THREE.Group()
  neck.position.set(0, 0.075, 0.165)
  body.add(neck)
  const head = new THREE.Group()
  neck.add(head)
  add(sph(0.085, 28, 22), head, 'head', 0, 0.03, 0.03, 1.12, 0.95, 0.98)
  for (const s of [-1, 1]) add(sph(0.042), head, 'head', s * 0.045, 0.0, 0.07, 1, 0.85, 1)
  add(sph(0.032), head, 'muzzle', 0, -0.006, 0.105, 1.25, 0.82, 0.85)
  add(sph(0.022), head, 'chin', 0, -0.03, 0.092, 1.1, 0.7, 1)
  const nose = new THREE.Mesh(sph(0.0105, 10, 8), new THREE.MeshStandardMaterial({ color: def.nose, roughness: 0.5 }))
  nose.position.set(0, 0.017, 0.13)
  nose.scale.set(1.3, 0.75, 0.8)
  head.add(nose)

  const eyes = []
  const irisMat = new THREE.MeshStandardMaterial({ color: def.eye, roughness: 0.15 })
  const slitMat = new THREE.MeshStandardMaterial({ color: '#0d0b0a', roughness: 0.2 })
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  for (const s of [-1, 1]) {
    const eye = new THREE.Group()
    eye.position.set(s * 0.039, 0.042, 0.1)
    eye.rotation.y = s * 0.32
    const iris = new THREE.Mesh(sph(0.02, 16, 12), irisMat)
    iris.scale.set(1, 1.08, 0.55)
    eye.add(iris)
    const slit = new THREE.Mesh(sph(0.009, 10, 8), slitMat)
    slit.scale.set(0.55, 1.7, 0.5)
    slit.position.z = 0.009
    eye.add(slit)
    const sh = new THREE.Mesh(sph(0.0045, 6, 4), shine)
    sh.position.set(-0.006, 0.008, 0.012)
    eye.add(sh)
    head.add(eye)
    eyes.push(eye)
  }

  const ears = []
  const innerMat = new THREE.MeshStandardMaterial({ color: '#e9a9a6', roughness: 0.8 })
  for (const s of [-1, 1]) {
    const ear = new THREE.Group()
    ear.position.set(s * 0.052, 0.098, 0.02)
    ear.rotation.set(-0.15, 0, -s * 0.3)
    add(new THREE.ConeGeometry(0.036, 0.075, 12), ear, 'ear', 0, 0.03, 0, 1, 1, 0.55, { side: s })
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 10), innerMat)
    inner.position.set(0, 0.024, 0.01)
    inner.scale.z = 0.4
    ear.add(inner)
    head.add(ear)
    ears.push(ear)
  }

  // kumis
  const whiskerPts = []
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      whiskerPts.push(new THREE.Vector3(s * 0.03, -0.005 - i * 0.006, 0.118))
      whiskerPts.push(new THREE.Vector3(s * 0.12, 0.01 - i * 0.022, 0.1))
    }
  }
  const whiskers = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(whiskerPts),
    new THREE.LineBasicMaterial({ color: '#f4f1ea', transparent: true, opacity: 0.8 }),
  )
  head.add(whiskers)

  // ekor: rantai segmen
  const tail = []
  let parent = new THREE.Group()
  parent.position.set(0, 0.04, -0.19)
  body.add(parent)
  const tailBase = parent
  const segLen = 0.042
  for (let i = 0; i < 8; i++) {
    const r = 0.021 - i * 0.0011
    const geo = new THREE.CapsuleGeometry(r, segLen, 4, 10)
    geo.translate(0, segLen / 2, 0)
    add(geo, parent, 'tail', 0, 0, 0, 1, 1, 1, { seg: i })
    tail.push(parent)
    const next = new THREE.Group()
    next.position.y = segLen
    parent.add(next)
    parent = next
  }

  // ---- warnai verteks pakai corak ----
  const pattern = PATTERNS[def.id]
  const legsBase = legs.map((l) => l.pivot.rotation.x)
  tailBase.rotation.x = -1.2
  tail.forEach((t, i) => i && (t.rotation.x = 0.06))
  root.updateMatrixWorld(true)
  const tailOrigin = new THREE.Vector3()
  tailBase.getWorldPosition(tailOrigin)
  const v = new THREE.Vector3()
  const local = new THREE.Vector3()
  for (const m of furMeshes) {
    const pos = m.geometry.attributes.position
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      local.fromBufferAttribute(pos, i)
      v.copy(local).applyMatrix4(m.matrixWorld)
      const info = { local, d: v.distanceTo(tailOrigin), side: m.userData.side || 0 }
      const c = pattern(v, m.userData.part, info)
      // sedikit variasi biar nggak flat
      const j = (noise3(v.x * 60, v.y * 60, v.z * 60, 3) - 0.5) * 0.06
      colors[i * 3] = Math.min(1, c.r + j)
      colors[i * 3 + 1] = Math.min(1, c.g + j)
      colors[i * 3 + 2] = Math.min(1, c.b + j)
    }
    m.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }
  legs.forEach((l, i) => (l.pivot.rotation.x = legsBase[i]))

  // bayangan bulat
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 20),
    new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.16, depthWrite: false }),
  )
  blob.rotation.x = -Math.PI / 2
  blob.scale.set(w * 0.9, 1.5, 1)
  blob.position.y = 0.015

  root.scale.setScalar(def.scale)
  return { root, body, neck, head, legs, tail, tailBase, eyes, ears, blob }
}

// ---------- pose ----------
const POSES = {
  stand: { y: 0, pitch: 0, foldF: 0, foldB: 0, legS: 1, head: 0, yaw: 0, lift: 0.75, curl: 0, eyes: 1 },
  sit: { y: -0.042, pitch: -0.55, foldF: 0, foldB: 1, legS: 1.22, head: 0.42, yaw: 0, lift: 0.05, curl: 0.8, eyes: 1 },
  loaf: { y: -0.095, pitch: 0, foldF: 1, foldB: 1, legS: 0.55, head: 0.05, yaw: 0, lift: 0.0, curl: 1, eyes: 0.8 },
  sleep: { y: -0.1, pitch: 0.02, foldF: 1, foldB: 1, legS: 0.5, head: 0.38, yaw: 0.6, lift: 0.0, curl: 1.3, eyes: 0.05 },
  eat: { y: -0.01, pitch: 0.08, foldF: 0, foldB: 0.25, legS: 1, head: 0.85, yaw: 0, lift: 0.35, curl: 0, eyes: 0.7 },
  held: { y: 0, pitch: -0.3, foldF: -0.25, foldB: 0.3, legS: 1, head: 0.2, yaw: 0, lift: 0.0, curl: 0, eyes: 0.6 },
  jump: { y: 0, pitch: -0.2, foldF: -0.6, foldB: 0.7, legS: 1, head: 0.1, yaw: 0, lift: 0.6, curl: 0, eyes: 1 },
}

const roomRects = ROOMS.filter((r) => !['carport', 'depan'].includes(r.id)).flatMap((r) =>
  r.rects.map(([x0, z0, x1, z1]) => ({ minX: x0 + 0.2, maxX: x1 - 0.2, minZ: -z1 + 0.2, maxZ: -z0 - 0.2, room: r.id })),
)

const pickWeighted = (weights) => {
  const entries = Object.entries(weights)
  let total = entries.reduce((s, [, v]) => s + v, 0)
  let r = Math.random() * total
  for (const [k, v] of entries) {
    r -= v
    if (r <= 0) return k
  }
  return entries[0][0]
}

export class Cat {
  constructor(def, game, saved = {}) {
    this.def = def
    this.game = game
    const parts = buildCat(def)
    Object.assign(this, parts)
    this.blob.scale.multiplyScalar(def.scale)
    game.scene.add(this.root)
    game.scene.add(this.blob)

    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(def.name), transparent: true, depthTest: false }))
    this.label.scale.set(0.9, 0.17, 1)
    this.label.renderOrder = 10
    this.label.material.opacity = 0
    game.scene.add(this.label)

    const [sx, sz] = saved.pos || def.start
    this.root.position.set(sx, 0, -sz)
    this.yaw = Math.random() * Math.PI * 2
    this.hunger = saved.hunger ?? 25 + Math.random() * 20
    this.affection = saved.affection ?? 45
    this.state = 'sit'
    this.timer = 1 + Math.random() * 3
    this.path = null
    this.pathI = 0
    this.onArrive = null
    this.run = false
    this.perch = null
    this.jump = null
    this.pose = { ...POSES.sit }
    this.poseName = 'sit'
    this.phase = Math.random() * 10
    this.tailT = Math.random() * 10
    this.followUntil = 0
    this.zoomLeft = 0
    this.fxT = 0
    this.lookAt = null
    this.earsBack = 0
    this.moodLeft = 0
  }

  get pos() {
    return this.root.position
  }

  get busy() {
    return ['held', 'pet', 'eat', 'jump'].includes(this.state)
  }

  // ---------- navigasi ----------
  goTo(x, z, onArrive, run = false) {
    if (this.perch) {
      const p = this.perch
      this.jumpTo(p.approach.x, 0, p.approach.z, () => {
        this.perch = null
        this.goTo(x, z, onArrive, run)
      })
      return
    }
    const path = this.game.navCat.findPath({ x: this.pos.x, z: this.pos.z }, { x, z })
    if (!path || path.length < 2) {
      onArrive?.()
      return
    }
    this.path = path
    this.pathI = 1
    this.onArrive = onArrive
    this.run = run
    this.state = 'walk'
  }

  jumpTo(x, y, z, done) {
    this.jump = { from: this.pos.clone(), to: new THREE.Vector3(x, y, z), t: 0, dur: 0.55, done }
    this.yaw = Math.atan2(x - this.pos.x, z - this.pos.z)
    this.state = 'jump'
  }

  goPerch(perch, then) {
    if (!perch.approach) perch.approach = this.game.navCat.nearestFree(perch.x, perch.z)
    if (!perch.approach) return then?.(false)
    this.goTo(perch.approach.x, perch.approach.z, () => {
      this.jumpTo(perch.x + (Math.random() - 0.5) * 0.15, perch.y, perch.z + (Math.random() - 0.5) * 0.15, () => {
        this.perch = perch
        then?.(true)
      })
    })
  }

  // ---------- keputusan ----------
  decide() {
    const g = this.game
    const bowl = g.interactables.bowl
    if (this.hunger > 55 && bowl.food > 0.05) return this.goEat()
    if (g.interactables.tv.on && Math.random() < 0.3) return this.goWatchTV()

    const action = pickWeighted(this.def.weights)
    switch (action) {
      case 'wander': {
        const rect = roomRects[Math.floor(Math.random() * roomRects.length)]
        const p = g.navCat.randomFree(Math.random, rect)
        if (!p) return this.sit(3)
        return this.goTo(p.x, p.z, () => (Math.random() < 0.5 ? this.sit(4 + Math.random() * 6) : this.loaf(8 + Math.random() * 10)))
      }
      case 'nap': {
        const id = this.def.likes[Math.floor(Math.random() * this.def.likes.length)]
        const perch = g.perches.find((p) => p.id === id)
        if (!perch || g.cats.some((c) => c !== this && c.perch === perch)) return this.loaf(6)
        return this.goPerch(perch, (ok) => (ok ? this.sleep(25 + Math.random() * 30) : this.loaf(6)))
      }
      case 'groom':
        this.sit(6)
        this.grooming = true
        return
      case 'beg': {
        const f = g.interactables.fridge
        return this.goTo(f.x - 0.4, f.z, () => {
          this.sit(8)
          this.yaw = Math.PI / 2
          if (Math.random() < 0.6) this.meow()
        })
      }
      case 'zoom':
        this.zoomLeft = 3
        return this.zoom()
      case 'follow':
        return this.follow(15)
      case 'garden': {
        const p = g.navCat.randomFree(Math.random, { minX: 3.3, maxX: 6.7, minZ: -15.2, maxZ: -14.75 })
        if (!p) return this.sit(4)
        return this.goTo(p.x, p.z, () => this.loaf(12 + Math.random() * 10))
      }
      default:
        return this.sit(4 + Math.random() * 6)
    }
  }

  sit(t = 5) {
    this.state = 'sit'
    this.grooming = false
    this.timer = t
  }

  loaf(t = 10) {
    this.state = 'loaf'
    this.grooming = false
    this.timer = t
  }

  sleep(t = 30) {
    this.state = 'sleep'
    this.grooming = false
    this.timer = t
  }

  zoom() {
    if (this.zoomLeft-- <= 0) return this.sit(5)
    const rect = roomRects[Math.floor(Math.random() * roomRects.length)]
    const p = this.game.navCat.randomFree(Math.random, rect)
    if (!p) return this.sit(3)
    this.goTo(p.x, p.z, () => this.zoom(), true)
  }

  follow(seconds) {
    this.followUntil = this.game.time + seconds
    this.state = 'follow'
    this.timer = 0
  }

  goEat() {
    const bowl = this.game.interactables.bowl
    const others = this.game.cats.filter((c) => c !== this && c.state === 'eat').length
    const tx = bowl.x + (others - 0.5) * 0.3
    const tz = bowl.z + 0.32
    this.goTo(tx, tz, () => {
      this.yaw = Math.atan2(bowl.x - this.pos.x, bowl.z - this.pos.z)
      this.state = 'eat'
      this.timer = 6
    })
  }

  goWatchTV() {
    const p = this.game.navCat.randomFree(Math.random, { minX: 4.7, maxX: 5.9, minZ: -9.4, maxZ: -7.7 })
    if (!p) return this.sit(3)
    this.goTo(p.x, p.z, () => {
      this.yaw = Math.PI / 2
      this.state = 'watch'
      this.timer = 15 + Math.random() * 15
    })
  }

  // ---------- interaksi dari pemain ----------
  pet() {
    const g = this.game
    if (this.def.moody && this.affection < 35 && Math.random() < 0.45 && this.state !== 'sleep') {
      this.walkAway()
      return `${this.def.name} lagi nggak mood dielus.`
    }
    const wasSleeping = this.state === 'sleep'
    this.state = 'pet'
    this.timer = 2.6
    this.affection = Math.min(100, this.affection + 6)
    this.yaw = Math.atan2(g.player.pos.x - this.pos.x, g.player.pos.z - this.pos.z)
    g.sound.purr(2.4)
    if (!wasSleeping && Math.random() < 0.5) this.meow()
    for (let i = 0; i < 3; i++) setTimeout(() => g.fx.spawn('heart', this.headWorld()), i * 350)
    return null
  }

  pickUp() {
    if (this.def.moody && this.affection < 50 && Math.random() < 0.5) {
      this.walkAway()
      return `${this.def.name} kabur, nggak mau digendong.`
    }
    this.perch = null
    this.state = 'held'
    this.heldT = 0
    this.path = null
    this.meow()
    return this.def.heavy ? `${this.def.name} berat juga ya...` : null
  }

  putDown() {
    const g = this.game
    const p = g.player
    const fx = p.pos.x + Math.sin(p.facing) * 0.45
    const fz = p.pos.z + Math.cos(p.facing) * 0.45
    const spot = g.navCat.nearestFree(fx, fz) || { x: p.pos.x, z: p.pos.z }
    this.root.position.set(spot.x, 0, spot.z)
    this.perch = null
    this.sit(4)
  }

  giveChuru() {
    const g = this.game
    this.state = 'eat'
    this.timer = 3.2
    this.churu = true
    this.yaw = Math.atan2(g.player.pos.x - this.pos.x, g.player.pos.z - this.pos.z)
    this.hunger = Math.max(0, this.hunger - 20)
    this.affection = Math.min(100, this.affection + 15)
    for (let i = 0; i < 4; i++) setTimeout(() => g.fx.spawn('heart', this.headWorld()), 300 + i * 400)
  }

  call() {
    if (this.state === 'held') return true
    const lazy = this.def.moody ? 0.65 : 0.25
    if ((this.state === 'sleep' && Math.random() < lazy) || (this.def.moody && Math.random() < 0.3)) return false
    setTimeout(() => this.meow(), 200 + Math.random() * 600)
    this.follow(12)
    return true
  }

  scare(from) {
    if (this.state === 'held') return
    const d = Math.hypot(this.pos.x - from.x, this.pos.z - from.z)
    if (d > 5.5) return
    this.earsBack = 3
    if (this.state === 'sleep' && this.perch && Math.random() < 0.5) {
      this.sit(4)
      return
    }
    // lari ke arah menjauh
    const dx = (this.pos.x - from.x) / (d || 1)
    const dz = (this.pos.z - from.z) / (d || 1)
    const target = this.game.navCat.nearestFree(this.pos.x + dx * 3, this.pos.z + dz * 3 - 2) || this.game.navCat.randomFree()
    if (target) this.goTo(target.x, target.z, () => this.sit(5), true)
  }

  walkAway() {
    const p = this.game.player.pos
    const dx = this.pos.x - p.x
    const dz = this.pos.z - p.z
    const d = Math.hypot(dx, dz) || 1
    const t = this.game.navCat.nearestFree(this.pos.x + (dx / d) * 1.5, this.pos.z + (dz / d) * 1.5)
    if (t) this.goTo(t.x, t.z, () => this.sit(5))
    else this.sit(3)
  }

  meow() {
    this.game.sound.meow(this.def.voice)
    this.mouthOpen = 0.35
  }

  headWorld() {
    const v = new THREE.Vector3()
    this.head.getWorldPosition(v)
    v.y += 0.12
    return v
  }

  // ---------- update tiap frame ----------
  update(dt) {
    const g = this.game
    this.hunger = Math.min(100, this.hunger + dt * this.def.hungerRate)
    this.affection = Math.max(0, this.affection - dt / 90)
    this.earsBack = Math.max(0, this.earsBack - dt)
    this.mouthOpen = Math.max(0, (this.mouthOpen || 0) - dt)
    let poseName = 'stand'
    let moving = 0

    switch (this.state) {
      case 'walk': {
        const target = this.path[this.pathI]
        const dx = target.x - this.pos.x
        const dz = target.z - this.pos.z
        const d = Math.hypot(dx, dz)
        const sp = (this.run ? 1.9 : 1) * this.def.speed
        if (d < 0.06) {
          this.pathI++
          if (this.pathI >= this.path.length) {
            this.path = null
            this.state = 'sit'
            this.timer = 3
            const cb = this.onArrive
            this.onArrive = null
            cb?.()
          }
        } else {
          const step = Math.min(d, sp * dt)
          this.pos.x += (dx / d) * step
          this.pos.z += (dz / d) * step
          this.yaw = turn(this.yaw, Math.atan2(dx, dz), dt * 9)
          moving = this.run ? 1.6 : 1
        }
        break
      }
      case 'jump': {
        const j = this.jump
        j.t += dt
        const p = Math.min(1, j.t / j.dur)
        this.pos.lerpVectors(j.from, j.to, p)
        this.pos.y += Math.sin(p * Math.PI) * 0.35
        poseName = 'jump'
        if (p >= 1) {
          this.jump = null
          this.state = 'sit'
          this.timer = 2
          j.done?.()
        }
        break
      }
      case 'follow': {
        const p = g.player.pos
        const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z)
        if (g.time > this.followUntil) {
          this.sit(4)
          break
        }
        this.timer -= dt
        if (d > 1.1 && this.timer <= 0) {
          this.timer = 0.8
          const back = this.perch
          if (back) {
            this.goTo(p.x, p.z, () => this.follow(this.followUntil - g.time))
            break
          }
          const path = g.navCat.findPath({ x: this.pos.x, z: this.pos.z }, { x: p.x, z: p.z })
          if (path && path.length > 1) {
            this.path = path
            this.pathI = 1
          }
        }
        if (this.path && d > 0.8) {
          const target = this.path[Math.min(this.pathI, this.path.length - 1)]
          const dx = target.x - this.pos.x
          const dz = target.z - this.pos.z
          const dd = Math.hypot(dx, dz)
          if (dd < 0.08) this.pathI++
          else {
            const sp = (d > 2.5 ? 1.8 : 1.1) * this.def.speed
            this.pos.x += (dx / dd) * Math.min(dd, sp * dt)
            this.pos.z += (dz / dd) * Math.min(dd, sp * dt)
            this.yaw = turn(this.yaw, Math.atan2(dx, dz), dt * 9)
            moving = d > 2.5 ? 1.6 : 1
          }
          if (this.pathI >= this.path.length) this.path = null
        } else {
          this.yaw = turn(this.yaw, Math.atan2(p.x - this.pos.x, p.z - this.pos.z), dt * 5)
          poseName = 'sit'
        }
        break
      }
      case 'held': {
        poseName = 'held'
        this.heldT += dt
        const a = g.player.carryAnchor(new THREE.Vector3())
        this.pos.copy(a)
        this.pos.y -= 0.19 * this.def.scale
        this.yaw = g.player.facing + Math.PI / 2
        if (this.def.moody && this.heldT > 5) {
          g.dropCat(this)
          g.toast(`${this.def.name} loncat turun. Cukup, katanya.`)
        }
        break
      }
      case 'pet':
        poseName = this.perch ? 'loaf' : 'sit'
        this.timer -= dt
        if (this.timer <= 0) this.perch ? this.loaf(8) : this.sit(4)
        break
      case 'eat':
        poseName = 'eat'
        this.timer -= dt
        if (this.timer <= 0) {
          if (!this.churu) {
            const bowl = g.interactables.bowl
            bowl.food = Math.max(0, bowl.food - 0.34)
            this.hunger = Math.max(0, this.hunger - 45)
          }
          this.churu = false
          this.sit(3)
          this.grooming = true
        }
        break
      case 'sleep':
        poseName = 'sleep'
        this.timer -= dt
        this.fxT -= dt
        if (this.fxT <= 0) {
          this.fxT = 1.6
          g.fx.spawn('z', this.headWorld())
        }
        if (this.timer <= 0) this.loaf(4)
        break
      case 'loaf':
        poseName = 'loaf'
        this.timer -= dt
        if (this.timer <= 0) this.decide()
        break
      case 'watch':
        poseName = 'sit'
        this.timer -= dt
        if (this.timer <= 0 || !g.interactables.tv.on) this.sit(2)
        break
      default:
        poseName = 'sit'
        this.timer -= dt
        if (this.timer <= 0) this.decide()
    }

    // nggak nempel ke pemain & kucing lain
    if (!this.perch && !['held', 'jump'].includes(this.state)) {
      const others = [g.player.pos, ...g.cats.filter((c) => c !== this && !c.perch && c.state !== 'held').map((c) => c.pos)]
      for (const o of others) {
        const dx = this.pos.x - o.x
        const dz = this.pos.z - o.z
        const d = Math.hypot(dx, dz)
        const min = o === g.player.pos ? 0.38 : 0.26
        if (d < min && d > 0.0001) {
          const push = (min - d) * 0.5
          const nx = this.pos.x + (dx / d) * push
          const nz = this.pos.z + (dz / d) * push
          if (g.navCat.isFree(nx, nz)) {
            this.pos.x = nx
            this.pos.z = nz
          }
        }
      }
    }

    this.animate(dt, poseName, moving)
  }

  animate(dt, poseName, moving) {
    const target = POSES[poseName]
    const k = 1 - Math.exp(-dt * 7)
    for (const key in target) this.pose[key] += (target[key] - this.pose[key]) * k
    const P = this.pose
    this.root.rotation.y = this.yaw
    this.body.position.y = 0.19 + P.y
    this.body.rotation.x = P.pitch

    this.phase += dt * (moving ? 10 * moving : 0)
    const swing = moving ? Math.sin(this.phase) * 0.55 : 0
    for (const l of this.legs) {
      const fold = l.kind === 'F' ? P.foldF * 1.45 : -P.foldB * 1.5
      const ph = (l.kind === 'F' ? 0 : Math.PI) + (l.side > 0 ? Math.PI : 0)
      const sw = moving ? Math.sin(this.phase + ph) * 0.55 : swing * 0
      l.pivot.rotation.x = -P.pitch + fold + sw
      l.pivot.scale.y = l.kind === 'F' ? P.legS : 1 - P.foldB * 0.3
    }
    if (moving) this.body.position.y += Math.abs(Math.sin(this.phase)) * 0.01

    // kepala
    let hp = P.head
    let hy = P.yaw
    if (this.grooming && this.state === 'sit') {
      hp = 0.5 + Math.sin(performance.now() / 160) * 0.12
      hy = 0.4
    }
    if (this.state === 'eat') hp += Math.sin(performance.now() / 120) * 0.06
    if (this.state === 'watch' || (this.state === 'sit' && !this.grooming)) {
      const pl = this.game.player.pos
      const d = Math.hypot(pl.x - this.pos.x, pl.z - this.pos.z)
      if (d < 2.5) {
        const ang = Math.atan2(pl.x - this.pos.x, pl.z - this.pos.z) - this.yaw
        hy = Math.max(-0.9, Math.min(0.9, Math.atan2(Math.sin(ang), Math.cos(ang))))
      }
    }
    this.neck.rotation.x += (hp - this.neck.rotation.x) * k
    this.neck.rotation.y += (hy - this.neck.rotation.y) * k

    // telinga & mata
    for (const [i, e] of this.ears.entries()) {
      const s = i ? 1 : -1
      const back = this.earsBack > 0 ? 0.9 : 0
      e.rotation.z = -s * (0.3 + back * 0.6)
      e.rotation.x = -0.15 - back * 0.4
    }
    this.blinkT = (this.blinkT ?? 3) - dt
    let eyeOpen = P.eyes
    if (this.state === 'pet') eyeOpen = 0.1
    if (this.blinkT < 0.1) eyeOpen = Math.min(eyeOpen, 0.1)
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 5
    for (const e of this.eyes) e.scale.y = Math.max(0.06, eyeOpen)

    // ekor
    this.tailT += dt * (this.state === 'pet' ? 2 : moving ? 4 : 1.4)
    const lift = P.lift
    this.tailBase.rotation.x = -2.3 + lift * 1.95
    this.tailBase.rotation.y = 0
    this.tail.forEach((seg, i) => {
      if (!i) return
      const curl = P.curl
      const wag = Math.sin(this.tailT * 2 - i * 0.6) * (0.06 + i * 0.012) * (this.state === 'scared' ? 2 : 1)
      seg.rotation.x = lift > 0.5 ? (i > 5 ? 0.25 : -0.02) : 0.1 + curl * 0.04
      seg.rotation.z = curl * 0.32 + wag
    })

    // label & bayangan
    this.blob.position.set(this.pos.x, (this.perch ? this.perch.y : 0) + 0.012, this.pos.z)
    this.blob.rotation.z = -this.yaw
    this.blob.visible = this.state !== 'held' && this.state !== 'jump'
    const pl = this.game.player.pos
    const near = Math.hypot(pl.x - this.pos.x, pl.z - this.pos.z) < 2.6 && this.state !== 'held'
    this.label.material.opacity += ((near ? 1 : 0) - this.label.material.opacity) * k
    this.label.position.set(this.pos.x, this.pos.y + 0.62 * this.def.scale, this.pos.z)
    this.label.visible = this.label.material.opacity > 0.02
  }

  snapshot() {
    return {
      id: this.def.id,
      name: this.def.name,
      gender: this.def.gender,
      desc: this.def.desc,
      hunger: Math.round(this.hunger),
      affection: Math.round(this.affection),
      state: STATE_TEXT[this.state] || 'santai',
    }
  }

  save() {
    return {
      hunger: this.hunger,
      affection: this.affection,
      pos: this.state === 'held' || this.perch ? undefined : [this.pos.x, -this.pos.z],
    }
  }
}

const STATE_TEXT = {
  walk: 'jalan-jalan',
  sit: 'duduk',
  loaf: 'mode roti tawar',
  sleep: 'tidur',
  eat: 'makan',
  held: 'digendong',
  pet: 'dielus',
  follow: 'ngikutin kamu',
  watch: 'nonton TV',
  jump: 'loncat',
}

const turn = (a, b, t) => {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a))
  return a + d * Math.min(1, t)
}
