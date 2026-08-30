import type { BranchRelationKind } from "@engine/saju/relations";
import type { SynastryBranchRelation, SynastryPillarKey } from "@engine/synastry";

interface CompatibilityRelationMatrixProps {
  readonly title: string;
  readonly description: string;
  readonly emptyLabel: string;
  readonly rowLabel: string;
  readonly columnLabel: string;
  readonly pillars: readonly { readonly key: SynastryPillarKey; readonly label: string }[];
  readonly relations: readonly SynastryBranchRelation[];
  readonly relationLabels: Readonly<Record<BranchRelationKind, string>>;
}

function cellKey(left: SynastryPillarKey, right: SynastryPillarKey): string {
  return `${left}:${right}`;
}

/** Accessible 4×4 map of named branch relations between profile A and B. */
export function CompatibilityRelationMatrix({
  title,
  description,
  emptyLabel,
  rowLabel,
  columnLabel,
  pillars,
  relations,
  relationLabels,
}: CompatibilityRelationMatrixProps) {
  const cells = new Map<string, string[]>();
  for (const relation of relations) {
    const key = cellKey(relation.leftPillar, relation.rightPillar);
    const labels = cells.get(key) ?? [];
    labels.push(relationLabels[relation.kind]);
    cells.set(key, labels);
  }

  return (
    <div className="mt-6 border border-ink-700 bg-ink-950/55 p-4 sm:p-5" data-testid="compatibility-relation-matrix">
      <div>
        <h3 className="text-base font-medium text-hobun">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-hobun-faint">{description}</p>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-ink-700 text-hobun-faint">
              <th scope="col" className="w-28 px-3 py-3 font-normal">{rowLabel}</th>
              {pillars.map((pillar) => (
                <th key={pillar.key} scope="col" className="px-3 py-3 text-center font-normal">{pillar.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pillars.map((row) => (
              <tr key={row.key} className="border-b border-ink-800 last:border-b-0">
                <th scope="row" className="px-3 py-4 font-normal text-hobun-faint">{row.label}</th>
                {pillars.map((column) => {
                  const labels = cells.get(cellKey(row.key, column.key)) ?? [];
                  return (
                    <td key={column.key} className="px-3 py-4 text-center align-top">
                      {labels.length === 0 ? (
                        <span className="text-hobun-faint">{emptyLabel}</span>
                      ) : (
                        <span className="font-medium leading-relaxed text-hobun">{labels.join(" · ")}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-hobun-faint">{columnLabel}</p>
    </div>
  );
}
