import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { importFiles } from "../scripts/import-schedule";

const db = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@iusi.uz").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD .env faylida ko'rsatilmagan");

  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName: "Administrator",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
    },
  });
  console.log(`✔ Admin: ${email}`);

  if (!(await db.semester.findFirst({ where: { isActive: true } }))) {
    await db.semester.create({
      data: {
        name: "2026–2027 o'quv yili, 1-semestr",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-01-31"),
        isActive: true,
      },
    });
    console.log("✔ Faol semestr yaratildi");
  }

  await importFiles(db, ["data/kunduzgi-1-semestr.xlsx", "data/kechki-1-semestr.xlsx"]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
