import {
	Plugin,
	MarkdownPostProcessorContext,
} from "obsidian";
//@ts-ignore
import lexer from 'lex';

import { faDice } from "@fortawesome/free-solid-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";

import './main.css';


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

							if (precedence > antecedence ||
								precedence === antecedence &&
								operator.associativity === "right") break;
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

export default class MyPlugin extends Plugin {
	lexer: lexer;
	parser: Parser;
	async onload() {
		console.log("DiceRoller plugin loaded");

		this.registerMarkdownPostProcessor(
			(el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				if (el.innerText.includes("{dice")) {
					//find text node

					let nodeList = this.findTextNode(el, "{dice:");

					nodeList.forEach(node => {
						let parent = node.parentElement;
						/* node.parentElement.innerHTML = node.parentElement.innerHTML.replace(
							/\{dice:\s*(\d+d\d+)\s*([\+\-\*])*\s*(\d+)*\}/g,
							(match, p1, p2, p3, offset, string): string => {
								let [, amt, face] = p1.match(/(\d+)d(\d+)/);
								let modifier = p2;
								let end = p3;
	
								let results = getResults(
									+amt,
									+face,
									modifier,
									+end
								);
	
								let container = createDiv().createDiv({
									cls: "dice-roller",
									title: ` (${p1}${p2 ? p2 : ""}${
										p3 ? p3 : ""
									}): ${results.join(", ")}`,
								});
								container.setAttrs({
									"data-amt": +amt,
									"data-face": +face,
									"data-modifier": modifier,
									"data-end": +end,
									"data-source": match
								});
								let diceSpan = container.createSpan();
	
								diceSpan.innerText = `${results.reduce(
									(a, c) => a + c
								)}`;
	
								container
									.createDiv({ cls: "dice-roller-button" })
									.appendChild(
										icon(faDice).node[0]
									) as HTMLElement;
	
								return container.parentElement.innerHTML;
							}
						); */
						node.parentElement.innerHTML = node.parentElement.innerHTML.replace(
							/{dice:([\s\S]+?)}/g,
							(match, dice): string => {
								dice = dice.split(' ').join('').trim()
								let results = this.parseDice(dice);

								let container = createDiv().createDiv({
									cls: "dice-roller",
								});
								container.setAttr('data-dice', dice);

								let diceSpan = container.createSpan();

								diceSpan.innerText = `${results}`;

								container
									.createDiv({ cls: "dice-roller-button" })
									.appendChild(
										icon(faDice).node[0]
									) as HTMLElement;

								return container.parentElement.innerHTML;
							}
						);
						parent
							.querySelectorAll(".dice-roller")
							.forEach(diceElement => {
								this.registerDomEvent(
									diceElement as HTMLElement,
									"click",
									() => {
										let {
											dice
										} = (diceElement as HTMLElement).dataset;

										let results = this.parseDice(dice.split(' ').join(''));
										console.log(dice);
										(diceElement
											.children[0] as HTMLElement).innerText = `${results}`;
									}
								);
							});
					});
				}
			}
		);

		this.lexer = new lexer;

		this.lexer.addRule(/\s+/, function () {
			/* skip whitespace */
		});

		this.lexer.addRule(/([0-9]\d*)+[Dd]?([0-9]\d*)?/, function (lexeme: string) {
			return lexeme; // symbols
		});

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

	findTextNode(el: Node, search?: string): Node[] {
		let list: Node[] = [];
		if (
			el.nodeType == 3 &&
			el.textContent != "\n" &&
			el.textContent.includes(search)
		) {
			list.push(el);
		}

		if (el.hasChildNodes()) {
			el.childNodes.forEach(node => {
				list.push(...this.findTextNode(node, search));
			});
		}

		return list;
	}
	operators: any = {
		"+": (a: number, b: number): number => a + b,
		"-": (a: number, b: number): number => a - b,
		"*": (a: number, b: number): number => a * b,
		"/": (a: number, b: number): number => a / b,
		"^": (a: number, b: number): number => { return Math.pow(a, b) }
	};
	parseDice(text: string): number {

		let stack: number[] = [];
		this.parse(text).forEach(d => {
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
					stack.push(this.roll(d).reduce((acc, curr) => acc + curr, 0));
			}
		});
		return stack[0];
	}

	roll(dice: string): number[] {
		if (!/([0-9]\d*)[dD]?([0-9]\d*)?/.test(dice)) return;
		let [, amount, faces] = dice.match(/([0-9]\d*)[dD]?([0-9]\d*)?/);
		if (!faces) return [Number(amount)];
		let result = [...Array(Number(amount))].map(() => Math.floor(Math.random() * Number(faces)) + 1);

		return result;
	}

	parse(input: string): string[] {
		this.lexer.setInput(input);
		var tokens = [], token;
		while (token = this.lexer.lex()) tokens.push(token);
		return this.parser.parse(tokens);
	}

}

