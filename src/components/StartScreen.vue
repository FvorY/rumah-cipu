<script setup>
import { CATS } from '../game/cat'

defineEmits(['start'])

const swatch = {
  cipu: 'linear-gradient(135deg, #1d1b1a 0 55%, #d8853b 55% 75%, #f3eee5 75%)',
  gimbul: 'linear-gradient(135deg, #e99a4f 0 60%, #f3eee5 60%)',
  cipi: 'linear-gradient(135deg, #d8853b 0 40%, #1d1b1a 40% 65%, #f3eee5 65%)',
  mujaer: 'repeating-linear-gradient(90deg, #8f969b 0 5px, #4e555b 5px 9px)',
}
</script>

<template>
  <div class="start">
    <div class="card panel">
      <p class="eyebrow">Denah 15 × 7 · lantai 1</p>
      <h1>Rumah Cipu</h1>
      <p class="lead">
        Jalan-jalan keliling rumah, main sama empat kucing, terus nanam cabai di halaman belakang.
      </p>

      <ul class="cats">
        <li v-for="c in CATS" :key="c.id">
          <i :style="{ background: swatch[c.id] }" />
          <div>
            <strong>{{ c.name }}</strong>
            <span>{{ c.gender }}</span>
          </div>
        </li>
      </ul>

      <button class="go" @click="$emit('start')">Masuk rumah</button>

      <p class="controls">
        <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span> jalan ·
        <span class="kbd">E</span> interaksi · drag buat muter kamera
      </p>
    </div>
    <a class="credit" href="https://github.com/FvorY" target="_blank" rel="noopener">dibikin Ferdy</a>
  </div>
</template>

<style scoped>
.start {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: linear-gradient(180deg, rgba(213, 231, 236, 0) 30%, rgba(59, 47, 42, 0.25));
}

.card {
  width: min(420px, 100%);
  padding: 26px 26px 20px;
  border-radius: 22px;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

h1 {
  margin: 4px 0 8px;
  font-size: 44px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.lead {
  margin: 0 0 18px;
  font-size: 16px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--ink-soft);
}

.cats {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cats li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cats i {
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 46% 46%;
  flex: none;
  box-shadow: inset 0 0 0 2px rgba(59, 47, 42, 0.15);
}

.cats strong {
  display: block;
  font-weight: 900;
  font-size: 15px;
}

.cats span {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-soft);
}

.go {
  width: 100%;
  height: 50px;
  border-radius: 14px;
  background: var(--ink);
  color: var(--paper);
  font-weight: 900;
  font-size: 17px;
  transition: transform 0.12s, background 0.2s;
}

.go:hover {
  background: #2a211d;
}

.go:active {
  transform: scale(0.97);
}

.controls {
  margin: 14px 0 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ink-soft);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.controls .kbd {
  min-width: 19px;
  height: 19px;
  font-size: 10px;
}

.credit {
  position: absolute;
  bottom: 14px;
  right: 16px;
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
}
</style>
