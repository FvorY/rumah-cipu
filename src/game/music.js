// Musik BGM sintesis WebAudio: happy, cute, and funny chibi game theme.
// Menggunakan lookahead scheduler presisi audio context, tanpa file aset eksternal.

const NOTE_MAP = {
  c: 0, 'c#': 1, db: 1,
  d: 2, 'd#': 3, eb: 3,
  e: 4,
  f: 5, 'f#': 6, gb: 6,
  g: 7, 'g#': 8, ab: 8,
  a: 9, 'a#': 10, bb: 10,
  b: 11,
}

function noteToFreq(n) {
  if (!n) return 0
  const m = n.toLowerCase().match(/^([a-g][#b]?)([0-8])$/)
  if (!m) return 0
  const semi = NOTE_MAP[m[1]]
  const oct = parseInt(m[2], 10)
  const midi = 12 * (oct + 1) + semi
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// 16 bar lagu ceria & jenaka (120 BPM, 4/4, 16 steps per bar)
const MEASURES = [
  // Bar 0: C major - pembuka riang & ceria
  {
    bass: [[0, 'C2'], [8, 'G2'], [12, 'C2']],
    chords: [[4, ['E4', 'G4']], [12, ['E4', 'G4']]],
    melody: [[0, 'G4'], [3, 'A4'], [4, 'C5'], [8, 'E5'], [12, 'D5']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 1: C major - lompatan melodi centil
  {
    bass: [[0, 'C2'], [6, 'E2'], [8, 'G2'], [14, 'Bb2']],
    chords: [[4, ['E4', 'G4']], [12, ['E4', 'Bb4']]],
    melody: [[0, 'C5'], [4, 'G4'], [7, 'G#4'], [8, 'A4'], [11, 'B4'], [12, 'C5']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 2: F major - langkah kaki ceria
  {
    bass: [[0, 'F2'], [8, 'C3'], [12, 'A2']],
    chords: [[4, ['F4', 'A4']], [12, ['F4', 'A4']]],
    melody: [[0, 'D5'], [2, 'E5'], [4, 'F5'], [8, 'A5'], [12, 'G5']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 3: Fm - nada belok lucu (twist kartun)
  {
    bass: [[0, 'F2'], [8, 'C3'], [14, 'Ab2']],
    chords: [[4, ['F4', 'Ab4']], [12, ['F4', 'Ab4']]],
    melody: [[0, 'F5'], [4, 'D#5'], [8, 'D5'], [12, 'C5']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [14, 'wood2'], [15, 'wood']],
  },
  // Bar 4: C major - kembali manis
  {
    bass: [[0, 'C2'], [8, 'G2'], [12, 'E2']],
    chords: [[4, ['E4', 'G4']], [12, ['E4', 'G4']]],
    melody: [[0, 'E5'], [4, 'C5'], [8, 'G4'], [10, 'A4'], [12, 'C5']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 5: A7 - ayunan jenaka
  {
    bass: [[0, 'A2'], [8, 'E3'], [12, 'C#3']],
    chords: [[4, ['G4', 'A4', 'C#5']], [12, ['G4', 'A4', 'C#5']]],
    melody: [[0, 'E5'], [3, 'F5'], [4, 'E5'], [8, 'C#5'], [12, 'A4']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 6: Dm7 - jalan santai
  {
    bass: [[0, 'D2'], [8, 'A2'], [12, 'F2']],
    chords: [[4, ['F4', 'A4', 'C5']], [12, ['F4', 'A4', 'C5']]],
    melody: [[0, 'D5'], [4, 'F5'], [8, 'A5'], [12, 'G5']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 7: G7 - ketukan kayu kocak penutup bait 1
  {
    bass: [[0, 'G2'], [6, 'B2'], [8, 'D3'], [12, 'F3']],
    chords: [[4, ['F4', 'B4']], [12, ['F4', 'B4']]],
    melody: [[0, 'F5'], [4, 'D5'], [8, 'B4'], [12, 'G4']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [13, 'wood2'], [14, 'wood'], [15, 'wood2']],
  },
  // Bar 8: Em - Bagian B (lebih usil & kartunis)
  {
    bass: [[0, 'E2'], [8, 'B2'], [12, 'G2']],
    chords: [[4, ['G4', 'B4', 'E5']], [12, ['G4', 'B4', 'E5']]],
    melody: [[0, 'B5'], [3, 'A5'], [4, 'G5'], [8, 'E5'], [12, 'B4']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 9: A7 - perosotan nada kromatik lucu ke bawah
  {
    bass: [[0, 'A2'], [8, 'G2'], [12, 'F#2'], [14, 'F2']],
    chords: [[4, ['G4', 'A4', 'C#5']], [12, ['G4', 'A4', 'C#5']]],
    melody: [[0, 'A5'], [4, 'G5'], [6, 'F#5'], [8, 'F5'], [10, 'E5'], [12, 'D#5']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 10: Dm7 - melompat-lompat girang
  {
    bass: [[0, 'D2'], [8, 'A2'], [12, 'C3']],
    chords: [[4, ['F4', 'A4', 'C5']], [12, ['F4', 'A4', 'C5']]],
    melody: [[0, 'D5'], [4, 'F5'], [7, 'F#5'], [8, 'G5'], [11, 'G#5'], [12, 'A5']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 11: G7 - tingkah konyol
  {
    bass: [[0, 'G2'], [8, 'D3'], [12, 'B2'], [14, 'G2']],
    chords: [[4, ['F4', 'B4', 'D5']], [12, ['F4', 'B4', 'D5']]],
    melody: [[0, 'B5'], [4, 'G5'], [8, 'D5'], [12, 'B4']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 12: C major ke C7 - naik semangat
  {
    bass: [[0, 'C2'], [6, 'G2'], [8, 'Bb2'], [12, 'C3']],
    chords: [[4, ['E4', 'G4', 'C5']], [12, ['E4', 'Bb4', 'C5']]],
    melody: [[0, 'C5'], [3, 'D5'], [4, 'E5'], [7, 'G5'], [8, 'Bb5'], [12, 'C6']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 13: F ke F#dim - akord komedi klasik
  {
    bass: [[0, 'F2'], [6, 'C3'], [8, 'F#2'], [14, 'C3']],
    chords: [[4, ['F4', 'A4', 'C5']], [12, ['F#4', 'A4', 'C5']]],
    melody: [[0, 'A5'], [4, 'F5'], [8, 'C5'], [11, 'D#5'], [12, 'C5']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 14: C/G ke G7 - ayunan balik
  {
    bass: [[0, 'G2'], [4, 'G2'], [8, 'G2'], [12, 'B2']],
    chords: [[4, ['E4', 'G4', 'C5']], [12, ['F4', 'B4', 'D5']]],
    melody: [[0, 'E5'], [2, 'G5'], [4, 'E5'], [6, 'C5'], [8, 'D5'], [10, 'F5'], [12, 'B4']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [12, 'wood'], [2, 'hat'], [6, 'hat'], [10, 'hat'], [14, 'hat']],
  },
  // Bar 15: C major - penutup ceria & siap looping mulus
  {
    bass: [[0, 'C2'], [4, 'E2'], [8, 'G2'], [12, 'C3']],
    chords: [[4, ['E4', 'G4', 'C5']], [10, ['E4', 'G4', 'C5']], [12, ['E4', 'G4', 'C5']]],
    melody: [[0, 'C5'], [4, 'G4'], [8, 'E4'], [10, 'G4'], [12, 'C5']],
    drums: [[0, 'kick'], [4, 'wood'], [8, 'kick'], [10, 'wood2'], [12, 'wood'], [14, 'wood2'], [15, 'wood']],
  },
]

class MusicEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.getNoise = null
    this.bgmGain = null
    this.isPlayingState = false
    this.isMutedState = false
    this.currentStep = 0
    this.nextStepTime = 0
    this.timerId = null
    this.stepDuration = 0.125 // 120 BPM -> 16th note = 125ms
  }

  init(ctx, masterNode, getNoiseFn) {
    this.ctx = ctx
    this.master = masterNode
    this.getNoise = getNoiseFn
    if (!this.bgmGain && this.ctx) {
      this.bgmGain = this.ctx.createGain()
      this.bgmGain.gain.value = this.isMutedState ? 0 : 0.18
      this.bgmGain.connect(this.master)
    }
  }

  start() {
    if (this.isPlayingState) return
    if (!this.ctx) return
    this.isPlayingState = true
    this.currentStep = 0
    this.nextStepTime = this.ctx.currentTime + 0.08
    this.schedule()
    if (!this.timerId) {
      this.timerId = setInterval(() => this.schedule(), 35)
    }
  }

  stop() {
    this.isPlayingState = false
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  setMuted(muted) {
    this.isMutedState = !!muted
    if (this.bgmGain && this.ctx) {
      const now = this.ctx.currentTime
      this.bgmGain.gain.cancelScheduledValues(now)
      this.bgmGain.gain.setValueAtTime(this.isMutedState ? 0 : 0.18, now)
    }
  }

  toggle() {
    this.setMuted(!this.isMutedState)
    return !this.isMutedState
  }

  isPlaying() {
    return this.isPlayingState && !this.isMutedState
  }

  schedule() {
    if (!this.isPlayingState || !this.ctx) return

    // Lindungi dari tab background lag
    if (this.nextStepTime < this.ctx.currentTime) {
      this.nextStepTime = this.ctx.currentTime + 0.02
    }

    const lookAhead = 0.12
    while (this.nextStepTime < this.ctx.currentTime + lookAhead) {
      this.playStep(this.currentStep, this.nextStepTime)
      this.nextStepTime += this.stepDuration
      this.currentStep = (this.currentStep + 1) % (MEASURES.length * 16)
    }
  }

  playStep(totalStep, time) {
    const barIdx = Math.floor(totalStep / 16) % MEASURES.length
    const stepInBar = totalStep % 16
    const bar = MEASURES[barIdx]

    // 1. Bass
    for (const [s, n] of bar.bass) {
      if (s === stepInBar) this.playBass(noteToFreq(n), time)
    }

    // 2. Chords (marimba / ukulele stabs)
    for (const [s, notes] of bar.chords) {
      if (s === stepInBar) {
        for (const n of notes) this.playChord(noteToFreq(n), time)
      }
    }

    // 3. Melody (whimsical flute / toy kalimba)
    for (const [s, n] of bar.melody) {
      if (s === stepInBar) this.playMelody(noteToFreq(n), time)
    }

    // 4. Percussion (woodblock, hat, kick)
    for (const [s, drumType] of bar.drums) {
      if (s === stepInBar) this.playDrum(drumType, time)
    }
  }

  // Bass bulat empuk (tuba/synth bass chibi)
  playBass(freq, time) {
    if (!freq || !this.ctx || !this.bgmGain) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, time)

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(380, time)
    lp.Q.value = 1.8

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.linearRampToValueAtTime(0.42, time + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.22)

    osc.connect(lp)
    lp.connect(g)
    g.connect(this.bgmGain)

    osc.start(time)
    osc.stop(time + 0.24)
  }

  // Akord petikan kayu lembut (marimba / ukulele)
  playChord(freq, time) {
    if (!freq || !this.ctx || !this.bgmGain) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, time)

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(freq * 1.5, time)
    bp.Q.value = 2.0

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.linearRampToValueAtTime(0.18, time + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12)

    osc.connect(bp)
    bp.connect(g)
    g.connect(this.bgmGain)

    osc.start(time)
    osc.stop(time + 0.14)
  }

  // Melodi utama riang & jenaka (toy flute dengan vibrato imut)
  playMelody(freq, time) {
    if (!freq || !this.ctx || !this.bgmGain) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, time)

    // Vibrato halus setelah nada berbunyi sejenak
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.setValueAtTime(5.8, time)
    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(0.0001, time)
    lfoGain.gain.linearRampToValueAtTime(5.0, time + 0.08)
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.linearRampToValueAtTime(0.38, time + 0.012)
    g.gain.setValueAtTime(0.32, time + 0.11)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.22)

    osc.connect(g)
    g.connect(this.bgmGain)

    osc.start(time)
    lfo.start(time)
    osc.stop(time + 0.24)
    lfo.stop(time + 0.24)
  }

  // Perkusi imut (woodblock, hat, kick lembut)
  playDrum(type, time) {
    if (!this.ctx || !this.bgmGain) return
    const ctx = this.ctx

    if (type === 'kick') {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(110, time)
      o.frequency.exponentialRampToValueAtTime(42, time + 0.07)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.28, time)
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.08)
      o.connect(g)
      g.connect(this.bgmGain)
      o.start(time)
      o.stop(time + 0.09)
    } else if (type === 'wood' || type === 'wood2') {
      const o = ctx.createOscillator()
      o.type = 'sine'
      const freq = type === 'wood2' ? 1250 : 880
      o.frequency.setValueAtTime(freq, time)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.22, time)
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.035)
      o.connect(g)
      g.connect(this.bgmGain)
      o.start(time)
      o.stop(time + 0.04)
    } else if (type === 'hat' && this.getNoise) {
      const src = ctx.createBufferSource()
      src.buffer = this.getNoise()
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(6200, time)
      bp.Q.value = 4.0
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.08, time)
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.022)
      src.connect(bp)
      bp.connect(g)
      g.connect(this.bgmGain)
      src.start(time)
      src.stop(time + 0.03)
    }
  }
}

export const music = new MusicEngine()
