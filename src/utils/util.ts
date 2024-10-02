import { TFile } from "obsidian";
import type { ResultInterface, ResultMapInterface } from "src/rollers/dice/dice";

const MATCH = /^\|?([\s\S]+?)\|?$/;
const SPLIT = /\|/;

export function extract(content: string) {
    const lines = content.split("\n");

    const inner = lines.map((l) => (l.trim().match(MATCH) ?? [, l.trim()])[1]);

    const headers = inner[0].split(SPLIT);

    const rows: string[] = [];
    const ret: [string, string[]][] = [];

    for (let index in headers) {
        let header = headers[index];
        if (!header.trim().length) header = index;
        ret.push([header.trim(), []]);
    }

    for (let line of lines.slice(2)) {
        const entries = line
            .trim()
            .split(SPLIT)
            .map((e) => e.trim())
            .filter((e) => e.length);

        rows.push(entries.join(" | "));

        for (let index in entries) {
            const entry = entries[index].trim();
            if (!entry.length || !ret[index]) continue;
            ret[index][1].push(entry);
        }
    }
    return {
        columns: Object.fromEntries(ret),
        rows: rows
    };
}

/**
 * Inserts a new result into a results map.
 *
 * @private
 * @param {ResultMapInterface} map Results map to modify.
 * @param {number} index Index to insert the new value.
 * @param {ResultInterface} value Value to insert.
 * @memberof DiceRoll
 */
export function _insertIntoMap(
    map: ResultMapInterface<number | string>,
    index: number,
    value: ResultInterface<number | string>
) {
    /** Get all values above index, then reverse them */
    let toUpdate = [...map].slice(index).reverse();
    /** Loop through the values and re-insert them into the map at key + 1 */
    toUpdate.forEach(([key, value]) => {
        map.set(key + 1, value);
    });
    /** Insert the new value at the specified index */
    map.set(index, value);
}

export function isTemplateFolder(diceModTemplateFolders: Record<string, boolean>, currentFile: TFile) {
    return Object.entries(diceModTemplateFolders)
        .reduce(
            (acc, e) => {
                let folderName: string = e[0]
                let useSubfoldees = e[1]
                let ret = useSubfoldees ?
                    currentFile.parent.path.startsWith(folderName) :
                    currentFile.parent.path == folderName
                return acc || ret
            },
            false
        )
}
