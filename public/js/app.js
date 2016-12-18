/**
 * Created by PYRO on 11.12.16.
 */

var socket = socketCluster.connect();

window.onload = function () {

    //  Note that this html file is set to pull down Phaser from our public/ directory.
    //  Although it will work fine with this tutorial, it's almost certainly not the most current version.
    //  Be sure to replace it with an updated version before you start experimenting with adding your own code.

    var gameWidth = 800, gameHeight = 600;

    var game = new Phaser.Game(gameWidth, gameHeight, Phaser.CANVAS, 'valhall.io', {
        preload: preload,
        create: create,
        update: update,
        render: render
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
        game.load.tilemap('lvl2', '../assets/lvl2.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.image('tiles-1', '../assets/tiles-1.png');
        game.load.spritesheet('dude', '../assets/player5.png', 75, 73);
        game.load.spritesheet('jackBeardBody', '../assets/jack-beard/body.png', 75, 75);
        game.load.spritesheet('jackBeardHead', '../assets/jack-beard/head.png', 75, 75);
        game.load.spritesheet('jackBeardFrontArm', '../assets/jack-beard/front-arm.png', 75, 75);
        game.load.spritesheet('jackBeardBackArm', '../assets/jack-beard/back-arm.png', 75, 75);
        game.load.spritesheet('dude2', '../assets/player6.png', 75, 73);
        game.load.spritesheet('weapon', '../assets/gunsall13.png', 65, 32);
        game.load.image('background', '../assets/bg123.png');
        game.load.image('bullet', '../assets/bullet1.png');
        game.load.spritesheet('boom', '../assets/explode.png', 128, 128);
    }


    function moveUser(playerName, x, y) {

        var user = users[playerName];

        if(player && (playerName !== player.name)){
            user.sprite.body.moves = false;
        }

        if(x > user.x){
            // user.sprite.animations.play('right')
            user.facing = {
                right: true,
                left: false
            }
        }
        else if(x < user.x){
            // user.sprite.animations.play('left')
            user.facing = {
                right: false,
                left: true
            }
        }
        else{
            user.sprite.animations.stop();
            if(user.facing.left){
                user.sprite.frame = 17;
            }
            else if(user.facing.right){
                user.sprite.frame = 0;
            }
        }

        user.x = user.sprite.x = x;
        user.y = user.sprite.y = y;
        user.label.alignTo(user.sprite, Phaser.BOTTOM_CENTER, 0, 50);
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

            user.spriteType = userData.spriteType;

            var textStyle = {
                font: '16px Arial',
                fill: '#ffffff',
                align: 'center'
            };

            user.color = userData.color;
            user.sprite = users.create(0, 0);

            user.sprite.scale.setTo(1.2, 1.2);

            user.sprite.body.bounce.y = 0.1;
            user.sprite.checkWorldBounds = true;
            user.sprite.body.collideWorldBounds = true;
            user.sprite.body.maxVelocity.y = 500;
            user.sprite.body.setSize(35, 75, 0, -20);
            user.sprite.anchor.setTo(0.5, 0.5);

            backArm = game.add.sprite(0, 0, userData.spriteType + 'BackArm');
            body = game.add.sprite(0, 0, userData.spriteType + 'Body');
            head = game.add.sprite(0, 0, userData.spriteType + 'Head');
            frontArm = game.add.sprite(0, 0, userData.spriteType + 'FrontArm');

            backArm.anchor.setTo(0.5, 0.5);
            frontArm.anchor.setTo(0.5, 0.5);
            body.anchor.setTo(0.5, 0.5);
            head.anchor.setTo(0.5, 0.5);

            user.sprite.addChild(backArm);
            user.sprite.addChild(body);
            user.sprite.addChild(head);
            user.sprite.addChild(frontArm);

            user.facing = {
                right: true,
                left: false
            };
            user.health = 100;

            user.label = game.add.text(0, 0, user.name, textStyle);
            user.label.anchor.set(0.5);

            // user.sprite.animations.add('left', [8, 7, 6, 5, 4, 3, 2, 1], 10, true);
            // user.sprite.animations.add('right', [9, 10, 11, 12, 13, 14, 15, 16], 10, true);
            // user.sprite.animations.add('jumpright', [18, 19, 20, 21, 22, 23, 24, 25], 7, false);
            // user.sprite.animations.add('jumpleft', [33, 32, 31, 30, 29, 28, 27, 26], 7, false);

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

        map = game.add.tilemap('lvl2');
        map.addTilesetImage('tiles-1');
        map.setCollisionByExclusion([13, 14, 15, 16, 46, 47, 48, 49, 50, 51]);

        layer = map.createLayer('lvl2');
        layer.resizeWorld();
        game.physics.arcade.gravity.y = 600;

        users = game.add.group();
        users.enableBody = true;
        users.physicsBodyType = Phaser.Physics.ARCADE;

        // Generate a random name for the user.
        var playerName = 'user-' + Math.round(Math.random() * 10000);
        // var startingPos = getRandomPosition(20, 20);
        var startingPos = {x:50,y:50};
        var playerColor = Phaser.Color.getColor(getRandomColor(100), getRandomColor(100), getRandomColor(100));
        
        player = updateUserSprite({
            name: playerName,
            color: playerColor,
            x: startingPos.x,
            y: startingPos.y,
            facing: {
                right: true,
                left: false
            },
            spriteType: 'jackBeard'
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
                    facing: player.facing,
                    spriteType: player.spriteType
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
            y: player.y,
            spriteType: player.spriteType
        });

        function sendPlayerMove() {
            var playerPositionData = {
                x: player.sprite.x,
                y: player.sprite.y,
                facing: player.facing,
                spriteType: player.spriteType
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

        // backArm.rotation = game.physics.arcade.angleToPointer(backArm);
        // frontArm.rotation = game.physics.arcade.angleToPointer(frontArm);
        // head.rotation = game.physics.arcade.angleToPointer(head);
        // player.sprite.rotation = game.physics.arcade.angleToPointer(player.sprite);

        var hitPlatform = game.physics.arcade.collide(users, layer);
        game.physics.arcade.collide(users);
        player.sprite.body.velocity.x = 0;
        
        if (keys.up.isDown && player.sprite.body.onFloor() && hitPlatform ) {
            player.sprite.body.velocity.y = -400;
        }

        if (keys.right.isDown) {
            player.sprite.scale.x = 1.2;
            player.sprite.body.velocity.x = moveSpeed;
            player.facing = {
                left: false,
                right: true
            };
        }

        if(keys.left.isDown) {
            player.sprite.scale.x = -1.2;
            player.sprite.body.velocity.x = -moveSpeed;
            player.facing = {
                left: true,
                right: false
            };
        }
        moveUser(player.name, player.sprite.x, player.sprite.y);
    }

    function render() {
        game.debug.bodyInfo(player.sprite, 32, 32);
        game.debug.body(player.sprite);
        // game.debug.spriteInfo(head, 32, 32);
        // game.debug.spriteBounds(head);
        // game.debug.spriteCorners(head, true, true);
    }

};