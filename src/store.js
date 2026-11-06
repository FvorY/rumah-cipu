import { reactive } from 'vue'

// jembatan state antara engine three.js dan UI Vue
export const ui = reactive({
  started: false,
  room: '',
  prompts: [],
  toast: null,
  nearCat: null,
  cats: [],
  harvested: {},
  churu: 0,
  seedPicker: null,
  tour: { active: false, caption: '', step: 0, total: 0 },
  lowWalls: false,
  roofOn: true,
  muted: false,
  map: { player: { x: 0, z: 0, r: 0 }, cats: [] },
  carrying: null,
})
