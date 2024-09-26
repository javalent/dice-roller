import { around } from "monkey-around";
import {
    App,
    Component,
    MarkdownView,
    Notice,
    TFile,
    editorLivePreviewField,
    type MarkdownPostProcessorContext
} from "obsidian";
import type { BasicRoller } from "../rollers/roller";
import type DiceRollerPlugin from "src/main";
import { StackRoller } from "src/rollers";
import { isTemplateFolder } from "src/utils/util";
import type { DiceRollerSettings } from "src/settings/settings.types";
import { API } from "src/api/api";

export default class DiceProcessor extends Component {
    app: App;
    data: DiceRollerSettings;
    plugin: DiceRollerPlugin;
    initialize(plugin: DiceRollerPlugin) {
        this.app = plugin.app;
        this.data = plugin.data;
        this.plugin = plugin;

        plugin.addCommand({
            id: "reroll",
            name: "Re-roll Dice",
            checkCallback: (checking) => {
                const view =
                    this.app.workspace.getActiveViewOfType(MarkdownView);
                if (
                    view &&
                    (view.getMode() === "preview" ||
                        view.editMode?.sourceMode == false) &&
                    this.fileMap.has(view.file)
                ) {
                    if (!checking) {
                        const dice = this.fileMap.get(view.file);

                        dice.forEach((roller) => {
                            roller.roll();
                        });
                    }
                    return true;
                }
            }
        });
    }

    fileMap: WeakMap<TFile, BasicRoller<any>[]> = new WeakMap();
    trackRoller(file: TFile, roller: BasicRoller<any>) {
        if (!this.fileMap.has(file)) {
            this.fileMap.set(file, []);
        }
        this.fileMap.get(file).push(roller);
    }
    async postprocessor(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        /** Get all code nodes in the element being processed. */
        let nodeList = el.querySelectorAll("code");
        if (!nodeList.length) return;

        const path = ctx.sourcePath;
        const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
        const info = ctx.getSectionInfo(el);

        if ((!file || !(file instanceof TFile)) && path != "STATBLOCK_RENDERER")
            return;

        for (let index = 0; index < nodeList.length; index++) {
            const node = nodeList.item(index);
            /** Not a dice roller. */
            if (!/^dice(?:\+|\-|\-mod)?:/.test(node.innerText)) continue;

            let [full, content] = node.innerText.match(
                /^dice(?:\+|\-|\-mod)?:\s*([\s\S]+)\s*?/
            );
            /** Modify dice. */
            if (/^dice-mod/.test(node.innerText)) {
                /** Ignore template folder files. */
                if (
                    file &&
                    file instanceof TFile &&
                    isTemplateFolder(this.data.diceModTemplateFolders, file)
                )
                    continue;

                //build result map;
                const maybeRoller = API.getRoller(content, ctx.sourcePath);
                if (maybeRoller.isNone()) {
                    return;
                }
                const roller = maybeRoller.unwrap();
                if (roller instanceof StackRoller && roller.shouldRender) {
                    roller.hasRunOnce = true;
                }

                await roller.roll();

                if (!file || !(file instanceof TFile)) {
                    node.replaceWith(roller.containerEl);
                    continue;
                }

                const replacer = await roller.getReplacer();
                if (!replacer) {
                    new Notice(
                        "Dice Roller: There was an issue modifying the file."
                    );
                    return;
                }
                this.app.vault.process(file, (data) => {
                    const fileContent = data.split("\n");
                    let splitContent = fileContent.slice(
                        info.lineStart,
                        info.lineEnd + 1
                    );

                    if (this.data.escapeDiceMod) {
                        splitContent = splitContent
                            .join("\n")
                            .replace(
                                `\`${full}\``,
                                replacer.replace(/([\*\[\]])/g, "\\$1")
                            )
                            .split("\n");
                    } else {
                        splitContent = splitContent
                            .join("\n")
                            .replace(`\`${full}\``, replacer)
                            .split("\n");
                    }

                    fileContent.splice(
                        info.lineStart,
                        info.lineEnd - info.lineStart + 1,
                        ...splitContent
                    );
                    return fileContent.join("\n");
                });

                continue;
            }
            try {
                //build result map;
                const maybeRoller = API.getRoller(content, ctx.sourcePath);
                if (maybeRoller.isNone()) {
                    return;
                }
                /** Add the roller to the child context, so it can be unloaded with the context. */
                const roller = maybeRoller.unwrap();

                roller.onLoad(async () => {
                    await roller.roll();

                    node.replaceWith(roller.containerEl);
                });
                roller.addContexts(ctx, this.plugin);

                if (!file || !(file instanceof TFile)) continue;

                this.trackRoller(file, roller);

                const view =
                    this.app.workspace.getActiveViewOfType(MarkdownView);

                if (
                    view &&
                    this.fileMap.has(file) &&
                    this.fileMap.get(file).length === 1
                ) {
                    const self = this;

                    let unregisterOnUnloadFile = around(view, {
                        onUnloadFile: function (next) {
                            return async function (unloaded: TFile) {
                                if (unloaded == file) {
                                    self.fileMap.delete(file);
                                    unregisterOnUnloadFile();
                                }

                                return await next.call(this, unloaded);
                            };
                        }
                    });
                    view.register(unregisterOnUnloadFile);
                    view.register(() => this.fileMap.delete(file));
                }
            } catch (e) {
                console.error(e);
                new Notice(
                    `There was an error parsing the dice string: ${node.innerText}.\n\n${e}`,
                    5000
                );
                continue;
            }
        }
    }
    processContent(content: string) {
        let showFormula = this.data.displayFormulaForMod;
        if (content.includes("|noform")) {
            showFormula = false;
        }
        if (content.includes("|form")) {
            showFormula = true;
        }
        return showFormula;
    }
}
