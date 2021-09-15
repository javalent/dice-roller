import DiceRollerPlugin from "src/main";
import { Lexeme } from "src/types";

export abstract class BaseRoller {
    abstract get display(): string;
    abstract get text(): string;
    abstract get rolls(): number;
    _getRandomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

export abstract class Roller<T> {
    display: string;
    text: string;
    result: T;
    resultArray: T[];
    rolls: number;
    abstract roll: () => T[];
    abstract element: (
        parent?: HTMLElement
    ) => Promise<HTMLElement> | HTMLElement;
}

export abstract class BasicRoller {
    containerEl = createDiv({
        cls: "dice-roller",
        attr: {
            "aria-label-position": "top",
            "data-dice": this.original
        }
    });
    resultEl = this.containerEl.createDiv();
    setTooltip() {
        this.containerEl.setAttrs({
            "aria-label": this.tooltip
        });
    }
    abstract get tooltip(): string;
    abstract render(parent?: HTMLElement): Promise<void>;
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexemes: Lexeme[]
    ) {}
}

export abstract class GenericRoller<T> extends BasicRoller {
    abstract result: T;
    abstract roll(): T;
}
