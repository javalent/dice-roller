import type { LexicalToken } from "./lexer";

export class Parser {
    table: any;
    constructor(table: any) {
        this.table = table;
    }
    parse(input: LexicalToken[]) {
        const length = input.length,
            table = this.table,
            output = [],
            stack = [];
        let index = 0;

        while (index < length) {
            let token = input[index++];

            switch (token.value) {
                case "(":
                    stack.unshift(token);
                    break;
                case ")":
                    if (
                        input[index] &&
                        input[index].type == "dice" &&
                        /^d/.test(input[index].value)
                    ) {
                        input[index].parenedDice = true;
                    }
                    while (stack.length) {
                        token = stack.shift();
                        if (token.value === "(") break;
                        else {
                            output.push(token);
                        }
                    }

                    if (token.value !== "(")
                        throw new Error("Mismatched parentheses.");
                    break;
                default:
                    if (table.hasOwnProperty(token.value)) {
                        while (stack.length) {
                            const punctuator = stack[0];

                            if (punctuator.value === "(") break;

                            const operator = table[token.value],
                                precedence = operator.precedence,
                                antecedence =
                                    table[punctuator.value].precedence;

                            if (
                                precedence > antecedence ||
                                (precedence === antecedence &&
                                    operator.associativity === "right")
                            )
                                break;
                            else output.push(stack.shift());
                        }

                        stack.unshift(token);
                    } else {
                        output.push(token);
                    }
            }
        }

        while (stack.length) {
            const token = stack.shift();
            if (token.value !== "(") output.push(token);
            else throw new Error("Mismatched parentheses.");
        }

        return output;
    }
}
