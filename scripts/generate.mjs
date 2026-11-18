// Жеребкування (одне велике коло, ніхто не тягне себе, + заборони з rules.local.json),
// шифрування результату паролем кожного й запис docs/users.json.
// Мапінг "хто кому" НІДЕ не друкується.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seal, open, normLogin } from "../docs/crypto.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "people.local.json");
const rulesFile = path.join(root, "rules.local.json");
const out = path.join(root, "docs", "users.json");
const die = (m) => { console.error(m); process.exit(1); };

if (!fs.existsSync(src)) die("Немає people.local.json. Спершу: npm run init");
const { people } = JSON.parse(fs.readFileSync(src, "utf8"));
if (!Array.isArray(people) || people.length < 3) die("Потрібно щонайменше 3 учасники.");

const logins = new Set(), names = new Set();
for (const p of people) {
  if (!p.name || !p.login || !p.password) die("У кожного має бути name, login, password: " + p.name);
  const l = normLogin(p.login);
  if (logins.has(l)) die("Дубль логіну: " + l);
  if (names.has(p.name)) die("Дубль імені: " + p.name);
  logins.add(l); names.add(p.name);
}

/* ---- заборони ---- */
const nz = (s) => String(s).toLowerCase().replace(/[іїи]/g, "и").replace(/ё/g, "е");
const keyOf = new Map(); // name -> key
const forbidden = new Set(); // "nameA>nameB"
if (fs.existsSync(rulesFile)) {
  const rules = JSON.parse(fs.readFileSync(rulesFile, "utf8"));
  for (const [key, prefixes] of Object.entries(rules.aliases || {})) {
    const hit = people.filter((p) => prefixes.some((pre) => nz(p.name).startsWith(nz(pre))));
    if (hit.length !== 1) die(`Аліас "${key}" збігся з ${hit.length} людьми (має бути рівно 1). Перевір aliases у rules.local.json.`);
    keyOf.set(key, hit[0].name);
  }
  for (const [a, b] of rules.forbidden || []) {
    if (!keyOf.has(a) || !keyOf.has(b)) die(`Невідомий ключ у правилі [${a}, ${b}]`);
    forbidden.add(keyOf.get(a) + ">" + keyOf.get(b));
  }
}
const allowed = (a, b) => a !== b && !forbidden.has(a + ">" + b);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Випадковий гамільтонів цикл з урахуванням заборон (DFS з перемішаним порядком).
function findCycle() {
  const all = people.map((p) => p.name);
  const start = all[crypto.randomInt(all.length)];
  const path = [start], used = new Set([start]);
  let guard = 0;
  function dfs() {
    if (++guard > 2_000_000) return false;
    const cur = path[path.length - 1];
    if (path.length === all.length) return allowed(cur, start);
    for (const nxt of shuffle(all)) {
      if (used.has(nxt) || !allowed(cur, nxt)) continue;
      used.add(nxt); path.push(nxt);
      if (dfs()) return true;
      used.delete(nxt); path.pop();
    }
    return false;
  }
  return dfs() ? path : null;
}
const ring = findCycle();
if (!ring) die("Неможливо скласти коло з такими заборонами. Послаб правила в rules.local.json.");

const target = new Map();
ring.forEach((n, i) => target.set(n, ring[(i + 1) % ring.length]));

/* ---- фото ---- */
const photoDir = path.join(root, "Фото");
const outPhotos = path.join(root, "docs", "photos");
fs.mkdirSync(outPhotos, { recursive: true });
for (const f of fs.readdirSync(outPhotos)) { try { fs.unlinkSync(path.join(outPhotos, f)); } catch {} }
const photos = {};
const missing = [];
people.forEach((p, i) => {
  const ext = ["png", "jpg", "jpeg", "webp"].find((e) => fs.existsSync(path.join(photoDir, `${p.name}.${e}`)));
  if (!ext) return missing.push(p.name);
  fs.copyFileSync(path.join(photoDir, `${p.name}.${ext}`), path.join(outPhotos, `p${i + 1}.${ext}`));
  photos[p.name] = `photos/p${i + 1}.${ext}`;
});

/* ---- шифрування ---- */
const recs = [];
for (const p of people) recs.push(await seal(p.login, p.password, { name: p.name, target: target.get(p.name), admin: !!p.admin }));

const data = {
  drawId: crypto.randomBytes(6).toString("hex"),
  names: people.map((p) => p.name).sort((a, b) => a.localeCompare(b, "uk")),
  photos,
  people: shuffle(recs),
};

/* ---- самоперевірка (без друку результатів) ---- */
const dec = new Map(), seen = new Set();
for (const p of people) {
  const pl = await open(p.login, p.password, data.people.find((r) => r.login === normLogin(p.login)));
  if (!pl || !allowed(p.name, pl.target) || seen.has(pl.target)) die("Помилка самоперевірки!");
  seen.add(pl.target); dec.set(p.name, pl.target);
}
let cur = people[0].name, steps = 0;
do { cur = dec.get(cur); steps++; } while (cur !== people[0].name);
if (steps !== people.length) die("Не одне коло!");

fs.writeFileSync(out, JSON.stringify(data) + "\n", "utf8");
const lines = people.map((p) => `${p.name}\n   логін: ${p.login}\n   пароль: ${p.password}${p.admin ? "\n   (адмін)" : ""}\n`);
fs.writeFileSync(path.join(root, "credentials.local.txt"), lines.join("\n"), "utf8");

console.log(`Готово: ${people.length} учасників, правил-заборон: ${forbidden.size}, самоперевірка ок.`);
if (missing.length) console.log("⚠ Немає фото (папка Фото, імʼя файлу = повне імʼя): " + missing.join("; "));
console.log("Дані для входу — у credentials.local.txt. Хто кому дарує — ніде не показується 😉");
