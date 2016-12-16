/**
 * Created by PYRO on 11.12.16.
 */

var socket = socketCluster.connect();

window.onload = function () {

    //  Note that this html file is set to pull down Phaser from our public/ directory.
    //  Although it will work fine with this tutorial, it's almost certainly not the most current version.
    //  Be sure to replace it with an updated version before you start experimenting with adding your own code.

    var gameWidth = 800, gameHeight = 600;

    var game = new Phaser.Game(gameWidth, gameHeight, Phaser.CANVAS, 'mygame', {
        preload: preload,
        create: create,
        update: update
    });

    var player;
    var moveSpeed = 150;

    function getRandomColor(min) {
        var max = 255;
        var randomness = max - min;
        return min + Math.round(Math.random() * randomness);
    }

    function getRandomPosition(spriteWidth, spriteHeight) {
        var halfSpriteWidth = spriteWidth / 2;
        var halfSpriteHeight = spriteHeight / 2;
        var widthRandomness = game.world.width - spriteWidth;
        var heightRandomness = game.world.height - spriteHeight;
        return {
            x: Math.round(halfSpriteWidth + widthRandomness * Math.random()),
            y: Math.round(halfSpriteHeight + heightRandomness * Math.random())
        };
    }

    function preload() {
        keys = {
            up: game.input.keyboard.addKey(Phaser.Keyboard.UP),
            down: game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
            right: game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
            left: game.input.keyboard.addKey(Phaser.Keyboard.LEFT)
        };
        game.load.tilemap('level1', '../assets/level1.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.image('tiles-1', '../assets/tiles-1.png');
        game.load.spritesheet('dude', '../assets/player5.png', 75, 73);
        game.load.spritesheet('dude2', '../assets/player6.png', 75, 73);
        game.load.spritesheet('weapon', '../assets/gunsall13.png', 65, 32);
        game.load.image('background', '../assets/bg123.png');
        game.load.image('bullet', '../assets/bullet1.png');
        game.load.spritesheet('boom', '../assets/explode.png', 128, 128);
    }


    function moveUser(playerName, x, y) {

        var user = users[playerName];


        if(x > user.x){
            console.log('right');
            user.sprite.animations.play('right')
            user.facing = {
                right: true,
                left: false
            }
        }
        else if(x < user.x){
            console.log('left')
            user.sprite.animations.play('left')
            user.facing = {
                right: false,
                left: true
            }
        }
        else{
            console.log('stand')
            user.sprite.animations.stop();
            if(user.facing.left){
                user.sprite.frame = 17;
            }
            else if(user.facing.right){
                user.sprite.frame = 0;
            }
        }


        user.x = user.sprite.position.x = x;
        user.y = user.sprite.position.y = y;
        user.label.alignTo(user.sprite, Phaser.BOTTOM_CENTER, 0, 10);
    }

    function removeUserSprite(userData) {
        var user = users[userData.name];
        if (user) {
            user.sprite.destroy();
            user.label.destroy();
        }
    }

    function updateUserSprite(userData) {
        var user = users[userData.name];
        if (user) {
            moveUser(userData.name, userData.x, userData.y);
        } else {
            users[userData.name] = user = {};
            user.name = userData.name;

            var textStyle = {
                font: '16px Arial',
                fill: '#ffffff',
                align: 'center'
            };

            user.label = game.add.text(0, 0, user.name, textStyle);
            user.label.anchor.set(0.5);

            user.color = userData.color;
            user.sprite = users.create(0, 0, 'dude');

            user.facing = {
                right: true,
                left: false
            };
            user.health = 100;

            user.sprite.animations.add('left', [8, 7, 6, 5, 4, 3, 2, 1], 10, true);
            user.sprite.animations.add('right', [9, 10, 11, 12, 13, 14, 15, 16], 10, true);
            user.sprite.animations.add('jumpright', [18, 19, 20, 21, 22, 23, 24, 25], 7, false);
            user.sprite.animations.add('jumpleft', [33, 32, 31, 30, 29, 28, 27, 26], 7, false);

            moveUser(userData.name, userData.x, userData.y);
        }
        return user;
    }

     function goFullScreen() {
         game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
         if (game.scale.isFullScreen) {    game.scale.stopFullScreen();  }
         else {
             game.scale.startFullScreen();
         }
     }

    var resizeGame = function() {
        game.scale.pageAlignVertically = true;
        game.scale.pageAlignHorizontally = true;
        game.scale.setShowAll();
        game.scale.refresh();
    };

    function create() {

        game.physics.startSystem(Phaser.Physics.ARCADE);

        game.input.onDown.add(goFullScreen, this);

        resizeGame();

        game.stage.backgroundColor = '#000000';
        game.stage.disableVisibilityChange = true;

        bg = game.add.tileSprite(0, 0, 800, 600, 'background');
        bg.fixedToCamera = true;

        map = game.add.tilemap('level1');
        map.addTilesetImage('tiles-1');
        map.setCollisionByExclusion([13, 14, 15, 16, 46, 47, 48, 49, 50, 51]);

        layer = map.createLayer('Tile Layer 1');
        layer.resizeWorld();
        game.physics.arcade.gravity.y = 600;

        users = game.add.group();
        users.enableBody = true;
        users.physicsBodyType = Phaser.Physics.ARCADE;
        users.setAll('outOfBoundsKill', true);
        users.setAll('checkWorldBounds', true);
        users.setAll('collideWorldBounds', true);
        users.setAll('anchor.x', 0.5);
        users.setAll('anchor.y', 0.5);
        users.callAll('body.setSize', 'body', 50, 70, 0, 0);

        // Generate a random name for the user.
        var playerName = 'user-' + Math.round(Math.random() * 10000);
        // var startingPos = getRandomPosition(20, 20);
        var startingPos = {x:50,y:50}
        var playerColor = Phaser.Color.getColor(getRandomColor(100), getRandomColor(100), getRandomColor(100));
        player = updateUserSprite({
            name: playerName,
            color: playerColor,
            x: startingPos.x,
            y: startingPos.y,
            facing: {
                right: true,
                left: false
            }
        });

        game.camera.follow(player.sprite);

        var getUserPresenceChannelName = function (username) {
            return 'user/' + username + '/presence-notification';
        };

        // Setup a channel to allow other existing users to tell us about their presence (in case they joined before us).
        socket.subscribe(getUserPresenceChannelName(playerName)).watch(function (userData) {
            updateUserSprite(userData);
        });

        socket.subscribe('player-join').watch(function (userData) {
            if (player && userData.name != player.name) {
                updateUserSprite(userData);
                // Tell the newly joined user about our presence by publishing to their presence-notification channel.
                socket.publish(getUserPresenceChannelName(userData.name), {
                    name: player.name,
                    x: player.x,
                    y: player.y,
                    facing: player.facing
                });
            }
        });

        socket.subscribe('player-leave').watch(function (userData) {
            if (player && userData.name != player.name) {
                removeUserSprite(userData);
            }
        });

        socket.subscribe('player-positions').watch(function (userDataList) {
            if (player) {
                userDataList.forEach(function (userData) {
                    if (userData.name != player.name) {
                        updateUserSprite(userData);
                    }
                });
            }
        });

        socket.emit('join', {
            name: player.name,
            x: player.x,
            y: player.y
        });

        function sendPlayerMove() {
            var playerPositionData = {
                x: player.sprite.x,
                y: player.sprite.y,
                facing: player.facing
            };
            socket.emit('move', playerPositionData);
        }

        var playerOldPos = {
            x: Infinity,
            y: Infinity
        };
        setInterval(function () {
            if (Math.abs(playerOldPos.x - player.x) > 0 || Math.abs(playerOldPos.y - player.y) > 0) {
                sendPlayerMove();
            }
            playerOldPos.x = player.x;
            playerOldPos.y = player.y;
        }, 10);
    }

    function update() {
        var hitPlatform = game.physics.arcade.collide(users, layer);
        player.sprite.body.velocity.x = 0;
        
        if (keys.up.isDown && player.sprite.body.onFloor() && hitPlatform ) {
            player.sprite.body.velocity.y = -400;
        }

        if (keys.right.isDown) {
            player.sprite.body.velocity.x = moveSpeed;
            player.facing = {
                left: false,
                right: true
            };
        }

        if(keys.left.isDown) {
            player.sprite.body.velocity.x = -moveSpeed;
            player.facing = {
                left: true,
                right: false
            };
        }
        moveUser(player.name, player.sprite.position.x, player.sprite.position.y);
    }

};