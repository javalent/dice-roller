import {
    TFolder,
    TextComponent,
    type CachedMetadata,
    App,
    type FuzzyMatch,
    renderMatches
} from "obsidian";
import { FuzzyInputSuggest } from "obsidian-utilities";

export class FontSuggestionModal extends FuzzyInputSuggest<string> {
    getItemText(item: string): string {
        return item;
    }
    renderNote(noteEL: HTMLElement, result: FuzzyMatch<string>): void {
        renderMatches(noteEL, result.item, result.match.matches);
    }
    renderTitle(titleEl: HTMLElement, result: FuzzyMatch<string>): void {}
}
