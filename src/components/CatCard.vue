<script setup>
defineProps({ cat: { type: Object, required: true } })
</script>

<template>
  <div class="card panel">
    <div class="head">
      <strong>{{ cat.name }}</strong>
      <span class="sex" :class="cat.gender">{{ cat.gender }}</span>
      <span class="state">{{ cat.state }}</span>
    </div>
    <p class="desc">{{ cat.desc }}</p>
    <div class="bar">
      <span>Kenyang</span>
      <div class="track"><div class="fill food" :style="{ width: 100 - cat.hunger + '%' }" /></div>
    </div>
    <div class="bar">
      <span>Sayang</span>
      <div class="track"><div class="fill love" :style="{ width: cat.affection + '%' }" /></div>
    </div>
  </div>
</template>

<style scoped>
.card {
  width: 250px;
  padding: 12px 14px;
}

.head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.head strong {
  font-size: 18px;
  font-weight: 900;
}

.sex {
  font-size: 11px;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 6px;
  background: #f3d9e0;
  color: #9b3d57;
}

.sex.jantan {
  background: #d6e4f0;
  color: #2f5d86;
}

.state {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-soft);
}

.desc {
  margin: 4px 0 10px;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--ink-soft);
}

.bar {
  display: grid;
  grid-template-columns: 58px 1fr;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 800;
  margin-top: 5px;
}

.track {
  height: 8px;
  border-radius: 99px;
  background: var(--paper-2);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s;
}

.food {
  background: #e9b949;
}

.love {
  background: #e6687a;
}
</style>
