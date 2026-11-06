import * as THREE from 'three'
import { Player } from './player'
import { makeNameTag } from './net'

// Tetangga ramah di seberang jalan (Pak Joko)
// Memiliki rumah sendiri di seberang jalan dengan jadwal aktivitas acak:
// - Di rumah (santai ngopi di teras, nyapu halaman)
// - Jogging keliling komplek (lari pagi/sore)
// - Berkebun (menyiram tanaman bunga & cabai)
// - Berangkat & pulang bekerja (membawa tas kerja)

export class Neighbor {
  constructor(scene, physics, spots = null) {
    this.scene = scene
    this.physics = physics

    this.spots = spots || {
      terraceChair: new THREE.Vector3(1.8, 0.14, 11.9),
      terraceStanding: new THREE.Vector3(2.4, 0.14, 11.6),
      gardenPots: [
        new THREE.Vector3(1.7, 0.02, 10.2),
        new THREE.Vector3(2.4, 0.02, 10.1),
        new THREE.Vector3(3.0, 0.02, 10.2),
        new THREE.Vector3(0.9, 0.02, 10.3),
      ],
      gateEntrance: new THREE.Vector3(4.8, 0.02, 9.2),
      sidewalkFront: new THREE.Vector3(4.8, 0.02, 8.2),
      workExit: new THREE.Vector3(26.0, 0.02, 4.5),
      jogWaypoints: [
        new THREE.Vector3(4.8, 0.02, 4.5),
        new THREE.Vector3(22.0, 0.02, 4.2),
        new THREE.Vector3(-14.0, 0.02, 4.8),
        new THREE.Vector3(3.5, 0.02, 4.5),
      ],
    }

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

    // Posisi awal di teras rumahnya sendiri
    this.pos = this.player.pos
    this.pos.copy(this.spots.terraceStanding)
    this.player.facing = Math.PI

    this.name = 'Pak Joko'
    this.currentStatusText = ''
    this.tag = null
    this.updateTag('Santai di Teras ☕')
    scene.add(this.root)

    // Aksesori tas kerja untuk berangkat kerja
    const caseMat = new THREE.MeshStandardMaterial({ color: '#452c1a', roughness: 0.6 })
    const bag = new THREE.Group()
    const bagBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.05), caseMat)
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI), caseMat)
    handle.rotation.z = Math.PI
    handle.position.y = 0.08
    bag.add(bagBody, handle)
    bag.position.set(0, -0.28, 0)
    this.player.arms[0].add(bag)
    this.briefcase = bag
    this.briefcase.visible = false

    // AI & State Machine aktivitas harian
    // 'home' | 'jogging' | 'gardening' | 'working'
    this.activity = 'home'
    this.activityTimer = 25 + Math.random() * 20
    this.subState = 'sit' // untuk home: 'sit' | 'stand' | 'sweep'
    this.subTimer = 12 + Math.random() * 8

    // Navigasi & pergerakan
    this.navTarget = null
    this.navQueue = []
    this.jogIndex = 0
    this.potIndex = 0
    this.waterTimer = 0
    this.workPhase = 'departing' // 'departing' | 'atWork' | 'returning'
    this.workTimer = 0

    // Interaksi pemain
    this.talkingTimer = 0
    this.receivedFood = false
    this.passengerIn = null // 'car' | 'motor' | null

    this.dialogIdx = {
      home: 0,
      jogging: 0,
      gardening: 0,
      working: 0,
    }

    this.dialogs = {
      home: [
        'Halo Mas Ferdy! Mampir mas, monggo santai dulu di teras sambil ngopi.',
        'Adem bener ya mas suasana komplek kita kalau pagi dan sore begini.',
        'Kucing-kucingnya mas Ferdy lucu-lucu banget ya, tadi si Gimbul sempet noleh ke sini.',
        'Rumah mas Ferdy denahnya rapi dan bersih banget, enak dipandang dari seberang.',
      ],
      jogging: [
        'Hosh... hosh... Pagi Mas Ferdy! Rutin jogging keliling komplek biar badan seger bugar!',
        'Ayo Mas ikut lari pagi! Dua tiga putaran lumayan banget buat bakar kalori, hehe.',
        'Udaranya masih sejuk banget mas, paling enak buat olahraga santai begini.',
      ],
      gardening: [
        'Lagi nyiram tanaman bunga sama cabe nih mas, biar subur dan rajin berbunga.',
        'Tanaman kalau disiram tiap hari daunnya seger banget ya mas. Halaman jadi asri.',
        'Mas Ferdy kalau butuh bibit cabai atau pupuk kompos, kabarin ya! Di kebun saya ada lebihan.',
      ],
      working: [
        'Mau berangkat kerja dulu ya Mas Ferdy! Titip komplek ya mas.',
        'Semangat beraktivitas Mas Ferdy! Saya pamit jalan dulu ke kantor.',
        'Baru balik kerja nih Mas Ferdy, alhamdulillah lancar rezeki hari ini.',
        'Lumayan capek habis kerja seharian, enaknya langsung rebahan sambil ngopi di teras.',
      ],
    }
  }

  get isPassenger() {
    return !!this.passengerIn
  }

  updateTag(statusText) {
    if (this.currentStatusText === statusText) return
    this.currentStatusText = statusText
    if (this.tag) {
      this.scene.remove(this.tag)
      this.tag.material.map?.dispose()
      this.tag.material.dispose()
    }
    this.tag = makeNameTag(`Pak Joko · ${statusText}`, false)
    this.tag.position.set(this.pos.x, this.pos.y + 1.78, this.pos.z)
    this.scene.add(this.tag)
  }

  talk() {
    this.talkingTimer = 4.5
    this.player.play('wave', 2.0)
    const list = this.dialogs[this.activity] || this.dialogs.home
    const idx = this.dialogIdx[this.activity] % list.length
    this.dialogIdx[this.activity]++
    return list[idx]
  }

  receiveDish(dishName) {
    this.receivedFood = true
    this.talkingTimer = 5.0
    this.player.play('pet', 2.5)
    return `Wah Alhamdulillah! Makasih banyak ya Mas Ferdy udah dimasakin ${dishName}. Harum banget, langsung saya santap di teras!`
  }

  enterVehicle(vehicleType) {
    this.passengerIn = vehicleType
    if (this.tag) this.tag.visible = false
    this.player.seat = { inCar: vehicleType === 'car', onMotor: vehicleType === 'motor' }
  }

  exitVehicle(dropPos) {
    this.passengerIn = null
    this.pos.copy(dropPos)
    if (this.tag) this.tag.visible = true
    this.player.seat = null
    this.player.play('wave', 1.8)
    this.talkingTimer = 3.0
    this.setActivity('home')
  }

  setActivity(act) {
    this.activity = act
    this.activityTimer = 28 + Math.random() * 25
    this.navTarget = null
    this.navQueue = []
    this.player.seat = null
    this.briefcase.visible = false
    this.player.can.visible = false

    if (act === 'home') {
      this.subState = 'sit'
      this.subTimer = 14 + Math.random() * 10
      this.navQueue = [this.spots.gateEntrance, this.spots.terraceStanding, this.spots.terraceChair]
      this.updateTag('Santai di Teras ☕')
    } else if (act === 'jogging') {
      this.jogIndex = 0
      this.navQueue = [this.spots.gateEntrance, this.spots.sidewalkFront, this.spots.jogWaypoints[0]]
      this.updateTag('Sedang Jogging 🏃')
    } else if (act === 'gardening') {
      this.potIndex = 0
      this.waterTimer = 0
      this.navQueue = [this.spots.gardenPots[0]]
      this.updateTag('Berkebun 🌱')
    } else if (act === 'working') {
      this.workPhase = 'departing'
      this.briefcase.visible = true
      this.navQueue = [this.spots.gateEntrance, this.spots.sidewalkFront, this.spots.workExit]
      this.updateTag('Berangkat Kerja 💼')
    }
  }

  pickNextActivity() {
    const list = ['home', 'jogging', 'gardening', 'working'].filter((a) => a !== this.activity)
    const next = list[Math.floor(Math.random() * list.length)]
    this.setActivity(next)
  }

  update(dt, playerPos, carObj, motorObj, fx = null) {
    // 1. Sedang menumpang kendaraan pemain (Mobilio / Vario)
    if (this.passengerIn === 'car' && carObj) {
      const seatWorld = new THREE.Vector3(0.5, 0.45, 0.4).applyMatrix4(carObj.group.matrixWorld)
      this.pos.copy(seatWorld)
      this.player.facing = carObj.group.rotation.y
      this.player.seat = { inCar: true }
      this.player.update(dt, new THREE.Vector3(), false)
      if (this.tag) this.tag.position.set(this.pos.x, this.pos.y + 1.6, this.pos.z)
      return
    }

    if (this.passengerIn === 'motor' && motorObj) {
      const seatWorld = new THREE.Vector3(0, 0.88, -0.48).applyMatrix4(motorObj.root.matrixWorld)
      this.pos.copy(seatWorld)
      this.player.facing = motorObj.root.rotation.y
      this.player.seat = { onMotor: true }
      this.player.update(dt, new THREE.Vector3(), false)
      if (this.tag) this.tag.position.set(this.pos.x, this.pos.y + 1.6, this.pos.z)
      return
    }

    // 2. Interaksi ngobrol dengan pemain
    if (this.talkingTimer > 0) {
      this.talkingTimer -= dt
      const want = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z)
      let diff = want - this.player.facing
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      this.player.facing += diff * Math.min(1, dt * 8)
      this.player.update(dt, new THREE.Vector3(), false)
      if (this.tag) this.tag.position.set(this.pos.x, this.pos.y + (this.player.seat ? 1.45 : 1.78), this.pos.z)
      return
    }

    // 3. Timer ganti aktivitas acak harian
    this.activityTimer -= dt
    if (this.activityTimer <= 0 && this.activity !== 'working') {
      this.pickNextActivity()
    }

    // 4. State Machine per Aktivitas
    const moveVec = new THREE.Vector3()
    let isRunning = false

    if (this.activity === 'home') {
      this.handleHomeActivity(dt)
    } else if (this.activity === 'jogging') {
      isRunning = true
      this.handleJoggingActivity(dt, moveVec)
    } else if (this.activity === 'gardening') {
      this.handleGardeningActivity(dt, moveVec, fx)
    } else if (this.activity === 'working') {
      this.handleWorkingActivity(dt, moveVec)
    }

    // 5. Update gerakan dan animasi karakter
    if (moveVec.lengthSq() > 0.0001) {
      const spd = isRunning ? 2.1 : 1.15
      this.pos.addScaledVector(moveVec, dt * spd)
      this.physics.resolve(this.pos, this.player.radius)
      const wantFace = Math.atan2(moveVec.x, moveVec.z)
      let df = wantFace - this.player.facing
      df = Math.atan2(Math.sin(df), Math.cos(df))
      this.player.facing += df * Math.min(1, dt * 10)
    }

    this.player.update(dt, moveVec, isRunning)
    if (this.tag) {
      const h = this.player.seat ? 1.45 : 1.78
      this.tag.position.set(this.pos.x, this.pos.y + h, this.pos.z)
    }
  }

  // --- Penanganan Aktivitas 'home' ---
  handleHomeActivity(dt) {
    if (this.navQueue.length > 0) {
      const target = this.navQueue[0]
      const d = Math.hypot(target.x - this.pos.x, target.z - this.pos.z)
      if (d > 0.25) {
        const dx = target.x - this.pos.x
        const dz = target.z - this.pos.z
        const dist = Math.hypot(dx, dz)
        this.pos.x += (dx / dist) * dt * 1.1
        this.pos.z += (dz / dist) * dt * 1.1
        this.player.facing = Math.atan2(dx, dz)
        this.player.seat = null
      } else {
        this.navQueue.shift()
      }
      return
    }

    this.subTimer -= dt
    if (this.subTimer <= 0) {
      if (this.subState === 'sit') {
        this.subState = 'sweep'
        this.subTimer = 10 + Math.random() * 8
        this.player.seat = null
        this.pos.copy(this.spots.terraceStanding)
        this.updateTag('Menyapu Teras 🧹')
      } else {
        this.subState = 'sit'
        this.subTimer = 14 + Math.random() * 8
        this.updateTag('Santai di Teras ☕')
      }
    }

    if (this.subState === 'sit') {
      this.pos.copy(this.spots.terraceChair)
      this.player.seat = { terrace: true }
      this.player.facing = Math.PI
    } else if (this.subState === 'sweep') {
      this.player.seat = null
      if (!this.player.action) {
        this.player.play('pet', 2.0)
      }
    }
  }

  // --- Penanganan Aktivitas 'jogging' ---
  handleJoggingActivity(dt, moveVec) {
    this.player.seat = null
    if (this.navQueue.length > 0) {
      const target = this.navQueue[0]
      const d = Math.hypot(target.x - this.pos.x, target.z - this.pos.z)
      if (d > 0.3) {
        const dx = target.x - this.pos.x
        const dz = target.z - this.pos.z
        const dist = Math.hypot(dx, dz)
        moveVec.set(dx / dist, 0, dz / dist)
      } else {
        this.navQueue.shift()
      }
      return
    }

    // Melintasi titik waypoints jogging di jalan komplek
    const wpList = this.spots.jogWaypoints
    const wp = wpList[this.jogIndex % wpList.length]
    const dx = wp.x - this.pos.x
    const dz = wp.z - this.pos.z
    const d = Math.hypot(dx, dz)
    if (d > 0.4) {
      moveVec.set(dx / d, 0, dz / d)
    } else {
      this.jogIndex++
    }
  }

  // --- Penanganan Aktivitas 'gardening' ---
  handleGardeningActivity(dt, moveVec, fx) {
    this.player.seat = null
    const pots = this.spots.gardenPots
    const curPot = pots[this.potIndex % pots.length]
    const d = Math.hypot(curPot.x - this.pos.x, curPot.z - this.pos.z)

    if (d > 0.3) {
      const dx = curPot.x - this.pos.x
      const dz = curPot.z - this.pos.z
      const dist = Math.hypot(dx, dz)
      moveVec.set(dx / dist, 0, dz / dist)
      this.player.can.visible = false
    } else {
      // Sampai di pot bunga: siram tanaman
      this.player.can.visible = true
      this.waterTimer += dt
      if (!this.player.action) {
        this.player.play('water', 2.2)
      }
      // Munculkan cipratan air ke pot
      if (fx && Math.random() < 0.25) {
        fx.spawn('drop', new THREE.Vector3(curPot.x + (Math.random() - 0.5) * 0.2, 0.4, curPot.z + (Math.random() - 0.5) * 0.2))
      }
      if (this.waterTimer > 4.0) {
        this.waterTimer = 0
        this.potIndex++
        if (this.potIndex >= pots.length) {
          this.potIndex = 0
        }
      }
    }
  }

  // --- Penanganan Aktivitas 'working' ---
  handleWorkingActivity(dt, moveVec) {
    this.player.seat = null

    if (this.workPhase === 'departing') {
      this.briefcase.visible = true
      this.updateTag('Berangkat Kerja 💼')
      if (this.navQueue.length > 0) {
        const target = this.navQueue[0]
        const d = Math.hypot(target.x - this.pos.x, target.z - this.pos.z)
        if (d > 0.35) {
          const dx = target.x - this.pos.x
          const dz = target.z - this.pos.z
          const dist = Math.hypot(dx, dz)
          moveVec.set(dx / dist, 0, dz / dist)
        } else {
          this.navQueue.shift()
        }
      } else {
        // Sampai di ujung jalan komplek / halte kantor
        this.workPhase = 'atWork'
        this.workTimer = 22 + Math.random() * 12
        this.updateTag('Sedang Bekerja 💼')
      }
    } else if (this.workPhase === 'atWork') {
      this.workTimer -= dt
      this.player.facing = Math.PI / 2
      if (this.workTimer <= 0) {
        // Waktunya pulang kerja
        this.workPhase = 'returning'
        this.updateTag('Pulang Kerja 🏠')
        this.navQueue = [this.spots.sidewalkFront, this.spots.gateEntrance, this.spots.terraceStanding]
      }
    } else if (this.workPhase === 'returning') {
      if (this.navQueue.length > 0) {
        const target = this.navQueue[0]
        const d = Math.hypot(target.x - this.pos.x, target.z - this.pos.z)
        if (d > 0.35) {
          const dx = target.x - this.pos.x
          const dz = target.z - this.pos.z
          const dist = Math.hypot(dx, dz)
          moveVec.set(dx / dist, 0, dz / dist)
        } else {
          this.navQueue.shift()
        }
      } else {
        // Sampai di rumah kembali
        this.briefcase.visible = false
        this.setActivity('home')
      }
    }
  }
}
