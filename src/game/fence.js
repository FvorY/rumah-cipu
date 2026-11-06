import * as THREE from 'three'
import { M, B } from './furniture'
import { stoneTexture, plateTexture } from './textures'

// Pagar depan: dasar batu alam + bilah kayu horizontal, pilar batu,
// pintu kecil (kebuka sendiri) dan pagar carport dua daun (buka/tutup manual).

const STEEL = '#26282a'
const WOOD = '#8a5a3b'

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))

// daun pagar: engsel di x=0, panjang ke +x
const leaf = (w, h) => {
  const g = new THREE.Group()
  const steel = M(STEEL, 0.5, { metalness: 0.4 })
  const wood = M(WOOD, 0.7)
  const t = 0.04
  g.add(B(t, h, t, steel, t / 2, h / 2 + 0.05, 0))
  g.add(B(t, h, t, steel, w - t / 2, h / 2 + 0.05, 0))
  g.add(B(w, t, t, steel, w / 2, 0.05 + t / 2, 0))
  g.add(B(w, t, t, steel, w / 2, 0.05 + h - t / 2, 0))
  const n = Math.floor((h - 0.1) / 0.13)
  for (let i = 0; i < n; i++) g.add(B(w - t * 2, 0.085, 0.025, wood, w / 2, 0.14 + i * 0.13, 0))
  // gagang
  g.add(B(0.02, 0.14, 0.05, M('#c9ccd0', 0.2, { metalness: 0.9 }), w - 0.1, 0.95, 0))
  return g
}

export function buildFence(scene, physics) {
  const root = new THREE.Group()
  root.name = 'pagar'
  scene.add(root)
  const stone = new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.95 })
  const cap = M('#d9d3c7', 0.8)
  const steel = M(STEEL, 0.5, { metalness: 0.4 })
  const wood = M(WOOD, 0.7)

  // posisi pakai koordinat denah, z dunia = -z
  const at = (o, x, z, y = 0, ry = 0) => {
    o.position.set(x, y, -z)
    o.rotation.y = ry
    root.add(o)
    return o
  }

  const pillar = (x0, x1, h = 1.7, lamp = true) => {
    const w = x1 - x0
    const cx = (x0 + x1) / 2
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), stone)
    p.castShadow = p.receiveShadow = true
    at(p, cx, 0, h / 2)
    at(B(w + 0.06, 0.06, 0.36, cap), cx, 0, h + 0.03)
    if (lamp) {
      at(B(0.12, 0.16, 0.12, steel), cx, 0, h + 0.14)
      at(B(0.09, 0.1, 0.09, M('#fff1c9', 0.4, { emissive: '#ffd27a', emissiveIntensity: 0.6 })), cx, 0, h + 0.14)
      at(B(0.15, 0.03, 0.15, steel), cx, 0, h + 0.235)
    }
    physics.addPlan(x0, -0.15, x1, 0.15, 'pagar')
  }

  // ---- pagar halaman (x 0.2 - 2.95) ----
  pillar(-0.1, 0.2, 1.7, false)
  const baseL = 2.75
  const base = new THREE.Mesh(new THREE.BoxGeometry(baseL, 0.55, 0.22), stone)
  base.castShadow = base.receiveShadow = true
  at(base, 0.2 + baseL / 2, 0, 0.275)
  at(B(baseL, 0.04, 0.26, cap), 0.2 + baseL / 2, 0, 0.57)
  for (let i = 0; i < 5; i++) at(B(baseL, 0.09, 0.03, wood), 0.2 + baseL / 2, 0, 0.7 + i * 0.16)
  for (const x of [0.35, 1.25, 2.15]) at(B(0.04, 0.95, 0.06, steel), x, 0, 1.06)
  physics.addPlan(0.2, -0.12, 2.95, 0.12, 'pagar')

  pillar(2.95, 3.25)
  // kotak surat
  const mail = new THREE.Group()
  mail.add(B(0.26, 0.2, 0.1, M('#b8bcc0', 0.3, { metalness: 0.7 })))
  mail.add(B(0.18, 0.015, 0.012, M('#333', 0.5), 0, 0.05, 0.056))
  at(mail, 3.1, -0.2, 1.1)

  pillar(4.3, 4.6)
  // nomor rumah
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.1), new THREE.MeshStandardMaterial({ map: plateTexture('No. 15'), roughness: 0.6 }))
  at(num, 4.45, -0.151, 1.25)

  pillar(6.85, 7.12)

  // ---- pintu kecil (masuk lewat jalan setapak) ----
  const gates = []
  const small = leaf(1.03, 1.45)
  const hingeS = new THREE.Group()
  hingeS.add(small)
  at(hingeS, 3.26, 0)
  // buka ke dalam (z dunia negatif)
  gates.push({ hinge: hingeS, closed: 0, delta: wrap(Math.PI / 2) * 0.94, center: new THREE.Vector2(3.775, 0), open: 0, wasOpen: false })

  // ---- pagar carport dua daun, buka ke luar (arah jalan) ----
  const leafW = (6.85 - 4.6) / 2 - 0.005
  const hl = new THREE.Group()
  hl.add(leaf(leafW, 1.5))
  at(hl, 4.6, 0)
  const hr = new THREE.Group()
  hr.add(leaf(leafW, 1.5))
  at(hr, 6.85, 0, 0, Math.PI)
  const carGate = {
    left: hl,
    right: hr,
    open: 0,
    target: 0,
    collider: physics.addPlan(4.6, -0.04, 6.85, 0.04, 'pagarCarport'),
    center: { x: 5.725, z: 0 },
  }

  // rel kecil di lantai carport
  at(B(2.25, 0.015, 0.05, steel), 5.725, 0, 0.008)

  return {
    root,
    gates, // ikut logika pintu otomatis di house.js
    carGate,
    toggleCarGate() {
      carGate.target = carGate.target ? 0 : 1
      return carGate.target === 1
    },
    update(dt) {
      const k = 1 - Math.exp(-dt * 3)
      carGate.open += (carGate.target - carGate.open) * k
      const a = carGate.open * (Math.PI / 2) * 0.96
      hl.rotation.y = -a
      hr.rotation.y = Math.PI + a
      carGate.collider.disabled = carGate.open > 0.5
    },
  }
}
