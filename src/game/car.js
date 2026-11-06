import * as THREE from 'three'
import { plateTexture } from './textures'
import { M } from './furniture'

// Honda Mobilio (low-poly). Panjang ~4.4m, lebar ~1.68m.
// Lokal: depan = +x, lebar di sumbu z.
export const CAR_COLOR = '#c4c8cd'
const L = 4.4
const W = 1.54 // lebar body sebelum bevel
const BEVEL = 0.06

const profile = () => {
  const s = new THREE.Shape()
  const wb = 1.33
  const ar = 0.37
  s.moveTo(-2.14, 0.32)
  s.lineTo(-wb - ar, 0.32)
  s.absarc(-wb, 0.3, ar, Math.PI, 0, true)
  s.lineTo(wb - ar, 0.32)
  s.absarc(wb, 0.3, ar, Math.PI, 0, true)
  s.lineTo(2.08, 0.32)
  s.quadraticCurveTo(2.18, 0.34, 2.18, 0.5)
  s.lineTo(2.16, 0.66)
  s.quadraticCurveTo(2.13, 0.8, 1.96, 0.84)
  s.lineTo(1.28, 0.97)
  s.lineTo(0.36, 1.5)
  s.quadraticCurveTo(0.2, 1.57, -0.1, 1.58)
  s.lineTo(-1.78, 1.58)
  s.quadraticCurveTo(-2.06, 1.56, -2.1, 1.4)
  s.lineTo(-2.16, 0.95)
  s.lineTo(-2.18, 0.5)
  s.quadraticCurveTo(-2.18, 0.32, -2.14, 0.32)
  return s
}

const sideGlass = () => {
  // garis jendela samping, termasuk "zig-zag" khas Mobilio di pilar belakang
  const s = new THREE.Shape()
  s.moveTo(1.18, 1.02)
  s.lineTo(0.4, 1.47)
  s.lineTo(-1.74, 1.51)
  s.quadraticCurveTo(-1.98, 1.5, -2.03, 1.36)
  s.lineTo(-2.08, 1.13)
  s.lineTo(-1.66, 1.13)
  s.lineTo(-1.48, 1.02)
  s.lineTo(1.18, 1.02)
  return s
}

export function buildCar(scene, physics, { x = 5.8, z = 2.3 } = {}) {
  const car = new THREE.Group()
  car.name = 'mobilio'

  const paint = new THREE.MeshStandardMaterial({ color: CAR_COLOR, roughness: 0.32, metalness: 0.35 })
  const glass = new THREE.MeshStandardMaterial({ color: '#1f2b33', roughness: 0.08, metalness: 0.4 })
  const black = M('#1b1c1e', 0.6)
  const chrome = M('#e2e5e8', 0.15, { metalness: 0.9 })

  const bodyGeo = new THREE.ExtrudeGeometry(profile(), {
    depth: W,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: 0.05,
    bevelSegments: 4,
    curveSegments: 18,
  })
  bodyGeo.translate(0, 0, -W / 2)
  const body = new THREE.Mesh(bodyGeo, paint)
  body.castShadow = true
  body.receiveShadow = true
  car.add(body)

  const half = W / 2 + BEVEL
  for (const side of [-1, 1]) {
    const g = new THREE.Mesh(new THREE.ShapeGeometry(sideGlass()), glass)
    g.position.z = side * (half + 0.003)
    if (side < 0) g.rotation.y = Math.PI
    if (side < 0) g.scale.x = -1
    car.add(g)

    // pilar B hitam + pilar C warna body
    const bp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.01), black)
    bp.position.set(-0.32, 1.25, side * (half + 0.006))
    car.add(bp)
    const cp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.012), paint)
    cp.position.set(-1.56, 1.3, side * (half + 0.006))
    cp.rotation.z = -0.25
    car.add(cp)

    // garis pintu & handle
    for (const dx of [0.42, -0.98]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.55, 0.004), black)
      line.position.set(dx, 0.72, side * (half + 0.002))
      car.add(line)
    }
    for (const dx of [0.0, -1.2]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.02), chrome)
      h.position.set(dx, 0.92, side * (half + 0.01))
      car.add(h)
    }
    // spion
    const mirror = new THREE.Group()
    mirror.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.16), paint))
    const mg = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.13), glass)
    mg.position.x = -0.05
    mirror.add(mg)
    mirror.position.set(1.1, 1.08, side * (half + 0.09))
    car.add(mirror)
    // list samping bawah
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.02), black)
    skirt.position.set(-0.2, 0.36, side * (half + 0.005))
    car.add(skirt)
  }

  // kaca depan
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.012, W - 0.1), glass)
  ws.position.set(0.82 + 0.03, 1.24 + 0.045, 0)
  ws.rotation.z = Math.atan2(1.5 - 0.97, 0.36 - 1.28) + Math.PI
  car.add(ws)
  // wiper
  for (const zz of [-0.3, 0.25]) {
    const wp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.5), black)
    wp.position.set(1.24, 1.03, zz)
    wp.rotation.y = 0.25
    car.add(wp)
  }
  // kaca belakang
  const rg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.36, W - 0.2), glass)
  rg.position.set(-2.19, 1.24, 0)
  rg.rotation.z = -0.12
  car.add(rg)

  // lampu depan (nyala pas klakson)
  const headMat = new THREE.MeshStandardMaterial({ color: '#f4f6f7', roughness: 0.1, emissive: '#fff4d6', emissiveIntensity: 0 })
  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.36), headMat)
    hl.position.set(2.06, 0.75, side * 0.55)
    hl.rotation.y = side * 0.12
    hl.rotation.z = -0.25
    car.add(hl)
    // lampu belakang vertikal
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.1), M('#b3202a', 0.3, { emissive: '#5a0000' }))
    tl.position.set(-2.16, 1.08, side * 0.7)
    car.add(tl)
    const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.22), M('#b3202a', 0.3, { emissive: '#5a0000' }))
    tl2.position.set(-2.16, 0.9, side * 0.62)
    car.add(tl2)
    // lampu kabut
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12), M('#e8e8e8', 0.2))
    fog.rotation.z = Math.PI / 2
    fog.position.set(2.17, 0.46, side * 0.6)
    car.add(fog)
  }
  // grill: satu bilah krom tebal + kisi gelap
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.76), chrome)
  wing.position.set(2.12, 0.74, 0)
  car.add(wing)
  const grill = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.9), black)
  grill.position.set(2.17, 0.55, 0)
  car.add(grill)

  // plat nomor
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTexture('B 2411 CPU'), roughness: 0.6 })
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.11), plateMat)
  pf.position.set(2.205, 0.48, 0)
  pf.rotation.y = Math.PI / 2
  car.add(pf)
  const pr = pf.clone()
  pr.position.set(-2.205, 0.68, 0)
  pr.rotation.y = -Math.PI / 2
  car.add(pr)

  // roda
  const tireGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 28)
  tireGeo.rotateX(Math.PI / 2)
  const rimGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.21, 20)
  rimGeo.rotateX(Math.PI / 2)
  const rimMat = M('#b9bdc2', 0.25, { metalness: 0.8 })
  for (const wx of [-1.33, 1.33]) {
    for (const side of [-1, 1]) {
      const wheel = new THREE.Group()
      const tire = new THREE.Mesh(tireGeo, M('#1a1a1a', 0.85))
      tire.castShadow = true
      wheel.add(tire)
      wheel.add(new THREE.Mesh(rimGeo, rimMat))
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.32, 0.02), rimMat)
        spoke.rotation.z = (i / 5) * Math.PI * 2
        spoke.position.z = side * 0.11
        wheel.add(spoke)
      }
      wheel.position.set(wx, 0.3, side * 0.72)
      car.add(wheel)
    }
  }

  // bayangan gelap di kolong biar nempel ke lantai
  const under = new THREE.Mesh(
    new THREE.PlaneGeometry(L * 0.95, 1.6),
    new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }),
  )
  under.rotation.x = -Math.PI / 2
  under.position.y = 0.012
  car.add(under)

  car.traverse((o) => {
    if (o.isMesh && o !== under) o.castShadow = true
  })

  // hadap ke jalan (dunia +z)
  car.rotation.y = -Math.PI / 2
  car.position.set(x, 0, -z)
  scene.add(car)
  physics.addPlan(x - 0.86, z - 2.15, x + 0.86, z + 2.15, 'car')

  let flash = 0
  return {
    group: car,
    center: { x, z: -z },
    // kap mesin, tempat favorit Mujaer
    hood: { x, z: -(z - 1.62), y: 0.9 },
    honk() {
      flash = 0.9
    },
    update(dt) {
      if (flash > 0) {
        flash -= dt
        const on = Math.floor(flash * 7) % 2 === 0 && flash > 0
        headMat.emissiveIntensity = on ? 2.2 : 0
      } else headMat.emissiveIntensity = 0
    },
  }
}
