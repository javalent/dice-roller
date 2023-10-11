/* import {
    BufferGeometry,
    Material,
    Mesh,
    Quaternion as ThreeQuaternion,
    Vector3
} from "three"; */
import { Body, Mat3, Vec3, Quaternion } from "cannon-es";
import { BufferGeometry } from "three/src/core/BufferGeometry";
import { Material } from "three/src/materials/Material";
import { Vector3 } from "three/src/math/Vector3";
import { Mesh } from "three/src/objects/Mesh";
import type { Quaternion as ThreeQuaternion } from "three/src/math/Quaternion";

interface DiceVector {
    pos: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    angular: { x: number; y: number; z: number };
    axis: { x: number; y: number; z: number; w: number };
}

export const DEFAULT_VECTOR = {
    pos: {
        x: 0 + 100 * Math.random(),
        y: 0 + 100 * Math.random(),
        z: 0 + 250
    },
    velocity: {
        x: 600 * (Math.random() * 2 + 1),
        y: 750 * (Math.random() * 2 + 1),
        z: 0
    },
    angular: {
        x: 200 * Math.random(),
        y: 200 * Math.random(),
        z: 100 * Math.random()
    },
    axis: {
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        w: Math.random()
    }
};

export abstract class DiceShape {
    scale = 50;
    abstract sides: number;
    abstract inertia: number;
    body: Body;
    geometry: Mesh<BufferGeometry, Material | Material[]>;

    stopped: boolean | number = false;
    iteration: number = 0;

    vector = { ...DEFAULT_VECTOR };
    constructor(
        public w: number,
        public h: number,
        public data: {
            geometry: Mesh;
            body: Body;
            values?: number[];
        }
    ) {
        this.geometry = data.geometry;
        this.body = data.body;
    }
    generateVector(v: { x: number; y: number }): DiceVector {
        const dist = Math.sqrt(v.x * v.x + v.y * v.y);
        const boost = (Math.random() + 5) * dist;
        const vector = { x: v.x / dist, y: v.y / dist };
        const vec = this.makeRandomVector(vector);
        const pos = {
            x: this.w * (vec.x > 0 ? -1 : 1) * 0.9,
            y: this.h * (vec.y > 0 ? -1 : 1) * 0.9,
            z: Math.random() * 200 + 200
        };

        const projector = Math.abs(vec.x / vec.y);
        if (projector > 1.0) pos.y /= projector;
        else pos.x *= projector;
        const velvec = this.makeRandomVector(vector);
        const velocity = {
            x: velvec.x * boost,
            y: velvec.y * boost,
            z: -10
        };

        const angular = {
            x: -(Math.random() * vec.y * 5 + this.inertia * vec.y),
            y: Math.random() * vec.x * 5 + this.inertia * vec.x,
            z: 0
        };
        const axis = {
            x: Math.random(),
            y: Math.random(),
            z: Math.random(),
            w: Math.random()
        };
        return {
            pos,
            velocity,
            angular,
            axis
        };
    }
    makeRandomVector(vector: { x: number; y: number }) {
        const random_angle = (Math.random() * Math.PI) / 5 - Math.PI / 5 / 2;
        const vec = {
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
    get buffer() {
        return this.geometry.geometry;
    }
    get result() {
        return this.getUpsideValue();
    }
    exploded = false;
    rerolled = 0;
    getUpsideValue() {
        let vector = new Vector3(0, 0, this.sides == 4 ? -1 : 1);
        let closest_face,
            closest_angle = Math.PI * 2;
        const normals = this.buffer.getAttribute("normal").array;
        for (let i = 0, l = this.buffer.groups.length; i < l; ++i) {
            const face = this.buffer.groups[i];
            if (face.materialIndex == 0) continue;
            let startVertex = i * 9;
            const normal = new Vector3(
                normals[startVertex],
                normals[startVertex + 1],
                normals[startVertex + 2]
            );
            const angle = normal
                .clone()
                .applyQuaternion(
                    new Quaternion(
                        this.body.quaternion.x,
                        this.body.quaternion.y,
                        this.body.quaternion.z,
                        this.body.quaternion.w
                    ) as any as ThreeQuaternion
                )
                .angleTo(vector);
            if (angle < closest_angle) {
                closest_angle = angle;
                closest_face = face;
            }
        }
        let matindex = closest_face.materialIndex - 1;
        if (this.sides == 10 && matindex == 0) matindex = 10;
        return this.data.values?.[matindex] ?? matindex;
    }
    shiftUpperValue(to: number) {
        let geometry = this.geometry.geometry.clone();

        let from = this.getUpsideValue();
        for (let i = 0, l = geometry.groups.length; i < l; ++i) {
            let materialIndex = geometry.groups[i].materialIndex;
            if (materialIndex === 0) continue;

            materialIndex += to - from - 1;
            while (materialIndex > this.sides) materialIndex -= this.sides;
            while (materialIndex < 1) materialIndex += this.sides;

            geometry.groups[i].materialIndex = materialIndex + 1;
        }

        this.updateMaterialsForValue(to - from);

        this.geometry.geometry = geometry;
    }
    resetBody() {
        this.body.vlambda = new Vec3();
        //this..body.collisionResponse = true;
        this.body.position = new Vec3();
        this.body.previousPosition = new Vec3();
        this.body.initPosition = new Vec3();
        this.body.velocity = new Vec3();
        this.body.initVelocity = new Vec3();
        this.body.force = new Vec3();
        //this.body.sleepState = 0;
        //this.body.timeLastSleepy = 0;
        //this.body._wakeUpAfterNarrowphase = false;
        this.body.torque = new Vec3();
        this.body.quaternion = new Quaternion();
        this.body.initQuaternion = new Quaternion();
        this.body.angularVelocity = new Vec3();
        this.body.initAngularVelocity = new Vec3();
        this.body.interpolatedPosition = new Vec3();
        this.body.interpolatedQuaternion = new Quaternion();
        this.body.inertia = new Vec3();
        this.body.invInertia = new Vec3();
        this.body.invInertiaWorld = new Mat3();
        //this.body.invMassSolve = 0;
        this.body.invInertiaSolve = new Vec3();
        this.body.invInertiaWorldSolve = new Mat3();
        this.body.wlambda = new Vec3();

        this.body.updateMassProperties();
        return this;
    }
    updateMaterialsForValue(value: number) {}
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
    recreate(vector: { x: number; y: number }, width: number, height: number) {
        this.w = width;
        this.h = height;
        this.vector = this.generateVector(vector);
        this.stopped = false;
        this.create();
    }
    create() {
        this.body.position.set(
            this.vector.pos.x,
            this.vector.pos.y,
            this.vector.pos.z
        );
        this.body.quaternion.setFromAxisAngle(
            new Vec3(
                this.vector.axis.x,
                this.vector.axis.y,
                this.vector.axis.z
            ),
            this.vector.axis.w * Math.PI * 2
        );
        this.body.angularVelocity.set(
            this.vector.angular.x,
            this.vector.angular.y,
            this.vector.angular.z
        );
        this.body.velocity.set(
            this.vector.velocity.x,
            this.vector.velocity.y,
            this.vector.velocity.z
        );
        this.body.linearDamping = 0.1;
        this.body.angularDamping = 0.1;
        return this;
    }
}

export class D20Dice extends DiceShape {
    sides = 20;
    inertia = 6;
    constructor(
        public w: number,
        public h: number,
        public data: { geometry: Mesh; body: Body },
        vector?: { x: number; y: number }
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}

export class D12Dice extends DiceShape {
    sides = 12;
    inertia = 8;
    constructor(
        public w: number,
        public h: number,
        public data: { geometry: Mesh; body: Body },
        vector?: { x: number; y: number }
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}

export class D10Dice extends DiceShape {
    sides = 10;
    inertia = 9;
    constructor(
        public w: number,
        public h: number,
        public data: { geometry: Mesh; body: Body },
        vector?: { x: number; y: number },
        public isPercentile: boolean = false
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}

export class D8Dice extends DiceShape {
    sides = 8;
    inertia = 10;
    constructor(
        public w: number,
        public h: number,
        public data: { geometry: Mesh; body: Body },
        vector?: { x: number; y: number }
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}

export class D6Dice extends DiceShape {
    sides = 6;
    inertia = 13;
    constructor(
        public w: number,
        public h: number,
        public data: {
            geometry: Mesh;
            body: Body;
            values?: number[];
        },
        vector?: { x: number; y: number }
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}
export class D4Dice extends DiceShape {
    sides = 4;
    inertia = 5;
    constructor(
        public w: number,
        public h: number,
        public data: { geometry: Mesh; body: Body },
        vector?: { x: number; y: number }
    ) {
        super(w, h, data);
        if (vector) {
            this.vector = this.generateVector(vector);
        }
        this.create();
    }
}
