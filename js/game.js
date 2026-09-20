/* ===== GACHA LIFE — engine ===== */
"use strict";

const SAVE_KEY = "gachalife_v1";
const OFFLINE_CAP = 8 * 3600; // 秒

/* ---------- state ---------- */
function freshState() {
  return {
    gems: 3000,
    dust: 0,
    owned: {},              // id -> count
    pityCount: 0,           // 最後のSSR以上からの連続回数
    lastTs: Date.now(),
    freeTimer: 300,         // 無料枠までの残り秒
    ach: {},                // id -> true
    seenChangelog: null,
    bonusLuck: 0,           // 星屑ショップで買える確率ブースト(0-... 小さめ)
    stats: {
      pulls: 0, freePulls: 0, dupes: 0,
      gemsSpent: 0, dustEarned: 0,
      best: null,            // 最高レア item id
      byR: { N: 0, R: 0, SR: 0, SSR: 0, UR: 0, LR: 0 },
    },
    flags: {
      ssr3: false, ssr5: false, pityHit: false, freeSSR: false,
      shopUsed: false, offlineClaimed: false,
    },
    feed: [],               // 最近のピック {id, r, t}
    settings: { effects: true, sound: true, skipAnim: false },
  };
}
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const d = JSON.parse(raw);
    const base = freshState();
    // 浅いマージ + ネストは個別に
    Object.assign(base, d);
    base.stats = Object.assign(freshState().stats, d.stats || {});
    base.stats.byR = Object.assign({ N:0,R:0,SR:0,SSR:0,UR:0,LR:0 }, (d.stats && d.stats.byR) || {});
    base.flags = Object.assign(freshState().flags, d.flags || {});
    base.settings = Object.assign(freshState().settings, d.settings || {});
    base.owned = d.owned || {};
    base.feed = d.feed || [];
    return base;
  } catch (e) {
    console.warn("load failed", e);
    return freshState();
  }
}
function save() {
  S.lastTs = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}

/* ---------- derived ---------- */
function completionBonus() {
  // コンプ率に応じた放置ジェムボーナス
  return ownedCount(S) * 0.15;
}
function gemsPerSec() {
  const ri = rankIndex(S.stats.pulls);
  return +(1 + ri * 0.7 + completionBonus() + characterIncome(S)).toFixed(2);
}

/* ---------- gacha core ---------- */
function rollRarity(pity) {
  // ソフト天井: PITY_SOFT以降、SSR確率を段階的に上げる
  let w = { ...RARITIES };
  let ssrW = RARITIES.SSR.weight + S.bonusLuck;
  let urW = RARITIES.UR.weight + S.bonusLuck * 0.15;
  let lrW = RARITIES.LR.weight + S.bonusLuck * 0.03;
  if (pity >= PITY_SOFT) {
    const over = pity - PITY_SOFT + 1;      // 1..20
    ssrW += over * 0.03;                    // 最大 +0.6
  }
  if (pity >= PITY_HARD - 1) {
    // 次の1回で確定
    return pickWeighted({ SSR: ssrW, UR: urW, LR: lrW });
  }
  const rest = 1 - (ssrW + urW + lrW);
  const nrsr = RARITIES.N.weight + RARITIES.R.weight + RARITIES.SR.weight;
  const scale = rest / nrsr;
  return pickWeighted({
    N: RARITIES.N.weight * scale,
    R: RARITIES.R.weight * scale,
    SR: RARITIES.SR.weight * scale,
    SSR: ssrW, UR: urW, LR: lrW,
  });
}
function pickWeighted(map) {
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  let x = Math.random() * total;
  for (const k of RARITY_ORDER) {
    if (map[k] == null) continue;
    if ((x -= map[k]) <= 0) return k;
  }
  return "N";
}
function pickItem(r) {
  const pool = ITEMS.filter(it => it.r === r);
  return pool[Math.floor(Math.random() * pool.length)];
}
function rarityRank(r) { return RARITY_ORDER.indexOf(r); }

// 1回分の抽選。owned等の更新も行い、結果オブジェクトを返す
function doOnePull(isFree) {
  const r = rollRarity(S.pityCount);
  const item = pickItem(r);
  const wasPity = S.pityCount >= PITY_HARD - 1;

  S.stats.pulls++;
  S.stats.byR[r]++;
  if (isFree) { S.stats.freePulls++; }

  if (rarityRank(r) >= rarityRank("SSR")) {
    S.pityCount = 0;
    if (isFree) S.flags.freeSSR = true;
    if (wasPity) { S.flags.pityHit = true; }
  } else {
    S.pityCount++;
  }

  const isNew = !S.owned[item.id];
  if (isNew) {
    S.owned[item.id] = 1;
  } else {
    S.owned[item.id]++;
    S.stats.dupes++;
    const d = DUST_BY_RARITY[r];
    S.dust += d;
    S.stats.dustEarned += d;
  }

  if (!S.stats.best || rarityRank(r) > rarityRank(ITEM_BY_ID[S.stats.best].r)) {
    S.stats.best = item.id;
  }

  const rec = { id: item.id, r, new: isNew, pity: wasPity };
  S.feed.unshift({ id: item.id, r, t: Date.now() });
  if (S.feed.length > 40) S.feed.pop();
  return rec;
}

function canSingle() { return S.gems >= COSTS.single; }
function canTen() { return S.gems >= COSTS.ten; }

function pullSingle(isFree) {
  if (!isFree) {
    if (!canSingle()) return toast("ジェムが足りない…");
    S.gems -= COSTS.single;
    S.stats.gemsSpent += COSTS.single;
  }
  const rec = doOnePull(!!isFree);
  afterPull([rec], isFree ? "free" : "single");
}

function pullTen() {
  if (!canTen()) return toast("ジェムが足りない…");
  S.gems -= COSTS.ten;
  S.stats.gemsSpent += COSTS.ten;
  const recs = [];
  for (let i = 0; i < 10; i++) recs.push(doOnePull(false));
  // 10連保証: R以上が1つも無ければ最後を R に格上げ
  if (!recs.some(x => rarityRank(x.r) >= rarityRank("R"))) {
    const last = recs[recs.length - 1];
    // 巻き戻し
    S.stats.byR[last.r]--;
    if (S.owned[last.id] > 1) { S.owned[last.id]--; S.stats.dupes--; }
    else delete S.owned[last.id];
    const item = pickItem("R");
    S.stats.byR.R++;
    const isNew = !S.owned[item.id];
    if (isNew) S.owned[item.id] = 1; else { S.owned[item.id]++; S.stats.dupes++; S.dust += DUST_BY_RARITY.R; S.stats.dustEarned += DUST_BY_RARITY.R; }
    recs[recs.length - 1] = { id: item.id, r: "R", new: isNew, pity: false };
    S.feed[0] = { id: item.id, r: "R", t: Date.now() };
  }
  const ssrCount = recs.filter(x => rarityRank(x.r) >= rarityRank("SSR")).length;
  if (ssrCount >= 3) S.flags.ssr3 = true;
  if (ssrCount >= 5) S.flags.ssr5 = true;
  afterPull(recs, "ten");
}

function afterPull(recs, mode) {
  checkAch();
  save();
  playReveal(recs, mode);
}

/* ---------- achievements ---------- */
function checkAch() {
  let unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (!S.ach[a.id] && a.c(S)) { S.ach[a.id] = true; unlocked.push(a); }
  }
  for (const a of unlocked) toast("🏆 実績: " + a.n);
  return unlocked;
}

/* ---------- shop ---------- */
const SHOP = [
  { id: "gems1",  t: "ジェム 1,000",       s: "星屑 250 → ジェム 1,000",  cost: 250,  act: () => { S.gems += 1000; } },
  { id: "gems2",  t: "ジェム 6,000",       s: "星屑 1,200 → ジェム 6,000（お得）", cost: 1200, act: () => { S.gems += 6000; } },
  { id: "pity",   n: true, t: "天井カウント +30", s: "星屑 800 → pityCountを+30進める", cost: 800, act: () => { S.pityCount = Math.min(PITY_HARD - 1, S.pityCount + 30); } },
  { id: "luck",   t: "永続・確率ブースト", s: "星屑 3,000 → SSR+以上の確率をわずかに永続UP", cost: 3000, act: () => { S.bonusLuck += 0.004; } },
  { id: "wish",   t: "祈願（ランダムSSR確定1回）", s: "星屑 5,000 → SSR以上を1体確定入手", cost: 5000, act: () => {
      const r = pickWeighted({ SSR: RARITIES.SSR.weight, UR: RARITIES.UR.weight, LR: RARITIES.LR.weight });
      const item = pickItem(r);
      S.stats.pulls++; S.stats.byR[r]++; S.pityCount = 0;
      const isNew = !S.owned[item.id];
      if (isNew) S.owned[item.id] = 1; else { S.owned[item.id]++; S.stats.dupes++; S.dust += DUST_BY_RARITY[r]; S.stats.dustEarned += DUST_BY_RARITY[r]; }
      if (!S.stats.best || rarityRank(r) > rarityRank(ITEM_BY_ID[S.stats.best].r)) S.stats.best = item.id;
      S.feed.unshift({ id: item.id, r, t: Date.now() });
      setTimeout(() => playReveal([{ id: item.id, r, new: isNew, pity: false }], "single"), 50);
    } },
];
function buyShop(id) {
  const it = SHOP.find(x => x.id === id);
  if (!it || S.dust < it.cost) return toast("星屑が足りない…");
  S.dust -= it.cost;
  S.flags.shopUsed = true;
  it.act();
  checkAch();
  save();
  render();
  toast("交換した: " + it.t);
}

/* ---------- sound (synthesized, no assets) ---------- */
let actx = null;
function ensureAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function beep(freq, dur, type, delay, gainVal) {
  if (!S.settings.sound) return;
  const ctx = ensureAudio(); if (!ctx) return;
  const t0 = ctx.currentTime + (delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "triangle";
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(gainVal || 0.12, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}
function playChargeSound(ms) {
  if (!S.settings.sound || ms <= 0) return;
  const ctx = ensureAudio(); if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(110, t0);
  osc.frequency.exponentialRampToValueAtTime(660, t0 + ms / 1000);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(0.05, t0 + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + ms / 1000 + 0.05);
}
const RARITY_SOUND = {
  N:   [[440, .10]],
  R:   [[523, .09], [659, .13]],
  SR:  [[523, .09], [659, .09], [784, .18]],
  SSR: [[523, .08], [659, .08], [784, .08], [1047, .3]],
  UR:  [[440, .07], [554, .07], [659, .07], [880, .09], [1175, .38]],
  LR:  [[392, .07], [494, .07], [587, .07], [698, .07], [880, .07], [1175, .09], [1568, .55]],
};
function playRaritySound(r) {
  if (!S.settings.sound) return;
  const seq = RARITY_SOUND[r] || RARITY_SOUND.N;
  let t = 0;
  seq.forEach(([f, d]) => { beep(f, d, "triangle", t, r === "N" ? 0.07 : 0.14); t += d * 0.85; });
}

/* ---------- reveal animation ---------- */
const overlay = document.getElementById("overlay");
let pendingTimers = [];
let finishReveal = null;

function schedule(fn, delay) {
  const id = setTimeout(fn, delay);
  pendingTimers.push(id);
  return id;
}
function clearPending() {
  pendingTimers.forEach(clearTimeout);
  pendingTimers = [];
}

const BUILDUP_MS = { N: 0, R: 0, SR: 220, SSR: 480, UR: 850, LR: 1350 };
const CONFETTI_BASE = { N: 0, R: 0, SR: 35, SSR: 90, UR: 150, LR: 220 };

function playReveal(recs, mode) {
  if (S.settings.skipAnim) { instantFinish(recs); return; }

  const maxRank = Math.max(...recs.map(r => rarityRank(r.r)));
  const topR = RARITY_ORDER[maxRank];
  const topColor = getColor(topR);
  const fx = S.settings.effects;

  overlay.innerHTML = "";
  overlay.classList.remove("shake");
  overlay.classList.add("on");
  overlay.onclick = null;
  clearPending();

  if (fx && maxRank >= rarityRank("UR")) {
    const aura = document.createElement("div");
    aura.className = "lr-aura";
    overlay.appendChild(aura);
  }

  const flashLayer = document.createElement("div");
  flashLayer.className = "flash";
  overlay.appendChild(flashLayer);

  const skipBtn = document.createElement("button");
  skipBtn.className = "skipBtn";
  skipBtn.textContent = "▶▶ スキップ";
  skipBtn.onclick = (e) => { e.stopPropagation(); if (finishReveal) finishReveal(); };
  overlay.appendChild(skipBtn);

  let bodyRendered = false;
  function renderBody() {
    if (bodyRendered) return;
    bodyRendered = true;
    if (recs.length === 1) revealSingle(recs[0], fx);
    else revealTen(recs, fx);
  }

  finishReveal = () => {
    clearPending();
    const capsule = overlay.querySelector(".charge-capsule");
    if (capsule) capsule.remove();
    renderBody();
    overlay.querySelectorAll(".ten-cell").forEach(c => c.classList.add("show"));
    overlay.querySelectorAll(".reveal-single").forEach(c => c.classList.add("show"));
    const sum = overlay.querySelector(".sum");
    if (sum) {
      const news = recs.filter(r => r.new).length;
      const ssr = recs.filter(r => rarityRank(r.r) >= rarityRank("SSR")).length;
      sum.textContent = `NEW ${news}件 ・ SSR以上 ${ssr}件`;
    }
    const hint = overlay.querySelector(".tap-hint");
    if (hint) hint.style.display = "";
    overlay.onclick = closeOverlay;
  };

  const buildupMs = fx ? (BUILDUP_MS[topR] || 0) : 0;

  const detonate = () => {
    doFlash(flashLayer, topColor, maxRank);
    if (fx && maxRank >= rarityRank("SSR")) shakeScreen();
    if (fx) burstConfetti(topColor, topR, maxRank);
    playRaritySound(topR);
    renderBody();
  };

  if (buildupMs > 0) {
    const capsule = document.createElement("div");
    capsule.className = "charge-capsule";
    capsule.style.color = topColor;
    capsule.textContent = "🎰";
    overlay.appendChild(capsule);
    playChargeSound(buildupMs);
    schedule(() => { capsule.remove(); detonate(); }, buildupMs);
  } else {
    detonate();
  }
}

function instantFinish(recs) {
  const topR = RARITY_ORDER[Math.max(...recs.map(r => rarityRank(r.r)))];
  if (recs.length === 1) {
    const it = ITEM_BY_ID[recs[0].id];
    toast(`${recs[0].new ? "NEW " : ""}${it.e} ${it.n} (${recs[0].r})`);
  } else {
    const news = recs.filter(r => r.new).length;
    const ssr = recs.filter(r => rarityRank(r.r) >= rarityRank("SSR")).length;
    toast(`10連結果: NEW ${news}件・SSR以上 ${ssr}件・最高 ${topR}`);
  }
  render();
}

function doFlash(layer, color, maxRank) {
  layer.style.background = `radial-gradient(circle at 50% 45%, ${color}cc, transparent 60%)`;
  const pulses = maxRank >= rarityRank("LR") ? 3 : maxRank >= rarityRank("UR") ? 2 : 1;
  for (let i = 0; i < pulses; i++) {
    layer.animate([{ opacity: 0 }, { opacity: .95 }, { opacity: 0 }], { duration: 550, delay: i * 260, easing: "ease-out" });
  }
}
function shakeScreen() {
  overlay.classList.remove("shake");
  void overlay.offsetWidth;
  overlay.classList.add("shake");
}

function revealSingle(rec, fx) {
  const it = ITEM_BY_ID[rec.id];
  const col = getColor(rec.r);
  const box = document.createElement("div");
  box.className = "reveal-single";
  box.style.color = col;
  box.innerHTML = `
    <div class="em">${it.e}</div>
    <div class="nm" style="color:var(--text)">${it.n}</div>
    <div class="rr">${RARITIES[rec.r].stars} ${rec.r}</div>
    <div class="f">${it.f}</div>
    ${rec.new ? '<div class="isnew">NEW!</div>' : `<div class="isnew" style="color:var(--dim)">＋星屑 ${DUST_BY_RARITY[rec.r]}</div>`}
    ${rec.pity ? '<div class="isnew" style="color:var(--ssr)">天井到達</div>' : ''}
    <div class="tap-hint">タップで閉じる</div>`;
  overlay.appendChild(box);
  requestAnimationFrame(() => box.classList.add("show"));
  schedule(() => { overlay.onclick = closeOverlay; }, 500);
}

function revealTen(recs, fx) {
  const grid = document.createElement("div");
  grid.className = "ten-grid";
  overlay.appendChild(grid);
  const cells = recs.map(rec => {
    const it = ITEM_BY_ID[rec.id];
    const c = document.createElement("div");
    c.className = "ten-cell";
    c.dataset.r = rec.r;
    c.style.position = "relative";
    c.innerHTML = `<div class="em">${it.e}</div><div class="nm">${it.n}</div>
      <div class="rr" style="color:${getColor(rec.r)}">${rec.r}</div>
      ${rec.new ? '<div class="new">NEW</div>' : ''}`;
    grid.appendChild(c);
    return c;
  });
  const sum = document.createElement("div");
  sum.className = "sum";
  overlay.appendChild(sum);
  const hint = document.createElement("div");
  hint.className = "tap-hint";
  hint.textContent = "タップで閉じる";
  hint.style.display = "none";
  overlay.appendChild(hint);

  cells.forEach((c, i) => {
    schedule(() => {
      c.classList.add("show");
      beep(300 + i * 14, 0.05, "square", 0, 0.035);
      const rk = rarityRank(recs[i].r);
      if (rk >= rarityRank("SSR")) {
        c.animate([{ boxShadow: `0 0 0 ${getColor(recs[i].r)}` }, { boxShadow: `0 0 32px ${getColor(recs[i].r)}` }, { boxShadow: `0 0 10px ${getColor(recs[i].r)}` }], { duration: 600 });
        if (fx) shakeScreen();
      }
    }, 130 * i);
  });
  schedule(() => {
    const news = recs.filter(r => r.new).length;
    const ssr = recs.filter(r => rarityRank(r.r) >= rarityRank("SSR")).length;
    sum.textContent = `NEW ${news}件 ・ SSR以上 ${ssr}件`;
    hint.style.display = "";
    overlay.onclick = closeOverlay;
  }, 130 * cells.length + 200);
}

function closeOverlay() {
  overlay.classList.remove("on", "shake");
  overlay.onclick = null;
  clearPending();
  finishReveal = null;
  render();
}

function getColor(r) { return RARITIES[r].color; }

function burstConfetti(color, topR, maxRank) {
  const base = CONFETTI_BASE[topR] || 0;
  if (!base) return;
  const waves = maxRank >= rarityRank("LR") ? 3 : maxRank >= rarityRank("UR") ? 2 : 1;
  const colors = maxRank >= rarityRank("LR")
    ? ["#ff5d7e", "#ffb43d", "#3dffcf", "#5fa8ff", "#b06bff", "#ffffff"]
    : [color, "#ffffff", "#ffd06b"];
  for (let w = 0; w < waves; w++) {
    schedule(() => spawnConfettiWave(base, colors), w * 240);
  }
}
function spawnConfettiWave(count, colors) {
  for (let i = 0; i < count; i++) {
    const d = document.createElement("div");
    d.className = "confetti";
    d.style.left = Math.random() * 100 + "%";
    d.style.background = colors[i % colors.length];
    d.style.transform = `rotate(${Math.random() * 360}deg)`;
    overlay.appendChild(d);
    const dur = 1200 + Math.random() * 1600;
    d.animate([
      { transform: `translate(0,0) rotate(0)`, opacity: 1 },
      { transform: `translate(${(Math.random() - .5) * 300}px, ${window.innerHeight + 40}px) rotate(${Math.random() * 900}deg)`, opacity: .9 },
    ], { duration: dur, easing: "cubic-bezier(.2,.6,.4,1)" });
    setTimeout(() => d.remove(), dur);
  }
}

/* ---------- toast ---------- */
const toastWrap = document.getElementById("toasts");
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  toastWrap.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

/* ---------- render ---------- */
let currentTab = "gacha";
let colFilter = "ALL";

function fmt(n) { return Math.floor(n).toLocaleString("ja-JP"); }

function render() {
  // resources
  document.getElementById("gems").textContent = fmt(S.gems);
  document.getElementById("dust").textContent = fmt(S.dust);
  document.getElementById("gemrate").textContent = "+" + gemsPerSec() + "/秒";

  // rank
  const ri = rankIndex(S.stats.pulls);
  const cur = RANKS[ri], next = RANKS[ri + 1];
  document.getElementById("rankName").textContent = `Lv.${ri + 1} ${cur[1]}`;
  if (next) {
    const span = next[0] - cur[0];
    const prog = S.stats.pulls - cur[0];
    document.getElementById("rankProg").textContent = `${fmt(prog)} / ${fmt(span)} 回`;
    document.getElementById("rankFill").style.width = Math.min(100, prog / span * 100) + "%";
  } else {
    document.getElementById("rankProg").textContent = "MAX";
    document.getElementById("rankFill").style.width = "100%";
  }

  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === currentTab));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("on", v.id === "view-" + currentTab));

  renderGacha();
  if (currentTab === "collection") renderCollection();
  if (currentTab === "ach") renderAch();
  if (currentTab === "shop") renderShop();
  if (currentTab === "stats") renderStats();
}

function renderGacha() {
  document.getElementById("btnSingle").disabled = !canSingle();
  document.getElementById("btnTen").disabled = !canTen();
  const freeReady = S.freeTimer <= 0;
  const bf = document.getElementById("btnFree");
  bf.disabled = !freeReady;
  bf.querySelector("small").textContent = freeReady ? "いつでもOK" : mmss(S.freeTimer) + " 後";

  const p = S.pityCount;
  const el = document.getElementById("pityInfo");
  el.innerHTML = `SSR以上まで 残り <b>${Math.max(0, PITY_HARD - p)}</b> 回で確定` +
    (p >= PITY_SOFT ? `　<span style="color:var(--ssr)">🔥ソフト天井発動中</span>` : "");

  const activeChars = Object.keys(S.owned).length;
  const income = characterIncome(S);
  document.getElementById("incomeInfo").innerHTML =
    `💼 稼働中のキャラ <b>${activeChars}</b> 体　合計収益 <b style="color:var(--acc)">+${income.toFixed(2)}/秒</b>`;

  // odds
  const oc = document.getElementById("odds");
  const ssrW = (RARITIES.SSR.weight + S.bonusLuck) * 100;
  oc.innerHTML = RARITY_ORDER.map(k => {
    let pct = RARITIES[k].weight * 100;
    if (k === "SSR") pct = ssrW;
    return `<div><div class="k" style="color:${RARITIES[k].color}">${k}</div>${pct < 1 ? pct.toFixed(3) : pct.toFixed(1)}%</div>`;
  }).join("");

  // feed
  const fe = document.getElementById("feed");
  if (!S.feed.length) fe.innerHTML = '<div class="line" style="color:var(--dim)">まだ何も引いていない</div>';
  else fe.innerHTML = S.feed.slice(0, 12).map(f => {
    const it = ITEM_BY_ID[f.id];
    return `<div class="line"><span class="tag" style="color:${getColor(f.r)}">${f.r}</span>${it.e} ${it.n}</div>`;
  }).join("");
}

function renderCollection() {
  const total = ITEMS.length, have = ownedCount(S);
  document.getElementById("colCount").textContent = `${have} / ${total} 種 (${(have / total * 100).toFixed(0)}%)`;
  document.querySelectorAll("#colFilters button").forEach(b => b.classList.toggle("on", b.dataset.f === colFilter));
  const list = ITEMS.filter(it => colFilter === "ALL" || it.r === colFilter);
  const g = document.getElementById("colGrid");
  g.innerHTML = list.map(it => {
    const cnt = S.owned[it.id];
    if (!cnt) return `<div class="card locked" data-r="${it.r}"><div class="emoji">${it.e}</div><div class="nm"></div><div class="rr">${it.r}</div></div>`;
    return `<div class="card" data-r="${it.r}" data-id="${it.id}">
      ${cnt > 1 ? `<div class="dupe">×${cnt}</div>` : ""}
      <div class="emoji">${it.e}</div><div class="nm">${it.n}</div>
      <div class="rr">${RARITIES[it.r].stars}</div>
      <div class="income">+${itemIncome(it, cnt).toFixed(2)}/秒</div></div>`;
  }).join("");
  g.querySelectorAll(".card[data-id]").forEach(c => c.onclick = () => openDetail(c.dataset.id));
}

function openDetail(id) {
  const it = ITEM_BY_ID[id];
  const cnt = S.owned[id] || 0;
  const m = document.getElementById("modal");
  m.querySelector(".sheet").style.borderColor = getColor(it.r);
  m.querySelector(".sheet").innerHTML = `
    <div class="big">${it.e}</div>
    <h3>${it.n}</h3>
    <div class="rr" style="color:${getColor(it.r)}">${RARITIES[it.r].stars} ${it.r}</div>
    <div class="f">「${it.f}」</div>
    <div class="meta">所持数 ×${cnt}　/　重複時の星屑 +${DUST_BY_RARITY[it.r]}</div>
    <div class="meta">収益 <b style="color:var(--acc)">+${itemIncome(it, cnt).toFixed(2)}/秒</b></div>
    <button onclick="document.getElementById('modal').classList.remove('on')">とじる</button>`;
  m.classList.add("on");
}

function renderAch() {
  const done = Object.keys(S.ach).length;
  document.getElementById("achCount").textContent = `${done} / ${ACHIEVEMENTS.length}`;
  document.getElementById("achList").innerHTML = ACHIEVEMENTS.map(a =>
    `<div class="a ${S.ach[a.id] ? "done" : ""}"><div class="n">${a.n}</div><div class="d">${a.d}</div></div>`
  ).join("");
}

function renderShop() {
  document.getElementById("shopDust").textContent = fmt(S.dust);
  document.getElementById("shopList").innerHTML = SHOP.map(it =>
    `<div class="shopitem"><div class="info"><div class="t">${it.t}</div><div class="s">${it.s}</div></div>
     <button ${S.dust < it.cost ? "disabled" : ""} onclick="buyShop('${it.id}')">★ ${fmt(it.cost)}</button></div>`
  ).join("");
}

function renderStats() {
  const s = S.stats;
  const best = s.best ? ITEM_BY_ID[s.best] : null;
  const g = document.getElementById("statGrid");
  const rows = [
    ["累計ガチャ回数", fmt(s.pulls)],
    ["無料枠で引いた回数", fmt(s.freePulls)],
    ["重複を引いた回数", fmt(s.dupes)],
    ["消費した総ジェム", fmt(s.gemsSpent)],
    ["獲得した総星屑", fmt(s.dustEarned)],
    ["現在の天井カウント", `${S.pityCount} / ${PITY_HARD}`],
    ["稼働中のキャラ数", fmt(ownedCount(S))],
    ["キャラからの合計収益", "+" + characterIncome(S).toFixed(2) + "/秒"],
    ["最高レア", best ? `${best.e} ${best.n} (${best.r})` : "—"],
    ["N 排出数", fmt(s.byR.N)],
    ["R 排出数", fmt(s.byR.R)],
    ["SR 排出数", fmt(s.byR.SR)],
    ["SSR 排出数", fmt(s.byR.SSR)],
    ["UR 排出数", fmt(s.byR.UR)],
    ["LR 排出数", fmt(s.byR.LR)],
    ["永続確率ブースト", "+" + (S.bonusLuck * 100).toFixed(2) + "%"],
  ];
  g.innerHTML = rows.map(([k, v]) => `<div><div class="v">${v}</div><div class="k">${k}</div></div>`).join("");
}

function mmss(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ---------- loop ---------- */
let acc = 0;
function tick(dt) {
  S.gems += gemsPerSec() * dt;
  S.freeTimer -= dt;
  if (S.freeTimer < -1) S.freeTimer = 0;
  acc += dt;
  if (acc >= 3) { acc = 0; checkAch(); save(); }
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(1, (now - last) / 1000);
  last = now;
  tick(dt);
  // 軽量更新
  document.getElementById("gems").textContent = fmt(S.gems);
  document.getElementById("gemrate").textContent = "+" + gemsPerSec() + "/秒";
  if (currentTab === "gacha") {
    document.getElementById("btnSingle").disabled = !canSingle();
    document.getElementById("btnTen").disabled = !canTen();
    const bf = document.getElementById("btnFree");
    const ready = S.freeTimer <= 0;
    bf.disabled = !ready;
    bf.querySelector("small").textContent = ready ? "いつでもOK" : mmss(S.freeTimer) + " 後";
  }
  requestAnimationFrame(frame);
}

/* ---------- offline ---------- */
function handleOffline() {
  const elapsed = Math.min(OFFLINE_CAP, (Date.now() - (S.lastTs || Date.now())) / 1000);
  if (elapsed > 60) {
    const earned = Math.floor(gemsPerSec() * elapsed);
    S.gems += earned;
    S.freeTimer = Math.max(0, S.freeTimer - elapsed);
    S.flags.offlineClaimed = true;
    setTimeout(() => toast(`おかえり。放置報酬 ${fmt(earned)} ジェム (${mmss(elapsed)})`), 400);
  }
}

/* ---------- init ---------- */
function init() {
  handleOffline();

  document.querySelectorAll(".tabs button").forEach(b => {
    b.onclick = () => { currentTab = b.dataset.tab; render(); };
  });
  document.getElementById("btnSingle").onclick = () => pullSingle(false);
  document.getElementById("btnTen").onclick = () => pullTen();
  document.getElementById("btnFree").onclick = () => {
    if (S.freeTimer > 0) return;
    S.freeTimer = 300;
    pullSingle(true);
  };
  document.querySelectorAll("#colFilters button").forEach(b => {
    b.onclick = () => { colFilter = b.dataset.f; renderCollection(); };
  });
  document.getElementById("modal").onclick = (e) => {
    if (e.target.id === "modal") e.target.classList.remove("on");
  };
  document.getElementById("resetBtn").onclick = () => {
    if (confirm("本当に全データを消して最初から？")) {
      localStorage.removeItem(SAVE_KEY);
      S = freshState();
      render();
      toast("リセットした。人生やり直し。");
    }
  };

  // settings
  const chkEffects = document.getElementById("setEffects");
  const chkSound = document.getElementById("setSound");
  const chkSkip = document.getElementById("setSkip");
  chkEffects.checked = S.settings.effects;
  chkSound.checked = S.settings.sound;
  chkSkip.checked = S.settings.skipAnim;
  chkEffects.onchange = () => { S.settings.effects = chkEffects.checked; save(); };
  chkSound.onchange = () => {
    S.settings.sound = chkSound.checked;
    save();
    if (chkSound.checked) beep(660, 0.12, "triangle", 0, 0.15);
  };
  chkSkip.onchange = () => { S.settings.skipAnim = chkSkip.checked; save(); };

  // version
  document.getElementById("ver").textContent = "v" + VERSION;
  document.getElementById("changelogBtn").onclick = () => {
    alert(CHANGELOG.map(c => `v${c.v} (${c.d})\n` + c.notes.map(n => " ・" + n).join("\n")).join("\n\n"));
  };

  render();
  checkAch();
  requestAnimationFrame(frame);
  window.addEventListener("beforeunload", save);
  setInterval(save, 10000);
}
window.buyShop = buyShop;
init();
