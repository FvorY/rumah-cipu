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
  ],
  hairColor: ['#171515', '#3b2a20', '#6b4a2f', '#a8763e', '#8c2f2f', '#c9c2b8'],
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
}

export const PRESETS = {
  cowok: { ...DEFAULT_LOOK },
  cewek: { ...DEFAULT_LOOK, gender: 'cewek', hair: 'panjang', hairColor: '#3b2a20', top: 'kaos', topColor: '#c38bb5', bottom: 'rok', bottomColor: '#4a5f7a' },
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

function buildHair(look, hair, hairMat) {
  const strand = (pts, r0, r1) => {
    const m = new THREE.Mesh(tube(pts.map(([az, el, lift]) => onHead(az, el, lift)), r0, r1), hairMat)
    m.castShadow = true
    hair.add(m)
  }
  const cap = (extra = 0.016, tilt = -0.42, cover = 0.56) => {
    const m = mesh(new THREE.SphereGeometry(HEAD_R + extra, 40, 24, 0, Math.PI * 2, 0, Math.PI * cover), hairMat, hair)
    m.scale.copy(HEAD_SCALE).multiplyScalar(1.02)
    m.rotation.x = tilt
    m.position.set(0, 0.01, -0.012)
    return m
  }
  const back = (len = -0.35, n = 7, lift = 0.042) => {
    for (let i = 0; i < n; i++) {
      const az = 2.2 + (i * 1.9) / (n - 1)
      strand([[az, 1.15, 0.03], [az, 0.6, lift], [az + 0.1, len, lift * 0.4]], 0.05, 0.012)
    }
  }

  switch (look.hair) {
    case 'cepak': {
      cap(0.01, -0.3, 0.55)
      for (let i = 0; i <= 8; i++) {
        const az = -0.75 + (i / 8) * 1.5
        strand([[az, 0.95, 0.018], [az + 0.05, 0.72, 0.022], [az + 0.08, 0.55, 0.012]], 0.035, 0.006)
      }
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) strand([[s * (0.9 + i * 0.3), 0.8, 0.015], [s * (1.0 + i * 0.3), 0.3, 0.012]], 0.03, 0.006)
      back(0.05, 6, 0.02)
      break
    }
    case 'poni': {
      cap()
      for (const s of [-1, 1]) {
        for (let i = 0; i <= 5; i++) {
          const t = i / 5
          strand([[s * 0.05, 1.15, 0.03], [s * (0.15 + t * 0.6), 0.75, 0.065], [s * (0.3 + t * 0.75), 0.3 - t * 0.1, 0.016]], 0.05, 0.006)
        }
        for (let i = 0; i < 4; i++) strand([[s * (0.75 + i * 0.22), 0.85, 0.03], [s * (1.0 + i * 0.22), 0.5, 0.045], [s * (1.15 + i * 0.25), 0.05, 0.014]], 0.045, 0.008)
      }
      back()
      break
    }
    case 'bob':
    case 'panjang': {
      cap(0.02)
      // poni rata
      for (let i = 0; i <= 10; i++) {
        const az = -0.85 + (i / 10) * 1.7
        strand([[az * 0.6, 1.05, 0.035], [az, 0.62, 0.05], [az, 0.27 + Math.abs(az) * 0.05, 0.018]], 0.05, 0.012)
      }
      // samping & belakang sampai rahang, makin bawah makin ngembang
      const low = look.hair === 'panjang' ? -0.75 : -0.5
      for (let i = 0; i < 16; i++) {
        const az = (i % 2 ? 1 : -1) * (0.95 + Math.floor(i / 2) * 0.3)
        strand([[az, 1.0, 0.03], [az, 0.3, 0.06], [az * 1.02, low, 0.09]], 0.06, 0.02)
      }
      if (look.hair === 'panjang') {
        // tirai rambut panjang di punggung
        const curtain = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.28, 0.55, 28, 1, true, Math.PI - 1.75, 3.5), hairMat)
        curtain.material = hairMat.clone()
        curtain.material.side = THREE.DoubleSide
        curtain.position.set(0, -0.3, -0.02)
        curtain.castShadow = true
        hair.add(curtain)
      }
      break
    }
    case 'kuncir': {
      cap(0.016, -0.35)
      for (let i = 0; i <= 7; i++) {
        const t = i / 7
        strand([[-0.8 + t * 0.5, 1.0, 0.03], [-0.5 + t * 0.9, 0.7, 0.05], [-0.25 + t * 1.1, 0.35, 0.016]], 0.05, 0.008)
      }
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) strand([[s * (0.8 + i * 0.3), 0.9, 0.028], [s * (1.1 + i * 0.35), 0.5, 0.035], [s * (1.5 + i * 0.35), 0.35, 0.025]], 0.045, 0.01)
      back(0.25, 7, 0.03)
      const base = onHead(Math.PI, 0.45, 0.03)
      const tail = new THREE.Mesh(
        tube([base, base.clone().add(new THREE.Vector3(0, 0.02, -0.1)), new THREE.Vector3(0, -0.2, -0.38), new THREE.Vector3(0, -0.5, -0.34)], 0.075, 0.02, 0, 20),
        hairMat,
      )
      tail.castShadow = true
      hair.add(tail)
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 16), mat('#d9534f', 0.5))
      tie.position.copy(base).add(new THREE.Vector3(0, 0.0, -0.04))
      tie.rotation.x = 0.4
      hair.add(tie)
      break
    }
    case 'hijab': {
      const cloth = mat(look.hijabColor, 0.9, { side: THREE.DoubleSide })
      const r = HEAD_R + 0.025
      const top = mesh(new THREE.SphereGeometry(r, 36, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), cloth, hair)
      top.scale.copy(HEAD_SCALE).multiplyScalar(1.03)
      // sisi kepala, bagian muka dibiarin terbuka
      const sides = mesh(new THREE.SphereGeometry(r, 36, 16, Math.PI / 2 + 0.78, Math.PI * 2 - 1.56, Math.PI * 0.4, Math.PI * 0.48), cloth, hair)
      sides.scale.copy(HEAD_SCALE).multiplyScalar(1.03)
      const chin = mesh(new THREE.SphereGeometry(r, 36, 8, 0, Math.PI * 2, Math.PI * 0.86, Math.PI * 0.14), cloth, hair)
      chin.scale.copy(HEAD_SCALE).multiplyScalar(1.03)
      // list kain di sekeliling wajah
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 28), cloth)
      rim.position.set(0, -0.06, 0.18)
      rim.scale.set(0.95, 1.2, 1)
      rim.rotation.x = -0.12
      hair.add(rim)
      // jatuhan kain sampai bahu
      const drape = mesh(new THREE.CylinderGeometry(0.2, 0.36, 0.3, 32, 1, true), cloth, hair, 0, -0.33, -0.01)
      drape.scale.z = 0.85
      break
    }
    default: {
      // 'samping' -> gaya Ferdy
      cap()
      for (let i = 0; i <= 8; i++) {
        const t = i / 8
        strand(
          [
            [-0.9 + t * 0.6, 1.05 + Math.sin(t * Math.PI) * 0.1, 0.03],
            [-0.55 + t * 1.0, 0.74 - t * 0.08, 0.07 - t * 0.025],
            [-0.25 + t * 1.2, 0.36 - t * 0.14 + (i % 2) * 0.05, 0.016],
          ],
          0.055,
          0.006,
        )
      }
      for (let i = 0; i <= 7; i++) {
        const t = i / 7
        strand([[-0.85 + t * 0.1, 0.95 + t * 0.3, 0.03], [0.4 + t * 1.2, 1.25 - t * 0.1, 0.06], [1.3 + t * 1.6, 0.55 - t * 0.25, 0.02]], 0.05, 0.01)
      }
      for (let i = 0; i < 5; i++) strand([[-0.85 - i * 0.05, 0.92, 0.03], [-1.15 - i * 0.3, 0.6, 0.04], [-1.3 - i * 0.35, 0.12 - i * 0.05, 0.014]], 0.045, 0.008)
      for (let i = 0; i < 4; i++) strand([[0.75 + i * 0.22, 0.85, 0.03], [1.0 + i * 0.22, 0.5, 0.045], [1.15 + i * 0.25, 0.05, 0.014]], 0.045, 0.008)
      back()
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
      const sh = mesh(new THREE.SphereGeometry(0.08, 16, 12), shoe, knee, 0, -0.18, 0.03)
      sh.scale.set(0.95, 0.62, 1.45)
      const sole = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16), mat('#f2efe8', 0.8), knee, 0, -0.215, 0.03)
      sole.scale.set(1, 1, 1.5)
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
      const hood = mesh(new THREE.TorusGeometry(0.12, 0.05, 10, 20, Math.PI * 1.2), topMat, this.torso, 0, 0.5, -0.06)
      hood.rotation.set(Math.PI / 2 + 0.25, 0, Math.PI * 1.4)
      const pocket = mesh(new THREE.BoxGeometry(0.2, 0.08, 0.02), mat(new THREE.Color(L.topColor).multiplyScalar(0.85), 0.9), this.torso, 0, 0.2, 0.135)
      pocket.rotation.x = -0.1
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), mat('#f2efe8', 0.6), this.torso, s * 0.035, 0.42, 0.14)
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

    // animasi jalan
    const amt = Math.min(1, this.speed / 1.7)
    this.phase += dt * (4 + this.speed * 3.4)
    const sw = Math.sin(this.phase) * amt
    const sit = this.seat ? 1 : 0
    const lying = this.pose === 'sleep'
    const lk = 1 - Math.exp(-dt * 10)
    const legTarget = [sw * 0.7, -sw * 0.7]
    const kneeTarget = [Math.max(0, -sw) * 0.7 + 0.08 * amt, Math.max(0, sw) * 0.7 + 0.08 * amt]
    for (let i = 0; i < 2; i++) {
      let lt = legTarget[i]
      let kt = kneeTarget[i]
      if (sit) {
        lt = -1.5 + (i ? 0.08 : -0.08)
        kt = 1.45
      } else if (lying) {
        lt = i ? 0.05 : -0.05
        kt = 0.05
      }
      const smoothLeg = sit || lying
      this.legs[i].rotation.x += (lt - this.legs[i].rotation.x) * (smoothLeg ? lk : 1)
      this.knees[i].rotation.x += (kt - this.knees[i].rotation.x) * (smoothLeg ? lk : 1)
    }
    // rebahan: seluruh badan diputar telentang
    const lieTarget = lying ? -Math.PI / 2 : 0
    this.body.rotation.x += (lieTarget - this.body.rotation.x) * lk
    this.body.position.y = lying ? 0 : Math.abs(Math.cos(this.phase)) * 0.035 * amt
    this.torso.rotation.x = this.speed > 2 ? 0.12 : 0.03 * amt
    this.torso.rotation.y = sw * 0.08

    let la = sw * 0.6
    let ra = -sw * 0.6
    let lz = 0.12
    let rz = -0.12
    let headPitch = 0
    let headYaw = 0
    let crouch = 0
    let eyesClosed = false

    // diam: napas pelan
    const t = performance.now() / 1000
    if (amt < 0.1) {
      this.torso.scale.y = 1 + Math.sin(t * 2.2) * (lying ? 0.015 : 0.008)
      headPitch = Math.sin(t * 0.7) * 0.03
    } else this.torso.scale.y = 1

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

    if (this.seat && !this.action && !this.pose) {
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
