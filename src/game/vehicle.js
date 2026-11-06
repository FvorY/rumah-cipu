import * as THREE from 'three'

// Avatar origin is at the feet; the underside of seated hips is 0.35m above it.
export const SEATED_HIP_HEIGHT = 0.35
export const VEHICLE_SEATS = {
  car: { driver: [0.1, 0.04, -0.35], passenger: [0.1, 0.04, 0.35] },
  motor: { driver: [0, 0.84 - SEATED_HIP_HEIGHT, -0.12], passenger: [0, 0.89 - SEATED_HIP_HEIGHT, -0.64] },
}

export function vehicleSeat(root, type, passenger = false) {
  root.updateWorldMatrix(true, false)
  return new THREE.Vector3(...VEHICLE_SEATS[type][passenger ? 'passenger' : 'driver']).applyMatrix4(root.matrixWorld)
}

// Car model faces +x; avatars and the scooter face +z.
export const vehicleFacing = (root, type) => root.rotation.y + (type === 'car' ? Math.PI / 2 : 0)
