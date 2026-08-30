# 인지능력 연구 export 운영 절차

이 절차는 운영 데이터에서 분석용 export를 만들 때만 사용한다. 실제 export URI, 키, 참가자
식별자는 문서·Git·로그에 기록하지 않는다.

1. 데이터 관리 책임자와 통계 담당자가 목적, 표본 범위, 보존 기간, 철회 처리 상태를 각각 승인한다.
2. Supabase private 스키마에서 승인된 동의 버전과 철회 목록을 확인하고, 일회성 제한 접근을 발급한다.
3. `data-dictionary.csv`에 없는 열, 직접 식별자, 혼합 버전, 중복 assignment, 비활성 문항,
   holdout 표시 누락을 validator로 차단한다. R 분석을 시작하기 전에 저장소의
   TypeScript validator로 동일한 계약을 먼저 검사할 수 있다.

   ```text
   pnpm cognitive:validate-export --input <restricted-export.csv> \
     --item-catalog <restricted-item-catalog.json> \
     --manifest <validation-manifest.json>
   ```

   `<restricted-item-catalog.json>`에는 `version_id`, `status`, `item_bank_version`만 둔다.
   `pilot`·`active` 상태가 아닌 문항은 허용 목록에서 제외한다. 명령은 원자료 행이나
   경로를 출력하지 않고, `validation-manifest.json`에 행 수·실행 수·버전·분할·SHA-256과
   규칙 위반 사유만 기록한다.
4. 제한된 연구 환경에서 행 수·버전·해시만 manifest에 기록하고, 원자료는 공개 폴더나 저장소에 두지 않는다.
5. 분석 종료 후 임시 접근을 폐기하고, export·manifest의 보존·삭제 결과를 감사 기록에 남긴다.
6. validator가 `valid`를 반환해도 IQ 릴리스는 시작되지 않는다. IRT, 구조, 정밀도, retest,
   DIF, 외부 타당도, 독립 검토가 모두 통과한 `approved` manifest가 별도로 필요하다.
7. 그다음 R 파이프라인 실행 순서와 각 단계 산출물 형식은
   `research/cognitive/v1/README.md`를 따른다. 이 배치 스크립트도 자동으로는 `candidate`까지만
   만들 수 있으며 `approved`는 여전히 사람의 out-of-band 승인이 필요하다.
