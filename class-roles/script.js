/* =========================================================
   우리 반 1인 1역할 - 동작 로직
   ---------------------------------------------------------
   1. 설정 / 기본 데이터
   2. 화면 요소
   3. 명단 처리
   4. 랜덤 배정
   5. 결과 그리기
   6. 인쇄
   7. 구글 스프레드시트 연동 (다음 단계에서 연결)
   8. 브라우저 저장 (새로고침해도 유지)
   9. 알림 / 시작
   ========================================================= */
'use strict';

/* ---------- 1. 설정 / 기본 데이터 ---------- */
const CONFIG = {
  // 다음 단계: Apps Script 웹 앱 배포 URL을 여기에 붙여 넣으세요.
  // 예) 'https://script.google.com/macros/s/XXXXXXXX/exec'
  SHEET_API_URL: '',
  STORAGE_KEY: 'classRoles.v1',
};

const DEFAULT_STUDENTS = [
  '김민준', '이서연', '박도윤', '최하은', '정시우', '강지유',
  '조예준', '윤서아', '장주원', '임하린', '한지호', '오수아',
];

const DEFAULT_ROLES = [
  '칠판 지킴이', '우유 배달부', '급식 도우미', '화분 물주기',
  '분리수거 대장', '창문 관리자', '전등 관리자', '신발장 정리',
  '책꽂이 정리', '출석 도우미', '알림장 도우미', '컴퓨터 도우미',
];

// 역할 이름에 들어간 낱말로 아이콘을 골라요. (없으면 ⭐)
const ROLE_ICONS = [
  ['칠판', '🧽'], ['우유', '🥛'], ['급식', '🍱'], ['화분', '🪴'], ['식물', '🌱'],
  ['분리수거', '♻️'], ['쓰레기', '🗑️'], ['창문', '🪟'], ['전등', '💡'], ['불', '💡'],
  ['신발', '👟'], ['책', '📚'], ['출석', '📋'], ['알림장', '📒'], ['컴퓨터', '💻'],
  ['청소', '🧹'], ['우편', '📮'], ['체육', '⚽'], ['음악', '🎵'], ['미술', '🎨'],
  ['보건', '🩹'], ['시간', '⏰'], ['정리', '🧺'], ['물', '💧'], ['환기', '🌬️'],
];

const CARD_COLORS = ['pink', 'peach', 'lemon', 'mint', 'sky', 'lavender'];

/* ---------- 2. 화면 요소 ---------- */
const $ = (id) => document.getElementById(id);

const els = {
  className: $('className'),
  period: $('period'),
  studentInput: $('studentInput'),
  roleInput: $('roleInput'),
  studentCount: $('studentCount'),
  roleCount: $('roleCount'),
  countWarning: $('countWarning'),
  btnAssign: $('btnAssign'),
  btnPrint: $('btnPrint'),
  btnReset: $('btnReset'),
  btnLoadSheet: $('btnLoadSheet'),
  btnSaveSheet: $('btnSaveSheet'),
  resultSection: $('resultSection'),
  resultTitle: $('resultTitle'),
  resultMeta: $('resultMeta'),
  cardGrid: $('cardGrid'),
  toast: $('toast'),
};

// 현재 배정 결과
const state = {
  assignments: [], // [{ no, name, role }]
  createdAt: null, // Date
};

/* ---------- 3. 명단 처리 ---------- */
function parseList(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function getStudents() { return parseList(els.studentInput.value); }
function getRoles() { return parseList(els.roleInput.value); }

function setLists(students, roles) {
  els.studentInput.value = students.join('\n');
  els.roleInput.value = roles.join('\n');
  updateCounts();
}

// 인원 수와 역할 수를 확인하고, 맞지 않으면 안내합니다.
function updateCounts() {
  const s = getStudents().length;
  const r = getRoles().length;
  els.studentCount.textContent = `${s}명`;
  els.roleCount.textContent = `${r}개`;

  let message = '';
  if (s === 0 || r === 0) {
    message = '학생 명단과 역할을 한 개 이상 적어 주세요.';
  } else if (s > r) {
    message = `⚠️ 역할이 ${s - r}개 부족해요. 학생 수와 역할 수가 같아야 1인 1역할이 돼요.`;
  } else if (r > s) {
    message = `⚠️ 역할이 ${r - s}개 남아요. 학생 수와 역할 수가 같아야 1인 1역할이 돼요.`;
  }

  els.countWarning.textContent = message;
  els.countWarning.hidden = message === '';
  els.btnAssign.disabled = message !== '';
}

/* ---------- 4. 랜덤 배정 ---------- */
// 피셔-예이츠 셔플: 모든 순서가 같은 확률로 나옵니다.
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function assignRoles() {
  const students = getStudents();
  const roles = getRoles();
  if (students.length === 0 || students.length !== roles.length) {
    updateCounts();
    return;
  }

  const shuffledRoles = shuffle(roles);
  // 학생은 명단 순서(번호)를 유지하고, 역할만 섞어서 짝지어요.
  state.assignments = students.map((name, i) => ({
    no: i + 1,
    name,
    role: shuffledRoles[i],
  }));
  state.createdAt = new Date();

  renderResult();
  saveLocal();
  showToast('🎉 역할 배정 완료! 모두 화이팅!');
  els.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- 5. 결과 그리기 ---------- */
function getRoleIcon(role) {
  const found = ROLE_ICONS.find(([word]) => role.includes(word));
  return found ? found[1] : '⭐';
}

function formatDate(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

function renderHeader() {
  const className = els.className.value.trim() || '우리 반';
  els.resultTitle.textContent = `🌈 ${className} 1인 1역할`;

  const parts = [];
  const period = els.period.value.trim();
  if (period) parts.push(`기간: ${period}`);
  if (state.createdAt) parts.push(`배정일: ${formatDate(state.createdAt)}`);
  els.resultMeta.textContent = parts.join('  ·  ');
}

function renderResult() {
  renderHeader();
  els.cardGrid.innerHTML = '';

  const hasResult = state.assignments.length > 0;
  els.resultSection.classList.toggle('has-result', hasResult);
  if (!hasResult) return;

  const fragment = document.createDocumentFragment();
  state.assignments.forEach((item, i) => {
    const card = document.createElement('article');
    card.className = `card ${CARD_COLORS[i % CARD_COLORS.length]}`;
    card.style.setProperty('--i', i);

    const no = document.createElement('span');
    no.className = 'card-no';
    no.textContent = item.no;

    const icon = document.createElement('div');
    icon.className = 'card-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = getRoleIcon(item.role);

    const role = document.createElement('div');
    role.className = 'card-role';
    role.textContent = item.role;

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = item.name;

    card.append(no, icon, role, name);
    fragment.appendChild(card);
  });
  els.cardGrid.appendChild(fragment);
}

/* ---------- 6. 인쇄 ---------- */
function printResult() {
  if (state.assignments.length === 0) {
    showToast('먼저 🎲 역할 배정하기를 눌러 주세요!');
    return;
  }
  renderHeader();
  window.print();
}

/* ---------- 7. 구글 스프레드시트 연동 (다음 단계) ----------
   Apps Script 웹 앱과 주고받을 데이터 형식(약속):

   [불러오기]  GET  SHEET_API_URL?action=load
     응답 → { "students": ["김민준", ...], "roles": ["칠판 지킴이", ...] }

   [저장하기]  POST SHEET_API_URL
     보내는 값 → {
       "action": "save",
       "className": "3학년 2반",
       "period": "10월 3주 ~ 11월 2주",
       "createdAt": "2026-10-17T03:30:00.000Z",
       "assignments": [{ "no": 1, "name": "김민준", "role": "칠판 지킴이" }, ...]
     }

   ※ Content-Type을 text/plain으로 보내면 Apps Script에서
     CORS 사전 요청(preflight) 문제 없이 받을 수 있어요.
     (Apps Script 쪽에서는 JSON.parse(e.postData.contents)로 읽으면 됩니다.)
   ------------------------------------------------------------ */
function isSheetReady() {
  if (!CONFIG.SHEET_API_URL) {
    showToast('🔧 시트 연결은 다음 단계에서 준비할게요!');
    return false;
  }
  return true;
}

async function loadFromSheet() {
  if (!isSheetReady()) return;
  setBusy(els.btnLoadSheet, true, '⏳ 불러오는 중...');
  try {
    const res = await fetch(`${CONFIG.SHEET_API_URL}?action=load`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.students) || !Array.isArray(data.roles)) {
      throw new Error('데이터 형식이 올바르지 않아요.');
    }
    setLists(data.students, data.roles);
    saveLocal();
    showToast('✅ 시트에서 명단을 불러왔어요!');
  } catch (err) {
    console.error(err);
    showToast('😢 시트를 불러오지 못했어요. 주소와 권한을 확인해 주세요.');
  } finally {
    setBusy(els.btnLoadSheet, false);
  }
}

async function saveToSheet() {
  if (state.assignments.length === 0) {
    showToast('먼저 🎲 역할 배정하기를 눌러 주세요!');
    return;
  }
  if (!isSheetReady()) return;

  const payload = {
    action: 'save',
    className: els.className.value.trim(),
    period: els.period.value.trim(),
    createdAt: state.createdAt.toISOString(),
    assignments: state.assignments,
  };

  setBusy(els.btnSaveSheet, true, '⏳ 저장 중...');
  try {
    const res = await fetch(CONFIG.SHEET_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast('✅ 시트에 결과를 저장했어요!');
  } catch (err) {
    console.error(err);
    showToast('😢 저장하지 못했어요. 주소와 권한을 확인해 주세요.');
  } finally {
    setBusy(els.btnSaveSheet, false);
  }
}

function setBusy(button, busy, busyText) {
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

/* ---------- 8. 브라우저 저장 (새로고침해도 유지) ---------- */
function saveLocal() {
  try {
    const data = {
      className: els.className.value,
      period: els.period.value,
      students: getStudents(),
      roles: getRoles(),
      assignments: state.assignments,
      createdAt: state.createdAt ? state.createdAt.toISOString() : null,
    };
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // 저장이 막힌 환경(시크릿 모드 등)에서는 조용히 넘어갑니다.
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function resetToDefault() {
  if (!confirm('예시 명단으로 되돌릴까요? 지금 적힌 명단과 결과가 지워져요.')) return;
  els.className.value = '3학년 2반';
  els.period.value = '';
  setLists(DEFAULT_STUDENTS, DEFAULT_ROLES);
  state.assignments = [];
  state.createdAt = null;
  renderResult();
  saveLocal();
  showToast('↩️ 예시 데이터로 되돌렸어요.');
}

/* ---------- 9. 알림 / 시작 ---------- */
let toastTimer = null;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2400);
}

function init() {
  const saved = loadLocal();
  if (saved && Array.isArray(saved.students) && Array.isArray(saved.roles)) {
    els.className.value = saved.className || '3학년 2반';
    els.period.value = saved.period || '';
    setLists(saved.students, saved.roles);
    state.assignments = Array.isArray(saved.assignments) ? saved.assignments : [];
    state.createdAt = saved.createdAt ? new Date(saved.createdAt) : null;
  } else {
    setLists(DEFAULT_STUDENTS, DEFAULT_ROLES);
  }
  renderResult();

  // 이벤트 연결
  els.btnAssign.addEventListener('click', assignRoles);
  els.btnPrint.addEventListener('click', printResult);
  els.btnReset.addEventListener('click', resetToDefault);
  els.btnLoadSheet.addEventListener('click', loadFromSheet);
  els.btnSaveSheet.addEventListener('click', saveToSheet);

  [els.studentInput, els.roleInput].forEach((input) => {
    input.addEventListener('input', () => { updateCounts(); saveLocal(); });
  });
  [els.className, els.period].forEach((input) => {
    input.addEventListener('input', () => { renderHeader(); saveLocal(); });
  });
}

document.addEventListener('DOMContentLoaded', init);
