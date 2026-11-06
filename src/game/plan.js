// Denah Rumah 15x7 - Lantai 1 (1:100)
// Semua angka dalam meter, diambil langsung dari ukuran di denah.
//   x : as 1 (kiri, 0) -> as 5 (kanan, 7)
//   z : pagar depan (0) -> as A (2) -> ... -> as J (16)
// Di three.js sumbu z dibalik (z dunia = -z denah) supaya kamera default
// berdiri di jalan dan ngadep ke dalam rumah.

export const LOT = { w: 7, d: 16 }
export const WALL_H = 2.7
export const WALL_T = 0.15
export const DOOR_H = 2.1

// as-as di denah
export const AS = {
  x: { 1: 0, 2: 1.95, 3: 3, 4: 5, 5: 7 },
  z: { A: 2, B: 4.5, C: 6.5, D: 8.25, F: 10, G: 12, H: 13, I: 14.5, J: 16 },
}

const win = (from, to, sill = 0.9, top = 2.1) => ({ type: 'window', from, to, sill, top })
const door = (from, to, swing, hinge = 'from', id) => ({ type: 'door', from, to, swing, hinge, id })

export const WALLS = [
  // dinding luar
  { a: [0, 2], b: [0, 16] },
  { a: [7, 4.5], b: [7, 14.5] },
  { a: [0, 16], b: [3, 16] },

  // as A - depan kamar utama
  { a: [0, 2], b: [3, 2], openings: [win(1.45, 2.5)] },
  // kamar utama: sisi teras & ruang tamu
  { a: [3, 2], b: [3, 6.5], openings: [win(2.7, 3.9)] },
  // as B - pintu utama + jendela ruang tamu
  {
    a: [3, 4.5],
    b: [7, 4.5],
    openings: [door(3.15, 3.95, [0, 1], 'from', 'depan'), win(4.75, 5.75), win(5.9, 6.85)],
  },
  // as C - pintu kamar utama + pintu KM dalam (KM nyambung ke kamar utama)
  { a: [0, 6.5], b: [3, 6.5], openings: [door(1.12, 1.85, [0, 1], 'to'), door(2.08, 2.88, [0, -1], 'to')] },

  // KM / WC
  {
    a: [1.95, 6.5],
    b: [1.95, 10],
    openings: [door(9.15, 9.9, [-1, 0], 'to')],
  },
  { a: [0, 8.25], b: [1.95, 8.25] },

  // as F
  { a: [0, 10], b: [3, 10] },
  { a: [4, 10], b: [7, 10] },

  // as 3 bagian belakang: dua kamar tidur + jendela ke taman
  {
    a: [3, 10],
    b: [3, 16],
    openings: [door(12.0, 12.8, [-1, 0], 'to'), door(13.2, 14.0, [-1, 0], 'from'), win(14.8, 15.7)],
  },
  { a: [0, 13], b: [3, 13] },

  // R. Kucing
  { a: [5, 10], b: [5, 12], openings: [door(10.15, 10.9, [1, 0], 'from')] },
  { a: [5, 12], b: [7, 12] },

  // as I - dapur ke taman belakang
  { a: [3, 14.5], b: [7, 14.5], openings: [door(3.9, 4.8, [0, -1], 'from', 'belakang'), win(5.3, 6.1, 1.15, 1.95)] },

  // pagar tembok taman belakang
  { a: [3, 16], b: [7, 16], h: 2.0 },
  { a: [7, 14.5], b: [7, 16], h: 2.0 },

  // pagar depan & samping
  { a: [0, 0], b: [3, 0], h: 0.9, kind: 'fence' },
  { a: [0, 0], b: [0, 2], h: 1.5, kind: 'fence' },
  { a: [7, 0], b: [7, 4.5], h: 1.5, kind: 'fence' },
]

// rect: [x0, z0, x1, z1] koordinat denah
export const ROOMS = [
  { id: 'depan', name: 'Halaman Depan', floor: 'grass', rects: [[0, 0, 4.575, 2]], spot: [3.7, 1.0] },
  { id: 'carport', name: 'Carport', floor: 'concrete', rects: [[4.575, 0, 7, 4.5]], spot: [4.75, 1.2] },
  { id: 'teras', name: 'Teras', floor: 'terracotta', rects: [[3, 2, 4.575, 4.5]], spot: [3.75, 3.3] },
  { id: 'utama', name: 'Kamar Tidur Utama', floor: 'wood', rects: [[0, 2, 3, 6.5]], spot: [2.3, 5.0] },
  { id: 'tamu', name: 'Ruang Tamu', floor: 'ceramic', rects: [[3, 4.5, 7, 6.85], [1.95, 6.5, 3, 7.6]], spot: [3.6, 5.6] },
  { id: 'keluarga', name: 'Ruang Keluarga', floor: 'ceramic', rects: [[3, 6.85, 7, 10], [1.95, 7.6, 3, 10]], spot: [3.4, 8.6] },
  { id: 'km1', name: 'Kamar Mandi Dalam', floor: 'bath', rects: [[0, 6.5, 1.95, 8.25]], spot: [1.2, 7.4] },
  { id: 'km2', name: 'Kamar Mandi', floor: 'bath', rects: [[0, 8.25, 1.95, 10]], spot: [1.2, 9.3] },
  { id: 'kamar2', name: 'Kamar Tidur 2', floor: 'wood', rects: [[0, 10, 3, 13]], spot: [2.3, 12.3] },
  { id: 'kamar3', name: 'Kamar Tidur 3', floor: 'woodLight', rects: [[0, 13, 3, 16]], spot: [2.2, 13.8] },
  { id: 'kucing', name: 'Ruang Kucing', floor: 'ceramic', rects: [[5, 10, 7, 12]], spot: [5.6, 10.9] },
  { id: 'dapur', name: 'Dapur', floor: 'kitchen', rects: [[3, 10, 5, 12], [3, 12, 7, 14.5]], spot: [3.9, 13.4] },
  { id: 'taman', name: 'Taman Belakang', floor: 'grass', rects: [[3, 14.5, 7, 16]], spot: [4.4, 14.95] },
]

export const roomAt = (x, z) => {
  for (const r of ROOMS) {
    for (const [x0, z0, x1, z1] of r.rects) {
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return r
    }
  }
  if (z < 0) return { id: 'jalan', name: 'Depan Rumah' }
  return null
}

// urutan room tour + caption pendek
export const TOUR = [
  { room: 'depan', text: 'Halaman depan. Pohonnya belum pernah berbuah, tapi lumayan teduh.' },
  { room: 'carport', text: 'Carport, rumahnya si Mobilio. Coba pencet klakson, kucingnya pada kaget.' },
  { room: 'teras', text: 'Teras. Tempat ngopi sore sambil nunggu paket.' },
  { room: 'tamu', text: 'Ruang tamu, masuk dari pintu utama.' },
  { room: 'utama', text: 'Kamar tidur utama. Kasurnya sering diklaim Cipu.' },
  { room: 'km1', text: 'Kamar mandi dalam, pintunya langsung dari kamar utama.' },
  { room: 'keluarga', text: 'Ruang keluarga. TV-nya bisa dinyalain, kucing suka nonton ikan.' },
  { room: 'km2', text: 'Kamar mandi satunya buat umum, lengkap sama bak mandi dan gayung.' },
  { room: 'kucing', text: 'Ruang kucing: mangkuk makan, pasir, sama cat tree.' },
  { room: 'dapur', text: 'Dapur. Di kulkas ada churu, jangan bilang Gimbul.' },
  { room: 'kamar2', text: 'Kamar tidur kedua.' },
  { room: 'kamar3', text: 'Kamar tidur ketiga, jendelanya ngadep taman.' },
  { room: 'taman', text: 'Taman belakang. Bisa nanam cabai, tomat, sawi, sama terong.' },
]
