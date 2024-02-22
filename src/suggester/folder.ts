import {
    TFolder,
    TextComponent,
    type CachedMetadata,
    App,
    type FuzzyMatch
} from "obsidian";
import { SuggestionModal } from "./suggester";

export class FolderSuggestionModal extends SuggestionModal<TFolder> {
    text: TextComponent;
    cache: CachedMetadata;
    constructor(app: App, input: TextComponent, items: TFolder[]) {
        super(app, input.inputEl, items);
        this.text = input;

        this.inputEl.addEventListener("input", () => this.getFolder());
    }
    getFolder() {
        const v = this.inputEl.value,
            folder = this.app.vault.getAbstractFileByPath(v);
        if (folder == this.item) return;
        if (!(folder instanceof TFolder)) return;
        this.item = folder;

        this.onInputChanged();
    }
    getItemText(item: TFolder) {
        return item.path;
    }
    onChooseItem(item: TFolder) {
        this.item = item;
        this.text.setValue(item.path);
    }
    selectSuggestion({ item }: FuzzyMatch<TFolder>) {
        let link = item.path;
        this.item = item;
        this.text.setValue(link);
        this.onClose();

        this.close();
    }
    renderSuggestion(result: FuzzyMatch<TFolder>, el: HTMLElement) {
        let { item, match: matches } = result || {};
        el.addClass("mod-complex");
        let content = el.createDiv({
            cls: "suggestion-content"
        });
        if (!item) {
            content.setText(this.emptyStateText);
            content.parentElement?.addClass("is-selected");
            return;
        }

        let pathLength = item.path.length - item.name.length;
        const matchElements = matches.matches.map((m) => {
            return createSpan("suggestion-highlight");
        });
        for (let i = pathLength; i < item.path.length; i++) {
            let match = matches.matches.find((m) => m[0] === i);
            if (match) {
                let element = matchElements[matches.matches.indexOf(match)];
                content.appendChild(element);
                element.appendText(item.path.substring(match[0], match[1]));

                i += match[1] - match[0] - 1;
                continue;
            }

            content.appendText(item.path[i]);
        }
        content.createDiv({
            cls: "suggestion-note",
            text: item.path
        });
    }
}
