/* =====================================================================
 * 機制清單：全程模式依這個順序執行，也可在「練習範圍」單選（id）或選整隻王（boss）
 * 新增機制時：在 mechanics/ 加函式、在這裡加一行（選單會自動產生）、更新 README。
 * ===================================================================== */

const BOSS_NAME = { A: '桃靨劍姬', B: '耶律阿不里' };
const STEPS = [
  // 王 A：桃靨劍姬（明亮階段 → 黑暗階段）
  { id: 'chang', boss: 'A', name: '長虹貫日（明亮：遠離人群）', fn: (n) => mChanghong(n) },
  { id: 'qian', boss: 'A', name: '千花綻放（明亮：分散）', fn: (n) => mQianhua(n) },
  { id: 'fly', boss: 'A', name: '天外飛仙（紅圈點名卸勢）', fn: (n) => mTianwai(n) },
  { id: 'liu', boss: 'A', name: '流光劍舞（多段卸勢）', fn: (n) => mLiuguang(n) },
  { id: 'dark', boss: 'A', name: '黑暗階段：光亮區域＋秒殺點名', fn: (n) => mDark(n) },
  { id: 'doll', boss: 'A', name: '百戲人偶（太極集合擊殺）', fn: (n) => mBaixi(n) },
  { id: 'flower', boss: 'A', name: '天女散花（光亮區域卸勢）', fn: (n) => mTiannv(n) },
  { id: 'giant', boss: 'A', name: '百戲人偶·巨＋全員點名', fn: (n) => mJuren(n) },
  // 王 B：耶律阿不里
  { id: 'wolf', boss: 'B', name: '狼靈召喚', fn: (n) => mWolf(n) },
  { id: 'eagle', boss: 'B', name: '鷹靈召喚', fn: (n) => mEagle(n) },
  { id: 'drum', boss: 'B', name: '狼神附身＋狼神鼓', fn: (n) => mDrum(n) },
  { id: 'cage', boss: 'B', name: '狐火監牢', fn: (n) => mCage(n) },
  { id: 'fox', boss: 'B', name: '狐神舞', fn: (n) => mFox(n) },
  { id: 'foxex', boss: 'B', name: '狐神舞·極', fn: (n) => mFoxEx(n) },
  { id: 'blaze', boss: 'B', name: '狐火爆炎', fn: (n) => mBlaze(n) },
];

// 「練習範圍」選單直接由 STEPS 產生，保證選單和全程順序一致
{
  const sel = $('mode');
  ['A', 'B'].forEach((b) => {
    const og = document.createElement('optgroup');
    og.label = BOSS_NAME[b];
    STEPS.filter((s) => s.boss === b).forEach((s, i) => {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = `${b}${i + 1}　${s.name}`;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
}
