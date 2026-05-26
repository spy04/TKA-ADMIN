# TKA-Admin

Panel admin internal berbasis Next.js untuk kebutuhan upload dan pengelolaan materi.

## Setup

1. Install dependency:

```bash
npm install
```

2. Buat file `.env.local` dari `.env.example`

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=isi-password-yang-kuat
ADMIN_SESSION_SECRET=isi-random-secret-yang-panjang
DATABASE_URL="mysql://root:password@127.0.0.1:3306/tka_admin"
```

3. Jalankan project:

```bash
npm run dev
```

4. Buka `http://localhost:3000/admin/login`

## Setup MariaDB lokal

1. Buat database baru bernama `tka_admin`
2. Isi `DATABASE_URL` di `.env.local`
3. Generate Prisma client:

```bash
npx prisma generate
```

4. Saat schema berubah, jalankan migrasi:

```bash
npx prisma migrate dev --name init
```

## Catatan

- Halaman admin dilindungi dengan cookie session `httpOnly`
- Route `/admin` akan diarahkan ke login jika sesi belum aktif
- Saat deploy ke Vercel, isi environment variable yang sama di dashboard Vercel
- Form topic sekarang bisa menyimpan metadata ke MariaDB jika `DATABASE_URL` sudah aktif
