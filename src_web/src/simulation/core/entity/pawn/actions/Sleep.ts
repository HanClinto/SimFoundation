import type { NeedActionProvider } from "../Needs";
import { FacilityAction } from "./FacilityAction";

export class Sleep extends FacilityAction {
  static readonly needAction: NeedActionProvider = {
    offer: (context, needId) =>
      FacilityAction.findOffer(
        context,
        needId,
        "sleep",
        (state) => new Sleep(state),
      ),
  };
}
