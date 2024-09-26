import type { LexicalToken } from "src/lexer/lexer";
import { DiceRoller } from "./dice";

export class PercentRoller extends DiceRoller {
    stack: DiceRoller[][] = [];
    constructor(public dice: string, lexeme?: LexicalToken) {
        super(dice, lexeme);
        const faces = `${this.faces.max}`.split("");
        for (let i = 0; i < this.rolls; i++) {
            const stack = [];
            for (const face of faces) {
                const roller = new DiceRoller(`1d${face}`);
                stack.push(roller);
                roller.roll();
            }
            this.stack.push(stack);
        }
    }
    get result() {
        let result = 0;
        for (const stack of this.stack) {
            const build = [];
            for (const dice of stack) {
                dice.rollSync();
                build.push(dice.result);
            }
            result += Number(build.join(""));
        }
        return result;
    }
    get display() {
        return this.stack
            .map((stack) => stack.map((v) => v.result).join(","))
            .join("|");
    }
    async roll() {
        if (!this.stack || !this.stack.length) return super.roll();
        this.stack.forEach((stack) => stack.map((dice) => dice.roll()));

        return [
            ...this.stack
                .map((stack) => stack.map((dice) => dice.result))
                .flat()
        ];
    }
    allowAverage(): boolean {
        return false;
    }
}
