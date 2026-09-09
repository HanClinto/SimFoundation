import type { NeedActionProvider } from "../Needs";
import type { Facility } from "../../Facility";
import type { ActionContext } from "./Action";
import { FacilityAction } from "./FacilityAction";

export class Research extends FacilityAction {
  static readonly needAction: NeedActionProvider = {
    offer: (context, needId) =>
      FacilityAction.findOffer(
        context,
        needId,
        "research",
        (state) => new Research(state),
      ),
  };

  canStart(context: ActionContext): string | null {
    const reason = super.canStart(context);
    if (reason) return reason;
    const target = context.site.entities[this.state.targetId] as Facility;
    return target.research ? null : "This facility has no research work.";
  }

  protected performWork(facility: Facility): void {
    facility.research!.progress++;
  }
}
