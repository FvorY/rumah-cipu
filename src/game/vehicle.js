import * as THREE from 'three'

// Avatar origin is at the feet; the underside of seated hips is 0.35m above it.
export const SEATED_HIP_HEIGHT = 0.35
// Penumpang index 0 = kursi depan mobil / boncengan motor (dipakai Pak Joko juga).
// Mobilio 7 kursi: sopir + depan + baris tengah 3 + baris belakang 2.
export const VEHICLE_SEATS = {
  car: {
    driver: [0.1, 0.04, -0.35],
    passengers: [
      [0.1, 0.04, 0.35],
      [-0.72, 0.06, -0.42],
      [-0.72, 0.06, 0.42],
      [-0.72, 0.06, 0],
      [-1.48, 0.08, -0.32],
      [-1.48, 0.08, 0.32],
    ],
  },
  motor: { driver: [0, 0.30, -0.02], passengers: [[0, 0.36, -0.40]] },
}

export const passengerCount = (type) => VEHICLE_SEATS[type].passengers.length

// seat: false/undefined = sopir, true = penumpang depan, angka = index penumpang
const seatLocal = (type, seat) => {
  const s = VEHICLE_SEATS[type]
  if (seat === true) return s.passengers[0]
  if (typeof seat === 'number' && seat >= 0) return s.passengers[Math.min(seat, s.passengers.length - 1)]
  return s.driver
}

export function vehicleSeat(root, type, seat = false) {
  root.updateWorldMatrix(true, false)
  return new THREE.Vector3(...seatLocal(type, seat)).applyMatrix4(root.matrixWorld)
}

// titik turun di samping kursi (koordinat dunia, y = 0)
export function vehicleExitPoint(root, type, seat = false) {
  root.updateWorldMatrix(true, false)
  const [sx, , sz] = seatLocal(type, seat)
  const local = type === 'car'
    ? new THREE.Vector3(sx, 0, (sz < 0 ? -1 : 1) * 1.25)
    : new THREE.Vector3(seat === false ? -0.7 : 0.7, 0, sz - 0.2)
  const pos = local.applyMatrix4(root.matrixWorld)
  pos.y = 0
  return pos
}

// Car model faces +x; avatars and the scooter face +z.
export const vehicleFacing = (root, type) => root.rotation.y + (type === 'car' ? Math.PI / 2 : 0)
