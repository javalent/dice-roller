export const TAG_REGEX =
    /(?:(?<roll>\d+)[Dd])?#(?<tag>[\p{Letter}\p{Emoji_Presentation}\w/-]+)(?:\|(?<collapse>[\+-]))?(?:\|(?<types>[^\+-]+))?/u;
export const TABLE_REGEX =
    /(?:(?<roll>\d+)[Dd])?\[\[(?<link>[\s\S]+?)#?\^(?<block>[\s\S]+?)\]\]\|?(?<header>[\s\S]+)?/;
export const SECTION_REGEX =
    /(?:(?<roll>\d+)[Dd])?\[\[(?<link>[\s\S]+)\]\]\|?(?<types>[\s\S]+)?/;
export const MATH_REGEX = /[\(\^\+\-\*\/\)]/;

export const ICON_DEFINITION = "dice-roller-icon";

export const COPY_DEFINITION = "dice-roller-copy";
