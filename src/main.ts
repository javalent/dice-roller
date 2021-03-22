import { Plugin, MarkdownPostProcessorContext, Notice } from "obsidian";
//@ts-ignore
import lexer from "lex";

import { faDice } from "@fortawesome/free-solid-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";

import "./main.css";

class Parser {
    table: any;
    constructor(table: any) {
        this.table = table;
    }
    parse(input: string[]) {
        var length = input.length,
            table = this.table,
            output = [],
            stack = [],
            index = 0;

        while (index < length) {
            var token = input[index++];

            switch (token) {
                case "(":
                    stack.unshift(token);
                    break;
                case ")":
                    while (stack.length) {
                        var token = stack.shift();
                        if (token === "(") break;
                        else output.push(token);
                    }

                    if (token !== "(")
                        throw new Error("Mismatched parentheses.");
                    break;
                default:
                    if (table.hasOwnProperty(token)) {
                        while (stack.length) {
                            var punctuator = stack[0];

                            if (punctuator === "(") break;

                            var operator = table[token],
                                precedence = operator.precedence,
                                antecedence = table[punctuator].precedence;

                            if (
                                precedence > antecedence ||
                                (precedence === antecedence &&
                                    operator.associativity === "right")
                            )
                                break;
                            else output.push(stack.shift());
                        }

                        stack.unshift(token);
                    } else output.push(token);
            }
        }

        while (stack.length) {
            var token = stack.shift();
            if (token !== "(") output.push(token);
            else throw new Error("Mismatched parentheses.");
        }

        return output;
    }
}

export default class DiceRoller extends Plugin {
    lexer: lexer;
    parser: Parser;
    async onload() {
        console.log("DiceRoller plugin loaded");

        this.registerMarkdownPostProcessor(
            (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                let nodeList = el.querySelectorAll("code");
                if (!nodeList.length) return;

                nodeList.forEach((node) => {
                    if (!/^dice:\s*([0-9]+[dD]?[0-9]*[-+*^\(\)]*)\s*?/.test(node.innerText)) return;
                    let parent = node.parentElement;

                    try {
                        let [, dice] = node.innerText.match(
                            /^dice:\s*([\s\S]+)\s*?/
                        );

                        dice = dice.split(" ").join("").trim();
                        let results = this.parseDice(dice);

                        let container = createDiv().createDiv({
                            cls: "dice-roller"
                        });
                        container.setAttr("data-dice", dice);

                        let diceSpan = container.createSpan();
                        diceSpan.innerText = `${results}`;

                        container
                            .createDiv({ cls: "dice-roller-button" })
                            .appendChild(icon(faDice).node[0]) as HTMLElement;
                        parent.replaceChild(container, node);
                        container.addEventListener("click", () => {
                            let results = this.parseDice(dice);
                            diceSpan.innerText = `${results}`;
                        });
                    } catch (e) {
                        new Notice(
                            `There was an error parsing the dice string: ${node.innerText}`
                        );
                        return;
                    }
                });
            }
        );

        this.lexer = new lexer();

        this.lexer.addRule(/\s+/, function () {
            /* skip whitespace */
        });
        this.lexer.addRule(/[{}]+/, function () {
            /* skip brackets */
        });

        this.lexer.addRule(
            /([0-9]\d*)+[Dd]?([0-9]\d*)?/,
            function (lexeme: string) {
                return lexeme; // symbols
            }
        );

        this.lexer.addRule(/[\(\^\+\-\*\/\)]/, function (lexeme: string) {
            return lexeme; // punctuation (i.e. "(", "+", "-", "*", "/", ")")
        });

        var exponent = {
            precedence: 3,
            associativity: "right"
        };

        var factor = {
            precedence: 2,
            associativity: "left"
        };

        var term = {
            precedence: 1,
            associativity: "left"
        };

        this.parser = new Parser({
            "+": term,
            "-": term,
            "*": factor,
            "/": factor,
            "^": exponent
        });
    }

    onunload() {
        console.log("DiceRoller unloaded");
    }

    operators: any = {
        "+": (a: number, b: number): number => a + b,
        "-": (a: number, b: number): number => a - b,
        "*": (a: number, b: number): number => a * b,
        "/": (a: number, b: number): number => a / b,
        "^": (a: number, b: number): number => {
            return Math.pow(a, b);
        }
    };
    parseDice(text: string): number {
        let stack: number[] = [];
        this.parse(text).forEach((d) => {
            switch (d) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "^":
                    let b = stack.pop();
                    let a = stack.pop();
                    stack.push(this.operators[d](a, b));
                    break;
                default:
                    stack.push(
                        this.roll(d).reduce((acc, curr) => acc + curr, 0)
                    );
            }
        });
        return stack[0];
    }

    roll(dice: string): number[] {
        if (!/([0-9]\d*)[dD]?([0-9]\d*)?/.test(dice)) return;
        let [, amount, faces] = dice.match(/([0-9]\d*)[dD]?([0-9]\d*)?/);
        if (!faces) return [Number(amount)];
        let result = [...Array(Number(amount))].map(
            () => Math.floor(Math.random() * Number(faces)) + 1
        );

        return result;
    }

    parse(input: string): string[] {
        this.lexer.setInput(input);
        var tokens = [],
            token;
        while ((token = this.lexer.lex())) tokens.push(token);
        return this.parser.parse(tokens);
    }
}
