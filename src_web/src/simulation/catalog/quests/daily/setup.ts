import type { SiteTemplate } from "../../../core/site/Site";
import site from "../../sites/tests/DailyLife.json";
import { DailyLifeTrial } from "./quest";

export const dailyScenario = {
  site: site as SiteTemplate,
  quest: DailyLifeTrial,
};
