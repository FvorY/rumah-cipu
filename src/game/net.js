import * as THREE from 'three'
import { joinRoom, selfId } from 'trystero'
import { Player, sanitizeLook, DEFAULT_LOOK } from './player'
import { labelTexture } from './textures'
import { signOwner, verifyOwner, guestName, OWNER_NAME } from './owner'

// Multiplayer peer-to-peer (WebRTC) lewat Trystero, nggak butuh server sendiri.
// Yang disinkron: nama, tampilan karakter, posisi, arah, pose (duduk/tidur/dll).
// Kucing & kebun tetap lokal di masing-masing browser.

const APP_ID = 'rumah-cipu.fvory'
// dev server pakai room terpisah biar nggak campur sama pengunjung asli
const ROOM_ID = import.meta.env.DEV ? 'rumah-dev' : 'rumah-utama-v1'
const SEND_HZ = 8

const num = (v, min, max, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def)
const POSES = ['', 'sit', 'sleep', 'shower', 'cook']

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
    this.room = null
    this.ownerKey = null
    this.sendT = 0
    this.helloT = null
  }

  start(ownerKey = null) {
    if (this.room) return
    this.ownerKey = ownerKey
    try {
      this.room = joinRoom({ appId: APP_ID }, ROOM_ID)
    } catch (e) {
      console.warn('multiplayer nggak jalan:', e)
      return
    }
    this.helloA = this.room.makeAction('hello')
    this.stateA = this.room.makeAction('st')
    this.helloA.onMessage = (data, meta) => this.onHello(data, meta?.peerId ?? meta)
    this.stateA.onMessage = (data, meta) => this.onState(data, meta?.peerId ?? meta)
    this.room.onPeerJoin = (id) => this.sendHello(id)
    this.room.onPeerLeave = (id) => this.removePeer(id)
    this.sendHello()
  }

  get selfId() {
    return selfId
  }

  async sendHello(target) {
    if (!this.room) return
    const g = this.game
    const payload = { name: g.profile.name, look: g.profile.look }
    if (this.ownerKey) payload.owner = await signOwner(this.ownerKey, selfId)
    try {
      this.helloA.send(payload, target ? { target } : undefined)
    } catch (e) {
      console.warn(e)
    }
  }

  // dipanggil tiap profil berubah (ganti baju dll), dikasih jeda biar nggak spam
  announce() {
    clearTimeout(this.helloT)
    this.helloT = setTimeout(() => this.sendHello(), 400)
  }

  ensurePeer(id) {
    let p = this.peers.get(id)
    if (p) return p
    const player = new Player(DEFAULT_LOOK)
    player.root.visible = false
    this.game.scene.add(player.root)
    p = { id, player, name: 'Tamu', owner: false, label: null, target: null, lastSeen: performance.now(), lookKey: '' }
    this.peers.set(id, p)
    this.setLabel(p)
    this.syncCount()
    return p
  }

  setLabel(p) {
    if (p.label) {
      this.game.scene.remove(p.label)
      p.label.material.map.dispose()
      p.label.material.dispose()
    }
    p.label = makeNameTag(p.name, p.owner)
    this.game.scene.add(p.label)
  }

  async onHello(data, id) {
    if (!data || typeof data !== 'object' || !id) return
    const p = this.ensurePeer(id)
    p.lastSeen = performance.now()
    const owner = data.owner ? await verifyOwner(id, data.owner) : false
    const name = owner ? OWNER_NAME : guestName(data.name)
    const look = sanitizeLook(data.look)
    const lookKey = JSON.stringify(look)
    if (lookKey !== p.lookKey) {
      p.player.setLook(look)
      p.lookKey = lookKey
    }
    if (name !== p.name || owner !== p.owner) {
      const joinedNow = p.name === 'Tamu' && !p.announced
      p.name = name
      p.owner = owner
      this.setLabel(p)
      if (joinedNow) {
        p.announced = true
        this.game.toast(owner ? 'Ferdy, si pemilik rumah, lagi di rumah.' : `${name} datang berkunjung.`)
      }
    }
    this.syncCount()
  }

  onState(d, id) {
    if (!d || typeof d !== 'object' || !id) return
    const p = this.ensurePeer(id)
    p.lastSeen = performance.now()
    const t = {
      x: num(d.x, -1, 8),
      z: num(d.z, -17, 2),
      y: num(d.y, 0, 1.5),
      f: num(d.f, -100, 100),
      s: num(d.s, 0, 3.5),
      p: POSES.includes(d.p) ? d.p : '',
    }
    if (!p.target) {
      p.player.pos.set(t.x, t.y, t.z)
      p.player.facing = t.f
      p.player.root.visible = true
    }
    p.target = t
  }

  removePeer(id) {
    const p = this.peers.get(id)
    if (!p) return
    this.game.scene.remove(p.player.root)
    if (p.label) this.game.scene.remove(p.label)
    this.peers.delete(id)
    if (p.name !== 'Tamu') this.game.toast(`${p.name} pamit pulang.`)
    this.syncCount()
  }

  syncCount() {
    const ui = this.game.ui
    ui.online = this.peers.size + 1
    ui.others = [...this.peers.values()].map((p) => ({ id: p.id, name: p.name, owner: p.owner }))
  }

  update(dt) {
    if (!this.room) return
    const g = this.game
    const me = g.player

    // kirim posisi sendiri
    this.sendT -= dt
    if (this.sendT <= 0) {
      this.sendT = 1 / SEND_HZ
      const pose = me.pose || (me.seat ? 'sit' : '')
      try {
        this.stateA.send({
          x: +me.pos.x.toFixed(3),
          z: +me.pos.z.toFixed(3),
          y: +me.pos.y.toFixed(3),
          f: +me.facing.toFixed(3),
          s: +me.speed.toFixed(2),
          p: pose,
        })
      } catch {
        // koneksi lagi putus, coba lagi frame berikutnya
      }
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
    try {
      this.room?.leave()
    } catch {
      // abaikan
    }
    this.room = null
  }
}
