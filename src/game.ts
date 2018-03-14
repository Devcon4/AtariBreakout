import { Scheduler, Observable, BehaviorSubject } from "rxjs";

type RecursivePartial<T> = { [P in keyof T]?: RecursivePartial<T[P]> };

export class Game {
    frame = Observable.interval(0, Scheduler.animationFrame);
    onMove = Observable.fromEvent(document, 'mousemove');
    onClick = Observable.fromEvent(document, 'click');
    mousePos = new Vector2({x: 0, y: 0});
    size: { width: number, height: number, halfWidth: number, halfHeight: number };
    gameObjects: GameObject<any>[] = [];
    scoreboardObject: GameObject<{ score: any; }>;
    ballObject: GameObject<any>;
    lifeObject: GameObject<any>;
    
    ball = () => new GameObject({
        name: 'ball',
        position: { x: 0, y: 0 },
        velocity: {x: (Math.random()-.5)*15, y: (Math.random()-.5)*15},
        // velocity: { x: 0, y: 5 },
        boundingBox: new Rect({ width: 50, height: 50 }),
        render: obj => {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.fillStyle = '#636262';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#aaaaaa';
            this.ctx.shadowOffsetY = 8;
            this.ctx.arc(obj.position.x, obj.position.y, obj.props.radius, 0, 360);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
            // obj.drawBoundingBox(this.ctx);
        },
        physics: obj => {
            this.wallBounce(obj);
            this.collisionDetection(obj);
        },
        onCollision: hit => {
            let maxBounceAngle = 5 * Math.PI / 12;
            let bounceAngle = (((hit.collidi.position.x - (hit.collidi.boundingBox.width / 2)) - hit.collider.position.y) / (hit.collidi.boundingBox.width / 2)) * maxBounceAngle;
            // let percentFromCenter = Math.atan2(hit.collidi.position.y - hit.collider.position.y, hit.collidi.position.x - hit.collider.position.x);
            if (!(hit.colliderHits.top || hit.colliderHits.bottom)) {
                // hit.collider.velocity.y = 7 * Math.cos(bounceAngle);
                hit.collider.velocity.y *= -1;
            }else if (!(hit.colliderHits.left || hit.colliderHits.right)) {
                console.log(bounceAngle);
                // hit.collider.velocity.x = 7 * -Math.sin(bounceAngle);
                hit.collider.velocity.x *= -1;
            }
        },
        props: {
            radius: 25,
            speed: 1
        }
    });
    
    block = <U>(override: U) => new GameObject({
        name: 'block',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        boundingBox: new Rect({ width: 150, height: 50 }),
        render: obj => {
            this.ctx.save();
            this.ctx.fillStyle = obj.props.color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#aaaaaa';
            this.ctx.shadowOffsetY = 8;
            this.ctx.fillRect(obj.position.x - 75 + 4, obj.position.y - 25 + 4, 150 - 8, 50 - 8);
            this.ctx.restore();
            // obj.drawBoundingBox(this.ctx);
        },
        onCollision: hit => {
            this.gameObjects.push(this.points({ position: hit.collidi.position}));
            this.gameObjects = this.gameObjects.filter(g => g !== hit.collidi);
            this.scoreboardObject.props.score += hit.collidi.props.pointValue;

            if(!this.gameObjects.some(g => g.name === 'block')) {
                this.gameObjects = this.gameObjects.filter(g => g !== hit.collider);
                this.placeBlocks(5);
                this.ballObject = this.ball();
                this.gameObjects.push(this.ballObject);
                this.gameObjects.push(this.points({props: {fontSize: 42, value: 1000}}));
                this.scoreboardObject.props.score += 1000;
                if (this.lifeObject.props.heartsLeft < this.lifeObject.props.heartCount) {
                    this.lifeObject.props.heartsLeft++;
                }
            }
        },
        props: {
            color: '',
            pointValue: 23
        },
    },
    override
);

    scoreboard = () => new GameObject({
        name: 'scoreboard',
        position: { x: this.size.halfWidth - 50, y: this.size.halfHeight - 50 },
        velocity: {x:0, y:0},
        render: obj => {
            this.ctx.save();
            let fontArgs = this.ctx.font.split(' ');
            this.ctx.font = `18px ${fontArgs.pop()}`;
            this.ctx.fillStyle = '#7f7f7f';
            
            this.ctx.fillText(obj.props.score.toString(), obj.position.x, obj.position.y);
            this.ctx.restore();
        },
        props: {
            score: 0
        }
    });

    paddle = () => new GameObject({
        name: 'paddle',
        position: { x: 0, y: this.size.halfHeight - 25 },
        velocity: { x: 0, y: 0 },
        boundingBox: new Rect({height: 20, width: 200}),
        render: obj => {
            this.ctx.save();
            this.ctx.fillStyle = '#adadad';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#aaaaaa';
            this.ctx.shadowOffsetY = 8;
            this.ctx.fillRect(obj.position.x - 100, obj.position.y - 10 + 4, 200, 20);
            this.ctx.restore();
        },
        physics: obj => {
            obj.position = lerp(obj.position, {x: this.mousePos.x, y: obj.position.y}, 1/30);
        }
    });

    countdown = () => new GameObject({
        name: 'countdown',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        render: obj => {
            this.ctx.save();
            let fontArgs = this.ctx.font.split(' ');
            this.ctx.font = `42px ${fontArgs.pop()}`;
            this.ctx.fillStyle = '#7f7f7f';
            this.ctx.globalAlpha = obj.props.textOpacity <= 0 ? 0 : obj.props.textOpacity;
            this.ctx.textAlign = 'center';
            
            this.ctx.fillText(obj.props.text.toString(), obj.position.x, obj.position.y);
            this.ctx.restore();
            obj.props.textOpacity -= .01;
        },
        init: obj => {
            this.scoreboardObject = this.scoreboard();
            obj.props.textOpacity = 1;
            obj.props.startText.subscribe(t => { 
                obj.props.text = t;
                obj.props.textOpacity = 1;
            }); 
            Observable.of(1).delay(4000).take(1).subscribe(() => {
                this.gameObjects = this.gameObjects.filter(g => g.name !== 'countdown');
                this.gameObjects.push(this.scoreboardObject);
                this.lifeObject = this.life();
                this.gameObjects.push(this.lifeObject);
                this.gameObjects.push(this.paddle());
                this.ballObject = this.ball();
                this.gameObjects.push(this.ballObject);
                this.placeBlocks(5);
            });
        },
        props: {
            text: '',
            textOpacity: 1,
            startText: Observable.zip(Observable.timer(0, 1000), Observable.of('3', '2', '1', 'Start!')).map(a => a[1])
        }
    });

    outOfBounds = () => new GameObject({
        name: 'outOfBounds',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        render: obj => {
            this.ctx.save();
            this.ctx.globalAlpha = obj.props.textOpacity <= 0 ? 0 : obj.props.textOpacity;

            this.ctx.fillStyle = '#ef2e1c';
            this.ctx.fillRect(-this.size.halfWidth, -this.size.halfHeight, this.size.width, this.size.height);

            let fontArgs = this.ctx.font.split(' ');
            this.ctx.font = `42px ${fontArgs.pop()}`;
            this.ctx.fillStyle = '#7f7f7f';
            this.ctx.textAlign = 'center';
            
            this.ctx.fillText('-100', obj.position.x, obj.position.y);
            this.ctx.restore();
            obj.props.textOpacity -= .01;
        },
        init: obj => {
            if(this.lifeObject.props.heartsLeft > 0) {
                this.lifeObject.props.heartsLeft--;
                obj.props.restart.take(1).subscribe(() => {
                    this.ballObject = this.ball();
                    this.gameObjects.push(this.ballObject);
                    this.gameObjects = this.gameObjects.filter(g => g.name !== 'outOfBounds');
                });
            } else {
                this.gameObjects = this.gameObjects.filter(g => g !== obj);
                this.gameObjects.push(this.gameOver());
            }
        },
        props: {
            textOpacity: 1,
            restart: Observable.of(1).delay(1000)
        }
    });

    points = <U>(override: U) => new GameObject({
        name: 'points',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 1 },
        render: obj => {
            this.ctx.save();
            this.ctx.globalAlpha = obj.props.textOpacity <= 0 ? 0 : obj.props.textOpacity;

            let fontArgs = this.ctx.font.split(' ');
            this.ctx.font = `${obj.props.fontSize}px ${fontArgs.pop()}`;
            this.ctx.fillStyle = '#7f7f7f';
            this.ctx.textAlign = 'center';
            
            this.ctx.fillText(`+${obj.props.value}`, obj.position.x, obj.position.y);
            this.ctx.restore();
            obj.props.textOpacity -= .01;
        },
        init: obj => {
            Observable.of(1).delay(1500).subscribe(() => {
                this.gameObjects = this.gameObjects.filter(g => g !== obj);
            });
        },
        props: {
            value: 25,
            fontSize: 24,
            textOpacity: 1
        }
    },
    override);

    life = () => new GameObject({
        name: 'life',
        position: { x: -this.size.halfWidth + 50, y: this.size.halfHeight - 50 },
        velocity: { x: 0, y: 0 },
        render: obj => {
            for(let i = 0; i < obj.props.heartCount; i++) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.fillStyle = i < obj.props.heartsLeft ? obj.props.colors[i % obj.props.colors.length] : '#adadad';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#aaaaaa';
                this.ctx.shadowOffsetY = 8;
                this.ctx.arc(obj.position.x + (35 * i), obj.position.y, 15, 0, 360);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();
            }
        },
        props: {
            colors: [
                '#ef2e1c',
                '#f16e1d',
                '#f0d11d',
                '#45bc32',
                '#1f5dd1',
            ],
            heartCount: 5,
            heartsLeft: 3
        }
    });

    gameOver = () => new GameObject({
        name: 'gameOver',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        boundingBox: new Rect({width: 160, height: 60}),
        render: obj => {
            this.ctx.save();
            this.ctx.globalAlpha = obj.props.textOpacity <= 0 ? 0 : obj.props.textOpacity;

            this.ctx.fillStyle = '#474747';
            this.ctx.fillRect(-this.size.halfWidth, -this.size.halfHeight, this.size.width, this.size.height);

            let fontArgs = this.ctx.font.split(' ');
            this.ctx.font = `42px ${fontArgs.pop()}`;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            
            this.ctx.fillText('Game Over', obj.position.x, obj.position.y-50);
            this.ctx.restore();
            obj.props.textOpacity = Math.min(obj.props.textOpacity += 0.01, .95);

            let isHover = (
                this.mousePos.x < obj.position.x + obj.boundingBox.width * 0.5 &&
                this.mousePos.x > obj.position.x - obj.boundingBox.width * 0.5 &&
                this.mousePos.y < obj.position.y + obj.boundingBox.height * 0.5 &&
                this.mousePos.y > obj.position.y - obj.boundingBox.height * 0.5
            );

            if (isHover) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'auto';
            }

            this.ctx.save();
            this.ctx.fillStyle = isHover ? '#ffffff' : '#474747';
            roundRect(this.ctx,-80, -30, 160, 60, 5, true, false);
            this.ctx.fillStyle = isHover ? '#474747' : '#ffffff';
            this.ctx.globalAlpha = obj.props.textOpacity <= 0 ? 0 : obj.props.textOpacity;            
            this.ctx.fillRect(-75, -25, 150, 50);
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = isHover ? '#ffffff' : '#474747';
            this.ctx.fillRect(-70, -20, 140, 40);
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = isHover ? '#474747' : '#ffffff';
            let fontArgs2 = this.ctx.font.split(' ');
            this.ctx.font = `24px ${fontArgs2.pop()}`;
            this.ctx.fillText('Restart', obj.position.x, 7.5);

            this.ctx.fillStyle = '#ffffff';            
            this.ctx.fillText(`Final score: ${this.scoreboardObject.props.score.toString()}`, 0, 60);
            this.ctx.restore();

        },
        onClick: obj => {
            let isOver = (
                this.mousePos.x < obj.position.x + obj.boundingBox.width * 0.5 &&
                this.mousePos.x > obj.position.x - obj.boundingBox.width * 0.5 &&
                this.mousePos.y < obj.position.y + obj.boundingBox.height * 0.5 &&
                this.mousePos.y > obj.position.y - obj.boundingBox.height * 0.5
            );

            if (isOver) {
                this.gameObjects = [];
                this.gameObjects.push(this.countdown());
            }

        },
        props: {
            textOpacity: 0
        }
    });

    constructor(private canvas: HTMLCanvasElement, private ctx: CanvasRenderingContext2D) {
        this.resize();
        this.frame.subscribe(this.physics.bind(this));
        this.frame.subscribe(this.draw.bind(this));
        this.onMove.map(e => this.getMousePos.bind(this)(e)).subscribe(p => this.mousePos = p);
        this.onClick.subscribe(e => this.gameObjects.filter(g => !!g.onClick).forEach(g => g.onClick(g)));
       
        this.gameObjects.push(this.countdown());
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
        return {
            x: event.clientX - this.size.halfWidth,
            y: event.clientY - this.size.halfHeight
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
        let physicsObjects = this.gameObjects.filter(g => !!g.boundingBox);
        for (let i = 0; i < physicsObjects.length; i++) {
            let colObj = physicsObjects[i];
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
                    
                    colObj.onCollision.bind(this)(hit);
                    obj.onCollision.bind(this)(hit);
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

            if (p.y <= -this.size.halfHeight) {
                obj.velocity.y *= -1;
                hit = true;
            }

            if (p.y >= this.size.halfHeight) {
                hit = true;
                this.scoreboardObject.props.score -= 150;
                this.gameObjects = this.gameObjects.filter(g => g.name !== 'ball');
                this.gameObjects.push(this.outOfBounds());
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
                this.gameObjects.push(this.block({position: { x: x, y: y + -this.size.halfHeight + (rows * cellSize.y)/6 }, props: { color: color, pointValue: 25 }}));
            }
        }
    }
}

export function lerp (start: Vector2, end: Vector2, interval: number) {
    if (interval > 1) { throw new Error('Interval must be less than 1!'); }
    let nLerp = (s: number, e: number, i: number) => {
        return (1-i)*s+i*e;
    }
    return new Vector2({ x: nLerp(start.x, end.x, interval), y: nLerp(start.y, end.y, interval)});
}

export function dot (start: Vector2, end: Vector2) {
    return start.x * end.x + start.y * end.y;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: boolean, stroke: boolean) {

    if (typeof stroke == 'undefined') {
      stroke = true;
    }

    if (typeof radius === 'undefined') {
      radius = 5;
    }
    
    let radiusObj = {tl: radius, tr: radius, br: radius, bl: radius};

    ctx.beginPath();
    ctx.moveTo(x + radiusObj.tl, y);
    ctx.lineTo(x + width - radiusObj.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radiusObj.tr);
    ctx.lineTo(x + width, y + height - radiusObj.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radiusObj.br, y + height);
    ctx.lineTo(x + radiusObj.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radiusObj.bl);
    ctx.lineTo(x, y + radiusObj.tl);
    ctx.quadraticCurveTo(x, y, x + radiusObj.tl, y);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
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
    public collidi: GameObject<U>;
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
    public name: string;

    public render: (obj: GameObject<T>) => void;
    public physics: (obj: GameObject<T>) => void = () => { };
    public onCollision?: <U>(hit: CollisionHit<U, T>) => void = () => { };
    public onClick?: (obj: GameObject<T>) => void;
    public init: (obj: GameObject<T>) => void;

    constructor(...args: Partial<GameObject<T>>[]) {
        Object.assign(this, ...args);
        if (!!this.init) {
            this.init(this);
        }
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