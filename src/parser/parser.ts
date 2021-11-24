import { Lexeme } from "src/types";

export class Parser {
    table: any;
    constructor(table: any) {
        this.table = table;
    }
    parse(input: Lexeme[]) {
        var length = input.length,
            table = this.table,
            output = [],
            stack = [],
            index = 0;

        while (index < length) {
            var token = input[index++];

            switch (token.data) {
                case "(":
                    stack.unshift(token);
                    break;
                case ")":
                    if (
                        input[index] &&
                        input[index].type == "dice" &&
                        /^d/.test(input[index].original)
                    ) {
                        input[index].parenedDice = true;
                    }
                    while (stack.length) {
                        var token = stack.shift();
                        if (token.data === "(") break;
                        else {
                            output.push(token);
                        }
                    }

                    if (token.data !== "(")
                        throw new Error("Mismatched parentheses.");
                    break;
                default:
                    if (table.hasOwnProperty(token.data)) {
                        while (stack.length) {
                            var punctuator = stack[0];

                            if (punctuator.data === "(") break;

                            var operator = table[token.data],
                                precedence = operator.precedence,
                                antecedence = table[punctuator.data].precedence;

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
            var token = stack.shift();
            if (token.data !== "(") output.push(token);
            else throw new Error("Mismatched parentheses.");
        }

        return output;
    }
}
