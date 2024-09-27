import type { DiceShape } from "src/renderer/shapes";
import { BasicRoller } from "../roller";
import { DiceRoller } from "./dice";
import { RenderTypes, type RenderableDice } from "./renderable";

interface NarrativeResult {
    success: number; //negative => failure
    advantage: number; //negative => threat
    triumph: number; //triumphs & despairs do not cancel, but count additonally for success/failure for the purpose of overall success.
    despair: number;
}

abstract class NarrativeRoller extends DiceRoller {
    override canRender(): boolean {
        return true;
    }
    abstract toNarrativeResult(): NarrativeResult;
    abstract override getType(): RenderTypes;
}

class BoostRoller extends NarrativeRoller {
    toNarrativeResult(): NarrativeResult {
        const narrativeResult: NarrativeResult = {
            success: 0,
            advantage: 0,
            triumph: 0,
            despair: 0
        };
        for (const result of this.resultArray) {
            if (result === 6) narrativeResult.success += 1; //Success
            if (result === 5) {
                //1 success 1 adv
                narrativeResult.advantage += 1;
                narrativeResult.success += 1;
            }
            if (result === 4) narrativeResult.advantage += 1; //1 Adv
            if (result === 3) narrativeResult.advantage += 2; //2 Adv
            if (result === 2) continue; //Blank
            if (result === 1) continue; //Blank
            if (result === 0) continue;
        }

        return narrativeResult;
    }
    override getType(): RenderTypes {
        return RenderTypes.BOOST;
    }
    override canRender(): boolean {
        return true;
    }
    constructor(amount: number) {
        super(`${amount}d6`);
    }
}
class SetbackRoller extends NarrativeRoller {
    toNarrativeResult(): NarrativeResult {
        const narrativeResult: NarrativeResult = {
            success: 0,
            advantage: 0,
            triumph: 0,
            despair: 0
        };
        for (const result of this.resultArray) {
            if (result === 6) narrativeResult.advantage -= 1; //1 Threat
            if (result === 5) narrativeResult.advantage -= 1; //1 Threat
            if (result === 4) narrativeResult.success -= 1; //1 Fail
            if (result === 3) narrativeResult.success -= 1; //1 Fail
            if (result === 2) continue; //Blank
            if (result === 1) continue; //Blank
            if (result === 0) continue;
        }

        return narrativeResult;
    }
    override getType(): RenderTypes {
        return RenderTypes.SETBACK;
    }
    override canRender(): boolean {
        return true;
    }
    constructor(amount: number) {
        super(`${amount}d6`);
    }
}
class AbilityRoller extends NarrativeRoller {
    toNarrativeResult(): NarrativeResult {
        const narrativeResult: NarrativeResult = {
            success: 0,
            advantage: 0,
            triumph: 0,
            despair: 0
        };
        for (const result of this.resultArray) {
            if (result === 8) {
                //2 Adv
                narrativeResult.advantage += 2;
            }
            if (result === 7) {
                //1 success 1 adv
                narrativeResult.advantage += 1;
                narrativeResult.success += 1;
            }
            if (result === 6) narrativeResult.advantage += 1; //1 Adv
            if (result === 5) narrativeResult.advantage += 1; //1 Adv
            if (result === 4) narrativeResult.success += 2; //2 Success
            if (result === 3) narrativeResult.success += 1; //1 Success
            if (result === 2) narrativeResult.success += 1; //1 Success
            if (result === 1) continue; //Blank
            if (result === 0) continue;
        }

        return narrativeResult;
    }
    override getType(): RenderTypes {
        return RenderTypes.ABILITY;
    }
    override canRender(): boolean {
        return true;
    }
    constructor(amount: number) {
        super(`${amount}d8`);
    }
}
class DifficultyRoller extends NarrativeRoller {
    toNarrativeResult(): NarrativeResult {
        const narrativeResult: NarrativeResult = {
            success: 0,
            advantage: 0,
            triumph: 0,
            despair: 0
        };
        for (const result of this.resultArray) {
            if (result === 8) {
                //1 Threat 1 Fail
                narrativeResult.advantage -= 1;
                narrativeResult.success -= 1;
            }
            if (result === 7) narrativeResult.advantage -= 2; //2 Threat
            if (result === 6) narrativeResult.advantage -= 1; //1 Threat
            if (result === 5) narrativeResult.advantage -= 1; //1 Threat
            if (result === 4) narrativeResult.advantage -= 1; //1 Threat
            if (result === 3) narrativeResult.success -= 2; //2 Fail
            if (result === 2) narrativeResult.success -= 1; //1 Fail
            if (result === 1) continue; //Blank
            if (result === 0) continue;
        }

        return narrativeResult;
    }
    override getType(): RenderTypes {
        return RenderTypes.DIFFICULTY;
    }
    override canRender(): boolean {
        return true;
    }
    constructor(amount: number) {
        super(`${amount}d8`);
    }
}
class ProficiencyRoller extends NarrativeRoller {
    toNarrativeResult(): NarrativeResult {
        const narrativeResult: NarrativeResult = {
            success: 0,
            advantage: 0,
            triumph: 0,
            despair: 0
        };
        for (const result of this.resultArray) {
            //@Javalent are 0 results possible?
            if (result === 12) {
                //1 Triumph
                narrativeResult.triumph += 1;
                narrativeResult.success += 1; //Triumph counts as success, but Triumph cannot be cancelled.
            }
            if (result === 11) narrativeResult.advantage += 2; //2 Adv
            if (result === 10) narrativeResult.advantage += 2; //2 Adv
            if (result === 9) {
                //1 Adv 1 Success
                narrativeResult.advantage += 1;
                narrativeResult.success += 1;
            }
            if (result === 8) {
                //1 Adv 1 Suc
                narrativeResult.advantage += 1;
                narrativeResult.success += 1;
            }
            if (result === 7) {
                //1 Adv 1 Suc
                narrativeResult.advantage += 1;
                narrativeResult.success += 1;
            }
            if (result === 6) {
                //1 Adv
                narrativeResult.advantage += 1;
            }
            if (result === 5) {
                //2 Success
                narrativeResult.success += 2;
            }
            if (result === 4) narrativeResult.success += 2; //2 Success
            if (result === 3) narrativeResult.success += 1; //1 Success
            if (result === 2) narrativeResult.success += 1; //1 Success
            if (result === 1) continue; //Blank
            if (result === 0) continue;
        }

        return narrativeResult;
    }
    override getType(): RenderTypes {
        return RenderTypes.PROFICIENCY;
    }
    override canRender(): boolean {
        return true;
    }
    constructor(amount: number) {
        super(`${amount}d12`);
    }
}
class ChallengeRoller extends NarrativeRoller {
    toNarrativeResult(): NarrativeResult {
        const narrativeResult: NarrativeResult = {
            success: 0,
            advantage: 0,
            triumph: 0,
            despair: 0
        };
        for (const result of this.resultArray) {
            //@Javalent are 0 results possible?
            if (result === 12) {
                //1 Despair
                narrativeResult.despair += 1;
                narrativeResult.success -= 1; //Despair counts as fail, but does not cancel Despair.
            }
            if (result === 11) narrativeResult.advantage -= 2; //2 Threat
            if (result === 10) narrativeResult.advantage -= 2; //2 Threat
            if (result === 9) {
                //1 Threat 1 Fail
                narrativeResult.advantage -= 1;
                narrativeResult.success -= 1;
            }
            if (result === 8) {
                //1 Threat 1 Fail
                narrativeResult.advantage -= 1;
                narrativeResult.success -= 1;
            }
            if (result === 7) {
                //1 Threat
                narrativeResult.advantage -= 1;
            }
            if (result === 6) {
                //1 Threat
                narrativeResult.advantage -= 1;
            }
            if (result === 5) {
                //2 Fail
                narrativeResult.success -= 2;
            }
            if (result === 4) narrativeResult.success -= 2; //2 Fail
            if (result === 3) narrativeResult.success -= 1; //1 Fail
            if (result === 2) narrativeResult.success -= 1; //1 Fail
            if (result === 1) continue; //Blank
            if (result === 0) continue;
        }

        return narrativeResult;
    }
    override getType(): RenderTypes {
        return RenderTypes.CHALLENGE;
    }
    override canRender(): boolean {
        return true;
    }
    constructor(amount: number) {
        super(`${amount}d12`);
    }
}
class ForceRoller extends NarrativeRoller {
    toNarrativeResult(): NarrativeResult {
        const narrativeResult: NarrativeResult = {
            success: 0,
            advantage: 0,
            triumph: 0,
            despair: 0
        };
        for (const result of this.resultArray) {
            //@Javalent are 0 results possible?
            if (result === 12) {
                //1 Despair
                narrativeResult.despair += 1;
                narrativeResult.success -= 1; //Despair counts as fail, but does not cancel Despair.
            }
            if (result === 11) narrativeResult.advantage -= 2; //2 Threat
            if (result === 10) narrativeResult.advantage -= 2; //2 Threat
            if (result === 9) {
                //1 Threat 1 Fail
                narrativeResult.advantage -= 1;
                narrativeResult.success -= 1;
            }
            if (result === 8) {
                //1 Threat 1 Fail
                narrativeResult.advantage -= 1;
                narrativeResult.success -= 1;
            }
            if (result === 7) {
                //1 Threat
                narrativeResult.advantage -= 1;
            }
            if (result === 6) {
                //1 Threat
                narrativeResult.advantage -= 1;
            }
            if (result === 5) {
                //2 Fail
                narrativeResult.success -= 2;
            }
            if (result === 4) narrativeResult.success -= 2; //2 Fail
            if (result === 3) narrativeResult.success -= 1; //1 Fail
            if (result === 2) narrativeResult.success -= 1; //1 Fail
            if (result === 1) continue; //Blank
            if (result === 0) continue;
        }

        return narrativeResult;
    }
    override getType(): RenderTypes {
        return RenderTypes.FORCE;
    }
    override canRender(): boolean {
        return true;
    }
    constructor(amount: number) {
        super(`${amount}d12`);
    }
}
const NARRATIVE_FACES = ["g", "y", "b", "r", "p", "s", "w"] as const;
type NarrativeFace = (typeof NARRATIVE_FACES)[number];
export class NarrativeStackRoller extends BasicRoller<NarrativeResult> {
    stack: NarrativeRoller[] = [];
    hasRunOnce: boolean = false;
    shouldRender: boolean = false;
    isRendering: boolean = false;
    onload(): void {
        super.onload();
        console.log(this.lexemes);
        const map: Map<NarrativeFace, number> = new Map();

        for (const lexeme of this.lexemes) {
            for (const maybe of lexeme.value) {
                let char = maybe as NarrativeFace;
                if (!NARRATIVE_FACES.includes(char)) continue;
                map.set(char, (map.get(char) ?? 0) + 1);
            }
        }

        for (const [type, amount] of map) {
            let roller: NarrativeRoller;
            switch (type) {
                case "g": {
                    roller = new AbilityRoller(amount);
                    break;
                }
                case "y": {
                    roller = new ProficiencyRoller(amount);
                    break;
                }
                case "b": {
                    roller = new BoostRoller(amount);
                    break;
                }
                case "r": {
                    roller = new ChallengeRoller(amount);
                    break;
                }
                case "p": {
                    roller = new DifficultyRoller(amount);
                    break;
                }
                case "s": {
                    roller = new SetbackRoller(amount);
                    break;
                }
                case "w": {
                    roller = new ForceRoller(amount);
                    break;
                }
            }
            this.stack.push(roller);
        }

        console.log("🚀 ~ file: narrative.ts:72 ~ map:", this.stack);
    }
    getReplacer(): Promise<string> {
        throw new Error("Method not implemented.");
    }
    result: NarrativeResult;
    async renderDice() {
        this.isRendering = true;
        this.setTooltip();
        this.setSpinner();
        const promises = [];
        for (const die of this.stack) {
            promises.push(
                new Promise<void>(async (resolve) => {
                    await die.render();
                    resolve();
                })
            );
        }
        await Promise.all(promises);

        this.isRendering = false;
        this.setTooltip();
    }
    async roll(render?: boolean): Promise<NarrativeResult> {
        this.stack.forEach((dice) => (dice.shouldRender = false));
        if (render || (this.shouldRender && this.hasRunOnce)) {
            await this.renderDice();
        } else {
            for (const dice of this.stack) {
                await dice.roll();
            }
        }
        this.hasRunOnce = true;

        this.result = this.stack.reduce(
            (a, b) => {
                a.success += b.toNarrativeResult().success;
                a.advantage += b.toNarrativeResult().advantage;
                a.triumph += b.toNarrativeResult().triumph;
                a.despair += b.toNarrativeResult().despair;
                return a;
            },
            {
                success: 0,
                advantage: 0,
                triumph: 0,
                despair: 0
            }
        );
        console.log("🚀 ~ file: narrative.ts:259 ~ this.result:", this.result);

        this.trigger("new-result");

        this.render();
        return this.result;
    }

    async build(): Promise<void> {
        this.resultEl.empty();

        this.resultEl.addClass("dice-roller-genesys");
        if (this.result.success === 0) {
            this.resultEl.createSpan({
                text: `Wash`
            });
        } else if (this.result.success > 0) {
            this.resultEl.createSpan({
                text: `${this.result.success} success`
            });
        } else if (this.result.success < 0) {
            this.resultEl.createSpan({
                text: `${Math.abs(this.result.success)} failure`
            });
        }
        if (this.result.advantage > 0) {
            this.resultEl.createSpan({
                text: `, ${this.result.advantage} adv`
            });
        } else if (this.result.advantage < 0) {
            this.resultEl.createSpan({
                text: `, ${Math.abs(this.result.advantage)} threat`
            });
        }
        if (this.result.triumph > 0) {
            this.resultEl.createSpan({
                text: `, ${this.result.triumph} triumph`
            });
        } else if (this.result.despair > 0) {
            this.resultEl.createSpan({
                text: `, ${Math.abs(this.result.despair)} despair`
            });
        }
        /* throw new Error("Method not implemented."); */
    }
    get tooltip(): string {
        return `${Math.abs(this.result.despair)}`;
        /* throw new Error("Method not implemented."); */
    }
    override async onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.stopImmediatePropagation();

        if (evt.getModifierState("Shift")) {
            await this.roll(true);
            this.hasRunOnce = true;
        } else if (window.getSelection()?.isCollapsed) {
            await this.roll();
        }
    }
}
