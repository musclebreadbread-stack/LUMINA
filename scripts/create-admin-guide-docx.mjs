import { writeFile } from "node:fs/promises";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

const OUTPUT = new URL("../docs/LUMINA-관리자-모드-사용-안내서.docx", import.meta.url);

const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const CONTENT_WIDTH = 10106;
const FONT = "Malgun Gothic";
const MONO = "Consolas";

const COLORS = Object.freeze({
  ink: "1D2420",
  body: "313936",
  muted: "65706A",
  faint: "8B948F",
  paper: "FBFAF7",
  white: "FFFFFF",
  panel: "F1F4F0",
  panelWarm: "F7F2E9",
  panelCool: "EAF3F0",
  line: "D8DED9",
  accent: "1B6B5C",
  accentDark: "12483E",
  accentSoft: "CFE5DE",
  amber: "986A19",
  amberSoft: "FFF4D9",
  red: "9A3B35",
  redSoft: "FCECE9",
  code: "244D43",
});

const TABLE_BORDERS = Object.freeze({
  top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line },
  left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line },
  right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 3, color: COLORS.line },
  insideVertical: { style: BorderStyle.SINGLE, size: 3, color: COLORS.line },
});

function run(text, options = {}) {
  return new TextRun({
    text,
    font: options.font ?? FONT,
    size: options.size ?? 20,
    color: options.color ?? COLORS.body,
    bold: options.bold ?? false,
    italics: options.italics ?? false,
    allCaps: options.allCaps ?? false,
  });
}

function codeRun(text) {
  return run(text, { font: MONO, size: 18, color: COLORS.code });
}

function paragraph(content, options = {}) {
  const { run: runOptions, ...paragraphOptions } = options;
  const children = typeof content === "string" ? [run(content, runOptions ?? {})] : content;
  return new Paragraph({
    spacing: { after: 150, line: 285 },
    children,
    ...paragraphOptions,
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  const isTop = level === HeadingLevel.HEADING_1;
  return new Paragraph({
    heading: level,
    keepNext: true,
    spacing: { before: isTop ? 360 : 230, after: 130, line: 270 },
    children: [run(text, {
      size: isTop ? 30 : 23,
      color: isTop ? COLORS.accentDark : COLORS.ink,
      bold: true,
    })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function spacer(after = 100) {
  return new Paragraph({ spacing: { after }, children: [] });
}

function bullet(text, level = 0) {
  return paragraph(text, {
    numbering: { reference: "admin-bullets", level },
    indent: { left: level === 0 ? 560 : 1020, hanging: 280 },
  });
}

function numbered(text, level = 0) {
  return paragraph(text, {
    numbering: { reference: "admin-steps", level },
    indent: { left: level === 0 ? 560 : 1020, hanging: 280 },
  });
}

function cellParagraph(content, options = {}) {
  const { run: runOptions, after, line, ...paragraphOptions } = options;
  const children = typeof content === "string" ? [run(content, runOptions ?? {})] : content;
  return new Paragraph({
    spacing: { after: after ?? 45, line: line ?? 250 },
    children,
    ...paragraphOptions,
  });
}

function cell(content, width, options = {}) {
  const children = Array.isArray(content)
    ? content.length > 0 && content.every((item) => typeof item === "string" || item instanceof TextRun)
      ? [cellParagraph(content)]
      : content.map((item) => typeof item === "string" ? cellParagraph(item) : item)
    : [cellParagraph(content)];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 110, bottom: 110, left: 145, right: 145 },
    verticalAlign: options.verticalAlign ?? VerticalAlign.CENTER,
    shading: {
      type: ShadingType.CLEAR,
      fill: options.fill ?? COLORS.white,
    },
    children,
  });
}

function headerCell(text, width) {
  return cell([cellParagraph(text, { run: { bold: true, size: 18, color: COLORS.white } })], width, { fill: COLORS.accent });
}

function dataTable(widths, rows, options = {}) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    borders: options.borders ?? TABLE_BORDERS,
    rows: rows.map((row) => new TableRow({ cantSplit: true, children: row })),
  });
}

function callout(label, title, body, fill = COLORS.panelWarm, accent = COLORS.amber) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    borders: TABLE_BORDERS,
    rows: [new TableRow({
      cantSplit: true,
      children: [cell([
        cellParagraph(label, { run: { font: MONO, size: 15, color: accent, bold: true }, after: 65 }),
        cellParagraph(title, { run: { size: 21, color: COLORS.ink, bold: true }, after: 75 }),
        cellParagraph(body, { run: { size: 18, color: COLORS.body }, after: 0 }),
      ], CONTENT_WIDTH, { fill })],
    })],
  });
}

function sectionIntro(text) {
  return paragraph(text, { run: { size: 21, color: COLORS.body } });
}

function makeHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: [run("LUMINA  /  ADMIN GUIDE", { font: MONO, size: 14, color: COLORS.faint, allCaps: true })],
    })],
  });
}

function makeFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        run("LUMINA 관리자 모드 사용 안내서  ·  ", { font: MONO, size: 14, color: COLORS.faint }),
        new TextRun({ children: [PageNumber.CURRENT], font: MONO, size: 14, color: COLORS.faint }),
      ],
    })],
  });
}

const children = [
  new Paragraph({
    spacing: { before: 900, after: 110 },
    children: [run("LUMINA / OPERATIONS", { font: MONO, size: 17, color: COLORS.accent, bold: true, allCaps: true })],
  }),
  new Paragraph({
    spacing: { after: 40, line: 570 },
    children: [run("관리자 모드", { size: 47, color: COLORS.ink, bold: true })],
  }),
  new Paragraph({
    spacing: { after: 160, line: 570 },
    children: [run("사용 안내서", { size: 47, color: COLORS.ink, bold: true })],
  }),
  paragraph("방문 현황과 솔루션 사용 흐름을 쉽고 안전하게 읽는 단계별 가이드", {
    run: { size: 23, color: COLORS.accentDark },
    spacing: { after: 270, line: 330 },
  }),
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [1700, 8406],
    borders: { top: { style: BorderStyle.NONE, size: 0, color: COLORS.white }, bottom: { style: BorderStyle.NONE, size: 0, color: COLORS.white }, left: { style: BorderStyle.NONE, size: 0, color: COLORS.white }, right: { style: BorderStyle.NONE, size: 0, color: COLORS.white }, insideVertical: { style: BorderStyle.NONE, size: 0, color: COLORS.white }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: COLORS.white } },
    rows: [new TableRow({
      cantSplit: true,
      children: [
        cell([cellParagraph("01", { run: { font: MONO, size: 28, color: COLORS.white, bold: true }, after: 0 })], 1700, { fill: COLORS.accent }),
        cell([cellParagraph("로그인 → 기간 선택 → 지표 확인 → 데이터 상태 점검 → 로그아웃", { run: { size: 21, color: COLORS.ink, bold: true }, after: 0 })], 8406, { fill: COLORS.accentSoft }),
      ],
    })],
  }),
  spacer(260),
  dataTable([2200, 7906], [
    [headerCell("문서 정보", 2200), headerCell("내용", 7906)],
    [cell("대상", 2200, { fill: COLORS.panel }), cell("LUMINA 관리자·운영 담당자·분석 담당자", 7906)],
    [cell("주요 화면", 2200, { fill: COLORS.panel }), cell([codeRun("/admin/login"), run(" 로그인 화면  /  "), codeRun("/admin/analytics"), run(" 분석 대시보드")], 7906)],
    [cell("기준일", 2200, { fill: COLORS.panel }), cell("2026년 8월 31일 · 현재 코드와 운영 메모 기준", 7906)],
    [cell("문서 성격", 2200, { fill: COLORS.panel }), cell("일상 사용법 + 운영 준비·문제 해결 참고자료", 7906)],
  ]),
  spacer(190),
  callout("읽기 전에", "이 문서는 현재 구현을 기준으로 합니다.", "화면에 로그인 폼이 보여도 Neon Auth 계정과 활성 관리자 멤버십이 모두 준비되어 있어야 분석 화면에 들어갈 수 있습니다. 운영 환경의 마이그레이션·환경 변수·Cron 활성화 여부는 별도 점검이 필요합니다.", COLORS.panelCool, COLORS.accent),
  pageBreak(),

  heading("1. 관리자 모드 한눈에 보기"),
  sectionIntro("관리자 모드는 LUMINA의 방문 흐름과 솔루션 이용 흐름을 집계해서 보여주는 운영용 화면입니다. 개인의 검사 답변이나 생년월일을 열람하는 화면이 아니라, 날짜·솔루션·이벤트 단위의 집계 현황을 확인하는 콘솔입니다."),
  heading("1.1 가장 빠른 사용 흐름", HeadingLevel.HEADING_2),
  dataTable([700, 2200, 7206], [
    [headerCell("순서", 700), headerCell("무엇을 하나요?", 2200), headerCell("쉽게 말하면", 7206)],
    [cell("1", 700, { fill: COLORS.panel }), cell("관리자 주소 열기", 2200), cell([codeRun("/admin"), run(" 또는 "), codeRun("/admin/login"), run("으로 이동합니다.")], 7206)],
    [cell("2", 700, { fill: COLORS.panel }), cell("로그인", 2200), cell("Neon Auth 이메일과 비밀번호를 입력하고 로그인합니다.", 7206)],
    [cell("3", 700, { fill: COLORS.panel }), cell("권한 확인", 2200), cell("계정 로그인뿐 아니라 활성 관리자 멤버십과 역할이 확인되어야 합니다.", 7206)],
    [cell("4", 700, { fill: COLORS.panel }), cell("범위 선택", 2200), cell("오늘·최근 7/30/90일 또는 사용자 지정 날짜와 솔루션을 선택합니다.", 7206)],
    [cell("5", 700, { fill: COLORS.panel }), cell("읽고 기록하기", 2200), cell("숫자·추세·퍼널·데이터 상태를 함께 보고, 필요하면 안전하게 로그아웃합니다.", 7206)],
  ]),
  spacer(150),
  heading("1.2 이 안내서의 표기", HeadingLevel.HEADING_2),
  dataTable([1800, 8306], [
    [cell([cellParagraph("일상 사용", { run: { size: 18, color: COLORS.accentDark, bold: true }, after: 0 })], 1800, { fill: COLORS.panelCool }), cell("관리자가 매일 또는 매주 대시보드를 확인할 때 따라 하는 절차입니다.", 8306)],
    [cell([cellParagraph("운영 담당자", { run: { size: 18, color: COLORS.amber, bold: true }, after: 0 })], 1800, { fill: COLORS.amberSoft }), cell("마이그레이션·환경 변수·롤업처럼 배포 권한과 변경 승인이 필요한 작업입니다.", 8306)],
    [cell([cellParagraph("주의", { run: { size: 18, color: COLORS.red, bold: true }, after: 0 })], 1800, { fill: COLORS.redSoft }), cell("숫자를 해석할 때의 한계, 개인 정보 보호, 실시간 데이터와 롤업 데이터의 차이입니다.", 8306)],
  ]),
  spacer(140),
  callout("핵심 원칙", "숫자 하나보다 ‘기간 + 출처 + 신선도’를 함께 봅니다.", "예를 들어 방문자 수가 0으로 보인다고 바로 방문자가 없었다고 결론 내리지 않습니다. 먼저 데이터 상태 패널에서 출처가 live인지, 롤업인지, 비어 있는지, 사용할 수 없는지 확인합니다.", COLORS.panelWarm, COLORS.amber),
  pageBreak(),

  heading("2. 접속 전 준비"),
  sectionIntro("관리자 모드 사용에는 일반 사용자 회원가입과 별도의 운영 권한이 필요합니다. 공개 회원가입을 했다고 관리자 권한이 생기지 않습니다."),
  heading("2.1 준비물 체크", HeadingLevel.HEADING_2),
  numbered("Neon Auth에 등록된 관리자용 이메일과 비밀번호를 준비합니다."),
  numbered("운영 담당자에게 내 Neon Auth 사용자 ID가 활성 관리자 멤버십으로 등록되어 있는지 확인합니다."),
  numbered("접속할 서비스 도메인과 관리자 경로를 확인합니다. 주소를 모르면 운영 담당자에게 공식 링크를 받습니다."),
  numbered("분석 데이터가 준비되어 있는지 확인합니다. 최초 활성화 직후에는 마이그레이션·원천 데이터·롤업 설정에 시간이 필요할 수 있습니다."),
  spacer(100),
  heading("2.2 역할별 권한", HeadingLevel.HEADING_2),
  dataTable([1400, 2600, 6106], [
    [headerCell("역할", 1400), headerCell("할 수 있는 일", 2600), headerCell("현재 구현에서의 의미", 6106)],
    [cell([cellParagraph("viewer", { run: { font: MONO, size: 17, color: COLORS.accentDark, bold: true }, after: 0 })], 1400, { fill: COLORS.panelCool }), cell("집계 분석 + Health 읽기", 2600), cell("방문·페이지뷰·솔루션 이벤트 집계와 동기화 상태·요청 범위·완료 시각 같은 비식별 Health 메타데이터를 읽을 수 있습니다. 감사 로그 자체를 읽는 권한은 없습니다.", 6106)],
    [cell([cellParagraph("analyst", { run: { font: MONO, size: 17, color: COLORS.accentDark, bold: true }, after: 0 })], 1400, { fill: COLORS.panelCool }), cell("집계 + 운영 상태 읽기", 2600), cell("viewer 권한에 더해 감사 로그를 읽을 수 있습니다. 현재 화면에는 별도의 수동 동기화·내보내기 버튼이 제공되지 않습니다.", 6106)],
    [cell([cellParagraph("owner", { run: { font: MONO, size: 17, color: COLORS.accentDark, bold: true }, after: 0 })], 1400, { fill: COLORS.panelCool }), cell("전체 운영 권한 범위", 2600), cell("현재 분석 화면은 analyst와 같은 읽기 경험을 제공합니다. 멤버십 등록·환경 변경·운영 적용은 화면 밖의 승인된 운영 절차로 처리합니다.", 6106)],
  ]),
  spacer(130),
  callout("권한의 핵심", "로그인 성공과 관리자 접근 허용은 서로 다른 확인입니다.", "Neon Auth가 이메일·비밀번호를 확인한 뒤에도 ops.admin_members에 active=true인 역할(viewer·analyst·owner)이 없으면 접근이 허용되지 않습니다. 이 경우 일반 사용자가 직접 해결할 수 없고 운영 담당자의 멤버십 확인이 필요합니다.", COLORS.redSoft, COLORS.red),
  pageBreak(),

  heading("3. 로그인 단계별 사용법"),
  sectionIntro("아래 절차는 처음 접속하는 사람도 그대로 따라 할 수 있도록 작성했습니다."),
  heading("3.1 로그인하기", HeadingLevel.HEADING_2),
  numbered("브라우저 주소창에 공식 서비스 주소 뒤에 /admin을 입력합니다. 이미 로그인되어 있지 않으면 로그인 화면으로 이동합니다."),
  numbered("로그인 화면에서 관리자용 Neon Auth 이메일을 입력합니다."),
  numbered("비밀번호를 입력합니다. 비밀번호를 안내서나 채팅, 스크린샷에 적어 두지 않습니다."),
  numbered("로그인 버튼을 한 번만 누르고 잠시 기다립니다. 성공하면 관리자 분석 화면으로 이동합니다."),
  numbered("분석 화면이 열리면 화면 상단의 기간과 데이터 상태를 먼저 확인합니다."),
  numbered("업무가 끝나면 화면 상단의 로그아웃 버튼을 눌러 세션을 종료합니다."),
  spacer(100),
  heading("3.2 상태별로 어떻게 보이나요?", HeadingLevel.HEADING_2),
  dataTable([2400, 3300, 4406], [
    [headerCell("상태", 2400), headerCell("보이는 결과", 3300), headerCell("다음 행동", 4406)],
    [cell("로그인 전", 2400, { fill: COLORS.panel }), cell([codeRun("/admin/login"), run(" 화면")], 3300), cell("계정을 입력해 로그인합니다.", 4406)],
    [cell("인증 + 활성 멤버십", 2400, { fill: COLORS.panelCool }), cell([codeRun("/admin/analytics"), run(" 대시보드")], 3300), cell("기간·솔루션 필터를 선택하고 지표를 읽습니다.", 4406)],
    [cell("인증했지만 멤버십 없음", 2400, { fill: COLORS.redSoft }), cell("일반 오류 안내 후 세션이 종료될 수 있음", 3300), cell("운영 담당자에게 사용자 ID 등록과 active 상태를 확인해 달라고 요청합니다.", 4406)],
    [cell("런타임 설정 미완료", 2400, { fill: COLORS.amberSoft }), cell("설정 안내 또는 데이터 사용 불가 상태", 3300), cell("Neon Auth·DB·분석 원천·롤업 설정을 운영 담당자가 점검합니다.", 4406)],
  ]),
  spacer(135),
  callout("오류 메시지에 대한 안내", "화면이 구체적인 이유를 숨기는 것은 정상적인 보안 동작입니다.", "로그인 실패 화면은 계정 존재 여부나 권한 여부를 과도하게 노출하지 않도록 일반 안내를 사용합니다. 같은 문제가 반복되면 비밀번호를 여러 곳에 복사하지 말고, 화면 상태와 발생 시각만 운영 담당자에게 전달합니다.", COLORS.panelWarm, COLORS.amber),
  pageBreak(),

  heading("4. 대시보드 첫 화면 읽기"),
  sectionIntro("로그인 직후에는 모든 숫자를 한꺼번에 해석하려 하지 말고, 위에서 아래로 같은 순서로 읽으면 됩니다."),
  heading("4.1 화면을 위에서 아래로 읽는 순서", HeadingLevel.HEADING_2),
  dataTable([2200, 3900, 4006], [
    [headerCell("화면 영역", 2200), headerCell("무엇이 보이나요?", 3900), headerCell("먼저 확인할 질문", 4006)],
    [cell("상단 헤더", 2200, { fill: COLORS.panel }), cell("LUMINA / OPERATIONS ANALYTICS, 홈, 로그아웃", 3900), cell("내가 공식 관리자 화면에 들어온 것이 맞나?", 4006)],
    [cell("기간·솔루션 필터", 2200, { fill: COLORS.panel }), cell("프리셋, 시작일, 종료일, 솔루션, 적용 버튼", 3900), cell("지금 보고 있는 기간과 대상은 정확한가?", 4006)],
    [cell("요약 카드", 2200, { fill: COLORS.panel }), cell("방문자·페이지뷰·진입·완료·결과·공유", 3900), cell("이전 같은 길이의 기간보다 흐름이 늘었나 줄었나?", 4006)],
    [cell("트래픽 추세", 2200, { fill: COLORS.panel }), cell("일별 페이지뷰 실선·방문자 점선 그래프와 상세표", 3900), cell("특정 날짜에 유입 급증·급감이 있었나?", 4006)],
    [cell("솔루션 사용 현황", 2200, { fill: COLORS.panel }), cell("솔루션별 진입·완료·결과·완료율·결과율·스파크라인", 3900), cell("어떤 솔루션이 많이 시작되고 끝까지 이어졌나?", 4006)],
    [cell("퍼널", 2200, { fill: COLORS.panel }), cell("진입 → 완료 → 결과 → 공유 단계별 막대", 3900), cell("선택한 대상에서 어느 단계가 가장 많이 줄었나?", 4006)],
    [cell("데이터 상태", 2200, { fill: COLORS.panel }), cell("출처·신선도·마지막 동기화·커버리지", 3900), cell("이 숫자를 지금 의사결정에 사용해도 되는 상태인가?", 4006)],
  ]),
  spacer(140),
  heading("4.2 요약 카드의 공통 규칙", HeadingLevel.HEADING_2),
  bullet("큰 숫자는 선택한 기간에 대한 집계 값입니다."),
  bullet("카드 아래의 ↑·↓·→와 퍼센트는 직전의 동일한 일수 기간과 비교한 변화입니다."),
  bullet("비교 대상이 없거나 이전 값이 0이면 비교 퍼센트가 —로 보일 수 있습니다."),
  bullet("방문자·페이지뷰는 트래픽 집계이고, 진입·완료·결과·공유는 계측 이벤트 집계입니다. 같은 종류의 숫자로 섞어 읽지 않습니다."),
  spacer(120),
  callout("30초 점검", "기간 → 출처 → 신선도 → 급증/급감 → 퍼널 순서로 보세요.", "이 순서를 지키면 ‘데이터가 오래된 것인지’, ‘오늘이 아직 진행 중인 것인지’, ‘실제로 특정 단계에서 이탈한 것인지’를 빠르게 분리할 수 있습니다.", COLORS.panelCool, COLORS.accent),
  pageBreak(),

  heading("5. 기간과 솔루션 필터 사용법"),
  sectionIntro("기간 필터는 대시보드 해석의 기준입니다. 같은 숫자도 오늘의 부분 집계인지, 최근 30일의 누적 흐름인지에 따라 의미가 달라집니다."),
  heading("5.1 기간을 선택하는 방법", HeadingLevel.HEADING_2),
  numbered("기간 드롭다운에서 오늘, 최근 7일, 최근 30일, 최근 90일 또는 사용자 지정을 선택합니다."),
  numbered("사용자 지정을 선택했다면 시작일(from)과 종료일(to)을 모두 입력합니다."),
  numbered("시작일이 종료일보다 늦지 않은지 확인합니다. 사용자 지정 기간은 최대 366일까지 입력할 수 있습니다."),
  numbered("솔루션 드롭다운에서 전체 솔루션 또는 궁합 등 특정 솔루션을 선택합니다."),
  numbered("적용 버튼을 눌러 URL 쿼리 기준으로 화면을 다시 불러옵니다."),
  spacer(100),
  dataTable([1800, 2500, 5806], [
    [headerCell("선택지", 1800), headerCell("언제 쓰나요?", 2500), headerCell("해석 팁", 5806)],
    [cell("오늘", 1800, { fill: COLORS.panel }), cell("당일 운영 확인", 2500), cell("현재 시점까지의 부분 집계입니다. 하루가 끝나기 전에는 낮게 보이는 것이 자연스럽습니다.", 5806)],
    [cell("최근 7일", 1800, { fill: COLORS.panel }), cell("일상·주간 점검", 2500), cell("기본 화면입니다. 최근 흐름과 직전 7일 비교를 보기 좋습니다.", 5806)],
    [cell("최근 30일", 1800, { fill: COLORS.panel }), cell("월간 운영 분석", 2500), cell("요일·주말 효과를 어느 정도 완화하면서 반복 패턴을 봅니다.", 5806)],
    [cell("최근 90일", 1800, { fill: COLORS.panel }), cell("분기 방향 확인", 2500), cell("캠페인·릴리스·계절 요인의 영향을 함께 고려합니다.", 5806)],
    [cell("사용자 지정", 1800, { fill: COLORS.panel }), cell("특정 사건 전후 비교", 2500), cell("양쪽 날짜를 입력해야 하며, 잘못된 입력은 기본 최근 7일 범위로 처리될 수 있습니다.", 5806)],
  ]),
  spacer(120),
  heading("5.2 솔루션 필터는 무엇을 바꾸나요?", HeadingLevel.HEADING_2),
  paragraph("솔루션 필터는 선택한 솔루션의 퍼널을 집중해서 읽기 위한 기능입니다. 전체 솔루션을 선택하면 전체 퍼널이 보이고, 궁합·다크 트라이어드·애착유형검사 등 하나를 선택하면 해당 대상의 퍼널 제목과 단계별 수치를 확인할 수 있습니다."),
  callout("현재 화면의 동작", "솔루션 사용 현황 표는 비교를 위해 전체 솔루션 목록을 유지합니다.", "솔루션 드롭다운을 바꾸었을 때 가장 직접적으로 바뀌는 영역은 퍼널입니다. 솔루션 사용 현황 표는 전체 솔루션을 나란히 비교하는 표로 남아 있으므로, 특정 솔루션의 상세 흐름은 퍼널과 해당 행을 함께 읽습니다.", COLORS.panelCool, COLORS.accent),
  spacer(120),
  paragraph([run("표시되는 솔루션 예시: ", { bold: true, color: COLORS.ink }), run("사주, 점성술, 타로, 수비학, 심리측정, 융 심리, 다크 트라이어드, 애착유형, EQ, 인지, 별자리, 궁합.")]),
  paragraph([run("참고: ", { bold: true, color: COLORS.amber }), run("통합 리포트 관련 이벤트도 계측 대상이지만, 현재 솔루션 드롭다운은 위의 분석 키 중심으로 제공됩니다. 통합 리포트 수치를 별도 운영 지표로 해석해야 할 때는 구현·데이터 담당자에게 확인합니다.")]),
  pageBreak(),

  heading("6. 핵심 지표를 정확하게 해석하기"),
  sectionIntro("관리자 화면의 숫자는 운영 의사결정에 유용하지만, 개인별 행동을 완벽하게 복원하는 기록은 아닙니다. 아래 정의와 한계를 함께 봅니다."),
  heading("6.1 지표 사전", HeadingLevel.HEADING_2),
  dataTable([1800, 3500, 4806], [
    [headerCell("지표", 1800), headerCell("무엇을 뜻하나요?", 3500), headerCell("주의할 점", 4806)],
    [cell("방문자", 1800, { fill: COLORS.panelCool }), cell("해당 기간에 방문한 고유 방문자 집계", 3500), cell("Neon 롤업으로 표시될 때는 일별 고유 방문자 수를 합산하므로 기간 전체의 고유 방문자와 다를 수 있습니다. ‘대략적인 방문 규모’로 읽습니다.", 4806)],
    [cell("페이지뷰", 1800, { fill: COLORS.panelCool }), cell("페이지가 조회된 횟수", 3500), cell("같은 사람이 여러 페이지를 보거나 다시 열면 여러 번 집계될 수 있습니다.", 4806)],
    [cell("진입", 1800, { fill: COLORS.panelCool }), cell("solution_entry 이벤트", 3500), cell("완료율의 분모는 솔루션 랜딩 진입(solution_entry)입니다. test_start는 별도 참고 지표이며 진입 수에 중복 반영하지 않습니다.", 4806)],
    [cell("완료", 1800, { fill: COLORS.panelCool }), cell("test_complete 이벤트 수", 3500), cell("검사 완료 이벤트가 몇 번 발생했는지를 나타냅니다. 새로고침·재시도 등 이벤트 설계의 영향을 받을 수 있습니다.", 4806)],
    [cell("결과", 1800, { fill: COLORS.panelCool }), cell("result_view 이벤트 수", 3500), cell("결과 화면 조회 이벤트 수입니다. 완료자 수와 반드시 일치한다고 가정하지 않습니다.", 4806)],
    [cell("공유", 1800, { fill: COLORS.panelCool }), cell("현재 요약 카드와 퍼널에서는 share_open 수", 3500), cell("공유 창을 연 횟수입니다. 이미지 저장(share_image_saved)은 별도 이벤트로 계측되므로 ‘공유 창 열기’와 ‘이미지 저장’을 혼동하지 않습니다.", 4806)],
  ]),
  spacer(140),
  heading("6.2 비율과 비교값", HeadingLevel.HEADING_2),
  dataTable([2400, 3700, 4006], [
    [headerCell("표시 항목", 2400), headerCell("계산 방식", 3700), headerCell("읽는 방법", 4006)],
    [cell("완료율", 2400, { fill: COLORS.panel }), cell("완료 수 ÷ 진입 수 × 100", 3700), cell("진입 이벤트 중 완료 이벤트가 차지하는 비율입니다. 고유 사용자 완료율이 아닙니다.", 4006)],
    [cell("결과율", 2400, { fill: COLORS.panel }), cell("결과 수 ÷ 진입 수 × 100", 3700), cell("진입 이벤트 중 결과 조회까지 이어진 비율입니다. 이벤트 재발생에 따라 100%를 넘을 가능성도 이론적으로 배제하지 않습니다.", 4006)],
    [cell("변화 퍼센트", 2400, { fill: COLORS.panel }), cell("현재 범위와 직전 동일 일수 범위 비교", 3700), cell("기간이 다르면 비교가 왜곡됩니다. 오늘은 아직 진행 중이므로 추세 판단을 보류합니다.", 4006)],
  ]),
  spacer(130),
  callout("가상의 읽기 예시", "최근 7일 진입 210회, 완료 126회라면 완료율은 60.0%입니다.", "이 값은 126 ÷ 210으로 계산한 이벤트 비율입니다. ‘210명이 시작해서 126명이 완료했다’고 단정하지 않고, 계측 이벤트 흐름이 그 정도였다고 표현하는 것이 정확합니다. 실제 운영에서는 출처와 신선도도 함께 기록합니다.", COLORS.panelCool, COLORS.accent),
  pageBreak(),

  heading("7. 그래프와 퍼널을 읽는 방법"),
  sectionIntro("그래프는 추세를 찾는 도구이고, 퍼널은 어느 단계에서 흐름이 줄어드는지 찾는 도구입니다. 둘을 함께 보면 원인을 좁힐 수 있습니다."),
  heading("7.1 트래픽 추세 그래프", HeadingLevel.HEADING_2),
  bullet("실선은 페이지뷰, 점선은 방문자 흐름입니다."),
  bullet("가로축은 Asia/Seoul 기준 날짜입니다. 하루가 바뀌는 기준은 한국 시간입니다."),
  bullet("그래프 아래의 ‘이벤트 수·개수’ 상세 영역을 펼치면 날짜별 페이지뷰와 방문자 값을 표로 확인할 수 있습니다."),
  bullet("하루만 급증한 경우에는 캠페인·공유·외부 유입·봇/비정상 트래픽 가능성을 구분하기 위해 해당 날짜의 배포·홍보 기록과 함께 확인합니다."),
  spacer(120),
  heading("7.2 솔루션 사용 현황 표", HeadingLevel.HEADING_2),
  bullet("스파크라인은 선택 기간 동안 해당 솔루션의 진입 흐름을 작게 요약한 그래프입니다."),
  bullet("진입 수가 많아도 완료율이 낮을 수 있고, 진입 수가 적어도 완료율이 높을 수 있습니다. 절대량과 비율을 함께 봅니다."),
  bullet("정렬은 기본적으로 진입 수가 많은 솔루션이 위로 오도록 표시됩니다."),
  bullet("값이 —로 보이는 비율은 분모인 진입 수가 0이어서 계산할 수 없다는 의미입니다."),
  spacer(120),
  heading("7.3 퍼널", HeadingLevel.HEADING_2),
  dataTable([2200, 3300, 4606], [
    [headerCell("단계", 2200), headerCell("의미", 3300), headerCell("운영 질문", 4606)],
    [cell("진입", 2200, { fill: COLORS.panel }), cell("솔루션 진입(solution_entry)", 3300), cell("사용자가 이 솔루션 랜딩을 방문하는가? 검사 시작(test_start)은 별도 참고 지표로 봅니다.", 4606)],
    [cell("완료", 2200, { fill: COLORS.panel }), cell("검사 완료", 3300), cell("문항·입력·로딩 과정에서 이탈이 큰가?", 4606)],
    [cell("결과", 2200, { fill: COLORS.panel }), cell("결과 화면 조회", 3300), cell("완료 후 결과 화면까지 자연스럽게 연결되는가?", 4606)],
    [cell("공유", 2200, { fill: COLORS.panel }), cell("공유 창 열기", 3300), cell("결과를 다른 사람에게 공유하려는 흐름이 있는가?", 4606)],
  ]),
  spacer(130),
  callout("해석 순서", "퍼널의 가장 작은 막대부터 원인을 추정하지 않습니다.", "먼저 진입 규모가 충분한지 확인하고, 기간·출처·신선도를 점검한 뒤 완료→결과→공유 순서로 봅니다. 표본이 매우 작은 날의 비율은 주간·월간 범위에서 다시 확인합니다.", COLORS.panelWarm, COLORS.amber),
  pageBreak(),

  heading("8. 데이터 상태 패널 해석"),
  sectionIntro("대시보드 하단의 데이터 상태는 숫자 자체만큼 중요합니다. 현재 데이터가 어디에서 왔고, 얼마나 최신인지 설명해 줍니다."),
  heading("8.1 출처와 신선도", HeadingLevel.HEADING_2),
  dataTable([2200, 1800, 3000, 3106], [
    [headerCell("출처", 2200), headerCell("신선도", 1800), headerCell("뜻", 3000), headerCell("사용자 행동", 3106)],
    [cell("Vercel Web Analytics", 2200, { fill: COLORS.panelCool }), cell("live", 1800), cell("원천 분석 API에서 현재 기간을 직접 조회", 3000), cell("당일 포함 최신 흐름을 보되, 오늘은 부분 집계임을 표시합니다.", 3106)],
    [cell("Neon aggregate rollup", 2200, { fill: COLORS.panel }), cell("fresh", 1800), cell("최근 롤업이 저장한 집계 데이터를 사용", 3000), cell("방문자는 일별 합산 근사값일 수 있다는 주석을 함께 봅니다.", 3106)],
    [cell("Neon aggregate rollup", 2200, { fill: COLORS.amberSoft }), cell("stale", 1800), cell("마지막 동기화가 오래되어 최신성이 낮음", 3000), cell("중요한 판단 전 운영 담당자에게 Cron·동기화 상태를 확인합니다.", 3106)],
    [cell("empty", 2200, { fill: COLORS.panel }), cell("unavailable", 1800), cell("조회 범위에 표시할 집계 행이 없음", 3000), cell("‘방문자 0명’으로 단정하지 말고 기간·배포 시점·계측 동의 정책을 확인합니다.", 3106)],
    [cell("unavailable", 2200, { fill: COLORS.redSoft }), cell("unavailable", 1800), cell("설정·마이그레이션·원천 API 문제로 사용 불가", 3000), cell("화면 메시지와 발생 시각을 기록해 운영 담당자에게 전달합니다.", 3106)],
  ]),
  spacer(135),
  heading("8.2 커버리지와 마지막 동기화", HeadingLevel.HEADING_2),
  bullet("커버리지는 롤업이 요청·수집한 날짜 범위를 뜻합니다."),
  bullet("마지막 동기화 시각은 한국 시간으로 표시됩니다."),
  bullet("롤업은 매일 UTC 17:00, 한국 시간으로 매일 02:00에 최근 3일을 다시 수집하도록 구성되어 있습니다. 지연된 원천 집계를 보정하기 위한 설계입니다."),
  bullet("라이브 원천 조회가 실패하면 최근 Neon 롤업으로 대체할 수 있습니다. 대체되었다는 사실은 데이터 상태 메시지에 표시됩니다."),
  spacer(120),
  callout("빈 값과 0의 구분", "0은 계산 결과이고, empty/unavailable은 데이터 상태입니다.", "대시보드에 0이 보일 때는 기간에 실제 이벤트가 0이었을 수도 있고, 아직 집계가 들어오지 않았을 수도 있습니다. 반드시 출처·신선도·커버리지를 함께 확인합니다.", COLORS.redSoft, COLORS.red),
  pageBreak(),

  heading("9. 운영 담당자용 활성화 절차"),
  sectionIntro("이 장은 매일 대시보드를 보는 관리자보다, 관리자 모드를 처음 개통하거나 운영 장애를 처리하는 담당자를 위한 참고자료입니다. 아래 작업은 승인된 변경 절차와 스테이징 검증을 거쳐야 합니다."),
  heading("9.1 최초 활성화 순서", HeadingLevel.HEADING_2),
  numbered("마이그레이션 파일을 검토합니다: ", 0),
  paragraph([run("대상 파일: ", { bold: true }), codeRun("neon/migrations/20260830000000_ops_analytics.sql")], { indent: { left: 840 }, spacing: { after: 100 } }),
  numbered("스테이징에서 데이터베이스 마이그레이션을 적용하고 RLS 정책, 테이블, 함수, 권한을 확인합니다."),
  paragraph([run("실행 명령 예시: ", { bold: true }), codeRun("pnpm db:neon:migrate")], { indent: { left: 840 }, spacing: { after: 100 } }),
  numbered("Neon Auth 사용자 ID를 확인하고 ops.admin_members에 viewer·analyst·owner 중 필요한 역할을 active 상태로 등록합니다."),
  numbered("Vercel Production의 서버 전용 환경 변수에 프로젝트 ID, 분석 읽기 토큰, Cron 비밀값, 롤업 전용 DB 연결을 등록합니다."),
  numbered("배포 후 로그인, 권한, 대시보드, 비인증 롤업 엔드포인트의 401 응답, Cron 실행을 스테이징과 운영 순서로 점검합니다."),
  spacer(100),
  heading("9.2 운영 환경 변수 이름", HeadingLevel.HEADING_2),
  paragraph("아래는 이름만 기록한 목록입니다. 실제 값·토큰·연결 문자열은 이 문서, 커밋, 채팅, 스크린샷에 적지 않습니다."),
  dataTable([3300, 6806], [
    [headerCell("변수", 3300), headerCell("용도·주의", 6806)],
    [cell([codeRun("VERCEL_PROJECT_ID")], 3300, { fill: COLORS.panel }), cell("Vercel 분석 프로젝트 식별자", 6806)],
    [cell([codeRun("VERCEL_ANALYTICS_READ_TOKEN")], 3300, { fill: COLORS.panel }), cell("Vercel Web Analytics 읽기 토큰. 서버 전용이며 NEXT_PUBLIC_*로 만들지 않습니다.", 6806)],
    [cell([codeRun("CRON_SECRET")], 3300, { fill: COLORS.panel }), cell("내부 롤업 호출을 인증하는 비밀값. 길이·보관·교체 정책을 따릅니다.", 6806)],
    [cell([codeRun("ANALYTICS_ROLLUP_DATABASE_URL")], 3300, { fill: COLORS.panel }), cell("Cron 롤업 전용 관리자 DB 연결. 서버 환경에만 둡니다.", 6806)],
    [cell([codeRun("VERCEL_ANALYTICS_ENVIRONMENT")], 3300, { fill: COLORS.panel }), cell("production 전용 가드입니다. preview/staging 등 비생산 값이면 writer가 실행을 거부하며, reader도 production 행만 읽습니다.", 6806)],
    [cell([codeRun("VERCEL_TEAM_ID"), run(" / "), codeRun("VERCEL_TEAM_SLUG")], 3300, { fill: COLORS.panel }), cell("팀 범위가 필요한 경우 사용하는 선택 설정입니다.", 6806)],
  ]),
  spacer(130),
  callout("변경 승인", "마이그레이션·환경 변수·운영 DB 연결 변경은 일상 사용자가 수행하지 않습니다.", "스테이징 검증, 변경 승인, 롤백 계획, 비밀값 보관 정책을 확인한 운영 담당자만 수행합니다. 문서에는 실행 예시만 남기고 실제 비밀값은 남기지 않습니다.", COLORS.redSoft, COLORS.red),
  pageBreak(),

  heading("10. 롤업 운영과 수동 보정"),
  sectionIntro("대시보드는 Vercel Web Analytics 라이브 조회를 우선 사용하고, 원천 API가 없거나 일시적으로 실패하면 Neon 집계 롤업을 사용합니다."),
  heading("10.1 자동 롤업", HeadingLevel.HEADING_2),
  numbered("Vercel Cron이 내부 경로 ", 0),
  paragraph([codeRun("/api/internal/analytics-rollup"), run("을 호출합니다.")], { indent: { left: 840 }, spacing: { after: 100 } }),
  numbered("스케줄은 UTC 17:00이며, 한국 시간으로 매일 02:00입니다."),
  numbered("최근 3일을 다시 수집해 지연·수정된 원천 집계를 덮어씁니다. 같은 날짜를 다시 수집해도 충돌 갱신 방식으로 보정됩니다."),
  numbered("정상 완료·실패 정보는 analytics_sync_runs에 집계 상태로 남습니다. 원시 URL, 쿼리, 생년월일, 응답, 공유 코드, subject ID는 저장 대상이 아닙니다."),
  spacer(100),
  heading("10.2 초기 수동 보정", HeadingLevel.HEADING_2),
  numbered("승인된 admin 환경을 선택하고, 운영 대상이라면 운영 실행 허용 절차를 확인합니다."),
  numbered("최대 31일 범위 안에서 시작일과 종료일을 지정합니다."),
  paragraph([run("명령 형식 예시: ", { bold: true }), codeRun("pnpm db:neon:analytics-rollup -- --since=YYYY-MM-DD --until=YYYY-MM-DD")], { indent: { left: 840 }, spacing: { after: 100 } }),
  numbered("완료 후 대시보드의 출처·신선도·커버리지를 다시 확인합니다."),
  numbered("실패했다면 비밀값을 로그로 복사하지 말고, 동기화 상태·발생 시각·범위만 전달합니다."),
  spacer(120),
  heading("10.3 롤업 장애 판단표", HeadingLevel.HEADING_2),
  dataTable([2600, 3500, 4006], [
    [headerCell("증상", 2600), headerCell("가능한 원인", 3500), headerCell("안전한 확인 방법", 4006)],
    [cell("출처가 unavailable", 2600, { fill: COLORS.redSoft }), cell("마이그레이션·DB 연결·원천 설정 미완료", 3500), cell("운영 환경 설정과 동기화 실행 기록을 권한 있는 담당자가 확인합니다.", 4006)],
    [cell("출처가 rollup + stale", 2600, { fill: COLORS.amberSoft }), cell("Cron 지연 또는 원천 API 지연", 3500), cell("마지막 동기화 시각과 Cron 로그를 확인하고 필요 시 승인된 수동 보정을 검토합니다.", 4006)],
    [cell("출처가 empty", 2600, { fill: COLORS.panel }), cell("기간에 집계 행이 없거나 계측이 아직 없음", 3500), cell("기간·배포 시점·동의 정책·추적 이벤트 발생 여부를 확인합니다.", 4006)],
    [cell("비인증 요청이 401", 2600, { fill: COLORS.panelCool }), cell("내부 롤업 경로의 정상 보호 동작", 3500), cell("브라우저에서 비밀 헤더를 직접 넣어 호출하지 않습니다. 인증된 Cron 실행 여부만 확인합니다.", 4006)],
  ]),
  pageBreak(),

  heading("11. 문제 해결 가이드"),
  sectionIntro("문제를 발견하면 먼저 화면의 기간·출처·신선도·메시지를 기록합니다. 그 다음 아래 항목을 순서대로 확인합니다."),
  dataTable([2600, 3600, 3906], [
    [headerCell("문제", 2600), headerCell("먼저 확인할 것", 3600), headerCell("운영 담당자에게 전달할 내용", 3906)],
    [cell("/admin에서 로그인 화면으로 반복 이동", 2600, { fill: COLORS.panel }), cell("Neon Auth 세션, 쿠키, 공식 도메인, 브라우저 시간", 3600), cell("발생 시각·브라우저·접속 경로. 비밀번호는 전달하지 않습니다.", 3906)],
    [cell("로그인 후 일반 오류", 2600, { fill: COLORS.redSoft }), cell("관리자 멤버십 등록 여부와 active 상태", 3600), cell("사용자 ID 확인 요청과 오류 발생 시각. 실제 인증 토큰은 보내지 않습니다.", 3906)],
    [cell("대시보드가 데이터 없음으로 표시", 2600, { fill: COLORS.panel }), cell("선택 기간, 오늘의 부분 집계 여부, 출처·신선도·커버리지", 3600), cell("선택 기간과 화면에 표시된 상태 라벨·메시지를 그대로 전달합니다.", 3906)],
    [cell("숫자가 오래되어 보임", 2600, { fill: COLORS.amberSoft }), cell("fresh/stale 여부와 마지막 동기화 시각", 3600), cell("마지막 동기화 시각·조회 범위·필터·배포 또는 캠페인 시점", 3906)],
    [cell("솔루션 퍼널이 이상함", 2600, { fill: COLORS.panel }), cell("전체/특정 솔루션 선택, 진입·완료·결과·공유 정의", 3600), cell("솔루션·기간·각 단계 수치·출처·동일 현상의 재현 여부", 3906)],
    [cell("내부 롤업 URL 직접 호출 시 401", 2600, { fill: COLORS.panelCool }), cell("비밀 헤더 없이 호출한 것은 아닌지", 3600), cell("401은 예상된 보호 응답입니다. Cron 설정과 실행 기록만 확인합니다.", 3906)],
  ]),
  spacer(150),
  heading("11.1 지원 요청에 포함할 정보", HeadingLevel.HEADING_2),
  bullet("조회한 기간: 예) 최근 7일 또는 YYYY-MM-DD ~ YYYY-MM-DD"),
  bullet("선택한 솔루션: 전체 또는 특정 솔루션 이름"),
  bullet("데이터 상태: source, freshness, last updated, coverage에 표시된 값"),
  bullet("문제 화면의 일반 메시지, 발생 시각, 브라우저와 화면 크기"),
  bullet("같은 문제가 다시 나타나는지 여부"),
  spacer(120),
  callout("보내지 말아야 할 것", "비밀번호·토큰·DB 연결 문자열·쿠키·개인별 검사 데이터는 지원 요청에 포함하지 않습니다.", "필요하면 민감정보를 가린 화면 캡처를 사용하고, 화면의 집계 상태와 오류 시각만 전달합니다.", COLORS.redSoft, COLORS.red),
  pageBreak(),

  heading("12. 보안·개인정보 보호 수칙"),
  sectionIntro("관리자 화면은 운영 데이터를 다루므로, 편리한 공유보다 최소한의 접근과 기록을 우선합니다."),
  heading("12.1 반드시 지키기", HeadingLevel.HEADING_2),
  bullet("관리자 URL을 공개 게시판·광고·일반 사용자 안내문에 노출하지 않습니다."),
  bullet("토큰·비밀번호·DB 연결 문자열을 문서·커밋·메신저·스크린샷에 기록하지 않습니다."),
  bullet("서버 전용 비밀값을 NEXT_PUBLIC_* 변수나 클라이언트 코드에 넣지 않습니다."),
  bullet("분석 화면을 다른 사람과 공유할 때 개인 식별 정보가 포함되지 않았는지 확인합니다."),
  bullet("분석 화면에서 생년월일·검사 응답·공유 코드·subject ID를 찾으려 하지 않습니다. 해당 데이터는 이 집계 콘솔의 저장 대상이 아닙니다."),
  bullet("업무가 끝나면 로그아웃하고, 공용 PC에서는 브라우저에 비밀번호를 저장하지 않습니다."),
  spacer(130),
  heading("12.2 저장 데이터의 범위", HeadingLevel.HEADING_2),
  dataTable([3000, 3100, 4006], [
    [headerCell("저장되는 집계", 3000), headerCell("저장되지 않는 원시 데이터", 3100), headerCell("의미", 4006)],
    [cell("날짜·환경·페이지뷰·방문자 수", 3000, { fill: COLORS.panelCool }), cell("원시 URL·쿼리 문자열", 3100, { fill: COLORS.redSoft }), cell("트래픽 규모와 일별 추세만 확인합니다.", 4006)],
    [cell("솔루션·이벤트 이름·이벤트 수·방문자 수", 3000, { fill: COLORS.panelCool }), cell("검사 응답·생년월일·공유 코드", 3100, { fill: COLORS.redSoft }), cell("솔루션 흐름의 단계별 집계만 확인합니다.", 4006)],
    [cell("동기화 상태·최소 감사 기록", 3000, { fill: COLORS.panelCool }), cell("subject ID·개별 사용자 프로필", 3100, { fill: COLORS.redSoft }), cell("운영 상태와 관리자 접근을 점검하기 위한 최소 기록입니다.", 4006)],
  ]),
  spacer(130),
  callout("RLS 전제", "분석 테이블은 행 수준 보안(RLS)을 전제로 접근합니다.", "애플리케이션은 인증된 Neon Auth 사용자 ID를 트랜잭션 범위에 설정한 뒤, 활성 관리자 역할이 있는 경우에만 집계 데이터를 읽습니다. service/admin 연결은 서버 측 운영 절차에서만 사용합니다.", COLORS.panelCool, COLORS.accent),
  pageBreak(),

  heading("13. 일일·주간 점검 체크리스트"),
  sectionIntro("반복 업무는 아래 체크리스트를 복사해 운영 기록에 사용할 수 있습니다. 기록에는 집계 값과 상태만 남기고 개인 데이터는 남기지 않습니다."),
  heading("13.1 일일 점검", HeadingLevel.HEADING_2),
  dataTable([2000, 8106], [
    [headerCell("확인", 2000), headerCell("체크 내용", 8106)],
    [cell("□ 접속", 2000, { fill: COLORS.panel }), cell("공식 /admin 경로에서 로그인하고 분석 화면이 열리는가?", 8106)],
    [cell("□ 오늘", 2000, { fill: COLORS.panel }), cell("오늘 범위가 Asia/Seoul 기준으로 표시되고, 부분 집계임을 고려했는가?", 8106)],
    [cell("□ 상태", 2000, { fill: COLORS.panel }), cell("출처와 신선도, 마지막 동기화, 커버리지를 확인했는가?", 8106)],
    [cell("□ 추세", 2000, { fill: COLORS.panel }), cell("페이지뷰·방문자 급증 또는 급감 날짜가 있는가? 배포·캠페인 기록과 연결했는가?", 8106)],
    [cell("□ 흐름", 2000, { fill: COLORS.panel }), cell("진입→완료→결과→공유 중 눈에 띄는 감소 단계가 있는가?", 8106)],
    [cell("□ 종료", 2000, { fill: COLORS.panel }), cell("업무 후 로그아웃했는가?", 8106)],
  ]),
  spacer(140),
  heading("13.2 주간 점검", HeadingLevel.HEADING_2),
  dataTable([2000, 8106], [
    [headerCell("확인", 2000), headerCell("체크 내용", 8106)],
    [cell("□ 비교", 2000, { fill: COLORS.panelCool }), cell("최근 7일과 직전 7일의 변화 화살표를 확인했는가?", 8106)],
    [cell("□ 솔루션", 2000, { fill: COLORS.panelCool }), cell("솔루션 사용 현황에서 진입량과 완료율을 함께 비교했는가?", 8106)],
    [cell("□ 퍼널", 2000, { fill: COLORS.panelCool }), cell("관심 솔루션을 선택해 퍼널 단계를 확인했는가?", 8106)],
    [cell("□ 품질", 2000, { fill: COLORS.panelCool }), cell("stale·empty·unavailable 상태가 반복되지 않았는가?", 8106)],
    [cell("□ 기록", 2000, { fill: COLORS.panelCool }), cell("원인·가설·후속 조치를 개인 정보 없이 집계 기준으로 기록했는가?", 8106)],
  ]),
  spacer(135),
  callout("권장 기록 형식", "날짜 / 범위 / 필터 / source·freshness / 관찰 / 다음 확인", "예: 2026-08-31 / 최근 7일 / 전체 / live·live / 궁합 진입 증가·완료율 보합 / 다음 주 공유 흐름 확인. 실제 사용자 식별 정보는 적지 않습니다.", COLORS.panelWarm, COLORS.amber),
  pageBreak(),

  heading("14. 자주 묻는 질문"),
  heading("Q1. 일반 회원가입 계정으로 관리자 화면에 들어갈 수 있나요?", HeadingLevel.HEADING_2),
  paragraph("아니요. Neon Auth 로그인에 성공하는 것만으로는 부족합니다. 활성 관리자 멤버십과 viewer·analyst·owner 역할이 별도로 등록되어야 합니다."),
  heading("Q2. 오늘 방문자 수가 낮으면 서비스에 문제가 있는 건가요?", HeadingLevel.HEADING_2),
  paragraph("그럴 수도 있지만 바로 결론 내릴 수 없습니다. 오늘은 진행 중인 날이라 부분 집계일 수 있습니다. 먼저 최근 7일, 데이터 출처, 신선도, 트래픽 그래프를 함께 확인합니다."),
  heading("Q3. Neon 롤업 방문자 수를 기간 전체 고유 방문자로 봐도 되나요?", HeadingLevel.HEADING_2),
  paragraph("안 됩니다. 롤업은 일별 고유 방문자 합산이므로 같은 방문자가 여러 날 방문하면 중복될 수 있습니다. 롤업 화면의 방문자 수는 규모를 가늠하는 근사값으로 사용합니다."),
  heading("Q4. 솔루션 필터를 바꾸었는데 모든 표가 바뀌지 않는 이유는 무엇인가요?", HeadingLevel.HEADING_2),
  paragraph("현재 구현에서 솔루션 사용 현황 표는 비교를 위해 전체 솔루션 목록을 유지하고, 선택한 솔루션은 퍼널 대상에 직접 반영됩니다. 해당 솔루션 행과 퍼널을 함께 읽어야 합니다."),
  heading("Q5. — 표시가 오류인가요?", HeadingLevel.HEADING_2),
  paragraph("대개 분모가 0이어서 비율을 계산할 수 없거나, 비교할 이전 기간이 없다는 뜻입니다. 데이터 상태 패널에서 출처·신선도를 확인한 뒤 해석합니다."),
  heading("Q6. 내부 롤업 경로를 브라우저에서 열었더니 401이 나옵니다.", HeadingLevel.HEADING_2),
  paragraph("비밀 인증 헤더가 없는 요청을 거부하는 정상적인 보호 동작입니다. 브라우저에서 토큰을 직접 시험하지 말고, Vercel Cron 설정과 운영 동기화 기록을 권한 있는 담당자가 확인합니다."),
  spacer(140),
  callout("마지막 확인", "관리자 모드의 목적은 ‘더 많은 개인 정보’를 보는 것이 아닙니다.", "안전한 집계 데이터로 서비스의 유입·완료·결과·공유 흐름을 이해하고, 필요한 개선을 판단하는 것이 목적입니다.", COLORS.panelCool, COLORS.accent),
  pageBreak(),

  heading("부록. 운영 참고 정보"),
  heading("A. 화면 경로", HeadingLevel.HEADING_2),
  dataTable([3000, 2600, 4506], [
    [headerCell("경로", 3000), headerCell("용도", 2600), headerCell("접근 원칙", 4506)],
    [cell([codeRun("/admin")], 3000, { fill: COLORS.panel }), cell("관리자 진입점", 2600), cell("권한 상태에 따라 로그인 또는 분석 화면으로 이동합니다.", 4506)],
    [cell([codeRun("/admin/login")], 3000, { fill: COLORS.panel }), cell("Neon Auth 로그인", 2600), cell("관리자 계정으로만 사용합니다.", 4506)],
    [cell([codeRun("/admin/analytics")], 3000, { fill: COLORS.panel }), cell("분석 대시보드", 2600), cell("활성 관리자 역할이 있는 인증 사용자만 읽습니다.", 4506)],
    [cell([codeRun("/api/internal/analytics-rollup")], 3000, { fill: COLORS.redSoft }), cell("내부 롤업", 2600), cell("Cron 인증 전용입니다. 비밀 헤더를 브라우저·문서에 노출하지 않습니다.", 4506)],
  ]),
  spacer(150),
  heading("B. 확인 명령", HeadingLevel.HEADING_2),
  paragraph("코드 변경이나 배포 후 운영 담당자는 아래 검증 항목을 확인할 수 있습니다. 명령 실행은 해당 환경과 권한을 확인한 뒤 수행합니다."),
  dataTable([3300, 6806], [
    [headerCell("검증 영역", 3300), headerCell("명령·확인", 6806)],
    [cell("타입·정적 검사", 3300, { fill: COLORS.panel }), cell([codeRun("pnpm typecheck"), run("  /  "), codeRun("pnpm lint")], 6806)],
    [cell("테스트·빌드", 3300, { fill: COLORS.panel }), cell([codeRun("pnpm test"), run("  /  "), codeRun("pnpm build")], 6806)],
    [cell("롤업 스크립트 구문", 3300, { fill: COLORS.panel }), cell([codeRun("node --check scripts/neon-analytics-rollup.mjs")], 6806)],
    [cell("보호 동작", 3300, { fill: COLORS.panel }), cell("비인증 GET /admin/analytics가 로그인 화면으로 이동하는지, 비밀 헤더 없는 내부 롤업 요청이 401인지 확인", 6806)],
  ]),
  spacer(160),
  callout("문서 버전", "v1.0 · 2026-08-31", "현재 관리자 분석 구현과 docs/ADMIN-ANALYTICS.md 운영 메모를 바탕으로 작성했습니다. 화면이나 권한 정책이 변경되면 이 안내서의 경로·지표 정의·운영 절차를 함께 갱신합니다.", COLORS.panelWarm, COLORS.amber),
];

const document = new Document({
  creator: "LUMINA",
  title: "LUMINA 관리자 모드 사용 안내서",
  subject: "방문 현황 및 솔루션 사용 현황 관리자 화면 단계별 사용법",
  description: "LUMINA 관리자 모드의 로그인, 분석 대시보드, 필터, 지표 해석, 운영 및 보안 안내서",
  keywords: "LUMINA, 관리자, 분석, 방문자, 솔루션, 운영",
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 20, color: COLORS.body },
        paragraph: { spacing: { after: 150, line: 285 } },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: "admin-bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } }],
      },
      {
        reference: "admin-steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
        margin: { top: 900, right: 900, bottom: 900, left: 900, header: 380, footer: 380 },
      },
    },
    headers: { default: makeHeader() },
    footers: { default: makeFooter() },
    children,
  }],
});

const buffer = await Packer.toBuffer(document);
await writeFile(OUTPUT, buffer);
console.log(`Created ${OUTPUT.pathname} (${buffer.byteLength} bytes)`);
