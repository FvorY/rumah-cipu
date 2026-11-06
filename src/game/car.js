import * as THREE from 'three'
import { plateTexture } from './textures'
import { M } from './furniture'
import { vehicleSeat } from './vehicle'

// Honda Mobilio. Panjang ~4.4m, lebar ~1.68m.
// Lokal: depan = +x, lebar di sumbu z.
// Body dibikin dari satu profil samping yang di-extrude, lalu verteksnya
// "dipahat": makin ke atap makin ramping, moncong & buntut membulat kalau
// dilihat dari atas. Kaca & detail lain ikut fungsi yang sama biar nempel.
export const CAR_COLOR = '#c4c8cd'
const W = 1.5 // lebar body sebelum bevel
const BT = 0.08 // bevel thickness (arah lebar)
const BS = 0.06 // bevel size (arah profil)
const HALF = W / 2 + BT

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// faktor lebar body di titik (x, y)
export const taper = (x, y) => {
  const tumble = 1 - 0.16 * smooth(0.95, 1.62, y)
  const sill = 1 - 0.05 * (1 - smooth(0.3, 0.56, y))
  const nose = 1 - 0.15 * smooth(1.45, 2.25, x)
  const tail = 1 - 0.08 * smooth(1.7, 2.25, -x)
  return tumble * sill * nose * tail
}

// titik-titik profil dibikin rapat biar deformasinya halus
const densify = (pts, step = 0.07) => {
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const n = Math.max(1, Math.ceil(a.distanceTo(b) / step))
    for (let k = 0; k < n; k++) out.push(a.clone().lerp(b, k / n))
  }
  return out
}

const profile = () => {
  const s = new THREE.Shape()
  const wb = 1.33
  const ar = 0.38
  s.moveTo(-2.1, 0.33)
  s.lineTo(-wb - ar, 0.33)
  s.absarc(-wb, 0.31, ar, Math.PI, 0, true)
  s.lineTo(wb - ar, 0.33)
  s.absarc(wb, 0.31, ar, Math.PI, 0, true)
  s.lineTo(2.02, 0.33)
  s.quadraticCurveTo(2.2, 0.35, 2.21, 0.52) // bumper depan bawah
  s.quadraticCurveTo(2.22, 0.7, 2.14, 0.79) // moncong
  s.quadraticCurveTo(2.06, 0.86, 1.95, 0.87)
  s.quadraticCurveTo(1.6, 0.94, 1.27, 0.99) // kap mesin agak cembung
  s.quadraticCurveTo(0.78, 1.28, 0.36, 1.5) // kaca depan
  s.quadraticCurveTo(0.12, 1.6, -0.3, 1.6) // atap
  s.quadraticCurveTo(-1.2, 1.6, -1.78, 1.57)
  s.quadraticCurveTo(-2.07, 1.55, -2.12, 1.38) // ujung atap belakang
  s.lineTo(-2.17, 1.0) // kaca belakang
  s.quadraticCurveTo(-2.2, 0.8, -2.2, 0.62)
  s.quadraticCurveTo(-2.22, 0.36, -2.1, 0.33)
  const pts = s.getPoints(10)
  if (pts[0].distanceTo(pts[pts.length - 1]) < 1e-4) pts.pop()
  return new THREE.Shape(densify(pts))
}

const sideGlassShape = () => {
  // garis jendela samping, termasuk "zig-zag" khas Mobilio di pilar belakang
  const s = new THREE.Shape()
  s.moveTo(1.16, 1.03)
  s.quadraticCurveTo(0.76, 1.27, 0.42, 1.47)
  s.quadraticCurveTo(0.2, 1.53, -0.3, 1.53)
  s.lineTo(-1.74, 1.51)
  s.quadraticCurveTo(-1.98, 1.5, -2.03, 1.36)
  s.lineTo(-2.07, 1.14)
  s.lineTo(-1.66, 1.14)
  s.lineTo(-1.48, 1.03)
  s.lineTo(1.16, 1.03)
  const pts = s.getPoints(8)
  if (pts[0].distanceTo(pts[pts.length - 1]) < 1e-4) pts.pop()
  return new THREE.Shape(densify(pts, 0.12))
}

// panel kaca melengkung yang ngikutin kurva profil (kaca depan/belakang)
const curvedPanel = (curve, t0, t1, widthFactor, offset, mat) => {
  const nu = 10
  const nv = 12
  const pos = []
  const idx = []
  for (let i = 0; i <= nu; i++) {
    const t = t0 + ((t1 - t0) * i) / nu
    const p = curve.getPoint(t)
    const d = curve.getTangent(t)
    const nx = d.y
    const ny = -d.x
    const x = p.x + nx * offset
    const y = p.y + ny * offset
    const half = (W / 2) * widthFactor * taper(x, y)
    for (let j = 0; j <= nv; j++) pos.push(x, y, -half + (2 * half * j) / nv)
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j
      const b = a + nv + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, mat)
}

// posisi di kulit samping body
const sideZ = (x, y, side, out = 0.004) => side * (HALF * taper(x, y) + out)

export function buildCar(scene, physics, { x = 5.8, z = 2.3 } = {}) {
  const car = new THREE.Group()
  car.name = 'mobilio'

  const paint = new THREE.MeshStandardMaterial({ color: CAR_COLOR, roughness: 0.28, metalness: 0.45 })
  const glass = new THREE.MeshStandardMaterial({ color: '#1c262d', roughness: 0.06, metalness: 0.5, side: THREE.DoubleSide })
  const black = M('#1b1c1e', 0.55)
  const chrome = M('#e2e5e8', 0.12, { metalness: 0.95 })

  // ---- body ----
  const bodyGeo = new THREE.ExtrudeGeometry(profile(), {
    depth: W,
    bevelEnabled: true,
    bevelThickness: BT,
    bevelSize: BS,
    bevelSegments: 6,
    curveSegments: 1,
  })
  bodyGeo.translate(0, 0, -W / 2)
  const pos = bodyGeo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i)
    const py = pos.getY(i)
    pos.setZ(i, pos.getZ(i) * taper(px, py))
  }
  bodyGeo.computeVertexNormals()
  const body = new THREE.Mesh(bodyGeo, paint)
  car.add(body)

  // ---- kaca samping (ikut ramping ke atas) ----
  for (const side of [-1, 1]) {
    const g = new THREE.ShapeGeometry(sideGlassShape())
    const gp = g.attributes.position
    for (let i = 0; i < gp.count; i++) gp.setZ(i, sideZ(gp.getX(i), gp.getY(i), side, 0.012))
    g.computeVertexNormals()
    car.add(new THREE.Mesh(g, glass))

    // pilar B hitam
    const bp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.48, 0.01), black)
    bp.position.set(-0.32, 1.27, sideZ(-0.32, 1.27, side, 0.016))
    bp.rotation.x = side * 0.12
    car.add(bp)

    // garis pintu & handle
    for (const dx of [0.4, -0.98]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.6, 0.004), black)
      line.position.set(dx, 0.72, sideZ(dx, 0.72, side, 0.002))
      car.add(line)
    }
    for (const dx of [0.02, -1.18]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.028, 0.025), chrome)
      h.position.set(dx, 0.93, sideZ(dx, 0.93, side, 0.008))
      car.add(h)
    }
    // garis karakter (lipatan body) yang naik ke belakang
    const crease = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.012, 0.012), M('#a9aeb4', 0.35, { metalness: 0.4 }))
    crease.position.set(-0.15, 0.86, sideZ(-0.15, 0.86, side, 0.003))
    crease.rotation.z = 0.035
    car.add(crease)

    // spion
    const mirror = new THREE.Group()
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), paint)
    shell.scale.set(0.7, 0.75, 1.3)
    mirror.add(shell)
    const mg = new THREE.Mesh(new THREE.CircleGeometry(0.06, 14), glass)
    mg.rotation.y = -Math.PI / 2
    mg.position.x = -0.056
    mg.scale.set(1.3, 0.75, 1)
    mirror.add(mg)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), black)
    arm.position.z = -side * 0.08
    mirror.add(arm)
    mirror.position.set(1.08, 1.09, sideZ(1.08, 1.09, side, 0.12))
    car.add(mirror)

    // list hitam bawah pintu
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.07, 0.02), black)
    skirt.position.set(-0.2, 0.38, sideZ(-0.2, 0.38, side, 0.004))
    car.add(skirt)

    // roof rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.035, 0.04), black)
    rail.position.set(-0.85, 1.685, side * 0.5)
    car.add(rail)
    for (const rx of [0.05, -1.75]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.05), black)
      foot.position.set(rx, 1.66, side * 0.5)
      car.add(foot)
    }
  }

  // ---- kaca depan & belakang melengkung ----
  const ws = new THREE.QuadraticBezierCurve(new THREE.Vector2(1.27, 0.99), new THREE.Vector2(0.78, 1.28), new THREE.Vector2(0.36, 1.5))
  car.add(curvedPanel(ws, 0.04, 0.93, 0.92, BS + 0.006, glass))
  const rear = new THREE.LineCurve(new THREE.Vector2(-2.12, 1.38), new THREE.Vector2(-2.17, 1.0))
  car.add(curvedPanel(rear, 0.06, 0.9, 0.8, BS + 0.006, glass))

  // wiper
  for (const zz of [-0.32, 0.22]) {
    const wp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.52), black)
    wp.position.set(1.24, 1.07, zz)
    wp.rotation.y = 0.25
    car.add(wp)
  }
  // spoiler belakang di ujung atap
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 1.2), black)
  spoiler.position.set(-1.97, 1.6, 0)
  spoiler.rotation.z = 0.12
  car.add(spoiler)

  // ---- lampu & grill ----
  const headMat = new THREE.MeshStandardMaterial({ color: '#f4f6f7', roughness: 0.08, metalness: 0.3, emissive: '#fff4d6', emissiveIntensity: 0 })
  const drlMat = M('#ffffff', 0.2, { emissive: '#dff3ff', emissiveIntensity: 0.6 })
  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), headMat)
    hl.scale.set(0.55, 0.42, 1.55)
    hl.position.set(2.19, 0.75, side * 0.5)
    hl.rotation.y = side * -0.35
    hl.rotation.x = side * 0.15
    car.add(hl)
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.22), drlMat)
    drl.position.set(2.245, 0.7, side * 0.5)
    drl.rotation.y = side * -0.35
    car.add(drl)
    // lampu belakang model L
    const tlMat = M('#b3202a', 0.25, { emissive: '#5a0000' })
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.1), tlMat)
    tl.position.set(-2.215, 1.12, side * 0.6)
    car.add(tl)
    const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.24), tlMat)
    tl2.position.set(-2.235, 0.93, side * 0.52)
    car.add(tl2)
    // lampu kabut
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), M('#e8e8e8', 0.15))
    fog.rotation.z = Math.PI / 2
    fog.position.set(2.255, 0.46, side * 0.56)
    car.add(fog)
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.72), chrome)
  wing.position.set(2.235, 0.77, 0)
  car.add(wing)
  const grill = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.82), black)
  grill.position.set(2.27, 0.58, 0)
  car.add(grill)
  const intake = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 1.1), black)
  intake.position.set(2.255, 0.4, 0)
  car.add(intake)

  // plat nomor
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTexture('B 2411 CPU'), roughness: 0.6 })
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.11), plateMat)
  pf.position.set(2.29, 0.5, 0)
  pf.rotation.y = Math.PI / 2
  car.add(pf)
  const pr = pf.clone()
  pr.position.set(-2.268, 0.7, 0)
  pr.rotation.y = -Math.PI / 2
  car.add(pr)

  // ---- roda: ban bulat (torus) + velg palang 5 ----
  const tireGeo = new THREE.TorusGeometry(0.235, 0.075, 12, 32)
  const rimMat = M('#b9bdc2', 0.2, { metalness: 0.85 })
  const frontSteerGroups = []
  const allSpinWheels = []

  for (const wx of [-1.33, 1.33]) {
    for (const side of [-1, 1]) {
      const isFront = wx > 0
      const mount = new THREE.Group()
      mount.position.set(wx, 0.31, side * 0.7)
      car.add(mount)
      if (isFront) frontSteerGroups.push(mount)

      const wheel = new THREE.Group()
      wheel.name = 'spin'
      const tire = new THREE.Mesh(tireGeo, M('#1a1a1a', 0.85))
      tire.scale.z = 1.25
      wheel.add(tire)
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.16, 24), rimMat)
      rim.rotation.x = Math.PI / 2
      wheel.add(rim)
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.17, 12), M('#3a3a3a', 0.4))
      hub.rotation.x = Math.PI / 2
      wheel.add(hub)
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.02), rimMat)
        spoke.rotation.z = (i / 5) * Math.PI * 2
        spoke.position.z = side * 0.085
        wheel.add(spoke)
      }
      mount.add(wheel)
      allSpinWheels.push(wheel)
    }
  }

  // bayangan gelap di kolong biar nempel ke lantai
  const under = new THREE.Mesh(
    new THREE.PlaneGeometry(4.3, 1.55),
    new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false }),
  )
  under.rotation.x = -Math.PI / 2
  under.position.y = 0.012
  car.add(under)

  car.traverse((o) => {
    if (o.isMesh && o !== under) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })

  // hadap ke jalan (dunia +z)
  car.rotation.y = -Math.PI / 2
  car.position.set(x, 0, -z)
  scene.add(car)
  const collider = physics.addPlan(x - 0.86, z - 2.15, x + 0.86, z + 2.15, 'car')

  let flash = 0
  let speed = 0
  let steer = 0
  let driving = false

  return {
    group: car,
    collider,
    get center() {
      return { x: car.position.x, z: car.position.z }
    },
    get hood() {
      const v = new THREE.Vector3(1.62, 0.93, 0).applyMatrix4(car.matrixWorld)
      return { x: v.x, z: v.z, y: v.y }
    },
    get driverSeat() {
      return vehicleSeat(car, 'car')
    },
    get passengerSeat() {
      return vehicleSeat(car, 'car', true)
    },
    get driving() {
      return driving
    },
    get speed() {
      return speed
    },
    honk() {
      flash = 0.9
    },
    startDrive() {
      driving = true
      collider.disabled = true
      headMat.emissiveIntensity = 1.2
    },
    stopDrive() {
      driving = false
      speed = 0
      steer = 0
      collider.disabled = false
      const hx = Math.abs(Math.cos(car.rotation.y)) * 2.15 + Math.abs(Math.sin(car.rotation.y)) * 0.86
      const hz = Math.abs(Math.sin(car.rotation.y)) * 2.15 + Math.abs(Math.cos(car.rotation.y)) * 0.86
      collider.minX = car.position.x - hx
      collider.maxX = car.position.x + hx
      collider.minZ = car.position.z - hz
      collider.maxZ = car.position.z + hz
      headMat.emissiveIntensity = 0
      for (const fg of frontSteerGroups) fg.rotation.y = 0
    },
    drive(dt, steerIn, throttleIn, isFast, physics) {
      if (!driving) return
      const maxSpd = isFast ? 6.5 : 4.2
      const accel = isFast ? 5.5 : 3.8
      const maxSteer = 0.52

      // Kemudi
      steer += (steerIn * maxSteer - steer) * Math.min(1, dt * 8)
      for (const fg of frontSteerGroups) fg.rotation.y = steer

      // Akselerasi & pengereman
      if (throttleIn > 0) {
        speed += accel * dt
        if (speed > maxSpd) speed = maxSpd
      } else if (throttleIn < 0) {
        speed -= accel * 0.9 * dt
        if (speed < -2.2) speed = -2.2
      } else {
        // Hambatan mesin / pelambatan alami
        speed *= Math.exp(-dt * 2.8)
        if (Math.abs(speed) < 0.05) speed = 0
      }

      // Belok saat mobil bergerak
      if (Math.abs(speed) > 0.05) {
        const turnRate = -(speed / 2.66) * Math.sin(steer)
        car.rotation.y += turnRate * dt
      }

      // Maju sesuai orientasi mobil (lokal +x = arah moncong)
      const forward = new THREE.Vector3(Math.cos(car.rotation.y), 0, -Math.sin(car.rotation.y))
      car.position.addScaledVector(forward, speed * dt)

      // Cek tabrakan dengan batas & pagar
      physics.resolve(car.position, 1.05)

      // Putar roda saat berjalan
      const rollDelta = -(speed * dt) / 0.235
      for (const w of allSpinWheels) w.rotation.z += rollDelta
    },
    update(dt) {
      if (flash > 0) {
        flash -= dt
        const on = Math.floor(flash * 7) % 2 === 0 && flash > 0
        headMat.emissiveIntensity = on ? 2.2 : (driving ? 1.2 : 0)
      } else if (!driving) {
        headMat.emissiveIntensity = 0
      }
    },
  }
}
