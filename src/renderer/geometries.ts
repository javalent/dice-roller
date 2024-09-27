import { Body, ConvexPolyhedron, Vec3 } from "cannon-es";
import {
    BufferGeometry,
    Float32BufferAttribute,
    Mesh,
    MeshPhongMaterial,
    Texture,
    Sphere,
    Vector3
} from "three";
/* import {
    BufferGeometry,
    Float32BufferAttribute,
    Mesh,
    MeshPhongMaterial,
    Sphere,
    Texture,
    Vector3
} from "three"; */

const MATERIAL_OPTIONS = {
    specular: 0x172022,
    color: 0xf0f0f0,
    shininess: 60,
    flatShading: true
};
const DEFAULT_DICE_OPTIONS: DiceOptions = {
    diceColor: "#202020",
    textColor: "#ffffff",
    textFont: "Arial"
};

interface DiceOptions {
    diceColor: string;
    textColor: string;
    textFont: string;
}

export default abstract class DiceGeometry {
    body: Body;
    chamferGeometry: { vectors: Vector3[]; faces: any[][] };
    geometry: Mesh;
    scale = 50;
    shape: ConvexPolyhedron;

    abstract af: number;
    abstract chamfer: number;
    abstract faces: number[][];
    labels = [
        " ",
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20"
    ];

    abstract margin: number;

    abstract mass: number;

    abstract sides: number;
    abstract scaleFactor: number;
    abstract tab: number;

    abstract values: number[];
    abstract vertices: number[][];
    shapeData: { vertices: any[]; faces: any[] };
    fontFace: string = "Arial";
    constructor(
        public w: number,
        public h: number,
        public options: Partial<DiceOptions> = {
            diceColor: "#202020",
            textColor: "#aaaaaa"
        },
        public scaler: number
    ) {
        this.options = {
            ...DEFAULT_DICE_OPTIONS,
            ...options
        };

        this.fontFace = this.options.textFont;
    }
    setColor({
        diceColor,
        textColor
    }: {
        diceColor?: string;
        textColor?: string;
    }) {
        if (diceColor) {
            this.options.diceColor = diceColor;
        }
        if (textColor) {
            this.options.textColor = textColor;
        }
    }
    get radius() {
        return this.scale * this.scaleFactor * (this.scaler ?? 1);
    }
    get diceColor() {
        return this.options.diceColor;
    }
    get textColor() {
        return this.options.textColor;
    }
    get buffer() {
        return this.geometry.geometry;
    }
    textureSize: number;
    create() {
        this.textureSize =
            this.calculateTextureSize(
                this.scale / 2 + this.scale * this.margin
            ) * 2;

        const geometry = this.getGeometry();
        const materials = this.getMaterials();
        this.geometry = new Mesh(geometry, materials);
        this.geometry.receiveShadow = true;
        this.geometry.castShadow = true;

        this.body.position.set(
            0 + this.radius * 2 * Math.random(),
            0 + this.radius * 2 * Math.random(),
            0 + this.radius * 4
        );
        this.body.velocity.x = 500 * Math.random() * 2 - 1;
        this.body.velocity.y = 500 * Math.random() * 2 - 1;
        this.body.angularVelocity.x = 100 * Math.random();
        this.body.angularVelocity.y = 100 * Math.random();
        return this;
    }
    getGeometry() {
        let vectors = new Array(this.vertices.length);
        for (let i = 0; i < this.vertices.length; ++i) {
            vectors[i] = new Vector3().fromArray(this.vertices[i]).normalize();
        }

        this.chamferGeometry = this.getChamferGeometry(vectors);
        let geometry = this.makeGeometry(
            this.chamferGeometry.vectors,
            this.chamferGeometry.faces
        );

        this.shape = this.makeShape(vectors);

        this.body = new Body({
            mass: this.mass,
            shape: this.shape
        });

        return geometry;
    }
    makeShape(vertices: Vector3[]): ConvexPolyhedron {
        let cv = new Array(vertices.length),
            cf = new Array(this.faces.length);
        for (let i = 0; i < vertices.length; ++i) {
            let v = vertices[i];
            cv[i] = new Vec3(
                v.x * this.radius,
                v.y * this.radius,
                v.z * this.radius
            );
        }
        for (let i = 0; i < this.faces.length; ++i) {
            cf[i] = this.faces[i].slice(0, this.faces[i].length - 1);
        }
        this.shapeData = { vertices: cv, faces: cf };
        return new ConvexPolyhedron({ vertices: cv, faces: cf });
    }
    getChamferGeometry(vectors: Vector3[]) {
        let chamfer_vectors = [],
            chamfer_faces = [],
            corner_faces = new Array(vectors.length);
        for (let i = 0; i < vectors.length; ++i) corner_faces[i] = [];
        for (let i = 0; i < this.faces.length; ++i) {
            let ii = this.faces[i],
                fl = ii.length - 1;
            let center_point = new Vector3();
            let face = new Array(fl);
            for (let j = 0; j < fl; ++j) {
                let vv = vectors[ii[j]].clone();
                center_point.add(vv);
                corner_faces[ii[j]].push(
                    (face[j] = chamfer_vectors.push(vv) - 1)
                );
            }
            center_point.divideScalar(fl);
            for (let j = 0; j < fl; ++j) {
                let vv = chamfer_vectors[face[j]];
                vv.subVectors(vv, center_point)
                    .multiplyScalar(this.chamfer)
                    .addVectors(vv, center_point);
            }
            face.push(ii[fl]);
            chamfer_faces.push(face);
        }
        for (let i = 0; i < this.faces.length - 1; ++i) {
            for (let j = i + 1; j < this.faces.length; ++j) {
                let pairs = [],
                    lastm = -1;
                for (let m = 0; m < this.faces[i].length - 1; ++m) {
                    let n = this.faces[j].indexOf(this.faces[i][m]);
                    if (n >= 0 && n < this.faces[j].length - 1) {
                        if (lastm >= 0 && m !== lastm + 1)
                            pairs.unshift([i, m], [j, n]);
                        else pairs.push([i, m], [j, n]);
                        lastm = m;
                    }
                }
                if (pairs.length !== 4) continue;
                chamfer_faces.push([
                    chamfer_faces[pairs[0][0]][pairs[0][1]],
                    chamfer_faces[pairs[1][0]][pairs[1][1]],
                    chamfer_faces[pairs[3][0]][pairs[3][1]],
                    chamfer_faces[pairs[2][0]][pairs[2][1]],
                    -1
                ]);
            }
        }
        for (let i = 0; i < corner_faces.length; ++i) {
            let cf = corner_faces[i],
                face = [cf[0]],
                count = cf.length - 1;
            while (count) {
                for (let m = this.faces.length; m < chamfer_faces.length; ++m) {
                    let index = chamfer_faces[m].indexOf(face[face.length - 1]);
                    if (index >= 0 && index < 4) {
                        if (--index === -1) index = 3;
                        let next_vertex = chamfer_faces[m][index];
                        if (cf.indexOf(next_vertex) >= 0) {
                            face.push(next_vertex);
                            break;
                        }
                    }
                }
                --count;
            }
            face.push(-1);
            chamfer_faces.push(face);
        }
        return { vectors: chamfer_vectors, faces: chamfer_faces };
    }
    makeGeometry(vertices: Vector3[], faces: number[][]) {
        let geom = new BufferGeometry();

        for (let i = 0; i < vertices.length; ++i) {
            vertices[i] = vertices[i].multiplyScalar(this.radius);
        }

        let positions = [];
        const normals = [];
        const uvs = [];

        const cb = new Vector3();
        const ab = new Vector3();
        let materialIndex;
        let faceFirstVertexIndex = 0;
        for (let i = 0; i < faces.length; ++i) {
            let ii = faces[i],
                fl = ii.length - 1;
            let aa = (Math.PI * 2) / fl;
            materialIndex = ii[fl] + 1;
            for (let j = 0; j < fl - 2; ++j) {
                //Vertices
                positions.push(...vertices[ii[0]].toArray());
                positions.push(...vertices[ii[j + 1]].toArray());
                positions.push(...vertices[ii[j + 2]].toArray());

                // Flat face normals
                cb.subVectors(vertices[ii[j + 2]], vertices[ii[j + 1]]);
                ab.subVectors(vertices[ii[0]], vertices[ii[j + 1]]);
                cb.cross(ab);
                cb.normalize();

                // Vertex Normals
                normals.push(...cb.toArray());
                normals.push(...cb.toArray());
                normals.push(...cb.toArray());

                //UVs
                uvs.push(
                    (Math.cos(this.af) + 1 + this.tab) / 2 / (1 + this.tab),
                    (Math.sin(this.af) + 1 + this.tab) / 2 / (1 + this.tab)
                );
                uvs.push(
                    (Math.cos(aa * (j + 1) + this.af) + 1 + this.tab) /
                        2 /
                        (1 + this.tab),
                    (Math.sin(aa * (j + 1) + this.af) + 1 + this.tab) /
                        2 /
                        (1 + this.tab)
                );
                uvs.push(
                    (Math.cos(aa * (j + 2) + this.af) + 1 + this.tab) /
                        2 /
                        (1 + this.tab),
                    (Math.sin(aa * (j + 2) + this.af) + 1 + this.tab) /
                        2 /
                        (1 + this.tab)
                );
            }

            //Set Group for face materials.
            let numOfVertices = (fl - 2) * 3;
            for (let i = 0; i < numOfVertices / 3; i++) {
                geom.addGroup(faceFirstVertexIndex, 3, materialIndex);
                faceFirstVertexIndex += 3;
            }
        }

        geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
        geom.setAttribute("normal", new Float32BufferAttribute(normals, 3));
        geom.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
        geom.boundingSphere = new Sphere(new Vector3(), this.radius);
        return geom;
    }
    getMaterials() {
        let materials: MeshPhongMaterial[] = [];
        for (let i = 0; i < this.labels.length; i++) {
            let texture = this.createTextTexture(i);

            materials.push(
                new MeshPhongMaterial(
                    Object.assign({}, MATERIAL_OPTIONS, { map: texture })
                )
            );
        }
        return materials;
    }
    calculateTextureSize(approx: number) {
        return Math.max(
            128,
            Math.pow(2, Math.floor(Math.log(approx) / Math.log(2)))
        );
    }
    createTextTexture(index: number) {
        let text = this.labels[index];
        if (text == undefined) return null;

        const canvas = createEl("canvas");
        canvas.width = canvas.height = this.textureSize;
        let textstarty = canvas.height / 2;
        let textstartx = canvas.width / 2;
        let { context, fontsize } = this.getContext(canvas);

        let lineHeight = context.measureText("M").width * 1.4;
        let textlines = text.split("\n");

        if (textlines.length > 1) {
            fontsize = fontsize / textlines.length;
            context.font = `${fontsize}pt '${this.fontFace}'`;
            lineHeight = context.measureText("M").width * 1.2;
            textstarty -= (lineHeight * textlines.length) / 2;
        }

        for (let i = 0, l = textlines.length; i < l; i++) {
            let textline = textlines[i].trim();

            context.fillText(textlines[i], textstartx, textstarty);

            if (textline == "6" || textline == "9") {
                context.fillText("  .", textstartx, textstarty);
            }
            textstarty += lineHeight * 1.5;
        }

        /*         context.fillText(text, canvas.width / 2, canvas.height / 2);
        if (this.sides > 6 && (text == "6" || text == "9")) {
            context.fillText("  .", canvas.width / 2, canvas.height / 2);
        } */
        const texture = new Texture(canvas);
        texture.needsUpdate = true;
        canvas.detach();
        return texture;
    }
    getContext(canvas: HTMLCanvasElement) {
        const context = canvas.getContext("2d", { alpha: true });
        /* context.globalAlpha = 0; */

        context.clearRect(0, 0, canvas.width, canvas.height);

        let fontsize = canvas.width / (1 + 2 * this.margin);
        if (this.sides == 100) {
            fontsize *= 0.75;
        }
        context.font = `${fontsize}pt '${this.fontFace}'`;

        context.fillStyle = this.diceColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.textAlign = "center";
        context.textBaseline = "middle";
        if (this.sides == 10 || this.sides == 100) {
            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate((60 * Math.PI) / 180);
            context.translate(-canvas.width / 2, -canvas.height / 2);
        }
        context.fillStyle = this.textColor;
        return { context, fontsize };
    }
    clone() {
        return {
            body: new Body({
                mass: this.mass,
                shape: this.shape
            }),
            geometry: this.geometry.clone(),
            values: this.values
        };
    }
}

class D20DiceGeometry extends DiceGeometry {
    sides = 20;
    tab = -0.2;
    af = -Math.PI / 4 / 2;
    chamfer = 0.955;
    vertices: number[][] = [];
    faces = [
        [0, 11, 5, 1],
        [0, 5, 1, 2],
        [0, 1, 7, 3],
        [0, 7, 10, 4],
        [0, 10, 11, 5],
        [1, 5, 9, 6],
        [5, 11, 4, 7],
        [11, 10, 2, 8],
        [10, 7, 6, 9],
        [7, 1, 8, 10],
        [3, 9, 4, 11],
        [3, 4, 2, 12],
        [3, 2, 6, 13],
        [3, 6, 8, 14],
        [3, 8, 9, 15],
        [4, 9, 5, 16],
        [2, 4, 11, 17],
        [6, 2, 10, 18],
        [8, 6, 7, 19],
        [9, 8, 1, 20]
    ];
    scaleFactor = 1;
    values = [...Array(20).keys()];
    margin = 1;

    mass = 400;

    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: "#171120",
            textColor: "#FF0000"
        },
        scaler: number
    ) {
        super(w, h, options, scaler);

        let t = (1 + Math.sqrt(5)) / 2;
        this.vertices = [
            [-1, t, 0],
            [1, t, 0],
            [-1, -t, 0],
            [1, -t, 0],
            [0, -1, t],
            [0, 1, t],
            [0, -1, -t],
            [0, 1, -t],
            [t, 0, -1],
            [t, 0, 1],
            [-t, 0, -1],
            [-t, 0, 1]
        ];
    }
}

class D12DiceGeometry extends DiceGeometry {
    mass = 350;
    sides = 12;
    tab = 0.2;
    af = -Math.PI / 4 / 2;
    chamfer = 0.968;
    vertices: number[][] = [];
    faces = [
        [2, 14, 4, 12, 0, 1],
        [15, 9, 11, 19, 3, 2],
        [16, 10, 17, 7, 6, 3],
        [6, 7, 19, 11, 18, 4],
        [6, 18, 2, 0, 16, 5],
        [18, 11, 9, 14, 2, 6],
        [1, 17, 10, 8, 13, 7],
        [1, 13, 5, 15, 3, 8],
        [13, 8, 12, 4, 5, 9],
        [5, 4, 14, 9, 15, 10],
        [0, 12, 8, 10, 16, 11],
        [3, 19, 7, 17, 1, 12]
    ];
    scaleFactor = 0.9;
    values = [...Array(12).keys()];
    margin = 1;
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: "#7339BE",
            textColor: "#FFFFFF"
        },
        scaler: number
    ) {
        super(w, h, options, scaler);

        let p = (1 + Math.sqrt(5)) / 2;
        let q = 1 / p;
        this.vertices = [
            [0, q, p],
            [0, q, -p],
            [0, -q, p],
            [0, -q, -p],
            [p, 0, q],
            [p, 0, -q],
            [-p, 0, q],
            [-p, 0, -q],
            [q, p, 0],
            [q, -p, 0],
            [-q, p, 0],
            [-q, -p, 0],
            [1, 1, 1],
            [1, 1, -1],
            [1, -1, 1],
            [1, -1, -1],
            [-1, 1, 1],
            [-1, 1, -1],
            [-1, -1, 1],
            [-1, -1, -1]
        ];
    }
}

class D10DiceGeometry extends DiceGeometry {
    mass = 350;
    sides = 10;
    tab = 0;
    af = (-Math.PI * 6) / 5;
    chamfer = 0.945;
    vertices: number[][] = [];
    faces = [
        [5, 7, 11, 0],
        [4, 2, 10, 1],
        [1, 3, 11, 2],
        [0, 8, 10, 3],
        [7, 9, 11, 4],
        [8, 6, 10, 5],
        [9, 1, 11, 6],
        [2, 0, 10, 7],
        [3, 5, 11, 8],
        [6, 4, 10, 9],
        [1, 0, 2, -1],
        [1, 2, 3, -1],
        [3, 2, 4, -1],
        [3, 4, 5, -1],
        [5, 4, 6, -1],
        [5, 6, 7, -1],
        [7, 6, 8, -1],
        [7, 8, 9, -1],
        [9, 8, 0, -1],
        [9, 0, 1, -1]
    ];
    scaleFactor = 0.9;
    values = [...Array(10).keys()];
    margin = 1;
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: "#c74749",
            textColor: "#FFFFFF"
        },
        scaler: number
    ) {
        super(w, h, options, scaler);
        for (let i = 0, b = 0; i < 10; ++i, b += (Math.PI * 2) / 10) {
            this.vertices.push([
                Math.cos(b),
                Math.sin(b),
                0.105 * (i % 2 ? 1 : -1)
            ]);
        }
        this.vertices.push([0, 0, -1]);
        this.vertices.push([0, 0, 1]);
    }
}
class D100DiceGeometry extends DiceGeometry {
    labels = ["", "00", "10", "20", "30", "40", "50", "60", "70", "80", "90"];
    sides = 100;
    mass = 350;
    tab = 0;
    af = (-Math.PI * 6) / 5;
    chamfer = 0.945;
    vertices: number[][] = [];
    faces = [
        [5, 7, 11, 0],
        [4, 2, 10, 1],
        [1, 3, 11, 2],
        [0, 8, 10, 3],
        [7, 9, 11, 4],
        [8, 6, 10, 5],
        [9, 1, 11, 6],
        [2, 0, 10, 7],
        [3, 5, 11, 8],
        [6, 4, 10, 9],
        [1, 0, 2, -1],
        [1, 2, 3, -1],
        [3, 2, 4, -1],
        [3, 4, 5, -1],
        [5, 4, 6, -1],
        [5, 6, 7, -1],
        [7, 6, 8, -1],
        [7, 8, 9, -1],
        [9, 8, 0, -1],
        [9, 0, 1, -1]
    ];
    scaleFactor = 0.9;
    values = [...Array(10).keys()];
    margin = 1;
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: "#7a2c2d",
            textColor: "#FFFFFF"
        },
        scaler: number
    ) {
        super(w, h, options, scaler);
        for (let i = 0, b = 0; i < 10; ++i, b += (Math.PI * 2) / 10) {
            this.vertices.push([
                Math.cos(b),
                Math.sin(b),
                0.105 * (i % 2 ? 1 : -1)
            ]);
        }
        this.vertices.push([0, 0, -1]);
        this.vertices.push([0, 0, 1]);
    }
}

class D8DiceGeometry extends DiceGeometry {
    mass = 340;
    sides = 8;
    tab = 0;
    af = -Math.PI / 4 / 2;
    chamfer = 0.965;
    vertices = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1]
    ];
    faces = [
        [0, 2, 4, 1],
        [0, 4, 3, 2],
        [0, 3, 5, 3],
        [0, 5, 2, 4],
        [1, 3, 4, 5],
        [1, 4, 2, 6],
        [1, 2, 5, 7],
        [1, 5, 3, 8]
    ];
    scaleFactor = 1;
    values = [...Array(8).keys()];
    margin = 1.2;
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: "#5eb0c5",
            textColor: "#FFFFFF"
        },
        scaler: number
    ) {
        super(w, h, options, scaler);
    }
}

class D6DiceGeometry extends DiceGeometry {
    mass = 300;
    tab = 0.1;
    af = Math.PI / 4;
    chamfer = 0.96;
    vertices = [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1]
    ];
    faces = [
        [0, 3, 2, 1, 1],
        [1, 2, 6, 5, 2],
        [0, 1, 5, 4, 3],
        [3, 7, 6, 2, 4],
        [0, 4, 7, 3, 5],
        [4, 5, 6, 7, 6]
    ];
    scaleFactor = 0.9;
    sides = 6;
    margin = 1.0;
    values = [...Array(6).keys()];
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: "#d68316",
            textColor: "#FFFFFF"
        },
        scaler: number
    ) {
        super(w, h, options, scaler);
    }
}
class FudgeDiceGeometry extends D6DiceGeometry {
    labels = ["", "", "+", "-", " ", "+", "-", " "];
    values = [null, 1, -1, 0, 1, -1, 0];
}
class StuntDiceGeometry extends D6DiceGeometry {
    get diceColor() {
        return "red";
    }
}
class D4DiceGeometry extends DiceGeometry {
    mass = 300;
    tab = -0.1;
    af = (Math.PI * 7) / 6;
    chamfer = 0.96;
    vertices = [
        [1, 1, 1],
        [-1, -1, 1],
        [-1, 1, -1],
        [1, -1, -1]
    ];
    faces = [
        [1, 0, 2, 1],
        [0, 1, 3, 2],
        [0, 3, 2, 3],
        [1, 2, 3, 4]
    ];
    scaleFactor = 1.2;
    sides = 4;
    margin = 1.0;
    d4FaceTexts = [
        [[], [0, 0, 0], [2, 4, 3], [1, 3, 4], [2, 1, 4], [1, 2, 3]],
        [[], [0, 0, 0], [2, 3, 4], [3, 1, 4], [2, 4, 1], [3, 2, 1]],
        [[], [0, 0, 0], [4, 3, 2], [3, 4, 1], [4, 2, 1], [3, 1, 2]],
        [[], [0, 0, 0], [4, 2, 3], [1, 4, 3], [4, 1, 2], [1, 3, 2]]
    ];
    faceTexts = this.d4FaceTexts[0];
    values = [...Array(4).keys()];

    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: "#93b139",
            textColor: "#FFFFFF"
        },
        scaler: number
    ) {
        super(w, h, options, scaler);
    }

    getMaterials() {
        let materials: MeshPhongMaterial[] = [];
        for (let i = 0; i < this.d4FaceTexts[0].length; ++i) {
            let texture = null;
            texture = this.createTextTexture(i);

            materials.push(
                new MeshPhongMaterial(
                    Object.assign({}, MATERIAL_OPTIONS, { map: texture })
                )
            );
        }
        return materials;
    }
    createTextTexture(index: number) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let ts =
            this.calculateTextureSize(this.radius / 2 + this.radius * 2) * 2;
        canvas.width = canvas.height = ts;
        ctx.font = `${ts / 5}pt '${this.fontFace}'`;
        ctx.fillStyle = this.diceColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.textColor;
        for (let i in this.faceTexts[index]) {
            ctx.fillText(
                `${this.faceTexts[index][i]}`,
                canvas.width / 2,
                canvas.height / 2 - ts * 0.3
            );
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((Math.PI * 2) / 3);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }
        let texture = new Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    updateMaterialsForValue(diceValue: number) {
        if (diceValue < 0) diceValue += 4;
        this.faceTexts = this.d4FaceTexts[diceValue];
        this.geometry.material = this.getMaterials();
    }
}

abstract class GenesysDice extends DiceGeometry {
    fontFace: string = "DICE_ROLLER_GENESYS_FONT";
}

abstract class GenesysD12DiceGeometry extends GenesysDice {
    mass = 350;
    sides = 12;
    tab = 0.2;
    af = -Math.PI / 4 / 2;
    chamfer = 0.968;
    vertices: number[][] = [];
    faces = [
        [2, 14, 4, 12, 0, 1],
        [15, 9, 11, 19, 3, 2],
        [16, 10, 17, 7, 6, 3],
        [6, 7, 19, 11, 18, 4],
        [6, 18, 2, 0, 16, 5],
        [18, 11, 9, 14, 2, 6],
        [1, 17, 10, 8, 13, 7],
        [1, 13, 5, 15, 3, 8],
        [13, 8, 12, 4, 5, 9],
        [5, 4, 14, 9, 15, 10],
        [0, 12, 8, 10, 16, 11],
        [3, 19, 7, 17, 1, 12]
    ];
    scaleFactor = 0.9;
    values = [...Array(12).keys()];
    margin = 1;
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = DEFAULT_DICE_OPTIONS,
        scaler: number
    ) {
        super(w, h, options, scaler);

        let p = (1 + Math.sqrt(5)) / 2;
        let q = 1 / p;
        this.vertices = [
            [0, q, p],
            [0, q, -p],
            [0, -q, p],
            [0, -q, -p],
            [p, 0, q],
            [p, 0, -q],
            [-p, 0, q],
            [-p, 0, -q],
            [q, p, 0],
            [q, -p, 0],
            [-q, p, 0],
            [-q, -p, 0],
            [1, 1, 1],
            [1, 1, -1],
            [1, -1, 1],
            [1, -1, -1],
            [-1, 1, 1],
            [-1, 1, -1],
            [-1, -1, 1],
            [-1, -1, -1]
        ];
    }
}

export class GenesysForceDiceGeometry extends GenesysD12DiceGeometry {
    labels = [
        "",
        "",
        "z", //Moved Blank to top as a 1 roll.
        "z", //Success
        "z", //Success
        "z", //Success Success
        "z", //Success Success
        "z", //Advantage
        "z\nz", //Success Advantage
        "Z", //Success Advantage
        "Z", //Success Advantage
        "Z\nZ", //Advantage Advantage
        "Z\nZ", //Advantage Advantage
        "Z\nZ", //Advantage Advantage
   ];
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = DEFAULT_DICE_OPTIONS,
        scaler: number
    ) {
        super(w, h, options, scaler);
        this.setColor({ diceColor: "white", textColor: "#000000" });
    }
}
export class GenesysProficiencyDiceGeometry extends GenesysD12DiceGeometry {
    labels = [
        "",
        "",
        "", //Moved Blank to top as a 1 roll.
        "s", //Success
        "s", //Success
        "s\ns", //Success Success
        "s\ns", //Success Success
        "a", //Advantage
        "s\na", //Success Advantage
        "s\na", //Success Advantage
        "s\na", //Success Advantage
        "a\na", //Advantage Advantage
        "a\na", //Advantage Advantage
        "x", //Triumph
    ];
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = DEFAULT_DICE_OPTIONS,
        scaler: number
    ) {
        super(w, h, options, scaler);
        this.setColor({ diceColor: "#FEF035", textColor: "#000000" });
    }
}

export class GenesysChallengeDiceGeometry extends GenesysD12DiceGeometry {
    labels = [
        "",
        "",
        "", //Moved blank to roll of 1.
        "f", //Fail
        "f", //Fail
        "f\nf", //Fail Fail
        "f\nf", //Fail Fail
        "t", //Threat
        "t", //Threat
        "t\nf", //Threat Fail
        "t\nf", //Threat Fail
        "t\nt", //Threat Threat
        "t\nt", //Threat Threat
        "y", //Despair
    ];
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = DEFAULT_DICE_OPTIONS,
        scaler: number
    ) {
        super(w, h, options, scaler);
        this.setColor({ diceColor: "#751317", textColor: "#FFFFFF" });
    }
}

abstract class GenesysD8DiceGeometry extends GenesysDice {
    mass = 340;
    sides = 8;
    tab = 0;
    af = -Math.PI / 4 / 2;
    chamfer = 0.965;
    vertices = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1]
    ];
    faces = [
        [0, 2, 4, 1],
        [0, 4, 3, 2],
        [0, 3, 5, 3],
        [0, 5, 2, 4],
        [1, 3, 4, 5],
        [1, 4, 2, 6],
        [1, 2, 5, 7],
        [1, 5, 3, 8]
    ];
    scaleFactor = 1;
    values = [...Array(8).keys()];
    margin = 1.2;
}

export class GenesysAbilityDiceGeometry extends GenesysD8DiceGeometry {
    labels = [
        "", 
        "", 
        "", //Blank on 1
        "s", //Success
        "s", //Success
        "s\ns", //Success Success 
        "a", //Adv
        "a", //Adv
        "s\na", //Success Advantage
        "a\na", //Adv Adv
    ];
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = DEFAULT_DICE_OPTIONS,
        scaler: number
    ) {
        super(w, h, options, scaler);
        this.setColor({ diceColor: "#46AC4E", textColor: "#000000" });
    }
}
export class GenesysDifficultyDiceGeometry extends GenesysD8DiceGeometry {
    labels = [
        "", 
        "", 
        "", //Blank on 1
        "f", //Fail
        "f\nf", //Fail Fail
        "t", //Threat
        "t", //Threat
        "t", //Threat
        "t\nt", //Threat Threat
        "f\nt", //Fail Threat
    ];
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = DEFAULT_DICE_OPTIONS,
        scaler: number
    ) {
        super(w, h, options, scaler);
        this.setColor({ diceColor: "#52287E", textColor: "#FFFFFF" });
    }
}

class GenesysD6DiceGeometry extends GenesysDice {
    mass = 300;
    tab = 0.1;
    af = Math.PI / 4;
    chamfer = 0.96;
    vertices = [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1]
    ];
    faces = [
        [0, 3, 2, 1, 1],
        [1, 2, 6, 5, 2],
        [0, 1, 5, 4, 3],
        [3, 7, 6, 2, 4],
        [0, 4, 7, 3, 5],
        [4, 5, 6, 7, 6]
    ];
    scaleFactor = 0.9;
    sides = 6;
    margin = 1.0;
    values = [null, 1, -1, 0, 1, -1, 0];
}

export class GenesysBoostDiceGeometry extends GenesysD6DiceGeometry {
    labels = [
        "",
        "",
        "", //Blank on 1 
        "", //Blank on 2 
        "a\na", //Adv Adv
        "a", //Adv
        "s\na", //Success Adv
        "s", //Success
        ];
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = DEFAULT_DICE_OPTIONS,
        scaler: number
    ) {
        super(w, h, options, scaler);
        this.setColor({ diceColor: "#76CDDB", textColor: "#000000" });
    }
}
export class GenesysSetbackDiceGeometry extends GenesysD6DiceGeometry {
    labels = [
        "",
        "",
        "", //Blank on 1 
        "", //Blank on 2 
        "f", //Fail
        "f", //Fail
        "t", //Threat
        "t", //Threat
        ];
    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = DEFAULT_DICE_OPTIONS,
        scaler: number
    ) {
        super(w, h, options, scaler);
        this.setColor({ diceColor: "#000000", textColor: "#FFFFFF" });
    }
}

export {
    D100DiceGeometry,
    D20DiceGeometry,
    D12DiceGeometry,
    D10DiceGeometry,
    D8DiceGeometry,
    D6DiceGeometry,
    D4DiceGeometry,
    FudgeDiceGeometry,
    StuntDiceGeometry
    //Genesys
};
