import * as THREE from 'three'
import { roofTexture, stoneTexture } from './textures'

// Atap tropis modern:
// - atap perisai (limasan) genteng flat abu tua di badan rumah utama
// - dak beton datar + list putih tebal + kisi kayu di depan kamar utama & teras
// - dak kecil di belakang kamar tidur 3
// - kanopi carport kantilever, polikarbonat bronze + rangka baja
// Atap otomatis memudar kalau karakter masuk rumah biar nggak nutupin.

export const ROOF = {
  main: { x0: -0.45, x1: 7.45, z0: 4.05, z1: 14.95, eave: 2.75, pitch: 28 },
  front: { x0: -0.35, x1: 4.68, z0: 1.5, z1: 4.05 },
  back: { x0: -0.35, x1: 3.35, z0: 14.95, z1: 16.1 },
  canopy: { x0: 4.62, x1: 7.05, z0: 0.25, z1: 4.45 },
}

const V = (x, y, z) => new THREE.Vector3(x, y, -z) // koordinat denah -> dunia

const face = (pts, mat, center) => {
  const p0 = pts[0]
  const eave = pts[1].clone().sub(p0).normalize()
  const tris = pts.length === 3 ? [[0, 1, 2]] : [[0, 1, 2], [0, 2, 3]]
  // pastikan normal menghadap keluar
  const n = new THREE.Vector3().crossVectors(pts[1].clone().sub(p0), pts[2].clone().sub(p0))
  const mid = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length)
  if (n.dot(mid.clone().sub(center)) < 0) tris.forEach((t) => t.reverse())
  const pos = []
  const uv = []
  for (const t of tris) {
    for (const i of t) {
      const p = pts[i]
      pos.push(p.x, p.y, p.z)
      const d = p.clone().sub(p0)
      const u = d.dot(eave)
      const v = d.sub(eave.clone().multiplyScalar(u)).length()
      uv.push(u / 1.2, v / 1.2)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.computeVertexNormals()
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

const beam = (a, b, r, mat) => {
  const d = b.clone().sub(a)
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat)
  m.position.copy(a).add(b).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  m.castShadow = true
  return m
}

const box = (x0, x1, y0, y1, z0, z1, mat) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat)
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, -(z0 + z1) / 2)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

export function buildRoof(scene, physics) {
  const parts = {}
  const make = (name) => {
    const g = new THREE.Group()
    g.name = `atap-${name}`
    scene.add(g)
    parts[name] = { group: g, mats: [], opacity: 1 }
    return g
  }
  const mat = (name, params) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, ...params })
    m.userData.base = m.opacity
    parts[name].mats.push(m)
    return m
  }

  // ---------- atap perisai utama ----------
  {
    const g = make('main')
    const { x0, x1, z0, z1, eave, pitch } = ROOF.main
    const half = (x1 - x0) / 2
    const rise = half * Math.tan((pitch * Math.PI) / 180)
    const cx = (x0 + x1) / 2
    const tiles = mat('main', { map: roofTexture(), roughness: 0.75, side: THREE.DoubleSide })
    const A = V(x0, eave, z0)
    const Bp = V(x1, eave, z0)
    const Cp = V(x1, eave, z1)
    const D = V(x0, eave, z1)
    const R1 = V(cx, eave + rise, z0 + half)
    const R2 = V(cx, eave + rise, z1 - half)
    const center = V(cx, eave, (z0 + z1) / 2)
    g.add(face([A, Bp, R1], tiles, center))
    g.add(face([Bp, Cp, R2, R1], tiles, center))
    g.add(face([Cp, D, R2], tiles, center))
    g.add(face([D, A, R1, R2], tiles, center))

    // bubungan & jurai
    const ridge = mat('main', { color: '#2f3236', roughness: 0.6 })
    const lift = new THREE.Vector3(0, 0.03, 0)
    g.add(beam(R1.clone().add(lift), R2.clone().add(lift), 0.07, ridge))
    for (const [a, b] of [[A, R1], [Bp, R1], [Cp, R2], [D, R2]]) g.add(beam(a.clone().add(lift), b.clone().add(lift), 0.055, ridge))

    // lisplang kayu keliling
    const fascia = mat('main', { color: '#5a3c2a', roughness: 0.7 })
    const fy0 = eave - 0.2
    const fy1 = eave + 0.04
    g.add(box(x0 - 0.03, x1 + 0.03, fy0, fy1, z0 - 0.03, z0, fascia))
    g.add(box(x0 - 0.03, x1 + 0.03, fy0, fy1, z1, z1 + 0.03, fascia))
    g.add(box(x0 - 0.03, x0, fy0, fy1, z0, z1, fascia))
    g.add(box(x1, x1 + 0.03, fy0, fy1, z0, z1, fascia))
    // plafon bawah overstek
    const soffit = mat('main', { color: '#f3efe8', side: THREE.DoubleSide })
    const s = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), soffit)
    s.rotation.x = Math.PI / 2
    s.position.set(cx, eave - 0.19, -(z0 + z1) / 2)
    g.add(s)
  }

  // ---------- dak beton depan (kamar utama + teras) ----------
  const slab = (name, r, slatsFront) => {
    const g = make(name)
    const white = mat(name, { color: '#f4f1eb', roughness: 0.9 })
    const { x0, x1, z0, z1 } = r
    g.add(box(x0, x1, 2.7, 2.95, z0, z1, white))
    // list tebal (parapet) di sisi yang kelihatan
    const y0 = 2.6
    const y1 = 3.2
    const t = 0.12
    g.add(box(x0, x1, y0, y1, z0, z0 + t, white))
    g.add(box(x0, x0 + t, y0, y1, z0, z1, white))
    g.add(box(x1 - t, x1, y0, y1, z0, z1, white))
    if (name === 'back') g.add(box(x0, x1, y0, y1, z1 - t, z1, white))
    // garis gelap tipis di bawah list, biar kerasa modern
    const dark = mat(name, { color: '#3a3836', roughness: 0.6 })
    g.add(box(x0 - 0.005, x1 + 0.005, 2.6, 2.63, z0 - 0.005, z0 + t, dark))
    if (slatsFront) {
      // kisi kayu vertikal di muka list depan
      const wood = mat(name, { color: '#9a6a45', roughness: 0.7 })
      for (let x = x0 + 0.25; x < x0 + 3.1; x += 0.11) g.add(box(x, x + 0.045, 2.55, 3.25, z0 - 0.05, z0 - 0.01, wood))
    }
    return g
  }
  slab('front', ROOF.front, true)
  slab('back', ROOF.back, false)

  // kolom teras batu alam (masuk grup depan)
  {
    const stone = mat('front', { map: stoneTexture(), roughness: 0.95 })
    const col = box(4.38, 4.56, 0, 2.7, 2.04, 2.22, stone)
    parts.front.group.add(col)
    physics.addPlan(4.38, 2.04, 4.56, 2.22, 'kolom')
  }

  // ---------- kanopi carport ----------
  {
    const g = make('canopy')
    const { x0, x1, z0, z1 } = ROOF.canopy
    const steel = mat('canopy', { color: '#2b2d30', roughness: 0.45, metalness: 0.5 })
    const poly = mat('canopy', {
      color: '#c99556',
      roughness: 0.3,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    poly.userData.base = 0.5
    const yBack = 2.68
    const yFront = 2.52
    const len = z1 - z0
    const slope = Math.atan2(yBack - yFront, len)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.015, len), poly)
    panel.position.set((x0 + x1) / 2, (yBack + yFront) / 2, -(z0 + z1) / 2)
    panel.rotation.x = -slope
    g.add(panel)
    // rangka
    const yAt = (z) => yFront + ((z - z0) / len) * (yBack - yFront) - 0.04
    g.add(beam(V(x0, yAt(z0), z0), V(x0, yAt(z1), z1), 0.035, steel))
    g.add(beam(V(x1, yAt(z0), z0), V(x1, yAt(z1), z1), 0.035, steel))
    for (let k = 0; k <= 4; k++) {
      const z = z0 + (len * k) / 4
      g.add(beam(V(x0, yAt(z), z), V(x1, yAt(z), z), k === 0 ? 0.04 : 0.025, steel))
    }
    // tiang di sisi pagar samping + kabel tarik dari dinding rumah
    for (const z of [0.45, 2.4]) g.add(box(6.95, 7.05, 0, yAt(z), z - 0.05, z + 0.05, steel))
    for (const x of [x0 + 0.05, (x0 + x1) / 2]) g.add(beam(V(x, 3.35, 4.45), V(x, yAt(z0 + 0.05), z0 + 0.05), 0.012, steel))
  }

  for (const p of Object.values(parts)) {
    p.group.traverse((o) => {
      if (o.isMesh) for (const m of [o.material].flat()) m.transparent = true
    })
  }

  return {
    parts,
    // target: { main, front, back, canopy } -> 0..1
    update(dt, target) {
      const k = 1 - Math.exp(-dt * 6)
      for (const [name, p] of Object.entries(parts)) {
        const want = target[name] ?? 1
        p.opacity += (want - p.opacity) * k
        const visible = p.opacity > 0.02
        p.group.visible = visible
        if (!visible) continue
        for (const m of p.mats) {
          m.opacity = (m.userData.base ?? 1) * p.opacity
          m.depthWrite = p.opacity > 0.97 && (m.userData.base ?? 1) >= 1
        }
        p.group.traverse((o) => {
          if (o.isMesh) o.castShadow = p.opacity > 0.5
        })
      }
    },
  }
}
