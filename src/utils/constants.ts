export const TAG_REGEX =
    /(?:(?<roll>\d+)[Dd])?#(?<tag>[\p{Letter}\p{Emoji_Presentation}\w/-]+)(?:\|(?<collapse>[\+-]))?(?:\|(?<types>[^\+-]+))?/u;
export const TABLE_REGEX =
    /(?:(?<roll>\d+)[Dd])?(?:\[.*\]\(|\[\[)(?<link>.+?)#?\^(?<block>.+?)(?:\]\]|\))\|?(?<header>.+)?/;
export const SECTION_REGEX =
    /(?:(?<roll>\d+)[Dd])?(?:\[.*\]\(|\[\[)(?<link>.+)(?:\]\]|\))\|?(?<types>.+)?/;
export const MATH_REGEX = /[\(\^\+\-\*\/\)]/;
export const DICE_REGEX =
    /(?<dice>(?<roll>\d+)(?:[Dd]?\[?(?:-?\d+\s?,)?\s?(?:-?\d+|%|F)\]?)?)(?<conditional>(?:(?:=|=!|<|>|<=|>=|=<|=>|\-=|=\-)\d+)*)?/;
export const OMITTED_REGEX =
    /(?<roll>\d+)?[Dd](?<faces>\[?(?:-?\d+\s?,)?\s?(?:-?\d+|%|F)\]?)?(?<conditional>(?:(?:=|=!|<|>|<=|>=|=<|=>|\-=|=\-)\d+)*)?/;

export const CONDITIONAL_REGEX =
    /(?:(?<operator>=|=!|<|>|<=|>=|=<|=>|\-=|=\-)(?<comparer>\d+))/g;

export const ICON_DEFINITION = "dice-roller-icon";

export const COPY_DEFINITION = "dice-roller-copy";
