import type { NeedActionProvider } from "../Needs";
import { FacilityAction } from "./FacilityAction";

export class Wash extends FacilityAction {
  static readonly needAction: NeedActionProvider = {
    offer: (context, needId) =>
      FacilityAction.findOffer(
        context,
        needId,
        "wash",
        (state) => new Wash(state),
      ),
  };
}
