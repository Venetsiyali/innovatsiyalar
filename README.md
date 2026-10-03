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
2. **Storage → Create Database → Neon** ni tanlang (mintaqa: Frankfurt) va loyihaga ulang.
   `DATABASE_URL` va `DATABASE_URL_UNPOOLED` o'zgaruvchilari avtomatik qo'shiladi.
3. **Storage → Blob** (private) ni ham loyihaga ulang. `BLOB_READ_WRITE_TOKEN` avtomatik qo'shiladi.
4. **Settings → Environment Variables** bo'limiga quyidagilarni qo'shing:
   - `AUTH_SECRET` — tasodifiy uzun qator (`npx auth secret` yoki https://generate-secret.vercel.app/32)
   - `CRON_SECRET` — yana bitta tasodifiy qator
5. Deploy qiling. `vercel-build` skripti migratsiyalarni o'zi qo'llaydi.
6. Saytingizda **`/setup`** sahifasini oching (masalan, `https://<loyiha>.vercel.app/setup`). Sozlash kaliti
   sifatida `AUTH_SECRET` qiymatini kiriting va admin email hamda parolini belgilang. Sahifa admin yaratadi va
   `data/` papkasidagi dars jadvalini yuklaydi. Admin paydo bo'lgandan keyin `/setup` boshqa ishlamaydi.

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

## Admin panel (1-bosqich)

- **Foydalanuvchilar** — qidirish va rol bo'yicha filtrlash, yaratish, tahrirlash, o'chirish. Yangi foydalanuvchiga
  vaqtinchalik parol beriladi va u birinchi kirishda parolni almashtirishi shart.
  Email orqali yuborish 6-bosqichda qo'shiladi, hozircha parol admin ekranida bir marta ko'rsatiladi.
- **Excel/CSV import** — ustunlar: `F.I.Sh, Email, Rol, Guruh, Telefon`. Natijada yaratilgan parollarni CSV
  qilib yuklab olish mumkin.
- **O'qituvchilarni birlashtirish** — jadvalda bitta odam ikki xil yozilgan bo'lsa (masalan, "Qabulova" va "Qobulova"),
  o'qituvchi sahifasida birlashtiriladi. Fanlar va darslar tanlangan akkauntga o'tadi.
- **Tuzilma** — fakultet, yo'nalish va semestrlar. Bir vaqtda faqat bitta semestr faol bo'ladi.
- **Guruhlar** — tahrirlash, talabalarni checkbox bilan ommaviy qo'shish va chiqarish.
- **Fanlar** — o'qituvchi biriktirish (ma'ruza yoki amaliyot), guruhlarni tanlash, baholash vaznlari (yig'indisi 100).

## Dars jadvali (2-bosqich)

- **Admin → Dars jadvali** — jadvalni guruh, o'qituvchi yoki xona bo'yicha ko'rish (xonalar bandligi ham shu yerda).
  Haftalar bo'yicha o'tish mumkin.
- **Dars qo'shish va tahrirlash** — saqlashda konflikt tekshiriladi: guruh, o'qituvchi yoki xona bir vaqtda ikki joyda
  bo'la olmaydi. Istisnolar: potok ma'ruza (bir xil fan, o'qituvchi va xona bir nechta guruhga) hamda ikkita
  "migalka" dars.
- **Bitta darsni ko'chirish yoki bekor qilish** — sababi yoziladi. Guruh talabalari va o'qituvchiga tizim ichida
  bildirishnoma yaratiladi (email 6-bosqichda qo'shiladi). Har bir o'zgarish `audit_log`'ga yoziladi.
- **Excel'dan import** — universitetning jadval faylini admin paneldan qayta yuklash mumkin.
- **Eksport** — Excel (.xlsx) fayl. PDF uchun "Chop etish / PDF" tugmasi bor: Vercel'da Puppeteer
  ishlatib bo'lmaydi, shuning uchun brauzerning "PDF sifatida saqlash" imkoniyatidan foydalaniladi.
- **O'qituvchi va talaba** — shaxsiy jadval. Kompyuterda hafta ko'rinishida, telefonda kunlar ro'yxati bo'lib chiqadi.

## Kurs kontenti (3-bosqich)

Har bir fan sahifasi uch darajali: **Kurs → Modul (mavzu yoki hafta) → Element**. Elementlar: fayl, havola,
YouTube video va matn sahifa.

- O'qituvchi o'z fanini **Mening fanlarim** bo'limida boshqaradi, admin esa **Fanlar → Kontentni ochish** orqali.
  Boshqa o'qituvchining fani URL orqali ochilsa, 403 qaytadi.
- Fayllarni drag-and-drop bilan, bir vaqtda bir nechtasini yuklash mumkin. Ruxsat etilgan turlar: PPT, PDF, Word,
  Excel, ZIP, rasm (200 MB gacha) va MP4 (500 MB gacha). Boshqa kengaytmalar (.exe va h.k.) rad etiladi.
- Versiyalash: yangi versiya yuklanganda eskisi o'chmaydi, "Oldingi versiyalar" ro'yxatida qoladi.
- Modulni yashirish yoki ochilish vaqtini belgilash mumkin: talaba uni vaqti kelgandagina ko'radi.
- PDF va rasmlar brauzerda ochiladi, ularni yuklab olish ham mumkin.

**Fayl saqlash.** Vercel'da fayllar private **Vercel Blob** store'da saqlanadi (`BLOB_READ_WRITE_TOKEN`).
Fayllar brauzerdan to'g'ridan-to'g'ri Blob'ga yuklanadi, shuning uchun 4.5 MB'lik cheklov ularga tegishli emas.
Store private bo'lgani sababli har bir fayl `/api/files/[id]` orqali beriladi va har safar ruxsat tekshiriladi.
Lokal ishlashda token bo'lmasa, fayllar `uploads/` papkasiga yoziladi.

## Vazifalar va deadline (4-bosqich)

**O'qituvchi** (Vazifalar → Yangi vazifa) vazifa uchun quyidagilarni belgilaydi: sarlavha, tavsif, biriktirilgan fayl,
maksimal ball, nazorat turi (joriy, ON yoki YN), boshlanish vaqti, deadline va guruhlar. Kechikib topshirishga ruxsat
berilsa, necha kun va necha foiz jarima ekanini ham ko'rsatadi. Topshirish turi: fayl, matn yoki ikkalasi.
Vazifa yaratilganda talabalarga bildirishnoma ketadi.
- Topshirganlar ro'yxatida kechikib topshirganlar qizil rangda belgilanadi.
- Tekshirish bitta oynada bo'ladi: chapda talabaning fayli yoki matni, o'ngda ball va izoh, pastda "Saqlash va
  keyingisi" tugmasi. Kechikkan ish uchun jarima avtomatik hisoblanadi. Har bir baho `audit_log`'ga yoziladi.

**Talaba**
- Bosh sahifada "Yaqin deadline'lar" bloki bor. Har bir vazifaning holati ko'rsatiladi: topshirilmagan,
  topshirilgan yoki baholangan.
- Muddat o'tgach (kechikishga ruxsat bo'lmasa) yuklash bloklanadi. Bu server tomonda ham tekshiriladi.
  Baholangan javobni qayta topshirib bo'lmaydi.

**Eslatma (cron).** `vercel.json` faylida `/api/cron/deadline-reminders` har kuni soat 08:00 da (Toshkent vaqti)
ishga tushadi. U muddatiga 24 soatdan kam qolgan va hali topshirmagan talabalarga eslatma yuboradi; bitta
talabaga eslatma bir marta boradi. Vercel'da `CRON_SECRET` env o'zgaruvchisini qo'shing. Vercel Hobby rejasida
cron kuniga faqat bir marta ishlaydi. Pro rejada jadvalni `0 * * * *` (har soat) qilsangiz, eslatmalar
aniqroq vaqtda boradi.

## Baho jurnali, davomat va hisobotlar (5-bosqich)

- **Baho jurnali** (o'qituvchi uchun "Baho jurnali", admin uchun "Fanlar → Baho jurnali"): qatorlarda talabalar,
  ustunlarda vazifalar. Ballni to'g'ridan-to'g'ri katakka yozish mumkin, topshirmagan talabaga ham. Har bir
  nazorat turi (joriy, ON, YN) bo'yicha foiz hisoblanadi, umumiy ball esa fan sozlamalaridagi vaznlar
  asosida 100 ballik tizimda chiqariladi. Hali vazifasi bo'lmagan nazorat turi hisobga olinmaydi va vaznlar
  qolganlar orasida qayta taqsimlanadi. Jurnalni guruh bo'yicha filtrlash va Excel'ga eksport qilish mumkin.
  Talaba faqat o'z qatorini ko'radi ("Baholarim").
- **Davomat** (o'qituvchi uchun "Davomat"): sana tanlanadi va o'sha kungi darslar chiqadi. Har bir talaba bir
  bosish bilan keldi, kelmadi yoki sababli deb belgilanadi. Bekor qilingan darslar va kelajakdagi sanalar
  uchun davomat belgilanmaydi. Talaba semestrda 3 martadan ko'p sababsiz qoldirsa, adminga signal boradi.
- **Hisobotlar** (admin): fanlar bo'yicha o'rtacha ball va davomat, xavf guruhidagi talabalar, o'qituvchilarning
  faolligi (TZ'dagi "80% faol o'qituvchi" mezoni shu yerda kuzatiladi).

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
