
var game = new Phaser.Game(1024, 768, Phaser.CANVAS, 'game');

game.state.add("Play", playState);
game.state.start("Play");
