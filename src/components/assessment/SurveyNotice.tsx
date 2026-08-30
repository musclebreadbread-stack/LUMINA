interface SurveyNoticeProps {
  readonly message: string;
}

/**
 * 제출을 막은 이유를 폼 안에서 알리는 한 줄.
 *
 * role="alert"이라 화면 낭독기가 즉시 읽어 주고, alert()과 달리 화면에 남아 있으므로
 * 붉게 표시된 문항을 찾아가는 동안에도 이유가 사라지지 않는다.
 */
export function SurveyNotice({ message }: SurveyNoticeProps) {
  return (
    <p role="alert" className="mt-6 border-l border-hwa pl-3 text-xs text-hobun">
      {message}
    </p>
  );
}
