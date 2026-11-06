import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { plateTexture } from './textures'
import { M } from './furniture'
import { vehicleSeat } from './vehicle'

// Honda Vario 150 keyless (low-poly), parkir pakai standar samping di teras.
// Lokal: depan = +z, kiri pengendara = +x. Panjang ~1.92m.

const PAINT = '#1e1f22' // exclusive matte black
const ACCENT = '#c4232f'

const rbox = (w, h, d, mat, r = 0.03) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}
const place = (m, x, y, z, rx = 0, ry = 0, rz = 0) => {
  m.position.set(x, y, z)
  m.rotation.set(rx, ry, rz)
  return m
}
const cyl = (r1, r2, h, mat, seg = 14) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat)
  m.castShadow = true
  return m
}

const wheel = (r = 0.25) => {
  const g = new THREE.Group()
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r - 0.05, 0.05, 10, 28), M('#18181a', 0.85))
  tire.rotation.y = Math.PI / 2
  tire.scale.z = 1.15
  tire.castShadow = true
  g.add(tire)
  const rimMat = M('#2a2b2e', 0.35, { metalness: 0.6 })
  const rim = cyl(r - 0.07, r - 0.07, 0.05, rimMat, 20)
  rim.rotation.z = Math.PI / 2
  g.add(rim)
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, (r - 0.07) * 2, 0.025), M('#3a3b3f', 0.3, { metalness: 0.6 }))
    s.rotation.x = (i / 5) * Math.PI
    s.rotation.y = Math.PI / 2
    g.add(s)
  }
  // cakram rem
  const disc = cyl(0.11, 0.11, 0.006, M('#b9bdc2', 0.25, { metalness: 0.9 }), 20)
  disc.rotation.z = Math.PI / 2
  disc.position.x = 0.035
  g.add(disc)
  return g
}

export function buildMotor(scene, physics, { x = 4.3, z = 3.3 } = {}) {
  const root = new THREE.Group()
  root.name = 'vario150'
  const bike = new THREE.Group()
  bike.name = 'bike'
  root.add(bike)

  const paint = M(PAINT, 0.55, { metalness: 0.15 })
  const accent = M(ACCENT, 0.3, { metalness: 0.2 })
  const black = M('#151517', 0.7)
  const silver = M('#9ea3a8', 0.3, { metalness: 0.7 })
  const seatMat = M('#1a1a1c', 0.85)

  const R = 0.25
  const wf = wheel(R)
  wf.position.set(0, R, 0.64)
  bike.add(wf)
  const wr = wheel(R)
  wr.position.set(0, R, -0.64)
  bike.add(wr)

  // spakbor depan + garpu
  const fender = new THREE.Mesh(new THREE.TorusGeometry(R + 0.03, 0.045, 6, 16, Math.PI * 0.75), paint)
  fender.rotation.set(0, Math.PI / 2, Math.PI * 0.18)
  fender.position.set(0, R, 0.64)
  fender.scale.z = 1.4
  bike.add(fender)
  for (const s of [-1, 1]) bike.add(place(cyl(0.022, 0.022, 0.62, silver), s * 0.075, 0.52, 0.56, -0.45))

  // dek kaki
  bike.add(place(rbox(0.3, 0.07, 0.55, paint), 0, 0.3, 0.08))
  bike.add(place(rbox(0.26, 0.012, 0.48, black, 0.005), 0, 0.338, 0.08))

  // tameng depan (dalam)
  bike.add(place(rbox(0.32, 0.6, 0.06, paint, 0.03), 0, 0.62, 0.4, 0.28))
  // body depan: profil samping di-extrude, lalu dilancipin ke moncong
  const sh = new THREE.Shape()
  sh.moveTo(0.4, 0.42)
  sh.lineTo(0.64, 0.46)
  sh.quadraticCurveTo(0.8, 0.62, 0.79, 0.84)
  sh.quadraticCurveTo(0.76, 0.98, 0.62, 1.0)
  sh.lineTo(0.44, 0.97)
  sh.quadraticCurveTo(0.38, 0.7, 0.4, 0.42)
  const apronGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.025, bevelSegments: 4, curveSegments: 10 })
  apronGeo.translate(0, 0, -0.12)
  // shape-nya di bidang (z, y) -> putar biar sumbu extrude jadi x
  apronGeo.rotateY(-Math.PI / 2)
  const ap = apronGeo.attributes.position
  for (let i = 0; i < ap.count; i++) {
    const z = ap.getZ(i)
    const y = ap.getY(i)
    const k = (1 - 0.5 * Math.min(1, Math.max(0, (z - 0.55) / 0.25))) * (1 - 0.25 * Math.min(1, Math.max(0, (0.6 - y) / 0.2)))
    ap.setX(i, ap.getX(i) * k)
  }
  apronGeo.computeVertexNormals()
  const apron = new THREE.Mesh(apronGeo, paint)
  bike.add(apron)
  // aksen merah tajam di sisi body depan
  for (const sgn of [-1, 1]) {
    const a = rbox(0.01, 0.07, 0.3, accent, 0.004)
    place(a, sgn * 0.13, 0.72, 0.6, -0.55, sgn * -0.12, 0)
    bike.add(a)
  }
  // lampu LED depan model V, nempel di muka moncong
  const ledMat = M('#ffffff', 0.15, { emissive: '#e8f4ff', emissiveIntensity: 1.0 })
  for (const sgn of [-1, 1]) {
    const led = rbox(0.022, 0.03, 0.16, ledMat, 0.008)
    place(led, sgn * 0.055, 0.9, 0.765, -0.9, 0, sgn * 0.5)
    bike.add(led)
  }
  // kaca kecil (visor) di atas
  bike.add(place(rbox(0.2, 0.09, 0.012, M('#2a3238', 0.1, { metalness: 0.4 }), 0.01), 0, 1.04, 0.6, -0.5))
  const signMat = new THREE.MeshStandardMaterial({ color: '#f5a524', roughness: 0.3, emissive: '#ff9a00', emissiveIntensity: 0 })
  const signals = []
  for (const s of [-1, 1]) {
    const sg = rbox(0.05, 0.025, 0.04, signMat, 0.008)
    place(sg, s * 0.1, 0.96, 0.66, 0.2)
    bike.add(sg)
    signals.push(sg)
  }
  // plat depan
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTexture('B 3157 CPU'), roughness: 0.6 })
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.07), plateMat)
  place(pf, 0, 0.5, 0.71, -0.35)
  bike.add(pf)

  // batok setang + panel meter
  bike.add(place(rbox(0.46, 0.12, 0.18, paint, 0.04), 0, 1.0, 0.47, 0.18))
  const meter = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.07), M('#0c1418', 0.1, { emissive: '#3aa7ff', emissiveIntensity: 0.25 }))
  place(meter, 0, 1.065, 0.43, -1.2)
  bike.add(meter)
  // stang, grip, tuas rem
  for (const s of [-1, 1]) {
    const grip = place(cyl(0.02, 0.02, 0.12, black), s * 0.3, 1.0, 0.43, 0, 0, Math.PI / 2)
    bike.add(grip)
    bike.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.02), silver), s * 0.29, 1.01, 0.49, 0, s * 0.15, 0))
    // spion
    const stalk = place(cyl(0.008, 0.008, 0.22, black, 6), s * 0.21, 1.15, 0.47, 0, 0, s * -0.35)
    bike.add(stalk)
    const mir = rbox(0.13, 0.065, 0.025, black, 0.02)
    place(mir, s * 0.26, 1.26, 0.47, 0, 0, s * 0.15)
    bike.add(mir)
  }

  // jok dua tingkat
  bike.add(place(rbox(0.29, 0.1, 0.48, seatMat, 0.05), 0, 0.79, -0.12))
  bike.add(place(rbox(0.27, 0.11, 0.38, seatMat, 0.05), 0, 0.83, -0.53, -0.06))
  // body belakang (lancip ke atas)
  const rearBody = rbox(0.32, 0.34, 0.92, paint, 0.07)
  place(rearBody, 0, 0.58, -0.36)
  bike.add(rearBody)
  const tail = rbox(0.24, 0.13, 0.32, paint, 0.05)
  place(tail, 0, 0.73, -0.86, -0.28)
  bike.add(tail)
  for (const s of [-1, 1]) {
    const stripe = rbox(0.012, 0.05, 0.6, accent, 0.004)
    place(stripe, s * 0.162, 0.62, -0.45, -0.18)
    bike.add(stripe)
  }
  // lampu belakang + sein belakang
  const tailMat = M('#b5121b', 0.2, { emissive: '#ff1e2d', emissiveIntensity: 0.35 })
  bike.add(place(rbox(0.18, 0.05, 0.05, tailMat, 0.015), 0, 0.77, -1.0, -0.28))
  for (const s of [-1, 1]) {
    const sg = rbox(0.045, 0.03, 0.04, signMat, 0.008)
    place(sg, s * 0.12, 0.72, -0.98, -0.28)
    bike.add(sg)
    signals.push(sg)
  }
  // behel (pegangan belakang)
  const grab = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.014, 6, 16, Math.PI), silver)
  place(grab, 0, 0.86, -0.78, -Math.PI / 2 + 0.1)
  bike.add(grab)
  // plat belakang
  const pr = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.07), plateMat)
  place(pr, 0, 0.6, -1.02, 0, Math.PI, 0)
  bike.add(pr)
  // spakbor belakang
  bike.add(place(rbox(0.14, 0.03, 0.3, black, 0.01), 0, 0.5, -0.9, 0.35))

  // mesin + bak CVT di kiri (+x), knalpot di kanan (-x)
  bike.add(place(rbox(0.16, 0.24, 0.72, M('#55595e', 0.45, { metalness: 0.4 }), 0.05), 0.13, 0.3, -0.36))
  bike.add(place(rbox(0.04, 0.16, 0.5, black, 0.02), 0.215, 0.32, -0.36))
  const muffler = place(cyl(0.055, 0.05, 0.5, black, 16), -0.16, 0.36, -0.58, Math.PI / 2 - 0.2)
  bike.add(muffler)
  bike.add(place(rbox(0.02, 0.1, 0.36, silver, 0.01), -0.215, 0.38, -0.56, -0.2))
  bike.add(place(cyl(0.04, 0.04, 0.03, silver, 12), -0.16, 0.41, -0.84, Math.PI / 2 - 0.2))
  // shock belakang
  bike.add(place(cyl(0.02, 0.02, 0.32, M('#c4232f', 0.4), 8), -0.12, 0.42, -0.62, 0.3))

  // tombol smart key di tameng dalam, ada ring biru
  const knob = place(cyl(0.032, 0.032, 0.03, silver, 18), -0.08, 0.74, 0.36, Math.PI / 2 - 0.28)
  bike.add(knob)
  const ringMat = M('#3aa7ff', 0.3, { emissive: '#2f8dff', emissiveIntensity: 1.2 })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.006, 6, 18), ringMat)
  place(ring, -0.08, 0.745, 0.352, -0.28)
  bike.add(ring)

  // standar samping, motor sedikit miring ke kiri
  const stand = place(cyl(0.012, 0.012, 0.32, silver, 6), 0.2, 0.15, -0.05, 0, 0, 0.5)
  stand.name = 'stand'
  root.add(stand)
  bike.rotation.z = -0.08
  bike.position.x = 0.02

  bike.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })

  // bayangan lembut
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 1.9),
    new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.014
  root.add(shadow)

  // depan menghadap jalan (dunia +z), di teras sisi carport
  root.position.set(x, 0, -z)
  scene.add(root)
  const collider = physics.addPlan(x - 0.18, z - 0.96, x + 0.18, z + 0.96, 'motor')

  let blink = 0
  let speed = 0
  let steer = 0
  let driving = false

  return {
    root,
    get center() {
      return { x: root.position.x, z: root.position.z }
    },
    get seat() {
      const v = vehicleSeat(root, 'motor')
      return { x: v.x, z: v.z, y: v.y }
    },
    get passengerSeat() {
      const v = vehicleSeat(root, 'motor', true)
      return { x: v.x, z: v.z, y: v.y }
    },
    get driving() {
      return driving
    },
    get speed() {
      return speed
    },
    get lean() {
      return bike.rotation.z
    },
    // fitur answer back: bunyi bip + sein kedip
    answerBack() {
      blink = 1.4
    },
    startDrive() {
      driving = true
      collider.disabled = true
      stand.visible = false
      bike.rotation.z = 0
      bike.position.x = 0
    },
    stopDrive() {
      driving = false
      speed = 0
      steer = 0
      stand.visible = true
      bike.rotation.z = -0.08
      bike.position.x = 0.02
      collider.disabled = false
      const hx = Math.abs(Math.cos(root.rotation.y)) * 0.22 + Math.abs(Math.sin(root.rotation.y)) * 0.95
      const hz = Math.abs(Math.sin(root.rotation.y)) * 0.22 + Math.abs(Math.cos(root.rotation.y)) * 0.95
      collider.minX = root.position.x - hx
      collider.maxX = root.position.x + hx
      collider.minZ = root.position.z - hz
      collider.maxZ = root.position.z + hz
    },
    drive(dt, steerIn, throttleIn, isFast, physics) {
      if (!driving) return
      const maxSpd = isFast ? 7.5 : 4.8
      const accel = isFast ? 6.5 : 4.5
      const maxSteer = 0.65

      steer += (steerIn * maxSteer - steer) * Math.min(1, dt * 10)

      if (throttleIn > 0) {
        speed += accel * dt
        if (speed > maxSpd) speed = maxSpd
      } else if (throttleIn < 0) {
        speed -= accel * 0.8 * dt
        if (speed < -1.8) speed = -1.8
      } else {
        speed *= Math.exp(-dt * 3.0)
        if (Math.abs(speed) < 0.05) speed = 0
      }

      if (Math.abs(speed) > 0.05) {
        const turnRate = -(speed / 1.6) * Math.sin(steer)
        root.rotation.y += turnRate * dt
        // Miring rebah saat menikung
        const targetLean = -steer * Math.min(1, Math.abs(speed) / 2.5) * 0.35
        bike.rotation.z += (targetLean - bike.rotation.z) * Math.min(1, dt * 8)
      } else {
        bike.rotation.z *= Math.exp(-dt * 6)
      }

      // Maju sesuai orientasi motor (lokal +z)
      const forward = new THREE.Vector3(Math.sin(root.rotation.y), 0, Math.cos(root.rotation.y))
      root.position.addScaledVector(forward, speed * dt)

      physics.resolve(root.position, 0.45)

      // Putar roda motor
      const roll = (speed * dt) / R
      wf.rotation.x += roll
      wr.rotation.x += roll
    },
    update(dt) {
      if (blink > 0) {
        blink -= dt
        const on = Math.floor(blink * 4) % 2 === 0 && blink > 0
        signMat.emissiveIntensity = on ? 2.5 : 0
      } else signMat.emissiveIntensity = 0
      ringMat.emissiveIntensity = 0.9 + Math.sin(performance.now() / 400) * 0.3
    },
  }
}
