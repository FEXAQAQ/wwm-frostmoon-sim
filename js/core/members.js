/* =====================================================================
 * 隊員：5 人的模型（人形／狼形／鷹形）、頭頂標籤、建立隊伍
 * ===================================================================== */

let members = [],
  player = null;
function makeMember(id, isPlayer) {
  const info = ROLE_INFO[id],
    grp = new T.Group();
  const mat = new T.MeshStandardMaterial({ color: info.col, roughness: 0.5, metalness: 0.1 });
  // 人形
  const human = new T.Group();
  const body = new T.Mesh(new T.CylinderGeometry(0.26, 0.32, 1.0, 16), mat);
  body.position.y = 0.7;
  body.castShadow = true;
  const head = new T.Mesh(new T.SphereGeometry(0.24, 16, 12), mat);
  head.position.y = 1.42;
  head.castShadow = true;
  human.add(body, head);
  // 狼形（變身狼靈）
  const wolfMat = new T.MeshStandardMaterial({ color: 0x9fb4d8, emissive: 0x3a5aa0, emissiveIntensity: 0.5 });
  const wolf = new T.Group();
  const wb = new T.Mesh(new T.BoxGeometry(0.6, 0.6, 1.4), wolfMat);
  wb.position.y = 0.7;
  const wh = new T.Mesh(new T.ConeGeometry(0.3, 0.7, 8), wolfMat);
  wh.rotation.x = Math.PI / 2;
  wh.position.set(0, 0.95, 0.95);
  const wt = new T.Mesh(new T.ConeGeometry(0.14, 0.8, 6), wolfMat);
  wt.rotation.x = -Math.PI / 2 - 0.5;
  wt.position.set(0, 0.9, -0.9);
  wolf.add(wb, wh, wt);
  wolf.visible = false;
  // 鷹形（變身鷹靈，飛在空中）
  const eagleMat = new T.MeshStandardMaterial({ color: 0xe8d9a8, emissive: 0x8a6a20, emissiveIntensity: 0.5, side: T.DoubleSide });
  const eagle = new T.Group();
  const eb = new T.Mesh(new T.ConeGeometry(0.3, 1.2, 8), eagleMat);
  eb.rotation.x = Math.PI / 2;
  const wing = new T.Mesh(new T.PlaneGeometry(3.2, 0.7).rotateX(-Math.PI / 2), eagleMat);
  eagle.add(eb, wing);
  eagle.position.y = 3.2;
  eagle.visible = false;
  const ring = new T.Mesh(
    new T.RingGeometry(0.42, 0.54, 32).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({
      color: isPlayer ? 0xe9c46a : info.col,
      transparent: true,
      opacity: isPlayer ? 1 : 0.55,
    }),
  );
  ring.position.y = 0.06;
  const lbl = makeLabel(isPlayer ? info.label + ' 你' : info.label, isPlayer ? '#e9c46a' : '#f4eaef');
  lbl.position.y = 2.1;
  const tag = makeLabel('', '#fff');
  tag.position.y = 2.75;
  tag.scale.multiplyScalar(0.8);
  tag.visible = false;
  const facing = new T.Group(); // 朝向（狼／鷹的頭）
  facing.add(wolf, eagle);
  grp.add(human, facing, ring, lbl, tag);
  scene.add(grp);
  return {
    id,
    tank: !!info.tank,
    healer: !!info.healer,
    isPlayer,
    obj: grp,
    human,
    wolf,
    eagle,
    facing,
    lbl,
    tag,
    form: 'human',
    x: 0,
    z: 0,
    tx: 0,
    tz: 0,
    face: { x: 0, z: -1 }, // 面向（移動方向）
    aim: null, // NPC 瞄準方向（狼劍氣、鷹揭露）
    parryAt: -9,
    parryCd: 0,
    dodgeCd: 0,
    iframe: 0,
    dash: null,
    skillCd: 0,
    trapped: null, // 狐火監牢 {x,z,r}
    carriedBy: null,
    carrying: null,
    wantForm: null,
    stun: 0,
    reactAt: 0,
  };
}
function setTag(m, text, color) {
  if (!text) {
    m.tag.visible = false;
    return;
  }
  m.tag.material.map = labelTex(text, color || '#fff');
  m.tag.material.needsUpdate = true;
  m.tag.visible = true;
}
// 變身：'human' | 'wolf' | 'eagle'
function setForm(m, f) {
  m.form = f;
  m.human.visible = f === 'human';
  m.wolf.visible = f === 'wolf';
  m.eagle.visible = f === 'eagle';
  m.lbl.position.y = f === 'eagle' ? 4.4 : 2.1;
  m.tag.position.y = f === 'eagle' ? 5.0 : 2.75;
}
function buildMembers(myId) {
  members.forEach((m) => scene.remove(m.obj));
  members = ROLE_IDS.map((id) => makeMember(id, id === myId));
  player = members.find((m) => m.isPlayer);
}
const byId = (id) => members.find((m) => m.id === id);
const speedOf = (m) => (m.form === 'eagle' ? 8.5 : m.form === 'wolf' ? 7.5 : SPEED);
