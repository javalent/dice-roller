import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { tokenClassNodeProp } from "@codemirror/stream-parser";
import DiceRollerPlugin from "src/main";
class LiveDice {
    constructor(view: EditorView) {
        this.build(view);
    }
    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            //rebuild
        } else {
        }
    }
    build(view: EditorView) {
        for (let { from, to } of view.visibleRanges) {
            syntaxTree(view.state).iterate({
                from,
                to,
                enter: (type, from, to) => {
                    const tokens = type.prop(tokenClassNodeProp);
                    const props = new Set(tokens?.split(" "));

                    if (!props.has("inline-code")) return;
                    if (props.has("formatting")) {
                        //add formatting handler if it is a dice roller
                        return;
                    }
                    const line = view.state.doc.sliceString(from, to);
                    if (!/^dice:/.test(line)) return;
                    console.log("🚀 ~ file: index.ts ~ line 30 ~ line", line);

                    const roller = 1;
                }
            });
        }
    }
}

export const LivePlugin = ViewPlugin.fromClass(LiveDice);
