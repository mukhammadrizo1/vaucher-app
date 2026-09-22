# Vaucher App: Lokal Test Qilish va Deploy Bo'yicha To'liq Qo'llanma

Ushbu qo'llanmada loyihani **lokal (kompyuteringizda) ishga tushirish**, **Neon (PostgreSQL)** bazasini ulash, **Render** da Backendni va **Vercel** da Frontendni deploy qilish bosqichma-bosqich tushuntirilgan.

---

## 1-BOSQICH: Neon Database (PostgreSQL) ni Sozlash

1. [Neon.tech](https://neon.tech) saytiga kiring va ro'yxatdan o'ting (yoki kiring).
2. Yangi loyiha (**New Project**) yarating (masalan, nomi: `vaucher-db`).
3. Loyiha yaratilgach, bosh sahifada **Connection Details** chiqadi.
4. U yerdan **`DATABASE_URL`** (Postgres connection string) ni nusxalang. U quyidagi ko'rinishda bo'ladi:
   ```env
   postgresql://neondb_owner:parol123@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Loyihangizdagi `backend/.env` faylini oching va ushbu URL ni qo'ying:
   ```env
   DATABASE_URL="postgresql://neondb_owner:parol123@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
   PORT=3000
   ```
6. Terminalda (loyiha asosiy papkasida turib) Prisma jadvallarini Neon bazasida avtomatik yaratish buyrug'ini bering:
   ```bash
   npm run prisma:push
   ```
   *Ekranda `🚀 Your database is now in sync with your Prisma schema` xabari chiqadi. Barcha jadvallar (`documents`, `document_items`) Neonda tayyor bo'ladi.*

---

## 2-BOSQICH: Lokal Test Qilish

### 1. Barcha paketlarni o'rnatish (agar o'rnatilmagan bo'lsa):
```bash
npm run install:all
```

### 2. Backend va Frontendni ishga tushirish:
Ikkita alohida terminal oynasini oching:

- **1-terminalda (Backend):**
  ```bash
  npm run start:backend
  ```
  *(NestJS 3000-portda ishga tushadi: `http://localhost:3000/api`)*

- **2-terminalda (Frontend):**
  ```bash
  npm run start:frontend
  ```
  *(Angular 4200-portda ishga tushadi: `http://localhost:4200`)*

### 3. Brauzerda test qilish:
1. Brauzerda oching: [http://localhost:4200](http://localhost:4200)
2. **Hujjat yaratish testi:**
   - Shartnoma ma'lumotlarini to'ldiring yoki tahrirlang.
   - Karta summalari va sonini kiriting (12% QQS va jami summa hisob-kitobini tekshiring).
   - **"Скачать PDF"** va **"Скачать DOCX"** tugmalarini bosib, Word va PDF to'g'ri shakllanayotganini tekshiring.
   - **"Отправить детали"** tugmasini bosing — hujjat Neon bazasiga `001` ID bilan saqlanadi.
3. **Dashboard testi:**
   - [http://localhost:4200/dashboard](http://localhost:4200/dashboard) sahifasiga o'ting.
   - Parol so'raladi: `KorzinkaVaucher2026` ni kiriting.
   - Yangi qo'shilgan hujjat jadvalda ko'rinadi.
   - Qidiruv qatoriga korxona nomi yoki INN yozib qidiring.
   - Hujjat ustiga bosib **Ko'rish**, **Tahrirlash** (qo'shimcha raqamlar, qator rangini o'zgartirish) va **O'chirish** amallarini tekshiring.
   - **"Экспорт в Excel"** tugmasini bosing — Excel jadvali ranglari bilan yuklanadi.
4. **Neon bazadagi ma'lumotlarni vizual ko'rish (ixtiyoriy):**
   ```bash
   npm run prisma:studio
   ```
   *Brauzerda `http://localhost:5555` ochiladi va Neondagi ma'lumotlarni to'g'ridan-to'g'ri ko'rishingiz mumkin.*

---

## 3-BOSQICH: Backendni Fly.io ga Deploy Qilish

1. Loyihangiz papkasida `fly.toml` va `Dockerfile` tayyorlangan.
2. Fly.io CLI orqali secretlarni sozlang (agar hali kiritilmagan bo'lsa):
   ```bash
   ~/.fly/bin/fly secrets set DATABASE_URL="postgresql://..." PORT="3000" NODE_ENV="production" -a vaucher-app
   ```
3. Backendni Fly.io ga deploy qiling:
   ```bash
   ~/.fly/bin/fly deploy --ha=false
   ```
4. Holatni va loglarni tekshirish:
   ```bash
   ~/.fly/bin/fly status -a vaucher-app
   ~/.fly/bin/fly logs -a vaucher-app
   ```
5. **Tekshirish:** Brauzerda yoki curl orqali `https://vaucher-app.fly.dev/api/health` yoki `https://vaucher-app.fly.dev/api/documents` manzilini oching. Barcha hujjatlar JSON formatida chiqadi.

---

## 4-BOSQICH: Frontendni Vercel.com ga Deploy Qilish

Frontendni Vercel ga ulashdan oldin unga Renderni manzilini bildirish kerak.

### 1. Backend manzilini Vercel ga ulash (Tavsiya qilinadigan usul):
`frontend/vercel.json` faylini oching va Fly.io manzilingizni qo'ying:
```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://vaucher-app.fly.dev/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
*(Bu orqali Vercel barcha `/api/*` so'rovlarini avtomatik Fly.io dagi backendga yo'naltiradi va hech qanday CORS muammosi yuzaga kelmaydi!)*

O'zgarishni git orqali push qiling:
```bash
git add frontend/vercel.json
git commit -m "config: update vercel rewrite to render backend"
git push origin main
```

### 2. Vercel da deploy qilish:
1. [Vercel.com](https://vercel.com) ga kiring va GitHub orqali kiring.
2. **"Add New..."** -> **"Project"** tugmasini bosing.
3. Repozitoriyangizni tanlang (**Import**).
4. Sozlamalar:
   - **Project Name**: `vaucher-frontend`
   - **Framework Preset**: `Angular` (Vercel o'zi taniydi)
   - **Root Directory**: `Edit` tugmasini bosing va **`frontend`** papkasini tanlang! *(MUHIM)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/vaucher/browser`
5. **"Deploy"** tugmasini bosing.
6. 1-2 daqiqada sayt tayyor bo'ladi va sizga domen beradi:
   Masalan: `https://vaucher-frontend.vercel.app`

---

## 5-BOSQICH: Production Test Qilish

1. Vercel bergan linkni oching: `https://vaucher-frontend.vercel.app`
2. Hujjat yarating va **"Отправить детали"** bosing.
3. `/dashboard` ga o'tib, parol bilan kiring (`KorzinkaVaucher2026`).
4. Saqlangan ma'lumotlar Render orqali Neon bazasidan yuklanib, jadvalda to'liq ko'rinadi!
5. Word va PDF eksportlarini yuklab olib tekshiring.

---

## Foydali buyruqlar spravkasi:

| Buyruq | Maqsadi |
|---|---|
| `npm run start:backend` | Lokal NestJS serverni yurgizish (port 3000) |
| `npm run start:frontend` | Lokal Angular serverni yurgizish (port 4200) |
| `npm run prisma:push` | Model o'zgarsa, Neonga sinxronizatsiya qilish |
| `npm run prisma:studio` | Neondagi ma'lumotlarni brauzerda ko'rish |
| `npm run build` | Backend va Frontendni build qilib xatoliklarni tekshirish |
