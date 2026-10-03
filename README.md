# IUSI LMS

Xalqaro ijtimoiy innovatsiyalar universiteti uchun o'quv boshqaruv tizimi.

**Stek:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · Auth.js
**Deploy:** Vercel + Neon Postgres (fayllar uchun Vercel Blob, 3-bosqichdan)

## Kompyuterda ishga tushirish

Kerak bo'ladi: Node.js 20+ va Docker (yoki o'rnatilgan PostgreSQL 16).

```bash
npm install
cp .env.example .env          # AUTH_SECRET va ADMIN_PASSWORD'ni o'zgartiring
docker compose up -d          # lokal PostgreSQL
npx prisma migrate dev        # jadvallarni yaratadi
npm run db:seed               # admin + dars jadvali (data/*.xlsx)
npm run dev                   # http://localhost:3000
```

Kirish: `admin@iusi.uz` / `.env` faylidagi `ADMIN_PASSWORD`.

## Vercel'ga joylash

1. GitHub repozitoriysini Vercel'da **Add New → Project** orqali ulang.
2. **Storage → Create → Neon (Postgres)** tanlab, loyihaga ulang. `DATABASE_URL` va
   `DATABASE_URL_UNPOOLED` avtomatik qo'shiladi.
3. **Settings → Environment Variables** bo'limiga qo'shing:
   - `DIRECT_URL` — `DATABASE_URL_UNPOOLED` qiymati (migratsiyalar uchun)
   - `AUTH_SECRET` — `npx auth secret` buyrug'i bilan yarating
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
4. Deploy qiling. `vercel-build` skripti migratsiyalarni o'zi qo'llaydi.
5. Birinchi marta ma'lumotlarni yuklash uchun (kompyuterda, Vercel'dagi baza manzili bilan):

   ```bash
   DATABASE_URL="<neon-url>" DIRECT_URL="<neon-unpooled-url>" ADMIN_PASSWORD="..." npm run db:seed
   ```

Server mintaqasi `vercel.json` faylida `fra1` (Frankfurt) qilib qo'yilgan. Neon bazasini ham
shu mintaqada (`eu-central-1`) yarating.

## Dars jadvali

Jadval universitetning Excel fayllaridan import qilinadi (`data/` papkasi):

| Fayl | Smena | Paralar |
| --- | --- | --- |
| `kunduzgi-1-semestr.xlsx` | Kunduzgi | 10:00, 11:30, 13:30, 15:00 |
| `kechki-1-semestr.xlsx` | Kechki | 18:00, 19:20, 20:40 |

Jadval o'zgarsa, yangi faylni `data/` ga qo'ying va qayta import qiling. Import qayta ishga
tushirilsa ham xavfsiz: shu guruhlarning eski darslari o'chiriladi (soft delete) va yangilari yoziladi.

```bash
npm run import:schedule -- data/kunduzgi-1-semestr.xlsx data/kechki-1-semestr.xlsx
```

Import vaqtida o'qituvchi yoki xona to'qnashuvlari ⚠ belgisi bilan ko'rsatiladi. Bir xil
fan bir xonada bir nechta guruhga o'tilsa (potok), bu to'qnashuv hisoblanmaydi.

Fayl formati: 1-qatorda guruh nomlari (har guruhga 2 ta ustun), A ustunda hafta kuni, B ustunda
vaqt. Har bir para 3 qatordan iborat: fan → o'qituvchi → dars turi | xona.
`MIGALKA` yoki `(migalka)` belgisi "haftada bir marta navbat bilan" degani.

O'qituvchi akkauntlari jadvaldan avtomatik yaratiladi (`ism.familiya@iusi.uz`), lekin parolsiz
bo'ladi, ya'ni admin parol bermaguncha ular tizimga kira olmaydi.

## Loyiha tuzilmasi

```
app/
  login/            kirish sahifasi
  admin/ teacher/ student/   rol bo'yicha bo'limlar (layout'da server tomonda tekshiriladi)
  api/auth/         Auth.js
lib/
  i18n/uz.json      barcha interfeys matnlari
  schedule-import/  Excel jadvalini o'qish va saqlash
  permissions.ts    requireRole / apiRequireRole
prisma/schema.prisma
middleware.ts       /admin, /teacher, /student himoyasi
```

## Tekshiruv

```bash
npm run typecheck
npm run lint
npm run build
```
