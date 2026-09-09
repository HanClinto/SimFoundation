import type { NeedActionProvider } from "../Needs";
import { FacilityAction } from "./FacilityAction";

export class Read extends FacilityAction {
  static readonly needAction: NeedActionProvider = {
    offer: (context, needId) =>
      FacilityAction.findOffer(
        context,
        needId,
        "read",
        (state) => new Read(state),
      ),
  };
}
