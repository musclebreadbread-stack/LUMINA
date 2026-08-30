import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import ko from "../../../messages/ko.json";
import { analysisDefinition } from "../analysisCatalog";
import {
  buildFallbackShareMeta,
  buildInvalidShareMeta,
  buildJungianShareMeta,
  SHARE_KIND_ANALYSIS_KEY,
  SHARE_KIND_HUB_TITLE_KEY,
} from "../shareMeta";

/** 실제 next-intl 번역기 대신, 호출된 key·values를 그대로 검증할 수 있는 가짜 번역기. */
function fakeTranslate(key: string, values?: Record<string, string | number>): string {
  const suffix = values ? `(${JSON.stringify(values)})` : "";
  return `${key}${suffix}`;
}

describe("SHARE_KIND_ANALYSIS_KEY", () => {
  it("bigfive는 analysisCatalog의 psychometrics 키로 매핑된다", () => {
    expect(SHARE_KIND_ANALYSIS_KEY.bigfive).toBe("psychometrics");
  });

  it("jungian·darktriad·attachment·eq·cognitive는 자기 자신과 같은 이름으로 매핑된다", () => {
    expect(SHARE_KIND_ANALYSIS_KEY.jungian).toBe("jungian");
    expect(SHARE_KIND_ANALYSIS_KEY.darktriad).toBe("darktriad");
    expect(SHARE_KIND_ANALYSIS_KEY.attachment).toBe("attachment");
    expect(SHARE_KIND_ANALYSIS_KEY.eq).toBe("eq");
    expect(SHARE_KIND_ANALYSIS_KEY.cognitive).toBe("cognitive");
  });

  it("모든 ShareKind가 카탈로그에 실제로 있는 분석을 가리킨다", () => {
    for (const analysisKey of Object.values(SHARE_KIND_ANALYSIS_KEY)) {
      expect(() => analysisDefinition(analysisKey)).not.toThrow();
    }
  });
});

describe("SHARE_KIND_HUB_TITLE_KEY", () => {
  it("여섯 kind 모두 home 네임스페이스의 허브 제목 키를 가리킨다", () => {
    expect(SHARE_KIND_HUB_TITLE_KEY.jungian).toBe("hubJungianTitle");
    expect(SHARE_KIND_HUB_TITLE_KEY.bigfive).toBe("hubPsychometricsTitle");
    expect(SHARE_KIND_HUB_TITLE_KEY.darktriad).toBe("hubDarkTriadTitle");
    expect(SHARE_KIND_HUB_TITLE_KEY.attachment).toBe("hubAttachmentTitle");
    expect(SHARE_KIND_HUB_TITLE_KEY.eq).toBe("hubEqTitle");
    expect(SHARE_KIND_HUB_TITLE_KEY.cognitive).toBe("hubCognitiveTitle");
  });

  it("두 표는 같은 kind 집합을 덮는다 — 한쪽만 추가하면 공유 페이지가 조용히 깨진다", () => {
    expect(Object.keys(SHARE_KIND_HUB_TITLE_KEY).sort()).toEqual(Object.keys(SHARE_KIND_ANALYSIS_KEY).sort());
  });

  it("가리키는 허브 제목 키가 두 로케일 모두에 실제로 존재한다", () => {
    // messages/*.json은 리터럴 키 타입으로 들어오므로, 런타임 문자열로 조회하려면 넓혀야 한다.
    const koHome: Readonly<Record<string, unknown>> = ko.home;
    const enHome: Readonly<Record<string, unknown>> = en.home;
    for (const titleKey of Object.values(SHARE_KIND_HUB_TITLE_KEY)) {
      expect(koHome[titleKey]).toBeTruthy();
      expect(enHome[titleKey]).toBeTruthy();
    }
  });
});

describe("share.<kind>.footerNotice — OG 카드 꼬리 문구", () => {
  const KIND_FOOTER_KINDS: readonly string[] = ["jungian", "bigfive", "darktriad", "attachment", "eq", "cognitive"];

  it("모든 ShareKind가 두 로케일 모두에 비어 있지 않은 footerNotice를 갖는다", () => {
    const koShare: Readonly<Record<string, Readonly<Record<string, string>> | string>> = ko.share;
    const enShare: Readonly<Record<string, Readonly<Record<string, string>> | string>> = en.share;
    for (const kind of KIND_FOOTER_KINDS) {
      const koBlock = koShare[kind];
      const enBlock = enShare[kind];
      expect(typeof koBlock).toBe("object");
      expect(typeof enBlock).toBe("object");
      expect((koBlock as Readonly<Record<string, string>>).footerNotice).toBeTruthy();
      expect((enBlock as Readonly<Record<string, string>>).footerNotice).toBeTruthy();
    }
  });

  it("KIND_FOOTER_KINDS는 두 매핑 표가 덮는 kind 집합과 정확히 같다", () => {
    expect([...KIND_FOOTER_KINDS].sort()).toEqual(Object.keys(SHARE_KIND_ANALYSIS_KEY).sort());
  });

  /**
   * 인지능력 탐색 카드는 이 제품에서 과장이 가장 위험한 자리다 — 규준이 없어 낼 수 없는 값을
   * 카드 꼬리가 "없다"고 명시하는지, 그리고 IQ 수치를 암시하는 표현이 섞이지 않았는지 고정한다.
   */
  it("cognitive footerNotice는 문항 출처·규준 없음·임상검사 아님을 두 로케일 모두에서 말한다", () => {
    const koNotice = ko.share.cognitive.footerNotice;
    const enNotice = en.share.cognitive.footerNotice;

    expect(koNotice).toContain("ICAR");
    expect(koNotice).toContain("LUMINA");
    expect(koNotice).toContain("규준");
    expect(koNotice).toContain("백분위");
    expect(koNotice).toContain("임상 지능검사 아님");

    expect(enNotice).toContain("ICAR");
    expect(enNotice).toContain("LUMINA");
    expect(enNotice).toContain("no norm sample");
    expect(enNotice).toContain("no percentile");
    expect(enNotice).toContain("not a clinical IQ test");
  });

  it("cognitive 카드 문구 어디에도 IQ 점수처럼 읽히는 수치가 없다", () => {
    const koTexts = Object.values(ko.share.cognitive);
    const enTexts = Object.values(en.share.cognitive);
    // "IQ 130", "IQ: 130" 같은 표현이 하나라도 생기면 즉시 실패한다.
    for (const text of [...koTexts, ...enTexts]) {
      expect(text).not.toMatch(/IQ\s*[:=]?\s*\d/);
      expect(text).not.toMatch(/percentile\s*\d|\d+\s*(?:th|st|nd|rd)\s+percentile/i);
    }
  });
});

describe("buildJungianShareMeta", () => {
  it("타입 코드를 title·description 두 키 모두에 넘긴다", () => {
    const meta = buildJungianShareMeta("ENFJ", fakeTranslate);
    expect(meta.title).toBe('jungian.metaTitle({"code":"ENFJ"})');
    expect(meta.description).toBe('jungian.metaDescription({"code":"ENFJ"})');
  });

  it("경계 축을 포함한 타입 코드(물음표 포함)도 그대로 전달한다", () => {
    const meta = buildJungianShareMeta("EN?J", fakeTranslate);
    expect(meta.title).toContain("EN?J");
  });
});

describe("buildFallbackShareMeta", () => {
  it("kind 표시 이름을 title 파라미터로 넘긴다", () => {
    const meta = buildFallbackShareMeta("Dark Triad", fakeTranslate);
    expect(meta.title).toBe('fallback.metaTitle({"title":"Dark Triad"})');
    expect(meta.description).toBe('fallback.metaDescription({"title":"Dark Triad"})');
  });
});

describe("buildInvalidShareMeta", () => {
  it("파라미터 없이 invalidTitle·invalidBody 키를 그대로 사용한다", () => {
    const meta = buildInvalidShareMeta(fakeTranslate);
    expect(meta.title).toBe("invalidTitle");
    expect(meta.description).toBe("invalidBody");
  });
});
