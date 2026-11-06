// Grid navigasi + A* buat kucing dan mode tur (auto jalan).
// Grid dibangun dari collider yang sama dengan physics, lalu "digemukkan"
// sebesar radius agen biar nggak nyangkut di kusen pintu.

export class NavGrid {
  constructor(colliders, { minX, maxX, minZ, maxZ, cell = 0.1, inflate = 0.2 }) {
    this.minX = minX
    this.minZ = minZ
    this.cell = cell
    this.w = Math.ceil((maxX - minX) / cell)
    this.h = Math.ceil((maxZ - minZ) / cell)
    this.blocked = new Uint8Array(this.w * this.h)
    this.inflate = inflate
    this.rebuild(colliders)

    const n = this.w * this.h
    this.g = new Float32Array(n)
    this.came = new Int32Array(n)
    this.state = new Uint8Array(n)
    this.heap = new Int32Array(n)
    this.f = new Float32Array(n)
  }

  rebuild(colliders) {
    const { w, h, cell, inflate } = this
    this.blocked.fill(0)
    for (const c of colliders) {
      if (c.disabled || c.noNav) continue
      const x0 = Math.max(0, Math.floor((c.minX - inflate - this.minX) / cell))
      const x1 = Math.min(w - 1, Math.ceil((c.maxX + inflate - this.minX) / cell))
      const z0 = Math.max(0, Math.floor((c.minZ - inflate - this.minZ) / cell))
      const z1 = Math.min(h - 1, Math.ceil((c.maxZ + inflate - this.minZ) / cell))
      for (let j = z0; j <= z1; j++) {
        for (let i = x0; i <= x1; i++) {
          const px = this.minX + (i + 0.5) * cell
          const pz = this.minZ + (j + 0.5) * cell
          const dx = px - Math.max(c.minX, Math.min(px, c.maxX))
          const dz = pz - Math.max(c.minZ, Math.min(pz, c.maxZ))
          if (dx * dx + dz * dz < inflate * inflate) this.blocked[j * w + i] = 1
        }
      }
    }
  }

  toCell(x, z) {
    const i = Math.floor((x - this.minX) / this.cell)
    const j = Math.floor((z - this.minZ) / this.cell)
    return [Math.max(0, Math.min(this.w - 1, i)), Math.max(0, Math.min(this.h - 1, j))]
  }

  center(i, j) {
    return { x: this.minX + (i + 0.5) * this.cell, z: this.minZ + (j + 0.5) * this.cell }
  }

  isFree(x, z) {
    const [i, j] = this.toCell(x, z)
    return !this.blocked[j * this.w + i]
  }

  nearestFree(x, z, maxR = 30) {
    const [ci, cj] = this.toCell(x, z)
    if (!this.blocked[cj * this.w + ci]) return { x, z }
    for (let r = 1; r < maxR; r++) {
      let best = null
      let bestD = Infinity
      for (let j = cj - r; j <= cj + r; j++) {
        for (let i = ci - r; i <= ci + r; i++) {
          if (i < 0 || j < 0 || i >= this.w || j >= this.h) continue
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue
          if (this.blocked[j * this.w + i]) continue
          const p = this.center(i, j)
          const d = (p.x - x) ** 2 + (p.z - z) ** 2
          if (d < bestD) {
            bestD = d
            best = p
          }
        }
      }
      if (best) return best
    }
    return null
  }

  // titik acak yang bisa dilewati, opsional dibatasi rect dunia
  randomFree(rand = Math.random, rect) {
    for (let k = 0; k < 200; k++) {
      let x, z
      if (rect) {
        x = rect.minX + rand() * (rect.maxX - rect.minX)
        z = rect.minZ + rand() * (rect.maxZ - rect.minZ)
      } else {
        x = this.minX + rand() * this.w * this.cell
        z = this.minZ + rand() * this.h * this.cell
      }
      if (this.isFree(x, z)) return { x, z }
    }
    return null
  }

  lineFree(a, b) {
    const dx = b.x - a.x
    const dz = b.z - a.z
    const steps = Math.ceil(Math.hypot(dx, dz) / (this.cell * 0.5))
    for (let s = 1; s < steps; s++) {
      if (!this.isFree(a.x + (dx * s) / steps, a.z + (dz * s) / steps)) return false
    }
    return true
  }

  findPath(from, to) {
    const start = this.nearestFree(from.x, from.z, 8)
    const goal = this.nearestFree(to.x, to.z)
    if (!start || !goal) return null
    const [si, sj] = this.toCell(start.x, start.z)
    const [gi, gj] = this.toCell(goal.x, goal.z)
    const { w, g, came, state, heap, f, blocked } = this
    const S = sj * w + si
    const G = gj * w + gi
    state.fill(0)
    let size = 0

    const push = (n) => {
      let i = size++
      heap[i] = n
      while (i > 0) {
        const p = (i - 1) >> 1
        if (f[heap[p]] <= f[heap[i]]) break
        ;[heap[p], heap[i]] = [heap[i], heap[p]]
        i = p
      }
    }
    const pop = () => {
      const top = heap[0]
      heap[0] = heap[--size]
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < size && f[heap[l]] < f[heap[m]]) m = l
        if (r < size && f[heap[r]] < f[heap[m]]) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i], heap[m]]
        i = m
      }
      return top
    }
    const hfun = (i, j) => {
      const dx = Math.abs(i - gi)
      const dz = Math.abs(j - gj)
      return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)
    }

    g[S] = 0
    f[S] = hfun(si, sj)
    came[S] = -1
    state[S] = 1
    push(S)
    let found = false
    let guard = 0
    while (size > 0 && guard++ < 60000) {
      const cur = pop()
      if (state[cur] === 2) continue
      if (cur === G) {
        found = true
        break
      }
      state[cur] = 2
      const ci = cur % w
      const cj = (cur / w) | 0
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue
          const ni = ci + di
          const nj = cj + dj
          if (ni < 0 || nj < 0 || ni >= w || nj >= this.h) continue
          const n = nj * w + ni
          if (blocked[n] || state[n] === 2) continue
          // jangan motong sudut
          if (di && dj && (blocked[cj * w + ni] || blocked[nj * w + ci])) continue
          const cost = g[cur] + (di && dj ? Math.SQRT2 : 1)
          if (state[n] === 1 && cost >= g[n]) continue
          g[n] = cost
          f[n] = cost + hfun(ni, nj)
          came[n] = cur
          state[n] = 1
          push(n)
        }
      }
    }
    if (!found) return null

    const raw = []
    for (let n = G; n !== -1; n = came[n]) raw.push(this.center(n % w, (n / w) | 0))
    raw.reverse()
    raw[raw.length - 1] = goal

    // string pulling biar jalannya nggak zig-zag
    const out = [raw[0]]
    let anchor = raw[0]
    for (let k = 2; k < raw.length; k++) {
      if (!this.lineFree(anchor, raw[k])) {
        anchor = raw[k - 1]
        out.push(anchor)
      }
    }
    out.push(raw[raw.length - 1])
    return out
  }
}
