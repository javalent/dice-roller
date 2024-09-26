import type { LexicalToken } from "src/lexer/lexer";
import { DiceRoller } from "./dice";
import { RenderTypes } from "./renderable";

class StuntDice extends DiceRoller {
    override getType() {
        return RenderTypes.STUNT;
    }
    override canRender() {
        return true;
    }
    constructor() {
        super(`1d6`);
    }
    allowAverage(): boolean {
        return false;
    }
}

export class StuntRoller extends DiceRoller {
    pair = new DiceRoller(`2d6`);
    stunt = new StuntDice();
    constructor(public dice: string, lexeme?: LexicalToken) {
        super(dice, lexeme);
    }
    async roll() {
        await Promise.all([
            new Promise<void>(async (resolve) => {
                this.pair.shouldRender = this.shouldRender;
                await this.pair.roll();
                resolve();
            }),
            new Promise<void>(async (resolve) => {
                this.stunt.shouldRender = this.shouldRender;
                await this.stunt.roll();
                resolve();
            })
        ]);
    }

    get doubles() {
        return new Set([...this.pair.resultArray, this.stunt.result]).size < 3;
    }
    get result() {
        return this.pair.result + this.stunt.result;
    }
    get display() {
        let str: string[] = [
            this.pair.display,
            `${this.stunt.display}${this.doubles ? "S" : ""}`
        ];

        return `${str.join(", ")}`;
    }
}
