import * as THREE from 'three'
import { Player } from './player'
import { makeNameTag } from './net'

// Tetangga ramah di seberang/depan rumah (Pak Joko)
export class Neighbor {
  constructor(scene, physics) {
    this.scene = scene
    this.physics = physics

    this.look = {
      gender: 'cowok',
      skin: '#ddb08a',
      hair: 'samping',
      hairColor: '#25201d',
      top: 'batik',
      topColor: '#8a6142',
      bottom: 'celana',
      bottomColor: '#2f3742',
      shoes: 'sandal',
      shoeColor: '#1e1e20',
    }

    this.player = new Player(this.look)
    this.root = this.player.root
    this.root.name = 'tetangga'

    // Tempat nongkrong di trotoar depan
    this.pos = this.player.pos
    this.pos.set(2.2, 0.02, 2.5)
    this.facing = Math.PI

    this.name = 'Pak Joko'
    this.tag = makeNameTag('Pak Joko · Tetangga', false)
    this.tag.position.set(this.pos.x, 1.78, this.pos.z)
    scene.add(this.tag)
    scene.add(this.root)

    this.state = 'idle' // 'idle' | 'walk' | 'talk' | 'inCar' | 'onMotor'
    this.stateT = 3 + Math.random() * 4
    this.walkTarget = new THREE.Vector3(2.2, 0.02, 2.5)
    this.speed = 0

    // Relasi dengan pemain
    this.receivedFood = false
    this.passengerIn = null // 'car' | 'motor' | null

    this.dialogIndex = 0
    this.dialogs = [
      'Halo mas! Wah, seger banget udara depan rumah hari ini.',
      'Tadi si Cipu nongkrong di kap mobil, lucu banget telonnya.',
      'Kalo panen cabai sama tomat di kebun belakang, paling sedap dibikin sambal uleg!',
      'Mobilio-nya kinclong amat mas, mau jalan-jalan keliling komplek?',
      'Rumah mas Ferdy ini denahnya rapi bener ya, adem kelihatannya.',
    ]
  }

  get isPassenger() {
    return !!this.passengerIn
  }

  talk() {
    this.player.play('wave', 1.8)
    const line = this.dialogs[this.dialogIndex % this.dialogs.length]
    this.dialogIndex++
    return line
  }

  receiveDish(dishName) {
    this.receivedFood = true
    this.player.play('pet', 2.0)
    return `Wah Alhamdulillah! Makasih banyak ya mas udah dimasakin ${dishName}. Harum banget, langsung saya santap!`
  }

  enterVehicle(vehicleType) {
    this.passengerIn = vehicleType
    this.state = vehicleType === 'car' ? 'inCar' : 'onMotor'
    this.tag.visible = false
  }

  exitVehicle(dropPos) {
    this.passengerIn = null
    this.state = 'idle'
    this.stateT = 3
    this.pos.copy(dropPos)
    this.tag.visible = true
    this.player.play('wave', 1.6)
  }

  update(dt, playerPos, carObj, motorObj) {
    if (this.passengerIn === 'car' && carObj) {
      // Duduk di kursi penumpang depan Mobilio (sisi kiri kemudi, arah lokal -z / +z)
      const seatWorld = new THREE.Vector3(0.5, 0.45, 0.4).applyMatrix4(carObj.group.matrixWorld)
      this.pos.copy(seatWorld)
      this.player.facing = carObj.group.rotation.y
      this.player.seat = { inCar: true }
      this.player.update(dt, new THREE.Vector3(), false)
      this.tag.position.set(this.pos.x, this.pos.y + 1.6, this.pos.z)
      return
    }

    if (this.passengerIn === 'motor' && motorObj) {
      // Duduk di jok belakang Vario (boncengan)
      const seatWorld = new THREE.Vector3(0, 0.88, -0.48).applyMatrix4(motorObj.root.matrixWorld)
      this.pos.copy(seatWorld)
      this.player.facing = motorObj.root.rotation.y
      this.player.seat = { onMotor: true }
      this.player.update(dt, new THREE.Vector3(), false)
      this.tag.position.set(this.pos.x, this.pos.y + 1.6, this.pos.z)
      return
    }

    this.player.seat = null

    // Kalau pemain deket, hadap ke pemain
    const distToPlayer = Math.hypot(this.pos.x - playerPos.x, this.pos.z - playerPos.z)
    if (distToPlayer < 2.5) {
      const want = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z)
      let diff = want - this.player.facing
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      this.player.facing += diff * Math.min(1, dt * 6)
      this.player.update(dt, new THREE.Vector3(), false)
      this.tag.position.set(this.pos.x, this.pos.y + 1.78, this.pos.z)
      return
    }

    // AI jalan-jalan santai di trotoar jalan depan
    this.stateT -= dt
    if (this.stateT <= 0) {
      if (this.state === 'idle') {
        this.state = 'walk'
        this.stateT = 4 + Math.random() * 5
        // Pilih titik di sepanjang trotoar depan (x: 0.5 - 6.5, z: 2.0 - 3.2)
        this.walkTarget.set(0.6 + Math.random() * 5.8, 0.02, 2.2 + Math.random() * 1.0)
      } else {
        this.state = 'idle'
        this.stateT = 3 + Math.random() * 4
      }
    }

    const moveVec = new THREE.Vector3()
    if (this.state === 'walk') {
      const dx = this.walkTarget.x - this.pos.x
      const dz = this.walkTarget.z - this.pos.z
      const d = Math.hypot(dx, dz)
      if (d > 0.2) {
        moveVec.set(dx / d, 0, dz / d)
      } else {
        this.state = 'idle'
        this.stateT = 3
      }
    }

    this.pos.addScaledVector(moveVec, dt * 1.0)
    this.physics.resolve(this.pos, this.player.radius)
    this.player.update(dt, moveVec, false)
    this.tag.position.set(this.pos.x, this.pos.y + 1.78, this.pos.z)
  }
}
