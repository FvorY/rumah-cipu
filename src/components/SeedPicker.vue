<script setup>
import { CROPS } from '../game/garden'

const emit = defineEmits(['pick', 'close'])

const minutes = (c) => Math.round((c.stageTime * 3) / 60)
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="sheet panel">
      <h3>Mau nanam apa?</h3>
      <p class="sub">Siram tiap kali tanahnya kering. Tetap tumbuh walau game ditutup.</p>
      <div class="grid">
        <button v-for="(c, id) in CROPS" :key="id" class="seed" @click="emit('pick', id)">
          <svg viewBox="0 0 48 48" width="44" height="44">
            <template v-if="id === 'cabai'">
              <path d="M30 10c-2 3-3 5-2 8" stroke="#4e8f3a" stroke-width="3" fill="none" stroke-linecap="round" />
              <path d="M27 17c6 1 6 8 2 14s-12 10-17 9c5-3 9-8 10-13s0-9 5-10z" :fill="c.color" />
            </template>
            <template v-else-if="id === 'tomat'">
              <circle cx="24" cy="27" r="13" :fill="c.color" />
              <path d="M24 13l3 5 5-2-3 5 5 2-6 1-4 4-4-4-6-1 5-2-3-5 5 2z" fill="#4e8f3a" />
            </template>
            <template v-else-if="id === 'sawi'">
              <path d="M24 42c-10-4-14-16-8-28 4 6 6 14 8 28z" fill="#6aa83f" />
              <path d="M24 42c10-4 14-16 8-28-4 6-6 14-8 28z" fill="#83b84a" />
              <path d="M24 42c-3-10-3-22 0-32 3 10 3 22 0 32z" fill="#9ccc65" />
              <path d="M24 42V16" stroke="#e5f2d0" stroke-width="2" />
            </template>
            <template v-else>
              <path d="M19 15c-4 6-6 20 4 27 7 4 12-3 10-9s-6-12-6-18z" :fill="c.color" />
              <path d="M18 9c2 2 4 3 5 7 2-2 5-3 8-3-3 2-4 4-4 6-3-1-6-1-9 0 1-3 1-6 0-10z" fill="#4e8f3a" />
            </template>
          </svg>
          <strong>{{ c.name }}</strong>
          <span>± {{ minutes(c) }} menit</span>
        </button>
      </div>
      <button class="cancel" @click="emit('close')">Nggak jadi</button>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(59, 47, 42, 0.25);
  padding: 16px;
  z-index: 20;
}

.sheet {
  width: min(400px, 100%);
  padding: 18px;
}

h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
}

.sub {
  margin: 4px 0 14px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-soft);
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.seed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 14px;
  background: var(--paper-2);
  transition: transform 0.12s, background 0.15s;
}

.seed:hover {
  background: #e8d9bf;
}

.seed:active {
  transform: scale(0.95);
}

.seed strong {
  font-size: 14px;
  font-weight: 900;
}

.seed span {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-soft);
}

.cancel {
  margin-top: 12px;
  width: 100%;
  height: 40px;
  border-radius: 12px;
  font-weight: 800;
  color: var(--ink-soft);
}

@media (max-width: 380px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
