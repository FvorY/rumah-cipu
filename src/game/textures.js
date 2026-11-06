import * as THREE from 'three'

// semua tekstur digambar pakai canvas, jadi nggak perlu file gambar
export const rng = (seed = 1) => {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const makeCanvas = (w, h, draw) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  return c
}

export const toTexture = (canvas, repeat = true) => {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

const speckle = (g, w, h, r, count, colors, alpha = 0.08, size = 3) => {
  for (let i = 0; i < count; i++) {
    g.globalAlpha = alpha * (0.5 + r())
    g.fillStyle = colors[Math.floor(r() * colors.length)]
    const s = 1 + r() * size
    g.fillRect(r() * w, r() * h, s, s)
  }
  g.globalAlpha = 1
}

const tiles = (g, w, h, n, base, grout, r, vary = 10, groutW = 3) => {
  const s = w / n
  g.fillStyle = grout
  g.fillRect(0, 0, w, h)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const c = new THREE.Color(base)
      c.offsetHSL(0, 0, (r() - 0.5) * vary * 0.004)
      g.fillStyle = `#${c.getHexString()}`
      g.fillRect(i * s + groutW / 2, j * s + groutW / 2, s - groutW, s - groutW)
    }
  }
}

const floorDefs = {
  // meters = ukuran nyata yang diwakili satu tekstur
  wood: {
    meters: 1.2,
    draw: (g, w, h, r, light = false) => {
      const rows = 8
      const ph = h / rows
      for (let i = 0; i < rows; i++) {
        let x = -r() * 200
        while (x < w) {
          const len = 140 + r() * 220
          const c = new THREE.Color(light ? '#d8b88e' : '#b98458')
          c.offsetHSL((r() - 0.5) * 0.015, (r() - 0.5) * 0.08, (r() - 0.5) * 0.08)
          g.fillStyle = `#${c.getHexString()}`
          g.fillRect(x, i * ph, len, ph)
          g.strokeStyle = 'rgba(70,40,20,0.12)'
          g.lineWidth = 1
          for (let k = 0; k < 5; k++) {
            g.beginPath()
            const y = i * ph + 4 + r() * (ph - 8)
            g.moveTo(x, y)
            g.bezierCurveTo(x + len * 0.3, y + (r() - 0.5) * 6, x + len * 0.6, y + (r() - 0.5) * 6, x + len, y)
            g.stroke()
          }
          g.fillStyle = 'rgba(60,35,20,0.45)'
          g.fillRect(x, i * ph, 2, ph)
          x += len
        }
        g.fillStyle = 'rgba(60,35,20,0.35)'
        g.fillRect(0, i * ph, w, 2)
      }
    },
  },
  ceramic: {
    meters: 1.2,
    draw: (g, w, h, r) => {
      tiles(g, w, h, 2, '#efe8dc', '#d4cabb', r, 8, 4)
      speckle(g, w, h, r, 2500, ['#c9bda9', '#ffffff'], 0.15, 2)
    },
  },
  bath: {
    meters: 0.8,
    draw: (g, w, h, r) => {
      tiles(g, w, h, 4, '#cfe2de', '#f4f4f0', r, 14, 5)
    },
  },
  kitchen: {
    meters: 0.9,
    draw: (g, w, h, r) => {
      tiles(g, w, h, 3, '#e9dcc4', '#c8b79c', r, 10, 4)
      const s = w / 3
      g.strokeStyle = 'rgba(168,110,70,0.28)'
      g.lineWidth = 3
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const cx = i * s + s / 2
          const cy = j * s + s / 2
          g.beginPath()
          g.moveTo(cx, cy - s * 0.3)
          g.lineTo(cx + s * 0.3, cy)
          g.lineTo(cx, cy + s * 0.3)
          g.lineTo(cx - s * 0.3, cy)
          g.closePath()
          g.stroke()
        }
      }
    },
  },
  terracotta: {
    meters: 0.9,
    draw: (g, w, h, r) => {
      tiles(g, w, h, 3, '#b8653f', '#8a4a30', r, 30, 6)
      speckle(g, w, h, r, 3000, ['#7a3a22', '#d48a63'], 0.12, 3)
    },
  },
  concrete: {
    meters: 2,
    draw: (g, w, h, r) => {
      g.fillStyle = '#a9a7a2'
      g.fillRect(0, 0, w, h)
      speckle(g, w, h, r, 9000, ['#8d8b86', '#c4c2bc', '#7a7873'], 0.18, 3)
      g.fillStyle = 'rgba(70,70,70,0.35)'
      g.fillRect(0, h / 2, w, 2)
    },
  },
  grass: {
    meters: 2,
    draw: (g, w, h, r) => {
      g.fillStyle = '#7fa65a'
      g.fillRect(0, 0, w, h)
      speckle(g, w, h, r, 6000, ['#6b9448', '#93b86a', '#5e8740'], 0.35, 6)
      g.lineWidth = 1.5
      for (let i = 0; i < 2200; i++) {
        const x = r() * w
        const y = r() * h
        g.strokeStyle = r() > 0.5 ? 'rgba(160,200,110,0.5)' : 'rgba(70,110,45,0.45)'
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 6)
        g.stroke()
      }
    },
  },
  soil: {
    meters: 1,
    draw: (g, w, h, r) => {
      g.fillStyle = '#6a4630'
      g.fillRect(0, 0, w, h)
      speckle(g, w, h, r, 7000, ['#4f3322', '#83593d', '#3e281a'], 0.4, 5)
    },
  },
  asphalt: {
    meters: 4,
    draw: (g, w, h, r) => {
      g.fillStyle = '#5b5d61'
      g.fillRect(0, 0, w, h)
      speckle(g, w, h, r, 14000, ['#4a4c50', '#6c6e72', '#3d3f42'], 0.4, 3)
    },
  },
  paving: {
    meters: 1,
    draw: (g, w, h, r) => {
      g.fillStyle = '#9a948b'
      g.fillRect(0, 0, w, h)
      const n = 5
      const s = w / n
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n * 2; j++) {
          const off = i % 2 ? s / 2 : 0
          const c = new THREE.Color('#c4bcae')
          c.offsetHSL(0, 0, (r() - 0.5) * 0.06)
          g.fillStyle = `#${c.getHexString()}`
          g.fillRect(i * s + 2, j * (s / 2) + off + 2, s - 4, s / 2 - 4)
        }
      }
    },
  },
}

const floorCache = {}
export const floorTexture = (type) => {
  if (floorCache[type]) return floorCache[type]
  const key = type === 'woodLight' ? 'wood' : type
  const def = floorDefs[key]
  const r = rng(key.length * 991 + 7)
  const tex = toTexture(makeCanvas(512, 512, (g, w, h) => def.draw(g, w, h, r, type === 'woodLight')))
  floorCache[type] = { tex, meters: def.meters }
  return floorCache[type]
}

// karpet ruang keluarga, motif garis sederhana
export const rugTexture = (main = '#c9744f', accent = '#f1dfc2') =>
  toTexture(
    makeCanvas(512, 512, (g, w, h) => {
      g.fillStyle = main
      g.fillRect(0, 0, w, h)
      g.strokeStyle = accent
      g.lineWidth = 10
      g.strokeRect(24, 24, w - 48, h - 48)
      g.lineWidth = 4
      g.strokeRect(48, 48, w - 96, h - 96)
      g.fillStyle = accent
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          if ((i + j) % 2) continue
          const x = 90 + i * 66
          const y = 90 + j * 66
          g.beginPath()
          g.moveTo(x, y - 14)
          g.lineTo(x + 14, y)
          g.lineTo(x, y + 14)
          g.lineTo(x - 14, y)
          g.fill()
        }
      }
      const r = rng(5)
      speckle(g, w, h, r, 4000, ['#000000', '#ffffff'], 0.05, 2)
    }),
    false,
  )

export const plateTexture = (text) =>
  toTexture(
    makeCanvas(256, 64, (g, w, h) => {
      g.fillStyle = '#f5f5f2'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = '#1b1b1b'
      g.lineWidth = 6
      g.strokeRect(3, 3, w - 6, h - 6)
      g.fillStyle = '#1b1b1b'
      g.font = 'bold 40px "Arial Narrow", Arial, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, w / 2, h / 2 + 2)
    }),
    false,
  )

// layar laptop di meja kamar utama
export const codeTexture = () =>
  toTexture(
    makeCanvas(256, 160, (g, w, h) => {
      g.fillStyle = '#1e1f24'
      g.fillRect(0, 0, w, h)
      const r = rng(42)
      const colors = ['#c678dd', '#61afef', '#98c379', '#e5c07b', '#abb2bf', '#56b6c2']
      for (let i = 0; i < 13; i++) {
        let x = 10 + (i % 4 === 0 ? 0 : 14 + Math.floor(r() * 3) * 12)
        const y = 10 + i * 11
        const parts = 1 + Math.floor(r() * 4)
        for (let p = 0; p < parts; p++) {
          const len = 12 + r() * 50
          g.fillStyle = colors[Math.floor(r() * colors.length)]
          g.fillRect(x, y, len, 5)
          x += len + 6
        }
      }
      g.fillStyle = '#42b883'
      g.fillRect(10, h - 14, 6, 8)
    }),
    false,
  )

export const labelTexture = (text, { bg = 'rgba(59,47,42,0.86)', fg = '#fff7ea', size = 44 } = {}) => {
  const c = makeCanvas(512, 96, (g, w, h) => {
    g.font = `800 ${size}px Nunito, system-ui, sans-serif`
    const tw = Math.min(w - 20, g.measureText(text).width + 44)
    const x = (w - tw) / 2
    g.fillStyle = bg
    g.beginPath()
    g.roundRect(x, 12, tw, h - 24, (h - 24) / 2)
    g.fill()
    g.fillStyle = fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + 2)
  })
  return toTexture(c, false)
}

export const iconTexture = (kind) => {
  const c = makeCanvas(128, 128, (g, w) => {
    g.translate(w / 2, w / 2)
    if (kind === 'heart') {
      g.fillStyle = '#ef5d6f'
      g.beginPath()
      g.moveTo(0, 38)
      g.bezierCurveTo(-60, -2, -34, -52, 0, -20)
      g.bezierCurveTo(34, -52, 60, -2, 0, 38)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.55)'
      g.beginPath()
      g.ellipse(-20, -14, 8, 5, -0.6, 0, Math.PI * 2)
      g.fill()
    } else if (kind === 'z') {
      g.fillStyle = '#5b6b8c'
      g.font = '900 84px Nunito, system-ui, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('z', 0, 0)
    } else if (kind === 'drop') {
      g.fillStyle = '#4fa3d9'
      g.beginPath()
      g.moveTo(0, -44)
      g.bezierCurveTo(30, -6, 34, 40, 0, 40)
      g.bezierCurveTo(-34, 40, -30, -6, 0, -44)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.6)'
      g.beginPath()
      g.ellipse(-10, 10, 6, 10, 0.3, 0, Math.PI * 2)
      g.fill()
    } else if (kind === 'steam') {
      const grd = g.createRadialGradient(0, 0, 4, 0, 0, 56)
      grd.addColorStop(0, 'rgba(255,255,255,0.75)')
      grd.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grd
      g.beginPath()
      g.arc(0, 0, 56, 0, Math.PI * 2)
      g.fill()
    } else if (kind === 'note') {
      g.fillStyle = '#3b2f2a'
      g.font = '900 80px Nunito, system-ui, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('!', 0, 0)
    }
  })
  return toTexture(c, false)
}

// lukisan di dinding: empat kucing versi corat-coret
export const paintingTexture = () =>
  toTexture(
    makeCanvas(256, 192, (g, w, h) => {
      g.fillStyle = '#f0e2c6'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#c9a96e'
      g.fillRect(0, h * 0.72, w, h * 0.28)
      const cats = [
        ['#1d1a1a', '#d98a3d'],
        ['#e8954a', '#f6f0e6'],
        ['#f6f0e6', '#d98a3d'],
        ['#8d9398', '#4f565c'],
      ]
      cats.forEach(([a, b], i) => {
        const x = 38 + i * 60
        const y = h * 0.66
        g.fillStyle = a
        g.beginPath()
        g.ellipse(x, y, 20, 24, 0, 0, Math.PI * 2)
        g.fill()
        g.beginPath()
        g.arc(x, y - 30, 15, 0, Math.PI * 2)
        g.fill()
        g.beginPath()
        g.moveTo(x - 14, y - 36)
        g.lineTo(x - 10, y - 52)
        g.lineTo(x - 2, y - 42)
        g.moveTo(x + 14, y - 36)
        g.lineTo(x + 10, y - 52)
        g.lineTo(x + 2, y - 42)
        g.fill()
        g.fillStyle = b
        g.beginPath()
        g.ellipse(x + 6, y + 4, 9, 12, 0.4, 0, Math.PI * 2)
        g.fill()
      })
    }),
    false,
  )

// genteng flat abu tua, 1 tekstur = 1.2m (4 baris)
export const roofTexture = () =>
  toTexture(
    makeCanvas(256, 256, (g, w, h) => {
      const r = rng(77)
      const rows = 4
      const rh = h / rows
      for (let i = 0; i < rows; i++) {
        const cols = 3
        const cw = w / cols
        const off = i % 2 ? cw / 2 : 0
        for (let j = -1; j <= cols; j++) {
          const c = new THREE.Color('#44484e')
          c.offsetHSL(0, 0, (r() - 0.5) * 0.05)
          g.fillStyle = `#${c.getHexString()}`
          g.fillRect(j * cw + off + 1, i * rh, cw - 2, rh)
          const grd = g.createLinearGradient(0, i * rh, 0, (i + 1) * rh)
          grd.addColorStop(0, 'rgba(255,255,255,0.06)')
          grd.addColorStop(0.8, 'rgba(0,0,0,0)')
          grd.addColorStop(1, 'rgba(0,0,0,0.35)')
          g.fillStyle = grd
          g.fillRect(j * cw + off + 1, i * rh, cw - 2, rh)
        }
      }
      speckle(g, w, h, r, 2500, ['#000000', '#ffffff'], 0.05, 2)
    }),
  )

// batu alam buat pilar & dasar pagar
export const stoneTexture = () =>
  toTexture(
    makeCanvas(256, 256, (g, w, h) => {
      const r = rng(31)
      g.fillStyle = '#3e3b37'
      g.fillRect(0, 0, w, h)
      let y = 0
      while (y < h) {
        const rh = 22 + r() * 26
        let x = -r() * 40
        while (x < w) {
          const sw = 34 + r() * 60
          const c = new THREE.Color(['#6b665f', '#7d776e', '#5c5852', '#8a8378'][Math.floor(r() * 4)])
          g.fillStyle = `#${c.getHexString()}`
          g.beginPath()
          g.roundRect(x + 2, y + 2, sw - 4, rh - 4, 5)
          g.fill()
          x += sw
        }
        y += rh
      }
      speckle(g, w, h, r, 3000, ['#000000', '#d9d2c4'], 0.08, 2)
    }),
  )
