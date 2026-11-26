/* =====================================================================
 * 每幀更新：玩家／NPC 移動（含閃避衝刺、被困、被狼載著走）、變身、普攻、王、
 * 讀條與 HUD、提示圈、瞄準指示、相機，最後啟動主迴圈
 * ===================================================================== */

let dtRun = 0;
function clampArena(p) {
  const d = Math.hypot(p.x, p.z);
  if (d > WALK_R) {
    p.x *= WALK_R / d;
    p.z *= WALK_R / d;
  }
  return p;
}
// 被困在監牢：只能在圈內走
function clampCage(m) {
  const c = m.trapped;
  if (!c || m.carriedBy) return;
  const d = dist(m, c),
    r = c.r - 0.35;
  if (d > r) {
    m.x = c.x + ((m.x - c.x) * r) / d;
    m.z = c.z + ((m.z - c.z) * r) / d;
  }
}
function stepMove(m, vx, vz, dt) {
  m.x += vx * dt;
  m.z += vz * dt;
  if (Math.hypot(vx, vz) > 0.1) {
    m.lastMove = { x: vx, z: vz };
    m.face = norm(m.lastMove);
  }
}
function moveToward(m, dt) {
  const dx = m.tx - m.x,
    dz = m.tz - m.z,
    d = Math.hypot(dx, dz);
  if (d < 1e-3) return;
  const s = Math.min(d, speedOf(m) * dt);
  stepMove(m, (dx / d) * (s / dt), (dz / d) * (s / dt), dt);
}
// 自動模式：玩家角色也照攻略走（設定面板勾選，或測試掛鉤 window.__autopilot）
const autoOn = () => cfg.auto || window.__autopilot;
function updatePlayer(dt) {
  if (autoOn() || player.carriedBy) return;
  if (player.dash && t < player.dash.until) {
    stepMove(player, player.dash.x * 20, player.dash.z * 20, dt);
  } else if (player.stun <= t) {
    let f = 0,
      r = 0;
    if (keys.KeyW || keys.ArrowUp) f += 1;
    if (keys.KeyS || keys.ArrowDown) f -= 1;
    if (keys.KeyD || keys.ArrowRight) r += 1;
    if (keys.KeyA || keys.ArrowLeft) r -= 1;
    f -= touchMove.y;
    r += touchMove.x;
    const l = Math.hypot(f, r);
    if (l >= 0.05) {
      if (l > 1) {
        f /= l;
        r /= l;
      }
      const fx_ = -Math.sin(camYaw),
        fz = -Math.cos(camYaw),
        rx = Math.cos(camYaw),
        rz = -Math.sin(camYaw);
      const sp = speedOf(player);
      stepMove(player, (fx_ * f + rx * r) * sp, (fz * f + rz * r) * sp, dt);
    }
  }
  clampArena(player);
  clampCage(player);
}
function updateNpcs(dt) {
  members.forEach((m) => {
    if (m.carriedBy) return;
    if (m.isPlayer && !autoOn()) return;
    if (state === 'running' && planFn && t >= m.reactAt) {
      const p = planFn(m);
      if (p) {
        const c = clampArena({ x: p.x, z: p.z });
        m.tx = c.x;
        m.tz = c.z;
      }
    }
    if (m.stun <= t) moveToward(m, dt);
    // 走到靈劍旁邊就變身
    if (state === 'running' && m.wantForm && m.form !== m.wantForm) {
      const s = swords[m.wantForm];
      if (s && dist(m, s) < SWORD_REACH - 0.3) tryTransform(m);
    }
    clampArena(m);
    clampCage(m);
  });
  // 被狼載著：跟在狼身上
  members.forEach((m) => {
    if (!m.carriedBy) return;
    m.x = m.carriedBy.x;
    m.z = m.carriedBy.z;
  });
}
function updateCastHud() {
  const c = $('cast');
  if (state !== 'running' || (!cast && !advice)) {
    c.hidden = true;
    return;
  }
  c.hidden = false;
  if (cast) {
    $('castName').innerHTML = `${cast.name}<span>${cast.sub}</span>`;
    $('castFill').style.width = Math.min(100, ((t - cast.start) / cast.len) * 100) + '%';
  } else {
    $('castName').innerHTML = '<span>準備</span>';
    $('castFill').style.width = '0%';
  }
  $('advice').textContent = cfg.hintMe || cfg.auto ? advice : '';
}
// 提示圈：玩家該站的位置（金色）
const hintRing = new T.Group();
hintRing.add(ringMesh(0, 0, 0.5, 0.75, 0xffd34a, 0.95, 0.12), circleMesh(0, 0, 0.18, 0xffd34a, 0.95, 0.12));
hintRing.children.forEach((c) => (c.renderOrder = 10));
hintRing.visible = false;
scene.add(hintRing);
function updateHint() {
  if (!(cfg.hintMe || cfg.auto) || state !== 'running' || !planFn || window.__autopilot) {
    hintRing.visible = false;
    return;
  }
  const p = planFn(player);
  if (!p) return;
  const c = clampArena({ x: p.x, z: p.z });
  hintRing.visible = true;
  hintRing.position.set(c.x, 0, c.z);
  const s = 1 + Math.sin(performance.now() / 200) * 0.12;
  hintRing.scale.set(s, 1, s);
}
// 瞄準指示：狼＝劍氣方向的箭頭線、鷹＝前方揭露範圍
const aimLine = lineMesh({ x: 0, z: 0 }, { x: 0, z: 1 }, 18, 0.25, 0x9fd0ff, 0.35, 0.1);
const aimRect = lineMesh({ x: 0, z: 0 }, { x: 0, z: 1 }, EAGLE_LEN, EAGLE_HW, 0xffd36a, 0.12, 0.1);
[aimLine, aimRect].forEach((o) => {
  o.renderOrder = 7;
  o.traverse((c) => (c.renderOrder = 7));
  o.visible = false;
  scene.add(o);
});
function updateAim() {
  const show = state === 'running' && player && (player.form === 'wolf' || player.form === 'eagle');
  aimLine.visible = show && player.form === 'wolf';
  aimRect.visible = show && player.form === 'eagle';
  if (!show) return;
  const d = aimDir(player),
    o = player.form === 'wolf' ? aimLine : aimRect;
  o.position.set(player.x, 0.1, player.z);
  o.rotation.y = Math.atan2(d.x, d.z);
}
const FORM_NAME = { human: '人形', wolf: '狼形', eagle: '鷹形' };
function updateMeHud() {
  if (!player) return;
  $('meRole').textContent = `${ROLE_FULL[player.id]}（${ROLE_INFO[player.id].label}）${cfg.auto ? '（自動）' : ''}`;
  const st = [];
  if (state === 'running') {
    st.push(`<span class="frm">${FORM_NAME[player.form]}</span>`);
    if (player.trapped) st.push('<span class="deb">被困（沉默）</span>');
    const dc = player.dodgeCd - t;
    st.push(dc > 0 ? `<span class="cd">閃避 ${dc.toFixed(1)}</span>` : '<span class="rdy">閃避</span>');
    const pc = player.parryCd - t;
    st.push(pc > 0 ? `<span class="cd">卸勢 ${pc.toFixed(1)}</span>` : '<span class="rdy">卸勢</span>');
  }
  $('meDeb').innerHTML = st.join('');
  $('meRec').textContent = `通過 ${stats.clears} / 嘗試 ${stats.tries}`;
}
function updateCamera() {
  const py = player.form === 'eagle' ? 3.2 : 0;
  const tx = player.x,
    tz = player.z,
    cp = Math.cos(camPitch);
  camera.position.set(
    tx + Math.sin(camYaw) * cp * camDist,
    Math.sin(camPitch) * camDist + 1 + py,
    tz + Math.cos(camYaw) * cp * camDist,
  );
  camera.lookAt(tx, 1.8 + py * 0.6, tz);
}

/* 推進一步模擬：時間軸事件、移動、普攻、特效 */
function simulate(dt) {
  dtRun = state === 'running' ? dt : 0;
  if (state === 'running') {
    t += dt;
    while (state === 'running' && events.length && events[0].at <= t) {
      const e = events.shift();
      e.fn();
    }
    if (state === 'running') {
      // 每幀檢查裡新加的 tick 要保留（例如太極丟人偶的飛行動畫）
      const cur = ticks;
      ticks = [];
      const keep = cur.filter((fn) => !fn());
      ticks = keep.concat(ticks);
    }
  }
  if (player) updatePlayer(dt);
  updateNpcs(dt);
  if (state === 'running') updateCombat(dt);
  updateBoss(dt);
  members.forEach((m) => {
    m.obj.position.set(m.x, 0, m.z);
    m.facing.rotation.y = Math.atan2(m.face.x, m.face.z);
    m.human.rotation.y = m.facing.rotation.y;
    // 閃避中：半透明
    m.human.children.forEach((c) => {
      c.material.transparent = true;
      c.material.opacity = invuln(m) ? 0.4 : 1;
    });
  });
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    if (state === 'running' && t > f.until) {
      scene.remove(f.obj);
      fx.splice(i, 1);
      continue;
    }
    if (f.fade && f.obj.material)
      f.obj.material.opacity = (f.op0 || 0.55) * Math.max(0, 1 - (t - f.born) / (f.until - f.born));
  }
}

/* 畫面：相機、HUD、渲染 */
function render() {
  updateCamera();
  updateHint();
  updateAim();
  updateCastHud();
  updateMeHud();
  renderer.render(scene, camera);
}

/* 主迴圈。window.__substeps 只給自動測試用（一幀跑多步，加快模擬） */
const clock = new T.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const steps = window.__substeps || 1;
  for (let i = 0; i < steps; i++) simulate(dt);
  render();
  requestAnimationFrame(frame);
}

readCfg();
placeIdle();
requestAnimationFrame(frame);
