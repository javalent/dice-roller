import { Component } from "obsidian";
import * as THREE from "three";
import * as CANNON from "cannon-es";

import { OrbitControls } from "./orbit";

type DiceSize = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

export default class DiceRenderer extends Component {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    world: World;
    camera: THREE.PerspectiveCamera;
    container: HTMLElement = createDiv("renderer-container");
    cube: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhongMaterial[]>;
    geometry: THREE.BufferGeometry;
    poly: THREE.PolyhedronGeometry;

    diceColor = "#202020";
    labelColor = "#aaaaaa";

    /*     d20 = new D20Dice(1);
    d12 = new D12Dice(1);
    d10 = new D10Dice(1);
    d8 = new D8Dice(1);
    d6 = new D6Dice(1);
    d4 = new D4Dice(1); */
    current: Dice[] = [];
    body: CANNON.ConvexPolyhedron;
    directionalLight: THREE.DirectionalLight;
    ambientLight: THREE.AmbientLight;
    animation: number;
    sphereMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshNormalMaterial>;
    sphereBody: CANNON.Body;
    light: THREE.SpotLight;
    controls: OrbitControls;

    get WIDTH() {
        return this.container.clientWidth / 2;
    }
    get HEIGHT() {
        return this.container.clientHeight / 2;
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
    get mw() {
        return Math.max(this.WIDTH, this.HEIGHT);
    }
    initLighting() {
        this.ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(this.ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xefdfd5, 0.675);
        this.directionalLight.position.set(0, 0, 1);
        this.directionalLight.castShadow = true;
        this.scene.add(this.directionalLight);
    }
    initScene() {
        this.scene = new THREE.Scene();
        this.initLighting();

        this.camera = new THREE.PerspectiveCamera(
            20,
            this.ASPECT,
            1,
            (this.HEIGHT / this.ASPECT / Math.tan((10 * Math.PI) / 180)) * 1.3
        );
        this.camera.position.set(this.WIDTH, this.HEIGHT, 200);

        this.camera.updateProjectionMatrix();

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;

        this.renderer.setSize(this.WIDTH * 2, this.HEIGHT * 2);
        this.container.appendChild(this.renderer.domElement);

        this.current = [new D20Dice(this.WIDTH, this.HEIGHT)];

        this.startThrow();

        console.log(this.current);

        this.scene.add(...this.current.map((d) => d.geometry));
    }
    initWorld() {
        this.world = new World(this.WIDTH * 2, this.HEIGHT * 2);
        this.world.add(...this.current);
    }
    render() {
        this.animation = requestAnimationFrame(() => this.render());
        /* this.current.forEach((dice) => {
            dice.rotation.x += 0.05;
            dice.rotation.y += 0.01;
        }); */
        this.world.step(1 / 60);
        this.current.forEach((dice) => {
            dice.set();
        });
        /* console.log(this.current[0].geometry.position.x); */

        this.camera.updateProjectionMatrix();

        this.renderer.render(this.scene, this.camera);
    }
    dispose(...children: any[]) {
        children.forEach((child) => {
            if ("dispose" in child) child.dispose();
            if (child.children) this.dispose(...child.children);
        });
    }
    onunload() {
        cancelAnimationFrame(this.animation);

        this.container.detach();
        this.container.empty();
        this.renderer.domElement.detach();
        this.renderer.dispose();

        this.ambientLight.dispose();
        this.directionalLight.dispose();

        this.scene.children.forEach((child) => this.dispose(child));

        this.scene.remove(
            this.scene,
            ...this.scene.children,
            ...this.current.map((d) => d.geometry)
        );

        this.current.forEach((dice) => {
            let materials = [
                ...(Array.isArray(dice.geometry.material)
                    ? dice.geometry.material
                    : [dice.geometry.material])
            ];
            materials.forEach((material) => material && material.dispose());
        });

        //causes white flash?
        //this.renderer.forceContextLoss();
    }

    startThrow(
        vector: Vector = {
            x: /* (Math.random() * 2 - 1) * */ this.WIDTH,
            y: /* -(Math.random() * 2 - 1) * */ this.HEIGHT
        }
    ) {
        this.dispose(...this.current.map((d) => d.geometry));
        this.current = [];

        const dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        const boost = (Math.random() + 3) * dist;

        vector.x /= dist;
        vector.y /= dist;

        const vectors = this.generateVectorsForThrow(vector, boost);

        for (const vector of vectors) {
            let dice: Dice;
            switch (Math.floor(Math.random() * 5)) {
                default:
                case 0: {
                    dice = new D20Dice(this.WIDTH, this.HEIGHT /* , vector */);
                    break;
                }
                case 1: {
                    dice = new D12Dice(this.WIDTH, this.HEIGHT /* , vector */);
                    break;
                }
                case 2: {
                    dice = new D10Dice(this.WIDTH, this.HEIGHT /* , vector */);
                    break;
                }
                case 3: {
                    dice = new D8Dice(this.WIDTH, this.HEIGHT /* , vector */);
                    break;
                }
                case 4: {
                    dice = new D6Dice(this.WIDTH, this.HEIGHT /* , vector */);
                    break;
                }
                case 5: {
                    dice = new D4Dice(this.WIDTH, this.HEIGHT /* , vector */);
                    break;
                }
            }

            //const dice = new D20Dice(this.WIDTH, this.HEIGHT, vector);
            this.current.push(dice);
        }
    }
    generateVectorsForThrow(vector: Vector, boost: number) {
        const vectors = [];
        for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
            const vec = this.randomVector(vector);
            const pos = {
                x: this.WIDTH /* * (vec.x > 0 ? -1 : 1) */ * Math.random(),
                y: this.HEIGHT /* * (vec.y > 0 ? -1 : 1) */ * Math.random(),
                z: 125
            };
            const projector = Math.abs(vec.x / vec.y);
            if (projector > 1.0) pos.y /= projector;
            else pos.x *= projector;
            const velvec = this.randomVector(vector);
            const velocity = {
                x: velvec.x * boost,
                y: velvec.y * boost,
                z: -1
            };
            const angle = {
                x: -((Math.random() * vec.y * 5) /* + inertia * vec.y */),
                y: Math.random() * vec.x * 5 /*  + inertia * vec.x */,
                z: 0
            };
            const axis = {
                x: Math.random(),
                y: Math.random(),
                z: Math.random(),
                w: Math.random()
            };
            vectors.push({
                pos: pos
                /* velocity: velocity,
                angle: angle,
                axis: axis */
            });
        }
        return vectors;
    }
    randomVector(vector: Vector) {
        var random_angle = (Math.random() * Math.PI) / 5 - Math.PI / 5 / 2;
        var vec = {
            x:
                vector.x * Math.cos(random_angle) -
                vector.y * Math.sin(random_angle),
            y:
                vector.x * Math.sin(random_angle) +
                vector.y * Math.cos(random_angle)
        };
        if (vec.x == 0) vec.x = 0.01;
        if (vec.y == 0) vec.y = 0.01;
        return vec;
    }
}

interface Vector {
    x: number;
    y: number;
    z?: number;
}
interface Quarternion extends Vector {
    w: number;
}

const MATERIAL_OPTIONS = {
    specular: 0x172022,
    color: 0xf0f0f0,
    shininess: 40,
    flatShading: true
    //shading: THREE.FlatShading,
};

class World {
    add(...dice: Dice[]) {
        dice.forEach((die) => {
            this.world.addBody(die.body);
        });
    }
    lastCallTime: number;
    step(step: number = 1 / 60) {
        const time = performance.now() / 1000; // seconds
        if (!this.lastCallTime) {
            this.world.step(step);
        } else {
            const dt = time - this.lastCallTime;
            this.world.step(step, dt);
        }
        this.lastCallTime = time;
    }
    world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, -9.82 * 5) });
    ground = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane()
    });
    constructor(public w: number, public h: number) {
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.ground.quaternion.setFromEuler(0, 0, 0);
        this.ground.position.set(0, 0, 100);
        this.world.addBody(this.ground);

        const left = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane()
        });
        left.position.set(0, 0, 100);
        left.quaternion.setFromEuler(0, Math.PI / 2, 0);

        this.world.addBody(left);
        /* const bottom = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
            position: new CANNON.Vec3(0, this.h, 0)
        });
        bottom.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(bottom); */

        /* 

        const right = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
            position: new CANNON.Vec3(-this.w * 0.93, 0, 0)
        });
        right.quaternion.setFromAxisAngle(
            new CANNON.Vec3(0, 1, 0),
            -Math.PI / 2
        );
        this.world.addBody(right); */
    }
}

const DEFAULT_DICE_OPTIONS = {
    radius: 1,
    diceColor: "#202020"
};

// dice from https://github.com/byWulf/threejs-dice/blob/cd36a626f3f3f11576eb1d694223f07a36371b3b/lib/dice.js
abstract class Dice {
    textColor = "#aaaaaa";

    geometry: THREE.Mesh;
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

    abstract vertices: number[][];
    body: CANNON.Body;

    constructor(
        public w: number,
        public h: number,
        public options = {
            radius: 1,
            diceColor: "#202020"
        }
    ) {
        this.options = {
            ...DEFAULT_DICE_OPTIONS,
            ...options
        };
    }

    get radius() {
        return this.options.radius;
    }
    get diceColor() {
        return this.options.diceColor;
    }

    get vectors() {
        return;
    }

    generateVector() {}

    set() {
        this.geometry.position.set(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
        this.geometry.quaternion.set(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
    }

    create() {
        this.geometry = new THREE.Mesh(this.getGeometry(), this.getMaterials());

        this.geometry.receiveShadow = true;
        this.geometry.castShadow = true;

        this.body.position.set(
            this
                .w /*  + Math.round(Math.random()) * 2 - 1 * Math.random() * 10 */,
            this
                .h /*  + Math.round(Math.random()) * 2 - 1 * Math.random() * 10 */,

            150
        );
        this.body.angularVelocity.set(
            Math.random() * 5,
            Math.random() * 5,
            Math.random() * 5
        );
        //this.body.velocity.set(0, Math.random() * 25, 0);
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
        return new CANNON.ConvexPolyhedron({ vertices: cv, faces: cf });
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

class D20Dice extends Dice {
    sides = 8;
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
    values = 20;
    margin = 1;

    mass = 400;

    constructor(
        w: number,
        h: number,
        vector?: {
            pos?: Vector;
            velocity?: Vector;
            angle?: Vector;
            axis?: Quarternion;
        },
        options = DEFAULT_DICE_OPTIONS
    ) {
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
        const { pos, velocity, angle, axis } = vector ?? {};

        if (pos) {
            this.body.position.set(pos.x, pos.y, pos.z);
        }
        if (velocity) {
            this.body.velocity.set(velocity.x, velocity.y, velocity.z);
        }
        if (angle) {
            this.body.angularVelocity.set(angle.x, angle.y, angle.z);
        }
        if (axis) {
            this.body.quaternion.setFromAxisAngle(
                new CANNON.Vec3(axis.x, axis.y, axis.z),
                axis.w * Math.PI * 2
            );
        }
    }
}

class D12Dice extends Dice {
    mass = 350;
    sides = 8;
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
    values = 12;
    margin = 1;
    constructor(
        w: number,
        h: number,
        vector?: {
            pos?: Vector;
            velocity?: Vector;
            angle?: Vector;
            axis?: Quarternion;
        },
        options = DEFAULT_DICE_OPTIONS
    ) {
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
        const { pos, velocity, angle, axis } = vector ?? {};

        if (pos) {
            this.body.position.set(pos.x, pos.y, pos.z);
        }
        if (velocity) {
            this.body.velocity.set(velocity.x, velocity.y, velocity.z);
        }
        if (angle) {
            this.body.angularVelocity.set(angle.x, angle.y, angle.z);
        }
        if (axis) {
            this.body.quaternion.setFromAxisAngle(
                new CANNON.Vec3(axis.x, axis.y, axis.z),
                axis.w * Math.PI * 2
            );
        }
    }
}

class D10Dice extends Dice {
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
    values = 10;
    margin = 1;
    constructor(
        w: number,
        h: number,
        vector?: {
            pos?: Vector;
            velocity?: Vector;
            angle?: Vector;
            axis?: Quarternion;
        },
        options = DEFAULT_DICE_OPTIONS
    ) {
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
        const { pos, velocity, angle, axis } = vector ?? {};

        if (pos) {
            this.body.position.set(pos.x, pos.y, pos.z);
        }
        if (velocity) {
            this.body.velocity.set(velocity.x, velocity.y, velocity.z);
        }
        if (angle) {
            this.body.angularVelocity.set(angle.x, angle.y, angle.z);
        }
        if (axis) {
            this.body.quaternion.setFromAxisAngle(
                new CANNON.Vec3(axis.x, axis.y, axis.z),
                axis.w * Math.PI * 2
            );
        }
    }
}

class D8Dice extends Dice {
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
    values = 8;
    margin = 1.2;
    constructor(
        w: number,
        h: number,
        vector?: {
            pos?: Vector;
            velocity?: Vector;
            angle?: Vector;
            axis?: Quarternion;
        },
        options = DEFAULT_DICE_OPTIONS
    ) {
        super(w, h, options);
        this.create();
        const { pos, velocity, angle, axis } = vector ?? {};

        if (pos) {
            this.body.position.set(pos.x, pos.y, pos.z);
        }
        if (velocity) {
            this.body.velocity.set(velocity.x, velocity.y, velocity.z);
        }
        if (angle) {
            this.body.angularVelocity.set(angle.x, angle.y, angle.z);
        }
        if (axis) {
            this.body.quaternion.setFromAxisAngle(
                new CANNON.Vec3(axis.x, axis.y, axis.z),
                axis.w * Math.PI * 2
            );
        }
    }
}

class D6Dice extends Dice {
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

    constructor(
        w: number,
        h: number,
        vector?: {
            pos?: Vector;
            velocity?: Vector;
            angle?: Vector;
            axis?: Quarternion;
        },
        options = DEFAULT_DICE_OPTIONS
    ) {
        super(w, h, options);
        this.create();
        const { pos, velocity, angle, axis } = vector ?? {};

        if (pos) {
            this.body.position.set(pos.x, pos.y, pos.z);
        }
        if (velocity) {
            this.body.velocity.set(velocity.x, velocity.y, velocity.z);
        }
        if (angle) {
            this.body.angularVelocity.set(angle.x, angle.y, angle.z);
        }
        if (axis) {
            this.body.quaternion.setFromAxisAngle(
                new CANNON.Vec3(axis.x, axis.y, axis.z),
                axis.w * Math.PI * 2
            );
        }
    }
}
class D4Dice extends Dice {
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
    constructor(
        w: number,
        h: number,
        vector?: {
            pos?: Vector;
            velocity?: Vector;
            angle?: Vector;
            axis?: Quarternion;
        },
        options = DEFAULT_DICE_OPTIONS
    ) {
        super(w, h, options);
        this.create();
        const { pos, velocity, angle, axis } = vector ?? {};

        if (pos) {
            this.body.position.set(pos.x, pos.y, pos.z);
        }
        if (velocity) {
            this.body.velocity.set(velocity.x, velocity.y, velocity.z);
        }
        if (angle) {
            this.body.angularVelocity.set(angle.x, angle.y, angle.z);
        }
        if (axis) {
            this.body.quaternion.setFromAxisAngle(
                new CANNON.Vec3(axis.x, axis.y, axis.z),
                axis.w * Math.PI * 2
            );
        }
    }
}

/**
 const top = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
            position: new CANNON.Vec3(0, this.height * 0.93, 0)
        });
        top.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        this.world.addBody(top);

        const bottom = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
            position: new CANNON.Vec3(0, -this.height * 0.93, 0)
        });
        bottom.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0),
            -Math.PI / 2
        );
        this.world.addBody(bottom);

        const left = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
            position: new CANNON.Vec3(this.width * 0.93, 0, 0)
        });
        left.quaternion.setFromAxisAngle(
            new CANNON.Vec3(0, 1, 0),
            -Math.PI / 2
        );
        this.world.addBody(left);

        const right = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
            position: new CANNON.Vec3(-this.width * 0.93, 0, 0)
        });
        right.quaternion.setFromAxisAngle(
            new CANNON.Vec3(0, 1, 0),
            -Math.PI / 2
        );
        this.world.addBody(right);
 */
