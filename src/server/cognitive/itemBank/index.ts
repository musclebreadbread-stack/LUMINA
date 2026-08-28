import type { InternalItem } from "@engine/cognitive-standardized/types";

import {
  validateCalibratedItem,
  type ItemBankRecord,
} from "./validation";

export { validateCalibratedItem } from "./validation";
export type {
  CalibrationModel,
  CalibrationRecord,
  ItemBankRecord,
  ItemBankStatus,
} from "./validation";

export interface ActiveItemQuery {
  readonly versionId: string;
  readonly itemBankVersion: string;
  readonly calibrationVersion: string;
}

function toInternalItem(item: ItemBankRecord): InternalItem {
  if (item.parameters === null) {
    throw new Error("active items require calibrated parameters");
  }

  return {
    versionId: item.versionId,
    domain: item.domain,
    presentation: item.presentation,
    correctOptionId: item.correctOptionId,
    parameters: item.parameters,
    exposureRate: item.exposureRate,
  };
}

/**
 * 비공개 문항 행에서 현재 실행과 버전이 일치하는 active 문항만 반환한다.
 * 정답 키와 IRT 모수는 이 서버 전용 함수 밖으로 전달하지 않는다.
 */
export function loadActiveItem(
  records: readonly ItemBankRecord[],
  query: ActiveItemQuery,
): InternalItem | null;
export function loadActiveItem(
  records: readonly ItemBankRecord[],
  versionId: string,
  itemBankVersion: string,
  calibrationVersion: string,
): InternalItem | null;
export function loadActiveItem(
  records: readonly ItemBankRecord[],
  queryOrVersionId: ActiveItemQuery | string,
  itemBankVersion?: string,
  calibrationVersion?: string,
): InternalItem | null {
  const query: ActiveItemQuery =
    typeof queryOrVersionId === "string"
      ? {
          versionId: queryOrVersionId,
          itemBankVersion: itemBankVersion ?? "",
          calibrationVersion: calibrationVersion ?? "",
        }
      : queryOrVersionId;

  const item = records.find(
    (candidate) =>
      candidate.versionId === query.versionId &&
      candidate.status === "active" &&
      candidate.itemBankVersion === query.itemBankVersion &&
      candidate.calibrationVersion === query.calibrationVersion,
  );
  if (item === undefined) return null;

  validateCalibratedItem(item);
  return toInternalItem(item);
}
