export interface Material {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly nutrition?: number;
}

export type Materials = Readonly<Record<string, Material>>;

export interface DietRule {
  readonly accepts: string;
  readonly efficiency: number;
}

export function nourishmentFor(
  material: Material,
  diet: readonly DietRule[],
  nutrition = material.nutrition ?? 1,
): number {
  return (
    Math.max(0, nutrition) *
    Math.max(
      0,
      ...diet
        .filter((rule) => material.tags.includes(rule.accepts))
        .map((rule) => rule.efficiency),
    )
  );
}
