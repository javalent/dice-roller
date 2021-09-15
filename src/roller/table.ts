import { BaseRoller, GenericRoller, Roller } from "./roller";

export class TableRoller extends BaseRoller implements Roller<string> {
    resultArray: string[];
    get result() {
        return this.resultArray.join("|");
    }
    get display() {
        return `${this.result}`;
    }
    constructor(
        public rolls: number,
        public options: string[],
        public text: string,
        public link: string,
        public block: string
    ) {
        super();
        this.roll();
    }
    roll() {
        return (this.resultArray = [...Array(this.rolls)].map(
            () =>
                this.options[this._getRandomBetween(0, this.options.length - 1)]
        ));
    }
    element() {
        return createDiv();
    }
}

export class Table extends GenericRoller<string> {
    get tooltip() {
        return "";
    }
    result: string;
    async render() {}
    roll() {
        return "";
    }
}
