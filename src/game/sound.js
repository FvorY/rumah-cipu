// Semua suara disintesis pakai WebAudio, nggak ada file audio.

let ctx = null
let master = null
let muted = false

const ensure = () => {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

let noiseBuf = null
const noise = () => {
  if (noiseBuf) return noiseBuf
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return noiseBuf
}

const env = (g, t, a, peak, hold, rel) => {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + a)
  g.gain.setValueAtTime(peak, t + a + hold)
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel)
}

export const sound = {
  unlock() {
    ensure()
  },
  setMuted(v) {
    muted = v
    if (master) master.gain.value = v ? 0 : 0.55
  },
  get muted() {
    return muted
  },

  meow(pitch = 1) {
    if (!ensure() || muted) return
    const t = ctx.currentTime + 0.01
    const dur = 0.45 + Math.random() * 0.25
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    const base = 480 * pitch * (0.92 + Math.random() * 0.16)
    osc.frequency.setValueAtTime(base * 0.85, t)
    osc.frequency.linearRampToValueAtTime(base * 1.45, t + dur * 0.35)
    osc.frequency.linearRampToValueAtTime(base * 0.8, t + dur)
    // dua formant biar kedengeran "me-ow"
    const f1 = ctx.createBiquadFilter()
    f1.type = 'bandpass'
    f1.Q.value = 6
    f1.frequency.setValueAtTime(700 * pitch, t)
    f1.frequency.linearRampToValueAtTime(1500 * pitch, t + dur * 0.4)
    f1.frequency.linearRampToValueAtTime(800 * pitch, t + dur)
    const f2 = ctx.createBiquadFilter()
    f2.type = 'bandpass'
    f2.Q.value = 8
    f2.frequency.setValueAtTime(2300 * pitch, t)
    const g = ctx.createGain()
    env(g, t, 0.05, 0.5, dur * 0.5, dur * 0.45)
    const mix = ctx.createGain()
    mix.gain.value = 0.9
    osc.connect(f1)
    osc.connect(f2)
    f1.connect(g)
    f2.connect(mix)
    mix.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + dur + 0.1)
  },

  purr(seconds = 2) {
    if (!ensure() || muted) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = noise()
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 220
    const am = ctx.createGain()
    am.gain.value = 0
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 24
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.5
    lfo.connect(lfoGain)
    lfoGain.connect(am.gain)
    const g = ctx.createGain()
    env(g, t, 0.25, 0.9, seconds - 0.6, 0.4)
    src.connect(lp)
    lp.connect(am)
    am.connect(g)
    g.connect(master)
    src.start(t)
    lfo.start(t)
    src.stop(t + seconds + 0.1)
    lfo.stop(t + seconds + 0.1)
  },

  honk() {
    if (!ensure() || muted) return
    const t = ctx.currentTime
    for (const [start, len] of [[0, 0.22], [0.3, 0.4]]) {
      const g = ctx.createGain()
      env(g, t + start, 0.01, 0.28, len, 0.05)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1800
      for (const f of [415, 500]) {
        const o = ctx.createOscillator()
        o.type = 'square'
        o.frequency.value = f
        o.connect(lp)
        o.start(t + start)
        o.stop(t + start + len + 0.1)
      }
      lp.connect(g)
      g.connect(master)
    }
  },

  water() {
    if (!ensure() || muted) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = noise()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2600
    bp.Q.value = 0.8
    const g = ctx.createGain()
    env(g, t, 0.08, 0.25, 0.7, 0.4)
    src.connect(bp)
    bp.connect(g)
    g.connect(master)
    src.start(t)
    src.stop(t + 1.3)
  },

  pop(high = 1) {
    if (!ensure() || muted) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(380 * high, t)
    o.frequency.exponentialRampToValueAtTime(900 * high, t + 0.12)
    const g = ctx.createGain()
    env(g, t, 0.005, 0.35, 0.03, 0.15)
    o.connect(g)
    g.connect(master)
    o.start(t)
    o.stop(t + 0.25)
  },

  jump() {
    if (!ensure() || muted) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(260, t)
    o.frequency.exponentialRampToValueAtTime(580, t + 0.11)
    const g = ctx.createGain()
    env(g, t, 0.005, 0.22, 0.03, 0.09)
    o.connect(g)
    g.connect(master)
    o.start(t)
    o.stop(t + 0.18)
  },

  land() {
    if (!ensure() || muted) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = noise()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(280, t)
    lp.frequency.exponentialRampToValueAtTime(70, t + 0.07)
    const g = ctx.createGain()
    env(g, t, 0.002, 0.14, 0.01, 0.06)
    src.connect(lp)
    lp.connect(g)
    g.connect(master)
    src.start(t)
    src.stop(t + 0.09)
  },

  // bunyi "bip bip" answer back smart key
  beep() {
    if (!ensure() || muted) return
    const t = ctx.currentTime
    for (const start of [0, 0.16]) {
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.value = 2350
      const g = ctx.createGain()
      env(g, t + start, 0.005, 0.12, 0.07, 0.03)
      o.connect(g)
      g.connect(master)
      o.start(t + start)
      o.stop(t + start + 0.14)
    }
  },

  // noise yang jalan beberapa detik (air shower / minyak di wajan)
  _loop(seconds, setup) {
    if (!ensure() || muted) return
    this.stopLoop()
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = noise()
    src.loop = true
    const g = ctx.createGain()
    env(g, t, 0.2, 0.22, Math.max(0.1, seconds - 0.6), 0.4)
    setup(src, g)
    g.connect(master)
    src.start(t)
    src.stop(t + seconds + 0.1)
    this._src = src
  },
  shower(seconds) {
    this._loop(seconds, (src, g) => {
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1800
      bp.Q.value = 0.5
      src.connect(bp)
      bp.connect(g)
    })
  },
  sizzle(seconds) {
    this._loop(seconds, (src, g) => {
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 3500
      // kresek-kresek: volume naik turun acak
      const am = ctx.createGain()
      const lfo = ctx.createOscillator()
      lfo.type = 'square'
      lfo.frequency.value = 13
      const lg = ctx.createGain()
      lg.gain.value = 0.4
      lfo.connect(lg)
      lg.connect(am.gain)
      lfo.start()
      lfo.stop(ctx.currentTime + seconds + 0.2)
      src.connect(hp)
      hp.connect(am)
      am.connect(g)
    })
  },
  stopLoop() {
    try {
      this._src?.stop()
    } catch {
      // udah berhenti
    }
    this._src = null
  },

  click() {
    if (!ensure() || muted) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = noise()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 900
    const g = ctx.createGain()
    env(g, t, 0.002, 0.18, 0.01, 0.06)
    src.connect(bp)
    bp.connect(g)
    g.connect(master)
    src.start(t)
    src.stop(t + 0.1)
  },
}
