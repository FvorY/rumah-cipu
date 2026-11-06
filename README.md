# Rumah Cipu

Game kecil buat keliling rumah versi 3D, dibikin dari denah rumah 15x7 lantai 1. Di dalamnya ada empat kucing yang hidup sendiri-sendiri, Honda Mobilio di carport, sama halaman belakang yang bisa dipakai nanam sayur. Rumahnya pakai atap perisai genteng abu + dak beton di depan, pagar batu alam dengan bilah kayu, dan kanopi carport polikarbonat. Atapnya otomatis menghilang begitu masuk rumah.

Main di sini: https://fvory.github.io/rumah-cipu/

Pakai Vue 3 + Three.js. Semua model (rumah, karakter, kucing, mobil, tanaman) dibentuk dari primitive langsung di kode, suaranya juga disintesis pakai WebAudio, jadi nggak ada file aset yang perlu di-load.

## Kucing-kucingnya

| Nama   |        | Corak                         | Kelakuan                                        |
| ------ | ------ | ----------------------------- | ----------------------------------------------- |
| Cipu   | betina | belang telon, dominan hitam   | cuek, sering tidur di kasur kamar utama         |
| Gimbul | betina | oren putih                    | bulet, paling cepat dateng kalau mangkuk diisi  |
| Cipi   | betina | oren, hitam, putih            | lincah, suka lari-lari nggak jelas              |
| Mujaer | jantan | abu-abu belang kayak mujaer   | suka ngintil, nongkrong di kap mobil            |

Kucing bisa dielus, digendong, dikasih churu (ambil di kulkas), dipanggil, atau dikagetin pakai klakson mobil. Mereka juga bisa loncat ke kasur, sofa, cat tree, sama kap Mobilio.

## Kontrol

- `WASD` / panah: jalan, tahan `Shift` buat lari
- drag: muter kamera, scroll: zoom
- `E` interaksi, `F` gendong, `R` kasih churu, `C` panggil kucing
- `T` tur rumah otomatis, `V` dinding rendah, `M` suara
- Klik ruangan di denah kecil (kanan atas) buat jalan otomatis ke sana
- Tombol **Download denah** di bawah denah kecil: gambar kerja Denah Lantai 1 skala 1:100 (A4) lengkap dengan as, ukuran, pintu, jendela, dan peil lantai. Bisa diunduh PNG, SVG, atau dicetak ke PDF
- `E` di depan pagar carport buat buka/tutup pagar

Di HP ada joystick di kiri bawah dan tombol aksi di kanan bawah.

## Jalanin lokal

```bash
npm install
npm run dev
```

## Deploy

Tiap push ke `main` otomatis di-deploy ke GitHub Pages lewat `.github/workflows/deploy.yml`. Build-nya pakai `base: './'` jadi aman di subfolder.

## Struktur

```
src/game/plan.js       ukuran dinding, pintu, jendela, ruangan (dari denah)
src/game/house.js      dinding, lantai, pintu otomatis, efek dinding transparan
src/game/furniture.js  isi rumah
src/game/player.js     karakter chibi
src/game/cat.js        model + AI kucing
src/game/car.js        Mobilio
src/game/roof.js       atap, dak, kanopi carport
src/game/fence.js      pagar depan + pintu pagar
src/game/denah.js      generator gambar denah 1:100 (SVG)
src/game/garden.js     kebun di taman belakang
src/game/nav.js        grid + A* buat kucing & mode tur
src/components/        UI (Vue)
```

Kalau mau geser posisi ruangan atau furnitur, mulai dari `plan.js` dan `furniture.js`. Koordinatnya pakai meter sesuai denah: x dari as 1 ke as 5 (0 sampai 7), z dari pagar depan ke as J (0 sampai 16).

Progress (kebun, kucing, posisi terakhir) disimpan di localStorage. Tanaman tetap tumbuh walau tab ditutup, asal sudah disiram.
