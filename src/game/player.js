import * as THREE from 'three'

// Karakter chibi, dibikin mirip avatar di portfolio:
// rambut hitam belah samping, mata coklat besar, pipi merona, kemeja putih.

const SKIN = '#f6d9c4'
const HAIR = '#171515'
const SHIRT = '#f7f6f2'
const PANTS = '#2f3742'
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

function buildHead(skinMat) {
  const head = new THREE.Group()
  const hairMat = mat(HAIR, 0.55)

  const skull = mesh(new THREE.SphereGeometry(HEAD_R, 40, 30), skinMat, head)
  skull.scale.copy(HEAD_SCALE)

  // telinga
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.055, 16, 12), skinMat, head, s * 0.262, -0.025, -0.01)
    ear.scale.set(0.55, 1, 0.8)
  }

  // mata: iris coklat tua + pupil + dua titik kilau
  const eyes = []
  const irisMat = mat('#4a2c1c', 0.25)
  const pupilMat = mat('#1a0e09', 0.2)
  const shineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' })
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
    head.add(eye)
    eyes.push(eye)

    // alis tipis
    const brow = mesh(new THREE.CapsuleGeometry(0.008, 0.06, 4, 8), mat('#231713', 0.6), head)
    const bp = onHead(s * 0.36, 0.17, 0.002)
    brow.position.copy(bp)
    orient(brow, bp, new THREE.Vector3(0, s * 0.25, 0))
    brow.rotateZ(Math.PI / 2)
    brow.rotateY(s * 0.12)

    // pipi merona
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

  // hidung & senyum lebar (mulut setengah lingkaran + gigi)
  const nose = mesh(new THREE.SphereGeometry(0.016, 12, 10), mat('#f0b9a1', 0.6), head)
  nose.position.copy(onHead(0, -0.17, 0.004))
  const smile = new THREE.Mesh(
    new THREE.CircleGeometry(0.036, 24, Math.PI, Math.PI),
    new THREE.MeshStandardMaterial({ color: '#8c3832', roughness: 0.6 }),
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

  // ---- rambut ----
  // dasar rambut (topi bulat) + helai-helai tube yang ngikutin lengkung kepala
  const hair = new THREE.Group()
  head.add(hair)
  const cap = mesh(new THREE.SphereGeometry(HEAD_R + 0.016, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat, hair)
  cap.scale.copy(HEAD_SCALE).multiplyScalar(1.02)
  cap.rotation.x = -0.42
  cap.position.set(0, 0.01, -0.012)

  const c = new THREE.Vector3()
  const v = new THREE.Vector3()
  const strand = (pts, r0, r1) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([az, el, lift]) => onHead(az, el, lift)))
    const segs = 18
    const radial = 7
    const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false)
    const pos = geo.attributes.position
    for (let i = 0; i <= segs; i++) {
      const t = i / segs
      curve.getPointAt(t, c)
      const n = c.clone().normalize()
      // tebal di pangkal, lancip di ujung, agak pipih ke arah kulit kepala
      const r = r1 + (r0 - r1) * Math.pow(1 - t, 0.8) * (t < 0.08 ? 0.6 + t * 5 : 1)
      for (let j = 0; j <= radial; j++) {
        const idx = i * (radial + 1) + j
        v.fromBufferAttribute(pos, idx).sub(c)
        const along = v.dot(n)
        v.addScaledVector(n, -along * 0.45).multiplyScalar(r).add(c)
        pos.setXYZ(idx, v.x, v.y, v.z)
      }
    }
    geo.computeVertexNormals()
    const m = new THREE.Mesh(geo, hairMat)
    m.castShadow = true
    hair.add(m)
  }

  // poni: nyapu dari belahan kiri atas ke kanan bawah, ujungnya sampai alis
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
  // ubun-ubun ke kanan belakang
  for (let i = 0; i <= 7; i++) {
    const t = i / 7
    strand(
      [
        [-0.85 + t * 0.1, 0.95 + t * 0.3, 0.03],
        [0.4 + t * 1.2, 1.25 - t * 0.1, 0.06],
        [1.3 + t * 1.6, 0.55 - t * 0.25, 0.02],
      ],
      0.05,
      0.01,
    )
  }
  // sisi kiri (belahan)
  for (let i = 0; i < 5; i++) {
    strand(
      [
        [-0.85 - i * 0.05, 0.92, 0.03],
        [-1.15 - i * 0.3, 0.6, 0.04],
        [-1.3 - i * 0.35, 0.12 - i * 0.05, 0.014],
      ],
      0.045,
      0.008,
    )
  }
  // sisi kanan di atas telinga
  for (let i = 0; i < 4; i++) {
    strand(
      [
        [0.75 + i * 0.22, 0.85, 0.03],
        [1.0 + i * 0.22, 0.5, 0.045],
        [1.15 + i * 0.25, 0.05, 0.014],
      ],
      0.045,
      0.008,
    )
  }
  // belakang sampai tengkuk
  for (let i = 0; i < 7; i++) {
    const az = 2.2 + i * 0.32
    strand(
      [
        [az, 1.15, 0.03],
        [az, 0.6, 0.042],
        [az + 0.1, -0.35, 0.016],
      ],
      0.05,
      0.012,
    )
  }

  return { head, eyes, smile }
}

export class Player {
  constructor() {
    this.root = new THREE.Group()
    this.root.name = 'player'
    this.body = new THREE.Group()
    this.root.add(this.body)

    const skin = mat(SKIN, 0.62)
    const shirt = mat(SHIRT, 0.85)
    const pants = mat(PANTS, 0.85)
    const shoe = mat(SHOE, 0.6)

    // kaki
    this.legs = []
    for (const s of [-1, 1]) {
      const hip = new THREE.Group()
      hip.position.set(s * 0.085, 0.42, 0)
      mesh(new THREE.CapsuleGeometry(0.072, 0.24, 6, 12), pants, hip, 0, -0.17, 0)
      const sh = mesh(new THREE.SphereGeometry(0.08, 16, 12), shoe, hip, 0, -0.37, 0.03)
      sh.scale.set(0.95, 0.62, 1.45)
      const sole = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16), mat('#f2efe8', 0.8), hip, 0, -0.405, 0.03)
      sole.scale.set(1, 1, 1.5)
      this.body.add(hip)
      this.legs.push(hip)
    }

    // badan
    this.torso = new THREE.Group()
    this.torso.position.y = 0.42
    this.body.add(this.torso)
    const hips = mesh(new THREE.CylinderGeometry(0.165, 0.16, 0.12, 20), pants, this.torso, 0, 0.05, 0)
    hips.scale.z = 0.82
    const chest = mesh(new THREE.CapsuleGeometry(0.168, 0.16, 8, 20), shirt, this.torso, 0, 0.25, 0)
    chest.scale.z = 0.8
    // ujung kemeja
    const hem = mesh(new THREE.CylinderGeometry(0.172, 0.176, 0.06, 20), shirt, this.torso, 0, 0.12, 0)
    hem.scale.z = 0.82
    // kancing & belahan
    const btn = mat('#e2e0da', 0.4)
    for (const y of [0.17, 0.25, 0.33, 0.41]) mesh(new THREE.SphereGeometry(0.011, 8, 6), btn, this.torso, 0, y, 0.138)
    mesh(new THREE.BoxGeometry(0.004, 0.3, 0.004), mat('#dcdad3', 0.8), this.torso, 0.012, 0.27, 0.137)
    // kerah
    for (const s of [-1, 1]) {
      const collar = mesh(new THREE.BoxGeometry(0.09, 0.012, 0.075), shirt, this.torso, s * 0.045, 0.485, 0.075)
      collar.rotation.set(0.55, s * -0.5, s * 0.35)
    }
    const band = mesh(new THREE.TorusGeometry(0.06, 0.02, 8, 20), shirt, this.torso, 0, 0.5, 0.0)
    band.rotation.x = Math.PI / 2
    mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.08, 14), skin, this.torso, 0, 0.53, 0)

    // tangan
    this.arms = []
    for (const s of [-1, 1]) {
      const sh = new THREE.Group()
      sh.position.set(s * 0.185, 0.41, 0)
      sh.rotation.z = s * 0.12
      mesh(new THREE.SphereGeometry(0.056, 14, 10), shirt, sh, 0, -0.01, 0)
      mesh(new THREE.CapsuleGeometry(0.055, 0.17, 6, 12), shirt, sh, 0, -0.13, 0)
      mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.035, 14), shirt, sh, 0, -0.245, 0)
      mesh(new THREE.SphereGeometry(0.052, 14, 10), skin, sh, 0, -0.29, 0)
      this.torso.add(sh)
      this.arms.push(sh)
    }

    // kepala
    const { head, eyes } = buildHead(skin)
    this.head = head
    this.eyes = eyes
    head.position.y = 0.78
    this.torso.add(head)

    // bayangan bulat lembut di kaki (biar tetap kelihatan pas dinding transparan)
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.26, 24),
      new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false }),
    )
    blob.rotation.x = -Math.PI / 2
    blob.position.y = 0.02
    this.root.add(blob)

    // gembor buat nyiram, disembunyiin dulu
    this.can = new THREE.Group()
    const canMat = mat('#4caf6e', 0.5)
    mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 16), canMat, this.can)
    const spout = mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.2, 8), canMat, this.can, 0, 0.04, 0.11)
    spout.rotation.x = 1.1
    this.can.position.set(0, -0.33, 0.06)
    this.can.visible = false
    this.arms[1].add(this.can)

    this.pos = this.root.position
    this.radius = 0.22
    this.facing = 0
    this.speed = 0
    this.phase = 0
    this.blinkT = 2
    this.action = null // { type, t, dur }
    this.carrying = null
    this.lookTarget = null
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
    this.legs[0].rotation.x = sw * 0.7
    this.legs[1].rotation.x = -sw * 0.7
    this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.035 * amt
    this.torso.rotation.x = this.speed > 2 ? 0.12 : 0.03 * amt
    this.torso.rotation.y = sw * 0.08

    let la = sw * 0.6
    let ra = -sw * 0.6
    let lz = 0.12
    let rz = -0.12
    let headPitch = 0
    let crouch = 0

    // diam: napas pelan
    const t = performance.now() / 1000
    if (amt < 0.1) {
      this.torso.scale.y = 1 + Math.sin(t * 2.2) * 0.008
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
      }
      if (a.t >= a.dur) {
        this.action = null
        this.can.visible = false
      }
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

    // kedip
    this.blinkT -= dt
    let eyeY = 1
    if (this.blinkT < 0.12) eyeY = 0.12
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3
    for (const e of this.eyes) e.scale.y = eyeY
  }

  // posisi lengan buat gendong kucing (koordinat dunia)
  carryAnchor(out) {
    out.set(0, 0.62, 0.26)
    return this.root.localToWorld(out)
  }
}
