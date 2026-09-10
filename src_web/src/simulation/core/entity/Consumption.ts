export interface ConsumableBody {
  amount: number;
  integrity?: number;
}

export function consumeMaterial(
  body: ConsumableBody,
  requested: number,
): number {
  const consumed = Math.max(0, Math.min(body.amount, requested));
  if (body.integrity !== undefined && body.amount > 0)
    body.integrity *= (body.amount - consumed) / body.amount;
  body.amount -= consumed;
  return consumed;
}

export function damageIntegrity(body: ConsumableBody, damage: number): void {
  if (body.integrity !== undefined)
    body.integrity = Math.max(0, body.integrity - Math.max(0, damage));
}
