import { Game } from './game';

(() => {
    let canvas = document.getElementById('canvas') as HTMLCanvasElement;
    let game = new Game(canvas, canvas.getContext("2d"));
    window.onresize = () => {
        game.resize();
    };
})();