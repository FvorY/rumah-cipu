// Semua suara disintesis pakai WebAudio, nggak ada file audio.
import { music } from './music'

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
    music.init(ctx, master, noise)
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

let carEngine = null
let motorEngine = null

const createEngine = (isMotor = false) => {
  if (!ensure()) return null
  const now = ctx.currentTime

  const osc1 = ctx.createOscillator()
  osc1.type = isMotor ? 'sawtooth' : 'triangle'
  const osc2 = ctx.createOscillator()
  osc2.type = isMotor ? 'triangle' : 'sawtooth'
  const sub = ctx.createOscillator()
  sub.type = 'sine'

  const baseFreq = isMotor ? 54 : 38
  osc1.frequency.setValueAtTime(baseFreq, now)
  osc2.frequency.setValueAtTime(baseFreq * 1.02 + 1.2, now)
  sub.frequency.setValueAtTime(baseFreq * 0.5, now)

  const filter = ctx.createBiquadFilter()
  filter.type = isMotor ? 'bandpass' : 'lowpass'
  filter.frequency.setValueAtTime(isMotor ? 650 : 220, now)
  filter.Q.value = isMotor ? 2.5 : 2.0

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(isMotor ? 0.16 : 0.18, now + 0.15)

  osc1.connect(filter)
  osc2.connect(filter)
  sub.connect(gain)
  filter.connect(gain)
  gain.connect(master)

  osc1.start(now)
  osc2.start(now)
  sub.start(now)

  return { osc1, osc2, sub, filter, gain, isMotor }
}

const updateEngine = (eng, speed, throttle, isFast) => {
  if (!eng || !ctx) return
  const now = ctx.currentTime
  const isMotor = eng.isMotor
  const maxSpd = isMotor ? (isFast ? 7.5 : 4.8) : (isFast ? 6.5 : 4.2)
  const r = Math.min(1, Math.max(0, Math.abs(speed) / maxSpd))
  const gas = throttle > 0 ? (isFast ? 1 : 0.6) : 0
  const rev = throttle < 0 ? 0.3 : 0

  const base = isMotor ? 52 : 36
  const pitchMult = isMotor ? 75 : 55
  const targetFreq = base + r * pitchMult + gas * (isMotor ? 45 : 32) + rev * 15

  eng.osc1.frequency.setTargetAtTime(targetFreq, now, 0.08)
  eng.osc2.frequency.setTargetAtTime(targetFreq * 1.02 + 1.2, now, 0.08)
  eng.sub.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08)

  const baseCutoff = isMotor ? 650 : 200
  const targetCutoff = baseCutoff + r * (isMotor ? 800 : 420) + gas * (isMotor ? 350 : 200)
  eng.filter.frequency.setTargetAtTime(targetCutoff, now, 0.08)

  const targetVol = muted ? 0 : (isMotor ? 0.16 : 0.18) + r * 0.08 + gas * 0.05
  eng.gain.gain.setTargetAtTime(targetVol, now, 0.06)
}

const stopEngine = (eng) => {
  if (!eng || !ctx) return null
  const now = ctx.currentTime
  eng.gain.gain.cancelScheduledValues(now)
  eng.gain.gain.setTargetAtTime(0.0001, now, 0.1)
  setTimeout(() => {
    try {
      eng.osc1.stop()
      eng.osc2.stop()
      eng.sub.stop()
      eng.osc1.disconnect()
      eng.osc2.disconnect()
      eng.sub.disconnect()
      eng.filter.disconnect()
      eng.gain.disconnect()
    } catch {}
  }, 250)
  return null
}

export const sound = {
  unlock() {
    ensure()
  },
  setMuted(v) {
    muted = v
    if (master) master.gain.value = v ? 0 : 0.55
    if (carEngine && ctx) carEngine.gain.gain.setTargetAtTime(v ? 0 : 0.18, ctx.currentTime, 0.05)
    if (motorEngine && ctx) motorEngine.gain.gain.setTargetAtTime(v ? 0 : 0.16, ctx.currentTime, 0.05)
    music.setMuted(v)
  },
  get muted() {
    return muted
  },

  startBGM() {
    if (!ensure()) return
    music.start()
  },
  stopBGM() {
    music.stop()
  },
  toggleMusic() {
    return music.toggle()
  },
  setMusicMuted(v) {
    music.setMuted(v)
  },
  isMusicPlaying() {
    return music.isPlaying()
  },

  startCarEngine() {
    if (carEngine) return
    carEngine = createEngine(false)
  },
  updateCarEngine(speed, throttle, isFast) {
    if (!carEngine) carEngine = createEngine(false)
    updateEngine(carEngine, speed, throttle, isFast)
  },
  stopCarEngine() {
    carEngine = stopEngine(carEngine)
  },

  startMotorEngine() {
    if (motorEngine) return
    motorEngine = createEngine(true)
  },
  updateMotorEngine(speed, throttle, isFast) {
    if (!motorEngine) motorEngine = createEngine(true)
    updateEngine(motorEngine, speed, throttle, isFast)
  },
  stopMotorEngine() {
    motorEngine = stopEngine(motorEngine)
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
