import { IConditional, ResultInterface, ResultMapInterface } from "@types";

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

export function _getRandomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function _checkCondition(
    value: number,
    conditions: IConditional[]
): boolean {
    return conditions.every(({ operator, comparer }) => {
        if (Number.isNaN(value) || Number.isNaN(comparer)) {
            return false;
        }
        let result = false;
        switch (operator) {
            case "=":
                result = value === comparer;
                break;
            case "!=":
            case "=!":
                result = value !== comparer;
                break;
            case "<":
                result = value < comparer;
                break;
            case "<=":
                result = value <= comparer;
                break;
            case ">":
                result = value > comparer;
                break;
            case ">=":
                result = value >= comparer;
                break;
        }

        return result;
    });
}
