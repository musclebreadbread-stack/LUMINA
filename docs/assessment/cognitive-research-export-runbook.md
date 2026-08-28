# 인지능력 연구 export 운영 절차

이 절차는 운영 데이터에서 분석용 export를 만들 때만 사용한다. 실제 export URI, 키, 참가자
식별자는 문서·Git·로그에 기록하지 않는다.

1. 데이터 관리 책임자와 통계 담당자가 목적, 표본 범위, 보존 기간, 철회 처리 상태를 각각 승인한다.
2. Supabase private 스키마에서 승인된 동의 버전과 철회 목록을 확인하고, 일회성 제한 접근을 발급한다.
3. `data-dictionary.csv`에 없는 열, 직접 식별자, 혼합 버전, 중복 assignment, 비활성 문항,
   holdout 표시 누락을 validator로 차단한다.
4. 제한된 연구 환경에서 행 수·버전·해시만 manifest에 기록하고, 원자료는 공개 폴더나 저장소에 두지 않는다.
5. 분석 종료 후 임시 접근을 폐기하고, export·manifest의 보존·삭제 결과를 감사 기록에 남긴다.
6. validator가 `valid`를 반환해도 IQ 릴리스는 시작되지 않는다. IRT, 구조, 정밀도, retest,
   DIF, 외부 타당도, 독립 검토가 모두 통과한 `approved` manifest가 별도로 필요하다.
