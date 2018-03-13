import { Scheduler, Observable } from "rxjs";

export class Game {
    frame = Observable.interval(0, Scheduler.animationFrame);
    size: { width: number, height: number, halfWidth: number, halfHeight: number };
    gameObjects: GameObject<any>[] = [];

    ball = () => new GameObject({
        position: { x: 0, y: 0 },
        velocity: {x: (Math.random()-.5)*15, y: (Math.random()-.5)*15},
        // velocity: { x: 0, y: 5 },
        boundingBox: new Rect({ width: 50, height: 50 }),
        render: (obj) => {
            this.ctx.beginPath();
            this.ctx.fillStyle = '#636262';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#aaaaaa';
            this.ctx.shadowOffsetY = 8;
            this.ctx.arc(obj.position.x, obj.position.y, obj.props.radius, 0, 360);
            this.ctx.closePath();
            this.ctx.fill();

            // obj.drawBoundingBox(this.ctx);
        },
        physics: (obj) => {
            this.wallBounce(obj);
            this.collisionDetection(obj);
        },
        onCollision: (hit) => {
            console.log('hit ball!');
            if (!(hit.colliderHits.left || hit.colliderHits.right)) {
                hit.collider.velocity.x *= -1;
            }
            if (!(hit.colliderHits.top || hit.colliderHits.bottom)) {
                hit.collider.velocity.y *= -1;
            }
        },
        props: {
            radius: 25
        }
    });
    
    block = <T extends {color: string}>(override: Partial<GameObject<T>>) => new GameObject({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        boundingBox: new Rect({ width: 150, height: 50 }),
        render: (obj) => {
            this.ctx.fillStyle = obj.props.color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#aaaaaa';
            this.ctx.shadowOffsetY = 8;
            this.ctx.fillRect(obj.position.x - 75 + 4, obj.position.y - 25 + 4, 150 - 8, 50 - 8);

            // obj.drawBoundingBox(this.ctx);
        },
        physics: this.wallBounce.bind(this),
        onCollision: (hit) => {
            console.log('Hit block!');
            this.gameObjects = this.gameObjects.filter(g => g !== hit.collidi);
        },
        props: {
            color: ''
        },
        ...override,        
    });

    constructor(private canvas: HTMLCanvasElement, private ctx: CanvasRenderingContext2D) {
        this.resize();
        this.frame.subscribe(this.physics.bind(this));
        this.frame.subscribe(this.draw.bind(this));

        this.gameObjects.push(this.ball());
        this.placeBlocks(5);

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
        for (let i = 0; i < this.gameObjects.length; i++) {
            let colObj = this.gameObjects[i];
            if (colObj != obj) {
                let a = {
                    left: obj.position.x - obj.boundingBox.width * 0.5,
                    right: obj.position.x + obj.boundingBox.width * 0.5,
                    bottom: obj.position.y - obj.boundingBox.height * 0.5,
                    top: obj.position.y + obj.boundingBox.height * 0.5,
                };
                let b = {
                    left: colObj.position.x - colObj.boundingBox.width * 0.5,
                    right: colObj.position.x + colObj.boundingBox.width * 0.5,
                    bottom: colObj.position.y - colObj.boundingBox.height * 0.5,
                    top: colObj.position.y + colObj.boundingBox.height * 0.5,
                };

                let hits = {
                    left: (b.left > a.right),
                    right: (b.right < a.left),
                    top: (b.top < a.bottom),
                    bottom: (b.bottom > a.top),
                };

                if(!(hits.left || hits.right || hits.top || hits.bottom)) {
                    let colHits = {
                        left: a.left > b.right,
                        right: a.right < b.left,
                        top: a.top < b.bottom,
                        bottom: a.bottom > b.top,
                    };

                    let hit = new CollisionHit({
                        collider: obj,
                        collidi: colObj,
                        colliderHits: hits,
                        collidiHits: colHits
                    });
                    
                    colObj.onCollision(hit);
                    obj.onCollision(hit);
                }
            }
        }
    }

// Specific Breakout methods.

    wallBounce<T>(obj: GameObject<T>) {
        let mesh = obj.boundingBox.mesh;
        for (let i = 0; i < mesh.length; i++) {
            let hit = false;
            let point = mesh[i];
            let p = { x: point.x + obj.position.x, y: point.x + obj.position.y };
            if (p.x >= this.size.halfWidth || p.x <= -this.size.halfWidth) {
                obj.velocity.x *= -1;
                hit = true;
            }

            if (p.y >= this.size.halfHeight || p.y <= -this.size.halfHeight) {
                obj.velocity.y *= -1;
                hit = true;
            }

            if (hit) { break; }
        }
    }
    
    placeBlocks(rows: number) {
        let colors = [
            '#ef2e1c',
            '#f16e1d',
            '#f0d11d',
            '#45bc32',
            '#1f5dd1',
        ];
        const cellSize = { x: 150, y: 50 };
        for (let y = 0; y < rows * cellSize.y; y += cellSize.y) {
            let color = colors.shift();
            for (let x = -this.size.halfWidth + (cellSize.x / 2) + this.size.width % cellSize.x/2; x < this.size.halfWidth; x += cellSize.x) {
                this.gameObjects.push(this.block({position: { x: x, y: y + -this.size.halfHeight + (rows * cellSize.y)/6 }, props: { color: color}}));
            }
        }
    }
}

export class BoxHits {
    public left = false;
    public right = false;
    public bottom = false;
    public top = false;

    constructor(args: Partial<BoxHits> = {}) {
        Object.assign(this, args);
    }
}

export class CollisionHit<T, U> {
    public collider: GameObject<T>;
    public collidi: GameObject<T>;
    public colliderHits: BoxHits;
    public collidiHits: BoxHits;

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
            { x: halfWidth, y: halfHeight },
            { x: halfWidth, y: -halfHeight },
            { x: -halfWidth, y: -halfHeight },
            { x: -halfWidth, y: halfHeight },
            // Add extra for drawing box.
            { x: halfWidth, y: halfHeight },
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
    public physics: (obj: GameObject<T>) => void = () => { };
    public onCollision?: <U, V>(hit: CollisionHit<U, V>) => void = () => { };

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