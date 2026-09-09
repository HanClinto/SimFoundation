export interface Material {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
}

export type Materials = Readonly<Record<string, Material>>;

export interface DietRule {
  readonly accepts: string;
  readonly nourishment: number;
}

export function nourishmentFor(
  material: Material,
  diet: readonly DietRule[],
): number {
  return Math.max(
    0,
    ...diet
      .filter((rule) => material.tags.includes(rule.accepts))
      .map((rule) => rule.nourishment),
  );
}
