<script setup>
import { ref } from 'vue'

const emit = defineEmits(['move'])
const knob = ref({ x: 0, y: 0 })
const active = ref(false)
const R = 46
let origin = null
let id = null

const down = (e) => {
  id = e.pointerId
  e.currentTarget.setPointerCapture(id)
  const r = e.currentTarget.getBoundingClientRect()
  origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  active.value = true
  move(e)
}

const move = (e) => {
  if (!active.value || e.pointerId !== id) return
  let dx = e.clientX - origin.x
  let dy = e.clientY - origin.y
  const d = Math.hypot(dx, dy)
  if (d > R) {
    dx = (dx / d) * R
    dy = (dy / d) * R
  }
  knob.value = { x: dx, y: dy }
  emit('move', { x: dx / R, y: -dy / R })
}

const up = (e) => {
  if (e.pointerId !== id) return
  active.value = false
  knob.value = { x: 0, y: 0 }
  emit('move', { x: 0, y: 0 })
}
</script>

<template>
  <div class="joy" :class="{ active }" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
    <div class="knob" :style="{ transform: `translate(${knob.x}px, ${knob.y}px)` }" />
  </div>
</template>

<style scoped>
.joy {
  position: absolute;
  left: 22px;
  bottom: max(26px, env(safe-area-inset-bottom));
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: rgba(250, 245, 236, 0.35);
  border: 2px solid rgba(250, 245, 236, 0.7);
  display: grid;
  place-items: center;
  touch-action: none;
}

.knob {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--panel);
  box-shadow: var(--shadow);
  transition: transform 0.08s;
}

.joy.active .knob {
  transition: none;
}
</style>
