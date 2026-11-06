import * as THREE from 'three'

// Rumah Pak Joko di seberang jalan (z: 8.0 s/d 16.5, x: 0.0 s/d 7.0)
// Lengkap dengan teras keramik, kursi ngopi, kebun depan, atap genteng, dan pagar.

export function createNeighborHouse(scene, physics) {
  const g = new THREE.Group()
  g.name = 'neighborHouse'

  const mat = (color, roughness = 0.8, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, ...extra })

  const wallMat = mat('#f4f0e6', 0.85) // dinding krem hangat
  const trimMat = mat('#383e44', 0.7) // aksen abu tua / andesit
  const roofMat = mat('#924227', 0.75) // genteng terakota klasik
  const ridgeMat = mat('#6b2f1a', 0.8)
  const woodMat = mat('#563721', 0.65) // kayu jati
  const darkWood = mat('#3c2515', 0.7)
  const glassMat = mat('#556b7d', 0.3, { metalness: 0.2, transparent: true, opacity: 0.75 })
  const curtainMat = mat('#eae0cb', 0.9)
  const keramikMat = mat('#eee8db', 0.55) // keramik teras
  const potMat = mat('#a65636', 0.85)
  const leafMat = mat('#4e8035', 0.9)
  const leafDark = mat('#3b6626', 0.95)
  const flowerRed = mat('#d93838', 0.7)
  const flowerYellow = mat('#f0b824', 0.7)
  const flowerWhite = mat('#ffffff', 0.7)

  // 1. Trotoar seberang jalan (z: 7.5 - 9.0)
  const oppWalk = new THREE.Mesh(new THREE.PlaneGeometry(80, 1.5), mat('#d8d3c7', 0.9))
  oppWalk.rotation.x = -Math.PI / 2
  oppWalk.position.set(3.5, 0.005, 8.25)
  oppWalk.receiveShadow = true
  g.add(oppWalk)

  // Curb pembatas trotoar seberang (ada bukaan jalan masuk ke rumah Pak Joko di x: 4.0 - 6.5)
  const curbMat = mat('#b8b3a7', 0.9)
  const curbL = new THREE.Mesh(new THREE.BoxGeometry(40, 0.1, 0.14), curbMat)
  curbL.position.set(-16.5, 0.05, 7.5)
  g.add(curbL)
  const curbR = new THREE.Mesh(new THREE.BoxGeometry(36, 0.1, 0.14), curbMat)
  curbR.position.set(25.0, 0.05, 7.5)
  g.add(curbR)

  // Tanjakan paving halus ke carport Pak Joko
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.3), curbMat)
  ramp.position.set(5.25, 0.025, 7.5)
  ramp.rotation.x = 0.15
  g.add(ramp)

  // 2. Halaman depan & Carport Pak Joko (z: 8.0 - 12.5)
  // Paving carport / jalan masuk (kanan)
  const driveway = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 3.8), mat('#cfc9bc', 0.85))
  driveway.rotation.x = -Math.PI / 2
  driveway.position.set(5.25, 0.01, 10.7)
  driveway.receiveShadow = true
  g.add(driveway)

  // Rumput halaman depan (kiri)
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 3.8), mat('#608f42', 0.95))
  lawn.rotation.x = -Math.PI / 2
  lawn.position.set(1.95, 0.012, 10.7)
  lawn.receiveShadow = true
  g.add(lawn)

  // 3. Teras Rumah Pak Joko (z: 11.3 - 12.7, x: 0.6 - 4.2)
  const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 1.4), keramikMat)
  porchFloor.position.set(2.4, 0.07, 12.0)
  porchFloor.receiveShadow = true
  porchFloor.castShadow = true
  g.add(porchFloor)

  // Anak tangga teras
  const porchStep = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.35), keramikMat)
  porchStep.position.set(2.4, 0.035, 11.15)
  porchStep.receiveShadow = true
  g.add(porchStep)

  // List pinggir teras batu andesit
  const porchTrim = new THREE.Mesh(new THREE.BoxGeometry(3.64, 0.04, 0.08), trimMat)
  porchTrim.position.set(2.4, 0.13, 11.3)
  g.add(porchTrim)

  // 4. Bangunan Utama Rumah Pak Joko (z: 12.7 - 16.3, x: 0.2 - 6.8)
  const houseBody = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.3, 3.6), wallMat)
  houseBody.position.set(3.5, 1.65, 14.5)
  houseBody.castShadow = true
  houseBody.receiveShadow = true
  g.add(houseBody)

  // Dinding pinggir bawah (plint batu alam)
  const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(6.64, 0.35, 3.64), trimMat)
  baseTrim.position.set(3.5, 0.175, 14.5)
  g.add(baseTrim)

  // Pilar teras depan (2 tiang kokoh batu andesit)
  const pilarL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.7, 0.28), trimMat)
  pilarL.position.set(0.75, 1.35, 11.45)
  pilarL.castShadow = true
  g.add(pilarL)
  const pilarR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.7, 0.28), trimMat)
  pilarR.position.set(4.05, 1.35, 11.45)
  pilarR.castShadow = true
  g.add(pilarR)

  // Balok kanopi atas teras
  const canopyBeam = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.22, 1.5), trimMat)
  canopyBeam.position.set(2.4, 2.8, 12.0)
  canopyBeam.castShadow = true
  g.add(canopyBeam)

  // 5. Pintu Depan & Jendela Rumah Pak Joko
  // Kusen pintu kayu jati
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.08), darkWood)
  doorFrame.position.set(2.4, 1.15, 12.68)
  g.add(doorFrame)

  // Daun pintu ganda berukir minimalis
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.08, 2.05, 0.06), woodMat)
  door.position.set(2.4, 1.1, 12.7)
  door.castShadow = true
  g.add(door)

  // Gagang pintu kuningan
  const brassMat = mat('#e0b354', 0.3, { metalness: 0.85 })
  const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.03), brassMat)
  handleL.position.set(2.35, 1.05, 12.65)
  const handleR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.03), brassMat)
  handleR.position.set(2.45, 1.05, 12.65)
  g.add(handleL, handleR)

  // Keset "WELCOME" di depan pintu
  const doormat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.015, 0.45), mat('#8c6843', 0.95))
  doormat.position.set(2.4, 0.145, 11.65)
  g.add(doormat)

  // Jendela depan kiri (di teras)
  const winL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.06), darkWood)
  winL.position.set(1.2, 1.45, 12.68)
  const glassL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.25, 0.04), glassMat)
  glassL.position.set(1.2, 1.45, 12.68)
  const curtainL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.03), curtainMat)
  curtainL.position.set(1.2, 1.45, 12.72)
  g.add(winL, glassL, curtainL)

  // Jendela depan kanan (di atas carport)
  const winR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.06), darkWood)
  winR.position.set(5.25, 1.45, 12.68)
  const glassR = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.25, 0.04), glassMat)
  glassR.position.set(5.25, 1.45, 12.68)
  const curtainR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.03), curtainMat)
  curtainR.position.set(5.25, 1.45, 12.72)
  g.add(winR, glassR, curtainR)

  // Lampu dinding teras (menyala hangat)
  const lampBase = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), mat('#222', 0.7))
  lampBase.position.set(1.8, 1.9, 12.64)
  const lampBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 12),
    new THREE.MeshStandardMaterial({ color: '#ffe6a8', emissive: '#ffa236', emissiveIntensity: 0.8, roughness: 0.2 }),
  )
  lampBulb.position.set(1.8, 1.85, 12.6)
  g.add(lampBase, lampBulb)

  // Papan nomor rumah "NO. 12"
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.02), mat('#2b333a', 0.5))
  plaque.position.set(4.05, 1.85, 11.3)
  g.add(plaque)

  // 6. Atap Limasan Genteng Terakota
  const roofGeo = new THREE.ConeGeometry(5.2, 1.8, 4)
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.rotation.y = Math.PI / 4
  roof.scale.set(1.05, 1.0, 0.65)
  roof.position.set(3.5, 4.15, 14.5)
  roof.castShadow = true
  g.add(roof)

  // Bubungan atap
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.18), ridgeMat)
  ridge.position.set(3.5, 5.0, 14.5)
  g.add(ridge)

  // Listplank kayu di sekeliling bawah atap
  const listplank = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.16, 4.0), darkWood)
  listplank.position.set(3.5, 3.3, 14.5)
  g.add(listplank)

  // 7. Perabot Teras (Kursi, Meja, Cangkir Kopi Pak Joko)
  // Kursi 1 (tempat Pak Joko duduk santai ngopi)
  const chairL = makeTerraceChair(woodMat, 1.8, 0.14, 11.9, Math.PI)
  g.add(chairL)

  // Kursi 2 (buat tamu / pemain mampir)
  const chairR = makeTerraceChair(woodMat, 3.0, 0.14, 11.9, Math.PI)
  g.add(chairR)

  // Meja teras bulat
  const table = new THREE.Group()
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 16), darkWood)
  top.position.y = 0.42
  top.castShadow = true
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.42, 10), darkWood)
  leg.position.y = 0.21
  const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16), darkWood)
  tBase.position.y = 0.015
  table.add(top, leg, tBase)
  table.position.set(2.4, 0.14, 11.9)
  g.add(table)

  // Secangkir kopi hitam panas di atas meja
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.07, 12), mat('#fbfaf7', 0.4))
  cup.position.set(2.4, 0.59, 11.9)
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.005, 12), mat('#1f130b', 0.2))
  coffee.position.set(2.4, 0.62, 11.9)
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.012, 14), mat('#fbfaf7', 0.4))
  saucer.position.set(2.4, 0.56, 11.9)
  g.add(cup, coffee, saucer)

  // 8. Kebun Depan Pak Joko (Pot bunga, cabai, pohon mangga)
  // Pohon Mangga / Jambu di sudut halaman
  const tree = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.4, 8), darkWood)
  trunk.position.y = 0.7
  trunk.castShadow = true
  tree.add(trunk)
  for (let b = 0; b < 3; b++) {
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 - b * 0.12, 1), b % 2 ? leafMat : leafDark)
    foliage.position.set((b - 1) * 0.22, 1.5 + b * 0.35, (b % 2) * 0.2)
    foliage.castShadow = true
    tree.add(foliage)
  }
  // Buah mangga matang kecil bergelantungan
  const fruitMat = mat('#f09d24', 0.5)
  for (const [fx, fy, fz] of [[-0.25, 1.35, 0.3], [0.3, 1.45, -0.2], [-0.1, 1.65, -0.35]]) {
    const mango = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), fruitMat)
    mango.scale.set(0.8, 1.2, 0.8)
    mango.position.set(fx, fy, fz)
    tree.add(mango)
  }
  tree.position.set(0.8, 0.0, 9.8)
  g.add(tree)

  // Pot bunga mawar merah
  g.add(makeFlowerPot(potMat, leafMat, flowerRed, 1.7, 0.0, 9.7))
  // Pot bunga marigold kuning
  g.add(makeFlowerPot(potMat, leafMat, flowerYellow, 2.3, 0.0, 9.6))
  // Pot tanaman cabai (ada cabai merah kecil!)
  g.add(makeChiliPot(potMat, leafDark, flowerRed, 2.9, 0.0, 9.7))
  // Pot melati putih wangi
  g.add(makeFlowerPot(potMat, leafMat, flowerWhite, 3.5, 0.0, 9.8))

  // Kran air & selang taman di dekat pohon
  const spigotMat = mat('#737980', 0.4, { metalness: 0.7 })
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), spigotMat)
  pipe.position.set(0.4, 0.25, 9.6)
  const tap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), spigotMat)
  tap.position.set(0.4, 0.48, 9.58)
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16), mat('#3d7a42', 0.8))
  hose.rotation.x = Math.PI / 2
  hose.position.set(0.4, 0.04, 9.8)
  g.add(pipe, tap, hose)

  // 9. Pagar Depan & Gapura Masuk Rumah Pak Joko
  // Pilar batu andesit pagar
  const pilarF1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.32), trimMat)
  pilarF1.position.set(0.16, 0.55, 9.0)
  const pilarF2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.32), trimMat)
  pilarF2.position.set(3.84, 0.55, 9.0)
  const pilarF3 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.32), trimMat)
  pilarF3.position.set(6.64, 0.55, 9.0)
  g.add(pilarF1, pilarF2, pilarF3)

  // Bilah pagar kayu horizontal (kiri)
  const fenceL = makeFenceSection(darkWood, 0.35, 3.65, 9.0)
  g.add(fenceL)
  // Bilah pagar kayu horizontal (kanan)
  const fenceR = makeFenceSection(darkWood, 6.0, 6.5, 9.0)
  g.add(fenceR)

  // Pagar tanaman hijau samping kiri dan kanan lot
  const hedgeMat = mat('#4d7338', 0.95)
  const hedgeL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 7.5), hedgeMat)
  hedgeL.position.set(-0.1, 0.7, 12.75)
  hedgeL.castShadow = true
  g.add(hedgeL)
  const hedgeR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 7.5), hedgeMat)
  hedgeR.position.set(6.9, 0.7, 12.75)
  hedgeR.castShadow = true
  g.add(hedgeR)

  scene.add(g)

  // 10. Fisika / Colliders Penghalang
  // Dinding rumah utama Pak Joko
  physics.add(0.2, 6.8, 12.6, 16.5, 'wall')
  // Pagar kiri & kanan lot
  physics.add(-0.4, 0.1, 9.0, 16.5, 'fence')
  physics.add(6.7, 7.2, 9.0, 16.5, 'fence')
  // Pagar depan (menyisakan bukaan jalan masuk gerbang di x: 3.8 - 6.0)
  physics.add(0.0, 3.84, 8.85, 9.15, 'fence')
  physics.add(6.0, 6.8, 8.85, 9.15, 'fence')
  // Batas belakang lot rumah Pak Joko
  physics.add(-2.0, 9.0, 16.5, 25.0, 'bound')

  // Tempat duduk di teras Pak Joko (bisa diduduki pemain / Pak Joko)
  const terraceSeat = {
    label: 'Duduk di teras Pak Joko',
    x: 3.0,
    z: 11.9,
    y: 0.56,
    facing: Math.PI,
    pakJokoSeat: { x: 1.8, z: 11.9, y: 0.45, facing: Math.PI },
  }

  // Titik-titik aktivitas Pak Joko
  const spots = {
    terraceChair: new THREE.Vector3(1.8, 0.21, 11.9),
    terraceStanding: new THREE.Vector3(2.4, 0.14, 11.6),
    gardenPots: [
      new THREE.Vector3(1.7, 0.02, 10.2),
      new THREE.Vector3(2.4, 0.02, 10.1),
      new THREE.Vector3(3.0, 0.02, 10.2),
      new THREE.Vector3(0.9, 0.02, 10.3),
    ],
    gateEntrance: new THREE.Vector3(4.8, 0.02, 9.2),
    sidewalkFront: new THREE.Vector3(4.8, 0.02, 8.2),
    workExit: new THREE.Vector3(26.0, 0.02, 4.5),
    jogWaypoints: [
      new THREE.Vector3(4.8, 0.02, 4.5),
      new THREE.Vector3(22.0, 0.02, 4.2),
      new THREE.Vector3(-14.0, 0.02, 4.8),
      new THREE.Vector3(3.5, 0.02, 4.5),
    ],
  }

  return { group: g, terraceSeat, spots }
}

function makeTerraceChair(woodMat, x, y, z, facing = 0) {
  const chair = new THREE.Group()
  // Kaki kursi
  for (const [kx, kz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.4, 8), woodMat)
    k.position.set(kx, 0.2, kz)
    k.castShadow = true
    chair.add(k)
  }
  // Dudukan
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.48), woodMat)
  seat.position.y = 0.4
  seat.castShadow = true
  chair.add(seat)
  // Sandaran punggung
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.04), woodMat)
  back.position.set(0, 0.61, -0.22)
  back.castShadow = true
  chair.add(back)
  // Sandaran tangan
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.44), woodMat)
    arm.position.set(s * 0.24, 0.52, 0)
    chair.add(arm)
  }
  chair.position.set(x, y, z)
  chair.rotation.y = facing
  return chair
}

function makeFlowerPot(potMat, leafMat, flowerMat, x, y, z) {
  const pot = new THREE.Group()
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.28, 12), potMat)
  vase.position.y = 0.14
  vase.castShadow = true
  pot.add(vase)
  const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), leafMat)
  bush.position.y = 0.32
  bush.castShadow = true
  pot.add(bush)
  for (let i = 0; i < 4; i++) {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), flowerMat)
    const ang = (i * Math.PI) / 2
    fl.position.set(Math.cos(ang) * 0.12, 0.36 + (i % 2) * 0.05, Math.sin(ang) * 0.12)
    pot.add(fl)
  }
  pot.position.set(x, y, z)
  return pot
}

function makeChiliPot(potMat, leafMat, chiliMat, x, y, z) {
  const pot = new THREE.Group()
  const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 10), potMat)
  bag.position.y = 0.12
  bag.castShadow = true
  pot.add(bag)
  const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), leafMat)
  bush.position.y = 0.32
  bush.castShadow = true
  pot.add(bush)
  for (let i = 0; i < 5; i++) {
    const chili = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 6), chiliMat)
    chili.rotation.x = Math.PI - 0.2
    chili.position.set((Math.random() - 0.5) * 0.22, 0.28 + Math.random() * 0.1, (Math.random() - 0.5) * 0.22)
    pot.add(chili)
  }
  pot.position.set(x, y, z)
  return pot
}

function makeFenceSection(woodMat, x1, x2, z) {
  const g = new THREE.Group()
  const len = x2 - x1
  const mid = (x1 + x2) / 2
  for (const y of [0.35, 0.65, 0.95]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.04), woodMat)
    rail.position.set(mid, y, z)
    rail.castShadow = true
    g.add(rail)
  }
  return g
}
