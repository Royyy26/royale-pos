# Royale POS — Sistem Kasir Restoran & Kafe

Aplikasi **Point of Sale (POS)** untuk restoran/kafe dengan tiga peran pengguna: **Kasir**, **Owner**, dan **Warehouse**. Dibangun dengan antarmuka berbahasa Indonesia, alur checkout cepat, rekap penjualan harian, target & KPI bulanan, analitik bisnis, dan manajemen persediaan.

---

## Menjalankan Aplikasi

```bash
npm install
```

```bash
npm run dev
```

Buka `http://localhost:5173`.

Perintah lain:

```bash
npm run build
```

```bash
npm run preview
```

---

## Akun Demo

| Role | Username | PIN | Halaman awal |
|---|---|---|---|
| Owner | `owner` | `1234` | Dashboard Bisnis |
| Kasir | `kasir` | `1234` | Halaman POS |
| Warehouse | `gudang` | `1234` | Dashboard Gudang |

Sistem dirancang untuk **satu akun kasir**. Pada halaman login tersedia tombol akses cepat untuk mengisi kredensial.

Data demo mencakup **60 hari** riwayat transaksi (± 2.300 pesanan), target penjualan bulanan, pergerakan stok, dan audit log — seluruhnya dalam Rupiah.

---

## Peran & Hak Akses (RBAC)

Seluruh menu, route, dan tombol aksi divalidasi terhadap daftar permission di [`src/lib/rbac.ts`](src/lib/rbac.ts). Owner dapat mengubah izin per role melalui halaman **Role & Hak Akses**, dan perubahannya langsung terlihat pada sidebar pengguna terkait.

### Kasir
Dashboard · POS · Denah Meja · Pesanan Saya · Penjualan Hari Ini

Kasir hanya melakukan input pesanan dan pembayaran. Ia **tidak** dapat memberi diskon, melakukan refund, membuka laporan lintas periode, mengubah produk/harga, mengelola stok, maupun mengakses pengaturan sistem. Membatalkan (void) transaksi hari ini diizinkan dengan alasan wajib yang tercatat pada audit log.

### Owner
Dashboard Bisnis · Analitik · Target & KPI · Laporan · POS · Denah Meja · Pesanan · Rekap Harian · Produk · Kategori · Inventori · Pergerakan Stok · Penyesuaian Stok · Pengguna · Role & Hak Akses · Audit Log · Pengaturan

### Warehouse
Dashboard Gudang · Inventori · Katalog Produk · Pergerakan Stok · Penyesuaian Stok · Stok Opname

Tidak dapat mengakses data pendapatan, analitik keuangan, maupun pengaturan pengguna.

---

## Fitur Utama

### Halaman POS
- Grid menu dengan tombol besar, tab kategori, dan pencarian cepat.
- Tipe pesanan **Dine In / Take Away / Delivery**. Dine In memakai bill per meja (lihat Alur Meja); Take Away & Delivery dibayar langsung.
- Keranjang: ubah kuantitas, hapus item, catatan per item dan per pesanan.
- Diskon persentase atau nominal — hanya untuk role dengan izin `pos.discount` (owner).
- Mengosongkan keranjang wajib disertai alasan → tercatat di audit log.
- Pintasan papan ketik: `F2` cari · `F4` bayar · `F8` kosongkan keranjang · `Shift + ?` daftar pintasan.

### Alur Meja (Table Service)

Restoran ini memakai pola **duduk dulu, bayar belakangan** — bukan bayar di muka.

```
Pilih meja kosong  →  Buka Bill        →  Meja jadi TERISI
Input pesanan      →  Simpan Bill      →  Stok langsung dipotong
Tamu nambah        →  Lanjutkan Pesanan → Bill yang sama diperbarui
Tamu pulang        →  Bayar Bill Ini   →  Meja kembali KOSONG
```

Bill terbuka adalah pesanan berstatus `pending`. Satu meja hanya boleh punya satu bill terbuka (dijaga indeks unik parsial pada skema).

**Status meja bukan data yang berdiri sendiri.** `Terisi` selalu diturunkan dari ada-tidaknya bill terbuka, sehingga papan meja tidak mungkin berbeda dengan kenyataan di kasir. Yang disimpan manual hanya `Dipesan` dan `Dibersihkan`.

**Stok dipotong saat bill disimpan**, bukan saat dibayar — karena dapur sudah memasaknya. Pelunasan hanya menyesuaikan selisih terakhir, jadi tidak pernah terpotong dua kali. Membatalkan bill mengembalikan seluruh stoknya.

Halaman **Denah Meja** menampilkan seluruh meja per area dengan warna status, nilai bill berjalan, lama duduk, dan jumlah porsi. Dari sana kasir bisa membuka bill, melanjutkan pesanan, langsung membayar, membatalkan bill, atau menandai meja Dipesan/Dibersihkan.

### Checkout & Pembayaran
Empat metode: **Tunai, QRIS, Transfer Bank, Kartu Debit/Kredit** (struktur data siap menampung metode baru).

Untuk pembayaran tunai tersedia keypad numerik, saran nominal uang, dan perhitungan kembalian otomatis:

```
Total          Rp 150.000
Uang diterima  Rp 200.000
Kembalian      Rp  50.000
```

Metode non-tunai mewajibkan nomor referensi sebagai bukti pencocokan dengan mutasi rekening atau settlement EDC.

### Struk & Faktur
- **Struk thermal 80mm** — tata letak menyerupai struk POS, lengkap dengan QR code faktur.
- **Faktur A4** — versi formal untuk cetak/PDF.
- Cetak melalui dialog browser (dapat disimpan sebagai PDF).

### Rekap Penjualan Harian
Tidak ada shift maupun perhitungan modal awal kas. Sistem merekap otomatis **total penjualan per hari**: jumlah transaksi, item terjual, penjualan kotor, diskon, service charge, pajak, refund, void, estimasi laba, serta rincian nilai per metode pembayaran (tunai, QRIS, transfer, kartu). Setiap hari dapat dibuka untuk melihat daftar transaksinya, dan seluruh rekap dapat diekspor ke CSV.

### Target & KPI Penjualan
Owner menetapkan **target omzet** dan **target jumlah transaksi** per bulan. Dari situ sistem menghitung:

```
Target harian   = Target bulanan ÷ jumlah hari dalam bulan
Laju ideal      = Target harian × hari yang sudah berjalan
Proyeksi        = (Realisasi ÷ hari berjalan) × jumlah hari dalam bulan
Sisa per hari   = (Target − Realisasi) ÷ sisa hari
```

Status pencapaian: **Sesuai Jalur**, **Perlu Dikejar**, **Tertinggal**, **Target Tercapai** untuk bulan berjalan; **Tidak Tercapai** untuk bulan lampau; **Belum Mulai** untuk bulan mendatang. Kasir melihat versi ringkasnya sebagai kartu **Target Penjualan Hari Ini** di dashboard.

### Analitik (Owner)
KPI pendapatan harian/mingguan/bulanan, rata-rata nilai transaksi, estimasi laba & margin, pencapaian target bulan berjalan, perbandingan dengan periode sebelumnya, tren per jam/hari/minggu/bulan, distribusi metode pembayaran, produk terlaris & paling lambat, performa kategori, analitik persediaan (fast/slow moving), serta performa kasir. Filter periode: Hari Ini, Kemarin, 7 Hari, Minggu Ini/Lalu, 30 Hari, Bulan Ini/Lalu, dan Rentang Kustom.

### Inventori
Stok berkurang otomatis saat penjualan dan dikembalikan saat void. Status stok: **Normal · Rendah · Kritis · Habis**. Jenis pergerakan: Stok Masuk, Stok Keluar, Penjualan, Penyesuaian, Stok Opname, Waste/Rusak, Pengembalian. Setiap perubahan mencatat waktu, pengguna, produk, jumlah sebelum/perubahan/sesudah, dan alasan. Stok opname menghasilkan pengajuan penyesuaian yang menunggu persetujuan owner.

### Audit & Keamanan
Login, logout, transaksi dibuat/dibatalkan, refund, penyesuaian stok, perubahan harga, perubahan target penjualan, dan perubahan hak akses tercatat lengkap dengan pengguna, waktu, referensi, dan alamat IP.

---

## Arsitektur

```
src/
├─ app/            Router, guard RBAC, konfigurasi navigasi
├─ components/
│  ├─ ui/          Design system (Button, Input, Modal, Table, StatCard, …)
│  ├─ layout/      AppLayout, Sidebar, Topbar, Page
│  └─ charts/      Pembungkus Recharts (area, bar, donut, comparison)
├─ data/           Katalog & generator data dummy deterministik
├─ db/             Lapisan basis data (localStorage) — titik tukar ke API
├─ features/       Modul per domain
│  ├─ auth/  pos/  tables/  orders/  analytics/  reports/  targets/
│  ├─ products/  inventory/  users/  settings/  dashboard/  landing/  misc/
├─ hardware/       Abstraksi printer, scanner, cash drawer, customer display
├─ lib/            Utilitas format IDR/tanggal, RBAC, analitik, KPI target, status meja & bill
├─ store/          Zustand: data, auth, cart, toast
└─ types/          Definisi entitas — cerminan docs/schema.sql
```

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · Zustand · React Router · Recharts · Framer Motion · lucide-react · GSAP ScrollTrigger + Swiper (khusus landing).

---

## Sistem Desain — "Warm Editorial"

Arahnya sengaja menjauh dari tampilan dashboard SaaS generik: latar kertas krem berbutir halus, permukaan gelap espresso, dan satu aksen saffron yang dipakai hemat.

| Peran | Warna | Catatan |
|---|---|---|
| Latar | `#F7F4EF` | Kertas hangat, bukan abu-abu kebiruan |
| Permukaan gelap | `#1F1A15` | Espresso, dipakai sidebar & panel hero |
| Aksen | `#E0921A` | Saffron — sorotan, nav aktif, progres |
| Berhasil | `#4A9366` | Sage |
| Peringatan | `#C2703A` | Terracotta |
| Bahaya | `#C0402B` | Clay |

Keputusan yang membedakannya dari templat:

- **Tombol aksi utama berwarna espresso pekat, bukan warna aksen.** Saffron disimpan untuk sorotan agar tidak kehilangan daya tariknya.
- **Kartu statistik tidak memakai garis aksen di tepi atas** — pola yang nyaris selalu muncul pada templat dashboard. Warna hanya menyentuh ikon.
- **Kartu produk diberi tint per kategori, bukan per produk**, sehingga grid menu tenang dan tetap mudah dipindai.
- **Butiran halus (`body::before`)** membuat permukaan terasa seperti kertas.

Tipografi: **Bricolage Grotesque** untuk judul dan seluruh nominal (kelas `.figure`), **Inter** untuk teks antarmuka, **JetBrains Mono** untuk struk.

### Disiplin Ikon

Seluruh ikon antarmuka memakai **lucide-react** — satu keluarga, stroke seragam, mewarisi `currentColor`. Emoji tidak dipakai di mana pun, termasuk untuk ikon produk, kategori, dan lambang merek: emoji bergantung font, berubah rupa antar sistem operasi, tidak bisa diberi token warna, dan pada struk termal kerap tercetak sebagai kotak kosong.

`src/lib/glyphs.tsx` adalah satu-satunya registry ikon konten:

- `PRODUCT_GLYPHS` — pilihan ikon kartu produk (dipakai form Produk)
- `CATEGORY_GLYPHS` — pilihan ikon tab kategori POS
- `BRAND_GLYPHS` — lambang merek toko (Pengaturan)
- `<Glyph name={...} />` — merender ikon dari key yang tersimpan di database
- `normalizeGlyphKey(...)` — dipakai form agar pilihan yang aktif tetap tersorot

`product.emoji` dan `category.icon` menyimpan **key teks** (`'rice'`, `'coffee'`, `'dessert'`), bukan karakter emoji. Data yang terlanjur menyimpan emoji tetap terbaca: `resolveGlyph` punya peta legacy emoji → key, jadi toko yang sudah berjalan tidak perlu migrasi dan tidak kehilangan ikon produknya.

Ikon dekoratif yang berdampingan dengan teks diberi `aria-hidden="true"`; tombol khusus ikon selalu punya `aria-label` yang menyebut objeknya, misalnya `"Tambah Nasi Goreng Kampung"` alih-alih sekadar `"Tambah"`.

Target sentuh mengikuti WCAG 2.2 AA untuk web (minimum 24px). Kontrol kuantitas di keranjang sengaja dibesarkan ke 40px karena paling sering ditekan kasir di tablet, sementara tombol hapus item dibiarkan lebih kecil agar tindakan merusak tidak jadi yang paling mudah tersentuh.

### Jebakan Posisi Statik

Dua bug dengan akar yang sama pernah lolos di sini, keduanya karena kelas menempel pada elemen yang salah.

**Knob switch.** `<button>` mewarisi `text-align: center` dari peramban. Anak `position: absolute` tanpa `left` mengambil posisi statiknya dari perataan itu, jadi knob mulai di tengah track (22px), lalu `translate-x` menambah 22px lagi dan mendorongnya sepenuhnya keluar. `left-0.5` sekarang eksplisit; jangan hapus.

**`className` pada field form.** `Input`, `Textarea`, dan `Select` meneruskan `className` ke **pembungkus** label+field, bukan ke kontrolnya. Ini membuat `mt-4` memberi jarak pada seluruh grup — sebelumnya jarak itu menyelip di antara label dan kotaknya. Untuk gaya teks kontrol (mis. `tnum`) pakai `inputClassName` / `textareaClassName` / `selectClassName`.

### Titik Putus Layout POS

Panel POS dipisah pada `lg` (1024px), bukan `xl`. Alasannya: breakpoint Tailwind diukur terhadap **viewport**, sedangkan ruang yang benar-benar tersedia adalah viewport dikurangi sidebar (264px). Dengan `xl`, layar 1280–1540px — rentang laptop paling umum — jatuh ke susunan bertumpuk dan kolom produk terjepit.

Kolom produk wajib memakai `min-w-0`. Tanpa itu `flex-1` mewarisi `min-width: auto`, menolak menyusut di bawah lebar konten grid, dan mendorong panel keranjang keluar layar.

### Motion

Primitif ada di [`src/components/ui/motion.tsx`](src/components/ui/motion.tsx): `FadeIn`, `Stagger`/`StaggerItem`, `AnimatedNumber` (nominal merayap naik), `Pressable`, `AnimatedBar`. Durasi dijaga 150–320 ms agar tidak pernah menghambat kasir, dan seluruhnya berhenti otomatis pada `prefers-reduced-motion: reduce`.

Yang bergerak: pil nav aktif berpindah mulus antar menu (`layoutId`), kartu KPI masuk bertahap, item keranjang masuk/keluar dengan pegas, modal & drawer memakai spring, transisi antar halaman, serta tekanan pegas pada kartu produk.

---

## Halaman Landing (`/`)

Halaman publik sebelum login, memuat hero dengan animasi scroll-pin GSAP: lima kartu foto merayap naik, mengecil, lalu berlabuh di celah-celah judul sementara kalimatnya tersingkap.

Halaman ini **dimuat terpisah** (`React.lazy`) sehingga GSAP + Swiper tidak membebani bundel aplikasi kasir. Pengguna yang sudah masuk langsung diteruskan ke dashboard tanpa melewati landing.

Komponennya ada di [`src/components/ui/home-hero-landing-scroll-animation.tsx`](src/components/ui/home-hero-landing-scroll-animation.tsx) dan sengaja **tidak dipakai di dalam aplikasi kasir** — scroll-pin menghambat alur kerja operasional. Komponen ini punya jaring pengaman: bila progres scroll tidak pernah bergerak (mis. lingkungan yang tidak mengirim event `scroll`), animasi dilepas dan judul ditampilkan apa adanya, sehingga hero tidak pernah tampak kosong.

### Lapisan Basis Data

Seluruh akses data melewati [`src/db/database.ts`](src/db/database.ts). Prototipe menyimpan data di `localStorage`; migrasi ke REST API / Prisma / Supabase cukup mengganti implementasi `loadDatabase` dan `persistDatabase` tanpa menyentuh komponen UI.

Skema tabel lengkap ada di [`docs/schema.sql`](docs/schema.sql) — mencakup `users`, `roles`, `permissions`, `products`, `categories`, `sales_targets`, `orders`, `order_items`, `payments`, `invoices`, `inventory`, `stock_movements`, `stock_adjustments`, `audit_logs`, dan `store_settings`. Setiap tabel memiliki `id`, `created_at`, `updated_at`.

### Abstraksi Perangkat Keras

[`src/hardware/`](src/hardware) mendefinisikan kontrak `PrinterDriver`, `ScannerDriver`, dan `CustomerDisplayDriver`. Implementasi aktif saat ini adalah `BrowserPrinter` (dialog cetak browser) dan `KeyboardWedgeScanner`. Mengganti ke thermal printer cukup:

```ts
import { registerPrinter } from '@/hardware'
registerPrinter(new ThermalUsbPrinter())
```

Seluruh halaman memanggil `printer()`, sehingga tidak ada perubahan pada UI. Tabel `devices` pada skema sudah disiapkan untuk menyimpan konfigurasi perangkat.

### Persiapan Recipe / BOM

Kolom `products.has_recipe` serta tabel `ingredients`, `recipes`, dan `recipe_items` sudah tersedia di skema. Versi ini memakai stok langsung per produk; ketika BOM diaktifkan, alurnya menjadi:

```
Menu terjual → Recipe → Ingredients → Pengurangan stok bahan baku
```

---

## Catatan Prototipe

- Data tersimpan di `localStorage` peramban dan dapat dikembalikan ke kondisi awal melalui **Pengaturan → Data → Reset ke Data Awal**. Bila kuota penyimpanan peramban penuh, riwayat transaksi yang lebih tua dari 30 hari dipangkas otomatis agar transaksi terbaru tetap tersimpan.
- Target pada data demo dikalibrasi dari omzet yang benar-benar dihasilkan generator, sehingga status pencapaiannya realistis (ada bulan tercapai, ada yang tidak).
- PIN pada data demo disimpan sebagai teks biasa untuk memudahkan pengujian. Pada implementasi produksi, kolom `users.pin_hash` wajib menggunakan bcrypt/argon2 dan otentikasi dipindahkan ke sisi server.
- Angka laba merupakan **estimasi** berdasarkan HPP (`cost_price`) yang tersimpan pada setiap baris transaksi.
