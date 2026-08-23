/**
 * 정적 이미지 자산의 파일명 규칙.
 *
 * 원본 PNG는 보관용이고 화면은 재인코딩된 WebP를 소스로 사용한다. Next Image가
 * 요청의 Accept 헤더에 따라 AVIF를 우선 생성하고, 지원하지 않는 브라우저에는
 * WebP를 전달하므로 뷰모델마다 확장자를 하드코딩하지 않는다.
 */
export const IMAGE_SOURCE_FORMAT = "webp" as const;

export type ImageSourceFormat = typeof IMAGE_SOURCE_FORMAT;

export function assetPath(directory: string, name: string): string {
  return `/${directory}/${name}.${IMAGE_SOURCE_FORMAT}`;
}

/** 3D 만다라용 512px 정사각 텍스처. 화면용 포스터와 분리해 GPU 메모리를 제한한다. */
export function mandalaTexturePath(name: string): string {
  return assetPath("mandala/textures", name);
}
