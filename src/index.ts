import { Game } from './game';

(() => {
    // bootstraping.
    let canvas = document.getElementById('canvas') as HTMLCanvasElement;
    let game = new Game(canvas, canvas.getContext("2d"));
    window.onresize = () => {
        game.resize();
    };

    //gh-pages hack.
    let redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect != location.href) {
      history.replaceState(null, null, redirect);
    }
})();