import { Component } from "obsidian";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { MeshPhongMaterial } from "three";
import { truncate } from "fs/promises";

type DiceSize = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

export default class DiceRenderer extends Component {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    world: CANNON.World;
    camera: THREE.PerspectiveCamera;
    container: HTMLElement = createDiv("renderer-container");
    cube: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhongMaterial[]>;
    geometry: THREE.BufferGeometry;
    poly: THREE.PolyhedronGeometry;

    diceColor = "#202020";
    labelColor = "#aaaaaa";
    dice: DiceObject;
    get WIDTH() {
        return this.container.clientWidth;
    }
    get HEIGHT() {
        return this.container.clientHeight;
    }
    get ASPECT() {
        return this.WIDTH / this.HEIGHT;
    }
    get scale() {
        return (this.WIDTH * this.WIDTH + this.HEIGHT * this.HEIGHT) / 13;
    }
    get canvasEl() {
        if (!this.renderer) return null;
        return this.renderer.domElement;
    }

    getD10Geometry() {
        const sides = 10;
        const vertices = [
            [0, 0, 1],
            [0, 0, -1]
        ].flat();

        for (let i = 0; i < sides; ++i) {
            const b = (i * Math.PI * 2) / sides;
            vertices.push(-Math.cos(b), -Math.sin(b), 0.105 * (i % 2 ? 1 : -1));
        }

        const faces = [
            [0, 2, 3],
            [0, 3, 4],
            [0, 4, 5],
            [0, 5, 6],
            [0, 6, 7],
            [0, 7, 8],
            [0, 8, 9],
            [0, 9, 10],
            [0, 10, 11],
            [0, 11, 2],
            [1, 3, 2],
            [1, 4, 3],
            [1, 5, 4],
            [1, 6, 5],
            [1, 7, 6],
            [1, 8, 7],
            [1, 9, 8],
            [1, 10, 9],
            [1, 11, 10],
            [1, 2, 11]
        ].flat();
        return new THREE.PolyhedronGeometry(vertices.flat(), faces.flat());
    }

    constructor() {
        super();
    }
    onload() {
        this.container.empty();
        document.body.appendChild(this.container);
        this.initScene();
        this.initWorld();

        this.render();
    }
    initScene() {
        this.scene = new THREE.Scene();
        const light = new THREE.AmbientLight(0x404040); // soft white light
        this.scene.add(light);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 0, 1);
        this.scene.add(directionalLight);
        this.camera = new THREE.PerspectiveCamera(75, this.ASPECT, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.WIDTH, this.HEIGHT);
        this.container.appendChild(this.renderer.domElement);

        this.dice = new D6Dice(1);
        this.scene.add(this.dice.instance);

        this.camera.position.z = 15;
    }
    initWorld() {}
    render() {
        requestAnimationFrame(() => this.render());
        this.dice.instance.rotation.x += 0.05;
        this.dice.instance.rotation.y += 0.01;

        this.renderer.render(this.scene, this.camera);
    }
    onunload() {
        this.container.detach();
        this.renderer.dispose();
    }
}
const MATERIAL_OPTIONS = {
    specular: 0x172022,
    color: 0xf0f0f0,
    shininess: 40,
    flatShading: true
    //shading: THREE.FlatShading,
};

abstract class DiceObject {
    diceColor = "#202020";
    textColor = "#aaaaaa";

    instance: THREE.Mesh;

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

    abstract sides: number;
    abstract scaleFactor: number;
    abstract tab: number;

    abstract vertices: number[][];

    constructor(public radius: number) {}

    create() {
        console.log(this.vertices.length);
        this.instance = new THREE.Mesh(this.getGeometry(), this.getMaterials());

        this.instance.receiveShadow = true;
        this.instance.castShadow = true;
    }
    getGeometry() {
        let radius = this.radius * this.scaleFactor;

        let vectors = new Array(this.vertices.length);
        for (let i = 0; i < this.vertices.length; ++i) {
            vectors[i] = new THREE.Vector3()
                .fromArray(this.vertices[i])
                .normalize();
        }

        let chamferGeometry = this.getChamferGeometry(
            vectors,
            this.faces,
            this.chamfer
        );
        let geometry = this.makeGeometry(
            chamferGeometry.vectors,
            chamferGeometry.faces,
            radius,
            this.tab,
            this.af
        );

        return geometry;
    }
    getChamferGeometry(
        vectors: THREE.Vector3[],
        faces: number[][],
        chamfer: number
    ) {
        let chamfer_vectors = [],
            chamfer_faces = [],
            corner_faces = new Array(vectors.length);
        for (let i = 0; i < vectors.length; ++i) corner_faces[i] = [];
        for (let i = 0; i < faces.length; ++i) {
            let ii = faces[i],
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
                    .multiplyScalar(chamfer)
                    .addVectors(vv, center_point);
            }
            face.push(ii[fl]);
            chamfer_faces.push(face);
        }
        for (let i = 0; i < faces.length - 1; ++i) {
            for (let j = i + 1; j < faces.length; ++j) {
                let pairs = [],
                    lastm = -1;
                for (let m = 0; m < faces[i].length - 1; ++m) {
                    let n = faces[j].indexOf(faces[i][m]);
                    if (n >= 0 && n < faces[j].length - 1) {
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
                for (let m = faces.length; m < chamfer_faces.length; ++m) {
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
    makeGeometry(
        vertices: THREE.Vector3[],
        faces: number[][],
        radius = this.radius,
        tab = this.tab,
        af = this.af
    ) {
        let geom = new THREE.BufferGeometry();

        for (let i = 0; i < vertices.length; ++i) {
            vertices[i] = vertices[i].multiplyScalar(radius);
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
                    (Math.cos(af) + 1 + tab) / 2 / (1 + tab),
                    (Math.sin(af) + 1 + tab) / 2 / (1 + tab)
                );
                uvs.push(
                    (Math.cos(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab),
                    (Math.sin(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab)
                );
                uvs.push(
                    (Math.cos(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab),
                    (Math.sin(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab)
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
        geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius);
        return geom;
    }
    getMaterials() {
        let materials: THREE.MeshPhongMaterial[] = [];
        for (let i = 0; i < this.labels.length; ++i) {
            let texture = null;
            texture = this.createTextTexture(this.labels[i]);

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
    createTextTexture(text: string) {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        let ts =
            this.calculateTextureSize(
                this.radius / 2 + this.radius * this.margin
            ) * 2;
        canvas.width = canvas.height = ts;
        context.font = ts / (1 + 2 * this.margin) + "pt Arial";
        context.fillStyle = this.diceColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = this.textColor;
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        let texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
}

class D8Dice extends DiceObject {
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
    values = 8;
    margin = 1.2;
    constructor(radius: number) {
        super(radius);
        this.create();
    }
}

class D6Dice extends DiceObject {
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

    constructor(radius: number) {
        super(radius);
        this.create();
    }
}
