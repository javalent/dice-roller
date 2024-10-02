import type { ViewResult } from "src/view/view";
import { Round, ExpectedValue } from "../types/api";
import type { DiceIcon } from "../view/view.icons";

export const ButtonPosition = {
    LEFT: "LEFT",
    RIGHT: "RIGHT",
    NONE: "NONE"
} as const;
export type ButtonPosition =
    (typeof ButtonPosition)[keyof typeof ButtonPosition];
export interface DiceRollerSettings {
    position: ButtonPosition;
    showFudgeIcon: boolean;
    rollLinksForTags: boolean;
    copyContentButton: boolean;
    displayResultsInline: boolean;
    displayLookupRoll: boolean;
    displayFormulaForMod: boolean;
    displayFormulaAfter: boolean;
    escapeDiceMod: boolean;
    signed: boolean;
    formulas: Record<string, string>;
    defaultRoll: number;
    defaultFace: number;
    renderer: boolean;
    renderAllDice: boolean;
    addToView: boolean;
    renderTime: number;
    colorfulDice: boolean;
    scaler: number;
    diceColor: string;
    textColor: string;
    textFont: string;
    showLeafOnStartup: boolean;
    narrativeSymbolSet: string;
    displayAsSymbols: boolean;
    customFormulas: string[];

    displayAsEmbed: boolean;

    round: Round;

    initialDisplay: ExpectedValue;

    icons: DiceIcon[];

    showRenderNotice: boolean;
    diceModTemplateFolders: Record<string, boolean>;
    replaceDiceModInLivePreview: boolean;
    version: string | null;
    viewResults: ViewResult[];
}
