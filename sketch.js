/* 🎯 教育科技學系互動作品 — 宇宙公轉 + 完整特效版
 * 🪐 背景：tomxor 行星+環
 * 🌌 封面：標題/姓名繞中心公轉（前亮後暗、星塵）
 * 🧭 目錄：滑鼠靠左自動滑出（作品一/作品二/作品三）
 * 🧠 測驗：CSV 題庫（10 題），亂數出題、成績、回饋、特效
 */

let appState = 'home';

// === 側邊選單 ===
const MENU_W = 100, HANDLE_W = 14, HOVER_OPEN_X = 40;
let menuX = -MENU_W + HANDLE_W, menuTarget = -MENU_W + HANDLE_W;
let MENU_BG, MENU_BG_HOVER, MENU_TEXT, MENU_ACCENT;
let sideMenuBoxes = [];
let sideMenuItems = [
  { label: "氣球爆破遊戲", type: "link", url: "https://huangshiting60-gif.github.io/202511033/"},
  { label: "上課筆記", type: "link", url: "https://hackmd.io/@DVFtTMYjTmumEkY6i9d0lw/SkBeKOyhll"},
  { label: "測驗系統", type: "quiz"},
  { 
    label: "淡江大學", 
    type: "submenu",
    url: "https://www.tku.edu.tw/",
    submenu: [
      { label: "教育科技學系", type: "link", url: "https://www.et.tku.edu.tw/" }
    ]
  }
];

// === 背景（tomxor） ===
let tCounter = 100;

// === 封面：公轉參數 ===
let orbitAngle = 0;
const ORBIT_SPEED = 0.018;   // >0 順時針；<0 逆時針
const ORBIT_R_BASE = 0.22;
const ORBIT_R_SWAY = 0.06;

// === 測驗 ===
const NUM_QUESTIONS = 10;
let allRows = [], quiz = [], qIdx = 0, score = 0;
let buttons = [];
let particles = [];
let toastTimer = 0, toastText = '', toastGood = true;
let shakeT = 0;
let pendingAdvance = false; // 防連點+保證特效顯示完

// 內建備援題庫（讀不到外部 CSV 時使用）
const FALLBACK_CSV = `question,optionA,optionB,optionC,optionD,answer,feedback
p5.js 的 setup 什麼時候執行？,每一幀都執行,只在開始執行一次,按滑鼠時,視窗縮放時,B,setup 只在開始呼叫一次
哪個函數會不斷重複執行?,"draw()","setup()","mousePressed()","keyTyped()",A,draw 是動畫主循環
用於載入外部檔案的函數?,"loadImage()","loadTable()","background()","fill()",B,loadTable 用於讀CSV
設定畫布大小的函數是?,"setSize()","canvas()","createCanvas()","window()",C,createCanvas 設定畫布大小
改變填色顏色的函數是?,"fill()","stroke()","rect()","color()",A,fill 控制填色
畫布原點(0,0)在哪裡?,"左上角","右下角","中心","左下角",A,左上角是原點
每幀重繪畫面要用哪個函數?,"background()","clearRect()","erase()","save()",A,background 清除舊圖
fetch() 讀檔後要怎麼取文字?,"res.json()","res.text()","res.body","res.file()",B,用 text() 取文字
JavaScript 嚴格等於運算子是哪個?,"==","=","===","!==",C,=== 比較值與型別
p5.js 畫線的函數是?,"line()","rect()","stroke()","shape()",A,line 畫線
`;

// === 載入題庫（先試讀 data/questions.csv，失敗用備援） ===
async function preload() {
  try {
    const res = await fetch('data/questions.csv', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const txt = await res.text();
    allRows = parseCSV(txt);
    if (!allRows.length) throw new Error();
  } catch {
    allRows = parseCSV(FALLBACK_CSV);
  }
}
function parseCSV(txt) {
  const lines = txt.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const head = lines[0].split(',');
  const qi = head.indexOf('question'),
        ai = head.indexOf('optionA'),
        bi = head.indexOf('optionB'),
        ci = head.indexOf('optionC'),
        di = head.indexOf('optionD'),
        an = head.indexOf('answer'),
        fb = head.indexOf('feedback');
  const arr = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',');
    if (c.length < 6) continue;
    const row = {
      question: c[qi],
      options: [c[ai], c[bi], c[ci], c[di]],
      answer: (c[an]||'').trim().toUpperCase(),
      feedback: c[fb]||''
    };
    if (row.question && row.options.every(Boolean) && 'ABCD'.includes(row.answer)) arr.push(row);
  }
  return arr;
}

function setup() {
  createCanvas(windowWidth, windowHeight).parent("game-container");
  textFont('ZCOOL KuaiLe');

  // 選單配色
  MENU_BG = color(17, 24, 39, 180);
  MENU_BG_HOVER = color(30, 41, 59, 210);
  MENU_TEXT = color(238);
  MENU_ACCENT = color(14, 165, 233);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

function draw() {
  if (appState === 'home') {
    drawTomxorBackground();
    drawOrbitingTitle();
    drawSideMenu();
    return;
  }

  if (appState === 'quiz_loading') {
    background(0);
    fill(255); textAlign(CENTER, CENTER); textSize(22);
    text('載入題庫中...', width/2, height/2);
    if (allRows.length) { buildQuiz(allRows); appState = 'quiz'; }
    drawSideMenu();
    return;
  }

  if (appState === 'quiz') {
    background(20);

    // 震動特效（錯題）
    if (shakeT > 0) { push(); translate(random(-4,4), random(-4,4)); shakeT--; drawQuiz(); pop(); }
    else { drawQuiz(); }

    // 一定要在題目後畫這兩個，特效才會出現
    updateParticles();
    drawToastTop();

    drawSideMenu();
    return;
  }

  if (appState === 'result') {
    background(20);
    drawResult();

    // 結果頁也保留最後一波特效
    updateParticles();
    drawToastTop();

    drawSideMenu();
    return;
  }
}

// === 背景（tomxor） ===
function drawTomxorBackground() {
  background(0);
  stroke(255);
  tCounter += 0.01;
  for (let i = 2000; i > 0; i -= 2) drawTomxorPoint(i, 0); // 偶數：行星
  for (let i = 1999; i > 0; i -= 2) drawTomxorPoint(i, 1); // 奇數：環
}
function drawTomxorPoint(i, p) {
  const r = tCounter / cos(tCounter / i) + p * (tCounter / 2 + (i % tCounter));
  const a = tCounter / 9 + i * i;
  const x = width / 2 + r * sin(a) * cos((1 - p) * i / tCounter);
  const y = height / 2 + r * cos(a + p * 2);
  const s = 1 - cos(a);
  strokeWeight(s);
  point(x, y);
}

// === 封面：繞宇宙公轉（前亮後暗＋星塵） ===
function drawOrbitingTitle() {
  const cx = width / 2, cy = height / 2;
  const title = '教育科技学系';
  const subtitle = '414730175 黃詩婷';
  const titleSize = min(width, height) * 0.09;
  const subtitleSize = min(width, height) * 0.035;

  orbitAngle += ORBIT_SPEED;

  const base = min(width, height);
  const r0 = base * ORBIT_R_BASE, rAmp = base * ORBIT_R_SWAY;
  const a1 = orbitAngle, a2 = orbitAngle + 0.7;
  const r1 = r0 + rAmp * sin(a1 * 1.3);
  const r2 = r0 * 0.78 + rAmp * sin(a2 * 1.4);
  const z1 = sin(a1), z2 = sin(a2);
  const s1 = map(z1, -1, 1, 0.82, 1.18);
  const s2 = map(z2, -1, 1, 0.82, 1.12);
  const alpha1 = map(z1, -1, 1, 140, 255);
  const alpha2 = map(z2, -1, 1, 120, 230);

  const x1 = cx + r1 * cos(a1);
  const y1 = cy + r1 * sin(a1);
  const x2 = cx + r2 * cos(a2);
  const y2 = cy + r2 * sin(a2);

  // 星塵（主標尾端）
  noFill();
  stroke(255, 100);
  for (let i = 0; i < 50; i++) {
    const da = -i * 0.03;
    const ar = a1 + da;
    point(cx + (r1 + random(-2,2)) * cos(ar), cy + (r1 + random(-2,2)) * sin(ar));
  }
  noStroke();

  // 依深度排序，避免互遮突兀
  const order = z1 >= z2 ? [2, 1] : [1, 2];
  for (const which of order) {
    if (which === 1) {
      push(); translate(x1, y1); scale(s1); textAlign(CENTER, CENTER);
      fill(255, alpha1); textSize(titleSize); text(title, 0, 0);
      pop();
    } else {
      push(); translate(x2, y2); scale(s2); textAlign(CENTER, CENTER);
      fill(255, alpha2); textSize(subtitleSize); text(subtitle, 0, 0);
      pop();
    }
  }
}

// === 側邊選單 ===
function drawSideMenu() {
  const nearEdge = mouseX < HOVER_OPEN_X;
  const insideMenu = mouseX >= menuX && mouseX <= menuX + MENU_W;
  menuTarget = (nearEdge || insideMenu) ? 0 : (-MENU_W + HANDLE_W);
  menuX = lerp(menuX, menuTarget, 0.15);

  noStroke(); fill(MENU_BG); rect(menuX, 0, MENU_W, height);
  fill(MENU_ACCENT); rect(menuX - 1, height/2 - 40, HANDLE_W, 80, 6);
  stroke(255); strokeWeight(2);
  for (let i=0;i<3;i++) line(menuX+4, height/2-20+i*10, menuX+10, height/2-20+i*10);
  noStroke();

  const itemH = 36, gap = 12;
  let totalH = 0;
  sideMenuItems.forEach(item => {
    totalH += itemH + gap;
  });
  totalH -= gap;

  let y = height / 2 - totalH / 2;
  sideMenuBoxes = [];

  textAlign(LEFT, CENTER); textSize(14);
  for (let i = 0; i < sideMenuItems.length; i++) {
    const item = sideMenuItems[i];
    const box = { x: menuX, y, w: MENU_W, h: itemH, i };
    const isHover = mouseX >= box.x && mouseX <= box.x + box.w && mouseY >= box.y && mouseY <= box.y + box.h;

    fill(isHover ? MENU_BG_HOVER : MENU_BG);
    rect(box.x, box.y, box.w, box.h);
    if (isHover) {
      fill(MENU_ACCENT);
      rect(box.x, box.y, 3, box.h);
    }
    fill(MENU_TEXT);
    text(item.label, box.x + 16, box.y + box.h / 2);
    sideMenuBoxes.push(box);

    if (item.type === 'submenu' && (isHover || (mouseX > menuX + MENU_W && mouseX < menuX + MENU_W * 2 && mouseY > y && mouseY < y + item.submenu.length * (itemH + gap)))) {
      for (let j = 0; j < item.submenu.length; j++) {
        const subItem = item.submenu[j];
        const subBox = { x: menuX + MENU_W, y: y + j * (itemH + gap), w: MENU_W, h: itemH, i, j };
        const isSubHover = mouseX >= subBox.x && mouseX <= subBox.x + subBox.w && mouseY >= subBox.y && mouseY <= subBox.y + subBox.h;
        fill(isSubHover ? MENU_BG_HOVER : MENU_BG);
        rect(subBox.x, subBox.y, subBox.w, subBox.h);
        if (isSubHover) {
          fill(MENU_ACCENT);
          rect(subBox.x, subBox.y, 3, subBox.h);
        }
        fill(MENU_TEXT);
        text(subItem.label, subBox.x + 16, subBox.y + subBox.h / 2);
        sideMenuBoxes.push(subBox);
      }
    }
    y += itemH + gap;
  }
}
function mousePressed() {
  const inside = mouseX >= menuX && mouseX <= menuX + MENU_W;
  const insideSubmenu = mouseX > menuX + MENU_W && mouseX < menuX + MENU_W * 2;

  if (inside || insideSubmenu) {
    for (const b of sideMenuBoxes) {
      if (mouseX>=b.x && mouseX<=b.x+b.w && mouseY>=b.y && mouseY<=b.y+b.h) {
        let item;
        if (b.j !== undefined) { // is a submenu item
          item = sideMenuItems[b.i].submenu[b.j];
        } else {
          item = sideMenuItems[b.i];
        }

        if (item.type === 'link') {
          window.location.href = item.url;
        } else if (item.type === 'quiz') {
          appState = 'quiz_loading';
        } else if (item.type === 'submenu') {
          window.location.href = item.url;
        }
        return;
      }
    }
  }
  if (appState === 'quiz') for (const btn of buttons) if (btn.hit(mouseX, mouseY)) checkAnswer(btn);
}
function touchStarted(){ mousePressed(); }

// === 測驗 ===
function buildQuiz(rows){
  const pool = shuffle(rows.slice());
  quiz = pool.slice(0, NUM_QUESTIONS);
  qIdx=0; score=0; buttons=[]; particles=[]; toastTimer=0; shakeT=0; pendingAdvance=false;
}
function drawQuiz(){
  const q = quiz[qIdx];
  fill(255); textAlign(LEFT, TOP); textSize(20);
  text(`第 ${qIdx+1} 題／共 ${quiz.length} 題`, 32, 28);
  textSize(26); textWrap(WORD); text(q.question, 32, 64, width-64);

  ensureButtons(4);
  const labels=['A','B','C','D'];
  for (let i=0;i<4;i++){
    const bx=width/2, by=200+i*80, bw=min(width*0.7,720), bh=52;
    buttons[i].set(bx,by,bw,bh,`${labels[i]}. ${q.options[i]}`);
    buttons[i].draw();
  }
}
function checkAnswer(btn){
  if (pendingAdvance) return;
  const q = quiz[qIdx];
  const picked = btn.label.slice(0,1);
  const correct = picked === q.answer;

  makeToast(correct ? '答對了！' : `答錯了：${q.feedback || ''}`, correct);

  if (correct){
    score++;
    for (let i=0;i<80;i++) particles.push(new Particle(width/2, 0)); // 彩帶多一點
  } else {
    shakeT = 18; // 約 300ms 震動
  }

  // 保證特效可見：延遲 800ms 再換題
  pendingAdvance = true;
  setTimeout(() => {
    qIdx++;
    if (qIdx >= quiz.length) appState = 'result';
    pendingAdvance = false;
  }, 800);
}

// === 結果 ===
function drawResult(){
  fill(255); textAlign(CENTER,CENTER);
  const percent=Math.round((score/quiz.length)*100);
  const msg = percent===100?'滿分！太棒了 🎉':
              percent>=70?'很不錯！繼續努力 👍':
              percent>=40?'還可以，再加油 💪':'重考一次吧！💡';
  textSize(48); text(`${score}/${quiz.length}`, width/2, height*0.35);
  textSize(22); text(`${percent} 分\n${msg}`, width/2, height*0.52);
  drawBtn(width/2, height*0.68, 220, 56, '再測一次', ()=>{ buildQuiz(allRows); appState='quiz'; });
  drawBtn(width/2, height*0.78, 220, 44, '返回首頁', ()=>{ appState='home'; });
}

// === UI / 元件 ===
class ChoiceButton{
  constructor(){ this.x=this.y=this.w=this.h=0; this.label=''; }
  set(x,y,w,h,label){ this.x=x; this.y=y; this.w=w; this.h=h; this.label=label; }
  draw(){
    const hover = mouseX>=this.x-this.w/2 && mouseX<=this.x+this.w/2 && mouseY>=this.y-this.h/2 && mouseY<=this.y+this.h/2;
    push(); translate(this.x,this.y); rectMode(CENTER);
    fill(hover?'rgba(255,255,255,0.16)':'rgba(255,255,255,0.08)');
    rect(0,0,this.w,this.h,10);
    fill(255); textAlign(CENTER,CENTER); textSize(18); text(this.label,0,2);
    pop();
  }
  hit(mx,my){ return mx>=this.x-this.w/2 && mx<=this.x+this.w/2 && my>=this.y-this.h/2 && my<=this.y+this.h/2; }
}
function ensureButtons(n){ while(buttons.length<n) buttons.push(new ChoiceButton()); }

// 粒子（彩帶）
class Particle{
  constructor(x,y){
    this.x=x+random(-40,40); this.y=y+random(-10,20);
    this.vx=random(-3,3); this.vy=random(2,6);
    this.life=60+random(20); this.size=random(4,10);
    this.c=color(random(150,255), random(150,255), random(150,255));
  }
  update(){ this.x+=this.vx; this.y+=this.vy; this.vy+=0.12; this.life--; }
  draw(){ noStroke(); fill(this.c); circle(this.x,this.y,this.size); }
  get dead(){ return this.life<=0 || this.y>height+50; }
}
function updateParticles(){
  for(let i=particles.length-1;i>=0;i--){
    particles[i].update(); particles[i].draw();
    if (particles[i].dead) particles.splice(i,1);
  }
}

// 按鈕（防長按重複觸發）
function drawBtn(cx,cy,w,h,label,onClick){
  const hover = mouseX>=cx-w/2 && mouseX<=cx+w/2 && mouseY>=cy-h/2 && mouseY<=cy+h/2;
  fill(hover?'#4456cc':'#3948b4'); rectMode(CENTER); rect(cx,cy,w,h,10);
  fill(255); textAlign(CENTER,CENTER); textSize(18); text(label,cx,cy+1);
  if (hover && mouseIsPressed && !drawBtn._pressed) { drawBtn._pressed = true; onClick && onClick(); }
  if (!mouseIsPressed) drawBtn._pressed = false;
}

// Toast（答對/答錯提示）
function makeToast(txt,good){ toastText=txt; toastGood=!!good; toastTimer=60; }
function drawToastTop(){
  if (toastTimer<=0) return;
  const y = height*0.12;
  fill(toastGood ? 'rgba(78,205,196,0.95)' : 'rgba(255,99,71,0.95)');
  rectMode(CENTER); rect(width/2, y, Math.min(width*0.7, 640), 44, 10);
  fill(0); textAlign(CENTER,CENTER); textSize(16); text(toastText, width/2, y+1);
  toastTimer--;
}

// 工具
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
