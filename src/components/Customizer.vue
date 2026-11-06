<script setup>
import { reactive, ref, computed } from 'vue'
import { LOOK_OPTIONS, PRESETS } from '../game/player'

const props = defineProps({
  mode: { type: String, default: 'wardrobe' }, // 'create' | 'wardrobe'
  look: { type: Object, required: true },
  name: { type: String, default: '' },
})
const emit = defineEmits(['change', 'done', 'cancel'])

const L = reactive({ ...props.look })
const nama = ref(props.name)
const tab = ref(props.mode === 'create' ? 'dasar' : 'atasan')
const original = { ...props.look }

const tabs = computed(() => [
  ...(props.mode === 'create' ? [{ id: 'dasar', label: 'Dasar' }] : []),
  { id: 'rambut', label: 'Rambut' },
  { id: 'atasan', label: 'Atasan' },
  { id: 'bawahan', label: 'Bawahan' },
])

const set = (key, value) => {
  L[key] = value
  emit('change', { ...L })
}

const setGender = (g) => {
  if (L.gender === g) return
  Object.assign(L, { ...PRESETS[g], skin: L.skin })
  emit('change', { ...L })
}

const nameError = computed(() => (props.mode === 'create' && !nama.value.trim() ? 'Isi nama dulu ya' : ''))

const done = () => {
  if (nameError.value) return
  emit('done', { name: nama.value.trim(), look: { ...L } })
}

const cancel = () => {
  emit('change', original)
  emit('cancel')
}
</script>

<template>
  <div class="wrap">
    <div class="sheet panel">
      <header>
        <h3>{{ mode === 'create' ? 'Bikin karakter' : 'Lemari baju' }}</h3>
        <p>{{ mode === 'create' ? 'Ini yang bakal dilihat orang lain di rumah.' : 'Ganti baju, langsung kelihatan.' }}</p>
      </header>

      <nav class="tabs">
        <button v-for="t in tabs" :key="t.id" :class="{ on: tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
      </nav>

      <section v-if="tab === 'dasar'">
        <label class="field">
          <span>Nama</span>
          <input v-model="nama" maxlength="16" placeholder="Nama kamu" autocomplete="off" @keydown.stop />
        </label>
        <p v-if="nameError" class="err">{{ nameError }}</p>
        <div class="row">
          <span class="lbl">Karakter</span>
          <div class="chips">
            <button :class="{ on: L.gender === 'cowok' }" @click="setGender('cowok')">Cowok</button>
            <button :class="{ on: L.gender === 'cewek' }" @click="setGender('cewek')">Cewek</button>
          </div>
        </div>
        <div class="row">
          <span class="lbl">Kulit</span>
          <div class="swatches">
            <button v-for="c in LOOK_OPTIONS.skin" :key="c" :class="{ on: L.skin === c }" :style="{ background: c }" @click="set('skin', c)" />
          </div>
        </div>
      </section>

      <section v-else-if="tab === 'rambut'">
        <div class="chips wrap-chips">
          <button v-for="o in LOOK_OPTIONS.hair" :key="o.id" :class="{ on: L.hair === o.id }" @click="set('hair', o.id)">{{ o.label }}</button>
        </div>
        <div class="row">
          <span class="lbl">{{ L.hair === 'hijab' ? 'Warna hijab' : 'Warna' }}</span>
          <div class="swatches">
            <template v-if="L.hair === 'hijab'">
              <button v-for="c in LOOK_OPTIONS.hijabColor" :key="c" :class="{ on: L.hijabColor === c }" :style="{ background: c }" @click="set('hijabColor', c)" />
            </template>
            <template v-else>
              <button v-for="c in LOOK_OPTIONS.hairColor" :key="c" :class="{ on: L.hairColor === c }" :style="{ background: c }" @click="set('hairColor', c)" />
            </template>
          </div>
        </div>
      </section>

      <section v-else-if="tab === 'atasan'">
        <div class="chips wrap-chips">
          <button v-for="o in LOOK_OPTIONS.top" :key="o.id" :class="{ on: L.top === o.id }" @click="set('top', o.id)">{{ o.label }}</button>
        </div>
        <div class="row">
          <span class="lbl">Warna</span>
          <div class="swatches">
            <button v-for="c in LOOK_OPTIONS.topColor" :key="c" :class="{ on: L.topColor === c }" :style="{ background: c }" @click="set('topColor', c)" />
          </div>
        </div>
      </section>

      <section v-else>
        <div class="chips wrap-chips">
          <button v-for="o in LOOK_OPTIONS.bottom" :key="o.id" :class="{ on: L.bottom === o.id }" @click="set('bottom', o.id)">{{ o.label }}</button>
        </div>
        <div class="row">
          <span class="lbl">Warna</span>
          <div class="swatches">
            <button v-for="c in LOOK_OPTIONS.bottomColor" :key="c" :class="{ on: L.bottomColor === c }" :style="{ background: c }" @click="set('bottomColor', c)" />
          </div>
        </div>
      </section>

      <footer>
        <button v-if="mode === 'wardrobe'" class="ghost" @click="cancel">Batal</button>
        <button class="primary" @click="done">{{ mode === 'create' ? 'Masuk rumah' : 'Pakai' }}</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 16px;
  z-index: 25;
  pointer-events: none;
}

.sheet {
  pointer-events: auto;
  width: 330px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 16px;
}

h3 {
  margin: 0;
  font-size: 21px;
  font-weight: 900;
}

header p {
  margin: 2px 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 12px;
  background: var(--paper-2);
  margin-bottom: 14px;
}

.tabs button {
  flex: 1;
  height: 32px;
  border-radius: 9px;
  font-weight: 800;
  font-size: 13px;
  color: var(--ink-soft);
}

.tabs button.on {
  background: #fffaf1;
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(59, 47, 42, 0.15);
}

section {
  min-height: 150px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 800;
  color: var(--ink-soft);
}

.field input {
  height: 40px;
  border-radius: 10px;
  border: 1.5px solid var(--line);
  background: #fffaf1;
  padding: 0 12px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  outline: none;
}

.field input:focus {
  border-color: var(--accent);
}

.err {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.lbl {
  width: 74px;
  flex: none;
  font-size: 12px;
  font-weight: 800;
  color: var(--ink-soft);
}

.chips {
  display: flex;
  gap: 6px;
}

.wrap-chips {
  flex-wrap: wrap;
}

.chips button {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  background: var(--paper-2);
  font-weight: 800;
  font-size: 13px;
  transition: transform 0.12s;
}

.chips button:active,
.swatches button:active {
  transform: scale(0.92);
}

.chips button.on {
  background: var(--ink);
  color: var(--paper);
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.swatches button {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px rgba(59, 47, 42, 0.18);
  transition: transform 0.12s;
}

.swatches button.on {
  box-shadow: 0 0 0 2px #fffaf1, 0 0 0 4px var(--ink);
}

footer {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

footer button {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  font-weight: 900;
  font-size: 15px;
}

.primary {
  background: var(--ink);
  color: var(--paper);
}

.ghost {
  background: var(--paper-2);
}

@media (max-width: 720px) {
  .wrap {
    align-items: flex-end;
    left: 0;
    padding: 10px;
  }
  .sheet {
    width: 100%;
    max-height: 52vh;
  }
}
</style>
