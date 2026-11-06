import { WALLS, WALL_T } from './plan'
import { ROOF } from './roof'

// Gambar kerja "DENAH LANTAI 1" skala 1:100 dalam bentuk SVG (A4 portrait).
// Satuan SVG = cm nyata, jadi 1 m = 100 unit, kertas A4 = 2100 x 2970.
// Semua dinding/pintu/jendela diambil dari plan.js, jadi selalu sama dengan isi game.

const S = 100
const OX = 700
const OY = 2107
const X = (x) => +(OX + x * S).toFixed(1)
const Y = (z) => +(OY - z * S).toFixed(1)
const FONT = 'Arial, Helvetica, sans-serif'

const fmt = (d) => {
  const v = Math.round(d * 1000) / 1000
  let s = v.toFixed(3)
  if (s.endsWith('0')) s = s.slice(0, -1)
  return s
}

const rect = (x0, z0, x1, z1, attrs = '') => {
  const xa = Math.min(x0, x1)
  const xb = Math.max(x0, x1)
  const za = Math.min(z0, z1)
  const zb = Math.max(z0, z1)
  return `<rect x="${X(xa)}" y="${Y(zb)}" width="${+((xb - xa) * S).toFixed(1)}" height="${+((zb - za) * S).toFixed(1)}" ${attrs}/>`
}
const line = (x0, z0, x1, z1, attrs = '') => `<line x1="${X(x0)}" y1="${Y(z0)}" x2="${X(x1)}" y2="${Y(z1)}" ${attrs}/>`
const circle = (x, z, r, attrs = '') => `<circle cx="${X(x)}" cy="${Y(z)}" r="${+(r * S).toFixed(1)}" ${attrs}/>`
const text = (x, z, str, size = 28, attrs = '') =>
  `<text x="${X(x)}" y="${Y(z)}" font-size="${size}" text-anchor="middle" dominant-baseline="middle" ${attrs}>${str}</text>`

const FURN = 'fill="#fff" stroke="#000" stroke-width="1.6"'
const THIN = 'fill="none" stroke="#000" stroke-width="1.3"'

// ---------- dinding ----------
function walls() {
  const out = []
  const cols = new Map()
  for (const w of WALLS) {
    const horizontal = w.a[1] === w.b[1]
    const fence = w.kind === 'fence'
    const t = fence ? 0.12 : WALL_T
    const sa = horizontal ? Math.min(w.a[0], w.b[0]) : Math.min(w.a[1], w.b[1])
    const sb = horizontal ? Math.max(w.a[0], w.b[0]) : Math.max(w.a[1], w.b[1])
    const solid = (s0, s1) => {
      if (s1 - s0 < 0.001) return
      if (horizontal) out.push(rect(s0, w.a[1] - t / 2, s1, w.a[1] + t / 2, 'fill="url(#hatch)" stroke="#000" stroke-width="2.4"'))
      else out.push(rect(w.a[0] - t / 2, s0, w.a[0] + t / 2, s1, 'fill="url(#hatch)" stroke="#000" stroke-width="2.4"'))
    }
    let cur = sa - (fence ? 0 : t / 2)
    for (const o of [...(w.openings || [])].sort((a, b) => a.from - b.from)) {
      solid(cur, o.from)
      if (o.type === 'window') out.push(windowSym(w, o, horizontal))
      else out.push(doorSym(w, o, horizontal))
      cur = o.to
    }
    solid(cur, sb + (fence ? 0 : t / 2))
    if (!fence) for (const p of [w.a, w.b]) cols.set(p.join(','), p)
  }
  // kolom struktur (kotak hitam) di ujung-ujung dinding
  for (const [x, z] of cols.values()) out.push(rect(x - 0.09, z - 0.09, x + 0.09, z + 0.09, 'fill="#000"'))
  return out.join('')
}

function windowSym(w, o, horizontal) {
  const t = WALL_T / 2
  const parts = []
  if (horizontal) {
    const z = w.a[1]
    parts.push(rect(o.from, z - t, o.to, z + t, 'fill="#fff" stroke="#000" stroke-width="1.6"'))
    parts.push(line(o.from, z, o.to, z, 'stroke="#000" stroke-width="1.2"'))
    parts.push(line(o.from, z - t / 3, o.to, z - t / 3, 'stroke="#000" stroke-width="0.8"'))
  } else {
    const x = w.a[0]
    parts.push(rect(x - t, o.from, x + t, o.to, 'fill="#fff" stroke="#000" stroke-width="1.6"'))
    parts.push(line(x, o.from, x, o.to, 'stroke="#000" stroke-width="1.2"'))
    parts.push(line(x + t / 3, o.from, x + t / 3, o.to, 'stroke="#000" stroke-width="0.8"'))
  }
  return parts.join('')
}

// daun pintu + busur bukaan
function swingSym(hx, hz, dir, swing, width, dashed = false) {
  const tipX = hx + swing[0] * width
  const tipZ = hz + swing[1] * width
  const endX = hx + dir[0] * width
  const endZ = hz + dir[1] * width
  // arah putar di koordinat layar (y ke bawah)
  const sx = swing[0]
  const sy = -swing[1]
  const ex = dir[0]
  const ey = -dir[1]
  const sweep = sx * ey - sy * ex > 0 ? 1 : 0
  const r = +(width * S).toFixed(1)
  return (
    line(hx, hz, tipX, tipZ, 'stroke="#000" stroke-width="3"') +
    `<path d="M ${X(tipX)} ${Y(tipZ)} A ${r} ${r} 0 0 ${sweep} ${X(endX)} ${Y(endZ)}" fill="none" stroke="#000" stroke-width="1.1" ${dashed ? 'stroke-dasharray="10 7"' : ''}/>`
  )
}

function doorSym(w, o, horizontal) {
  const width = o.to - o.from
  const hs = o.hinge === 'to' ? o.to : o.from
  const sign = o.hinge === 'to' ? -1 : 1
  if (horizontal) return swingSym(hs, w.a[1], [sign, 0], o.swing, width)
  return swingSym(w.a[0], hs, [0, sign], o.swing, width)
}

// ---------- pagar depan ----------
function fence() {
  const out = []
  out.push(rect(0.2, -0.11, 2.95, 0.11, 'fill="url(#hatch)" stroke="#000" stroke-width="2"'))
  for (const [a, b] of [[-0.1, 0.2], [2.95, 3.25], [4.3, 4.6], [6.85, 7.12]]) {
    out.push(rect(a, -0.15, b, 0.15, 'fill="#000"'))
  }
  out.push(swingSym(3.26, 0, [1, 0], [0, 1], 1.03))
  out.push(swingSym(4.6, 0, [1, 0], [0, -1], 1.12, true))
  out.push(swingSym(6.85, 0, [-1, 0], [0, -1], 1.12, true))
  out.push(text(1.6, -0.42, 'PAGAR', 20))
  return out.join('')
}

// ---------- furnitur (simbol) ----------
function bed(x0, z0, x1, z1, pillows) {
  // kepala kasur di x0 (nempel dinding kiri)
  const out = [rect(x0, z0, x1, z1, FURN)]
  const d = (z1 - z0) / pillows
  for (let i = 0; i < pillows; i++) out.push(rect(x0 + 0.08, z0 + d * i + 0.08, x0 + 0.42, z0 + d * (i + 1) - 0.08, `${FURN} rx="6"`))
  // lipatan selimut
  const fx = x0 + (x1 - x0) * 0.45
  out.push(line(fx, z0, fx, z1, 'stroke="#000" stroke-width="1.3"'))
  out.push(`<path d="M ${X(fx)} ${Y(z1)} L ${X(fx + 0.35)} ${Y(z1 - (z1 - z0) * 0.55)} L ${X(fx + 0.12)} ${Y(z0)}" ${THIN}/>`)
  return out.join('')
}
const wardrobe = (x0, z0, x1, z1) => rect(x0, z0, x1, z1, FURN) + line(x0, z0, x1, z1, 'stroke="#000" stroke-width="1"') + line(x0, z1, x1, z0, 'stroke="#000" stroke-width="1"')
function sofa(x0, z0, x1, z1, back) {
  // back: sisi sandaran 'N' | 'S' | 'E' | 'W'
  const out = [rect(x0, z0, x1, z1, `${FURN} rx="8"`)]
  const b = 0.18
  const a = 0.14
  let ix0 = x0
  let ix1 = x1
  let iz0 = z0
  let iz1 = z1
  if (back === 'N') iz1 -= b
  if (back === 'S') iz0 += b
  if (back === 'E') ix1 -= b
  if (back === 'W') ix0 += b
  if (back === 'N' || back === 'S') {
    ix0 += a
    ix1 -= a
  } else {
    iz0 += a
    iz1 -= a
  }
  out.push(rect(ix0, iz0, ix1, iz1, `${FURN} rx="5"`))
  return out.join('')
}
const toilet = (x, z) => rect(x - 0.24, z - 0.19, x - 0.08, z + 0.19, FURN) + `<ellipse cx="${X(x + 0.06)}" cy="${Y(z)}" rx="${0.17 * S}" ry="${0.13 * S}" ${FURN}/>`
const shower = (x0, z0, x1, z1) =>
  rect(x0, z0, x1, z1, FURN) + line(x0, z0, x1, z1, 'stroke="#000" stroke-width="0.9"') + line(x0, z1, x1, z0, 'stroke="#000" stroke-width="0.9"') + circle((x0 + x1) / 2, (z0 + z1) / 2, 0.05, FURN)
const basin = (x, z) => rect(x - 0.21, z - 0.15, x + 0.21, z + 0.15, FURN) + `<ellipse cx="${X(x)}" cy="${Y(z)}" rx="${0.14 * S}" ry="${0.09 * S}" ${FURN}/>`
const table = (x0, z0, x1, z1) => rect(x0, z0, x1, z1, FURN)

function furniture() {
  const f = []
  // kamar utama
  f.push(bed(0.1, 3.0, 2.15, 4.65, 2))
  f.push(rect(0.1, 4.75, 0.55, 5.15, FURN))
  f.push(wardrobe(0.08, 5.3, 0.68, 6.42))
  f.push(table(0.12, 2.08, 1.3, 2.58))
  f.push(rect(0.5, 2.62, 0.92, 3.0, `${FURN} rx="6"`))
  // TV dinding kamar utama + rak
  f.push(rect(2.79, 3.23, 2.925, 4.43, FURN) + rect(2.88, 3.28, 2.925, 4.38, 'fill="#000"') + text(2.62, 3.83, 'TV', 14))
  // KM
  f.push(shower(0.08, 7.55, 0.85, 8.17))
  f.push(toilet(0.32, 6.95))
  f.push(basin(1.35, 8.05))
  f.push(shower(0.08, 8.33, 0.85, 8.95))
  f.push(toilet(0.32, 9.55))
  f.push(basin(1.35, 8.45))
  // kamar 2 & 3
  f.push(bed(0.1, 10.15, 2.15, 11.35, 1))
  f.push(wardrobe(0.08, 11.6, 0.68, 12.85))
  f.push(rect(2.79, 10.25, 2.925, 11.25, FURN) + rect(2.88, 10.3, 2.925, 11.2, 'fill="#000"') + text(2.62, 10.75, 'TV', 14))
  f.push(bed(0.1, 14.65, 2.15, 15.88, 1))
  f.push(wardrobe(0.08, 13.12, 0.68, 14.35))
  f.push(table(2.45, 14.8, 2.9, 15.7))
  f.push(rect(2.68, 15.01, 2.76, 15.69, 'fill="#000"') + text(2.3, 15.35, 'TV', 14))
  // ruang tamu
  f.push(sofa(4.5, 6.2, 6.05, 6.78, 'N'))
  f.push(table(4.65, 5.05, 5.9, 5.75))
  f.push(sofa(6.2, 5.0, 6.88, 5.85, 'E'))
  f.push(circle(6.6, 6.45, 0.17, FURN))
  f.push(circle(4.5, 4.78, 0.15, FURN))
  f.push(table(3.9, 6.85, 5.25, 7.25))
  f.push(table(5.4, 6.85, 6.88, 7.25))
  // ruang keluarga
  f.push(rect(4.5, 7.6, 6.1, 9.55, 'fill="none" stroke="#000" stroke-width="1" stroke-dasharray="8 6"'))
  f.push(sofa(3.75, 7.55, 4.45, 9.5, 'W'))
  f.push(table(5.0, 8.2, 5.65, 8.85))
  f.push(table(6.32, 7.6, 6.88, 9.45))
  f.push(rect(6.68, 7.95, 6.78, 9.1, 'fill="#000"'))
  // R. kucing
  f.push(circle(6.6, 10.45, 0.27, FURN) + circle(6.6, 10.45, 0.1, FURN))
  f.push(circle(5.45, 11.2, 0.25, FURN) + circle(5.45, 11.2, 0.16, THIN))
  f.push(rect(6.35, 11.3, 6.88, 11.88, FURN))
  f.push(circle(5.48, 11.75, 0.08, FURN) + circle(5.72, 11.75, 0.08, FURN))
  // dapur
  f.push(rect(6.25, 12.05, 6.92, 12.72, FURN) + text(6.585, 12.385, 'K', 20))
  f.push(rect(6.3, 12.72, 6.92, 13.85, FURN))
  f.push(rect(5.0, 13.85, 6.92, 14.42, FURN))
  f.push(rect(5.38, 13.98, 5.98, 14.34, FURN) + circle(5.53, 14.16, 0.08, FURN) + circle(5.83, 14.16, 0.08, FURN))
  f.push(rect(6.4, 13.05, 6.82, 13.55, FURN) + rect(6.45, 13.1, 6.77, 13.5, THIN))
  f.push(table(4.4, 12.45, 5.45, 13.2))
  for (const x of [4.67, 5.17]) for (const z of [12.17, 13.48]) f.push(rect(x - 0.17, z - 0.16, x + 0.17, z + 0.16, FURN))
  f.push(circle(4.78, 11.65, 0.15, FURN))
  f.push(circle(4.9, 14.27, 0.12, FURN))
  // teras
  f.push(rect(3.15, 2.5, 3.58, 2.93, `${FURN} rx="5"`) + rect(3.15, 3.35, 3.58, 3.78, `${FURN} rx="5"`) + rect(3.13, 2.97, 3.47, 3.31, FURN))
  f.push(circle(3.25, 2.2, 0.14, FURN))
  f.push(rect(4.31, 4.1, 4.57, 4.42, FURN))
  f.push(rect(4.38, 2.04, 4.56, 2.22, 'fill="#000"'))
  // carport: mobil + tanda silang carport seperti di denah asli
  f.push(`<path d="M ${X(4.575)} ${Y(0)} L ${X(5.8)} ${Y(4.5)} L ${X(7)} ${Y(0)}" fill="none" stroke="#000" stroke-width="1.3"/>`)
  f.push(rect(4.94, 0.15, 6.66, 4.45, 'fill="none" stroke="#000" stroke-width="1.2" stroke-dasharray="12 6" rx="30"'))
  // halaman depan
  const tree = []
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const r = 0.75 + (i % 2) * 0.12
    tree.push(`${i ? 'L' : 'M'} ${X(1.95 + Math.cos(a) * r)} ${Y(1.0 + Math.sin(a) * r * 0.95)}`)
  }
  f.push(`<path d="${tree.join(' ')} Z" fill="#fff" stroke="#000" stroke-width="1.4"/>` + circle(1.95, 1.0, 0.06, FURN))
  for (const [x, z, r] of [[0.4, 1.55, 0.28], [0.42, 0.55, 0.26], [2.7, 0.35, 0.22]]) f.push(circle(x, z, r, 'fill="#fff" stroke="#000" stroke-width="1.2" stroke-dasharray="4 4"'))
  for (const z of [0.4, 1.0, 1.6]) f.push(rect(3.34, z - 0.18, 3.96, z + 0.18, FURN))
  // taman belakang
  for (const x0 of [3.15, 4.1]) f.push(rect(x0, 15.25, x0 + 0.8, 15.85, FURN) + rect(x0 + 0.04, 15.29, x0 + 0.76, 15.81, THIN))
  // area jemur: tali jemuran, mesin cuci, keranjang
  for (const z of [15.2, 15.6]) f.push(line(5.12, z, 6.84, z, 'stroke="#000" stroke-width="1" stroke-dasharray="6 5"'))
  f.push(rect(6.3, 15.32, 6.92, 15.94, FURN) + circle(6.61, 15.63, 0.2, FURN) + text(6.61, 15.63, 'MC', 14))
  f.push(circle(5.35, 15.75, 0.2, FURN))
  f.push(circle(6.82, 14.75, 0.12, FURN))
  return f.join('')
}

// ---------- label ruangan ----------
function labels() {
  const L = (x, z, name, level, size = 26) => {
    const lines = name.split('\n')
    const out = lines.map((t, i) => text(x, z + ((lines.length - 1) / 2 - i) * 0.3 + 0.13, t, size))
    if (level) out.push(text(x, z - (lines.length / 2) * 0.3 - 0.05, level, size - 2))
    return out.join('')
  }
  return [
    L(1.7, 13.85, 'KMR. TIDUR', '± 0.00'),
    L(1.75, 12.25, 'KMR. TIDUR', '± 0.00'),
    L(1.75, 5.6, 'R. TIDUR\nUTAMA', '± 0.00'),
    L(1.2, 7.3, 'KM / WC', '- 0.05', 22),
    L(1.2, 9.25, 'KM / WC', '- 0.05', 22),
    L(3.72, 6.2, 'RUANG\nTAMU', '± 0.00', 22),
    L(2.85, 9.05, 'RUANG\nKELUARGA', '± 0.00', 22),
    L(4.0, 10.95, 'DAPUR', '± 0.00', 24),
    L(6.2, 10.95, 'R. KUCING', '± 0.00', 18),
    L(4.0, 14.95, 'TAMAN', '- 0.05', 18),
    L(5.8, 14.92, 'AREA JEMUR', '- 0.05', 16),
    L(4.0, 3.15, 'TERAS', '± 0.00', 22),
    L(5.8, 2.45, 'CARPORT', '± 0.00', 24),
  ].join('')
}

// ---------- garis as & ukuran ----------
const AX_X = [['1', 0], ['2', 1.95], ['3', 3], ['4', 5], ['5', 7]]
const AX_Z = [['A', 2], ['B', 4.5], ['C', 6.5], ['D', 7.25], ['E', 8.25], ['F', 10], ['G', 12], ['H', 13], ['I', 14.5], ['J', 16]]

function grid() {
  const out = []
  const dot = 'stroke="#000" stroke-width="1.2" stroke-dasharray="2 9"'
  for (const [, x] of AX_X) out.push(line(x, -1.9, x, 17.05, dot))
  for (const [, z] of AX_Z) out.push(line(-1.6, z, 8.95, z, dot))
  for (const [n, x] of AX_X) out.push(circle(x, -2.15, 0.22, 'fill="#fff" stroke="#000" stroke-width="2"') + text(x, -2.15, n, 28))
  for (const [n, z] of AX_Z) out.push(circle(9.2, z, 0.22, 'fill="#fff" stroke="#000" stroke-width="2"') + text(9.2, z, n, 28))
  return out.join('')
}

function tick(x, z) {
  return `<line x1="${X(x) - 9}" y1="${Y(z) + 9}" x2="${X(x) + 9}" y2="${Y(z) - 9}" stroke="#000" stroke-width="2.2"/>`
}

function dimH(z, xs, size = 24, below = false) {
  const out = [line(xs[0] - 0.15, z, xs[xs.length - 1] + 0.15, z, 'stroke="#000" stroke-width="1.3"')]
  for (const x of xs) out.push(tick(x, z) + line(x, z - 0.12, x, z + 0.12, 'stroke="#000" stroke-width="1"'))
  for (let i = 0; i < xs.length - 1; i++) out.push(text((xs[i] + xs[i + 1]) / 2, z + (below ? -0.17 : 0.17), fmt(xs[i + 1] - xs[i]), size))
  return out.join('')
}

function dimV(x, zs, size = 24) {
  const out = [line(x, zs[0] - 0.15, x, zs[zs.length - 1] + 0.15, 'stroke="#000" stroke-width="1.3"')]
  for (const z of zs) out.push(tick(x, z) + line(x - 0.12, z, x + 0.12, z, 'stroke="#000" stroke-width="1"'))
  for (let i = 0; i < zs.length - 1; i++) {
    const zm = (zs[i] + zs[i + 1]) / 2
    out.push(`<text x="${X(x - 0.17)}" y="${Y(zm)}" font-size="${size}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${X(x - 0.17)} ${Y(zm)})">${fmt(zs[i + 1] - zs[i])}</text>`)
  }
  return out.join('')
}

function dims() {
  return [
    dimH(16.75, [0, 3, 5, 7]),
    dimH(17.35, [0, 7], 26),
    dimH(-0.85, [0, 1.95, 3, 4.575, 7], 24, true),
    dimV(-0.75, [0, 2, 4.5, 6.5, 8.25, 10, 13, 16]),
    dimV(-1.4, [0, 16], 26),
    dimV(7.85, [0, 1, 2, 4.5, 10, 12, 14.5, 16]),
  ].join('')
}

function roofLines() {
  const dash = 'fill="none" stroke="#666" stroke-width="1.4" stroke-dasharray="20 8 4 8"'
  return [
    rect(ROOF.main.x0, ROOF.main.z0, ROOF.main.x1, ROOF.main.z1, dash),
    rect(ROOF.front.x0, ROOF.front.z0, ROOF.front.x1, ROOF.front.z1, dash),
    rect(ROOF.back.x0, ROOF.back.z0, ROOF.back.x1, ROOF.back.z1, dash),
    rect(ROOF.canopy.x0, ROOF.canopy.z0, ROOF.canopy.x1, ROOF.canopy.z1, dash),
    rect(ROOF.jemuran.x0, ROOF.jemuran.z0, ROOF.jemuran.x1, ROOF.jemuran.z1, dash),
  ].join('')
}

function titleBlock() {
  return `
  <g font-family="${FONT}">
    <circle cx="250" cy="2600" r="34" fill="none" stroke="#000" stroke-width="2.5"/>
    <line x1="284" y1="2600" x2="1050" y2="2600" stroke="#000" stroke-width="2.5"/>
    <text x="300" y="2580" font-size="64">DENAH LANTAI 1</text>
    <text x="300" y="2680" font-size="56">1:100</text>
    <g font-size="22" fill="#333">
      <line x1="1350" y1="2560" x2="1460" y2="2560" stroke="#666" stroke-width="1.6" stroke-dasharray="20 8 4 8"/>
      <text x="1480" y="2568">garis atap / kanopi</text>
      <rect x="1385" y="2590" width="40" height="40" fill="#000"/>
      <text x="1480" y="2618">kolom struktur</text>
      <rect x="1350" y="2650" width="110" height="26" fill="url(#hatch)" stroke="#000" stroke-width="2"/>
      <text x="1480" y="2670">dinding bata</text>
      <text x="1350" y="2730">Satuan ukuran dalam meter. Lahan 7 x 16 m.</text>
    </g>
  </g>`
}

export function denahSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2100 2970" width="210mm" height="297mm" font-family="${FONT}">
  <defs>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="11" height="11" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="11" stroke="#000" stroke-width="1.6"/>
    </pattern>
  </defs>
  <rect width="2100" height="2970" fill="#fff"/>
  <rect x="90" y="90" width="1920" height="2790" fill="none" stroke="#000" stroke-width="3"/>
  <g>${grid()}</g>
  <g>${roofLines()}</g>
  <g>${furniture()}</g>
  <g>${walls()}${fence()}</g>
  <g fill="#000">${labels()}</g>
  <g>${dims()}</g>
  ${titleBlock()}
</svg>`
}

export function downloadBlob(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function downloadSVG() {
  downloadBlob(new Blob([denahSVG()], { type: 'image/svg+xml' }), 'denah-rumah-cipu.svg')
}

// PNG A4 300 dpi
export function downloadPNG() {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 2480
      c.height = 3508
      const g = c.getContext('2d')
      g.fillStyle = '#fff'
      g.fillRect(0, 0, c.width, c.height)
      g.drawImage(img, 0, 0, c.width, c.height)
      c.toBlob((b) => {
        downloadBlob(b, 'denah-rumah-cipu.png')
        resolve()
      }, 'image/png')
    }
    img.onerror = reject
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(denahSVG())
  })
}

export function printPDF() {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(`<!doctype html><html><head><title>Denah Lantai 1 - Rumah Cipu</title>
<style>@page{size:A4 portrait;margin:0}html,body{margin:0}svg{display:block;width:210mm;height:297mm}</style>
</head><body>${denahSVG()}<script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>`)
  w.document.close()
  return true
}

