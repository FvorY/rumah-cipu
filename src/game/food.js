import * as THREE from 'three'
import { M, B, C, S, R } from './furniture'

// Model 3D makanan hasil masakan dapur
export function createDishModel(type) {
  const g = new THREE.Group()
  g.name = `dish_${type}`

  if (type === 'mie instan pakai telor') {
    // Mangkok keramik putih
    const bowlMat = M('#fdfdfb', 0.25)
    g.add(C(0.18, 0.1, 0.12, bowlMat, 0, 0.06, 0, 24))
    const innerBowl = C(0.165, 0.09, 0.11, M('#e8e8e4', 0.25), 0, 0.068, 0, 24)
    g.add(innerBowl)

    // Kuah mie kaldu gurih
    const brothMat = new THREE.MeshStandardMaterial({ color: '#c99238', roughness: 0.1, metalness: 0.1 })
    g.add(C(0.155, 0.155, 0.01, brothMat, 0, 0.095, 0, 20))

    // Mie kuning keriting
    const noodleMat = M('#f0c948', 0.6)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const r = 0.04 + (i % 4) * 0.025
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.007, 6, 12, Math.PI * 1.5), noodleMat)
      curl.position.set(Math.cos(a) * r, 0.103, Math.sin(a) * r)
      curl.rotation.set(Math.PI / 2, 0, i * 0.8)
      g.add(curl)
    }

    // Telur ceplok mata sapi (putih telur keriting + kuning telur setengah matang)
    const eggWhite = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.012, 16), M('#fafaf5', 0.35))
    eggWhite.position.set(-0.03, 0.112, 0.02)
    eggWhite.scale.set(1.15, 1, 0.9)
    g.add(eggWhite)
    const eggYolk = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#ff9e00', 0.15, { roughness: 0.2 }))
    eggYolk.position.set(-0.03, 0.118, 0.02)
    eggYolk.scale.y = 0.65
    g.add(eggYolk)

    // Irisan cabai merah & daun bawang
    for (let c = 0; c < 4; c++) {
      const chili = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 8), M('#d9241b', 0.4), 0.05 + (c % 2) * 0.02, 0.112, -0.04 + c * 0.025)
      chili.rotation.x = Math.PI / 2
      g.add(chili)
    }
    for (let s = 0; s < 5; s++) {
      const scallion = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.006, 8), M('#4caf50', 0.4), 0.01 + (s % 3) * 0.03, 0.112, 0.04 - s * 0.02)
      scallion.rotation.z = Math.PI / 2
      g.add(scallion)
    }
  } else if (type === 'sambal tomat') {
    // Cobek batu tradisional
    const stoneMat = M('#2d3033', 0.9)
    g.add(C(0.19, 0.15, 0.045, stoneMat, 0, 0.022, 0, 24))
    // Sambal uleg merah segar
    const sambalMat = new THREE.MeshStandardMaterial({ color: '#c72718', roughness: 0.4 })
    const sambal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 20), sambalMat)
    sambal.position.y = 0.038
    g.add(sambal)
    // Bintik biji tomat & cabai
    const seedMat = M('#f4d27c', 0.5)
    for (let i = 0; i < 16; i++) {
      const a = i * 1.7
      const r = 0.03 + (i % 5) * 0.024
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), seedMat)
      seed.position.set(Math.cos(a) * r, 0.045, Math.sin(a) * r)
      g.add(seed)
    }
    // Daun kemangi segar di pinggir cobek
    const leafMat = M('#43a047', 0.5)
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), leafMat)
    leaf.scale.set(1.4, 0.2, 0.8)
    leaf.position.set(0.12, 0.045, 0.02)
    leaf.rotation.set(0.2, 0.4, 0.3)
    g.add(leaf)
  } else if (type === 'terong balado') {
    // Piring oval keramik
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.028, 24), M('#f9f9f6', 0.3))
    plate.scale.set(1.3, 1, 0.85)
    plate.position.y = 0.014
    g.add(plate)
    // Potongan terong ungu berlumur balado
    const skinMat = M('#4a1d48', 0.4)
    const baladoMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.3, metalness: 0.1 })
    for (let i = -2; i <= 2; i++) {
      const piece = new THREE.Group()
      piece.add(B(0.08, 0.03, 0.14, skinMat, 0, 0.015, 0))
      // siraman bumbu balado di atasnya
      piece.add(B(0.075, 0.01, 0.13, baladoMat, 0, 0.032, 0))
      piece.position.set(i * 0.09, 0.025, (i % 2) * 0.02)
      piece.rotation.y = (i * 0.2)
      g.add(piece)
    }
  } else {
    // 'tumis sawi'
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.026, 24), M('#ffffff', 0.3))
    plate.position.y = 0.013
    g.add(plate)
    // Daun sawi hijau segar
    const sawiMat = new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.5 })
    const sawiLight = M('#66bb6a', 0.6)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2
      const r = 0.03 + (i % 4) * 0.028
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.03), i % 2 ? sawiMat : sawiLight)
      leaf.position.set(Math.cos(a) * r, 0.028 + (i % 3) * 0.005, Math.sin(a) * r)
      leaf.rotation.set(0.1, a + 0.3, 0.1)
      g.add(leaf)
    }
    // Irisan bawang putih
    const garlicMat = M('#f5eedc', 0.4)
    for (let gIdx = 0; gIdx < 5; gIdx++) {
      const garlic = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.005, 8), garlicMat)
      garlic.position.set(-0.04 + gIdx * 0.02, 0.048, (gIdx % 2) * 0.03)
      g.add(garlic)
    }
  }

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })

  return g
}
