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
            up: game.input.keyboard.addKey(Phaser.Keyboard.W),
            down: game.input.keyboard.addKey(Phaser.Keyboard.S),
            right: game.input.keyboard.addKey(Phaser.Keyboard.D),
            left: game.input.keyboard.addKey(Phaser.Keyboard.A),
            drop: game.input.keyboard.addKey(Phaser.Keyboard.G),
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
        user.sprite.health = userData.health;

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
        user.sprite.health = userData.health;

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
                dropWeapon(userData.name, 0, false);
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
        if(!user.weapon){
            let wpn = weapons.create(10, -5, 'weapon', weapon.sprite._frame.index);
            wpn.guid = weapon.sprite.guid;
            wpn.fireRate = weapon.sprite.fireRate;
            wpn.damage = weapon.sprite.damage;
            wpn.scale.setTo(0.8, 0.8);
            wpn.anchor.setTo(0.5, 0.5);

            user.weapon = user.sprite.children[0].addChild(wpn);
            weapon.sprite.kill();
        }
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
                user.sprite.kill();
                user.sprite.label.kill();

                /**
                 * sync kill between players
                 */
                socket.publish(getUserPresenceChannelName(user.sprite.name), "kill")
            }
        }
    }

    function dropWeapon(username, offsetX, publish) {
        let user = users[username];
        let oldWeapon = user.sprite.body.weapon;
        if(oldWeapon){
            const offsetInit = offsetX || 0;

            weapons.forEach(function(weapon){
                if(weapon.guid === oldWeapon.guid){
                    weapon.destroy();
                }
            });

            let newWeapon = weapons.create(
                user.facing === 1 ? user.sprite.x + offsetInit : user.sprite.x - offsetInit,
                user.sprite.y,
                'weapon',
                oldWeapon._frame.index
            );

            newWeapon.guid = oldWeapon.guid;
            newWeapon.fireRate = oldWeapon.fireRate;
            newWeapon.damage = oldWeapon.damage;
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

            user.sprite.body.weapon = undefined;
            user.sprite.children[0].children.forEach(function(weapon){
                weapon.destroy();
            });

            if(publish){
                socket.publish("drop", username);
            }
        }
    }

    function fire(user) {
        if (game.time.now > nextFire) {
            nextFire = game.time.now + user.sprite.body.weapon.fireRate;

            const bullet = bullets.getFirstExists(false);

            if(bullet){
                bullet.reset(user.sprite.body.weapon.previousPosition.x, user.sprite.body.weapon.previousPosition.y);

                bullet.parentUser = user.name;

                if(user.facing === 1){
                    bullet.scale.x = 0.5;
                    bullet.rotation = user.sprite.children[0].rotation;
                    bullet.body.velocity.x = Math.cos(bullet.rotation) * 1700;
                    bullet.body.velocity.y = Math.sin(bullet.rotation) * 1700;
                }
                else{
                    bullet.scale.x = -0.5;
                    bullet.rotation = Math.PI - user.sprite.children[0].rotation;
                    bullet.body.velocity.x = Math.cos(bullet.rotation) * 1700;
                    bullet.body.velocity.y = Math.sin(bullet.rotation) * 1700;
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
            friction: 0.6,
            restitution: 0.1
        });
        game.physics.p2.createContactMaterial(weaponMaterial, playerMaterial, {
            friction: 1,
            restitution: 0
        });
        game.physics.p2.createContactMaterial(weaponMaterial, groundMaterial, {
            friction: 1,
            restitution: 0
        });

        game.physics.p2.world.defaultContactMaterial.friction = 0.5;

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
            isFiring: false,
            health: 100
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
            newWeapon.guid = guid();
            newWeapon.fireRate = mapService.forest.weapons[key].fireRate;
            newWeapon.damage = mapService.forest.weapons[key].damage;
        }

        game.physics.p2.enable(weapons);
        weapons.setAll('anchor.x', 0.5);
        weapons.setAll('anchor.y', 0.5);
        weapons.setAll('checkWorldBounds', true);
        weapons.setAll('body.fixedRotation', true);
        weapons.forEach(function(weapon){
            // weapon.body.setCircle(15);
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
            bullet.body.collides([groundCollisionGroup, playerCollisionGroup]);
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
            if(userData === "kill"){
                if(player.sprite.alive){
                    player.sprite.kill();
                }
                if(player.sprite.alive.label){
                    player.sprite.label.kill();
                }
            }
            else{
                weapons.removeAll(true);

                if(userData.weapons && Array.isArray(userData.weapons) && userData.weapons.length > 0){
                    userData.weapons.forEach(function(weaponFromServer){
                        let newWeapon = weapons.create(weaponFromServer.x, weaponFromServer.y, 'weapon', weaponFromServer.index);
                        newWeapon.guid = weaponFromServer.guid;
                        newWeapon.fireRate = weaponFromServer.fireRate;
                        newWeapon.damage = weaponFromServer.damage;
                    });

                    game.physics.p2.enable(weapons);
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
                }

                userSpriteHandler(userData);
            }
        });
        socket.subscribe("drop").watch(function (username) {
            if(username !== globalPlayerName){
                dropWeapon(username, 80, false);
            }
        });

        socket.subscribe('player-join').watch(function (userData) {
            if (userData && player && userData.name != globalPlayerName) {
                userSpriteHandler(userData);
                const initDataToNewPlayer = {
                    name: globalPlayerName,
                    x: player.x,
                    y: player.y,
                    facing: player.facing,
                    spriteType: player.spriteType,
                    rotation: player.sprite.children[0].rotation,
                    health: player.sprite.health,
                    isFiring: player.isFiring,
                    weapons: weapons.children.map(function(weapon){
                        return {
                            guid: weapon.guid,
                            fireRate: weapon.fireRate,
                            damage: weapon.damage,
                            index: weapon._frame.index,
                            x: player.sprite.body.weapon && (weapon.guid === player.sprite.body.weapon.guid) ? player.sprite.body.weapon.previousPosition.x : weapon.x,
                            y: player.sprite.body.weapon && (weapon.guid === player.sprite.body.weapon.guid) ? player.sprite.body.weapon.previousPosition.y : weapon.y
                        }
                    })
                };

                socket.publish(getUserPresenceChannelName(userData.name), initDataToNewPlayer);
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
            isFiring: player.isFiring,
            health: player.sprite.health
        });

        function sendPlayerMove() {
            socket.emit('move', {
                x: player.sprite.body.x,
                y: player.sprite.body.y,
                facing: player.facing,
                spriteType: player.spriteType,
                rotation: player.sprite.children[0].rotation,
                isFiring: player.isFiring,
                health: player.sprite.health
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

        if (keys.lmb.isDown && player && player.sprite.body && player.sprite.body.weapon && player.sprite.health > 0) {
            player.isFiring = true;
            fire(player);
        }
        else{
            player.isFiring = false;
        }

        if (keys.drop.isDown && player && player.sprite.body && player.sprite.body.weapon && player.sprite.health > 0) {
            dropWeapon(globalPlayerName, 80, true)
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