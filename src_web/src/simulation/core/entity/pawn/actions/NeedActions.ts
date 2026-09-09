import type { NeedActionProvider } from "../Needs";
import { Eat } from "./Eat";
import { Sleep } from "./Sleep";
import { Relax } from "./Relax";
import { Research } from "./Research";
import { Read } from "./Read";
import { Exercise } from "./Exercise";
import { Wash } from "./Wash";

export const needActions: readonly NeedActionProvider[] = [
  Eat.needAction,
  Sleep.needAction,
  Relax.needAction,
  Research.needAction,
  Read.needAction,
  Exercise.needAction,
  Wash.needAction,
];
