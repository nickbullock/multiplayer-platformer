/**
 * Created by PYRO on 11.12.16.
 */

const socket = socketCluster.connect();

window.onload = function () {

    //  Note that this html file is set to pull down Phaser from our public/ directory.
    //  Although it will work fine with this tutorial, it's almost certainly not the most current version.
    //  Be sure to replace it with an updated version before you start experimenting with adding your own code.

    const gameWidth = 1024, gameHeight = 768;

    const game = new Phaser.Game(gameWidth, gameHeight, Phaser.CANVAS, 'valhall.io', {
        preload: preload,
        create: create,
        update: update,
        render: render
    });

    let player, keys, backArm, body, head, frontArm, hook, hookDistance, hookExists, bg, map, layer, users;
    const moveSpeed = 150;

    function getRandomColor(min) {
        const max = 255;
        let randomness = max - min;
        return min + Math.round(Math.random() * randomness);
    }

    function preload() {
        keys = {
            up: game.input.keyboard.addKey(Phaser.Keyboard.UP),
            down: game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
            right: game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
            left: game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
            rmb: game.input.mousePointer.rightButton,
            lmb: game.input.mousePointer.leftButton.isDown
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
        game.load.image('background', '../assets/bg-1920.jpg');
        game.load.image('bullet', '../assets/bullet1.png');
        game.load.spritesheet('hook', '../assets/general/chain.png', 16, 26);
        game.load.spritesheet('boom', '../assets/explode.png', 128, 128);
    }


    function moveUser(playerName, x, y, rotation) {

        let user = users[playerName];

        if (player && (playerName !== player.name)) {
            user.sprite.children.forEach(function (sprite) {
                if(sprite.key !== 'jackBeardBody'){

                    sprite.rotation = rotation;
                }
            });
            user.sprite.body.moves = false;
        }

        if (x > user.x) {
            // user.sprite.animations.play('right')
            user.facing = 1;
            user.sprite.scale.x = 1;
        }
        else if (x < user.x) {
            // user.sprite.animations.play('left')
            user.facing = -1;
            user.sprite.scale.x = -1;
        }
        else {
            user.sprite.animations.stop();
            if (user.facing === -1) {
                user.sprite.frame = 17;
            }
            else if (user.facing === 1) {
                user.sprite.frame = 0;
            }
        }

        user.x = user.sprite.x = x;
        user.y = user.sprite.y = y;
        user.label.alignTo(user.sprite, Phaser.BOTTOM_CENTER, 0, 50);
    }

    function removeUserSprite(userData) {
        let user = users[userData.name];
        if (user) {
            user.sprite.destroy();
            user.label.destroy();
        }
    }

    function updateUserSprite(userData) {
        let user = users[userData.name];
        if (user) {
            moveUser(userData.name, userData.x, userData.y, userData.rotation);
        } else {
            users[userData.name] = user = {};
            user.name = userData.name;

            user.spriteType = userData.spriteType;

            const textStyle = {
                font: '16px Arial',
                fill: '#ffffff',
                align: 'center'
            };

            user.color = userData.color;
            user.sprite = users.create(0, 0);

            user.sprite.body.bounce.y = 0.1;
            user.sprite.checkWorldBounds = true;
            user.sprite.body.collideWorldBounds = true;
            user.sprite.body.maxVelocity.y = 500;
            user.sprite.body.setSize(35, 75, 0, -20);
            user.sprite.anchor.setTo(0.5, 0.5);

            backArm = game.add.sprite(3, -3, userData.spriteType + 'BackArm');
            body = game.add.sprite(4, 15, userData.spriteType + 'Body');
            head = game.add.sprite(0, -15, userData.spriteType + 'Head');
            frontArm = game.add.sprite(0, 0, userData.spriteType + 'FrontArm');

            backArm.anchor.setTo(0.4, 0.5);
            frontArm.anchor.setTo(0.4, 0.5);
            body.anchor.setTo(0.5, 0.5);
            head.anchor.setTo(0.5, 0.51);

            user.sprite.addChild(backArm);
            user.sprite.addChild(body);
            user.sprite.addChild(head);
            user.sprite.addChild(frontArm);

            user.facing = userData.facing;
            user.health = 100;

            user.label = game.add.text(0, 0, user.name, textStyle);
            user.label.anchor.set(0.5);

            // user.sprite.animations.add('left', [8, 7, 6, 5, 4, 3, 2, 1], 10, true);
            // user.sprite.animations.add('right', [9, 10, 11, 12, 13, 14, 15, 16], 10, true);
            // user.sprite.animations.add('jumpright', [18, 19, 20, 21, 22, 23, 24, 25], 7, false);
            // user.sprite.animations.add('jumpleft', [33, 32, 31, 30, 29, 28, 27, 26], 7, false);

            moveUser(userData.name, userData.x, userData.y, userData.rotation);
        }
        return user;
    }

    function angleToPointer(displayObject, pointer) {
        pointer = pointer || game.input.activePointer;
        let dx = pointer.worldX - displayObject.x;
        let dy = pointer.worldY - displayObject.y;

        return Math.atan2(dy, dx);
    }

    function shootHook() {
        hook = game.add.sprite(player.x, player.y, 'hook', 3);
        game.physics.arcade.enable(hook);
        if(player.facing === 1){
            hook.rotation = player.sprite.children[0].rotation + Math.PI/2;
        }
        else if (player.facing === -1){
            hook.rotation = 3*Math.PI/2 - player.sprite.children[0].rotation;
        }

        game.physics.arcade.moveToPointer(hook, 1500);  //object, speed

        return false;
    }

    function destroyHook() {
        hook.kill();
        // hookExists = false;
    }

    function hookCollision(hook, layer){
        // if (hookExists == true) {return} else {  hookExists = true;}  //this is important because otherwise the collision callback would be fired more than once
        hookDistance = game.physics.arcade.distanceBetween(player, hook);
        console.log('hookCollision!')
        hook.body.immovable = true;
        hook.body.moves = false;

        // createChainElement(0, Math.round(hookDistance / 20));
    }

    function create() {

        game.canvas.oncontextmenu = function (e) {
            e.preventDefault();
        };

        game.physics.startSystem(Phaser.Physics.ARCADE);

        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;

        game.scale.setMinMax(800, 600, 1920, 1080);

        game.stage.backgroundColor = '#000000';
        game.stage.disableVisibilityChange = true;

        bg = game.add.tileSprite(0, 0, gameWidth, gameHeight, 'background');
        bg.fixedToCamera = true;

        map = game.add.tilemap('lvl2');
        map.addTilesetImage('tiles-1');
        map.setCollisionByExclusion([13, 14, 15, 16, 46, 47, 48, 49, 50, 51]);

        layer = map.createLayer('lvl2');
        layer.renderSettings.enableScrollDelta = false;
        layer.resizeWorld();
        game.physics.arcade.gravity.y = 600;

        users = game.add.group();
        users.enableBody = true;
        users.physicsBodyType = Phaser.Physics.ARCADE;

        // Generate a random name for the user.
        const playerName = 'user-' + Math.round(Math.random() * 10000);
        const startingPos = {x: 50, y: 50};
        const playerColor = Phaser.Color.getColor(getRandomColor(100), getRandomColor(100), getRandomColor(100));

        player = updateUserSprite({
            name: playerName,
            color: playerColor,
            x: startingPos.x,
            y: startingPos.y,
            facing: 1,
            spriteType: 'jackBeard'
        });

        game.camera.follow(player.sprite);

        const getUserPresenceChannelName = function (username) {
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
                    spriteType: player.spriteType,
                    rotation: player.sprite.children[0].rotation
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
            facing: player.facing,
            spriteType: player.spriteType,
            rotation: player.sprite.children[0].rotation
        });

        function sendPlayerMove() {
            socket.emit('move', {
                x: player.sprite.x,
                y: player.sprite.y,
                facing: player.facing,
                spriteType: player.spriteType,
                rotation: player.sprite.children[0].rotation
            });
        }

        setInterval(function () {
            sendPlayerMove();
        },
        5);

        keys.rmb.onDown.add(shootHook);
        keys.rmb.onUp.add(destroyHook);
    }

    function update() {

        const hitPlatform = game.physics.arcade.collide(users, layer);
        if(hook){
            game.physics.arcade.collide(hook, layer, hookCollision, null, this);
        }

        const angle = angleToPointer(player.sprite);
        // game.physics.arcade.collide(users);
        player.sprite.body.velocity.x = 0;

        if (keys.up.isDown && player.sprite.body.onFloor() && hitPlatform) {
            player.sprite.body.velocity.y = -400;
        }

        if (keys.right.isDown) {
            player.sprite.body.velocity.x = moveSpeed;
        }

        if (keys.left.isDown) {
            player.sprite.body.velocity.x = -moveSpeed;
        }

        player.sprite.children.forEach(function (sprite) {
            if(sprite.key !== 'jackBeardBody'){
                if (player.facing === 1 && angle > -1.2 && angle < 1.2) {
                 sprite.rotation = game.physics.arcade.angleToPointer(player.sprite);
                }
                else if (player.facing === -1 && angle > Math.PI - 1.2 || angle < 1.2 - Math.PI) {
                    sprite.rotation = Math.PI - game.physics.arcade.angleToPointer(player.sprite);
                }
            }
        });

        moveUser(player.name, player.sprite.x, player.sprite.y, player.sprite.children[0].rotation);
    }

    function render() {
        game.time.advancedTiming = true;
        game.debug.text(game.time.fps , 2, 14, "#00ff00");
        // game.debug.bodyInfo(player.sprite, 32, 32);
        // game.debug.body(player.sprite);
        // game.debug.spriteInfo(player.sprite, 32, 32);
        // game.debug.spriteBounds(head);
        // game.debug.spriteCorners(head, true, true);
    }
};