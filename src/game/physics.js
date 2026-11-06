// Tabrakan 2D sederhana: semua penghalang berupa kotak sejajar sumbu (AABB)
// di bidang xz dunia. Karakter & kucing dianggap lingkaran.

export class Physics {
  constructor() {
    this.colliders = []
  }

  add(minX, maxX, minZ, maxZ, tag) {
    const c = { minX, maxX, minZ, maxZ, tag }
    this.colliders.push(c)
    return c
  }

  // kotak dalam koordinat denah (x0, z0, x1, z1)
  addPlan(x0, z0, x1, z1, tag) {
    return this.add(Math.min(x0, x1), Math.max(x0, x1), -Math.max(z0, z1), -Math.min(z0, z1), tag)
  }

  resolve(pos, r) {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false
      for (const c of this.colliders) {
        if (c.disabled) continue
        const cx = Math.max(c.minX, Math.min(pos.x, c.maxX))
        const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ))
        const dx = pos.x - cx
        const dz = pos.z - cz
        const d2 = dx * dx + dz * dz
        if (d2 >= r * r) continue
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2)
          pos.x += (dx / d) * (r - d)
          pos.z += (dz / d) * (r - d)
        } else {
          // titik pusat masuk ke dalam kotak, dorong lewat sisi terdekat
          const pushes = [
            [pos.x - c.minX + r, -1, 0],
            [c.maxX - pos.x + r, 1, 0],
            [pos.z - c.minZ + r, 0, -1],
            [c.maxZ - pos.z + r, 0, 1],
          ].sort((a, b) => a[0] - b[0])
          pos.x += pushes[0][1] * pushes[0][0]
          pos.z += pushes[0][2] * pushes[0][0]
        }
        moved = true
      }
      if (!moved) break
    }
    return pos
  }
}
