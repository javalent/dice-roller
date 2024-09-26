import type { LexicalToken } from "src/lexer/lexer";
import { DiceRoller } from "./dice";

export class StuntRoller extends DiceRoller {
    constructor(public dice: string, lexeme?: LexicalToken) {
        super(`3d6`, lexeme);
    }
    get doubles() {
        return (
            new Set(
                [...this.results].map(([, { usable, value }]) =>
                    usable ? value : 0
                )
            ).size < 3
        );
    }
    get result() {
        if (this.static) {
            return Number(this.dice);
        }
        const results = [...this.results].map(([, { usable, value }]) =>
            usable ? value : 0
        );
        return results.reduce((a, b) => a + b, 0);
    }
    get display() {
        let str: string[] = [];
        for (let result of this.results) {
            if (result[0] == 0 && this.doubles) {
                str.push(`${result[1].value}S`);
                continue;
            }
            str.push(`${result[1].value}`);
        }
        return `[${str.join(", ")}]`;
    }
    allowAverage(): boolean {
        return false;
    }
}
