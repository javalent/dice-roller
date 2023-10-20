import { Component, addIcon, removeIcon } from "obsidian";

const SVG = createSvg("svg", {
    attr: {
        viewBox: "0 0 500 500"
    }
});

const TEXT = createSvg("text", {
    attr: {
        class: "font",
        fill: "currentColor",
        x: "50%",
        y: "50%",
        "text-anchor": "middle",
        "dominant-baseline": "central"
    }
});

export interface DiceIcon {
    id: string;
    shape: IconShapes;
    formula: string;
    text: string;
}

export enum IconShapes {
    NONE = "None",
    TRIANGLE = "Triangle",
    SQUARE = "Square",
    DIAMOND = "Diamond",
    DODECAHEDRON = "Dodecahedron",
    ICOSAHEDRON = "Icosahedron",
    CIRCLE = "Circle"
}

export const DEFAULT_ICONS: DiceIcon[] = [
    {
        id: "dice-roller-d4",
        shape: IconShapes.TRIANGLE,
        formula: "2d8 + 3",
        text: "4"
    },
    {
        id: "dice-roller-d6",
        shape: IconShapes.SQUARE,
        formula: "d6",
        text: "6"
    },
    /* {
        id: "dice-roller-fate",
        shape: IconShapes.SQUARE,
        formula: "dF",
        text: "F"
    }, */
    {
        id: "dice-roller-d8",
        shape: IconShapes.DIAMOND,
        formula: "d8",
        text: "8"
    },
    {
        id: "dice-roller-d10",
        shape: IconShapes.DIAMOND,
        formula: "d10",
        text: "10"
    },
    {
        id: "dice-roller-d12",
        shape: IconShapes.DODECAHEDRON,
        formula: "d12",
        text: "12"
    },
    {
        id: "dice-roller-d20",
        shape: IconShapes.ICOSAHEDRON,
        formula: "d20",
        text: "20"
    },
    {
        id: "dice-roller-d100",
        shape: IconShapes.CIRCLE,
        formula: "d%",
        text: "%"
    }
];

class _IconManager extends Component {
    #getSVGElement() {
        return SVG.cloneNode(true) as SVGElement;
    }
    #getTextNode() {
        return TEXT.cloneNode() as SVGTextElement;
    }

    #managed = new Set<string>();

    registerIcon(id: string, shape: IconShapes, text: string) {
        this.#managed.add(id);
        const svgElement = this.#getSVGElement();

        const textNode = this.#getTextNode();
        textNode.textContent = text;

        svgElement.appendChild(textNode);
        let shapeElement: SVGElement;
        switch (shape) {
            case IconShapes.TRIANGLE:
                shapeElement = this.getTriangle();
                break;
            case IconShapes.SQUARE: {
                shapeElement = this.getSquare();
                break;
            }
            case IconShapes.DIAMOND: {
                shapeElement = this.getDiamond();
                break;
            }
            case IconShapes.DODECAHEDRON: {
                shapeElement = this.getDodecahedron();
                break;
            }
            case IconShapes.ICOSAHEDRON: {
                shapeElement = this.getIcosahedron();
                break;
            }
            case IconShapes.CIRCLE: {
                shapeElement = this.getCircle();
                break;
            }
            case IconShapes.NONE: {
                shapeElement = createSvg("defs");
            }
        }
        svgElement.appendChild(shapeElement);
        addIcon(id, svgElement.outerHTML);
        this.register(() => removeIcon(id));
    }

    //d4
    getTriangle() {
        return this.#getShape("path", {
            d: "M244.6,49.3L40.3,403.2c-1.7,3-0.7,6.8,2.3,8.5c0.9,0.5,2,0.8,3.1,0.8h408.6c3.4,0,6.2-2.8,6.2-6.2   c0-1.1-0.3-2.2-0.8-3.1L255.4,49.3c-1.7-3-5.5-4-8.5-2.3C246,47.6,245.2,48.4,244.6,49.3z"
        });
    }
    //d6
    getSquare() {
        return this.#getShape("rect", {
            x: "87.5",
            y: "87.5",
            width: "325",
            height: "325",
            rx: "10"
        });
    }
    //d8, d10
    getDiamond() {
        return this.#getShape("rect", {
            x: "102.75",
            y: "102.75",
            width: "294.51",
            height: "294.51",
            rx: "9.8",
            transform: "translate(-103.55 250) rotate(-45)"
        });
    }
    //d12
    getDodecahedron() {
        return this.#getShape("path", {
            d: "M244.31,29.14,52,168.87a9.72,9.72,0,0,0-3.52,10.84l73.47,226.1a9.69,9.69,0,0,0,9.21,6.69H368.87a9.69,9.69,0,0,0,9.21-6.69l73.47-226.1A9.72,9.72,0,0,0,448,168.87L255.69,29.14A9.66,9.66,0,0,0,244.31,29.14Z"
        });
    }
    //d20
    getIcosahedron() {
        return this.#getShape("path", {
            d: "M55.14,143.27V356.73a10,10,0,0,0,5,8.66L245,472.11a10,10,0,0,0,10,0L439.86,365.39a10,10,0,0,0,5-8.66V143.27a10,10,0,0,0-5-8.66L255,27.89a10,10,0,0,0-10,0L60.14,134.61A10,10,0,0,0,55.14,143.27Z"
        });
    }
    //d100
    getCircle() {
        return this.#getShape("circle", {
            cx: "250",
            cy: "250",
            r: "190"
        });
    }

    #getShape(
        el: "path" | "rect" | "circle",
        attr: {
            [key: string]: string | number | boolean | null;
        }
    ) {
        return createSvg(el, {
            cls: "shape",
            attr: { ...attr, stroke: "currentColor" }
        });
    }

    onunload(): void {}
}

export const IconManager = new _IconManager();
