/* =====================================================================
 * 時間軸引擎與結果
 * at(時間, fn) 排程事件；setCast 顯示讀條；setPlan 指定 NPC 目標位置；
 * fail／finish 結束這一輪並顯示結果。
 * ===================================================================== */

/* ---------- 設定 ---------- */
let cfg = {};
const VAR_IDS = ['targetVar', 'lightVar', 'dollVar'];
function readCfg() {
  cfg = { mode: $('mode').value, role: $('role').value, hintMe: $('hintMe').checked, auto: $('autoMe').checked };
  VAR_IDS.forEach((id) => (cfg[id] = $(id).value));
}
// 依設定（或測試掛鉤 window.__force_<id>）決定變體
function variant(id, opts) {
  const forced = window['__force_' + id];
  if (forced !== undefined) return forced;
  const v = cfg[id];
  return v && v !== 'rand' ? v : pick(opts);
}
// 點名：設定「一定是我」時優先點玩家
function pickTarget(exclude = []) {
  const pool = members.filter((m) => !exclude.includes(m));
  if (variant('targetVar', ['rand']) === 'me' && pool.includes(player)) return player;
  return pick(pool);
}
document.querySelectorAll('#panel select,#panel input').forEach((el) =>
  el.addEventListener('change', () => {
    el.blur();
    if (state !== 'running') {
      readCfg();
      placeIdle();
    }
  }),
);
if (innerWidth < 720) $('panel').open = false;

let stats = { tries: 0, clears: 0 };
try {
  const s = JSON.parse(localStorage.getItem('frostmoon-stats') || 'null');
  if (s) stats = s;
} catch (e) {}
function saveStats() {
  try {
    localStorage.setItem('frostmoon-stats', JSON.stringify(stats));
  } catch (e) {}
}

/* ---------- 時間軸引擎 ---------- */
let state = 'idle',
  t = 0,
  events = [],
  ticks = [],
  cast = null,
  advice = '',
  planFn = null,
  finishNote = '',
  tl = [];
function at(time, fn) {
  events.push({ at: time, fn });
  events.sort((a, b) => a.at - b.at);
}
function setCast(name, sub, len) {
  cast = { name, sub, start: t, len };
}
function setPlan(fn, delay = 0.3) {
  planFn = fn;
  members.forEach((m) => (m.reactAt = t + delay + Math.random() * 0.3));
}
// 每幀檢查（回傳 true 就移除）
function tick(fn) {
  ticks.push(fn);
}
function tlMark(i, cls) {
  tl.forEach((e, j) => {
    if (j === i) e.cls = cls;
    else if (cls === 'now' && e.cls === 'now') e.cls = 'ok';
  });
  renderTl();
}
function renderTl() {
  $('tlList').innerHTML = tl
    .map((e, i) => `<div class="ev ${e.cls || ''}"><i>${i + 1}</i><span>${e.name}</span></div>`)
    .join('');
}

// 目前選的練習範圍是哪隻王（閒置時顯示對應場地）
function modeBoss() {
  const m = cfg.mode;
  if (m === 'A' || m === 'B') return m;
  const s = STEPS.find((x) => x.id === m);
  return s ? s.boss : 'A';
}
function placeIdle() {
  buildMembers(cfg.role);
  members.forEach((m) => {
    const p = IDLE[m.id];
    m.x = m.tx = p.x;
    m.z = m.tz = p.z;
  });
  if (state !== 'running') {
    setBossScene(modeBoss());
    bossHome();
  }
  camYaw = 0;
  updateMeHud();
}

// 每個機制開始前：恢復人形、解除監牢與暈眩、清掉頭上標籤
function resetMembersForStep() {
  skillHook = {};
  members.forEach((m) => {
    setForm(m, 'human');
    m.wantForm = null;
    m.trapped = m.carriedBy = m.carrying = null;
    m.stun = 0;
    m.aim = null;
    m.face = { x: 0, z: -1 };
    setTag(m, '');
  });
}
function resetWorld() {
  clearFx();
  clearEnemies();
  clearLights();
  clearSwords();
  clearPuddles();
  setDark(false);
  bossHome();
}

function start() {
  readCfg();
  events = [];
  ticks = [];
  cast = null;
  advice = '';
  finishNote = '';
  planFn = null;
  t = 0;
  state = 'running';
  resetWorld();
  placeIdle();
  $('banner').hidden = true;
  $('cast').hidden = true;
  $('panel').open = false;
  const list =
    cfg.mode === 'all' ? STEPS : STEPS.filter((x) => x.id === cfg.mode || x.boss === cfg.mode);
  tl = list.map((x) => ({ name: x.name }));
  $('timeline').hidden = list.length < 2;
  setBossScene(list[0].boss);
  let i = 0;
  const go = () => {
    if (state !== 'running') return;
    if (i >= list.length) return finish(list.length > 1 ? '全部完成' : list[0].name + ' 完成');
    // 換王：清場、大家回到開場位置
    if (list[i].boss !== bossKey) {
      resetWorld();
      setBossScene(list[i].boss);
      members.forEach((m) => {
        const p = IDLE[m.id];
        m.x = m.tx = p.x;
        m.z = m.tz = p.z;
      });
    }
    resetMembersForStep();
    ticks = []; // 上一個機制殘留的每幀檢查不帶到下一個
    tlMark(i, 'now');
    list[i].fn(() => {
      tlMark(i, 'ok');
      i++;
      cast = null;
      at(t + 1.5, go);
    });
  };
  at(0.8, go);
  renderTl();
}

/* ---------- 結果 ---------- */
function fail(title, reasons) {
  if (state !== 'running') return;
  state = 'done';
  stats.tries++;
  saveStats();
  fx.forEach((f) => (f.fade = false));
  const i = tl.findIndex((e) => e.cls === 'now');
  if (i >= 0) tlMark(i, 'ng');
  const b = $('banner');
  b.className = 'hud box ng';
  b.hidden = false;
  b.innerHTML = `<h2>${title} 失敗</h2>${reasons.map((r) => `<p>${r}</p>`).join('')}<p class="sub">按 Enter 再來一次</p>`;
  $('cast').hidden = true;
  updateMeHud();
}
function finish(title) {
  if (state !== 'running') return;
  state = 'done';
  stats.tries++;
  stats.clears++;
  saveStats();
  const b = $('banner');
  b.className = 'hud box ok';
  b.hidden = false;
  b.innerHTML = `<h2>${title}</h2>${finishNote ? `<p>${finishNote}</p>` : ''}<p class="sub">按 Enter 再來一次</p>`;
  $('cast').hidden = true;
  members.forEach((m) => setTag(m, ''));
  updateMeHud();
}

/* ---------- 共用判定小工具 ---------- */
// 判定：對每個隊員跑 test(m) → 回傳失敗原因字串或空
function judge(title, test) {
  if (state !== 'running') return false;
  const reasons = [];
  members.forEach((m) => {
    const r = test(m);
    if (r) reasons.push(r);
  });
  if (reasons.length) {
    fail(title, reasons);
    return false;
  }
  return true;
}
