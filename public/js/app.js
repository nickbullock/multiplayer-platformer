/**
 * Created by PYRO on 11.12.16.
 */

const socket = socketCluster.connect();

window.onload = function () {

    const gameWidth = 1024, gameHeight = 768;

    const game = new Phaser.Game(gameWidth, gameHeight, Phaser.CANVAS, 'valhall.io', {
        preload: preload,
        create: create,
        update: update
    });

    let player, keys, backArm, body, head, frontArm, bg, map, layer, users, weapons, bullets,
        groundCollisionGroup, playerCollisionGroup, weaponCollisionGroup, bulletCollisionGroup, groundMaterial,
        playerMaterial, weaponMaterial, bulletMaterial, jumpTimer = 0, newWeaponPositions;
    const moveSpeed = 135;
    const globalPlayerName = 'user-' + Math.round(Math.random() * 10000);

    function preload() {
        keys = {
            up: game.input.keyboard.addKey(Phaser.Keyboard.UP),
            down: game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
            right: game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
            left: game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
            rmb: game.input.mousePointer.rightButton,
            lmb: game.input.mousePointer.leftButton
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

    function createUser (user, userData) {
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
        game.physics.p2.enable(user.sprite);

        user.sprite.checkWorldBounds = true;
        user.sprite.body.collideWorldBounds = true;
        user.sprite.body.setRectangle(40, 75, 0, 0);
        user.sprite.anchor.setTo(0.5, 0.5);
        user.sprite.body.fixedRotation = true;
        user.sprite.body.mass = 5;
        user.sprite.body.setCollisionGroup(playerCollisionGroup);
        user.sprite.body.collides([playerCollisionGroup, groundCollisionGroup, weaponCollisionGroup]);
        user.sprite.body.setMaterial(playerMaterial);

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

        updateUser(userData);

        return user;
    }

    function updateUser(userData) {
        let user = users[userData.name];

        user.sprite.children.forEach(function (sprite) {
            if(sprite.key !== 'jackBeardBody'){

                sprite.rotation = userData.rotation;
            }
        });
        if(user.sprite.body && userData.name !==  globalPlayerName){
            user.sprite.body.static = true;
        }
        if (userData.facing === 1) {
            // user.sprite.animations.play('right')
            user.sprite.scale.x = 1;
        }
        if (userData.facing === -1) {
            // user.sprite.animations.play('left')
            user.sprite.scale.x = -1;
        }
        if(userData.x === user.x) {
            // user.sprite.animations.stop();
            if (user.facing === -1) {
                user.sprite.frame = 17;
            }
            else if (user.facing === 1) {
                user.sprite.frame = 0;
            }
        }
        if(user.sprite.body){
            user.x = user.sprite.body.x = userData.x;
            user.y = user.sprite.body.y = userData.y;
        }

        user.label.alignTo(user.sprite, Phaser.BOTTOM_CENTER, 0, 50);

        return user;
    }

    function removeUserSprite(userData) {
        let user = users[userData.name];
        if (user) {
            user.sprite.destroy();
            user.label.destroy();
        }
    }

    function userSpriteHandler(userData) {
        let user = users[userData.name];

        return user ? updateUser(userData) : createUser(user, userData);
    }

    function angleToPointer(displayObject, pointer) {
        pointer = pointer || game.input.activePointer;
        let dx = pointer.worldX - displayObject.x;
        let dy = pointer.worldY - displayObject.y;

        return Math.atan2(dy, dx);
    }

    function checkIfCanJump() {
        let result = false;

        for (let i=0; i < game.physics.p2.world.narrowphase.contactEquations.length; i++) {
            let c = game.physics.p2.world.narrowphase.contactEquations[i];

            if (c.bodyA === player.sprite.body.data || c.bodyB === player.sprite.body.data) {
                let d = p2.vec2.dot(c.normalA, p2.vec2.fromValues(0, 1));

                if (c.bodyA === player.sprite.body.data) {
                    d *= -1;
                }

                if (d > 0.5) {
                    result = true;
                }
            }
        }

        return result;
    }

    function getUserPresenceChannelName(username) {
        return 'user/' + username + '/presence-notification';
    }

    function gunCollisionCallback(weapon, user) {
        weapon.sprite.kill();

        let wpn = weapons.create(10, -5, 'weapon', weapon.sprite._frame.index);
        wpn.scale.setTo(0.8, 0.8);
        wpn.anchor.setTo(0.5, 0.5);

        user.weapon = user.sprite.children[0].addChild(wpn);
    }

    // function fire(fireRate) {
    //
    //     if (game.time.now > nextFire && bullets.countDead() > 0)
    //     {
    //         nextFire = game.time.now + fireRate;
    //
    //         var bullet = bullets.getFirstExists(false);
    //
    //         bullet.reset(turret.x, turret.y);
    //
    //         bullet.rotation = game.physics.arcade.moveToPointer(bullet, 1000, game.input.activePointer, 500);
    //     }
    //
    // }

    function create() {

        game.canvas.oncontextmenu = function (e) {
            e.preventDefault();
        };

        game.physics.startSystem(Phaser.Physics.P2JS);

        game.physics.p2.setImpactEvents(true);
        game.physics.p2.gravity.y = 1400;

        playerCollisionGroup = game.physics.p2.createCollisionGroup();
        weaponCollisionGroup = game.physics.p2.createCollisionGroup();
        groundCollisionGroup = game.physics.p2.createCollisionGroup();
        bulletCollisionGroup = game.physics.p2.createCollisionGroup();

        groundMaterial = game.physics.p2.createMaterial();
        playerMaterial = game.physics.p2.createMaterial();
        weaponMaterial = game.physics.p2.createMaterial();
        bulletMaterial = game.physics.p2.createMaterial();

        game.physics.p2.setWorldMaterial(groundMaterial, true, true, true, true);
        game.physics.p2.createContactMaterial(playerMaterial, groundMaterial, {
            friction: 0.5,
            restitution: 0
        });
        game.physics.p2.createContactMaterial(weaponMaterial, playerMaterial, {
            friction: 1,
            restitution: 0
        });

        game.physics.p2.world.defaultContactMaterial.friction = 0.3;

        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.setMinMax(800, 600, 1920, 1080);

        game.stage.backgroundColor = '#000000';
        game.stage.disableVisibilityChange = true;

        bg = game.add.tileSprite(0, 0, gameWidth, gameHeight, 'background');
        bg.fixedToCamera = true;

        map = game.add.tilemap('lvl2');
        map.addTilesetImage('tiles-1');
        map.setCollisionBetween(1,68,true,'lvl2');

        layer = map.createLayer('lvl2');
        layer.renderSettings.enableScrollDelta = false;
        layer.resizeWorld();
        game.physics.p2.setBoundsToWorld(true, true, true, true, true);

        let layerTiles = game.physics.p2.convertTilemap(map, layer);

        layerTiles.forEach(function(tile){
            tile.setCollisionGroup(groundCollisionGroup);
            tile.collides([playerCollisionGroup, weaponCollisionGroup]);
            tile.setMaterial(groundMaterial);
        });

        users = game.add.group();
        weapons = game.add.group();
        bullets = game.add.group();

        const localPlayerData = {
            name: globalPlayerName,
            x: 150,
            y: 100,
            facing: 1,
            spriteType: 'jackBeard'
        };

        player = userSpriteHandler(localPlayerData);

        game.camera.follow(player.sprite);

        socket.subscribe(getUserPresenceChannelName(localPlayerData.name)).watch(function (userData) {
            newWeaponPositions = userData.weaponPositions;

            if(newWeaponPositions) {
                rifle.reset(newWeaponPositions.rifleX, newWeaponPositions.rifleY);
            }
            userSpriteHandler(userData);
        });

        rifle = weapons.create(200, 200, 'weapon', 17);


        weapons.children.forEach(function(weapon){
            game.physics.p2.enable(weapon);

            weapon.checkWorldBounds = true;
            weapon.body.collideWorldBounds = true;
            // weapon.body.setRectangle(40, 75, 0, 0);
            weapon.anchor.setTo(0.5, 0.5);
            // weapon.body.fixedRotation = true;
            weapon.body.mass = 2;
            weapon.body.setCollisionGroup(weaponCollisionGroup);
            weapon.body.collides([weaponCollisionGroup, groundCollisionGroup, playerCollisionGroup]);
            weapon.body.setMaterial(weaponMaterial);
            weapon.body.createGroupCallback(playerCollisionGroup, gunCollisionCallback);

        });

        socket.subscribe('player-join').watch(function (userData) {
            if (userData && player && userData.name != globalPlayerName) {
                userSpriteHandler(userData);
                socket.publish(getUserPresenceChannelName(userData.name), {
                    name: globalPlayerName,
                    x: player.x,
                    y: player.y,
                    facing: player.facing,
                    spriteType: player.spriteType,
                    rotation: player.sprite.children[0].rotation,
                    weaponPositions: {
                        rifleX: rifle.x,
                        rifleY: rifle.y
                    }
                });
            }
        });

        socket.subscribe('player-leave').watch(function (userData) {
            if (player && userData.name !== globalPlayerName) {
                removeUserSprite(userData);
            }
        });

        socket.subscribe('player-positions').watch(function (userDataList) {
            if (player) {
                userDataList.forEach(function (userData) {
                    if (userData.name != globalPlayerName) {
                        userSpriteHandler(userData);
                    }
                });
            }
        });

        socket.emit('join', {
            name: globalPlayerName,
            x: player.x,
            y: player.y,
            facing: player.facing,
            spriteType: player.spriteType,
            rotation: player.sprite.children[0].rotation
        });

        function sendPlayerMove() {
            socket.emit('move', {
                x: player.sprite.body.x,
                y: player.sprite.body.y,
                facing: player.facing,
                spriteType: player.spriteType,
                rotation: player.sprite.children[0].rotation
            });
        }

        setInterval(function () {
            sendPlayerMove();
        },
        10);
    }

    function update() {

        const angle = angleToPointer(player.sprite);

        if (keys.up.isDown && checkIfCanJump() && game.time.now > jumpTimer) {
            player.sprite.body.moveUp(700);
            jumpTimer = game.time.now + 750;
        }
        if (keys.right.isDown) {
            player.sprite.body.moveRight(moveSpeed);
            player.facing = 1;
            player.sprite.scale.x = 1;
        }
        if (keys.left.isDown) {
            player.sprite.body.moveLeft(moveSpeed);
            player.facing = -1;
            player.sprite.scale.x = -1;
        }
        if (keys.lmb.isDown) {

        }

        player.label.alignTo(player.sprite, Phaser.BOTTOM_CENTER, 0, 50);

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
    }
};