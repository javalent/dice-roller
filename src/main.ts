import {
	Notice,
	Plugin,
	MarkdownPostProcessorContext,
	ExtraButtonComponent,
} from "obsidian";

import { faDice } from "@fortawesome/free-solid-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";

import './main.css';

export default class MyPlugin extends Plugin {
	async onload() {
		console.log("DiceRoller plugin loaded");

		this.addRibbonIcon("dice", "DiceRoller", () => {
			new Notice("This is a notice!");
		});

		this.addCommand({
			id: "roll-dice",
			name: "Roll Dice",
			checkCallback: (checking: boolean) => {},
		});

		this.registerMarkdownPostProcessor(
			(el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				if (el.innerText.includes("{dice")) {
					//find text node
					function findTextNode(el: Node, search?: string): Node[] {
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
								list.push(...findTextNode(node, search));
							});
						}

						return list;
					}

					let nodeList = findTextNode(el, "{dice:");

					nodeList.forEach(node => {
						/* let text =  */
						let parent = node.parentElement;
						node.parentElement.innerHTML = node.parentElement.innerHTML.replace(
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
						);
						parent
							.querySelectorAll(".dice-roller")
							.forEach(diceElement => {
								this.registerDomEvent(
									diceElement as HTMLElement,
									"click",
									() => {
										let {
											amt,
											face,
											modifier,
											end,
										} = (diceElement as HTMLElement).dataset;

										let results = getResults(
											+amt,
											+face,
											modifier,
											+end
										);
										diceElement.setAttribute(
											"title",
											`(${amt}d${face}${
												modifier != "undefined"
													? modifier
													: ""
											}${
												!isNaN(+end) ? end : ""
											}): ${results.join(", ")}`
										);
										(diceElement
											.children[0] as HTMLElement).innerText = `${results.reduce(
											(a, c) => a + c
										)}`;
									}
								);
							});
					});
				}
			}
		);
	}

	onunload() {
		console.log("DiceRoller unloaded");
	}
}

const getResults = function (
	amt: number,
	face: number,
	modifier: string,
	end: number
): number[] {
	return [...Array(+amt)].map((): number => {
		let n = Math.floor(Math.random() * +face) + 1;

		switch (modifier) {
			case "+": {
				n += +end;
				break;
			}
			case "-": {
				n -= +end;
				break;
			}
			case "*": {
				n *= +end;
				break;
			}
			default: {
			}
		}

		return 1 * n;
	});
};
