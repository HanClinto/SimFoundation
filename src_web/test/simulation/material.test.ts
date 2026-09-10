import { expect, it } from "vitest";
import {
  nourishmentFor,
  type Material,
} from "../../src/simulation/core/material/Material";

const material = (...tags: string[]): Material => ({
  id: "test",
  name: "Test material",
  description: "Test material",
  tags,
});

it("matches catalog tags without core food categories or duplicate nourishment", () => {
  const diet = [
    { accepts: "metal", efficiency: 10 },
    { accepts: "steel", efficiency: 20 },
  ];
  expect(nourishmentFor(material("metal", "steel"), diet)).toBe(20);
  expect(nourishmentFor(material("plastic"), diet)).toBe(0);
  expect(
    nourishmentFor(material("plastic"), [
      { accepts: "plastic", efficiency: 5 },
    ]),
  ).toBe(5);
  expect(
    nourishmentFor(material("organic", "plant"), [
      { accepts: "edible-plant", efficiency: 10 },
    ]),
  ).toBe(0);
  expect(
    nourishmentFor(material("organic", "edible-plant"), [
      { accepts: "edible-plant", efficiency: 10 },
    ]),
  ).toBe(10);
});
