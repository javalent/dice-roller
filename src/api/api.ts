import DiceRollerPlugin from "src/main";
import { BasicRoller } from "src/roller/roller";
import { ExpectedValue, RollerOptions, Round } from "src/types";

export default class API {
    constructor(private plugin: DiceRollerPlugin) {}
    get renderer() {
        return this.plugin.renderer;
    }

    sources: Map<string, RollerOptions> = new Map();

    registerSource(source: string, options: RollerOptions): void {
        this.sources.set(source, options);
    }

    getRollerSync(roll: string, source?: string): BasicRoller {
        const options =
            this.sources.get(source) ?? API.RollerOptions(this.plugin);
        return this.plugin.getRollerSync(roll, source, options);
    }

    async getRoller(roll: string, source?: string): Promise<BasicRoller> {
        const options =
            this.sources.get(source) ?? API.RollerOptions(this.plugin);
        return this.plugin.getRoller(roll, source, options);
    }

    getRollerString(roll: string, source?: string): string {
        if (!source) return roll;
        const options =
            this.sources.get(source) ?? API.RollerOptions(this.plugin);
        if ("showDice" in options) {
            roll += options.showDice ? "" : "|nodice";
        }
        if ("shouldRender" in options) {
            roll += options.shouldRender ? "|render" : "|norender";
        }
        if ("showFormula" in options) {
            roll += options.showFormula ? "|form" : "|noform";
        }
        if ("expectedValue" in options) {
            if (options.expectedValue == ExpectedValue.Average) {
                roll += "|avg";
            }
            if (options.expectedValue == ExpectedValue.None) {
                roll += "|none";
            }
        }
        if ("text" in options && options.text) {
            roll += "|text(" + options.text + ")";
        }
        if ("showParens" in options) {
            roll += options.showParens ? "|paren" : "|noparen";
        }
        if ("round" in options) {
            switch (options.round) {
                case Round.Down: {
                    roll += "|floor";
                    break;
                }
                case Round.Up: {
                    roll += "|ceil";
                    break;
                }
                case Round.Normal: {
                    roll += "|round";
                    break;
                }
                case Round.None: {
                    roll += "|noround";
                }
            }
        }
        if (options.signed) {
            roll += "|signed";
        }
        return roll;
    }

    static RollerOptions(plugin: DiceRollerPlugin): RollerOptions {
        return {
            showDice: plugin.data.showDice,
            shouldRender: plugin.data.renderAllDice,
            showFormula: plugin.data.displayResultsInline,
            showParens: plugin.data.displayFormulaAfter,
            expectedValue: ExpectedValue.Roll,
            round: plugin.data.round,
            text: null,
            signed: plugin.data.signed
        };
    }
}
