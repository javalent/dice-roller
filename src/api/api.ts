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
