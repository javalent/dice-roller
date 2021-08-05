export abstract class BaseRoller {
    abstract get display(): string;
    abstract get text(): string;
    abstract get rolls(): number;
    _getRandomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

export abstract class Roller<T> {
    display: string;
    text: string;
    result: T;
    resultArray: T[];
    rolls: number;
    abstract roll: () => T[];
    abstract element: (
        parent?: HTMLElement
    ) => Promise<HTMLElement> | HTMLElement;
}
