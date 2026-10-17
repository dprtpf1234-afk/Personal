/**
 * 우리 반 1인 1역할 - 구글 스프레드시트 연동 (Apps Script)
 * ---------------------------------------------------------
 * 사용법
 *  1. 구글 스프레드시트를 새로 만들고  확장 프로그램 → Apps Script 를 엽니다.
 *  2. 이 파일 내용을 전부 붙여 넣고 저장합니다.
 *  3. 위쪽 함수 목록에서 setupSheet 를 골라 ▶ 실행 (처음 한 번, 권한 허용)
 *     → '명단' 시트가 예시 데이터와 함께 만들어집니다.
 *  4. 배포 → 새 배포 → 유형: 웹 앱
 *       - 실행 계정: 나
 *       - 액세스 권한: 모든 사용자
 *     배포 후 나오는 '웹 앱 URL'(…/exec)을 복사해 앱에 넣습니다.
 *
 * 시트 구조 ('명단' 시트)
 *   A열: 학생 이름   B열: 학급 역할   (1행은 제목, 2행부터 데이터)
 */

const ROSTER_SHEET = '명단';
const RESULT_SHEET = '배정결과';

const EXAMPLE_STUDENTS = [
  '김민준', '이서연', '박도윤', '최하은', '정시우', '강지유',
  '조예준', '윤서아', '장주원', '임하린', '한지호', '오수아',
];
const EXAMPLE_ROLES = [
  '칠판 지킴이', '우유 배달부', '급식 도우미', '화분 물주기',
  '분리수거 대장', '창문 관리자', '전등 관리자', '신발장 정리',
  '책꽂이 정리', '출석 도우미', '알림장 도우미', '컴퓨터 도우미',
];

/* ---------- 처음 한 번 실행: '명단' 시트 만들기 ---------- */
function setupSheet() {
  getRosterSheet_();
}

function getRosterSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ROSTER_SHEET);
  if (sheet) return sheet;

  sheet = ss.insertSheet(ROSTER_SHEET, 0);
  const rows = [['학생 이름', '학급 역할']];
  const n = Math.max(EXAMPLE_STUDENTS.length, EXAMPLE_ROLES.length);
  for (let i = 0; i < n; i++) {
    rows.push([EXAMPLE_STUDENTS[i] || '', EXAMPLE_ROLES[i] || '']);
  }
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2)
    .setFontWeight('bold')
    .setBackground('#ffd6e0')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, 2, 160);
  return sheet;
}

/* ---------- 불러오기: GET …/exec?action=load ---------- */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'load';
  try {
    if (action === 'load') return json_(loadRoster_());
    return json_({ error: '알 수 없는 요청이에요: ' + action });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function loadRoster_() {
  const sheet = getRosterSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { students: [], roles: [] };

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues();
  const clean = (v) => String(v).trim();
  return {
    students: values.map((r) => clean(r[0])).filter(Boolean),
    roles: values.map((r) => clean(r[1])).filter(Boolean),
  };
}

/* ---------- 저장하기: POST …/exec  (본문: JSON 문자열) ---------- */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action !== 'save' || !Array.isArray(data.assignments)) {
      return json_({ error: '저장할 데이터 형식이 올바르지 않아요.' });
    }
    saveResult_(data);
    return json_({ ok: true, count: data.assignments.length });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function saveResult_(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RESULT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(RESULT_SHEET);
    sheet.appendRow(['배정 시각', '학급', '기간', '번호', '학생 이름', '학급 역할']);
    sheet.getRange(1, 1, 1, 6)
      .setFontWeight('bold')
      .setBackground('#d6ecff')
      .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }

  const when = data.createdAt ? new Date(data.createdAt) : new Date();
  const stamp = Utilities.formatDate(when, 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
  const rows = data.assignments.map((a) => [
    stamp, data.className || '', data.period || '', a.no, a.name, a.role,
  ]);
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
