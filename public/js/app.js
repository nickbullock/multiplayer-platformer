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
        playerMaterial, weaponMaterial, bulletMaterial, jumpTimer = 0, nextFire = 0;
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
        game.load.spritesheet('jackBeardBody', '../assets/walking_center.png', 75, 75);
        game.load.spritesheet('jackBeardHead', '../assets/jack-beard/head.png', 75, 75);
        game.load.spritesheet('jackBeardFrontArm', '../assets/jack-beard/front-arm.png', 75, 75);
        game.load.spritesheet('jackBeardBackArm', '../assets/jack-beard/back-arm.png', 75, 75);
        game.load.spritesheet('dude2', '../assets/player6.png', 75, 73);
        game.load.spritesheet('weapon', '../assets/gunsall13.png', 65, 32);
        game.load.image('background', '../assets/bg123.png');
        game.load.image('bullet', '../assets/bullet1.png');
        game.load.spritesheet('boom', '../assets/explode.png', 128, 128);
    }

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
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

        user.sprite.name = user.name;
        user.sprite.checkWorldBounds = true;
        user.sprite.body.x = Math.floor(Math.random() * (1000 - 80 + 1)) + 80;
        user.sprite.body.y = Math.floor(Math.random() * (150 - 100 + 1)) + 100;
        user.sprite.body.collideWorldBounds = true;
        user.sprite.body.setRectangle(40, 75, 0, 0);
        user.sprite.anchor.setTo(0.5, 0.5);
        user.sprite.body.fixedRotation = true;
        user.sprite.body.mass = 5;
        user.sprite.body.setCollisionGroup(playerCollisionGroup);
        user.sprite.body.collides([playerCollisionGroup, groundCollisionGroup, weaponCollisionGroup, bulletCollisionGroup]);
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
        // user.sprite.health = userData.health;

        user.sprite.label = game.add.text(0, 0, user.name, textStyle);
        user.sprite.label.anchor.set(0.5);

        user.sprite.children[1].animations.add('move', [1,2,3,4,5,6,7,8], 20, true);

        if(user.sprite.body && userData.name !== globalPlayerName){
            user.sprite.body.static = true;
        }

        return user;
    }
    function updateUser(userData) {
        let user = users[userData.name];

        user.sprite.children.forEach(function (sprite) {
            if(sprite.key !== 'jackBeardBody'){
                sprite.rotation = userData.rotation;
            }
        });

        if(user.sprite.body && Math.round(user.sprite.previousPosition.x) === Math.round(userData.x)) {
            user.sprite.children[1].frame = 0;
            user.sprite.children[1].animations.stop()
        }
        else if (userData.facing === 1 && user.sprite.children[1]) {
            user.sprite.children[1].animations.play('move');
            user.sprite.scale.x = 1;
            user.facing = 1;
        }
        else if (userData.facing === -1 && user.sprite.children[1]) {
            user.sprite.children[1].animations.play('move');
            user.sprite.scale.x = -1;
            user.facing = -1;
        }

        if(user.sprite.body){
            user.sprite.body.x = userData.x;
            user.sprite.body.y = userData.y;
        }
        // user.sprite.health = userData.health;

        user.sprite.label.alignTo(user.sprite, Phaser.BOTTOM_CENTER, 0, 50);

        if(userData.isFiring){
            fire(user)
        }

        return user;
    }

    function removeUserSprite(userData) {
        let user = users[userData.name];
        if (user) {
            if(user.sprite.body && user.sprite.body.weapon){
                dropWeapon(userData);
            }
            user.sprite.destroy();
            user.sprite.label.destroy();
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

    function getWeapon(weapon, user) {
        weapon.sprite.kill();

        let wpn = weapons.create(10, -5, 'weapon', weapon.sprite._frame.index);
        wpn.scale.setTo(0.8, 0.8);
        wpn.anchor.setTo(0.5, 0.5);

        user.weapon = user.sprite.children[0].addChild(wpn);
        user.weapon.guid = weapon.sprite.guid;
        user.weapon.fireRate = weapon.sprite.fireRate;
        user.weapon.damage = weapon.sprite.damage;
    }

    function removeBullet(bullet) {
        bullet.sprite.kill();
    }

    function hitUser(bullet, user) {
        if(user.sprite.name !== bullet.sprite.parentUser){
            bullet.sprite.kill();

            const damage = users[bullet.sprite.parentUser].sprite.body.weapon.damage;

            user.sprite.damage(damage);
            if(user.sprite.health <= 0){
                user.sprite.label.destroy();
            }
        }
    }

    function dropWeapon(userData) {
        let user = users[userData.name];
        let oldWeapon = user.sprite.body.weapon;
        let newWeapon = weapons.create(user.sprite.x, user.sprite.y, 'weapon', oldWeapon._frame.index);

        newWeapon.guid = oldWeapon.guid;
        game.physics.p2.enable(newWeapon);
        newWeapon.checkWorldBounds = true;
        newWeapon.body.collideWorldBounds = true;
        newWeapon.anchor.setTo(0.5, 0.5);
        newWeapon.body.mass = 1;
        newWeapon.body.fixedRotation = true;
        newWeapon.body.setCollisionGroup(weaponCollisionGroup);
        newWeapon.body.collides([weaponCollisionGroup, groundCollisionGroup, playerCollisionGroup, bulletCollisionGroup]);
        newWeapon.body.setMaterial(weaponMaterial);
        newWeapon.body.createGroupCallback(playerCollisionGroup, getWeapon);
    }

    function fire(user) {
        if (game.time.now > nextFire) {
            nextFire = game.time.now + user.sprite.body.weapon.fireRate;

            const bullet = bullets.getFirstExists(false);

            if(bullet){
                console.log(user.sprite.body.weapon.previousPosition.x, user.sprite.body.weapon.previousPosition.y)
                bullet.reset(user.sprite.body.weapon.previousPosition.x+5, user.sprite.body.weapon.previousPosition.y+5);

                bullet.parentUser = user.name;

                if(user.facing === 1){
                    bullet.scale.x = 0.5;
                    bullet.rotation = user.sprite.children[0].rotation;
                    bullet.body.velocity.x = Math.cos(bullet.rotation) * 1300;
                    bullet.body.velocity.y = Math.sin(bullet.rotation) * 1300;
                }
                else{
                    bullet.scale.x = -0.5;
                    bullet.rotation = Math.PI - user.sprite.children[0].rotation;
                    bullet.body.velocity.x = Math.cos(bullet.rotation) * 1300;
                    bullet.body.velocity.y = Math.sin(bullet.rotation) * 1300;
                }
            }
        }
    }

    function create() {
        /**
         * ==========game init block=========
         */

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
        game.physics.p2.createContactMaterial(weaponMaterial, groundMaterial, {
            friction: 0.5,
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
        game.physics.p2.setBoundsToWorld(true, true, true, true, false);

        let layerTiles = game.physics.p2.convertTilemap(map, layer);

        layerTiles.forEach(function(tile){
            tile.setCollisionGroup(groundCollisionGroup);
            tile.collides([playerCollisionGroup, weaponCollisionGroup, bulletCollisionGroup]);
            tile.setMaterial(groundMaterial);
        });

        game.physics.p2.setBoundsToWorld(true, true, true, true, false);

        users = game.add.group();
        weapons = game.add.group();
        bullets = game.add.group();
        /**
         * ==========game init block=========
         */

        /**
         * =============player init block=========
         */
        player = userSpriteHandler({
            name: globalPlayerName,
            x: 150,
            y: 100,
            facing: 1,
            spriteType: 'jackBeard',
            isFiring: false
            // health: 100
        });

        game.camera.follow(player.sprite);
        /**
         * =============player init block=========
         */

        /**
         * ==========weapons init block===============
         */

        for(let key in mapService.forest.weapons){
            let newWeapon = weapons.create(mapService.forest.weapons[key].x, mapService.forest.weapons[key].y, 'weapon', mapService.forest.weapons[key].frame);
            newWeapon.fireRate = mapService.forest.weapons[key].fireRate;
            newWeapon.damage = mapService.forest.weapons[key].damage;
        }

        game.physics.p2.enable(weapons);
        weapons.setAll('guid', guid());
        weapons.setAll('anchor.x', 0.5);
        weapons.setAll('anchor.y', 0.5);
        weapons.setAll('checkWorldBounds', true);
        weapons.setAll('body.fixedRotation', true);
        weapons.forEach(function(weapon){
            weapon.body.setCollisionGroup(weaponCollisionGroup);
            weapon.body.collides([weaponCollisionGroup, groundCollisionGroup, playerCollisionGroup]);
            weapon.body.setMaterial(weaponMaterial);
            weapon.body.createGroupCallback(playerCollisionGroup, getWeapon);
        });
        /**
         * ==========weapons init block===============
         */


        /**
         * ============bullets init block============
         */
        bullets.enableBody = true;
        bullets.physicsBodyType = Phaser.Physics.P2JS;
        bullets.createMultiple(100, 'bullet', 0, false);
        bullets.setAll('anchor.x', 0.5);
        bullets.setAll('anchor.y', 0.5);
        bullets.setAll('checkWorldBounds', true);
        bullets.setAll('outOfBoundsKill', true);
        bullets.setAll('scale.x', 0.5);
        bullets.setAll('scale.y', 0.5);
        bullets.setAll('body.fixedRotation', true);
        bullets.forEach(function(bullet){
            bullet.body.setCollisionGroup(bulletCollisionGroup);
            bullet.body.collides([weaponCollisionGroup, groundCollisionGroup, playerCollisionGroup]);
            bullet.body.setMaterial(bulletMaterial);
            bullet.body.createGroupCallback(groundCollisionGroup, removeBullet);
            bullet.body.createGroupCallback(playerCollisionGroup, hitUser);
        });
        /**
         * ============bullets init block============
         */


        /**
         * =============socket interaction block=============
         */
        socket.subscribe(getUserPresenceChannelName(globalPlayerName)).watch(function (userData) {
            
            weapons.children.forEach(function(localWeapon){
                userData.weapons.forEach(function(weaponFromSever){
                    if(localWeapon._frame.index === weaponFromSever.index){
                        localWeapon.reset(weaponFromSever.x, weaponFromSever.y);
                    }
                })
            });

            userSpriteHandler(userData);
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
                    // health: player.sprite.health,
                    isFiring: player.isFiring,
                    weapons: weapons.children.map(function(weapon){
                        return {
                            index: weapon._frame.index,
                            x: player.sprite.body.weapon && (weapon.guid === player.sprite.body.weapon.guid) ? player.sprite.x : weapon.x,
                            y: player.sprite.body.weapon && (weapon.guid === player.sprite.body.weapon.guid) ? player.sprite.y : weapon.y
                        }
                    })
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
            rotation: player.sprite.children[0].rotation,
            isFiring: player.isFiring
            // health: player.sprite.health
        });

        function sendPlayerMove() {
            socket.emit('move', {
                x: player.sprite.body.x,
                y: player.sprite.body.y,
                facing: player.facing,
                spriteType: player.spriteType,
                rotation: player.sprite.children[0].rotation,
                isFiring: player.isFiring
                // health: player.sprite.health
            });
        }

        setInterval(function () {
            sendPlayerMove();
        },
        10);
        /**
         * =============socket interaction block=============
         */
    }

    function update() {
        const angle = angleToPointer(player.sprite);

        if (keys.up.isDown && checkIfCanJump() && game.time.now > jumpTimer) {
            player.sprite.body.moveUp(700);
            jumpTimer = game.time.now + 750;
        }

        if (keys.right.isDown) {
            if(keys.up.isUp) {
                player.sprite.children[1].animations.play('move');
            }
            else{
                player.sprite.children[1].animations.stop();
            }
            player.sprite.body.moveRight(moveSpeed);
            player.facing = 1;
            player.sprite.scale.x = 1;
        }
        else if (keys.left.isDown) {
            if(keys.up.isUp){
                player.sprite.children[1].animations.play('move');
            }
            else{
                player.sprite.children[1].animations.stop();
            }
            player.sprite.body.moveLeft(moveSpeed);
            player.facing = -1;
            player.sprite.scale.x = -1;
        }
        else{
            player.sprite.children[1].frame = 0;
            player.sprite.children[1].animations.stop()
        }

        if (keys.lmb.isDown && player.sprite.body && player.sprite.body.weapon) {
            player.isFiring = true;
            fire(player);
        }
        else{
            player.isFiring = false;
        }

        player.sprite.label.alignTo(player.sprite, Phaser.BOTTOM_CENTER, 0, 50);

        player.sprite.children.forEach(function (sprite) {
            if(sprite.key !== 'jackBeardBody'){
                if (player.facing === 1 && (angle > -1.2 && angle < 1.2)) {
                    sprite.rotation = game.physics.arcade.angleToPointer(player.sprite);
                }
                if (player.facing === -1 && (angle > Math.PI - 1.2 || angle < 1.2 - Math.PI)) {
                    sprite.rotation = Math.PI - game.physics.arcade.angleToPointer(player.sprite);
                }
            }
        });
    }
};