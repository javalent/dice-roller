import DiceRollerPlugin from "src/main";
import { BasicRoller } from "src/roller/roller";
import { ExpectedValue, RollerOptions } from "src/types";

const DEFAULT_ROLLER_OPTIONS: RollerOptions = {};

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
        if ("text" in options) {
            roll += "|text(" + options.text + ")";
        }
        if ("showParens" in options) {
            roll += options.showParens ? "|paren" : "|noparen";
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
            text: null
        };
    }
}
