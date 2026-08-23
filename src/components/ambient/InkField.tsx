import { AmbientLayer } from "./AmbientLayer";

interface Props {
  readonly tint?: string;
}

/** 기존 페이지가 사용하는 배경 API를 공통 AmbientLayer에 연결한다. */
export function InkField({ tint }: Props) {
  return <AmbientLayer tint={tint} />;
}
