import { Scheduler, Observable } from "rxjs";

export class Game {
    frame = Observable.interval(0, Scheduler.animationFrame);
    size: { width: number, height: number, halfWidth: number, halfHeight: number };
    gameObjects: GameObject<any>[] = [];

    constructor(private canvas: HTMLCanvasElement, private ctx: CanvasRenderingContext2D) {
        this.resize();
        this.frame.subscribe(this.physics.bind(this));
        this.frame.subscribe(this.draw.bind(this));

        let ball = new GameObject({
            position: {x: 0, y: 0},
            velocity: {x: (Math.random()-.5)*1, y: (Math.random()-.5)*1},
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
                let mesh = obj.boundingBox.mesh;
                for(let i = 0; i < mesh.length; i++) {
                    let point = mesh[i];
                    let p = { x: point.x + obj.position.x, y: point.x + obj.position.y };

                }

                obj.boundingBox.mesh.forEach(point => {

                });
            },
            props: {
                radius: 25
            }
        });

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

    collisionDetection(obj: GameObject<any>) {

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