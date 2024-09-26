import { DiceRoller } from "./dice";
import { RenderTypes } from "./renderable";

export class FudgeRoller extends DiceRoller {
    override getType() {
        return RenderTypes.FUDGE;
    }
    override canRender() {
        return true;
    }
    possibilities: number[] = [-1, 0, 1];
}
