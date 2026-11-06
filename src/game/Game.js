import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { buildHouse, updateCutaway, updateDoors } from './house'
import { buildFurniture } from './furniture'
import { buildCar } from './car'
import { buildFence } from './fence'
import { buildRoof } from './roof'
import { Physics } from './physics'
import { NavGrid } from './nav'
import { Player } from './player'
import { Cat, CATS } from './cat'
import { Garden, CROPS, STAGE_TEXT } from './garden'
import { Fx } from './fx'
import { Input } from './input'
import { sound } from './sound'
import { roomAt, ROOMS, TOUR } from './plan'
import { loadSave, writeSave } from '../utils/storage'

const LAPTOP_LINES = [
  'Masih ada bug di branch main. Nanti aja deh.',
  'npm run dev... sambil nunggu, elus kucing dulu.',
  'Ada 3 tab Stack Overflow kebuka. Klasik.',
  'Commit terakhir: "fix: beneran fix kali ini".',
]

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas
    this.ui = ui
    this.time = 0
    const saved = loadSave() || {}
    this.saved = saved

    // ---- renderer & scene ----
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer = renderer

    const scene = new THREE.Scene()
    const sky = new THREE.Color('#d5e7ec')
    scene.background = sky
    scene.fog = new THREE.Fog(sky, 22, 55)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.32
    this.scene = scene

    const hemi = new THREE.HemisphereLight('#fff6e8', '#b59c80', 1.35)
    scene.add(hemi)
    const sun = new THREE.DirectionalLight('#fff1dc', 2.6)
    sun.position.set(-4, 12, 4)
    sun.target.position.set(3.5, 0, -8)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    const sc = sun.shadow.camera
    sc.left = -12
    sc.right = 12
    sc.top = 12
    sc.bottom = -12
    sc.near = 1
    sc.far = 40
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.02
    sun.shadow.radius = 3
    scene.add(sun, sun.target)

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120)
    this.cam = { yaw: 0, pitch: 0.92, dist: 7.2, target: new THREE.Vector3(3.7, 0.9, 0.7) }

    // ---- dunia ----
    this.physics = new Physics()
    const house = buildHouse(scene, this.physics)
    this.pieces = house.pieces
    this.doors = house.doors
    const furn = buildFurniture(scene, this.physics)
    this.interactables = furn.interactables
    const fadeList = [...furn.tall.map((t) => ({ ...t, kind: 'furn' })), ...furn.deco.map((t) => ({ ...t, kind: 'frame' }))]
    for (const t of fadeList) {
      const mats = []
      t.object.traverse((o) => {
        if (!o.isMesh) return
        o.material = o.material.clone()
        mats.push({ m: o.material, base: o.material.opacity })
        o.material.transparent = true
      })
      this.pieces.push({ object: t.object, mats, kind: t.kind, y0: 0, y1: t.y1, rect: t.rect, fade: 1 })
    }
    this.interactables.bowl.food = saved.bowl ?? 1
    this.perches = furn.perches
    this.car = buildCar(scene, this.physics)
    this.fence = buildFence(scene, this.physics)
    this.doors.push(...this.fence.gates)
    this.roof = buildRoof(scene, this.physics)
    this.perches.push({ id: 'carHood', ...this.car.hood, room: 'carport' })
    this.garden = new Garden(scene, this.physics, saved.garden)
    this.fx = new Fx(scene)
    this.sound = sound

    const bounds = { minX: -0.1, maxX: 7.1, minZ: -16.1, maxZ: 1.5, cell: 0.1 }
    this.navCat = new NavGrid(this.physics.colliders, { ...bounds, inflate: 0.13 })
    this.navPlayer = new NavGrid(this.physics.colliders, { ...bounds, inflate: 0.23 })

    this.player = new Player()
    const sp = saved.player || [3.7, -0.7]
    this.player.pos.set(sp[0], 0, -sp[1])
    this.player.facing = saved.player ? (saved.facing ?? Math.PI) : Math.PI
    scene.add(this.player.root)
    this.cam.target.set(this.player.pos.x, 0.9, this.player.pos.z)

    this.cats = CATS.map((def) => new Cat(def, this, saved.cats?.[def.id]))
    this.carrying = null
    this.churu = saved.churu ?? 1

    this.ui.lowWalls = !!saved.lowWalls
    this.ui.roofOn = saved.roofOn ?? true
    this.ui.muted = !!saved.muted
    sound.setMuted(this.ui.muted)

    this.tvCanvas = null
    this.input = new Input(canvas)
    this.bindKeys()

    this.moveDir = new THREE.Vector3(0, 0, -1)
    this.auto = null
    this.tour = null
    this.uiT = 0
    this.saveT = 0
    this.promptKey = ''
    this.actions = []

    this.resize = this.resize.bind(this)
    window.addEventListener('resize', this.resize)
    this.resize()
    this.onUnload = () => this.save()
    window.addEventListener('beforeunload', this.onUnload)

    this.clock = new THREE.Clock()
    this.running = true
    this.loop = this.loop.bind(this)
    renderer.setAnimationLoop(this.loop)
  }

  bindKeys() {
    for (const k of ['e', 'f', 'r', 'c']) this.input.on(k, () => this.trigger(k.toUpperCase()))
    this.input.on('v', () => this.toggleWalls())
    this.input.on('m', () => this.toggleMute())
    this.input.on('b', () => this.toggleRoof())
    this.input.on('t', () => (this.tour ? this.stopTour() : this.startTour()))
    this.input.on('escape', () => {
      if (this.ui.seedPicker !== null) this.ui.seedPicker = null
      else this.stopTour()
    })
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    // layar HP portrait: mundurin kamera dikit
    this.camera.fov = w < h ? 55 : 42
    this.camera.updateProjectionMatrix()
  }

  start() {
    sound.unlock()
    this.ui.started = true
    if (!this.saved.player) this.player.play('wave', 1.6)
  }

  toast(text) {
    this.ui.toast = { text, id: Math.random() }
  }

  // ---------- loop ----------
  loop() {
    const dt = Math.min(0.05, this.clock.getDelta())
    this.time += dt
    if (this.ui.started) this.step(dt)
    else this.idleCamera(dt)
    this.renderer.render(this.scene, this.camera)
  }

  idleCamera(dt) {
    // layar judul: kamera muter pelan di atas rumah
    this.cam.yaw += dt * 0.08
    const t = new THREE.Vector3(3.5, 0, -7)
    this.camera.position.set(t.x + Math.sin(this.cam.yaw) * 13, 11, t.z + Math.cos(this.cam.yaw) * 13)
    this.camera.lookAt(t)
    for (const c of this.cats) c.update(dt)
    this.fx.update(dt)
    updateDoors(this.doors, this.cats.map((c) => c.pos), dt)
    this.fence.update(dt)
    this.roof.update(dt, {})
    updateCutaway(this.pieces, this.camera.position, new THREE.Vector3(3.5, -20, -7), dt, false)
  }

  step(dt) {
    const { input, player, cam } = this

    // kamera
    const c = input.takeCamera()
    cam.yaw += c.yaw
    cam.pitch = THREE.MathUtils.clamp(cam.pitch + c.pitch, 0.35, 1.35)
    cam.dist = THREE.MathUtils.clamp(cam.dist + c.zoom, 3.2, 13)

    // gerak
    const ax = input.axis()
    const manual = Math.abs(ax.x) + Math.abs(ax.y) > 0.05
    if (manual && this.auto) this.stopTour()
    const move = new THREE.Vector3()
    let running = input.running
    if (manual) {
      const fx = -Math.sin(cam.yaw)
      const fz = -Math.cos(cam.yaw)
      const rx = Math.cos(cam.yaw)
      const rz = -Math.sin(cam.yaw)
      move.set(rx * ax.x + fx * ax.y, 0, rz * ax.x + fz * ax.y)
    } else if (this.auto) {
      const a = this.auto
      const wp = a.path[a.i]
      const dx = wp.x - player.pos.x
      const dz = wp.z - player.pos.z
      const d = Math.hypot(dx, dz)
      if (d < 0.18) {
        a.i++
        if (a.i >= a.path.length) {
          this.auto = null
          a.done?.()
        }
      } else move.set(dx / d, 0, dz / d)
      running = false
      // kalau 2 detik nggak gerak, lompat ke waypoint berikutnya
      if (this.auto) {
        if (player.pos.distanceTo(a.last) < 0.02) a.stuck += dt
        else a.stuck = 0
        a.last.copy(player.pos)
        if (a.stuck > 2) {
          a.stuck = 0
          a.i++
          if (a.i >= a.path.length) {
            this.auto = null
            a.done?.()
          }
        }
      }
    }
    player.update(dt, move, running)
    if (move.lengthSq() > 0.0001) this.moveDir.copy(move).normalize()
    if (player.speed > 0.01) {
      const next = player.pos.clone().addScaledVector(this.moveDir, player.speed * dt)
      this.physics.resolve(next, player.radius)
      player.pos.x = next.x
      player.pos.z = next.z
    }

    // kucing, pintu, mobil, kebun
    for (const cat of this.cats) cat.update(dt)
    const actors = [player.pos, ...this.cats.map((c) => c.pos)]
    const opened = updateDoors(this.doors, actors, dt)
    if (opened.length && opened.some((d) => d.center.distanceTo(new THREE.Vector2(player.pos.x, player.pos.z)) < 1.3)) sound.click()
    this.car.update(dt)
    this.fence.update(dt)
    this.roof.update(dt, this.roofTarget())
    if (this.garden.update(dt, this.time)) this.sound.pop(1.2)
    this.fx.update(dt)
    this.updateTV(dt)

    // kamera ngikutin
    const k = 1 - Math.exp(-dt * 6)
    cam.target.x += (player.pos.x - cam.target.x) * k
    cam.target.z += (player.pos.z - cam.target.z) * k
    cam.target.y = 0.85
    const cp = Math.cos(cam.pitch)
    this.camera.position.set(
      cam.target.x + Math.sin(cam.yaw) * cp * cam.dist,
      cam.target.y + Math.sin(cam.pitch) * cam.dist,
      cam.target.z + Math.cos(cam.yaw) * cp * cam.dist,
    )
    this.camera.lookAt(cam.target)
    this.camOverride?.(this.camera)
    updateCutaway(this.pieces, this.camera.position, new THREE.Vector3(player.pos.x, 0.9, player.pos.z), dt, this.ui.lowWalls)

    // UI (nggak perlu tiap frame)
    this.uiT -= dt
    if (this.uiT <= 0) {
      this.uiT = 0.1
      this.syncUI()
    }
    this.saveT -= dt
    if (this.saveT <= 0) {
      this.saveT = 5
      this.save()
    }
  }

  // atap: kalau nyala, bagian yang nutupin karakter dari kamera dibikin tembus pandang
  roofTarget() {
    const names = ['main', 'front', 'teras', 'back', 'canopy', 'jemuran']
    const out = {}
    if (this.ui.lowWalls || !this.ui.roofOn) {
      for (const n of names) out[n] = 0
      return out
    }
    const p = this.player.pos
    const head = new THREE.Vector3(p.x, 1.1, p.z)
    for (const n of names) {
      const blocked = this.roof.occludes(n, head, this.camera.position)
      out[n] = blocked ? (n === 'main' ? 0.07 : 0.2) : 1
    }
    return out
  }

  toggleRoof() {
    this.ui.roofOn = !this.ui.roofOn
  }

  // ---------- interaksi ----------
  collectActions() {
    const p = this.player.pos
    const acts = []
    const near = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r
    const cands = []

    if (this.carrying) {
      const cat = this.carrying
      acts.push({ key: 'F', label: `Turunkan ${cat.def.name}`, run: () => this.dropCat(cat) })
      if (this.churu > 0) acts.push({ key: 'R', label: `Kasih churu (${this.churu})`, run: () => this.feedChuru(cat) })
    } else {
      let cat = null
      let best = 1.05
      for (const c of this.cats) {
        const d = Math.hypot(p.x - c.pos.x, p.z - c.pos.z)
        if (d < best && c.state !== 'jump') {
          best = d
          cat = c
        }
      }
      if (cat) {
        cands.push({
          d: best - 0.2,
          act: {
            key: 'E',
            label: `Elus ${cat.def.name}`,
            run: () => {
              const msg = cat.pet()
              this.player.play('pet', 1.6)
              if (msg) this.toast(msg)
            },
          },
        })
        acts.push({ key: 'F', label: `Gendong ${cat.def.name}`, run: () => this.pickCat(cat) })
        if (this.churu > 0) acts.push({ key: 'R', label: `Kasih churu (${this.churu})`, run: () => this.feedChuru(cat) })
      }
    }

    const plot = this.garden.nearest(p, 0.95)
    if (plot) {
      const d = Math.hypot(p.x - plot.x, p.z - plot.z)
      if (!plot.crop) cands.push({ d, act: { key: 'E', label: 'Tanam bibit', run: () => (this.ui.seedPicker = plot.id) } })
      else if (plot.stage === 3)
        cands.push({ d, act: { key: 'E', label: `Panen ${CROPS[plot.crop].name.toLowerCase()}`, run: () => this.harvest(plot) } })
      else if (!plot.watered) cands.push({ d, act: { key: 'E', label: `Siram ${CROPS[plot.crop].name.toLowerCase()}`, run: () => this.water(plot) } })
      else cands.push({ d, act: { key: 'E', label: `${CROPS[plot.crop].name} ${STAGE_TEXT[plot.stage]}...`, disabled: true } })
    }

    const it = this.interactables
    if (near(it.bowl.x, it.bowl.z, 1.0)) {
      cands.push({
        d: 0.5,
        act: it.bowl.food > 0.95
          ? { key: 'E', label: 'Mangkuk masih penuh', disabled: true }
          : { key: 'E', label: it.bowl.label, run: () => this.fillBowl() },
      })
    }
    if (near(it.fridge.x, it.fridge.z, 1.0)) cands.push({ d: 0.5, act: { key: 'E', label: it.fridge.label, run: () => this.takeChuru() } })
    for (const tv of it.tvs) {
      const d = Math.hypot(p.x - tv.x, p.z - tv.z)
      if (d < 1.0) cands.push({ d: 0.6 + d * 0.1, act: { key: 'E', label: tv.on ? 'Matikan TV' : 'Nyalakan TV', run: () => this.toggleTV(tv) } })
    }
    if (near(it.laptop.x, it.laptop.z, 0.9)) cands.push({ d: 0.5, act: { key: 'E', label: it.laptop.label, run: () => this.toast(LAPTOP_LINES[Math.floor(Math.random() * LAPTOP_LINES.length)]) } })

    // mobil: cek jarak ke kotak body
    const cc = this.car.center
    const dx = Math.max(Math.abs(p.x - cc.x) - 0.86, 0)
    const dz = Math.max(Math.abs(p.z - cc.z) - 2.15, 0)
    if (Math.hypot(dx, dz) < 0.55) cands.push({ d: 0.7, act: { key: 'E', label: 'Bunyikan klakson', run: () => this.honk() } })

    // pagar carport
    const cg = this.fence.carGate
    if (Math.abs(p.x - cg.center.x) < 1.3 && Math.abs(p.z - cg.center.z) < 0.9) {
      cands.push({
        d: 0.55,
        act: {
          key: 'E',
          label: cg.target ? 'Tutup pagar' : 'Buka pagar',
          run: () => {
            const open = this.fence.toggleCarGate()
            sound.click()
            this.player.play('pick', 0.6)
            this.toast(open ? 'Pagar carport dibuka.' : 'Pagar carport ditutup.')
          },
        },
      })
    }

    cands.sort((a, b) => a.d - b.d)
    if (cands.length) acts.unshift(cands[0].act)
    acts.push({ key: 'C', label: 'Panggil kucing', run: () => this.callCats(), secondary: true })
    return acts
  }

  trigger(key) {
    if (!this.ui.started || this.ui.seedPicker !== null) return
    const a = this.actions.find((x) => x.key === key && !x.disabled)
    if (a?.run) {
      a.run()
      this.syncUI(true)
    }
  }

  pickCat(cat) {
    const msg = cat.pickUp()
    if (cat.state === 'held') {
      this.carrying = cat
      this.ui.carrying = cat.def.name
    }
    if (msg) this.toast(msg)
  }

  dropCat(cat) {
    if (this.carrying !== cat) return
    this.carrying = null
    this.ui.carrying = null
    cat.putDown()
  }

  feedChuru(cat) {
    if (this.churu <= 0) return
    if (this.carrying === cat) this.dropCat(cat)
    this.churu--
    cat.giveChuru()
    this.player.play('pet', 1.2)
    this.toast(`${cat.def.name} jilat-jilat churu. Langsung sayang.`)
  }

  takeChuru() {
    if (this.churu >= 5) return this.toast('Kantong udah penuh churu.')
    this.churu++
    this.player.play('pick', 0.8)
    sound.pop(1.5)
    const gimbul = this.cats.find((c) => c.def.id === 'gimbul')
    if (gimbul && !gimbul.busy && gimbul.state !== 'sleep' && Math.random() < 0.5) {
      gimbul.follow(10)
      gimbul.meow()
      this.toast('Dapat churu. Gimbul denger bunyi kulkas...')
    } else this.toast(`Dapat churu (${this.churu}).`)
  }

  fillBowl() {
    const bowl = this.interactables.bowl
    bowl.food = 1
    this.player.play('pick', 1)
    sound.pop(0.8)
    this.toast('Mangkuk diisi. Bunyi kriuknya kedengeran sampai dapur.')
    for (const c of this.cats) {
      if (c.state === 'held' || c.state === 'eat') continue
      if (c.hunger > 25 || c.def.id === 'gimbul') setTimeout(() => c.goEat(), 400 + Math.random() * 1500)
    }
  }

  callCats() {
    this.player.play('wave', 1.2)
    const came = this.cats.filter((c) => c.call())
    const nope = this.cats.filter((c) => !came.includes(c))
    if (nope.length === 0) this.toast('Semua kucing dateng.')
    else if (came.length === 0) this.toast('Nggak ada yang dateng. Kucing memang begitu.')
    else this.toast(`${nope.map((c) => c.def.name).join(' & ')} pura-pura nggak denger.`)
  }

  honk() {
    this.player.play('honk', 0.8)
    sound.honk()
    this.car.honk()
    const from = { x: this.car.center.x, z: this.car.center.z }
    for (const c of this.cats) c.scare(from)
  }

  water(plot) {
    this.player.play('water', 1.4)
    sound.water()
    this.garden.water(plot)
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const v = new THREE.Vector3(plot.x + (Math.random() - 0.5) * 0.6, 0.55, plot.z + (Math.random() - 0.5) * 0.3)
        this.fx.spawn('drop', v)
      }, i * 90)
    }
  }

  harvest(plot) {
    this.player.play('harvest', 1.0)
    const { crop, n } = this.garden.harvest(plot)
    sound.pop(1.3)
    this.toast(`Panen ${n} ${CROPS[crop].name.toLowerCase()}!`)
  }

  plantSeed(crop) {
    const plot = this.garden.plots[this.ui.seedPicker]
    this.ui.seedPicker = null
    if (!plot || plot.crop) return
    this.player.play('harvest', 0.9)
    this.garden.plant(plot, crop)
    sound.pop(1)
    this.toast(`Bibit ${CROPS[crop].name.toLowerCase()} ditanam. Jangan lupa disiram.`)
  }

  toggleTV(tv = this.interactables.tv) {
    tv.on = !tv.on
    sound.click()
    if (tv.on) {
      if (!this.tvCanvas) {
        this.tvCanvas = document.createElement('canvas')
        this.tvCanvas.width = 256
        this.tvCanvas.height = 148
        this.tvTex = new THREE.CanvasTexture(this.tvCanvas)
        this.tvTex.colorSpace = THREE.SRGBColorSpace
      }
      tv.screenMat.map = this.tvTex
      tv.screenMat.emissiveMap = this.tvTex
      tv.screenMat.emissive.set('#ffffff')
      tv.screenMat.color.set('#ffffff')
      tv.screenMat.emissiveIntensity = 0.9
      tv.screenMat.needsUpdate = true
      if (tv !== this.interactables.tv) {
        this.toast('Channel akuarium, versi kamar.')
        return
      }
      this.toast('Channel akuarium. Kucing-kucing mulai tertarik.')
      for (const c of this.cats) if (!c.busy && c.state !== 'sleep' && Math.random() < 0.6) setTimeout(() => c.goWatchTV(), Math.random() * 2000)
    } else {
      tv.screenMat.map = null
      tv.screenMat.emissiveMap = null
      tv.screenMat.color.set('#0a0a0a')
      tv.screenMat.emissive.set('#000000')
      tv.screenMat.needsUpdate = true
    }
  }

  updateTV(dt) {
    if (!this.interactables.tvs.some((t) => t.on)) return
    this.tvT = (this.tvT || 0) - dt
    if (this.tvT > 0) return
    this.tvT = 1 / 15
    const g = this.tvCanvas.getContext('2d')
    const w = 256
    const h = 148
    const grd = g.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#2c8fb8')
    grd.addColorStop(1, '#0f4d6e')
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#d9c38f'
    g.fillRect(0, h - 16, w, 16)
    const t = this.time
    for (let i = 0; i < 6; i++) {
      const speed = 18 + i * 7
      const dir = i % 2 ? 1 : -1
      const x = ((t * speed * dir + i * 70) % (w + 60) + w + 60) % (w + 60) - 30
      const y = 22 + i * 18 + Math.sin(t * 1.5 + i) * 6
      g.fillStyle = ['#f29f3d', '#f4d35e', '#ee6c4d', '#9bd1e5', '#f29f3d', '#c3e88d'][i]
      g.beginPath()
      g.ellipse(x, y, 12, 6, 0, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.moveTo(x - dir * 10, y)
      g.lineTo(x - dir * 20, y - 6)
      g.lineTo(x - dir * 20, y + 6)
      g.fill()
      g.fillStyle = '#111'
      g.fillRect(x + dir * 6 - 1, y - 2, 2, 2)
    }
    g.fillStyle = 'rgba(255,255,255,0.35)'
    for (let i = 0; i < 8; i++) {
      const bx = (i * 37) % w
      const by = h - ((t * 30 + i * 23) % h)
      g.beginPath()
      g.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2)
      g.fill()
    }
    this.tvTex.needsUpdate = true
  }

  // ---------- tur & jalan otomatis ----------
  walkTo(roomId, done) {
    const room = ROOMS.find((r) => r.id === roomId)
    if (!room) return
    if (this.carrying) this.dropCat(this.carrying)
    const [sx, sz] = room.spot
    const path = this.navPlayer.findPath({ x: this.player.pos.x, z: this.player.pos.z }, { x: sx, z: -sz })
    if (!path || path.length < 2) {
      // nggak ketemu jalan (atau udah di tempat): langsung anggap sampai
      this.auto = null
      done?.()
      return
    }
    this.auto = { path, i: 1, done, stuck: 0, last: this.player.pos.clone() }
  }

  startTour() {
    this.tour = { i: 0 }
    this.ui.tour.active = true
    this.ui.tour.total = TOUR.length
    this.nextTourStop()
  }

  nextTourStop() {
    if (!this.tour) return
    const stop = TOUR[this.tour.i]
    if (!stop) return this.stopTour(true)
    this.ui.tour.step = this.tour.i + 1
    this.ui.tour.caption = `Menuju ${ROOMS.find((r) => r.id === stop.room).name}...`
    this.walkTo(stop.room, () => {
      if (!this.tour) return
      this.ui.tour.caption = stop.text
      this.tourTimer = setTimeout(() => {
        if (!this.tour) return
        this.tour.i++
        this.nextTourStop()
      }, 4200)
    })
  }

  stopTour(finished = false) {
    if (!this.tour && !this.auto) return
    clearTimeout(this.tourTimer)
    this.tour = null
    this.auto = null
    this.ui.tour.active = false
    if (finished) this.toast('Tur selesai. Selamat main sama kucing-kucing!')
  }

  goRoom(roomId) {
    this.stopTour()
    this.walkTo(roomId)
  }

  // ---------- pengaturan ----------
  toggleWalls() {
    this.ui.lowWalls = !this.ui.lowWalls
  }

  toggleMute() {
    this.ui.muted = !this.ui.muted
    sound.setMuted(this.ui.muted)
  }

  resetCamera() {
    this.cam.yaw = 0
    this.cam.pitch = 0.92
    this.cam.dist = 7.2
  }

  // ---------- sinkron ke Vue ----------
  syncUI(force = false) {
    const ui = this.ui
    const p = this.player.pos
    const room = roomAt(p.x, -p.z)
    ui.room = room ? room.name : ''

    this.actions = this.collectActions()
    const key = this.actions.map((a) => a.key + a.label + (a.disabled ? 0 : 1)).join('|')
    if (key !== this.promptKey || force) {
      this.promptKey = key
      ui.prompts = this.actions.map(({ key, label, disabled, secondary }) => ({ key, label, disabled, secondary }))
    }

    // kucing terdekat buat kartu info
    let near = null
    let best = 1.8
    for (const c of this.cats) {
      const d = Math.hypot(p.x - c.pos.x, p.z - c.pos.z)
      if (d < best) {
        best = d
        near = c
      }
    }
    if (this.carrying) near = this.carrying
    ui.nearCat = near ? near.snapshot() : null
    ui.churu = this.churu
    ui.harvested = { ...this.garden.harvested }

    const bowl = this.interactables.bowl
    bowl.kibble.visible = bowl.food > 0.05
    bowl.kibble.scale.set(1, 0.4 + bowl.food * 0.6, 1)

    ui.map.player = { x: p.x, z: -p.z, r: this.player.facing }
    ui.map.cats = this.cats.map((c) => ({ id: c.def.id, x: c.pos.x, z: -c.pos.z }))
  }

  save() {
    const cats = {}
    for (const c of this.cats) cats[c.def.id] = c.save()
    writeSave({
      player: [this.player.pos.x, -this.player.pos.z],
      facing: this.player.facing,
      cats,
      garden: this.garden.save(),
      churu: this.churu,
      bowl: this.interactables.bowl.food,
      lowWalls: this.ui.lowWalls,
      roofOn: this.ui.roofOn,
      muted: this.ui.muted,
    })
  }

  dispose() {
    this.save()
    clearTimeout(this.tourTimer)
    this.renderer.setAnimationLoop(null)
    this.input.dispose()
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('beforeunload', this.onUnload)
    this.renderer.dispose()
  }
}
