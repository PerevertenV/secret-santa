import { open, normLogin } from "./crypto.js?v=3";
import { GAGS, JOKES } from "./data.js?v=3";
import { startGame } from "./game.js?v=3";

const cfg = window.SANTA_CONFIG || {};
const root = document.getElementById("app");
let DATA = null;
let me = null; // { login, name, target, admin }

/* ---------- утиліти ---------- */
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const ss = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
  del(k) { try { sessionStorage.removeItem(k); } catch {} },
};
const skey = (s) => `santa:${DATA.drawId}:${me.login}:${s}`;
const show = (...nodes) => { root.replaceChildren(...nodes); window.scrollTo(0, 0); };

function head(sub) {
  return [h("h1", { text: "🎅 " + (cfg.title || "Таємний Санта") + " 🎄" }), h("p", { class: "sub", text: sub })];
}
function daysToNY() {
  const now = new Date();
  const ny = new Date(now.getFullYear() + 1, 0, 1);
  return Math.ceil((ny - now) / 86400000);
}
function countdown() {
  const d = daysToNY();
  const word = d % 10 === 1 && d % 100 !== 11 ? "день" : [2, 3, 4].includes(d % 10) && ![12, 13, 14].includes(d % 100) ? "дні" : "днів";
  return h("div", { class: "countdown", text: `❄️ До Нового року: ${d} ${word} ❄️` });
}

const short = (n) => (String(n).split(/[ (]/)[0] || n);
const nick = (n) => String(n).slice(short(n).length).trim();

function avatar(name, size = 40) {
  const src = DATA.photos && DATA.photos[name];
  const st = `width:${size}px;height:${size}px;font-size:${Math.round(size / 2.2)}px`;
  if (src) return h("img", { class: "avatar", src, alt: name, style: st });
  return h("div", { class: "avatar", style: st, text: name.trim()[0] || "?" });
}

/* ---------- сніг і гірлянда ---------- */
function initGarland() {
  const g = document.getElementById("garland");
  const colors = ["#e63946", "#ffd166", "#2a9d8f", "#4cc9f0", "#f72585"];
  const count = Math.max(10, Math.floor(innerWidth / 45));
  for (let i = 0; i < count; i++) {
    const b = h("span", { class: "bulb" });
    b.style.color = b.style.background = colors[i % colors.length];
    b.style.animationDelay = (i % 5) * 0.4 + "s";
    g.append(b);
  }
}
function initSnow() {
  const c = document.getElementById("snow");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = c.getContext("2d");
  let w, hh, flakes;
  const resize = () => {
    w = c.width = innerWidth;
    hh = c.height = innerHeight;
    const n = Math.min(160, Math.floor(w / 8));
    flakes = Array.from({ length: n }, () => mk(true));
  };
  const mk = (any) => ({ x: Math.random() * w, y: any ? Math.random() * hh : -10, r: 1 + Math.random() * 3, v: 0.4 + Math.random() * 1.2, p: Math.random() * 6.28, s: 0.5 + Math.random() });
  addEventListener("resize", resize);
  resize();
  (function tick() {
    ctx.clearRect(0, 0, w, hh);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const f of flakes) {
      f.y += f.v;
      f.p += 0.01 * f.s;
      f.x += Math.sin(f.p) * 0.6;
      if (f.y > hh + 5) Object.assign(f, mk(false));
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, 6.283);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  })();
}
function confetti() {
  const colors = ["#e63946", "#ffd166", "#2a9d8f", "#4cc9f0", "#f72585", "#fff"];
  for (let i = 0; i < 90; i++) {
    const p = h("div", { class: "confetti" });
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = 2.2 + Math.random() * 2.5 + "s";
    p.style.animationDelay = Math.random() * 0.6 + "s";
    document.body.append(p);
    setTimeout(() => p.remove(), 6000);
  }
}

/* ---------- колесо ---------- */
function mountWheel(names, target, onDone) {
  const size = Math.min(360, innerWidth - 56);
  const dpr = window.devicePixelRatio || 1;
  const canvas = h("canvas");
  canvas.width = canvas.height = size * dpr;
  canvas.style.width = canvas.style.height = size + "px";
  const wrap = h("div", { class: "wheel-wrap" }, h("div", { class: "pointer" }), canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const n = names.length;
  const seg = (Math.PI * 2) / n;
  const palette = ["#e63946", "#2a9d8f", "#f4a261", "#457b9d", "#9b5de5", "#e9c46a"];
  const colorOf = (i) => {
    let c = i % palette.length;
    if (i === n - 1 && c === 0) c = 3;
    return palette[c];
  };
  let rot = 0;

  function draw() {
    const r = size / 2 - 6;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(rot);
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, i * seg, (i + 1) * seg);
      ctx.closePath();
      ctx.fillStyle = colorOf(i);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.rotate(i * seg + seg / 2);
      ctx.fillStyle = "#fff";
      const label = short(names[i]);
      const maxW = r - 16 - 34;
      let fs = Math.max(13, Math.min(20, size / (n > 8 ? 18 : 14)));
      ctx.font = "700 " + fs + "px 'Trebuchet MS', sans-serif";
      while (ctx.measureText(label).width > maxW && fs > 9) { fs -= 1; ctx.font = "700 " + fs + "px 'Trebuchet MS', sans-serif"; }
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.fillText(label, r - 16, 0);
      ctx.restore();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 26, 0, 6.283);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = "26px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🎅", size / 2, size / 2 + 2);
  }
  draw();

  let busy = false;
  function spin() {
    if (busy) return;
    busy = true;
    const idx = names.indexOf(target);
    const center = idx * seg + seg / 2;
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const TAU = Math.PI * 2;
    const base = ((((-Math.PI / 2 - center + jitter - rot) % TAU) + TAU) % TAU);
    const total = base + TAU * (5 + Math.floor(Math.random() * 3));
    const start = rot;
    const dur = 6200;
    const t0 = performance.now();
    (function frame(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 4);
      rot = start + total * e;
      draw();
      if (t < 1) requestAnimationFrame(frame);
      else { busy = false; onDone && onDone(); }
    })(t0);
  }
  return { el: wrap, spin };
}

/* ---------- екрани ---------- */
function loginView(msg = "") {
  const login = h("input", { type: "text", autocomplete: "username", autocapitalize: "none", placeholder: "твій логін" });
  const pass = h("input", { type: "password", autocomplete: "current-password", placeholder: "пароль" });
  const err = h("p", { class: "error", text: msg });
  const btn = h("button", { class: "btn", type: "submit", text: "🎁 Увійти" });
  const form = h("form", { class: "card" }, h("label", { text: "Логін" }), login, h("label", { text: "Пароль" }), pass, btn, err);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    btn.disabled = true;
    err.textContent = "";
    const ok = await doLogin(login.value, pass.value);
    if (!ok) {
      err.textContent = "Хмм, схоже, Санта тебе не впізнав 🧐 Перевір логін і пароль.";
      btn.disabled = false;
    }
  });
  show(...head("Введи дані, які тобі видав організатор"), countdown(), form);
  login.focus();
}

async function doLogin(loginRaw, password) {
  const l = normLogin(loginRaw);
  const rec = DATA.people.find((p) => p.login === l);
  if (!rec) return false;
  const pl = await open(l, password, rec);
  if (!pl) return false;
  me = { login: l, name: pl.name, target: pl.target, admin: !!pl.admin };
  ss.set("santa:session", JSON.stringify({ l, p: password }));
  homeView();
  return true;
}

function logout() {
  ss.del("santa:session");
  me = null;
  loginView();
}

function topbar() {
  return h("div", { class: "topbar" }, h("div", { class: "who" }, avatar(me.name, 40), h("span", { text: me.name.split(/[ (]/)[0] })), h("button", { class: "btn ghost", onclick: logout, text: "Вийти" }));
}

function homeView() {
  const drawn = ls.get(skey("drawn")) === "1";
  drawn ? drawnView() : wheelView();
}

function wheelView() {
  const names = DATA.names.filter((n) => n !== me.name);
  const wheel = mountWheel(names, me.target, () => {
    ls.set(skey("drawn"), "1");
    ls.set(skey("revealed"), "1");
    confetti();
    setTimeout(drawnView, 1800);
  });
  const btn = h("button", { class: "btn", text: "🎡 Крутити колесо!", onclick: () => { btn.disabled = true; btn.textContent = "Крутиться… 🤞"; wheel.spin(); } });
  show(
    topbar(),
    ...head("Дізнайся, кому ти будеш Сантою"),
    countdown(),
    h("div", { class: "card" }, wheel.el, btn),
    h("p", { class: "muted", style: "text-align:center", text: "Результат запам'ятається на цьому пристрої. Нікому не показуй 🤫" })
  );
}

function drawnView() {
  const revealed = ls.get(skey("revealed")) === "1";
  const targetEl = h("div", {}, h("div", { class: "target", text: short(me.target) }), h("div", { class: "nick", text: nick(me.target) }));
  const hint = h("div", { class: "hint" });
  const box = h("div", { class: "reveal-box" + (revealed ? "" : " blurred") }, h("div", { class: "label", text: "Ти даруєш подарунок для:" }), avatar(me.target, 120), targetEl, hint);
  const sync = () => {
    const open = !box.classList.contains("blurred");
    hint.textContent = open ? "тапни, щоб сховати" : "тапни, щоб показати";
    ls.set(skey("revealed"), open ? "1" : "0");
  };
  sync();
  box.addEventListener("click", () => { box.classList.toggle("blurred"); sync(); });

  const buttons = [
    h("button", { class: "btn green", text: "🎭 Хто дарує мені?", onclick: () => gagView(Math.floor(Math.random() * GAGS.length)) }),
    h("button", { class: "btn ghost", text: "😂 Анекдоти", onclick: () => jokesView() }),
    h("button", { class: "btn ghost", text: "🎮 Міні-гра", onclick: gameView }),
    h("button", { class: "btn ghost", text: "🎡 Показати колесо ще раз", onclick: replayView }),
  ];
  if (me.admin) buttons.push(h("button", { class: "btn ghost", text: "🛠 Адмінка", onclick: adminView }));

  show(topbar(), ...head("Ти вже все знаєш 😉"), countdown(), h("div", { class: "card" }, box), h("div", { class: "card" }, buttons));
}

function replayView() {
  const names = DATA.names.filter((n) => n !== me.name);
  const wheel = mountWheel(names, me.target, () => { btn.disabled = false; btn.textContent = "🔁 Ще раз"; });
  const btn = h("button", { class: "btn", text: "🎡 Крутнути", onclick: () => { btn.disabled = true; wheel.spin(); } });
  const back = h("button", { class: "btn ghost", text: "← Назад", onclick: drawnView });
  show(topbar(), ...head("Просто для кайфу"), h("div", { class: "card" }, wheel.el, btn, back));
}

function gagView(i) {
  const cnt = (Number(ls.get(skey("gagcount"))) || 0) + 1;
  ls.set(skey("gagcount"), String(cnt));
  if (cnt % 4 === 0 && cfg.rickUrl) window.open(cfg.rickUrl, "_blank", "noopener");
  const [title, text] = GAGS[i % GAGS.length];
  const gifs = cfg.gagGifs || [];
  let visual;
  if (gifs.length) {
    visual = h("img", { src: gifs[Math.floor(Math.random() * gifs.length)], alt: "" });
    visual.addEventListener("error", () => visual.replaceWith(h("div", { class: "big", text: "🤡" })));
  } else {
    visual = h("div", { class: "big", text: ["🤡", "😜", "🦌", "🧌"][i % 4] });
  }
  show(
    topbar(),
    h("div", { class: "card gag" }, visual, h("h2", { text: title }), h("p", { text }),
      h("button", { class: "btn green", text: "Ну ще раз спробую 😤", onclick: () => gagView(i + 1 + Math.floor(Math.random() * (GAGS.length - 1))) }),
      h("button", { class: "btn ghost", text: "← Назад", onclick: drawnView }))
  );
}

function jokesView(idx) {
  let cur = idx ?? Math.floor(Math.random() * JOKES.length);
  const box = h("div", { class: "joke", text: JOKES[cur] });
  const next = () => { cur = (cur + 1 + Math.floor(Math.random() * Math.max(1, JOKES.length - 1))) % JOKES.length; box.textContent = JOKES[cur]; };
  show(topbar(), ...head("Анекдоти"), h("div", { class: "card" }, box,
    h("button", { class: "btn green", text: "🤣 Ще один", onclick: next }),
    h("button", { class: "btn ghost", text: "← Назад", onclick: drawnView })));
}

function gameView() {
  const host = h("div");
  const stop = startGame(host, { bestKey: skey("best") });
  show(topbar(), ...head("Лови подарунки!"), h("div", { class: "card" }, host,
    h("button", { class: "btn ghost", text: "← Назад", onclick: () => { stop(); drawnView(); } })));
}

function adminView() {
  const reset = h("button", { class: "btn ghost", text: "🧹 Скинути стан на цьому пристрої", onclick: () => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("santa:")) ls.del(k);
    adminView.note.textContent = "Скинуто: колесо знову доступне.";
  } });
  adminView.note = h("p", { class: "muted" });
  show(
    topbar(),
    ...head("Панель організатора"),
    h("div", { class: "card" }, h("h2", { text: "Учасники (" + DATA.names.length + ")" }), h("ul", { class: "admin-list" }, DATA.names.map((n) => h("li", { text: n }))),
      h("p", { class: "muted", text: "Хто кому дарує — тут не показується, навіть тобі 😎" })),
    h("div", { class: "card" }, h("h2", { text: "Перезапуск жеребкування" }),
      h("p", { class: "muted", text: "На GitHub Pages сайт не може змінювати файли, тому перезапуск робиться на твоєму комп'ютері:" }),
      h("pre", { text: "npm run generate\ngit add docs/users.json\ngit commit -m \"new draw\"\ngit push" }),
      h("p", { class: "muted", text: "Після цього в усіх автоматично скидається «вже витягнув» (новий drawId), і всі крутять колесо заново. Нові дані для входу — у credentials.local.txt." })),
    h("div", { class: "card" }, h("h2", { text: "Цей пристрій" }), reset, adminView.note,
      h("button", { class: "btn ghost", text: "← Назад", onclick: drawnView }))
  );
}

/* ---------- старт ---------- */
async function boot() {
  initGarland();
  initSnow();
  try {
    const r = await fetch("users.json", { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    DATA = await r.json();
  } catch {
    show(...head("Ой!"), h("div", { class: "card" }, h("p", { text: "Не вдалось завантажити users.json. Якщо відкриваєш локально — запусти npm start і зайди на http://localhost:8080." })));
    return;
  }
  const saved = ss.get("santa:session");
  if (saved) {
    try {
      const { l, p } = JSON.parse(saved);
      if (await doLogin(l, p)) return;
    } catch {}
    ss.del("santa:session");
  }
  loginView();
}
boot();
