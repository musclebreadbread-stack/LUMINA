# LUMINA BGM

사이트 전체에서 첨부된 Digital Observatory 음원을 한 트랙으로 공유합니다.

| 파일 |
| --- |
| `public/audio/bgm/digital-observatory.mp3` |

## 재생 원칙

- 브라우저 자동재생 정책과 갑작스러운 소리를 피하기 위해 처음에는 재생하지 않습니다.
- 상단 `BGM` 버튼을 누른 뒤에만 재생하며, 선택은 이 브라우저에만 저장합니다.
- 페이지를 이동해도 같은 음원을 이어서 재생합니다(영역별 트랙 전환 없음).
- 음원이 끝나면 처음부터 다시 재생합니다.
- 오디오 요소의 음량은 최대 음압의 18%로 제한하고, 끄면 즉시 일시정지·소스를 해제합니다.

음원을 교체하려면 `public/audio/bgm/digital-observatory.mp3`를 바꾸고
`src/lib/bgm.ts`의 `BGM_PLAYLIST` 경로를 갱신하세요.
