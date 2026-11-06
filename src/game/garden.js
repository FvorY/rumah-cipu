import * as THREE from 'three'
import { M, B, C, S } from './furniture'
import { iconTexture } from './textures'

export const CROPS = {
  cabai: { name: 'Cabai', stageTime: 40, yield: [6, 10], color: '#d8352c' },
  tomat: { name: 'Tomat', stageTime: 50, yield: [3, 6], color: '#e2492f' },
  sawi: { name: 'Sawi', stageTime: 30, yield: [2, 3], color: '#83b84a' },
  terong: { name: 'Terong', stageTime: 55, yield: [2, 4], color: '#5b2a6e' },
}

export const STAGE_TEXT = ['baru ditanam', 'tunas', 'tumbuh', 'siap panen']

// 4 bedeng di sepanjang pagar belakang
const PLOTS = [3.15, 4.1, 5.05, 6.0].map((x0, i) => ({ id: i, x0, x1: x0 + 0.8, z0: 15.25, z1: 15.85 }))

const leafGeo = new THREE.SphereGeometry(1, 12, 8)

const leaf = (mat, len, wid, pitch, yaw, y = 0) => {
  const pivot = new THREE.Group()
  const l = new THREE.Mesh(leafGeo, mat)
  l.scale.set(wid, 0.012, len)
  l.position.z = len
  l.castShadow = true
  pivot.add(l)
  pivot.position.y = y
  pivot.rotation.set(pitch, yaw, 0)
  return pivot
}

function buildPlant(crop, stage) {
  const g = new THREE.Group()
  const green = M(crop === 'sawi' ? '#7db84a' : '#4e8f3a', 0.8)
  if (stage === 0) {
    const mound = S(0.08, M('#5a3a26', 1), 0, 0, 0, 1, 0.35, 1)
    g.add(mound)
    for (let i = 0; i < 3; i++) g.add(S(0.008, M('#e8dcb5', 0.8), (i - 1) * 0.03, 0.025, (i % 2) * 0.02))
    return g
  }
  if (stage === 1) {
    g.add(C(0.005, 0.006, 0.06, green, 0, 0.03, 0, 6))
    g.add(leaf(green, 0.025, 0.014, -0.5, 0, 0.06))
    g.add(leaf(green, 0.025, 0.014, -0.5, Math.PI, 0.06))
    return g
  }
  const big = stage === 3
  if (crop === 'sawi') {
    const n = big ? 9 : 6
    for (let i = 0; i < n; i++) {
      g.add(leaf(green, big ? 0.11 : 0.07, big ? 0.06 : 0.04, -1.1 + (i % 3) * 0.25, (i / n) * Math.PI * 2, 0.01))
    }
    const stem = M('#d9ecc0', 0.8)
    g.add(C(0.02, 0.03, big ? 0.08 : 0.05, stem, 0, 0.03, 0, 8))
    return g
  }
  const h = crop === 'tomat' ? (big ? 0.45 : 0.25) : big ? 0.32 : 0.2
  g.add(C(0.008, 0.012, h, M('#5d8a3e', 0.8), 0, h / 2, 0, 6))
  if (crop === 'tomat' && big) g.add(C(0.006, 0.006, h + 0.15, M('#b48a5a', 0.9), 0.04, (h + 0.15) / 2, 0, 5))
  const leaves = big ? 10 : 6
  const leafLen = crop === 'terong' ? 0.07 : 0.05
  for (let i = 0; i < leaves; i++) {
    g.add(leaf(green, leafLen, leafLen * 0.55, -0.9 + (i % 2) * 0.3, i * 2.4, (h * (i + 1)) / (leaves + 1)))
  }
  if (big) {
    if (crop === 'cabai') {
      const m = M('#d8352c', 0.4)
      for (let i = 0; i < 9; i++) {
        const a = i * 2.1
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.06, 6), i % 4 === 0 ? M('#3f8f3a', 0.5) : m)
        c.position.set(Math.cos(a) * 0.05, h * (0.35 + (i % 3) * 0.18), Math.sin(a) * 0.05)
        c.rotation.z = Math.PI + (Math.random() - 0.5) * 0.4
        c.castShadow = true
        g.add(c)
      }
    } else if (crop === 'tomat') {
      for (let i = 0; i < 6; i++) {
        const a = i * 1.9
        g.add(S(0.025, M(i % 3 === 0 ? '#f0a33a' : '#e2492f', 0.35), Math.cos(a) * 0.06, h * (0.3 + (i % 3) * 0.2), Math.sin(a) * 0.06))
      }
    } else if (crop === 'terong') {
      for (let i = 0; i < 3; i++) {
        const a = i * 2.2
        const t = S(0.022, M('#5b2a6e', 0.25), Math.cos(a) * 0.06, h * 0.35, Math.sin(a) * 0.06, 1, 2.6, 1)
        t.rotation.z = (Math.random() - 0.5) * 0.4
        g.add(t)
      }
    }
  }
  return g
}

export class Garden {
  constructor(scene, physics, saved) {
    this.scene = scene
    this.plots = []
    const wood = M('#8a6142', 0.9)
    const dropTex = iconTexture('drop')
    const readyTex = iconTexture('note')

    for (const p of PLOTS) {
      const w = p.x1 - p.x0
      const d = p.z1 - p.z0
      const cx = (p.x0 + p.x1) / 2
      const cz = -(p.z0 + p.z1) / 2
      const g = new THREE.Group()
      g.position.set(cx, 0, cz)
      const bh = 0.2
      g.add(B(w, bh, 0.04, wood, 0, bh / 2, d / 2 - 0.02))
      g.add(B(w, bh, 0.04, wood, 0, bh / 2, -d / 2 + 0.02))
      g.add(B(0.04, bh, d - 0.08, wood, w / 2 - 0.02, bh / 2, 0))
      g.add(B(0.04, bh, d - 0.08, wood, -w / 2 + 0.02, bh / 2, 0))
      const soilMat = new THREE.MeshStandardMaterial({ color: '#6b4a33', roughness: 1 })
      const soil = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.16, d - 0.08), soilMat)
      soil.position.y = 0.09
      soil.receiveShadow = true
      g.add(soil)
      // gundukan tanah kecil biar nggak rata banget
      for (let i = 0; i < 6; i++) {
        const lump = S(0.05, soilMat, (Math.random() - 0.5) * (w - 0.2), 0.17, (Math.random() - 0.5) * (d - 0.2), 1, 0.25, 1)
        lump.castShadow = false
        g.add(lump)
      }
      const plants = new THREE.Group()
      plants.position.y = 0.18
      g.add(plants)
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: dropTex, transparent: true, depthTest: false }))
      icon.scale.setScalar(0.16)
      icon.position.y = 0.75
      icon.renderOrder = 9
      icon.visible = false
      g.add(icon)
      scene.add(g)
      physics.addPlan(p.x0, p.z0, p.x1, p.z1, 'plot')

      const s = saved?.plots?.[p.id] || {}
      this.plots.push({
        id: p.id,
        x: cx,
        z: cz,
        // titik berdiri pemain di depan bedeng
        standZ: cz + d / 2 + 0.3,
        group: g,
        plants,
        soilMat,
        icon,
        dropTex,
        readyTex,
        crop: s.crop || null,
        stage: s.stage ?? 0,
        progress: s.progress ?? 0,
        watered: s.watered ?? false,
        builtKey: '',
      })
    }

    // tanaman tetap tumbuh walau game ditutup (selama sudah disiram)
    if (saved?.time) {
      const away = Math.min((Date.now() - saved.time) / 1000, 60 * 60 * 6)
      for (const p of this.plots) if (p.crop && p.watered) this.grow(p, away)
    }
    this.harvested = saved?.harvested || { cabai: 0, tomat: 0, sawi: 0, terong: 0 }
    this.plots.forEach((p) => this.refresh(p))
  }

  grow(p, seconds) {
    if (!p.crop || p.stage >= 3 || !p.watered) return
    p.progress += seconds
    const need = CROPS[p.crop].stageTime
    if (p.progress >= need) {
      p.progress = 0
      p.stage++
      p.watered = false
      this.refresh(p)
      return true
    }
  }

  refresh(p) {
    const key = `${p.crop}-${p.stage}`
    if (key !== p.builtKey) {
      p.plants.clear()
      if (p.crop) {
        for (const ox of [-0.18, 0.18]) {
          const plant = buildPlant(p.crop, p.stage)
          plant.position.x = ox
          plant.rotation.y = Math.random() * Math.PI
          p.plants.add(plant)
        }
      }
      p.builtKey = key
      p.pop = 0.25
    }
    p.soilMat.color.set(p.watered ? '#4a3122' : '#6b4a33')
    const thirsty = !!p.crop && p.stage < 3 && !p.watered
    const ready = !!p.crop && p.stage === 3
    p.icon.visible = thirsty || ready
    p.icon.material.map = ready ? p.readyTex : p.dropTex
  }

  plant(p, crop) {
    p.crop = crop
    p.stage = 0
    p.progress = 0
    p.watered = false
    this.refresh(p)
  }

  water(p) {
    p.watered = true
    this.refresh(p)
  }

  harvest(p) {
    const crop = p.crop
    const [a, b] = CROPS[crop].yield
    const n = a + Math.floor(Math.random() * (b - a + 1))
    this.harvested[crop] = (this.harvested[crop] || 0) + n
    p.crop = null
    p.stage = 0
    p.progress = 0
    p.watered = false
    this.refresh(p)
    return { crop, n }
  }

  update(dt, time) {
    let changed = false
    for (const p of this.plots) {
      if (this.grow(p, dt)) changed = true
      if (p.icon.visible) p.icon.position.y = 0.72 + Math.sin(time * 3 + p.id) * 0.04
      if (p.pop > 0) {
        p.pop -= dt
        const s = 1 + Math.sin((p.pop / 0.25) * Math.PI) * 0.15
        p.plants.scale.setScalar(s)
      }
    }
    return changed
  }

  nearest(pos, maxD = 0.95) {
    let best = null
    let bestD = maxD
    for (const p of this.plots) {
      const d = Math.hypot(pos.x - p.x, pos.z - p.z)
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    return best
  }

  save() {
    return {
      time: Date.now(),
      harvested: this.harvested,
      plots: this.plots.map((p) => ({ crop: p.crop, stage: p.stage, progress: p.progress, watered: p.watered })),
    }
  }
}
