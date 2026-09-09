import type { NeedActionProvider } from "../Needs";
import { FacilityAction } from "./FacilityAction";

export class Exercise extends FacilityAction {
  static readonly needAction: NeedActionProvider = {
    offer: (context, needId) =>
      FacilityAction.findOffer(
        context,
        needId,
        "exercise",
        (state) => new Exercise(state),
      ),
  };
}
