// Міні-гра «Лови подарунки»: рухай Санту, лови коробки, обминай каміння. 30 секунд.
export function startGame(host, { bestKey }) {
  const W = Math.min(380, innerWidth - 56), H = Math.round(W * 1.25);
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.cssText = `width:${W}px;height:${H}px;border-radius:16px;touch-action:none;background:linear-gradient(#0b2a52,#143e73);display:block;margin:0 auto;`;
  const hud = document.createElement("div");
  hud.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin:0 auto 8px;max-width:" + W + "px;font-weight:800;font-size:1.15rem;";
  host.append(hud, canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const getBest = () => { try { return Number(localStorage.getItem(bestKey)) || 0; } catch { return 0; } };
  let best = getBest();
  const santa = { x: W / 2, w: 44 };
  let items = [], score = 0, timeLeft = 30, last = performance.now(), spawn = 0, state = "ready", raf = 0, newRecord = false;
  const gifts = ["🎁", "🎁", "🎁", "🍬", "⭐"]; // ⭐ = +3, решта +1
  let pops = [];

  const moveTo = (cx) => { const r = canvas.getBoundingClientRect(); santa.x = Math.max(santa.w / 2, Math.min(W - santa.w / 2, cx - r.left)); };
  canvas.addEventListener("pointermove", (e) => moveTo(e.clientX));
  canvas.addEventListener("pointerdown", (e) => moveTo(e.clientX));
  const onKey = (e) => {
    if (e.key === "ArrowLeft") santa.x = Math.max(santa.w / 2, santa.x - 28);
    if (e.key === "ArrowRight") santa.x = Math.min(W - santa.w / 2, santa.x + 28);
  };
  addEventListener("keydown", onKey);
  canvas.addEventListener("click", () => { if (state !== "play") begin(); });

  function begin() { items = []; pops = []; score = 0; timeLeft = 30; spawn = 0; newRecord = false; state = "play"; last = performance.now(); }
  function finish() {
    state = "over";
    if (score > best) { best = score; newRecord = true; try { localStorage.setItem(bestKey, String(best)); } catch {} }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === "play") {
      timeLeft -= dt; spawn -= dt;
      if (spawn <= 0) {
        const coal = Math.random() < 0.2;
        items.push({ x: 20 + Math.random() * (W - 40), y: -20, v: 110 + Math.random() * 130 + (30 - timeLeft) * 4, e: coal ? "💩" : gifts[Math.floor(Math.random() * gifts.length)], coal });
        spawn = 0.35 + Math.random() * 0.35;
      }
      for (const it of items) it.y += it.v * dt;
      for (const p of pops) { p.y -= 50 * dt; p.t -= dt; }
      pops = pops.filter((p) => p.t > 0);
      items = items.filter((it) => {
        const hit = it.y > H - 62 && it.y < H - 14 && Math.abs(it.x - santa.x) < santa.w / 2 + 6;
        if (hit) {
          const d = it.coal ? -2 : it.e === "⭐" ? 3 : 1;
          score = Math.max(0, score + d);
          pops.push({ x: santa.x, y: H - 70, t: 0.7, txt: (d > 0 ? "+" : "") + d, bad: d < 0 });
          return false;
        }
        return it.y < H + 30;
      });
      if (timeLeft <= 0) { timeLeft = 0; finish(); }
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "26px serif";
    for (const it of items) ctx.fillText(it.e, it.x, it.y);
    ctx.font = "44px serif";
    ctx.fillText("🎅", santa.x, H - 36);
    ctx.font = "800 20px 'Trebuchet MS', sans-serif";
    for (const p of pops) { ctx.fillStyle = p.bad ? "#ff6b6b" : "#9dff9d"; ctx.fillText(p.txt, p.x, p.y); }
    hud.innerHTML = `<span>🎁 Очки: <b style="color:#ffd166;font-size:1.5rem">${score}</b></span><span>⏱ ${Math.ceil(timeLeft)}с &nbsp; 🏆 ${best}</span>`;
    if (state !== "play") {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, H / 2 - 60, W, 120);
      ctx.fillStyle = "#ffd166";
      ctx.textAlign = "center";
      ctx.font = "800 22px 'Trebuchet MS', sans-serif";
      ctx.fillText(state === "ready" ? "Лови подарунки! 🎁" : `Кінець! Рахунок: ${score}`, W / 2, H / 2 - 26);
      ctx.fillStyle = "#fff";
      ctx.font = "600 14px 'Trebuchet MS', sans-serif";
      ctx.fillText(state === "ready" ? "🎁 +1   ⭐ +3   💩 −2   (рухай мишкою/пальцем)" : newRecord ? "Новий рекорд! 🔥" : "", W / 2, H / 2 + 4);
      ctx.fillText("Тапни, щоб " + (state === "ready" ? "почати" : "зіграти ще"), W / 2, H / 2 + 32);
    }
  }

  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); removeEventListener("keydown", onKey); };
}
