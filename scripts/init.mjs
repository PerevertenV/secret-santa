// Створює people.local.json з тестовими людьми та випадковими паролями.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "people.local.json");

if (fs.existsSync(file)) {
  console.log("people.local.json вже існує — нічого не чіпаю.");
  process.exit(0);
}

const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
const pass = () => Array.from(crypto.randomBytes(8), (b) => alphabet[b % alphabet.length]).join("");

const people = [
  { name: "Вадим", login: "vadym", password: pass(), admin: true },
  { name: "Юра", login: "yura", password: pass() },
  { name: "Каріна", login: "karina", password: pass() },
  { name: "Олег", login: "oleg", password: pass() },
  { name: "Марина", login: "maryna", password: pass() },
  { name: "Дмитро", login: "dmytro", password: pass() },
];

fs.writeFileSync(file, JSON.stringify({ people }, null, 2) + "\n", "utf8");
console.log("Створено people.local.json. Відредагуй імена/логіни (паролі можна лишити випадкові),");
console.log("потім запусти: npm run generate");
