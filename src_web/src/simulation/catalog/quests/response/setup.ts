import type { SiteTemplate } from "../../../core/site/Site";
import site from "../../sites/tests/ThreatAndCasualty.json";
import { ResponseTrial } from "./quest";

export const responseScenario = {
  site: site as SiteTemplate,
  quest: ResponseTrial,
};
