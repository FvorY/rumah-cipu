import * as THREE from 'three'

// Karakter chibi. Default-nya dibikin mirip avatar Ferdy di portfolio
// (rambut hitam belah samping, kemeja putih), tapi semuanya bisa diganti:
// cowok/cewek, warna kulit, model & warna rambut (termasuk hijab), atasan, bawahan.

export const LOOK_OPTIONS = {
  skin: ['#f6d9c4', '#efc9a8', '#ddb08a', '#bf8a63', '#8f5e3f'],
  hair: [
    { id: 'samping', label: 'Belah samping' },
    { id: 'cepak', label: 'Cepak' },
    { id: 'poni', label: 'Poni tengah' },
    { id: 'bob', label: 'Bob' },
    { id: 'panjang', label: 'Panjang' },
    { id: 'kuncir', label: 'Kuncir' },
    { id: 'hijab', label: 'Hijab' },
    { id: 'mohawk', label: '⚡ Mohawk punk' },
    { id: 'afro', label: '☁️ Afro mekar' },
    { id: 'mangkok', label: '🥣 Batok mangkok' },
    { id: 'mullet', label: '🎸 Mullet jadul' },
    { id: 'jabrik', label: '🦔 Jabrik anime' },
    { id: 'antena', label: '🌱 Antena ahoge' },
    { id: 'botakProfesor', label: '👴 Botak profesor' },
  ],
  hairColor: ['#171515', '#3b2a20', '#6b4a2f', '#a8763e', '#8c2f2f', '#c9c2b8', '#3498db', '#2ecc71', '#e74c3c'],
  hijabColor: ['#e9dcc9', '#c45b6a', '#5b7aa3', '#4f7a5a', '#2b2b2e', '#d9a441'],
  top: [
    { id: 'kemeja', label: 'Kemeja' },
    { id: 'kaos', label: 'Kaos' },
    { id: 'hoodie', label: 'Hoodie' },
    { id: 'batik', label: 'Batik' },
  ],
  topColor: ['#f7f6f2', '#2b2f36', '#d9534f', '#4a7bb7', '#5f8f43', '#e9b949', '#c38bb5', '#8a6142'],
  bottom: [
    { id: 'celana', label: 'Celana panjang' },
    { id: 'pendek', label: 'Celana pendek' },
    { id: 'rok', label: 'Rok' },
  ],
  bottomColor: ['#2f3742', '#4a5f7a', '#6b4a33', '#c9c2b0', '#1f1f22', '#8c5a7a'],
  shoes: [
    { id: 'kets', label: 'Sneakers' },
    { id: 'sandal', label: 'Sandal jepit' },
    { id: 'pantofel', label: 'Pantofel' },
    { id: 'boots', label: 'Boots tinggi' },
    { id: 'nyeker', label: 'Nyeker' },
  ],
  shoeColor: ['#1e1e20', '#f7f6f2', '#6b4a33', '#2b4d75', '#a83232', '#d9a441'],
}

export const DEFAULT_LOOK = {
  gender: 'cowok',
  skin: '#f6d9c4',
  hair: 'samping',
  hairColor: '#171515',
  hijabColor: '#e9dcc9',
  top: 'kemeja',
  topColor: '#f7f6f2',
  bottom: 'celana',
  bottomColor: '#2f3742',
  shoes: 'kets',
  shoeColor: '#1e1e20',
}

export const PRESETS = {
  cowok: { ...DEFAULT_LOOK },
  cewek: { ...DEFAULT_LOOK, gender: 'cewek', hair: 'panjang', hairColor: '#3b2a20', top: 'kaos', topColor: '#c38bb5', bottom: 'rok', bottomColor: '#4a5f7a', shoes: 'kets', shoeColor: '#f7f6f2' },
}

// look dari luar (save / pemain lain) dibersihin biar nggak bikin crash
export const sanitizeLook = (l = {}) => {
  const pick = (v, list, def) => (list.some((o) => (o.id ?? o) === v) ? v : def)
  const hex = (v, def) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : def)
  return {
    gender: l.gender === 'cewek' ? 'cewek' : 'cowok',
    skin: hex(l.skin, DEFAULT_LOOK.skin),
    hair: pick(l.hair, LOOK_OPTIONS.hair, DEFAULT_LOOK.hair),
    hairColor: hex(l.hairColor, DEFAULT_LOOK.hairColor),
    hijabColor: hex(l.hijabColor, DEFAULT_LOOK.hijabColor),
    top: pick(l.top, LOOK_OPTIONS.top, DEFAULT_LOOK.top),
    topColor: hex(l.topColor, DEFAULT_LOOK.topColor),
    bottom: pick(l.bottom, LOOK_OPTIONS.bottom, DEFAULT_LOOK.bottom),
    bottomColor: hex(l.bottomColor, DEFAULT_LOOK.bottomColor),
    shoes: pick(l.shoes, LOOK_OPTIONS.shoes, DEFAULT_LOOK.shoes),
    shoeColor: hex(l.shoeColor, DEFAULT_LOOK.shoeColor),
  }
}

const SHOE = '#3a2f2a'

const mat = (color, roughness = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra })
const mesh = (geo, m, parent, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(geo, m)
  o.position.set(x, y, z)
  o.castShadow = true
  parent?.add(o)
  return o
}

const HEAD_R = 0.27
const HEAD_SCALE = new THREE.Vector3(1, 0.95, 0.93)

// titik di permukaan kepala berdasarkan azimuth (kanan +) & elevasi
const onHead = (az, el, lift = 0) => {
  const r = HEAD_R + lift
  return new THREE.Vector3(
    Math.sin(az) * Math.cos(el) * r * HEAD_SCALE.x,
    Math.sin(el) * r * HEAD_SCALE.y,
    Math.cos(az) * Math.cos(el) * r * HEAD_SCALE.z,
  )
}

// orientasi objek: sumbu y lokal = normal, sumbu z lokal = arah "sapuan"
const orient = (obj, normal, sweep) => {
  const y = normal.clone().normalize()
  const z = sweep.clone().sub(y.clone().multiplyScalar(sweep.dot(y))).normalize()
  const x = new THREE.Vector3().crossVectors(y, z)
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
}

// tube lancip sepanjang kurva (dipakai buat helai rambut & kuncir)
const tube = (points, r0, r1, flatten = 0.45, segs = 18) => {
  const curve = new THREE.CatmullRomCurve3(points)
  const radial = 7
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false)
  const pos = geo.attributes.position
  const c = new THREE.Vector3()
  const v = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    curve.getPointAt(t, c)
    const n = c.clone().normalize()
    const r = r1 + (r0 - r1) * Math.pow(1 - t, 0.8) * (t < 0.08 ? 0.6 + t * 5 : 1)
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j
      v.fromBufferAttribute(pos, idx).sub(c)
      const along = v.dot(n)
      v.addScaledVector(n, -along * flatten).multiplyScalar(r).add(c)
      pos.setXYZ(idx, v.x, v.y, v.z)
    }
  }
  geo.computeVertexNormals()
  return geo
}

// ---------- tekstur batik (motif kawung) ----------
const batikCache = new Map()
const batikTexture = (base) => {
  if (batikCache.has(base)) return batikCache.get(base)
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const col = new THREE.Color(base)
  const dark = col.clone().offsetHSL(0, 0, col.getHSL({}).l > 0.5 ? -0.35 : 0.3)
  g.fillStyle = `#${col.getHexString()}`
  g.fillRect(0, 0, 128, 128)
  g.fillStyle = `#${dark.getHexString()}`
  g.strokeStyle = `#${dark.getHexString()}`
  g.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const cx = i * 32 + 16
      const cy = j * 32 + 16
      for (let k = 0; k < 4; k++) {
        g.save()
        g.translate(cx, cy)
        g.rotate((k * Math.PI) / 2 + Math.PI / 4)
        g.beginPath()
        g.ellipse(0, -8, 4.5, 7.5, 0, 0, Math.PI * 2)
        g.stroke()
        g.restore()
      }
      g.beginPath()
      g.arc(cx, cy, 2, 0, Math.PI * 2)
      g.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 2)
  batikCache.set(base, t)
  return t
}

// ---------- kepala & rambut ----------
function buildHead(look, skinMat) {
  const head = new THREE.Group()
  const hairMat = mat(look.hairColor, 0.55)
  const cewek = look.gender === 'cewek'

  const skull = mesh(new THREE.SphereGeometry(HEAD_R, 40, 30), skinMat, head)
  skull.scale.copy(HEAD_SCALE)

  if (look.hair !== 'hijab') {
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.SphereGeometry(0.055, 16, 12), skinMat, head, s * 0.262, -0.025, -0.01)
      ear.scale.set(0.55, 1, 0.8)
    }
  }

  // mata: iris coklat tua + pupil + dua titik kilau
  const eyes = []
  const irisMat = mat('#4a2c1c', 0.25)
  const pupilMat = mat('#1a0e09', 0.2)
  const shineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  const browMat = mat(look.hair === 'hijab' ? '#2a1d17' : new THREE.Color(look.hairColor).lerp(new THREE.Color('#231713'), 0.5), 0.6)
  for (const s of [-1, 1]) {
    const eye = new THREE.Group()
    const p = onHead(s * 0.37, -0.06, -0.012)
    eye.position.copy(p)
    eye.lookAt(p.clone().multiplyScalar(2))
    const iris = mesh(new THREE.SphereGeometry(0.058, 24, 18), irisMat, eye)
    iris.scale.set(0.95, 1.12, 0.32)
    const ring = mesh(new THREE.SphereGeometry(0.045, 20, 14), mat('#7a4a2e', 0.3), eye, 0, -0.012, 0.006)
    ring.scale.set(0.95, 0.9, 0.3)
    const pupil = mesh(new THREE.SphereGeometry(0.03, 16, 12), pupilMat, eye, 0, 0.004, 0.012)
    pupil.scale.set(1, 1.1, 0.3)
    mesh(new THREE.SphereGeometry(0.016, 10, 8), shineMat, eye, -0.018 * s, 0.024, 0.02)
    mesh(new THREE.SphereGeometry(0.007, 8, 6), shineMat, eye, 0.016 * s, -0.016, 0.02)
    if (cewek) {
      // bulu mata
      for (let k = 0; k < 3; k++) {
        const lash = mesh(new THREE.BoxGeometry(0.03, 0.008, 0.006), pupilMat, eye, s * (0.03 + k * 0.012), 0.058 - k * 0.006, 0.012)
        lash.rotation.z = s * (0.5 + k * 0.25)
      }
    }
    head.add(eye)
    eyes.push(eye)

    const brow = mesh(new THREE.CapsuleGeometry(cewek ? 0.006 : 0.008, 0.06, 4, 8), browMat, head)
    const bp = onHead(s * 0.36, 0.17, 0.002)
    brow.position.copy(bp)
    orient(brow, bp, new THREE.Vector3(0, s * 0.25, 0))
    brow.rotateZ(Math.PI / 2)
    brow.rotateY(s * 0.12)

    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.036, 20),
      new THREE.MeshBasicMaterial({ color: '#f19c98', transparent: true, opacity: 0.55, depthWrite: false }),
    )
    const cp = onHead(s * 0.55, -0.27, 0.004)
    cheek.position.copy(cp)
    cheek.lookAt(cp.clone().multiplyScalar(2))
    cheek.scale.y = 0.7
    head.add(cheek)
  }

  const nose = mesh(new THREE.SphereGeometry(0.016, 12, 10), mat('#f0b9a1', 0.6), head)
  nose.position.copy(onHead(0, -0.17, 0.004))
  const smile = new THREE.Mesh(
    new THREE.CircleGeometry(0.036, 24, Math.PI, Math.PI),
    new THREE.MeshStandardMaterial({ color: cewek ? '#a83f45' : '#8c3832', roughness: 0.6 }),
  )
  const sp = onHead(0, -0.33, 0.004)
  smile.position.copy(sp)
  smile.lookAt(sp.clone().multiplyScalar(2))
  smile.scale.y = 0.78
  head.add(smile)
  const teeth = new THREE.Mesh(new THREE.PlaneGeometry(0.056, 0.011), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }))
  teeth.position.set(0, -0.0065, 0.0008)
  smile.add(teeth)
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.017, 16, 0, Math.PI), mat('#e07b78', 0.6))
  tongue.position.set(0, -0.034, 0.0006)
  smile.add(tongue)

  const hair = new THREE.Group()
  head.add(hair)
  buildHair(look, hair, hairMat)
  return { head, eyes, smile }
}

const smoothstep = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// lubang bentuk oval/kotak-tumpul di koordinat (azimuth, elevasi) kepala
const oval = (a, b, c, p = 4) => (az, el) => Math.pow(Math.abs(az / a), p) + Math.pow(Math.abs((el - c) / b), p) < 1
const ovalPoint = (a, b, c, p, t) => {
  const ct = Math.cos(t)
  const st = Math.sin(t)
  return [a * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / p), c + b * Math.sign(st) * Math.pow(Math.abs(st), 2 / p)]
}

// "cangkang" rambut: bola yang dipotong bawahnya, dikasih lubang buat muka, dan
// bisa ngembang (flare). Hasilnya siluet rambut yang rapi & kebaca jelas walau kecil.
function hairShell({ r, bottom, hole, holeSpec, flare = () => 1, mat, rim = 0.02, seg = 64, rimMinEl = -Infinity, bottomRim = true }) {
  const group = new THREE.Group()
  const thetaMax = Math.PI / 2 - bottom
  const geo = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.6), 0, Math.PI * 2, 0, Math.min(Math.PI, thetaMax))
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  const toPoint = (az, el) => {
    const f = flare(az, el)
    return new THREE.Vector3(Math.sin(az) * Math.cos(el) * r * f * HEAD_SCALE.x, Math.sin(el) * r * f * HEAD_SCALE.y, Math.cos(az) * Math.cos(el) * r * f * HEAD_SCALE.z)
  }
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const p = toPoint(Math.atan2(v.x, v.z), Math.asin(Math.max(-1, Math.min(1, v.y))))
    pos.setXYZ(i, p.x, p.y, p.z)
  }
  // buang segitiga yang masuk lubang muka
  if (hole) {
    const idx = geo.index.array
    const keep = []
    const a = new THREE.Vector3()
    for (let i = 0; i < idx.length; i += 3) {
      a.set(0, 0, 0)
      for (let k = 0; k < 3; k++) a.add(v.fromBufferAttribute(pos, idx[i + k]))
      a.divide(HEAD_SCALE).normalize()
      if (!hole(Math.atan2(a.x, a.z), Math.asin(a.y))) keep.push(idx[i], idx[i + 1], idx[i + 2])
    }
    geo.setIndex(keep)
  }
  geo.computeVertexNormals()
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  group.add(m)

  // list tebal di tepi lubang & di ujung bawah biar nggak keliatan setipis kertas
  const addRim = (pts, closed) => {
    if (pts.length < 3) return
    const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), pts.length * 2, rim, 6, closed), mat)
    t.castShadow = true
    group.add(t)
  }
  if (holeSpec) {
    const [ha, hb, hc, hp] = holeSpec
    const pts = []
    for (let i = 0; i <= 96; i++) {
      const [az, el] = ovalPoint(ha, hb, hc, hp, -Math.PI / 2 + (i / 96) * Math.PI * 2)
      if (el > bottom + 0.03 && el > rimMinEl) pts.push(toPoint(az, el))
    }
    addRim(pts, false)
  }
  if (bottomRim && bottom > -Math.PI / 2 + 0.05) {
    const pts = []
    for (let i = 0; i <= 96; i++) {
      const az = (i / 96) * Math.PI * 2
      if (!hole || !hole(Math.atan2(Math.sin(az), Math.cos(az)), bottom + 0.02)) pts.push(toPoint(az, bottom + 0.01))
    }
    addRim(pts, pts.length > 95)
  }
  return group
}

const hairline = (az, { temple = -0.12, ear = 0.16, nape = -0.42 } = {}) => {
  const a = Math.abs(az)
  if (a < 1.05) return temple
  if (a < 1.32) return temple + (ear - temple) * smoothstep(1.05, 1.32, a)
  if (a < 1.85) return ear
  return ear + (nape - ear) * smoothstep(1.85, 2.35, a)
}

// rambut pendek: nempel ke kepala di garis rambut, ngembang ke ubun-ubun
const shortShell = (mat, face, H, { volume = 0.07, lift = 0.012, line = {} } = {}) =>
  hairShell({
    r: HEAD_R + lift,
    bottom: -0.45,
    hole: (az, el) => face(az, el) || el < hairline(az, line),
    holeSpec: H,
    rimMinEl: H[2] + H[1] * 0.55, // list cuma di garis poni, bukan di samping
    bottomRim: false,
    flare: (az, el) => 1 + volume * smoothstep(-0.1, 1.0, el),
    mat,
    rim: 0.018,
    seg: 112, // lebih halus biar garis rambut di sekitar telinga nggak bergerigi
  })

function buildHair(look, hair, hairMat) {
  // warna sedikit lebih gelap buat helai aksen, biar ada detail
  const shade = mat(new THREE.Color(look.hairColor).multiplyScalar(0.72), 0.55)
  hairMat.side = THREE.DoubleSide
  const strand = (pts, r0, r1, m = hairMat) => {
    const mm = new THREE.Mesh(tube(pts.map(([az, el, lift]) => onHead(az, el, lift)), r0, r1), m)
    mm.castShadow = true
    hair.add(mm)
  }
  const add = (o) => hair.add(o)

  switch (look.hair) {
    case 'cepak': {
      const H = [1.05, 0.8, -0.4, 6]
      add(shortShell(hairMat, oval(...H), H, { volume: 0.04, lift: 0.008, line: { ear: 0.2, nape: -0.35 } }))
      // jambul pendek di depan
      for (let i = 0; i < 7; i++) {
        const az = -0.6 + i * 0.2
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 8), i % 2 ? shade : hairMat)
        const p = onHead(az, 0.52, 0.02)
        tuft.position.copy(p)
        orient(tuft, p.clone().normalize(), new THREE.Vector3(0, 0.3, 1))
        tuft.rotateX(-0.6)
        add(tuft)
      }
      break
    }
    case 'poni': {
      const H = [0.95, 0.75, -0.45, 4]
      add(shortShell(hairMat, oval(...H), H, { volume: 0.08, lift: 0.016 }))
      // poni belah tengah, jatuh ke dua sisi sampai pelipis
      for (const s of [-1, 1]) {
        strand([[s * 0.04, 1.05, 0.04], [s * 0.42, 0.62, 0.06], [s * 0.82, 0.18, 0.03]], 0.075, 0.025)
        strand([[s * 0.2, 0.95, 0.045], [s * 0.6, 0.58, 0.055], [s * 0.98, 0.1, 0.03]], 0.06, 0.02, shade)
      }
      break
    }
    case 'bob':
    case 'panjang': {
      const long = look.hair === 'panjang'
      const H = [0.9, 1.0, -0.78, 4] // atas lubang di el 0.22 = garis poni
      add(
        hairShell({
          r: HEAD_R + 0.035,
          bottom: long ? -1.15 : -0.95,
          hole: oval(...H),
          holeSpec: H,
          flare: (az, el) => 1 + (long ? 0.2 : 0.17) * smoothstep(0.15, -0.85, el) - 0.05 * smoothstep(-0.8, -1.0, el),
          mat: hairMat,
          rim: 0.022,
        }),
      )
      // belahan & aksen di ubun-ubun
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) strand([[s * 0.08, 1.25, 0.045], [s * (0.5 + i * 0.35), 0.9, 0.05], [s * (0.9 + i * 0.45), 0.35, 0.045]], 0.035, 0.012, shade)
      if (long) {
        // rambut panjang di punggung
        const curtain = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.5, 40, 1, true, Math.PI - 1.9, 3.8), hairMat)
        curtain.position.set(0, -0.42, -0.03)
        curtain.scale.z = 0.92
        curtain.castShadow = true
        add(curtain)
        // dua helai depan di atas bahu
        for (const s of [-1, 1]) {
          const lock = new THREE.Mesh(
            tube([new THREE.Vector3(s * 0.25, -0.18, 0.06), new THREE.Vector3(s * 0.29, -0.42, 0.09), new THREE.Vector3(s * 0.27, -0.66, 0.08)], 0.06, 0.03, 0, 12),
            hairMat,
          )
          lock.castShadow = true
          add(lock)
        }
      }
      break
    }
    case 'kuncir': {
      const H = [1.0, 0.75, -0.4, 4]
      add(shortShell(hairMat, oval(...H), H, { volume: 0.05, lift: 0.016, line: { temple: -0.2, ear: 0.1, nape: -0.38 } }))
      // poni nyamping + helai pembingkai muka
      strand([[-0.55, 0.75, 0.04], [0.05, 0.5, 0.05], [0.62, 0.3, 0.025]], 0.065, 0.02)
      strand([[-0.35, 0.82, 0.04], [0.25, 0.6, 0.045], [0.78, 0.42, 0.02]], 0.05, 0.015, shade)
      for (const s of [-1, 1]) strand([[s * 1.0, 0.3, 0.03], [s * 1.08, -0.1, 0.04], [s * 1.05, -0.5, 0.03]], 0.035, 0.012)
      const base = onHead(Math.PI, 0.5, 0.03)
      const tail = new THREE.Mesh(
        tube([base, base.clone().add(new THREE.Vector3(0, 0.03, -0.1)), new THREE.Vector3(0, -0.15, -0.4), new THREE.Vector3(0, -0.5, -0.36)], 0.09, 0.025, 0, 20),
        hairMat,
      )
      tail.castShadow = true
      add(tail)
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 8, 18), mat('#d9534f', 0.5))
      tie.position.copy(base).add(new THREE.Vector3(0, 0.0, -0.05))
      tie.rotation.x = 0.5
      add(tie)
      break
    }
    case 'hijab': {
      const cloth = mat(look.hijabColor, 0.92, { side: THREE.DoubleSide })
      const H = [0.7, 0.5, -0.13, 2.6]
      add(
        hairShell({
          r: HEAD_R + 0.035,
          bottom: -Math.PI / 2,
          hole: oval(...H),
          holeSpec: H,
          flare: (az, el) => 1 + 0.08 * smoothstep(-0.3, -1.2, el),
          mat: cloth,
          rim: 0.026,
        }),
      )
      // jatuhan kain sampai dada, bentuknya kayak lonceng
      const prof = [
        [0.17, -0.2],
        [0.24, -0.29],
        [0.33, -0.4],
        [0.38, -0.5],
        [0.39, -0.56],
      ].map(([r, y]) => new THREE.Vector2(r, y))
      const drape = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), cloth)
      drape.scale.z = 0.85
      drape.castShadow = true
      add(drape)
      break
    }
    case 'mohawk': {
      const H = [1.05, 0.8, -0.4, 6]
      add(shortShell(hairMat, oval(...H), H, { volume: 0.02, lift: 0.005, line: { ear: 0.22, nape: -0.35 } }))
      const spikeCount = 8
      for (let i = 0; i < spikeCount; i++) {
        const t = i / (spikeCount - 1)
        const el = 0.55 - t * 0.95
        const p = onHead(0, el, 0.02)
        const spikeH = 0.16 + Math.sin(t * Math.PI) * 0.08
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.045, spikeH, 8), i % 2 === 0 ? hairMat : shade)
        cone.position.copy(p)
        orient(cone, p.clone().normalize(), new THREE.Vector3(0, 0.4, 1))
        cone.rotateX(-0.35)
        add(cone)
      }
      break
    }
    case 'afro': {
      const H = [0.85, 0.7, -0.4, 4]
      const afroBase = hairShell({
        r: HEAD_R + 0.06,
        bottom: -0.65,
        hole: oval(...H),
        holeSpec: H,
        flare: () => 1.25,
        mat: hairMat,
        rim: 0.03,
      })
      add(afroBase)
      for (let i = 0; i < 28; i++) {
        const az = -Math.PI + (i / 28) * Math.PI * 2
        const el = 0.1 + ((i * 17) % 7) * 0.12
        if (az > -0.6 && az < 0.6 && el < 0.45) continue
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.08 + (i % 3) * 0.015, 8, 6), i % 3 === 0 ? shade : hairMat)
        puff.position.copy(onHead(az, el, 0.09))
        add(puff)
      }
      break
    }
    case 'mangkok': {
      const H = [0.95, 0.65, -0.4, 4]
      add(
        hairShell({
          r: HEAD_R + 0.035,
          bottom: -0.3,
          hole: oval(...H),
          holeSpec: H,
          flare: (az, el) => 1 + 0.18 * smoothstep(0.4, -0.2, el),
          mat: hairMat,
          rim: 0.026,
        }),
      )
      for (let i = 0; i < 7; i++) {
        const az = -0.6 + i * 0.2
        strand([[az, 0.6, 0.03], [az, 0.25, 0.035]], 0.045, 0.035, i % 2 ? shade : hairMat)
      }
      break
    }
    case 'mullet': {
      const H = [1.05, 0.75, -0.38, 4]
      add(shortShell(hairMat, oval(...H), H, { volume: 0.06, lift: 0.014 }))
      for (let i = 0; i < 5; i++) {
        const az = -0.4 + i * 0.2
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 6), hairMat)
        const p = onHead(az, 0.55, 0.02)
        tuft.position.copy(p)
        orient(tuft, p.clone().normalize(), new THREE.Vector3(0, 0.3, 1))
        tuft.rotateX(-0.5)
        add(tuft)
      }
      const curtain = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.38, 24, 1, true, Math.PI - 1.4, 2.8), hairMat)
      curtain.position.set(0, -0.36, -0.06)
      curtain.scale.z = 0.85
      curtain.castShadow = true
      add(curtain)
      for (let k = -2; k <= 2; k++) {
        strand([[Math.PI + k * 0.25, -0.1, 0.04], [Math.PI + k * 0.22, -0.5, 0.05]], 0.05, 0.02, k % 2 ? shade : hairMat)
      }
      break
    }
    case 'jabrik': {
      const H = [1.05, 0.75, -0.4, 4]
      add(shortShell(hairMat, oval(...H), H, { volume: 0.06, lift: 0.01 }))
      const spikeDirs = [
        [-0.5, 0.7, 0.16], [0.5, 0.7, 0.16], [0, 0.85, 0.18],
        [-0.8, 0.45, 0.14], [0.8, 0.45, 0.14],
        [-0.3, 1.0, 0.2], [0.3, 1.0, 0.2],
        [-0.7, 0.9, 0.15], [0.7, 0.9, 0.15],
        [Math.PI - 0.4, 0.7, 0.15], [Math.PI + 0.4, 0.7, 0.15],
        [Math.PI, 0.9, 0.18],
      ]
      spikeDirs.forEach(([az, el, len], i) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.05, len, 8), i % 2 ? shade : hairMat)
        const p = onHead(az, el, 0.02)
        cone.position.copy(p)
        orient(cone, p.clone().normalize(), new THREE.Vector3(0, 1, 0))
        cone.rotateX(Math.PI / 2)
        add(cone)
      })
      break
    }
    case 'antena': {
      const H = [1.05, 0.75, -0.38, 4]
      add(shortShell(hairMat, oval(...H), H, { volume: 0.06, lift: 0.012 }))
      strand([[-0.4, 0.8, 0.04], [0.2, 0.55, 0.04], [0.6, 0.35, 0.02]], 0.06, 0.02)
      const ahogeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.28, 0.02),
        new THREE.Vector3(0.04, 0.4, 0.04),
        new THREE.Vector3(-0.06, 0.52, 0.02),
        new THREE.Vector3(0.08, 0.58, -0.04),
      ])
      const ahogeMesh = new THREE.Mesh(new THREE.TubeGeometry(ahogeCurve, 16, 0.016, 6, false), shade)
      ahogeMesh.castShadow = true
      add(ahogeMesh)
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#2ecc71', 0.6))
      leaf.position.set(0.08, 0.58, -0.04)
      leaf.scale.set(0.6, 1.2, 0.3)
      leaf.rotation.z = -0.5
      add(leaf)
      break
    }
    case 'botakProfesor': {
      const profShell = hairShell({
        r: HEAD_R + 0.025,
        bottom: -0.65,
        hole: (az, el) => el > 0.1 || (Math.abs(az) < 1.1 && el > -0.2),
        mat: hairMat,
        rim: 0.02,
      })
      add(profShell)
      for (const s of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), i % 2 ? shade : hairMat)
          puff.position.copy(onHead(s * (1.3 + (i % 2) * 0.25), -0.05 + Math.floor(i / 2) * 0.12, 0.04))
          puff.scale.set(1.1, 0.8, 1.2)
          add(puff)
        }
      }
      break
    }
    default: {
      // 'samping' -> gaya Ferdy: belah samping, poni nyapu ke kanan
      const H = [1.05, 0.75, -0.38, 4]
      add(shortShell(hairMat, oval(...H), H, { volume: 0.07, lift: 0.014 }))
      for (let i = 0; i <= 6; i++) {
        const t = i / 6
        strand(
          [
            [-0.85 + t * 0.55, 1.05 + Math.sin(t * Math.PI) * 0.1, 0.035],
            [-0.5 + t * 0.95, 0.74 - t * 0.08, 0.075 - t * 0.025],
            [-0.2 + t * 1.15, 0.38 - t * 0.14 + (i % 2) * 0.05, 0.02],
          ],
          0.068,
          0.012,
          i % 3 === 1 ? shade : hairMat,
        )
      }
      for (let i = 0; i < 4; i++) strand([[-0.8, 1.0 + i * 0.08, 0.03], [0.3 + i * 0.5, 1.2 - i * 0.05, 0.06], [1.3 + i * 0.5, 0.55 - i * 0.08, 0.025]], 0.055, 0.015, i % 2 ? shade : hairMat)
    }
  }
}

export class Player {
  constructor(look = DEFAULT_LOOK) {
    this.root = new THREE.Group()
    this.root.name = 'player'
    this.body = new THREE.Group()
    this.root.add(this.body)

    // bayangan bulat lembut di kaki (biar tetap kelihatan pas dinding transparan)
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.26, 24),
      new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false }),
    )
    blob.rotation.x = -Math.PI / 2
    blob.position.y = 0.02
    this.blob = blob
    this.root.add(blob)

    this.pos = this.root.position
    this.radius = 0.22
    this.facing = 0
    this.speed = 0
    this.phase = 0
    this.blinkT = 2
    this.action = null // { type, t, dur }
    this.carrying = null
    this.seat = null // kursi yang lagi didudukin
    this.pose = null // 'sleep' | 'shower' | 'cook'
    this.vy = 0
    this.isGrounded = true
    this.landingSquash = 1
    this.setLook(look)
  }

  setLook(look) {
    this.look = sanitizeLook(look)
    const L = this.look
    this.body.clear()
    this.body.rotation.set(0, 0, 0)

    const skin = mat(L.skin, 0.62)
    const topMat = L.top === 'batik' ? mat('#ffffff', 0.85, { map: batikTexture(L.topColor) }) : mat(L.topColor, L.top === 'hoodie' ? 0.95 : 0.85)
    const plainTop = mat(L.topColor, 0.85)
    const bottom = mat(L.bottomColor, 0.85)
    const shoe = mat(SHOE, 0.6)
    const rok = L.bottom === 'rok'
    const pendek = L.bottom === 'pendek'
    const shoeType = L.shoes || 'kets'
    const shoeMat = mat(L.shoeColor || '#1e1e20', shoeType === 'pantofel' ? 0.25 : 0.7, shoeType === 'pantofel' ? { metalness: 0.15 } : {})

    // kaki: paha + lutut + betis
    this.legs = []
    this.knees = []
    for (const s of [-1, 1]) {
      const hip = new THREE.Group()
      hip.position.set(s * 0.085, 0.42, 0)
      mesh(new THREE.CapsuleGeometry(0.073, 0.1, 6, 12), rok ? skin : bottom, hip, 0, -0.09, 0)
      const knee = new THREE.Group()
      knee.position.y = -0.19
      hip.add(knee)
      mesh(new THREE.CapsuleGeometry(0.068, 0.1, 6, 12), rok || pendek ? skin : bottom, knee, 0, -0.07, 0)

      if (shoeType === 'nyeker') {
        const foot = mesh(new THREE.SphereGeometry(0.075, 14, 10), skin, knee, 0, -0.19, 0.03)
        foot.scale.set(0.9, 0.55, 1.35)
        for (let j = 0; j < 5; j++) {
          const toe = mesh(new THREE.SphereGeometry(0.016, 8, 6), skin, knee, (j - 2) * 0.014 * s, -0.21, 0.125)
          toe.scale.set(0.9, 0.7, 1.1)
        }
      } else if (shoeType === 'sandal') {
        const foot = mesh(new THREE.SphereGeometry(0.074, 14, 10), skin, knee, 0, -0.18, 0.03)
        foot.scale.set(0.9, 0.55, 1.35)
        const sole = mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.018, 16), shoeMat, knee, 0, -0.216, 0.03)
        sole.scale.set(1, 1, 1.48)
        for (const side of [-1, 1]) {
          const strap = mesh(new THREE.BoxGeometry(0.012, 0.012, 0.08), shoeMat, knee, side * 0.032, -0.175, 0.04)
          strap.rotation.set(-0.35, side * 0.45, 0)
        }
        mesh(new THREE.SphereGeometry(0.012, 8, 6), shoeMat, knee, 0, -0.185, 0.085)
      } else if (shoeType === 'pantofel') {
        const sh = mesh(new THREE.SphereGeometry(0.08, 16, 12), shoeMat, knee, 0, -0.18, 0.035)
        sh.scale.set(0.92, 0.6, 1.5)
        const sole = mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.018, 16), mat('#121212', 0.5), knee, 0, -0.215, 0.035)
        sole.scale.set(0.98, 1, 1.52)
        mesh(new THREE.BoxGeometry(0.09, 0.02, 0.06), mat('#121212', 0.5), knee, 0, -0.22, -0.03)
      } else if (shoeType === 'boots') {
        mesh(new THREE.CylinderGeometry(0.074, 0.072, 0.12, 16), shoeMat, knee, 0, -0.12, 0)
        const sh = mesh(new THREE.SphereGeometry(0.084, 16, 12), shoeMat, knee, 0, -0.18, 0.035)
        sh.scale.set(0.98, 0.64, 1.48)
        const sole = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16), mat('#18181a', 0.9), knee, 0, -0.218, 0.035)
        sole.scale.set(1.02, 1, 1.5)
        mesh(new THREE.BoxGeometry(0.02, 0.018, 0.04), mat('#c9b06a', 0.3, { metalness: 0.8 }), knee, s * 0.075, -0.11, 0)
      } else {
        const sh = mesh(new THREE.SphereGeometry(0.08, 16, 12), shoeMat, knee, 0, -0.18, 0.03)
        sh.scale.set(0.95, 0.62, 1.45)
        const toeCap = mesh(new THREE.SphereGeometry(0.05, 12, 10), mat('#f5f4ef', 0.7), knee, 0, -0.185, 0.095)
        toeCap.scale.set(1.1, 0.7, 0.8)
        const sole = mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.022, 16), mat('#f5f4ef', 0.8), knee, 0, -0.215, 0.03)
        sole.scale.set(1, 1, 1.5)
        const laceMat = mat('#ffffff', 0.9)
        for (let l = 0; l < 3; l++) {
          mesh(new THREE.BoxGeometry(0.045, 0.008, 0.012), laceMat, knee, 0, -0.155 + l * 0.015, 0.03 + l * 0.018)
        }
      }

      this.body.add(hip)
      this.legs.push(hip)
      this.knees.push(knee)
    }

    // badan
    this.torso = new THREE.Group()
    this.torso.position.y = 0.42
    this.body.add(this.torso)
    const slim = L.gender === 'cewek' ? 0.94 : 1
    if (rok) {
      const skirt = mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.26, 24, 1, true), mat(L.bottomColor, 0.85, { side: THREE.DoubleSide }), this.torso, 0, -0.06, 0)
      skirt.scale.z = 0.85
    }
    const hips = mesh(new THREE.CylinderGeometry(0.165, 0.16, 0.12, 20), bottom, this.torso, 0, 0.05, 0)
    hips.scale.z = 0.82
    const chest = mesh(new THREE.CapsuleGeometry(0.168, 0.16, 8, 20), topMat, this.torso, 0, 0.25, 0)
    chest.scale.set(slim, 1, 0.8)
    const hem = mesh(new THREE.CylinderGeometry(0.172, 0.176, 0.06, 20), topMat, this.torso, 0, 0.12, 0)
    hem.scale.set(slim, 1, 0.82)

    if (L.top === 'kemeja' || L.top === 'batik') {
      const btn = mat('#e2e0da', 0.4)
      for (const y of [0.17, 0.25, 0.33, 0.41]) mesh(new THREE.SphereGeometry(0.011, 8, 6), btn, this.torso, 0, y, 0.138)
      mesh(new THREE.BoxGeometry(0.004, 0.3, 0.004), mat(new THREE.Color(L.topColor).multiplyScalar(0.88), 0.8), this.torso, 0.012, 0.27, 0.137)
      for (const s of [-1, 1]) {
        const collar = mesh(new THREE.BoxGeometry(0.09, 0.012, 0.075), plainTop, this.torso, s * 0.045, 0.485, 0.075)
        collar.rotation.set(0.55, s * -0.5, s * 0.35)
      }
      const band = mesh(new THREE.TorusGeometry(0.06, 0.02, 8, 20), plainTop, this.torso, 0, 0.5, 0)
      band.rotation.x = Math.PI / 2
    } else if (L.top === 'kaos') {
      const neck = mesh(new THREE.TorusGeometry(0.068, 0.014, 8, 20), mat(new THREE.Color(L.topColor).multiplyScalar(0.85), 0.85), this.torso, 0, 0.49, 0.01)
      neck.rotation.x = Math.PI / 2 - 0.15
    } else if (L.top === 'hoodie') {
      const dark = mat(new THREE.Color(L.topColor).multiplyScalar(0.85), 0.95)
      // kerah tudung yang tebal di sekeliling leher
      const collar = mesh(new THREE.TorusGeometry(0.085, 0.035, 10, 24), topMat, this.torso, 0, 0.49, -0.01)
      collar.rotation.x = Math.PI / 2 - 0.2
      collar.scale.set(1.1, 1, 1)
      // tudung rebah di punggung: bentuk solid (bukan setengah bola) biar nggak bolong
      const hood = mesh(new THREE.SphereGeometry(0.12, 24, 16), topMat, this.torso, 0, 0.4, -0.13)
      hood.scale.set(1.25, 0.95, 0.5)
      hood.rotation.x = 0.25
      const fold = mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 20, Math.PI), dark, this.torso, 0, 0.45, -0.17)
      fold.rotation.set(-0.6, 0, 0)
      const pocket = mesh(new THREE.BoxGeometry(0.2, 0.08, 0.02), dark, this.torso, 0, 0.2, 0.135)
      pocket.rotation.x = -0.1
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), mat('#f2efe8', 0.6), this.torso, s * 0.035, 0.42, 0.142)
    }
    mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.08, 14), skin, this.torso, 0, 0.53, 0)

    // tangan; kaos = lengan pendek
    this.arms = []
    const shortSleeve = L.top === 'kaos'
    for (const s of [-1, 1]) {
      const sh = new THREE.Group()
      sh.position.set(s * 0.185 * slim, 0.41, 0)
      sh.rotation.z = s * 0.12
      mesh(new THREE.SphereGeometry(0.056, 14, 10), topMat, sh, 0, -0.01, 0)
      if (shortSleeve) {
        mesh(new THREE.CapsuleGeometry(0.058, 0.06, 6, 12), topMat, sh, 0, -0.07, 0)
        mesh(new THREE.CapsuleGeometry(0.048, 0.12, 6, 12), skin, sh, 0, -0.17, 0)
      } else {
        mesh(new THREE.CapsuleGeometry(0.055, 0.17, 6, 12), topMat, sh, 0, -0.13, 0)
        mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.035, 14), plainTop, sh, 0, -0.245, 0)
      }
      mesh(new THREE.SphereGeometry(0.052, 14, 10), skin, sh, 0, -0.29, 0)
      this.torso.add(sh)
      this.arms.push(sh)
    }

    const { head, eyes } = buildHead(L, skin)
    this.head = head
    this.eyes = eyes
    head.position.y = 0.78
    this.torso.add(head)

    // gembor buat nyiram + spatula buat masak, disembunyiin dulu
    this.can = new THREE.Group()
    const canMat = mat('#4caf6e', 0.5)
    mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 16), canMat, this.can)
    const spout = mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.2, 8), canMat, this.can, 0, 0.04, 0.11)
    spout.rotation.x = 1.1
    this.can.position.set(0, -0.33, 0.06)
    this.can.visible = false
    this.arms[1].add(this.can)
    this.spatula = new THREE.Group()
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), mat('#6b4a33', 0.6), this.spatula, 0, -0.1, 0)
    mesh(new THREE.BoxGeometry(0.06, 0.07, 0.008), mat('#b9bdc2', 0.3, { metalness: 0.7 }), this.spatula, 0, -0.23, 0)
    this.spatula.position.set(0, -0.3, 0.03)
    this.spatula.visible = false
    this.arms[1].add(this.spatula)

    this.root.traverse((o) => {
      if (o.isMesh && o !== this.blob) o.castShadow = true
    })
  }

  play(type, dur = 1.4) {
    this.action = { type, t: 0, dur }
    this.can.visible = type === 'water'
  }

  update(dt, moveVec, running) {
    const k = 1 - Math.exp(-dt * 12)
    const target = moveVec.lengthSq() > 0.0001 ? (running ? 2.9 : 1.7) * Math.min(1, moveVec.length()) : 0
    if (this.action && target > 0) this.action = null
    this.speed += (target - this.speed) * k

    if (target > 0) {
      const want = Math.atan2(moveVec.x, moveVec.z)
      let diff = want - this.facing
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      this.facing += diff * Math.min(1, dt * 12)
    }
    this.root.rotation.y = this.facing

    // deteksi duduk di mobil & melayang di udara
    const inCar = !!this.seat?.inCar
    const inAir = !this.seat && !this.pose && !this.isGrounded
    this.isGrounded = !inAir
    const onMotor = !!this.seat?.onMotor
    const passenger = !!this.seat?.passenger
    this.body.scale.setScalar(inCar ? 0.8 : 1)
    this.body.rotation.z = onMotor ? (this.seat.lean || 0) : 0

    // animasi jalan
    const amt = Math.min(1, this.speed / 1.7)
    this.phase += dt * (4 + this.speed * 3.4)
    const sw = Math.sin(this.phase) * amt
    const lying = this.pose === 'sleep'
    const sit = this.seat && !lying ? 1 : 0
    const lk = 1 - Math.exp(-dt * 10)
    let legTarget = [sw * 0.7, -sw * 0.7]
    let kneeTarget = [Math.max(0, -sw) * 0.7 + 0.08 * amt, Math.max(0, sw) * 0.7 + 0.08 * amt]
    for (let i = 0; i < 2; i++) {
      let lt = legTarget[i]
      let kt = kneeTarget[i]
      if (sit) {
        if (onMotor) {
          lt = passenger ? -0.65 : -0.55
          kt = passenger ? 1.30 : 0.95
        } else if (inCar) {
          lt = -1.35
          kt = 1.25
        } else {
          lt = -Math.PI / 2
          kt = Math.PI / 2
        }
      } else if (lying) {
        lt = i ? 0.05 : -0.05
        kt = 0.05
      } else if (inAir) {
        if (this.vy > 0.2) {
          lt = i ? -0.42 : -0.32
          kt = i ? 0.85 : 0.75
        } else {
          lt = i ? 0.12 : -0.05
          kt = 0.22
        }
      }
      this.legs[i].rotation.z = onMotor ? (passenger ? (i ? 0.36 : -0.36) : (i ? 0.20 : -0.20)) : 0
      const smoothLeg = sit || lying || inAir
      this.legs[i].rotation.x += (lt - this.legs[i].rotation.x) * (smoothLeg ? lk : 1)
      this.knees[i].rotation.x += (kt - this.knees[i].rotation.x) * (smoothLeg ? lk : 1)
    }
    // rebahan: seluruh badan diputar telentang
    const lieTarget = lying ? -Math.PI / 2 : 0
    this.body.rotation.x += (lieTarget - this.body.rotation.x) * lk

    // bobbing jalan & efek pendaratan (squash lembut)
    const bob = inAir || lying || sit ? 0 : Math.abs(Math.cos(this.phase)) * 0.035 * amt
    this.landingSquash += (1 - this.landingSquash) * (1 - Math.exp(-dt * 12))
    const squashCrouch = (1 - this.landingSquash) * -0.06
    this.body.position.y = bob + (lying ? -0.18 : sit ? 0 : squashCrouch)
    this.head.position.z = lying ? 0.22 : 0

    this.torso.rotation.x = onMotor && !passenger ? 0.22 : this.speed > 2 ? 0.12 : 0.03 * amt
    for (const arm of this.arms) arm.scale.y = onMotor && !passenger ? 1.15 : 1
    this.torso.rotation.y = sw * 0.08

    let la = sw * 0.6
    let ra = -sw * 0.6
    let lz = 0.12
    let rz = -0.12
    let headPitch = 0
    let headYaw = 0
    let crouch = 0
    let eyesClosed = false

    // diam: napas pelan / squash & stretch loncat
    const t = performance.now() / 1000
    if (inAir) {
      if (this.vy > 0.3) {
        this.torso.scale.set(0.95, 1.08, 0.95)
      } else {
        this.torso.scale.set(1.02, 0.98, 1.02)
      }
    } else if (this.landingSquash < 0.999) {
      const s = this.landingSquash
      this.torso.scale.set(1 + (1 - s) * 0.35, s, 1 + (1 - s) * 0.35)
    } else if (amt < 0.1) {
      this.torso.scale.y = 1 + Math.sin(t * 2.2) * (lying ? 0.015 : 0.008)
      this.torso.scale.x = this.torso.scale.z = 1
      headPitch = Math.sin(t * 0.7) * 0.03
    } else {
      this.torso.scale.set(1, 1, 1)
    }

    if (inAir && !this.action && !this.carrying && !this.pose && !sit) {
      // dua tangan keangkat sedikit ke samping-atas buat jaga keseimbangan
      la = this.vy > 0.2 ? -1.25 : -0.85
      ra = this.vy > 0.2 ? -1.25 : -0.85
      lz = this.vy > 0.2 ? 0.55 : 0.38
      rz = this.vy > 0.2 ? -0.55 : -0.38
      headPitch = this.vy > 0.2 ? -0.15 : 0.1
    }

    if (this.action) {
      const a = this.action
      a.t += dt
      const p = a.t / a.dur
      if (a.type === 'pet') {
        crouch = Math.sin(Math.min(1, p) * Math.PI) * 0.12
        ra = -0.9 + Math.sin(a.t * 9) * 0.18
        rz = -0.25
        headPitch = 0.35
      } else if (a.type === 'water') {
        ra = -1.0
        rz = -0.1
        headPitch = 0.3
      } else if (a.type === 'harvest' || a.type === 'pick') {
        crouch = Math.sin(Math.min(1, p) * Math.PI) * 0.18
        ra = la = -0.8 * Math.sin(Math.min(1, p) * Math.PI)
        headPitch = 0.4
      } else if (a.type === 'wave') {
        ra = -2.6
        rz = -0.3 + Math.sin(a.t * 12) * 0.25
      } else if (a.type === 'honk') {
        ra = -1.2
        rz = -0.15
      } else if (a.type === 'dress') {
        // muter badan pas ganti baju
        this.torso.rotation.y = Math.sin(p * Math.PI * 2) * 0.6
        la = ra = -0.4
      }
      if (a.t >= a.dur) {
        this.action = null
        this.can.visible = false
      }
    }

    if (this.pose === 'shower') {
      // keramas: dua tangan di kepala, gosok-gosok
      la = -2.7 + Math.sin(t * 9) * 0.15
      ra = -2.7 + Math.cos(t * 9) * 0.15
      lz = 0.45
      rz = -0.45
      headPitch = -0.15
      eyesClosed = true
    } else if (this.pose === 'cook') {
      // ngaduk wajan
      ra = -1.05 + Math.sin(t * 6) * 0.15
      rz = -0.25 + Math.cos(t * 6) * 0.12
      la = -0.7
      lz = 0.3
      headPitch = 0.35
    } else if (lying) {
      la = ra = -0.1
      lz = 0.2
      rz = -0.2
      headYaw = 0.25
      eyesClosed = true
    }
    this.spatula.visible = this.pose === 'cook'
    this.blob.visible = !lying && !sit
    if (this.blob.visible) {
      this.blob.position.y = 0.02 - this.pos.y
      const h = Math.max(0, this.pos.y)
      const s = Math.max(0.42, 1 - h * 0.45)
      this.blob.scale.set(s, s, 1)
      if (this.blob.material) {
        this.blob.material.opacity = Math.max(0.04, 0.18 - h * 0.08)
      }
    }

    if (inCar && !this.action) {
      if (passenger) {
        la = ra = -0.75
        lz = 0.22
        rz = -0.22
        headPitch = 0.04
      } else {
        // dua tangan pegang setir mobil di depan
        la = ra = -1.25
        lz = 0.18
        rz = -0.18
        headPitch = 0.06
      }
    } else if (onMotor && !this.action) {
      if (passenger) {
        // membonceng di belakang: tangan memegang pinggang pengendara
        la = ra = -0.85
        lz = 0.18
        rz = -0.18
        headPitch = 0.02
      } else {
        // mengendarai motor: dua tangan memegang stang (handlebar grip)
        la = ra = -1.18
        lz = 0.28
        rz = -0.28
        headPitch = -0.08
      }
    } else if (this.seat && !this.action && !this.pose) {
      // tangan istirahat di pangkuan
      la = ra = -0.75
      lz = 0.22
      rz = -0.22
      headPitch = 0.05
    }

    if (this.carrying) {
      la = ra = -1.05
      lz = 0.45
      rz = -0.45
    }

    const ak = 1 - Math.exp(-dt * 14)
    this.arms[0].rotation.x += (la - this.arms[0].rotation.x) * ak
    this.arms[1].rotation.x += (ra - this.arms[1].rotation.x) * ak
    this.arms[0].rotation.z += (lz - this.arms[0].rotation.z) * ak
    this.arms[1].rotation.z += (rz - this.arms[1].rotation.z) * ak
    this.body.position.y -= crouch
    this.head.rotation.x += (headPitch - this.head.rotation.x) * ak
    this.head.rotation.y += (headYaw - this.head.rotation.y) * ak

    // kedip
    this.blinkT -= dt
    let eyeY = 1
    if (this.blinkT < 0.12 || eyesClosed) eyeY = 0.1
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3
    for (const e of this.eyes) e.scale.y = eyeY
  }

  // posisi lengan buat gendong kucing (koordinat dunia)
  carryAnchor(out) {
    out.set(0, 0.62, 0.26)
    return this.root.localToWorld(out)
  }

  headWorld(out = new THREE.Vector3()) {
    return this.head.getWorldPosition(out)
  }
}
