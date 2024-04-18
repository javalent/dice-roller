import { Round, ExpectedValue } from "../types/api";
import type { DiceIcon } from "../view/view.icons";

export interface DiceRollerSettings {
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
    persistResults: boolean;

    showDice: boolean;
    results: {
        [path: string]: {
            [line: string]: {
                [index: string]: Record<string, any>;
            };
        };
    };
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
    customFormulas: string[];

    displayAsEmbed: boolean;

    round: Round;

    initialDisplay: ExpectedValue;

    icons: DiceIcon[];

    showRenderNotice: boolean;
    diceModTemplateFolders: Record<string, boolean>;
    replaceDiceModInLivePreview: boolean;
}