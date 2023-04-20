export interface DiceRollerAPI {
    registerSource(source: string, options: RollerOptions): void;
    getRollerSync(roll: string, source?: string): BasicRoller;
    getRoller(roll: string, source?: string): Promise<BasicRoller>;
}

export const enum ExpectedValue {
    None = "None",
    Average = "Average",
    Roll = "Roll"
}
export interface RollerOptions {
    showDice?: boolean;
    shouldRender?: boolean;
    showFormula?: boolean;
    expectedValue?: ExpectedValue;
    text?: string;
    showParens?: boolean;
    formulaAfter?: boolean;
}
interface BasicRoller {
    result: any;
    roll(): Promise<any>;
    rollSync(): number;
}

export interface StackRoller extends BasicRoller {
    result: number;
}

export default interface DiceRoller {
    getRoller(roll: string, source?: string): Promise<BasicRoller>;
    getRollerSync(roll: string, source?: string): BasicRoller;
    api: DiceRollerAPI;
}
