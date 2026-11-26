/* =====================================================================
 * 機制共用小工具：跟著人走的範圍圈、飛行物（飛劍／花球／狐火）、倒數、小怪模型
 * ===================================================================== */

// 跟著隊員走的地面圈（點名圈），until 時移除；回傳 mesh
function followCircle(m, r, col, until, op = 0.35) {
  const g = new T.Group();
  g.add(circleMesh(0, 0, r, col, op, 0.08), ringMesh(0, 0, r - 0.15, r, col, 0.95, 0.09));
  g.children.forEach((c) => (c.renderOrder = 8));
  omen(g, until - t);
  tick(() => {
    g.position.set(m.x, 0, m.z);
    return t >= until;
  });
  return g;
}
// 飛行物：從 from（{x,z,y}）飛向隊員 m，hitT 剛好命中
function projectile(from, m, hitT, dur, col, size = 0.35) {
  at(hitT - dur, () => {
    if (state !== 'running') return;
    const s = new T.Mesh(
      new T.SphereGeometry(size, 12, 8),
      new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 }),
    );
    s.scale.set(1, 1, 3);
    addFx(s, dur + 0.05, false);
    const f0 = { x: from.x, z: from.z, y: from.y || 2.5 },
      t0 = t;
    tick(() => {
      const k = Math.min(1, (t - t0) / dur);
      s.position.set(f0.x + (m.x - f0.x) * k, f0.y + (1.2 - f0.y) * k, f0.z + (m.z - f0.z) * k);
      s.lookAt(m.x, 1.2, m.z);
      return k >= 1;
    });
  });
}
// 命中時的爆炸效果
function boom(p, r, col) {
  strongFlash(circleMesh(p.x, p.z, r, col, 0.55, 0.11));
}
// 王飛到空中／落地（只是外觀）
function bossFly(h, dur = 0.6) {
  const y0 = bossPos.y,
    t0 = t;
  tick(() => {
    const k = Math.min(1, (t - t0) / dur);
    bossPos.y = y0 + (h - y0) * k;
    return k >= 1;
  });
}
// 圍成一圈的站位：中心 c、半徑 r、依職能燈位角度
function ringSpot(m, c, r, rot = 0) {
  return posAt(POOL_ANG[m.id] + rot, r, c);
}

/* ---------- 小怪模型 ---------- */
function puppetModel(scale = 1, col = 0xb070d0) {
  const g = new T.Group();
  const mat = new T.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: 0x401060, emissiveIntensity: 0.5 });
  const b = new T.Mesh(new T.CylinderGeometry(0.25, 0.4, 1.1, 8), mat);
  b.position.y = 0.75;
  const h = new T.Mesh(new T.SphereGeometry(0.3, 10, 8), new T.MeshStandardMaterial({ color: 0xf4e4d4 }));
  h.position.y = 1.55;
  const arms = new T.Mesh(new T.BoxGeometry(1.3, 0.12, 0.12), mat);
  arms.position.y = 1.1;
  g.add(b, h, arms);
  g.scale.setScalar(scale);
  return g;
}
function wolfSpiritModel() {
  const g = new T.Group();
  const mat = new T.MeshStandardMaterial({ color: 0x9fb4d8, emissive: 0x2a4aa0, emissiveIntensity: 0.7, transparent: true, opacity: 0.9 });
  const b = new T.Mesh(new T.BoxGeometry(1.2, 1.1, 2.6), mat);
  b.position.y = 1.2;
  const h = new T.Mesh(new T.ConeGeometry(0.55, 1.3, 8), mat);
  h.rotation.x = Math.PI / 2;
  h.position.set(0, 1.6, 1.9);
  g.add(b, h);
  return g;
}
function eagleSpiritModel() {
  const g = new T.Group();
  const mat = new T.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xa07010, emissiveIntensity: 0.7, side: T.DoubleSide });
  const b = new T.Mesh(new T.ConeGeometry(0.45, 1.8, 8), mat);
  b.rotation.x = Math.PI / 2;
  const w = new T.Mesh(new T.PlaneGeometry(5, 1.1).rotateX(-Math.PI / 2), mat);
  g.add(b, w);
  return g;
}
function foxfireModel() {
  const g = new T.Group();
  const core = new T.Mesh(
    new T.SphereGeometry(0.55, 14, 10),
    new T.MeshBasicMaterial({ color: 0x9ee8ff }),
  );
  core.position.y = 1.3;
  const flame = new T.Mesh(
    new T.ConeGeometry(0.6, 1.6, 12),
    new T.MeshBasicMaterial({ color: 0x3aa8ff, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false }),
  );
  flame.position.y = 1.9;
  g.add(core, flame);
  return g;
}
