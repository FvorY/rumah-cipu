<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { ui } from './store'
import { Game } from './game/Game'
import { CROPS } from './game/garden'
import StartScreen from './components/StartScreen.vue'
import Minimap from './components/Minimap.vue'
import CatCard from './components/CatCard.vue'
import PromptBar from './components/PromptBar.vue'
import Joystick from './components/Joystick.vue'
import SeedPicker from './components/SeedPicker.vue'
import DenahModal from './components/DenahModal.vue'
import Customizer from './components/Customizer.vue'
import { ownerRouteActive, restoreOwner, unlockOwner } from './game/owner'

const canvas = ref(null)
const isTouch = ref(false)
const mapOpen = ref(true)
const showHelp = ref(false)
const showDenah = ref(false)
let game = null

onMounted(() => {
  isTouch.value = matchMedia('(pointer: coarse)').matches
  mapOpen.value = window.innerWidth > 720
  game = new Game(canvas.value, ui)
  profileName.value = game.profile.name
  if (ownerRouteActive()) {
    ownerMode.value = 'locked'
    restoreOwner().then((k) => {
      if (!k) return
      ownerKey = k
      ownerMode.value = 'ready'
    })
  }
  if (import.meta.env.DEV) window.__game = game
})

onBeforeUnmount(() => game?.dispose())

const profileName = ref('')
// jalur pemilik: cuma aktif kalau dibuka lewat #ferdy, nggak ada tombolnya di mana pun
const ownerMode = ref('none') // none | locked | ready
let ownerKey = null
const unlock = async (pass) => {
  try {
    const k = await unlockOwner(pass)
    if (!k) return 'Kuncinya salah.'
    ownerKey = k
    ownerMode.value = 'ready'
    return ''
  } catch {
    return 'Browser ini belum dukung, coba Chrome / Safari versi baru.'
  }
}
// pemain baru (atau yang mau ganti) bikin karakter dulu sebelum masuk
const start = (customize = false) => {
  if (ownerMode.value === 'ready') {
    game.start({ ownerKey })
    return
  }
  game.start()
  if (customize || !game.profile.name) {
    game.player.facing = 0
    ui.customizer = { mode: 'create' }
    game.setPreviewCam(true)
  }
}
const onCustomDone = ({ name, look }) => {
  const creating = ui.customizer?.mode === 'create'
  game.setProfile({ name: creating ? name : undefined, look })
  game.closeCustomizer()
  if (creating) {
    game.player.facing = Math.PI
    game.toast(`Halo ${game.profile.name}, selamat datang!`)
  }
}
const trigger = (key) => game.trigger(key)
const setJoy = (v) => {
  game.input.joy.x = v.x
  game.input.joy.y = v.y
}

// toast hilang sendiri
const toastVisible = ref(false)
let toastTimer = null
watch(
  () => ui.toast?.id,
  () => {
    if (!ui.toast) return
    toastVisible.value = true
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toastVisible.value = false), 3200)
  },
)

// status koneksi main bareng, biar kelihatan kalau nyambungnya gagal
const netText = computed(() => {
  if (ui.others.length) return ui.others.slice(0, 3).map((o) => (o.owner ? '★ ' : '') + o.name).join(', ') + (ui.others.length > 3 ? ` +${ui.others.length - 3}` : '')
  if (ui.netStatus === 'terhubung') return 'online, nunggu yang lain masuk'
  if (ui.netStatus === 'menyambung') return 'menyambung ke server...'
  return 'offline, main sendiri dulu'
})

const harvestList = computed(() =>
  Object.entries(ui.harvested)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, n, name: CROPS[id].name, color: CROPS[id].color })),
)
</script>

<template>
  <div class="app" :class="{ touch: isTouch, customizing: !!ui.customizer }">
    <canvas ref="canvas" class="scene" />

    <Transition name="fade">
      <StartScreen v-if="!ui.started" :name="profileName" :owner="ownerMode" :unlock="unlock" @start="start" />
    </Transition>

    <template v-if="ui.started">
      <div class="top-left">
        <div class="room panel">
          <span class="room-label">Lagi di</span>
          <Transition name="swap" mode="out-in">
            <strong :key="ui.room">{{ ui.room || '...' }}</strong>
          </Transition>
        </div>
        <div class="online panel" :class="ui.netStatus" :title="ui.others.map((o) => o.name).join(', ')">
          <i />{{ ui.online > 1 ? `${ui.online} orang di rumah` : 'Cuma kamu di rumah' }}
          <span class="names">{{ netText }}</span>
        </div>
        <div class="stash panel">
          <span class="stash-item"><i class="dot churu" />Churu {{ ui.churu }}</span>
          <span v-for="h in harvestList" :key="h.id" class="stash-item">
            <i class="dot" :style="{ background: h.color }" />{{ h.name }} {{ h.n }}
          </span>
        </div>
      </div>

      <div class="top-right">
        <button class="chip-btn" :class="{ on: ui.tour.active }" @click="ui.tour.active ? game.stopTour() : game.startTour()">
          {{ ui.tour.active ? 'Stop tur' : 'Tur rumah' }}
        </button>
        <button class="chip-btn" :class="{ on: ui.lowWalls }" title="Dinding rendah (V)" @click="game.toggleWalls()">Dinding</button>
        <button class="chip-btn" :class="{ on: ui.roofOn && !ui.lowWalls }" :title="ui.roofOn ? 'Sembunyikan atap (B)' : 'Munculkan atap (B)'" @click="game.toggleRoof()">Atap</button>
        <button class="chip-btn" :class="{ on: mapOpen }" @click="mapOpen = !mapOpen">Denah</button>
        <button class="chip-btn icon" :title="ui.muted ? 'Nyalakan suara (M)' : 'Matikan suara (M)'" @click="game.toggleMute()">
          <svg v-if="!ui.muted" viewBox="0 0 24 24" width="18" height="18"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" /></svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="m16 9 5 6m0-6-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        </button>
        <button class="chip-btn icon" title="Kontrol" @click="showHelp = !showHelp">?</button>
      </div>

      <Transition name="slide">
        <Minimap v-if="mapOpen" class="minimap" @go="(id) => game.goRoom(id)" @denah="showDenah = true" />
      </Transition>

      <Transition name="fade">
        <div v-if="showHelp" class="help panel" @click="showHelp = false">
          <p><span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span> jalan, tahan <span class="kbd">Shift</span> buat lari</p>
          <p>Drag layar buat muter kamera, scroll buat zoom</p>
          <p><span class="kbd">E</span> interaksi &nbsp;<span class="kbd">Q</span> duduk / berdiri &nbsp;<span class="kbd">F</span> gendong &nbsp;<span class="kbd">R</span> churu &nbsp;<span class="kbd">C</span> panggil</p>
          <p><span class="kbd">T</span> tur rumah &nbsp;<span class="kbd">V</span> dinding rendah &nbsp;<span class="kbd">B</span> atap &nbsp;<span class="kbd">M</span> suara</p>
          <p class="muted">Klik ruangan di denah buat jalan otomatis ke sana.</p>
        </div>
      </Transition>

      <Transition name="fade">
        <CatCard v-if="ui.nearCat" :cat="ui.nearCat" class="cat-card" />
      </Transition>

      <Transition name="fade">
        <div v-if="ui.tour.active" class="tour panel">
          <span class="tour-step">{{ ui.tour.step }}/{{ ui.tour.total }}</span>
          <p>{{ ui.tour.caption }}</p>
        </div>
      </Transition>

      <Transition name="toast">
        <div v-if="toastVisible && ui.toast" :key="ui.toast.id" class="toast">{{ ui.toast.text }}</div>
      </Transition>

      <PromptBar v-if="!ui.customizer" :prompts="ui.prompts" :touch="isTouch" @trigger="trigger" />
      <Joystick v-if="isTouch && !ui.customizer" @move="setJoy" />
      <Customizer
        v-if="ui.customizer"
        :key="ui.customizer.mode"
        :mode="ui.customizer.mode"
        :look="game.profile.look"
        :name="game.profile.name"
        @change="(l) => game.applyLook(l)"
        @done="onCustomDone"
        @cancel="game.closeCustomizer()"
      />

      <DenahModal v-if="showDenah" @close="showDenah = false" />
      <SeedPicker v-if="ui.seedPicker !== null" @pick="(c) => game.plantSeed(c)" @close="ui.seedPicker = null" />
    </template>
  </div>
</template>

<style scoped>
.app {
  position: fixed;
  inset: 0;
  user-select: none;
  -webkit-user-select: none;
}

/* pas lagi atur karakter, HUD disembunyiin biar karakternya kelihatan utuh */
.customizing .top-left,
.customizing .top-right,
.customizing .minimap,
.customizing .cat-card,
.customizing .help {
  display: none;
}

.scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  outline: none;
}

.top-left {
  position: absolute;
  top: max(14px, env(safe-area-inset-top));
  left: 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  pointer-events: none;
}

.room {
  padding: 8px 14px 9px;
  display: flex;
  flex-direction: column;
  min-width: 150px;
}

.room-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
}

.room strong {
  font-size: 19px;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.online {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 7px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 800;
  max-width: 260px;
}

.online i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4caf6e;
  box-shadow: 0 0 0 3px rgba(76, 175, 110, 0.25);
}

.online.menyambung i {
  background: #e0a526;
  box-shadow: 0 0 0 3px rgba(224, 165, 38, 0.25);
  animation: blink 1s infinite;
}

.online.offline i {
  background: #a39a92;
  box-shadow: none;
}

@keyframes blink {
  50% {
    opacity: 0.3;
  }
}

.online .names {
  width: 100%;
  font-size: 11.5px;
  color: var(--ink-soft);
}

.stash {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 800;
  max-width: 260px;
}

.stash-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.dot.churu {
  background: #e9b949;
  border-radius: 2px;
  transform: rotate(45deg);
}

.top-right {
  position: absolute;
  top: max(14px, env(safe-area-inset-top));
  right: 14px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 60vw;
}

.chip-btn.icon {
  width: 36px;
  padding: 0;
  justify-content: center;
}

.minimap {
  position: absolute;
  top: 64px;
  right: 14px;
}

.help {
  position: absolute;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  z-index: 5;
  width: max-content;
  max-width: calc(100vw - 28px);
}

.help p {
  margin: 6px 0;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.help .muted {
  color: var(--ink-soft);
  font-size: 13px;
}

.cat-card {
  position: absolute;
  left: 14px;
  bottom: 96px;
}

.tour {
  position: absolute;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  max-width: min(520px, calc(100vw - 28px));
  padding: 12px 16px 12px 12px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.tour p {
  margin: 0;
  font-weight: 700;
  font-size: 15px;
  line-height: 1.35;
}

.tour-step {
  flex: none;
  font-size: 12px;
  font-weight: 900;
  background: var(--accent);
  color: #fff;
  border-radius: 8px;
  padding: 4px 7px;
}

.toast {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink);
  color: var(--paper);
  padding: 9px 16px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 14px;
  max-width: calc(100vw - 40px);
  text-align: center;
  pointer-events: none;
}

.touch .cat-card {
  bottom: auto;
  top: 120px;
  transform-origin: top left;
  transform: scale(0.88);
}

.touch .tour {
  bottom: 180px;
}

@media (max-width: 720px) {
  .minimap {
    top: 108px;
  }
  .room strong {
    font-size: 16px;
  }
  .room {
    min-width: 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.swap-enter-active,
.swap-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.swap-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -6px);
}
</style>
