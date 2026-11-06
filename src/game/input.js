// keyboard + drag kamera + pinch. Joystick HP diisi dari komponen Vue.
export class Input {
  constructor(el) {
    this.el = el
    this.keys = new Set()
    this.joy = { x: 0, y: 0 }
    this.yaw = 0
    this.pitch = 0
    this.zoom = 0
    this.handlers = new Map()
    this.pointers = new Map()
    this.pinchD = 0

    this._down = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault()
      if (!this.keys.has(k)) {
        this.handlers.get(k)?.forEach((fn) => fn(e))
        if (k === ' ') this.handlers.get('space')?.forEach((fn) => fn(e))
      }
      this.keys.add(k)
      if (k === ' ') this.keys.add('space')
    }
    this._up = (e) => {
      const k = e.key.toLowerCase()
      this.keys.delete(k)
      if (k === ' ') this.keys.delete('space')
    }
    this._blur = () => this.keys.clear()

    this._pdown = (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      el.setPointerCapture?.(e.pointerId)
      if (this.pointers.size === 2) this.pinchD = this.pinchDistance()
    }
    this._pmove = (e) => {
      const p = this.pointers.get(e.pointerId)
      if (!p) return
      if (this.pointers.size === 1) {
        this.yaw -= (e.clientX - p.x) * 0.0065
        this.pitch += (e.clientY - p.y) * 0.004
      }
      p.x = e.clientX
      p.y = e.clientY
      if (this.pointers.size === 2) {
        const d = this.pinchDistance()
        this.zoom -= (d - this.pinchD) * 0.012
        this.pinchD = d
      }
    }
    this._pup = (e) => this.pointers.delete(e.pointerId)
    this._wheel = (e) => {
      e.preventDefault()
      this.zoom += Math.sign(e.deltaY) * 0.6
    }

    window.addEventListener('keydown', this._down)
    window.addEventListener('keyup', this._up)
    window.addEventListener('blur', this._blur)
    el.addEventListener('pointerdown', this._pdown)
    el.addEventListener('pointermove', this._pmove)
    el.addEventListener('pointerup', this._pup)
    el.addEventListener('pointercancel', this._pup)
    el.addEventListener('wheel', this._wheel, { passive: false })
  }

  pinchDistance() {
    const [a, b] = [...this.pointers.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  on(key, fn) {
    if (!this.handlers.has(key)) this.handlers.set(key, [])
    this.handlers.get(key).push(fn)
  }

  // x = kanan, y = maju
  axis() {
    const k = this.keys
    let x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)
    let y = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
    x += this.joy.x
    y += this.joy.y
    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    return { x, y }
  }

  get running() {
    return this.keys.has('shift') || Math.hypot(this.joy.x, this.joy.y) > 0.92
  }

  takeCamera() {
    const out = { yaw: this.yaw, pitch: this.pitch, zoom: this.zoom }
    this.yaw = this.pitch = this.zoom = 0
    return out
  }

  dispose() {
    window.removeEventListener('keydown', this._down)
    window.removeEventListener('keyup', this._up)
    window.removeEventListener('blur', this._blur)
    this.el.removeEventListener('pointerdown', this._pdown)
    this.el.removeEventListener('pointermove', this._pmove)
    this.el.removeEventListener('pointerup', this._pup)
    this.el.removeEventListener('pointercancel', this._pup)
    this.el.removeEventListener('wheel', this._wheel)
  }
}
