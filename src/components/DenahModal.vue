<script setup>
import { ref, computed } from 'vue'
import { denahSVG, downloadPNG, downloadSVG, printPDF } from '../game/denah'

const emit = defineEmits(['close'])
const svg = computed(() => denahSVG())
const busy = ref(false)
const note = ref('')

const png = async () => {
  busy.value = true
  try {
    await downloadPNG()
  } finally {
    busy.value = false
  }
}

const pdf = () => {
  if (!printPDF()) note.value = 'Pop-up diblok browser. Izinkan pop-up dulu, atau pakai PNG / SVG.'
}
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="sheet panel">
      <header>
        <div>
          <h3>Denah Lantai 1</h3>
          <p>Skala 1:100, ukuran kertas A4. Ikut berubah kalau isi rumah di game diubah.</p>
        </div>
        <button class="x" aria-label="Tutup" @click="emit('close')">✕</button>
      </header>
      <div class="paper" v-html="svg" />
      <div class="actions">
        <button class="primary" :disabled="busy" @click="png">{{ busy ? 'Menyiapkan...' : 'Unduh PNG' }}</button>
        <button @click="downloadSVG">Unduh SVG</button>
        <button @click="pdf">Cetak / PDF</button>
      </div>
      <p v-if="note" class="note">{{ note }}</p>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(59, 47, 42, 0.35);
}

.sheet {
  width: min(560px, 100%);
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  padding: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
}

header p {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}

.x {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 10px;
  font-weight: 900;
  background: var(--paper-2);
}

.paper {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 10px;
  background: #fff;
  box-shadow: inset 0 0 0 1px var(--line);
}

.paper :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.actions button {
  flex: 1;
  height: 42px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 14px;
  background: var(--paper-2);
  transition: transform 0.12s;
}

.actions button:active {
  transform: scale(0.95);
}

.actions .primary {
  background: var(--ink);
  color: var(--paper);
}

.note {
  margin: 8px 0 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--accent);
}
</style>
