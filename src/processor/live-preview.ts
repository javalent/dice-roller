/*
 * inspired and adapted from https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/main.ts
 *
 * The original work is MIT-licensed.
 *
 * MIT License
 *
 * Copyright (c) 2022 artisticat1
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * */

import {
    type DecorationSet,
    Decoration,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    WidgetType
} from "@codemirror/view";
import { EditorSelection, Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import {
    TFile,
    editorEditorField,
    editorLivePreviewField,
    editorInfoField,
    Component
} from "obsidian";
import DiceRollerPlugin from "../main";
import { BasicRoller } from "../roller/roller";
import { isTemplateFolder } from "../utils/util";
import { API } from "src/api/api";

function selectionAndRangeOverlap(
    selection: EditorSelection,
    rangeFrom: number,
    rangeTo: number
) {
    for (const range of selection.ranges) {
        if (range.from <= rangeTo && range.to >= rangeFrom) {
            return true;
        }
    }

    return false;
}

function inlineRender(
    view: EditorView,
    plugin: DiceRollerPlugin,
    component: Component
) {
    const currentFile = plugin.app.workspace.getActiveFile();
    if (!currentFile) return;

    const widgets: Range<Decoration>[] = [];
    const selection = view.state.selection;
    const regex = new RegExp(".*?_?inline-code_?.*");
    for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: ({ node }) => {
                const type = node.type;
                // markdown formatting symbols
                if (type.name.includes("formatting")) return;
                if (!regex.test(type.name)) return;

                // contains the position of node
                const start = node.from;
                const end = node.to;
                // don't continue if current cursor position and inline code node (including formatting
                // symbols) overlap
                if (selectionAndRangeOverlap(selection, start, end)) return;

                const original = view.state.doc.sliceString(start, end).trim();

                const isTemplate = isTemplateFolder(
                    plugin.data.diceModTemplateFolders,
                    currentFile
                );
                if (
                    /^dice\-mod:\s*([\s\S]+)\s*?/.test(original) &&
                    !isTemplate &&
                    plugin.data.replaceDiceModInLivePreview
                ) {
                    let [, content] = original.match(
                        /dice\-mod:\s*([\s\S]+)\s*?/
                    );

                    const currentFile = plugin.app.workspace.getActiveFile();
                    const roller = API.getRollerSync(content, currentFile.path);

                    roller.roll().then(async () => {
                        const replacer = await roller.getReplacer();
                        const insert = `${replacer}`;

                        if (plugin.data.escapeDiceMod) {
                            insert.replace(/([\*\[\]])/g, "\\$1");
                        }

                        const mod = {
                            from: start - 1,
                            to: end + 1,
                            insert
                        };
                        const transaction = view.state.update({ changes: mod });
                        view.dispatch(transaction);
                    });
                    return;
                }

                if (!/^dice(?:\+|\-|\-mod)?:\s*([\s\S]+)\s*?/.test(original))
                    return;
                let [, content] = original.match(
                    /^dice(?:\+|\-|\-mod)?:\s*([\s\S]+)\s*?/
                );
                const roller = API.getRollerSync(content, currentFile.path);
                component.addChild(roller);
                plugin.addChild(roller);
                const widget = new InlineWidget(
                    original,
                    roller,
                    view,
                    plugin,
                    currentFile
                );

                plugin.processor.trackRoller(currentFile, roller);
                widgets.push(
                    Decoration.replace({
                        widget,
                        inclusive: false,
                        block: false
                    }).range(start - 1, end + 1)
                );
            }
        });
    }
    return Decoration.set(widgets, true);
}
export class InlineWidget extends WidgetType {
    constructor(
        readonly rawQuery: string,
        public roller: BasicRoller,
        private view: EditorView,
        private plugin: DiceRollerPlugin,
        private file: TFile
    ) {
        super();
    }

    // Widgets only get updated when the raw query changes/the element gets focus and loses it
    // to prevent redraws when the editor updates.
    eq(other: InlineWidget): boolean {
        if (other.rawQuery === this.rawQuery) {
            return true;
        }
        this.plugin.processor.fileMap.get(this.file)?.remove(other.roller);
        return false;
    }

    // Add CSS classes and return HTML element.
    // In "complex" cases it will get filled with the correct text/child elements later.
    toDOM(view: EditorView): HTMLElement {
        this.roller.roll();
        return this.roller.containerEl;
    }

    /* Make queries only editable when shift is pressed (or navigated inside with the keyboard
     * or the mouse is placed at the end, but that is always possible regardless of this method).
     * Mostly useful for links, and makes results selectable.
     * If the widgets should always be expandable, make this always return false.
     */
    ignoreEvent(event: MouseEvent | Event): boolean {
        // instanceof check does not work in pop-out windows, so check it like this
        if (event.type === "mousedown") {
            const currentPos = this.view.posAtCoords({
                x: (event as MouseEvent).x,
                y: (event as MouseEvent).y
            });
            if ((event as MouseEvent).shiftKey) {
                // Set the cursor after the element so that it doesn't select starting from the last cursor position.
                if (currentPos) {
                    //@ts-ignore
                    const { editor } = this.view.state
                        .field(editorEditorField)
                        .state.field(editorInfoField);
                    editor.setCursor(editor.offsetToPos(currentPos));
                }
                return false;
            }
        }
        return true;
    }
}
export function inlinePlugin(plugin: DiceRollerPlugin) {
    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;
            component: Component = new Component();
            constructor(view: EditorView) {
                this.component.load();
                this.decorations = Decoration.none;
            }
            destroy() {
                this.component.unload();
            }
            update(update: ViewUpdate) {
                // only activate in LP and not source mode
                if (!update.state.field(editorLivePreviewField)) {
                    this.decorations = Decoration.none;
                    return;
                }
                if (
                    update.docChanged ||
                    update.viewportChanged ||
                    update.selectionSet
                ) {
                    this.decorations =
                        inlineRender(update.view, plugin, this.component) ??
                        Decoration.none;
                }
            }
        },
        { decorations: (v) => v.decorations }
    );
}
