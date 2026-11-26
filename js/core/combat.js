/* =====================================================================
 * 動作系統：小怪與普攻、卸勢、閃避、燈光（熄燈）、靈劍與變身、太極、狼格擋、鷹揭露、地面火焰
 *
 * 操作：F 卸勢（要對準命中瞬間，約 0.55 秒的窗口）、空白 閃避（0.45 秒無敵）、
 *       Q 技能（人形＝太極、狼＝格擋、鷹＝揭露）、E 互動（拿靈劍變身、狼載人）。
 * 普攻是自動的：站在小怪旁邊（ATK_R 內）就會打最近的那隻，並順劈旁邊的小怪。
 * ===================================================================== */

/* ---------- 小怪 ---------- */
let enemies = [];
function addEnemy(o) {
  const e = Object.assign({ alive: true, hidden: false, dmg: {}, r: 0.8, barY: 2.4 }, o);
  e.hp0 = e.hp;
  e.obj = o.model;
  e.obj.position.set(e.x, 0, e.z);
  scene.add(e.obj);
  e.bar = makeBar(e.name);
  e.bar.position.set(0, e.barY, 0);
  e.obj.add(e.bar);
  drawBar(e.bar, 1);
  enemies.push(e);
  return e;
}
function killEnemy(e) {
  if (!e.alive) return;
  e.alive = false;
  e.hp = 0;
  scene.remove(e.obj);
  const p = circleMesh(e.x, e.z, 1.6, 0xffe0a0, 0.6, 0.1);
  addFx(p, 0.6);
  if (e.onDeath) e.onDeath(e);
}
function clearEnemies() {
  enemies.forEach((e) => scene.remove(e.obj));
  enemies = [];
}
function setEnemyHidden(e, h) {
  e.hidden = h;
  e.obj.visible = !h;
}
const alive = (list) => list.filter((e) => e.alive);
const dealt = (e, m) => (e.dmg[m.id] || 0) > 0.3;
function updateCombat(dt) {
  members.forEach((m) => {
    if (m.trapped || m.form === 'eagle' || m.stun > t) return;
    let best = null,
      bd = 1e9;
    enemies.forEach((e) => {
      if (!e.alive || e.hidden || e.invuln) return;
      const d = dist(m, e) - e.r;
      if (d < ATK_R && d < bd) {
        bd = d;
        best = e;
      }
    });
    if (!best) return;
    const k = (m.healer ? 0.5 : 1) * dt;
    enemies.forEach((e) => {
      if (!e.alive || e.hidden || e.invuln) return;
      if (e !== best && dist(e, best) > CLEAVE_R) return;
      e.hp -= k;
      e.dmg[m.id] = (e.dmg[m.id] || 0) + k;
      if (e.hp <= 0) killEnemy(e);
    });
  });
  enemies.forEach((e) => {
    if (!e.alive) return;
    e.obj.position.set(e.x, e.y || 0, e.z);
    drawBar(e.bar, e.hp / e.hp0, e.barExtra ? e.barExtra() : '');
  });
}

/* ---------- 王的移動（坦克拉王、王飛起來） ---------- */
let bossGoal = null,
  bossSpeed = 4;
function bossMoveTo(p, speed = 4) {
  bossGoal = { x: p.x, z: p.z };
  bossSpeed = speed;
}
function bossJumpTo(p) {
  bossGoal = null;
  bossPos.x = p.x;
  bossPos.z = p.z;
}
function updateBoss(dt) {
  if (bossGoal) {
    const d = dist(bossPos, bossGoal);
    if (d < 0.05) bossGoal = null;
    else {
      const s = Math.min(d, bossSpeed * dt);
      bossPos.x += ((bossGoal.x - bossPos.x) / d) * s;
      bossPos.z += ((bossGoal.z - bossPos.z) / d) * s;
    }
  }
  boss.position.set(bossPos.x, bossPos.y, bossPos.z);
  boss.userData.ring.visible = bossPos.y < 0.5;
  // 王面向坦克
  const tk = members.find((m) => m.tank);
  if (tk) boss.rotation.y = Math.atan2(tk.x - bossPos.x, tk.z - bossPos.z);
  if (bossKey === 'A') bossAParts.ribbon.rotation.z += dt * 0.8;
}

/* ---------- 燈光（熄燈機制） ---------- */
let dark = false,
  lights = [];
function setDark(on) {
  dark = on;
  hemi.intensity = on ? 0.18 : 0.95;
  sun.intensity = on ? 0.2 : 1.35;
  darkVeil.visible = on;
}
function addLight(x, z, r) {
  const g = new T.Group();
  const pool = new T.Mesh(
    new T.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.42, depthWrite: false, blending: T.AdditiveBlending }),
  );
  pool.position.y = 0.09;
  const edge = new T.Mesh(
    new T.RingGeometry(0.93, 1, 64).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: 0.95, depthWrite: false }),
  );
  edge.position.y = 0.1;
  const beam = new T.Mesh(
    new T.CylinderGeometry(0.35, 1, 14, 32, 1, true),
    new T.MeshBasicMaterial({ color: 0xfff3d0, transparent: true, opacity: 0.07, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }),
  );
  beam.position.y = 7;
  g.add(pool, edge, beam);
  g.position.set(x, 0, z);
  g.scale.set(r, 1, r);
  [pool, edge, beam].forEach((o) => (o.renderOrder = 4));
  scene.add(g);
  const L = { x, z, r, obj: g };
  lights.push(L);
  return L;
}
function setLightR(L, r) {
  L.r = Math.max(0, r);
  L.obj.scale.set(Math.max(0.001, L.r), 1, Math.max(0.001, L.r));
  L.obj.visible = L.r > 0.05;
}
function clearLights() {
  lights.forEach((L) => scene.remove(L.obj));
  lights = [];
}
// 是否站在燈光下（沒熄燈＝到處都亮）
function inLight(p) {
  if (!dark) return true;
  return lights.some((L) => L.r > 0.05 && dist(p, L) <= L.r - 0.15);
}
// 五個人各自的燈位
function poolPos(m) {
  return posAt(POOL_ANG[m.id], POOL_R);
}
function fivePools() {
  ROLE_IDS.forEach((id) => addLight(...Object.values(posAt(POOL_ANG[id], POOL_R)), LIGHT_R));
}

/* ---------- 靈劍（狼靈劍／鷹靈劍）與變身 ---------- */
let swords = {};
const SWORD_NAME = { wolf: '狼靈劍', eagle: '鷹靈劍' };
function addSword(kind, x, z) {
  if (swords[kind]) scene.remove(swords[kind].obj);
  const col = kind === 'wolf' ? 0x7fb0ff : 0xffd36a;
  const g = new T.Group();
  const blade = new T.Mesh(
    new T.BoxGeometry(0.12, 2.2, 0.35),
    new T.MeshStandardMaterial({ color: 0xe8f0ff, emissive: col, emissiveIntensity: 0.9 }),
  );
  blade.position.y = 1.2;
  const glow = new T.Mesh(
    new T.CylinderGeometry(0.15, 0.6, 8, 16, 1, true),
    new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }),
  );
  glow.position.y = 4;
  const base = ringMesh(0, 0, 1.9, 2.1, col, 0.8, 0.09);
  const lbl = makeLabel(SWORD_NAME[kind], kind === 'wolf' ? '#9fc4ff' : '#ffe08a');
  lbl.position.y = 2.9;
  g.add(blade, glow, base, lbl);
  g.position.set(x, 0, z);
  scene.add(g);
  swords[kind] = { x, z, obj: g };
  return swords[kind];
}
function clearSwords() {
  Object.values(swords).forEach((s) => s && scene.remove(s.obj));
  swords = {};
}
// 單練某個機制時，補上預設位置的靈劍
function ensureSword(kind) {
  if (!swords[kind]) addSword(kind, ...Object.values(kind === 'wolf' ? posAt(250, 9) : posAt(110, 9)));
  return swords[kind];
}
const SWORD_REACH = 2.2;
function tryTransform(m) {
  for (const k of ['wolf', 'eagle']) {
    const s = swords[k];
    if (s && !s.caged && dist(m, s) < SWORD_REACH && m.form !== k) {
      setForm(m, k);
      addFx(ringMesh(m.x, m.z, 0.5, 1.4, k === 'wolf' ? 0x7fb0ff : 0xffd36a, 0.8, 0.12), 0.5);
      return true;
    }
  }
  return false;
}

/* ---------- 瞄準方向 ---------- */
// 玩家：鏡頭面向（拖曳轉視角來瞄準）；NPC／自動模式：攻略指定的方向
function aimDir(m) {
  if (m.isPlayer && !autoOn()) return { x: -Math.sin(camYaw), z: -Math.cos(camYaw) };
  return m.aim || m.face;
}

/* ---------- 卸勢 ---------- */
const PARRY_WIN = 0.55;
function pressParry(m) {
  if (!m || m.trapped || m.stun > t || t < m.parryCd) return;
  m.parryAt = t;
  m.parryCd = t + 0.8; // 連按沒用：按太早要等冷卻
  const r = ringMesh(m.x, m.z, 0.6, 1.0, 0xbfe6ff, 0.9, 0.14);
  r.renderOrder = 10;
  addFx(r, 0.3);
}
// 命中瞬間判定：玩家要自己按；NPC 和自動模式都會照攻略卸勢
function parried(m, hitT) {
  if (!m.isPlayer || autoOn()) return true;
  return m.parryAt >= hitT - PARRY_WIN && m.parryAt <= hitT + 0.06;
}
// 卸勢提示：縮小的白圈（縮到腳下的瞬間就是命中）＋頭上「卸」
function parryCue(m, hitT, col = 0xffffff) {
  const lead = 1.3;
  at(hitT - lead, () => {
    if (state !== 'running') return;
    const ring = ringMesh(0, 0, 0.92, 1, col, 0.95, 0.15);
    ring.renderOrder = 10;
    addFx(ring, lead + 0.1, false);
    const mark = makeLabel('卸', '#ffd34a');
    mark.scale.multiplyScalar(1.4);
    mark.visible = false;
    addFx(mark, lead + 0.1, false);
    tick(() => {
      const k = Math.max(0, (hitT - t) / lead);
      const r = 0.7 + k * 2.6;
      ring.scale.set(r, 1, r);
      ring.position.set(m.x, 0, m.z);
      mark.position.set(m.x, m.form === 'eagle' ? 5.6 : 3.5, m.z);
      mark.visible = hitT - t < PARRY_WIN;
      if (!m.isPlayer || autoOn()) {
        // NPC：在窗口中間自動卸勢（畫面上看得到）
        if (hitT - t < 0.25 && m.parryAt < hitT - 1) pressParry(m);
      }
      return t > hitT + 0.05;
    });
  });
}

/* ---------- 閃避 ---------- */
function pressDodge(m) {
  if (!m || m.trapped || m.stun > t || t < m.dodgeCd) return;
  let d = m.lastMove && Math.hypot(m.lastMove.x, m.lastMove.z) > 0.1 ? norm(m.lastMove) : { x: Math.sin(camYaw), z: Math.cos(camYaw) };
  m.dash = { x: d.x, z: d.z, until: t + 0.2 };
  m.iframe = t + 0.45;
  m.dodgeCd = t + 1.0;
}
const invuln = (m) => m.iframe > t;

/* ---------- Q 技能：太極／狼格擋／鷹揭露（由機制掛上 hook） ---------- */
let skillHook = {};
function pressSkill(m) {
  if (!m || m.trapped || m.stun > t) return;
  if (m.form === 'wolf') return pressParry(m); // 狼的 Q＝格擋（窗口同卸勢）
  if (t < m.skillCd) return;
  if (m.form === 'eagle') {
    m.skillCd = t + 0.8;
    revealRect(m);
    return;
  }
  m.skillCd = t + 1.2;
  // 太極：捲起身邊的小怪，丟到王腳下
  const ring = ringMesh(m.x, m.z, TAIJI_R - 0.15, TAIJI_R, 0x9fe8ff, 0.9, 0.13);
  addFx(ring, 0.5);
  if (skillHook.taiji) skillHook.taiji(m);
}
const TAIJI_R = 6.5;

// 鷹的揭露範圍：前方長方形
const EAGLE_LEN = 8,
  EAGLE_HW = 2.2;
function revealRect(m) {
  const d = aimDir(m);
  const mesh = lineMesh({ x: m.x, z: m.z }, d, EAGLE_LEN, EAGLE_HW, 0xff5030, 0.45);
  addFx(mesh, 0.6);
  if (skillHook.reveal) skillHook.reveal(m, d);
}

/* ---------- E 互動：拿靈劍變身、狼載起被困的隊友 ---------- */
function pressInteract(m) {
  if (!m || m.trapped || m.stun > t) return;
  if (m.form === 'wolf' && !m.carrying) {
    const v = members.find((o) => o !== m && o.trapped && !o.carriedBy && dist(o, m) < 2.0);
    if (v) {
      v.carriedBy = m;
      m.carrying = v;
      return;
    }
  }
  tryTransform(m);
}

/* ---------- 地面火焰（狐火爆炎留下的） ---------- */
let puddles = [];
function addPuddle(x, z, r) {
  const g = new T.Group();
  g.add(circleMesh(0, 0, r, 0x4ab8ff, 0.4, 0.08), ringMesh(0, 0, r - 0.2, r, 0x8ad8ff, 0.9, 0.09));
  g.position.set(x, 0, z);
  g.children.forEach((c) => (c.renderOrder = 6));
  scene.add(g);
  puddles.push({ x, z, r, obj: g });
}
function clearPuddles() {
  puddles.forEach((p) => scene.remove(p.obj));
  puddles = [];
}
