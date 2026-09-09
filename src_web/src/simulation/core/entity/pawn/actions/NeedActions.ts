import type { NeedActionProvider } from "../Needs";
import { Eat } from "./Eat";

export const needActions: readonly NeedActionProvider[] = [Eat.needAction];
