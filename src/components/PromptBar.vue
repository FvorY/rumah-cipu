<script setup>
import { computed } from 'vue'

const props = defineProps({
  prompts: { type: Array, default: () => [] },
  touch: Boolean,
})
const emit = defineEmits(['trigger'])

const main = computed(() => props.prompts.filter((p) => !p.secondary))
const extra = computed(() => props.prompts.filter((p) => p.secondary))
const formatKey = (k) => (k === 'SPACE' ? 'Spasi' : k)
</script>

<template>
  <!-- desktop: baris petunjuk tombol di bawah -->
  <div v-if="!touch" class="bar">
    <TransitionGroup name="pop">
      <button
        v-for="p in main"
        :key="p.key + p.label"
        class="prompt panel"
        :class="{ disabled: p.disabled }"
        @click="!p.disabled && emit('trigger', p.key)"
      >
        <span v-if="!p.disabled" class="kbd">{{ formatKey(p.key) }}</span>
        {{ p.label }}
      </button>
    </TransitionGroup>
    <button
      v-for="p in extra"
      :key="p.key"
      class="prompt ghost"
      :class="{ disabled: p.disabled }"
      @click="!p.disabled && emit('trigger', p.key)"
    >
      <span class="kbd">{{ formatKey(p.key) }}</span>{{ p.label }}
    </button>
  </div>

  <!-- HP: tombol bulat di kanan bawah -->
  <div v-else class="pad">
    <button
      v-for="(p, i) in main"
      :key="p.key + p.label"
      class="round"
      :class="{ big: i === 0, disabled: p.disabled }"
      @pointerdown.prevent="!p.disabled && emit('trigger', p.key)"
    >
      {{ p.label }}
    </button>
    <button
      v-for="p in extra"
      :key="p.key"
      class="round small"
      :class="{ 'jump-btn': p.key === 'SPACE', disabled: p.disabled }"
      @pointerdown.prevent="!p.disabled && emit('trigger', p.key)"
    >
      {{ p.label }}
    </button>
  </div>
</template>

<style scoped>
.bar {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  width: max-content;
  max-width: calc(100vw - 300px);
}

.prompt {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 14px 0 9px;
  font-weight: 800;
  font-size: 15px;
  transition: transform 0.12s;
}

.prompt:active {
  transform: scale(0.95);
}

.prompt.disabled {
  padding-left: 14px;
  color: var(--ink-soft);
  cursor: default;
}

.prompt.ghost {
  height: 34px;
  font-size: 13px;
  border-radius: 10px;
  background: rgba(59, 47, 42, 0.55);
  color: #fff7ea;
  backdrop-filter: blur(4px);
}

.prompt.ghost .kbd {
  background: transparent;
  border-color: #fff7ea;
  color: #fff7ea;
}

.pad {
  position: absolute;
  right: 16px;
  bottom: max(20px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 10px;
}

.round {
  min-width: 64px;
  max-width: 150px;
  min-height: 46px;
  padding: 8px 14px;
  border-radius: 23px;
  background: var(--panel);
  box-shadow: var(--shadow);
  font-weight: 800;
  font-size: 13px;
  line-height: 1.15;
  touch-action: none;
}

.round:active {
  transform: scale(0.95);
}

.round.big {
  min-height: 64px;
  border-radius: 32px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
}

.round.small {
  min-height: 36px;
  font-size: 12px;
  background: rgba(59, 47, 42, 0.6);
  color: #fff7ea;
}

.round.small.jump-btn {
  min-height: 44px;
  border-radius: 22px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 900;
  background: var(--panel);
  color: var(--ink);
  box-shadow: var(--shadow);
  border: 1.5px solid rgba(224, 165, 38, 0.45);
}

.round.small.jump-btn:active {
  transform: scale(0.92) translateY(2px);
  background: #fdf6ec;
}

.round.disabled {
  opacity: 0.55;
  background: var(--panel);
  color: var(--ink-soft);
  transform: none;
}

.pop-enter-active {
  transition: opacity 0.18s, transform 0.18s;
}
.pop-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.pop-leave-active {
  display: none;
}

@media (max-width: 900px) {
  .bar {
    max-width: calc(100vw - 28px);
  }
}
</style>
