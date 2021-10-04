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
abstract class DiceShape {
    body: CANNON.Body;
    chamferGeometry: { vectors: THREE.Vector3[]; faces: any[][] };
    geometry: THREE.Mesh;
    scale = 50;
    shape: CANNON.ConvexPolyhedron;

    abstract af: number;
    abstract chamfer: number;
    abstract faces: number[][];

    // An array containing [" ", "0", "1", ... "N"]
    labels = [" "].concat(Array.from({length: 20}, (_, i) => str(i)));

    abstract margin: number;

    abstract mass: number;

    abstract sides: number;
    abstract scaleFactor: number;
    abstract tab: number;

    abstract values: number[];
    abstract vertices: number[][];
    shapeData: { vertices: any[]; faces: any[] };
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
        diceColor: string;
        textColor: string;
    }) {
        this.options.diceColor = diceColor;
        this.options.textColor = textColor;
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
    create() {
        this.geometry = new THREE.Mesh(this.getGeometry(), this.getMaterials());
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
        for (let i = 0; i < this.labels.length; ++i) {
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
    calculateTextureSize(approx: number) {
        return Math.max(
            128,
            Math.pow(2, Math.floor(Math.log(approx) / Math.log(2)))
        );
    }
    createTextTexture(index: number) {
        let text = this.labels[index];
        if (text == undefined) return null;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const ts =
            this.calculateTextureSize(
                this.scale / 2 + this.scale * this.margin
            ) * 2;
        canvas.width = canvas.height = ts;

        let fontsize = ts / (1 + 2 * this.margin);
        if (this.sides == 100) {
            fontsize *= 0.75;
        }
        context.font = fontsize + "pt Arial";

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
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        if (this.sides > 6 && (text == "6" || text == "9")) {
            context.fillText("  .", canvas.width / 2, canvas.height / 2);
        }
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    clone() {
        return {
            body: new CANNON.Body({
                mass: this.mass,
                shape: this.shape
            }),
            geometry: this.geometry.clone()
        };
    }
}

class D20DiceShape extends DiceShape {
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

        this.create();
    }
}

class D12DiceShape extends DiceShape {
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
        this.create();
    }
}

class D10DiceShape extends DiceShape {
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

        this.create();
    }
}
class D100DiceShape extends DiceShape {
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

        this.create();
    }
}

class D8DiceShape extends DiceShape {
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
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
        this.create();
    }
}

class D6DiceShape extends DiceShape {
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

    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
        this.create();
    }
}
class D4DiceShape extends DiceShape {
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
    constructor(w: number, h: number, options = DEFAULT_DICE_OPTIONS) {
        super(w, h, options);
        this.create();
    }
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
        ctx.font = ts / 5 + "pt Arial";
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

export {
    D100DiceShape,
    D20DiceShape,
    D12DiceShape,
    D10DiceShape,
    D8DiceShape,
    D6DiceShape,
    D4DiceShape
};
