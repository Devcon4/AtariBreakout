import { Scheduler, Observable } from "rxjs";

export class Game {
    frame = Observable.interval(0, Scheduler.animationFrame);
    size: { width: number, height: number, halfWidth: number, halfHeight: number };
    gameObjects: GameObject<any>[] = [];

    constructor(private canvas: HTMLCanvasElement, private ctx: CanvasRenderingContext2D) {
        this.resize();
        this.frame.subscribe(this.physics.bind(this));
        this.frame.subscribe(this.draw.bind(this));

        let block = new GameObject({
            position: {x: 0, y: -this.size.halfHeight + 100},
            velocity: {x: 0, y: 0},
            boundingBox: new Rect({width: 1500, height: 50}),
            render: (obj) => {
                this.ctx.fillStyle = '#f44242';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#aaaaaa';
                this.ctx.shadowOffsetY = 8;
                this.ctx.fillRect(obj.position.x - 750, obj.position.y - 25, 1500, 50);

                obj.drawBoundingBox(this.ctx);
            },
            physics: this.wallBounce.bind(this)
        });

        let ball = new GameObject({
            position: {x: 0, y: 0},
            velocity: {x: (Math.random()-.5)*5, y: (Math.random()-.5)*5},
            boundingBox: new Rect({ width: 50, height: 50 }),
            render: (obj) => {
                this.ctx.beginPath();
                this.ctx.fillStyle = '#f44242';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#aaaaaa';
                this.ctx.shadowOffsetY = 8;
                this.ctx.arc(obj.position.x, obj.position.y, obj.props.radius, 0, 360);
                this.ctx.closePath();
                this.ctx.fill();

                obj.drawBoundingBox(this.ctx);
            },
            physics: (obj) => {
                this.wallBounce(obj);
                this.collisionDetection(obj);
            },
            onCollision: (hit) => {
                console.log('hit!');
                if(hit.colliderHits.some(h => h.x > hit.collider.position.x)) {
                    hit.collider.velocity.x *= -1;
                }
                if(hit.colliderHits.some(h => h.y > hit.collider.position.y)) {
                    hit.collider.velocity.y *= -1;
                }
            },
            props: {
                radius: 25
            }
        });

        this.gameObjects.push(block);
        this.gameObjects.push(ball);
    
    }

    resize() {
        this.canvas.height = this.canvas.clientHeight;
        this.canvas.width = this.canvas.clientWidth;
        this.size = {
            width: this.canvas.width,
            height: this.canvas.height,
            halfWidth: this.canvas.width * 0.5,
            halfHeight: this.canvas.height * 0.5
        };
        this.ctx.translate(this.size.halfWidth, this.size.halfHeight);
    }

    getMousePos(event: MouseEvent) {
        var rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left - this.size.halfWidth,
            y: event.clientY - rect.top - this.size.halfHeight
        };
    }

    draw() {
        this.ctx.clearRect(-this.size.halfWidth, -this.size.halfHeight, this.size.width, this.size.height);
        this.gameObjects.forEach(obj => obj.render(obj));
    }    

    physics() {
        this.gameObjects.forEach(obj => {
            obj.position.x += obj.velocity.x;
            obj.position.y += obj.velocity.y;
            obj.physics(obj);
        });
    }

    collisionDetection<T>(obj: GameObject<T>) {
        for(let i = 0; i < this.gameObjects.length; i++) {
            let colObj = this.gameObjects[i];
            let mesh = obj.boundingBox.mesh;
            let colMesh = obj.boundingBox.mesh;
            for(let j = 0; j < colMesh.length - 1 ; j++) {
                let p1 = colMesh[j];
                let p2 = colMesh[j + 1];
                let hits = [] as Vector2[];
                let colHits = [] as Vector2[];
                for(let k = 0; k < mesh.length; k++) {
                    let p3 = mesh[k];
                    let res = -(p2.y - p1.y) * p3.x + (p2.x - p1.x) + p3.y + -(-(p2.y - p1.y) * p1.x + (p2.x - p1.x) * p1.y);
                    if (res = 0) {
                        hits.push(p3);
                        colHits.push(p1, p2);
                    }
                }
                if (hits.length > 0) {
                    let hit = new CollisionHit({
                        collider: obj,
                        collidi: colObj,
                        colliderHits: hits,
                        collidiHits: colHits
                    });
                    colObj.onCollision(hit);
                    obj.onCollision(hit);
                    break;
                }
            }
        }
    }

    wallBounce<T>(obj: GameObject<T>) {
        let mesh = obj.boundingBox.mesh;
        for(let i = 0; i < mesh.length; i++) {
            let hit = false;
            let point = mesh[i];
            let p = { x: point.x + obj.position.x, y: point.x + obj.position.y };
            if(p.x >= this.size.halfWidth || p.x <= -this.size.halfWidth) {
                obj.velocity.x *= -1;
                hit = true;
            }
            
            if(p.y >= this.size.halfHeight || p.y <= -this.size.halfHeight) {
                obj.velocity.y *= -1;
                hit = true;
            }

            if (hit) { break; }
        }
    }
}

export class CollisionHit<T, U> {
    public collider: GameObject<T>;
    public collidi: GameObject<T>;
    public colliderHits: Vector2[] = [];
    public collidiHits: Vector2[] = [];

    constructor(args: Partial<CollisionHit<T, U>>) {
        Object.assign(this, args);
    }
}

export class Vector2 {
    public x: number;
    public y: number;

    constructor(args: Partial<Vector2>) {
        Object.assign(this, args);
    }
}

export class Rect {
    public width: number;
    public height: number;

    public get mesh(): Vector2[] {
        let halfWidth = this.width * 0.5;
        let halfHeight = this.height * 0.5;
        return [
            {x: halfWidth, y: halfHeight },
            {x: halfWidth, y: -halfHeight },
            {x: -halfWidth, y: -halfHeight },
            {x: -halfWidth, y: halfHeight },
            // Add extra for drawing box.
            {x: halfWidth, y: halfHeight },
        ];
    }

    constructor(args: Partial<Rect>) {
        Object.assign(this, args);
    }
}

export class GameObject<T> {
    public position: Vector2;
    public velocity: Vector2;
    public props: T = {} as T;
    public boundingBox: Rect;

    public render: (obj: GameObject<T>) => void;
    public physics: (obj: GameObject<T>) => void = () => {};
    public onCollision?: <U, V>(hit: CollisionHit<U, V>) => void = () => {};

    constructor(args: Partial<GameObject<T>>) {
        Object.assign(this, args);
        this.render.bind(this);
    }

    drawBoundingBox(ctx: CanvasRenderingContext2D) {
        let mesh = this.boundingBox.mesh;
        ctx.beginPath();
        ctx.moveTo(mesh[0].x + this.position.x, mesh[0].y + this.position.y);
        ctx.strokeStyle = '#67fc7b';
        mesh.forEach(m => {
            ctx.lineTo(m.x + this.position.x, m.y + this.position.y);
        });
        ctx.closePath();
        ctx.stroke();
    }
}