import * as THREE from 'three'
import mqtt from 'mqtt'
import { Player, sanitizeLook, DEFAULT_LOOK } from './player'
import { labelTexture } from './textures'
import { signOwner, verifyOwner, guestName, OWNER_NAME } from './owner'

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
const HELLO_EVERY = 25 // detik, sekalian perpanjang tanda tangan pemilik
const OWNER_PROOF_MAX_AGE = 10 * 60 * 1000

const num = (v, min, max, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def)
const POSES = ['', 'sit', 'sleep', 'shower', 'cook']
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
      client.subscribe([`${BASE}/hello/+`, `${BASE}/st/+`, `${BASE}/chat/+`], { qos: 0 })
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
    // hello kosong = orangnya pergi
    if (!buf || buf.length === 0) {
      if (kind === 'hello') this.removePeer(id)
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
    p = { id, player, name: 'Tamu', owner: false, label: null, target: null, lastSeen: performance.now(), lookKey: '', lastQ: -1, named: false, announced: false }
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
    p.lastSeen = performance.now()
    const t = {
      x: num(d.x, -1, 8),
      z: num(d.z, -17, 2),
      y: num(d.y, 0, 1.5),
      f: num(d.f, -100, 100),
      s: num(d.s, 0, 3.5),
      p: POSES.includes(d.p) ? d.p : '',
    }
    const first = !p.target
    p.target = t // harus di-set dulu sebelum hitung jumlah orang
    if (first) {
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
    if (p.announced) this.game.toast(`${p.name} pamit pulang.`)
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
    const me = this.game.player

    // kirim posisi sendiri
    this.sendT -= dt
    if (this.sendT <= 0) {
      this.sendT = 1 / SEND_HZ
      const pose = me.pose || (me.seat ? 'sit' : '')
      this.publish(`${BASE}/st/${this.id}`, {
        q: ++this.seq,
        x: +me.pos.x.toFixed(3),
        z: +me.pos.z.toFixed(3),
        y: +me.pos.y.toFixed(3),
        f: +me.facing.toFixed(3),
        s: +me.speed.toFixed(2),
        p: pose,
      })
    }
    this.helloT -= dt
    if (this.helloT <= 0) {
      this.helloT = HELLO_EVERY
      this.sendHello()
    }

    // gerakin pemain lain dengan halus
    const k = 1 - Math.exp(-dt * 10)
    const now = performance.now()
    const v = new THREE.Vector3()
    for (const p of this.peers.values()) {
      if (now - p.lastSeen > 20000) {
        this.removePeer(p.id)
        continue
      }
      const t = p.target
      if (!t) continue
      const pl = p.player
      const dx = t.x - pl.pos.x
      const dz = t.z - pl.pos.z
      const dist = Math.hypot(dx, dz)
      // kejauhan (teleport / baru nyambung): langsung lompat
      if (dist > 3) pl.pos.set(t.x, t.y, t.z)
      else {
        pl.pos.x += dx * k
        pl.pos.z += dz * k
        pl.pos.y += (t.y - pl.pos.y) * k
      }
      pl.seat = t.p === 'sit' ? { remote: true } : null
      pl.pose = ['sleep', 'shower', 'cook'].includes(t.p) ? t.p : null
      const moving = t.s > 0.05 && !pl.seat && !pl.pose
      v.set(moving ? Math.sin(t.f) : 0, 0, moving ? Math.cos(t.f) : 0).multiplyScalar(Math.min(1, t.s / 1.7))
      pl.update(dt, v, t.s > 2.2)
      let df = t.f - pl.facing
      df = Math.atan2(Math.sin(df), Math.cos(df))
      pl.facing += df * k
      pl.root.rotation.y = pl.facing
      p.label.position.set(pl.pos.x, pl.pos.y + (pl.pose === 'sleep' ? 0.6 : 1.78), pl.pos.z)
    }
  }

  leave() {
    if (!this.started) return
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
    window.removeEventListener('pagehide', this.onUnload)
  }
}
