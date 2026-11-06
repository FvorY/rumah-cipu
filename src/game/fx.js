import * as THREE from 'three'
import { iconTexture } from './textures'

// partikel sprite kecil: hati, zzz, tetes air
export class Fx {
  constructor(scene) {
    this.scene = scene
    this.items = []
    this.tex = { heart: iconTexture('heart'), z: iconTexture('z'), drop: iconTexture('drop'), steam: iconTexture('steam') }
  }

  spawn(kind, pos, opts = {}) {
    const mat = new THREE.SpriteMaterial({ map: this.tex[kind], transparent: true, depthWrite: false })
    const s = new THREE.Sprite(mat)
    const size = opts.size || (kind === 'drop' ? 0.06 : 0.16)
    s.scale.setScalar(size)
    s.position.copy(pos)
    s.position.x += (Math.random() - 0.5) * 0.12
    s.renderOrder = 5
    this.scene.add(s)
    const vel =
      opts.vel ||
      (kind === 'heart'
        ? new THREE.Vector3((Math.random() - 0.5) * 0.15, 0.45, 0)
        : kind === 'z'
          ? new THREE.Vector3(0.12, 0.22, 0)
          : kind === 'steam'
            ? new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.35, 0)
            : new THREE.Vector3(0, -1.2, 0))
    this.items.push({ s, vel, life: opts.life || (kind === 'drop' ? 0.45 : kind === 'steam' ? 1.6 : 1.4), age: 0, kind, size })
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i]
      p.age += dt
      p.s.position.addScaledVector(p.vel, dt)
      if (p.kind === 'drop') p.vel.y -= dt * 4
      const t = p.age / p.life
      p.s.material.opacity = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8
      if (p.kind === 'steam') p.s.scale.setScalar(p.size * (0.6 + t * 1.2))
      else if (p.kind !== 'drop') p.s.scale.setScalar(p.size * (0.7 + Math.min(1, t * 3) * 0.3))
      if (p.age >= p.life) {
        this.scene.remove(p.s)
        p.s.material.dispose()
        this.items.splice(i, 1)
      }
    }
  }
}
