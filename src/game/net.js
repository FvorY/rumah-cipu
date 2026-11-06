import * as THREE from 'three'
import mqtt from 'mqtt'
import { Player, sanitizeLook, DEFAULT_LOOK } from './player'
import { labelTexture } from './textures'
import { signOwner, verifyOwner, guestName, OWNER_NAME } from './owner'
import { vehicleSeat, vehicleFacing, passengerCount } from './vehicle'

// Multiplayer lewat relay MQTT di atas WebSocket aman (wss).
// Sebelumnya pakai WebRTC peer-to-peer, tapi itu sering gagal nyambung antar
// jaringan seluler (CGNAT) atau di Wi-Fi yang sama. Lewat relay, tiap perangkat
// cuma ngobrol ke broker pakai koneksi biasa, jadi jenis jaringannya nggak masalah.
// Nyambung ke dua broker publik sekaligus; kalau satu diblok / mati, yang lain jalan.
// Pesan dobel dari dua broker dibuang pakai nomor urut.

const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt']
// dev server pakai room terpisah biar nggak campur sama pengunjung asli
const ROOM_ID = import.meta.env.DEV ? 'rumah-dev' : 'rumah-utama-v1'
const BASE = `rumah-cipu/v2/${ROOM_ID}`
const SEND_HZ = 8
const SEND_HZ_VEHICLE = 15 // kendaraan gerak cepat, kirim lebih sering biar mulus
// Pemain lain digambar sedikit "di masa lalu" lalu diinterpolasi di antara dua paket,
// jadi jitter jaringan / broker nggak bikin gerakannya patah-patah.
const INTERP_DELAY = 170 // ms
const MAX_EXTRAPOLATE = 250 // ms
const SNAP_DIST = 4 // lompatan sejauh ini dianggap teleport, nggak diinterpolasi
const HELLO_EVERY = 25 // detik, sekalian perpanjang tanda tangan pemilik
const OWNER_PROOF_MAX_AGE = 10 * 60 * 1000

const num = (v, min, max, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def)
const POSES = ['', 'sit', 'sleep', 'shower', 'cook', 'car', 'motor', 'ride']
const PEER_TIMEOUT = 45000
const DEPARTURE_GRACE = 5000
const lerp = (a, b, u) => a + (b - a) * u
const lerpAngle = (a, b, u) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u
const ZERO = new THREE.Vector3()
const LABEL_UP = new THREE.Vector3(0, 0.5, 0)

// state di antara dua snapshot (u > 1 = ekstrapolasi)
function blend(a, b, u) {
  if (a.p !== b.p || !a.v !== !b.v || Math.hypot(b.x - a.x, b.z - a.z) > SNAP_DIST) return u < 1 ? a : b
  const base = u < 1 ? a : b
  const out = { ...base, x: lerp(a.x, b.x, u), y: Math.max(0, lerp(a.y, b.y, u)), z: lerp(a.z, b.z, u), f: lerpAngle(a.f, b.f, u), s: Math.max(0, lerp(a.s, b.s, u)) }
  if (a.v && b.v) {
    if (Math.hypot(b.v.x - a.v.x, b.v.z - a.v.z) > SNAP_DIST) out.v = base.v
    else out.v = { ...base.v, x: lerp(a.v.x, b.v.x, u), z: lerp(a.v.z, b.v.z, u), f: lerpAngle(a.v.f, b.v.f, u), lean: lerp(a.v.lean, b.v.lean, u) }
  }
  return out
}

const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10)

export const makeNameTag = (text, owner) => {
  const tex = labelTexture(owner ? `★ ${text} · pemilik rumah` : text, owner ? { bg: 'rgba(224,165,38,0.95)', fg: '#3b2f2a', size: 38 } : { size: 40 })
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
  s.scale.set(owner ? 1.5 : 1.1, owner ? 0.28 : 0.21, 1)
  s.renderOrder = 11
  return s
}

export class Net {
  constructor(game) {
    this.game = game
    this.peers = new Map()
    this.clients = []
    this.ownerKey = null
    this.id = randomId()
    this.seq = 0
    this.sendT = 0
    this.helloT = 0
    this.announceT = null
    this.started = false
    this.onUnload = () => this.leave()
    this.onRestore = (e) => { if (e.persisted) this.start(this.ownerKey) }
    window.addEventListener('pageshow', this.onRestore)
  }

  get selfId() {
    return this.id
  }

  start(ownerKey = null) {
    if (this.started) return
    this.started = true
    this.ownerKey = ownerKey
    this.setStatus('menyambung')
    BROKERS.forEach((url) => this.connect(url))
    window.addEventListener('pagehide', this.onUnload)
  }

  connect(url) {
    let client
    try {
      client = mqtt.connect(url, {
        clientId: `rc_${this.id}_${Math.random().toString(36).slice(2, 6)}`,
        clean: true,
        keepalive: 30,
        connectTimeout: 10000,
        reconnectPeriod: 4000,
        // kalau koneksi putus mendadak, broker hapus "hello" kita sendiri
        will: { topic: `${BASE}/hello/${this.id}`, payload: '', retain: true, qos: 0 },
      })
    } catch (e) {
      console.warn('broker gagal', url, e)
      return
    }
    client.on('connect', () => {
      client.subscribe([`${BASE}/hello/+`, `${BASE}/st/+`, `${BASE}/chat/+`, `${BASE}/bye/+`], { qos: 0 })
      this.sendHello(client)
      this.refreshStatus()
    })
    client.on('message', (topic, buf) => this.onMessage(topic, buf))
    for (const ev of ['close', 'offline', 'error']) client.on(ev, () => this.refreshStatus())
    this.clients.push(client)
  }

  refreshStatus() {
    if (!this.started) return
    if (this.clients.some((c) => c.connected)) this.setStatus('terhubung')
    else this.setStatus(navigator.onLine === false ? 'offline' : 'menyambung')
  }

  setStatus(s) {
    this.game.ui.netStatus = s
  }

  publish(topic, payload, retain = false) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
    for (const c of this.clients) {
      if (!c.connected) continue
      try {
        c.publish(topic, body, { qos: 0, retain })
      } catch {
        // koneksi lagi putus, nanti dicoba lagi
      }
    }
  }

  async helloPayload() {
    const g = this.game
    const payload = { name: g.profile.name, look: g.profile.look, q: ++this.seq }
    if (this.ownerKey) payload.owner = await signOwner(this.ownerKey, this.id)
    return payload
  }

  async sendHello(onlyClient) {
    if (!this.started) return
    const body = JSON.stringify(await this.helloPayload())
    const topic = `${BASE}/hello/${this.id}`
    if (onlyClient) {
      if (onlyClient.connected) onlyClient.publish(topic, body, { qos: 0, retain: true })
    } else this.publish(topic, body, true)
  }

  // dipanggil tiap profil berubah (ganti baju dll), dikasih jeda biar nggak spam
  announce() {
    clearTimeout(this.announceT)
    this.announceT = setTimeout(() => this.sendHello(), 400)
  }

  onMessage(topic, buf) {
    const parts = topic.split('/')
    const kind = parts[3]
    const id = parts[4]
    if (!id || id === this.id || id.length > 24) return
    // One broker may disconnect while the other still delivers state. Wait for fresh state before removing anyone.
    if (!buf || buf.length === 0) {
      const peer = this.peers.get(id)
      if (kind === 'hello' && peer && !peer.departureAt) peer.departureAt = performance.now() + DEPARTURE_GRACE
      return
    }
    if (buf.length > 4000) return
    let data
    try {
      data = JSON.parse(new TextDecoder().decode(buf))
    } catch {
      return
    }
    if (!data || typeof data !== 'object') return
    if (kind === 'hello') this.onHello(data, id)
    else if (kind === 'st') this.onState(data, id)
    else if (kind === 'chat') this.onChat(data, id)
    else if (kind === 'bye') {
      const p = this.peers.get(id)
      if (p && num(data.q, 0, 1e12) > p.lastQ && Math.abs(Date.now() - num(data.ts, 0, 1e15)) < 10000) {
        p.departureAt = performance.now() + DEPARTURE_GRACE
        p.explicitLeave = true
      }
    }
  }

  sendChat(text) {
    if (!text || !text.trim()) return
    const cleanText = text.trim().slice(0, 100)
    const msg = {
      name: this.game.profile.name || 'Tamu',
      text: cleanText,
      ts: Date.now(),
    }
    this.publish(`${BASE}/chat/${this.id}`, msg)
    this.onChat(msg, this.id)
  }

  onChat(data, id) {
    const text = String(data.text || '').slice(0, 100)
    if (!text) return
    const sender = String(data.name || 'Tamu').slice(0, 20)
    const isSelf = id === this.id
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const list = this.game.ui.chatMessages
    list.push({ id: Math.random().toString(36).slice(2), sender, text, time, self: isSelf })
    if (list.length > 50) list.shift()

    // Cari posisi kepala karakter untuk memunculkan bubble chat di 3D
    let headTarget = null
    if (isSelf) {
      headTarget = this.game.player
    } else {
      const p = this.peers.get(id)
      if (p) headTarget = p.player
    }

    if (headTarget) {
      this.spawnChatBubble(headTarget, text)
    }

    // Jika Pak Joko dekat dan mendengar chat, ia bisa menimpali
    if (this.game.neighbor && isSelf) {
      const dist = Math.hypot(this.game.player.pos.x - this.game.neighbor.pos.x, this.game.player.pos.z - this.game.neighbor.pos.z)
      if (dist < 6 && Math.random() < 0.6) {
        setTimeout(() => {
          if (!this.game.neighbor) return
          const reply = 'Pak Joko: Wah seru banget ya ngobrolnya!'
          list.push({ id: Math.random().toString(36).slice(2), sender: 'Pak Joko', text: 'Wah seru ya ngobrolnya!', time, self: false })
          this.spawnChatBubble(this.game.neighbor.player, 'Wah seru ngobrolnya!')
        }, 1200)
      }
    }
  }

  spawnChatBubble(targetPlayer, text) {
    const shortText = text.length > 28 ? text.slice(0, 26) + '...' : text
    const tex = labelTexture(`💬 ${shortText}`, { bg: 'rgba(255, 255, 255, 0.95)', fg: '#2b231d', size: 36 })
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
    sprite.scale.set(1.4, 0.28, 1)
    sprite.renderOrder = 15

    const updatePos = () => {
      sprite.position.set(targetPlayer.pos.x, targetPlayer.pos.y + (targetPlayer.pose === 'sleep' ? 0.9 : 2.15), targetPlayer.pos.z)
    }
    updatePos()
    this.game.scene.add(sprite)

    const interval = setInterval(updatePos, 50)
    setTimeout(() => {
      clearInterval(interval)
      this.game.scene.remove(sprite)
      sprite.material.map.dispose()
      sprite.material.dispose()
    }, 4500)
  }

  ensurePeer(id) {
    let p = this.peers.get(id)
    if (p) return p
    const player = new Player(DEFAULT_LOOK)
    player.root.visible = false
    this.game.scene.add(player.root)
    p = { id, player, name: 'Tamu', owner: false, label: null, target: null, view: null, buf: [], clockOff: null, lastSeen: performance.now(), lookKey: '', lastQ: -1, named: false, announced: false }
    this.peers.set(id, p)
    this.setLabel(p)
    return p
  }

  setLabel(p) {
    if (p.label) {
      this.game.scene.remove(p.label)
      p.label.material.map.dispose()
      p.label.material.dispose()
    }
    p.label = makeNameTag(p.name, p.owner)
    p.label.visible = !!p.target
    this.game.scene.add(p.label)
  }

  async onHello(data, id) {
    const p = this.ensurePeer(id)
    const fresh = data.owner && Math.abs(Date.now() - num(data.owner.ts, 0, 1e15)) < OWNER_PROOF_MAX_AGE
    const owner = fresh ? await verifyOwner(id, data.owner) : false
    if (this.peers.get(id) !== p) return
    const name = owner ? OWNER_NAME : guestName(data.name)
    const look = sanitizeLook(data.look)
    const lookKey = JSON.stringify(look)
    if (lookKey !== p.lookKey) {
      p.player.setLook(look)
      p.lookKey = lookKey
    }
    if (name !== p.name || owner !== p.owner || !p.named) {
      p.name = name
      p.owner = owner
      p.named = !!(data.name || owner)
      this.setLabel(p)
    }
    this.maybeAnnounce(p)
    this.syncCount()
  }

  onState(d, id) {
    const p = this.ensurePeer(id)
    const q = num(d.q, 0, 1e12, 0)
    if (q <= p.lastQ) return // dobel dari broker kedua / telat
    p.lastQ = q
    const now = performance.now()
    p.lastSeen = now
    const t = {
      x: num(d.x, -28, 35),
      z: num(d.z, -16.5, 16.5),
      y: num(d.y, 0, 3),
      f: num(d.f, -100, 100),
      s: num(d.s, 0, 8),
      p: POSES.includes(d.p) ? d.p : '',
    }
    const vehicle = ['car', 'motor'].includes(t.p) && d.v && typeof d.v === 'object'
    t.v = vehicle ? { x: num(d.v.x, -28, 35), z: num(d.v.z, -16.5, 16.5), f: num(d.v.f, -100, 100), lean: num(d.v.l, -0.4, 0.4), neighbor: d.v.n === true } : null
    const r = d.r
    const ride = t.p === 'ride' && r && typeof r === 'object' && typeof r.d === 'string' && r.d.length <= 24 && ['car', 'motor'].includes(r.t)
    t.r = ride ? { d: r.d, t: r.t, s: Math.round(num(r.s, 0, passengerCount(r.t) - 1)) } : null
    if (t.p === 'ride' && !t.r) t.p = ''

    // waktu paket ini menurut jam pengirim, dipetakan ke jam kita.
    // offset = latensi tercepat yang pernah kelihatan (pelan-pelan dinaikin lagi kalau jam bergeser)
    let at = now
    if (typeof d.ts === 'number' && Number.isFinite(d.ts)) {
      const off = now - d.ts
      p.clockOff = p.clockOff == null || off < p.clockOff ? off : p.clockOff + Math.min(off - p.clockOff, 2)
      at = Math.min(now, d.ts + p.clockOff)
    }
    const last = p.buf[p.buf.length - 1]
    if (last) at = Math.max(at, last.at + 1)
    p.buf.push({ at, t })
    while (p.buf.length > 40 || (p.buf.length > 2 && p.buf[1].at < now - 1500)) p.buf.shift()
    p.departureAt = null
    p.explicitLeave = false
    const first = !p.target
    p.target = t // harus di-set dulu sebelum hitung jumlah orang
    if (first) {
      p.view = t
      p.player.pos.set(t.x, t.y, t.z)
      p.player.facing = t.f
      p.player.root.visible = true
      p.label.visible = true
      this.maybeAnnounce(p)
      this.syncCount()
    }
  }

  // kabarin "X datang" cuma kalau orangnya beneran aktif (udah punya nama & posisi)
  maybeAnnounce(p) {
    if (p.announced || !p.named || !p.target) return
    p.announced = true
    this.game.toast(p.owner ? 'Ferdy, si pemilik rumah, lagi di rumah.' : `${p.name} datang berkunjung.`)
  }

  removePeer(id) {
    const p = this.peers.get(id)
    if (!p) return
    this.game.scene.remove(p.player.root)
    if (p.label) this.game.scene.remove(p.label)
    this.peers.delete(id)
    if (p.announced && p.explicitLeave) this.game.toast(`${p.name} meninggalkan permainan.`)
    this.clearVehicle(p)
    if (p.label) {
      p.label.material.map.dispose()
      p.label.material.dispose()
    }
    this.syncCount()
  }

  syncCount() {
    const ui = this.game.ui
    const active = [...this.peers.values()].filter((p) => p.target)
    ui.online = active.length + 1
    ui.others = active.map((p) => ({ id: p.id, name: p.name, owner: p.owner }))
  }

  update(dt) {
    if (!this.started) return
    const g = this.game
    const me = g.player

    // kirim posisi sendiri
    this.sendT -= dt
    if (this.sendT <= 0) {
      const type = g.drivingVehicle
      const ride = g.riding
      this.sendT = 1 / (type ? SEND_HZ_VEHICLE : SEND_HZ)
      const root = type === 'car' ? g.car.group : type === 'motor' ? g.motor.root : null
      const pose = ride ? 'ride' : type || me.pose || (me.seat ? 'sit' : '')
      const vehicle = root ? { x: +root.position.x.toFixed(3), z: +root.position.z.toFixed(3), f: +Math.atan2(Math.sin(root.rotation.y), Math.cos(root.rotation.y)).toFixed(3), l: type === 'motor' ? +root.getObjectByName('bike').rotation.z.toFixed(3) : 0, n: g.neighbor.passengerIn === type } : null
      this.publish(`${BASE}/st/${this.id}`, {
        q: ++this.seq,
        ts: Math.round(performance.now()),
        x: +me.pos.x.toFixed(3),
        z: +me.pos.z.toFixed(3),
        y: +me.pos.y.toFixed(3),
        f: +Math.atan2(Math.sin(me.facing), Math.cos(me.facing)).toFixed(3),
        s: +me.speed.toFixed(2),
        p: pose,
        v: vehicle,
        r: ride ? { d: ride.d, t: ride.t, s: ride.s } : undefined,
      })
    }
    this.helloT -= dt
    if (this.helloT <= 0) {
      this.helloT = HELLO_EVERY
      this.sendHello()
    }

    // gerakin pemain lain: interpolasi dari buffer snapshot
    const now = performance.now()
    const v = new THREE.Vector3()
    const riders = []
    for (const p of this.peers.values()) {
      if ((p.departureAt && now >= p.departureAt) || now - p.lastSeen > PEER_TIMEOUT) {
        this.removePeer(p.id)
        continue
      }
      if (!p.target) continue
      const t = this.sample(p, now)
      p.view = t
      if (t.p === 'ride') {
        this.clearVehicle(p)
        riders.push(p)
        continue
      }
      if (t.v) {
        this.updateVehicle(p, t, dt)
        continue
      }
      this.clearVehicle(p)
      const pl = p.player
      pl.pos.set(t.x, t.y, t.z)
      pl.seat = t.p === 'sit' ? { remote: true } : t.p === 'car' ? { inCar: true } : t.p === 'motor' ? { onMotor: true } : null
      pl.pose = ['sleep', 'shower', 'cook'].includes(t.p) ? t.p : null
      const moving = t.s > 0.05 && !pl.seat && !pl.pose
      v.set(moving ? Math.sin(t.f) : 0, 0, moving ? Math.cos(t.f) : 0).multiplyScalar(Math.min(1, t.s / 1.7))
      pl.isGrounded = !!pl.seat || !!pl.pose || t.y <= 0.02
      pl.facing = t.f
      pl.update(dt, v, t.s > 2.2)
      p.label.position.copy(pl.headWorld()).add(LABEL_UP)
    }
    // penumpang belakangan, setelah posisi kendaraannya diupdate
    for (const p of riders) this.updateRider(p, dt)
    this.updateSelfRide(dt)
    this.refreshVehicles()
  }

  sample(p, now) {
    const buf = p.buf
    if (!buf.length) return p.target
    const rt = now - INTERP_DELAY
    let i = buf.length - 1
    while (i > 0 && buf[i].at > rt) i--
    const a = buf[i]
    const b = buf[i + 1]
    if (b) return rt <= a.at ? a.t : blend(a.t, b.t, (rt - a.at) / (b.at - a.at))
    // paket berikutnya telat: terusin sebentar pakai kecepatan terakhir
    const prev = buf[i - 1]
    const ahead = Math.min(rt - a.at, MAX_EXTRAPOLATE)
    if (!prev || ahead <= 0) return a.t
    return blend(prev.t, a.t, 1 + ahead / Math.max(1, a.at - prev.at))
  }

  clearVehicle(p) {
    if (p.vehicle) {
      if (this.game.drivingVehicle !== p.vehicleType) {
        const local = this.game[p.vehicleType]
        const root = p.vehicleType === 'car' ? local.group : local.root
        root.position.copy(p.vehicle.position)
        root.rotation.copy(p.vehicle.rotation)
        local.stopDrive()
      }
      this.game.scene.remove(p.vehicle)
    }
    if (p.passenger) this.game.scene.remove(p.passenger.root)
    p.vehicle = null
    p.vehicleType = null
    p.passenger = null
    p.wheels = null
  }

  updateVehicle(p, t, dt) {
    if (p.vehicleType !== t.p) {
      this.clearVehicle(p)
      const source = t.p === 'car' ? this.game.car.group : this.game.motor.root
      p.vehicle = source.clone(true)
      p.vehicle.visible = true
      p.vehicleType = t.p
      p.vehicle.position.set(t.v.x, 0, t.v.z)
      p.vehicle.rotation.y = t.v.f
      p.wheels = []
      p.vehicle.traverse((o) => o.name === 'spin' && p.wheels.push(o))
      const stand = p.vehicle.getObjectByName('stand')
      if (stand) stand.visible = false
      this.game.scene.add(p.vehicle)
    }
    const root = p.vehicle
    const dx = t.v.x - root.position.x
    const dz = t.v.z - root.position.z
    root.position.set(t.v.x, 0, t.v.z)
    root.rotation.y = t.v.f
    // roda ikut muter sesuai jarak tempuh (maju / mundur)
    const isCar = t.p === 'car'
    const fwd = isCar ? dx * Math.cos(t.v.f) - dz * Math.sin(t.v.f) : dx * Math.sin(t.v.f) + dz * Math.cos(t.v.f)
    if (Math.abs(fwd) < 1) for (const w of p.wheels) isCar ? (w.rotation.z -= fwd / 0.235) : (w.rotation.x += fwd / 0.25)
    const bike = root.getObjectByName('bike')
    if (bike) {
      bike.position.x = 0
      bike.rotation.z = t.v.lean
    }
    const pl = p.player
    pl.pos.copy(vehicleSeat(root, t.p))
    pl.facing = vehicleFacing(root, t.p)
    pl.pose = null
    pl.seat = { inCar: isCar, onMotor: !isCar, lean: t.v.lean }
    pl.update(dt, ZERO, false)
    p.label.position.copy(pl.headWorld()).add(LABEL_UP)
    if (t.v.neighbor) {
      if (!p.passenger) {
        p.passenger = new Player(this.game.neighbor.look)
        this.game.scene.add(p.passenger.root)
      }
      p.passenger.pos.copy(vehicleSeat(root, t.p, 0))
      p.passenger.facing = pl.facing
      p.passenger.seat = { ...pl.seat, passenger: true }
      p.passenger.update(dt, ZERO, false)
    } else if (p.passenger) {
      this.game.scene.remove(p.passenger.root)
      p.passenger = null
    }
  }

  // ---------- nebeng kendaraan pemain lain ----------

  // kendaraan tempat sopir `r.d` lagi nyetir, kelihatan di layar kita
  hostRoot(r) {
    const g = this.game
    if (r.d === this.id) {
      if (g.drivingVehicle !== r.t) return null
      const root = r.t === 'car' ? g.car.group : g.motor.root
      return { root, lean: r.t === 'motor' ? root.getObjectByName('bike').rotation.z : 0 }
    }
    const d = this.peers.get(r.d)
    if (d?.vehicle && d.vehicleType === r.t) return { root: d.vehicle, lean: d.view?.v?.lean || 0 }
    return null
  }

  neighborAboard(driverId, type) {
    if (driverId === this.id) return this.game.neighbor.passengerIn === type
    return !!this.peers.get(driverId)?.target?.v?.neighbor
  }

  // kursi penumpang yang udah keisi di kendaraan sopir `driverId` (selain kita sendiri)
  takenSeats(driverId, type) {
    const taken = new Set()
    if (this.neighborAboard(driverId, type)) taken.add(0)
    for (const q of this.peers.values()) {
      const r = q.target?.p === 'ride' && q.target.r
      if (r && r.d === driverId && r.t === type) taken.add(r.s)
    }
    return taken
  }

  freeSeat(driverId, type) {
    const taken = this.takenSeats(driverId, type)
    // kursi depan mobil disisain buat Pak Joko, dipakai paling akhir
    const order = type === 'car' ? [1, 2, 3, 4, 5, 0] : [0]
    return order.find((s) => !taken.has(s)) ?? -1
  }

  peerInSeat(type, seat) {
    return [...this.peers.values()].find((q) => {
      const r = q.target?.p === 'ride' && q.target.r
      return r && r.d === this.id && r.t === type && r.s === seat
    })
  }

  remoteDriving(type) {
    return [...this.peers.values()].some((p) => p.vehicleType === type)
  }

  board(peer) {
    const type = peer.vehicleType
    if (!type || !peer.vehicle) return false
    const s = this.freeSeat(peer.id, type)
    if (s < 0) return false
    this.game.riding = { d: peer.id, t: type, s, name: peer.name, lost: 0, lastRoot: peer.vehicle }
    return true
  }

  updateRider(p, dt) {
    const t = p.view
    const pl = p.player
    const type = t.r.t
    const host = this.hostRoot(t.r)
    if (host) {
      pl.pos.copy(vehicleSeat(host.root, type, t.r.s))
      pl.facing = vehicleFacing(host.root, type)
    } else {
      pl.pos.set(t.x, t.y, t.z)
      pl.facing = t.f
    }
    pl.pose = null
    pl.seat = { inCar: type === 'car', onMotor: type === 'motor', passenger: true, lean: host?.lean || 0 }
    pl.update(dt, ZERO, false)
    p.label.position.copy(pl.headWorld()).add(LABEL_UP)
  }

  updateSelfRide(dt) {
    const g = this.game
    const r = g.riding
    if (!r) return
    const host = this.hostRoot(r)
    if (!host) {
      // sopirnya parkir / keluar: tunggu sebentar (bisa cuma paket telat), lalu ikut turun
      r.lost += dt
      if (r.lost > 0.6) g.stopRide(`${r.name} parkir, kamu ikut turun.`)
      return
    }
    r.lost = 0
    r.lastRoot = host.root
    // dua orang rebutan kursi yang sama: id lebih kecil yang menang, sisanya geser
    const clash = (r.s === 0 && this.neighborAboard(r.d, r.t)) || this.peerHolds(r)
    if (clash) {
      const s = this.freeSeat(r.d, r.t)
      if (s < 0) {
        g.stopRide(`Kendaraan ${r.name} udah penuh.`)
        return
      }
      r.s = s
    }
    const pl = g.player
    pl.pos.copy(vehicleSeat(host.root, r.t, r.s))
    pl.facing = vehicleFacing(host.root, r.t)
    pl.pose = null
    pl.seat = { inCar: r.t === 'car', onMotor: r.t === 'motor', passenger: true, lean: host.lean, riding: true }
    pl.update(dt, ZERO, false)
  }

  // ada peer lain (id-nya lebih kecil dari kita) yang duduk di kursi yang sama?
  peerHolds(r) {
    for (const q of this.peers.values()) {
      const qr = q.target?.p === 'ride' && q.target.r
      if (qr && qr.d === r.d && qr.t === r.t && qr.s === r.s && q.id < this.id) return true
    }
    return false
  }

  refreshVehicles() {
    const g = this.game
    for (const type of ['car', 'motor']) {
      const remote = this.remoteDriving(type)
      const local = g[type]
      const root = type === 'car' ? local.group : local.root
      const mine = g.drivingVehicle === type
      root.visible = !remote || mine
      // kendaraan lokal lagi "dipinjam" orang lain: jangan jadi tembok gaib
      local.collider.disabled = mine || remote
    }
    const remotePassenger = [...this.peers.values()].some((p) => p.passenger)
    g.neighbor.root.visible = !remotePassenger || g.neighbor.isPassenger
    g.neighbor.tag.visible = g.neighbor.root.visible && !g.neighbor.isPassenger
  }

  dispose() {
    clearTimeout(this.announceT)
    this.leave()
    window.removeEventListener('pageshow', this.onRestore)
  }

  leave() {
    if (!this.started) return
    this.publish(`${BASE}/bye/${this.id}`, { q: ++this.seq, ts: Date.now() })
    // hapus hello kita biar langsung hilang di layar orang lain
    this.publish(`${BASE}/hello/${this.id}`, '', true)
    for (const c of this.clients) {
      try {
        c.end(false)
      } catch {
        // abaikan
      }
    }
    this.clients = []
    this.started = false
    for (const id of [...this.peers.keys()]) this.removePeer(id)
    this.refreshVehicles()
    window.removeEventListener('pagehide', this.onUnload)
  }
}
