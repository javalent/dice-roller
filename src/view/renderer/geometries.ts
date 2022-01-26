import * as CANNON from "cannon-es";
import * as THREE from "three";

const MATERIAL_OPTIONS = {
    specular: 0x172022,
    color: 0xf0f0f0,
    shininess: 60,
    flatShading: true
};
const DEFAULT_DICE_OPTIONS = {
    diceColor: "#202020",
    textColor: "#ffffff"
};
export default abstract class DiceGeometry {
    body: CANNON.Body;
    chamferGeometry: { vectors: THREE.Vector3[]; faces: any[][] };
    geometry: THREE.Mesh;
    scale = 50;
    shape: CANNON.ConvexPolyhedron;

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
        public options = {
            diceColor: "#202020",
            textColor: "#aaaaaa"
        }
    ) {
        this.options = {
            ...DEFAULT_DICE_OPTIONS,
            ...options
        };
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
        return this.scale * this.scaleFactor;
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
        this.geometry = new THREE.Mesh(geometry, materials);
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
            vectors[i] = new THREE.Vector3()
                .fromArray(this.vertices[i])
                .normalize();
        }

        this.chamferGeometry = this.getChamferGeometry(vectors);
        let geometry = this.makeGeometry(
            this.chamferGeometry.vectors,
            this.chamferGeometry.faces
        );

        this.shape = this.makeShape(vectors);

        this.body = new CANNON.Body({
            mass: this.mass,
            shape: this.shape
        });

        return geometry;
    }
    makeShape(vertices: THREE.Vector3[]): CANNON.ConvexPolyhedron {
        let cv = new Array(vertices.length),
            cf = new Array(this.faces.length);
        for (let i = 0; i < vertices.length; ++i) {
            let v = vertices[i];
            cv[i] = new CANNON.Vec3(
                v.x * this.radius,
                v.y * this.radius,
                v.z * this.radius
            );
        }
        for (let i = 0; i < this.faces.length; ++i) {
            cf[i] = this.faces[i].slice(0, this.faces[i].length - 1);
        }
        this.shapeData = { vertices: cv, faces: cf };
        return new CANNON.ConvexPolyhedron({ vertices: cv, faces: cf });
    }
    getChamferGeometry(vectors: THREE.Vector3[]) {
        let chamfer_vectors = [],
            chamfer_faces = [],
            corner_faces = new Array(vectors.length);
        for (let i = 0; i < vectors.length; ++i) corner_faces[i] = [];
        for (let i = 0; i < this.faces.length; ++i) {
            let ii = this.faces[i],
                fl = ii.length - 1;
            let center_point = new THREE.Vector3();
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
    makeGeometry(vertices: THREE.Vector3[], faces: number[][]) {
        let geom = new THREE.BufferGeometry();

        for (let i = 0; i < vertices.length; ++i) {
            vertices[i] = vertices[i].multiplyScalar(this.radius);
        }

        let positions = [];
        const normals = [];
        const uvs = [];

        const cb = new THREE.Vector3();
        const ab = new THREE.Vector3();
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

        geom.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3)
        );
        geom.setAttribute(
            "normal",
            new THREE.Float32BufferAttribute(normals, 3)
        );
        geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geom.boundingSphere = new THREE.Sphere(
            new THREE.Vector3(),
            this.radius
        );
        return geom;
    }
    getMaterials() {
        let materials: THREE.MeshPhongMaterial[] = [];
        for (let i = 0; i < this.labels.length; i++) {
            let texture = this.createTextTexture(i);

            materials.push(
                new THREE.MeshPhongMaterial(
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
        const texture = new THREE.Texture(canvas);
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
            body: new CANNON.Body({
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

    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);

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
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);

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
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
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
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
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
}
class FudgeDiceGeometry extends DiceGeometry {
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
    labels = ["", "", "+", "-", " ", "+", "-", " "];
    values = [null, 1, -1, 0, 1, -1, 0];
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

    getMaterials() {
        let materials: THREE.MeshPhongMaterial[] = [];
        for (let i = 0; i < this.d4FaceTexts[0].length; ++i) {
            let texture = null;
            texture = this.createTextTexture(i);

            materials.push(
                new THREE.MeshPhongMaterial(
                    Object.assign({}, MATERIAL_OPTIONS, { map: texture })
                )
            );
        }
        return materials;
    }
    createTextTexture(index: number) {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
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
        let texture = new THREE.Texture(canvas);
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

    /* create() {
        if (!document.fonts.check(`12px '${this.fontFace}'`)) {
            const font = new FontFace(
                this.fontFace,
                `url(data:font/ttf;base64,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)`
            );
            //@ts-ignore
            document.fonts.add(font);
            console.log(document.fonts.check(`12px '${this.fontFace}'`));
        }
        return super.create();
    } */
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
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);

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

export class GenesysProficiencyDiceGeometry extends GenesysD12DiceGeometry {
    labels = [
        "",
        "",
        "a\na",
        "a",
        "a\na",
        "x",
        "s",
        "s\na",
        "s",
        "s\na",
        "s\ns",
        "s\na",
        "s\ns",
        ""
    ];
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
        this.setColor({ diceColor: "#FEF035", textColor: "#000000" });
    }
}

export class GenesysChallengeDiceGeometry extends GenesysD12DiceGeometry {
    labels = [
        "",
        "",
        "t\nt",
        "t",
        "t\nt",
        "t",
        "t\nf",
        "f",
        "t\nf",
        "f",
        "f\nf",
        "y",
        "f\nf",
        ""
    ];
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
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
    labels = ["", "", "s", "a", "s\na", "s\ns", "a", "s", "a\na", ""];
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
        this.setColor({ diceColor: "#46AC4E", textColor: "#000000" });
    }
}
export class GenesysDifficultyDiceGeometry extends GenesysD8DiceGeometry {
    labels = ["", "", "t", "f", "f\nt", "t", "", "t\nt", "f\nf", "t", ""];
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
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
    labels = ["", "", "", "", "s", "s  \n  a", "a  \n  a", "a", "", ""];
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
        this.setColor({ diceColor: "#76CDDB", textColor: "#000000" });
    }
}
export class GenesysSetbackDiceGeometry extends GenesysD6DiceGeometry {
    labels = ["", "", "", "t", "f", "", ""];
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
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
    //FudgeFate
    FudgeDiceGeometry
    //Genesys
};
