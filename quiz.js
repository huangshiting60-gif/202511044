const ROOT = document.getElementById('quiz-root');
const START = document.getElementById('startBtn');

let questions = [];
let idx = 0;
let score = 0;
let picked = null;

START?.addEventListener('click', async () => {
  START.disabled = true;
  ROOT.innerHTML = '<div class="center">載入題庫中…</div>';
  try {
    const text = await fetch('questions.csv', {cache: 'no-store'}).then(r => {
      if(!r.ok) throw new Error('讀取失敗：' + r.status);
      return r.text();
    });
    questions = parseCSV(text);
    if (questions.length === 0) throw new Error('CSV 內容解析不到題目');

    // 亂數打散題目
    shuffle(questions);
    idx = 0; score = 0;
    renderQuestion();
  } catch (err) {
    ROOT.innerHTML = `<div class="center">⚠️ ${err.message || err}<br>請確認 questions.csv 放在同一資料夾，且以 Live Server 開啟。</div>`;
  }
});

/* ===== 顯示題目 ===== */
function renderQuestion(){
  picked = null;
  const q = questions[idx];
  // 亂數打散選項
  const options = q.options.map((txt, i) => ({ key: 'ABCD'[i], txt }));
  shuffle(options);

  ROOT.innerHTML = `
    <div>
      <div class="q-title">第 ${idx+1} 題 / 共 ${questions.length} 題</div>
      <div class="q-title">${escapeHTML(q.question)}</div>
      <div id="opts"></div>
      <div class="controls">
        <button class="btn" id="prevBtn" ${idx===0?'disabled':''}>上一題</button>
        <button class="btn primary" id="nextBtn">${idx === questions.length - 1 ? '交卷' : '下一題'}</button>
      </div>
    </div>
  `;

  const optWrap = document.getElementById('opts');
  options.forEach(o => {
    const el = document.createElement('label');
    el.className = 'opt';
    el.innerHTML = `<input type="radio" name="opt" value="${o.key}" style="margin-right:8px"> ${escapeHTML(o.txt)}`;
    el.addEventListener('change', () => picked = o.key);
    optWrap.appendChild(el);
  });

  document.getElementById('prevBtn').onclick = () => { if(idx>0){ idx--; renderQuestion(); } };
  document.getElementById('nextBtn').onclick = () => {
    if (picked == null) { alert('請先選擇一個答案'); return; }
    // 比對正確答案：注意正確答案是 A/B/C/D
    if (picked === questions[idx].answer) score++;
    if (idx === questions.length - 1) renderResult();
    else { idx++; renderQuestion(); }
  };
}

/* ===== 顯示成績 ===== */
function renderResult(){
  const percent = Math.round((score / questions.length) * 100);
  const msg = percent === 100 ? '滿分！太強了 🎉' :
              percent >= 80 ? '很棒！保持下去 👏' :
              percent >= 60 ? '不錯～再複習一下 💪' :
              '加油！回去多看看筆記 📚';

  ROOT.innerHTML = `
    <div class="result">
      <p>作答結束！</p>
      <p>總題數：${questions.length}</p>
      <p>答對題數：${score}</p>
      <p>最終得分：${percent} 分</p>
      <p>${msg}</p>
      <div class="controls">
        <button class="btn" onclick="location.href='index.html'">回首頁</button>
        <button class="btn primary" id="retry">再測一次</button>
      </div>
    </div>
  `;
  document.getElementById('retry').onclick = () => {
    shuffle(questions); idx=0; score=0; renderQuestion();
  };
}

/* ===== CSV 解析（支援兩種欄位命名） ===== */
function parseCSV(text){
  const rows = [];
  const lines = splitCSV(text.trim());
  if (!lines.length) return rows;

  const header = lines[0].map(s => s.trim());
  const qIdx = header.findIndex(h => /question/i.test(h));
  const AIdx = header.findIndex(h => /optionA/i.test(h));
  const BIdx = header.findIndex(h => /optionB/i.test(h));
  const CIdx = header.findIndex(h => /optionC/i.test(h));
  // D 可選（如果只有三選）
  const DIdx = header.findIndex(h => /optionD/i.test(h));
  const ansIdx = header.findIndex(h => /(correctAnswer|answer)/i.test(h));

  for (let i=1;i<lines.length;i++){
    const cols = lines[i];
    const q = cols[qIdx];
    const A = cols[AIdx], B = cols[BIdx], C = cols[CIdx];
    const D = DIdx >= 0 ? cols[DIdx] : null;
    const ansRaw = (cols[ansIdx]||'').trim().toUpperCase();
    const answer = ['A','B','C','D'].includes(ansRaw) ? ansRaw : null;
    if (!q || !A || !B || !C || !answer) continue;

    const options = D ? [A,B,C,D] : [A,B,C];
    rows.push({ question: q, options, answer });
  }
  return rows;
}

/* ===== 小工具 ===== */
function splitCSV(str){
  // 返還 [[col,col,...], [col,...], ...]，支援含引號與逗點
  const lines = []; let cur = []; let cell = '';
  let inQ = false; let i=0;
  while (i < str.length){
    const ch = str[i];
    if (inQ){
      if (ch === '"'){
        if (str[i+1] === '"'){ cell += '"'; i+=2; continue; }
        inQ = false; i++; continue;
      } else { cell += ch; i++; continue; }
    } else {
      if (ch === '"'){ inQ = true; i++; continue; }
      if (ch === ','){ cur.push(cell); cell=''; i++; continue; }
      if (ch === '\n' || ch === '\r'){
        // 換行
        if (ch === '\r' && str[i+1] === '\n') i++;
        cur.push(cell); lines.push(cur); cur=[]; cell=''; i++; continue;
      }
      cell += ch; i++; continue;
    }
  }
  // 結尾
  if (cell.length || cur.length) { cur.push(cell); lines.push(cur); }
  return lines;
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function escapeHTML(s){ return s?.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) ?? ''; }
