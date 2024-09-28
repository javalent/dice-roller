import { RenderableRoller } from "../roller";
import { DiceRoller } from "./dice";
import { RenderTypes } from "./renderable";
import type { App } from "obsidian";
import type { LexicalToken } from "src/lexer/lexer";
import type { DiceRollerSettings } from "src/settings/settings.types";

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
export class NarrativeStackRoller extends RenderableRoller<NarrativeResult> {
    constructor(
        public data: DiceRollerSettings,
        public original: string,
        public lexemes: LexicalToken[],
        public app: App,
        position = data.position
    ) {
        super(data, original, lexemes, position);
    }
    children: NarrativeRoller[] = [];
    getTooltip() {
        let map = {
            success: 0,
            failure: 0,
            advantage: 0,
            threat: 0,
            triumph: 0,
            despair: 0
        };

        for (const child of this.children) {
            const die = child.toNarrativeResult();

            if (die.success > 0) {
                map.success += die.success;
            } else {
                map.failure += die.success;
            }
            if (die.advantage > 0) {
                map.advantage += die.advantage;
            } else {
                map.threat += die.advantage;
            }
            map.triumph += die.triumph;
            map.despair += die.despair;
        }
        return `**Totals**
Successes: ${map.success}
Failures: ${map.failure}
Advantages: ${map.advantage}
Threats: ${map.threat}
Triumphs: ${map.triumph}
Despairs: ${map.despair}`;
    }
    private formatSymbol(text: string, fontFamily: string): string {
        return `<span style="font-family: ${fontFamily}; font-weight: normal;">${text}</span>`;
    }
    getResultText(): string {
        const display = []; this.data.narrativeSymbolSet
        if (this.data.displayAsSymbols) {
            if (this.result.success === 0) {
                display.push(`Wash`);
            } else if (this.result.success > 0) {
                display.push(`${this.result.success} `+ this.formatSymbol('s', this.data.narrativeSymbolSet));
            } else if (this.result.success < 0) {
                display.push(`${this.result.success} ` + this.formatSymbol('f', this.data.narrativeSymbolSet));
            }
            if (this.result.advantage > 0) {
                display.push(`${this.result.advantage} ` + this.formatSymbol('a', this.data.narrativeSymbolSet));
            } else if (this.result.advantage < 0) {
                display.push(`${Math.abs(this.result.advantage)} ` + this.formatSymbol('t', this.data.narrativeSymbolSet));
            }
            if (this.result.triumph > 0) {
                display.push(`${this.result.triumph} ` + this.formatSymbol('x', this.data.narrativeSymbolSet));
            } else if (this.result.despair > 0) {
                display.push(`${Math.abs(this.result.despair)} ` + this.formatSymbol('y', this.data.narrativeSymbolSet));
            }
            return display.join(", ");
        } else {
            if (this.result.success === 0) {
                display.push(`Wash`);
            } else if (this.result.success > 0) {
                display.push(`${this.result.success} success`);
            } else if (this.result.success < 0) {
                display.push(`${Math.abs(this.result.success)} failure`);
            }
            if (this.result.advantage > 0) {
                display.push(`${this.result.advantage} advantage`);
            } else if (this.result.advantage < 0) {
                display.push(`${Math.abs(this.result.advantage)} threat`);
            }
            if (this.result.triumph > 0) {
                display.push(`${this.result.triumph} triumph`);
            } else if (this.result.despair > 0) {
                display.push(`${Math.abs(this.result.despair)} despair`);
            }
            return display.join(", ");
        }
    }
    onload(): void {
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
            this.children.push(roller);
        }
        super.onload();
    }
    getReplacer(): Promise<string> {
        throw new Error("Method not implemented.");
    }
    result: NarrativeResult;
    async roll(render?: boolean): Promise<NarrativeResult> {
        if (render || (this.shouldRender && this.hasRunOnce)) {
            await this.renderChildren();
        } else {
            return this.rollSync();
        }
        this.hasRunOnce = true;
        this.calculate();

        this.trigger("new-result");
        this.app.workspace.trigger("dice-roller:new-result", this);

        this.render();
        return this.result;
    }
    rollSync() {
        for (const dice of this.children) {
            dice.rollSync();
        }
        this.hasRunOnce = true;
        this.calculate();
        this.trigger("new-result");
        this.app.workspace.trigger("dice-roller:new-result", this);

        this.render();
        return this.result;
    }

    calculate() {
        this.result = this.children.reduce(
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
    }

    async build(): Promise<void> {
        this.resultEl.empty();

        this.resultEl.addClass("dice-roller-genesys");
        this.resultEl.innerHTML = this.getResultText();
    }
}
