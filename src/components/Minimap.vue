<script setup>
import { ref, computed } from 'vue'
import { ui } from '../store'
import { ROOMS, WALLS, WALL_T, roomAt } from '../game/plan'

const emit = defineEmits(['go', 'denah'])
const hover = ref(null)

// svg: x = x denah, y = 16 - z (depan di bawah, sama kayak gambar denah)
const Y = (z) => 16 - z

const FILL = {
  grass: '#cfe0b8',
  concrete: '#ddd9d2',
  terracotta: '#ecc9b5',
  wood: '#ecd9bf',
  woodLight: '#f2e4cf',
  ceramic: '#f6f0e5',
  bath: '#d8ebe8',
  kitchen: '#f1e4cc',
}

const rects = computed(() =>
  ROOMS.flatMap((r) => r.rects.map(([x0, z0, x1, z1], i) => ({ key: r.id + i, room: r, x: x0, y: Y(z1), w: x1 - x0, h: z1 - z0 }))),
)

// dinding digambar per segmen, celah pintu/jendela dibiarkan
const walls = computed(() => {
  const out = []
  for (const w of WALLS) {
    if (w.kind === 'fence') continue
    const horizontal = w.a[1] === w.b[1]
    const a = horizontal ? Math.min(w.a[0], w.b[0]) : Math.min(w.a[1], w.b[1])
    const b = horizontal ? Math.max(w.a[0], w.b[0]) : Math.max(w.a[1], w.b[1])
    let cur = a - WALL_T / 2
    const ops = [...(w.openings || [])].sort((p, q) => p.from - q.from)
    const seg = (s0, s1, thin) => {
      if (horizontal) out.push({ x1: s0, y1: Y(w.a[1]), x2: s1, y2: Y(w.a[1]), thin })
      else out.push({ x1: w.a[0], y1: Y(s0), x2: w.a[0], y2: Y(s1), thin })
    }
    for (const o of ops) {
      seg(cur, o.from)
      if (o.type === 'window') seg(o.from, o.to, true)
      cur = o.to
    }
    seg(cur, b + WALL_T / 2)
  }
  return out
})

const labels = computed(() =>
  ROOMS.map((r) => {
    const [x0, z0, x1, z1] = r.rects[r.rects.length > 1 && r.id === 'dapur' ? 1 : 0]
    const short = {
      utama: 'K. Utama',
      kamar2: 'K. Tidur',
      kamar3: 'K. Tidur',
      km1: 'KM',
      km2: 'KM',
      keluarga: 'R. Keluarga',
      tamu: 'R. Tamu',
      kucing: 'R. Kucing',
      taman: 'Taman',
      depan: 'Halaman',
    }
    return { id: r.id, text: short[r.id] || r.name, x: (x0 + x1) / 2, y: Y((z0 + z1) / 2) }
  }),
)

const CAT_COLOR = { cipu: '#1d1b1a', gimbul: '#e99a4f', cipi: '#f3eee5', mujaer: '#8f969b' }
const CAT_RING = { cipu: '#d8853b', gimbul: '#f3eee5', cipi: '#d8853b', mujaer: '#4e555b' }

const playerTransform = computed(() => {
  const p = ui.map.player
  const deg = ((Math.PI - p.r) * 180) / Math.PI
  return `translate(${p.x} ${Y(p.z)}) rotate(${deg})`
})

const currentRoom = computed(() => roomAt(ui.map.player.x, ui.map.player.z)?.id)
</script>

<template>
  <div class="map panel">
    <svg viewBox="-0.4 -0.4 7.8 18.2" preserveAspectRatio="xMidYMid meet">
      <rect x="-0.4" y="16" width="7.8" height="1.8" fill="#e7e2d8" />
      <g
        v-for="r in rects"
        :key="r.key"
        class="room"
        :class="{ hover: hover === r.room.id, here: currentRoom === r.room.id }"
        @mouseenter="hover = r.room.id"
        @mouseleave="hover = null"
        @click="emit('go', r.room.id)"
      >
        <rect :x="r.x" :y="r.y" :width="r.w" :height="r.h" :fill="FILL[r.room.floor]" />
      </g>
      <line
        v-for="(w, i) in walls"
        :key="i"
        :x1="w.x1"
        :y1="w.y1"
        :x2="w.x2"
        :y2="w.y2"
        :stroke-width="w.thin ? 0.05 : WALL_T"
        :stroke="w.thin ? '#6aa6c9' : '#3b2f2a'"
        stroke-linecap="square"
      />
      <text v-for="l in labels" :key="l.id" :x="l.x" :y="l.y" class="label">{{ l.text }}</text>
      <circle
        v-for="c in ui.map.cats"
        :key="c.id"
        :cx="c.x"
        :cy="16 - c.z"
        r="0.16"
        :fill="CAT_COLOR[c.id]"
        :stroke="CAT_RING[c.id]"
        stroke-width="0.07"
      />
      <g :transform="playerTransform">
        <circle r="0.24" fill="#d8704a" stroke="#fff" stroke-width="0.07" />
        <path d="M0 -0.42 L0.16 -0.2 L-0.16 -0.2 Z" fill="#d8704a" />
      </g>
    </svg>
    <button class="dl" @click="emit('denah')">
      <svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
      <span>Download denah</span>
    </button>
  </div>
</template>

<style scoped>
.map {
  width: 132px;
  padding: 8px 8px 6px;
}

svg {
  width: 100%;
  display: block;
  aspect-ratio: 7.8 / 18.2;
}

.room {
  cursor: pointer;
}

.room rect {
  transition: filter 0.15s;
}

.room.hover rect {
  filter: brightness(0.9);
}

.room.here rect {
  filter: saturate(1.6) brightness(0.97);
}

.label {
  font-size: 0.42px;
  font-weight: 800;
  fill: #7a6a5f;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
}

.dl {
  margin-top: 6px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 4px 7px;
  border-radius: 9px;
  background: var(--ink);
  color: var(--paper);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
  transition: transform 0.12s;
}

.dl svg {
  flex: none;
}

.dl:active {
  transform: scale(0.95);
}

@media (max-width: 720px) {
  .map {
    width: 104px;
  }
  .dl {
    font-size: 10px;
  }
}
</style>
