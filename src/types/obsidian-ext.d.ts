import type { StackRoller } from "src/rollers";
import type { RenderableRoller } from "src/rollers/roller";
import type { DiceRollerSettings } from "src/settings/settings.types";

//expose dataview plugin for tags
declare module "obsidian" {
    interface Workspace {
        trigger(name: "dice-roller:new-result", data: RenderableRoller): void;
        trigger(name: "dice-roller:rendered-result", data: number): void;
        trigger(name: "dice-roller:loaded"): void;
        trigger(name: "dice-roller:unloaded"): void;
    }

    interface MarkdownEditView {
        sourceMode: boolean;
    }
    interface MarkdownView {
        editMode?: MarkdownEditView;
    }
}
