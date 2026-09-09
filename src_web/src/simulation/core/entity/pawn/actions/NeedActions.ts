import type { NeedActionProvider } from "../Needs";
import { Eat } from "./Eat";
import { Sleep } from "./Sleep";
import { Relax } from "./Relax";
import { Research } from "./Research";

export const needActions: readonly NeedActionProvider[] = [
  Eat.needAction,
  Sleep.needAction,
  Relax.needAction,
  Research.needAction,
];
