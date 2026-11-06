import * as THREE from 'three'
import { WALLS, ROOMS, WALL_H, WALL_T, DOOR_H } from './plan'
import { floorTexture } from './textures'

const unit = new THREE.BoxGeometry(1, 1, 1)
unit.translate(0, 0.5, 0) // pivot di bawah biar gampang diatur tingginya

const WALL_COLOR = '#f2ebdf'
const WALL_TOP = '#a99a87'
const FENCE_COLOR = '#ddd3c4'
const FRAME_COLOR = '#6e4a32'

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a))

export function buildHouse(scene, physics) {
  const group = new THREE.Group()
  group.name = 'house'
  scene.add(group)

  const pieces = [] // semua bagian dinding/jendela/pintu yang bisa dibuat transparan
  const doors = []

  const fadeable = (object, mats, kind, y0, y1, rect) => {
    const p = { object, mats: mats.map((m) => ({ m, base: m.opacity })), kind, y0, y1, rect, fade: 1 }
    for (const { m } of p.mats) m.transparent = true
    pieces.push(p)
    return p
  }

  const wallRect = (wall, s0, s1) => {
    const horizontal = wall.a[1] === wall.b[1]
    const t = WALL_T / 2
    if (horizontal) return { minX: s0, maxX: s1, minZ: -wall.a[1] - t, maxZ: -wall.a[1] + t }
    return { minX: wall.a[0] - t, maxX: wall.a[0] + t, minZ: -s1, maxZ: -s0 }
  }

  const addBox = (wall, s0, s1, y0, y1, { collide = true, kind = 'wall' } = {}) => {
    if (s1 - s0 < 0.005 || y1 - y0 < 0.005) return
    const horizontal = wall.a[1] === wall.b[1]
    const fence = wall.kind === 'fence'
    const side = new THREE.MeshStandardMaterial({ color: fence ? FENCE_COLOR : WALL_COLOR, roughness: 0.95 })
    const top = new THREE.MeshStandardMaterial({ color: WALL_TOP, roughness: 0.9 })
    const mesh = new THREE.Mesh(unit, [side, side, top, side, side, side])
    const mid = (s0 + s1) / 2
    const t = fence ? WALL_T + 0.02 : WALL_T
    if (horizontal) {
      mesh.position.set(mid, y0, -wall.a[1])
      mesh.scale.set(s1 - s0, y1 - y0, t)
    } else {
      mesh.position.set(wall.a[0], y0, -mid)
      mesh.scale.set(t, y1 - y0, s1 - s0)
    }
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    const rect = wallRect(wall, s0, s1)
    const p = fadeable(mesh, [side, top], kind, y0, y1, rect)
    p.baseY = y0
    if (collide && y0 < 0.3) physics.add(rect.minX, rect.maxX, rect.minZ, rect.maxZ, 'wall')
    return p
  }

  // kusen + kaca jendela
  const addWindow = (wall, o) => {
    const horizontal = wall.a[1] === wall.b[1]
    const w = o.to - o.from
    const h = o.top - o.sill
    const g = new THREE.Group()
    const frameMat = new THREE.MeshStandardMaterial({ color: FRAME_COLOR, roughness: 0.7 })
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#bcd9e4',
      roughness: 0.05,
      metalness: 0.1,
      opacity: 0.32,
      transparent: true,
      depthWrite: false,
    })
    const ft = 0.05
    const depth = WALL_T + 0.02
    const bar = (bw, bh, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth), frameMat)
      m.position.set(x, y, 0)
      m.castShadow = true
      g.add(m)
    }
    bar(w, ft, 0, ft / 2)
    bar(w, ft, 0, h - ft / 2)
    bar(ft, h, -w / 2 + ft / 2, h / 2)
    bar(ft, h, w / 2 - ft / 2, h / 2)
    bar(ft * 0.7, h, 0, h / 2)
    bar(w, ft * 0.7, 0, h * 0.72)
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - ft, h - ft, 0.01), glassMat)
    glass.position.y = h / 2
    g.add(glass)
    const ledge = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.1, 0.04, depth + 0.08),
      new THREE.MeshStandardMaterial({ color: '#e6dccd', roughness: 0.8 }),
    )
    ledge.position.y = -0.02
    ledge.receiveShadow = true
    g.add(ledge)

    const mid = (o.from + o.to) / 2
    if (horizontal) g.position.set(mid, o.sill, -wall.a[1])
    else {
      g.position.set(wall.a[0], o.sill, -mid)
      g.rotation.y = Math.PI / 2
    }
    group.add(g)
    fadeable(g, [frameMat, glassMat, ledge.material], 'window', o.sill, o.top, wallRect(wall, o.from, o.to))
  }

  const addDoor = (wall, o) => {
    const horizontal = wall.a[1] === wall.b[1]
    const w = o.to - o.from
    const leafW = w - 0.04
    const leafH = DOOR_H - 0.03
    const leafMat = new THREE.MeshStandardMaterial({ color: '#8b5d3c', roughness: 0.6 })
    const metal = new THREE.MeshStandardMaterial({ color: '#d8c38a', roughness: 0.3, metalness: 0.8 })

    // kusen pintu
    const frameMat = new THREE.MeshStandardMaterial({ color: FRAME_COLOR, roughness: 0.7 })
    const frame = new THREE.Group()
    const jamb = (x) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, DOOR_H, WALL_T + 0.03), frameMat)
      m.position.set(x, DOOR_H / 2, 0)
      frame.add(m)
    }
    jamb(-w / 2 + 0.025)
    jamb(w / 2 - 0.025)
    const head = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, WALL_T + 0.03), frameMat)
    head.position.y = DOOR_H - 0.025
    frame.add(head)
    const mid = (o.from + o.to) / 2
    if (horizontal) frame.position.set(mid, 0, -wall.a[1])
    else {
      frame.position.set(wall.a[0], 0, -mid)
      frame.rotation.y = Math.PI / 2
    }
    group.add(frame)

    const leafGeo = new THREE.BoxGeometry(leafW, leafH, 0.04)
    leafGeo.translate(leafW / 2, leafH / 2, 0)
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.castShadow = true
    leaf.receiveShadow = true
    // panel hias
    for (const y of [0.55, 1.45]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(leafW * 0.62, 0.62, 0.05), leafMat)
      panel.position.set(leafW / 2, y, 0)
      panel.scale.z = 1.1
      leaf.add(panel)
    }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), metal)
    knob.scale.set(1, 1, 2.6)
    knob.position.set(leafW - 0.08, 1.0, 0)
    leaf.add(knob)

    const hinge = new THREE.Group()
    const hs = o.hinge === 'to' ? o.to : o.from
    const dirSign = o.hinge === 'to' ? -1 : 1
    let d
    if (horizontal) {
      hinge.position.set(hs + dirSign * 0.02, 0.01, -wall.a[1])
      d = new THREE.Vector2(dirSign, 0)
    } else {
      hinge.position.set(wall.a[0], 0.01, -(hs + dirSign * 0.02))
      d = new THREE.Vector2(0, -dirSign)
    }
    const closed = Math.atan2(-d.y, d.x)
    const v = new THREE.Vector2(o.swing[0], -o.swing[1])
    const open = Math.atan2(-v.y, v.x)
    const delta = wrapAngle(open - closed) * 0.94
    hinge.rotation.y = closed
    hinge.add(leaf)
    group.add(hinge)

    const center = horizontal ? new THREE.Vector2(mid, -wall.a[1]) : new THREE.Vector2(wall.a[0], -mid)
    const p = fadeable(leaf, [leafMat, metal], 'door', 0, DOOR_H, wallRect(wall, o.from, o.to))
    doors.push({ id: o.id, hinge, leaf, closed, delta, center, open: 0, piece: p, wasOpen: false })
    fadeable(frame, [frameMat], 'frame', 0, DOOR_H, wallRect(wall, o.from, o.to))
  }

  for (const wall of WALLS) {
    const horizontal = wall.a[1] === wall.b[1]
    const sa = horizontal ? Math.min(wall.a[0], wall.b[0]) : Math.min(wall.a[1], wall.b[1])
    const sb = horizontal ? Math.max(wall.a[0], wall.b[0]) : Math.max(wall.a[1], wall.b[1])
    const H = wall.h || WALL_H
    const openings = [...(wall.openings || [])].sort((a, b) => a.from - b.from)
    let cursor = sa - WALL_T / 2
    for (const o of openings) {
      addBox(wall, cursor, o.from, 0, H)
      if (o.type === 'door') {
        addBox(wall, o.from, o.to, DOOR_H, H, { collide: false, kind: 'header' })
        addDoor(wall, o)
      } else {
        addBox(wall, o.from, o.to, 0, o.sill)
        addBox(wall, o.from, o.to, o.top, H, { collide: false, kind: 'header' })
        addWindow(wall, o)
      }
      cursor = o.to
    }
    addBox(wall, cursor, sb + WALL_T / 2, 0, H)
  }

  // lantai per ruangan, uv pakai koordinat dunia supaya motifnya nyambung
  for (const room of ROOMS) {
    const { tex, meters } = floorTexture(room.floor)
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: room.floor === 'ceramic' ? 0.45 : 0.85 })
    for (const [x0, z0, x1, z1] of room.rects) {
      const w = x1 - x0
      const d = z1 - z0
      const geo = new THREE.PlaneGeometry(w, d)
      geo.rotateX(-Math.PI / 2)
      const cx = (x0 + x1) / 2
      const cz = -(z0 + z1) / 2
      const pos = geo.attributes.position
      const uv = geo.attributes.uv
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) + cx) / meters, (pos.getZ(i) + cz) / meters)
      }
      const mesh = new THREE.Mesh(geo, mat)
      const y = room.floor === 'grass' ? 0.002 : room.floor === 'bath' ? 0.006 : 0.008
      mesh.position.set(cx, y, cz)
      mesh.receiveShadow = true
      group.add(mesh)
    }
  }

  buildSurroundings(scene, physics)

  return { group, pieces, doors }
}

function plane(w, d, type, cx, cz, y = 0) {
  const { tex, meters } = floorTexture(type)
  const geo = new THREE.PlaneGeometry(w, d)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + cx) / meters, (pos.getZ(i) + cz) / meters)
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }))
  mesh.position.set(cx, y, cz)
  mesh.receiveShadow = true
  return mesh
}

function buildSurroundings(scene, physics) {
  const g = new THREE.Group()
  g.name = 'surroundings'
  scene.add(g)

  // tanah luas
  const ground = plane(90, 90, 'grass', 3.5, -8, -0.02)
  ground.material = ground.material.clone()
  ground.material.color = new THREE.Color('#e6efd9')
  g.add(ground)

  // trotoar + jalan depan rumah (z denah negatif = arah jalan)
  g.add(plane(80, 1.5, 'paving', 3.5, 0.75, 0.004))
  g.add(plane(80, 6, 'asphalt', 3.5, 4.5, 0.001))
  const curbMat = new THREE.MeshStandardMaterial({ color: '#c9c4ba', roughness: 0.9 })
  const curb = new THREE.Mesh(new THREE.BoxGeometry(80, 0.12, 0.14), curbMat)
  curb.position.set(3.5, 0.06, 1.5)
  curb.receiveShadow = true
  g.add(curb)
  const lineMat = new THREE.MeshBasicMaterial({ color: '#e9e4d4' })
  for (let x = -36; x < 44; x += 3) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.12), lineMat)
    dash.rotation.x = -Math.PI / 2
    dash.position.set(x, 0.006, 4.5)
    g.add(dash)
  }

  // pagar tanaman tetangga kiri-kanan
  const hedgeMat = new THREE.MeshStandardMaterial({ color: '#5f8a45', roughness: 1 })
  for (const x of [-0.6, 7.6]) {
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 18.5), hedgeMat)
    hedge.position.set(x, 0.55, -7.25)
    hedge.castShadow = true
    hedge.receiveShadow = true
    g.add(hedge)
  }

  // tiang listrik, khas banget
  const poleMat = new THREE.MeshStandardMaterial({ color: '#8e8f8c', roughness: 0.7 })
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 10), poleMat)
  pole.position.set(-1.6, 3.75, 1.3)
  pole.castShadow = true
  g.add(pole)
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), poleMat)
  arm.position.set(-1.6, 7.0, 1.3)
  g.add(arm)
  const wireMat = new THREE.LineBasicMaterial({ color: '#2b2b2b' })
  for (const off of [-0.6, 0.6]) {
    const pts = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      const x = -30 + t * 60
      pts.push(new THREE.Vector3(x, 7.05 - Math.sin(t * Math.PI) * 0.8, 1.3 + off * 0.2))
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat))
  }

  // pohon-pohon jauh
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#7a5a3f', roughness: 1 })
  const leafMats = ['#6f9b4f', '#5d8a44', '#86ad5f'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }))
  const spots = [
    [-4, -3], [-5, -9], [-3.5, -14], [11, -2], [12, -8], [10.5, -15], [-6, 8], [13, 9], [2, 10], [8, 11],
  ]
  spots.forEach(([x, z], i) => {
    const tree = new THREE.Group()
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 8), trunkMat)
    trunk.position.y = 0.8
    trunk.castShadow = true
    tree.add(trunk)
    for (let k = 0; k < 3; k++) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 - k * 0.15, 1), leafMats[(i + k) % 3])
      blob.position.set((k - 1) * 0.35, 1.9 + k * 0.45, (k % 2) * 0.3)
      blob.castShadow = true
      tree.add(blob)
    }
    const s = 0.9 + ((i * 37) % 10) / 15
    tree.scale.setScalar(s)
    tree.position.set(x, 0, z)
    g.add(tree)
  })

  // batas area jalan-jalan
  physics.add(-30, -0.075, -40, 40, 'bound')
  physics.add(7.075, 40, -40, 40, 'bound')
  physics.add(-40, 40, -40, -16.075, 'bound')
  physics.add(-40, 40, 1.45, 40, 'bound')
}

// --- cutaway: dinding yang nutupin karakter dibikin transparan ---
const tmpQ = { x: 0, z: 0 }
const closestOnSeg = (ax, az, bx, bz, px, pz) => {
  const dx = bx - ax
  const dz = bz - az
  const l2 = dx * dx + dz * dz || 1
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2))
  tmpQ.x = ax + dx * t
  tmpQ.z = az + dz * t
  return t
}

export function updateCutaway(pieces, camPos, target, dt, lowWalls) {
  const ax = camPos.x
  const az = camPos.z
  const bx = target.x
  const bz = target.z
  const D = Math.hypot(bx - ax, bz - az) || 1
  const k = 1 - Math.exp(-dt * 10)
  const cap = 1.0
  for (const p of pieces) {
    const r = p.rect
    let want = 1
    // jarak terdekat antara garis kamera->karakter dan kotak dinding (proyeksi bolak-balik)
    let qx = (r.minX + r.maxX) / 2
    let qz = (r.minZ + r.maxZ) / 2
    let t = closestOnSeg(ax, az, bx, bz, qx, qz)
    for (let i = 0; i < 3; i++) {
      qx = Math.max(r.minX, Math.min(tmpQ.x, r.maxX))
      qz = Math.max(r.minZ, Math.min(tmpQ.z, r.maxZ))
      t = closestOnSeg(ax, az, bx, bz, qx, qz)
    }
    const dist = Math.hypot(tmpQ.x - qx, tmpQ.z - qz)
    if (t < 0.985 && dist < 1.1) {
      // tinggi garis pandang di titik itu
      const s = (1 - t) * D
      const lineY = target.y + (camPos.y - target.y) * (s / D)
      const top = lowWalls ? Math.min(p.y1, cap) : p.y1
      if (top > lineY - 0.9 - dist * 0.6) want = p.kind === 'window' ? 0.12 : 0.14
    }
    p.fade += (want - p.fade) * k

    p.object.visible = !(lowWalls && (p.kind === 'header' || p.kind === 'window' || p.kind === 'frame'))
    if (p.kind === 'wall') {
      const y1 = lowWalls ? Math.min(p.y1, cap) : p.y1
      p.object.visible = y1 - p.y0 > 0.01
      if (p.object.visible) p.object.scale.y = y1 - p.y0
    }
    if (p.kind === 'door') p.object.scale.y = lowWalls ? cap / DOOR_H : 1

    for (const { m, base } of p.mats) {
      m.opacity = base * p.fade
      m.depthWrite = p.fade > 0.95 && base >= 1
    }
  }
}

export function updateDoors(doors, actors, dt) {
  const k = 1 - Math.exp(-dt * 7)
  const events = []
  for (const d of doors) {
    let near = false
    for (const a of actors) {
      if (Math.hypot(a.x - d.center.x, a.z - d.center.y) < 1.15) {
        near = true
        break
      }
    }
    d.open += ((near ? 1 : 0) - d.open) * k
    d.hinge.rotation.y = d.closed + d.delta * d.open
    if (near && !d.wasOpen) events.push(d)
    d.wasOpen = near
  }
  return events
}
