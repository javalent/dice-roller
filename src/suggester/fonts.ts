import {
    TFolder,
    TextComponent,
    type CachedMetadata,
    App,
    type FuzzyMatch
} from "obsidian";
import { SuggestionModal } from "./suggester";

export class FontSuggestionModal extends SuggestionModal<string> {
    text: TextComponent;
    cache: CachedMetadata;
    constructor(app: App, input: TextComponent, items: string[]) {
        super(app, input.inputEl, items);
        this.text = input;
    }
    getItemText(item: string) {
        return item;
    }
    onChooseItem(item: string) {
        this.text.setValue(item);
        this.item = item;
    }
    selectSuggestion({ item }: FuzzyMatch<string>) {
        let link = item;
        this.text.setValue(link);
        this.onClose();

        this.close();
    }
    renderSuggestion(result: FuzzyMatch<string>, el: HTMLElement) {
        let { item, match: matches } = result || {};
        let content = el.createDiv({
            cls: "suggestion-content",
            attr: {
                style: `font-family: "${item}"`
            }
        });
        if (!item) {
            content.setText(this.emptyStateText);
            content.parentElement?.addClass("is-selected");
            return;
        }

        let pathLength = item.length - item.length;
        const matchElements = matches.matches.map((m) => {
            return createSpan("suggestion-highlight");
        });
        for (let i = pathLength; i < item.length; i++) {
            let match = matches.matches.find((m) => m[0] === i);
            if (match) {
                let element = matchElements[matches.matches.indexOf(match)];
                content.appendChild(element);
                element.appendText(item.substring(match[0], match[1]));

                i += match[1] - match[0] - 1;
                continue;
            }

            content.appendText(item[i]);
        }
    }
}
