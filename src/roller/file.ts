import { MetadataCache } from "obsidian";
import { BaseRoller, Roller } from "./roller";

export class FileRoller extends BaseRoller implements Roller<string> {
    resultArray: string[];
    source: string;
    get result() {
        return this.resultArray[0];
    }

    get text() {
        return "";
    }
    get display() {
        return this.result;
    }
    async element() {
        const file = await this.cache.getFirstLinkpathDest(
            this.display,
            this.source
        );

        return createEl("a", {
            cls: "internal-link",
            text: file.basename
        });
    }
    roll() {
        return (this.resultArray = [...Array(this.rolls)].map(
            () => this.options[this._getRandomBetween(0, this.options.length - 1)]
        ));
    }
    constructor(
        public rolls: number = 1,
        public options: string[],
        private cache: MetadataCache
    ) {
        super();
        if (!rolls) this.rolls = 1;
        this.roll();
    }
}
