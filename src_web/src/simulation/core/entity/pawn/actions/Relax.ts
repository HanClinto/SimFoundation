import type { NeedActionProvider } from "../Needs";
import { FacilityAction } from "./FacilityAction";

export class Relax extends FacilityAction {
  static readonly needAction: NeedActionProvider = {
    offer: (context, needId) =>
      FacilityAction.findOffer(
        context,
        needId,
        "relax",
        (state) => new Relax(state),
      ),
  };
}
