
var ctx;

var playState = function(game){
    console.log("%cStarting my awesome game", "color:white; background:red");

    ctx = this;
};

playState.prototype = {

    moveSpeed: 135,

    globalPlayerName: 'user-' + Math.round(Math.random() * 10000),

    jumpTimer: 0,

    nextFire: 0,

    guid: function(){
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    },

    angleToPointer: function angleToPointer(displayObject, pointer) {
        pointer = pointer || game.input.activePointer;
        let dx = pointer.worldX - displayObject.x;
        let dy = pointer.worldY - displayObject.y;

        return Math.atan2(dy, dx);
    },

    checkIfCanJump: function checkIfCanJump() {

        let result = false;

        for (let i = 0; i < game.physics.p2.world.narrowphase.contactEquations.length; i++) {
            let c = game.physics.p2.world.narrowphase.contactEquations[i];

            if (c.bodyA === ctx.player.sprite.body.data || c.bodyB === ctx.player.sprite.body.data) {
                let d = p2.vec2.dot(c.normalA, p2.vec2.fromValues(0, 1));

                if (c.bodyA === ctx.player.sprite.body.data) {
                    d *= -1;
                }

                if (d > 0.5) {
                    result = true;
                }
            }
        }

        return result;
    },

    getUserPresenceChannelName: function getUserPresenceChannelName(username) {
        return 'user/' + username + '/presence-notification';
    },

    getWeapon: function getWeapon(weapon, user) {
        if ((user && user.weapon && (user.weapon.guid === weapon.sprite.guid))
            || (user && !user.weapon)
            || weapon.sprite._frame.index === user.weapon._frame.index) {

            let wpn = ctx.weapons.create(10, -5, 'weapon', weapon.sprite._frame.index);
            wpn.guid = weapon.sprite.guid;
            wpn.fireRate = weapon.sprite.fireRate;
            wpn.damage = weapon.sprite.damage;
            wpn.scale.setTo(0.8, 0.8);
            wpn.anchor.setTo(0.5, 0.5);

            user.weapon = user.sprite.children[0].addChild(wpn);
            weapon.sprite.kill();
        }
    },

    removeBullet: function removeBullet(bullet) {
        bullet.sprite.kill();
    },

    hitUser: function hitUser(bullet, user) {
        if (user.sprite.name !== bullet.sprite.parentUser) {
            bullet.sprite.kill();

            const damage = ctx.users[bullet.sprite.parentUser].sprite.body.weapon.damage;

            user.sprite.damage(damage);
            if (user.sprite.health <= 0) {
                if (user.sprite.body && user.sprite.body.weapon) {
                    ctx.dropWeapon(user.sprite.name, 0, false);
                }
                user.sprite.kill();
                user.sprite.label.kill();

                /**
                 * sync kill between ctx.players
                 */
                socket.publish(ctx.getUserPresenceChannelName(user.sprite.name), "kill")
            }
        }
    },

    dropWeapon: function dropWeapon(username, offsetX, publish) {
        let user = ctx.users[username];
        let oldWeapon = user.sprite.body.weapon;
        if (oldWeapon) {
            const offsetInit = offsetX || 0;

            ctx.weapons.forEach(function (weapon) {
                if (weapon.guid === oldWeapon.guid) {
                    weapon.destroy();
                }
            });

            let newWeapon = ctx.weapons.create(
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
            newWeapon.body.setCollisionGroup(ctx.weaponCollisionGroup);
            newWeapon.body.collides([ctx.weaponCollisionGroup, ctx.groundCollisionGroup, ctx.playerCollisionGroup, ctx.bulletCollisionGroup]);
            newWeapon.body.setMaterial(ctx.weaponMaterial);
            newWeapon.body.createGroupCallback(ctx.playerCollisionGroup, ctx.getWeapon);

            user.sprite.body.weapon = undefined;
            user.sprite.children[0].children.forEach(function (weapon) {
                weapon.destroy();
            });

            user.sprite.children[0].children = [];

            if (publish) {
                socket.publish("drop", username);
            }
        }
    },

    fire: function fire(user) {
        if (game.time.now > ctx.nextFire) {
            ctx.nextFire = game.time.now + user.sprite.body.weapon.fireRate;

            const bullet = ctx.bullets.getFirstExists(false);

            if (bullet) {
                bullet.reset(user.sprite.body.weapon.previousPosition.x, user.sprite.body.weapon.previousPosition.y);

                bullet.parentUser = user.name;

                if (user.facing === 1) {
                    bullet.scale.x = 0.5;
                    bullet.rotation = user.sprite.children[0].rotation;
                    bullet.body.velocity.x = Math.cos(bullet.rotation) * 1700;
                    bullet.body.velocity.y = Math.sin(bullet.rotation) * 1700;
                }
                else {
                    bullet.scale.x = -0.5;
                    bullet.rotation = Math.PI - user.sprite.children[0].rotation;
                    bullet.body.velocity.x = Math.cos(bullet.rotation) * 1700;
                    bullet.body.velocity.y = Math.sin(bullet.rotation) * 1700;
                }
            }
        }
    },

    playerCreateUpdateHandler: function(userData){
        if(ctx.users[userData.name]){
            ctx.users[userData.name].updatePlayer(
                userData.name,
                userData.rotation,
                userData.facing,
                userData.health,
                userData.x,
                userData.y,
                userData.isFiring
            )
        }
        else{
            ctx.users[userData.name] = new Player(
                userData.name,
                userData.color,
                userData.facing,
                userData.health,
                ctx
            )
        }
    },

    preload: function(){
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
    },

    create: function create() {
        /**
         * ==========game init block=========
         */
        game.canvas.oncontextmenu = function (e) {
            e.preventDefault();
        };

        game.physics.startSystem(Phaser.Physics.P2JS);

        game.physics.p2.setImpactEvents(true);
        game.physics.p2.gravity.y = 1400;

        ctx.playerCollisionGroup = game.physics.p2.createCollisionGroup();
        ctx.weaponCollisionGroup = game.physics.p2.createCollisionGroup();
        ctx.groundCollisionGroup = game.physics.p2.createCollisionGroup();
        ctx.bulletCollisionGroup = game.physics.p2.createCollisionGroup();

        ctx.groundMaterial = game.physics.p2.createMaterial();
        ctx.playerMaterial = game.physics.p2.createMaterial();
        ctx.weaponMaterial = game.physics.p2.createMaterial();
        ctx.bulletMaterial = game.physics.p2.createMaterial();

        game.physics.p2.setWorldMaterial(ctx.groundMaterial, true, true, true, true);
        game.physics.p2.createContactMaterial(ctx.playerMaterial, ctx.groundMaterial, {
            friction: 0.6,
            restitution: 0.1
        });
        game.physics.p2.createContactMaterial(ctx.weaponMaterial, ctx.playerMaterial, {
            friction: 1,
            restitution: 0
        });
        game.physics.p2.createContactMaterial(ctx.weaponMaterial, ctx.groundMaterial, {
            friction: 1,
            restitution: 0
        });

        game.physics.p2.world.defaultContactMaterial.friction = 0.5;

        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.setMinMax(800, 600, 1920, 1080);

        game.stage.backgroundColor = '#000000';
        game.stage.disableVisibilityChange = true;

        ctx.bg = game.add.tileSprite(0, 0, 1024, 768, 'background');
        ctx.bg.fixedToCamera = true;

        ctx.map = game.add.tilemap('lvl2');
        ctx.map.addTilesetImage('tiles-1');
        ctx.map.setCollisionBetween(1, 68, true, 'lvl2');

        ctx.layer = ctx.map.createLayer('lvl2');
        ctx.layer.renderSettings.enableScrollDelta = false;
        ctx.layer.resizeWorld();
        game.physics.p2.setBoundsToWorld(true, true, true, true, false);

        let layerTiles = game.physics.p2.convertTilemap(ctx.map, ctx.layer);

        layerTiles.forEach(function (tile) {
            tile.setCollisionGroup(ctx.groundCollisionGroup);
            tile.collides([ctx.playerCollisionGroup, ctx.weaponCollisionGroup, ctx.bulletCollisionGroup]);
            tile.setMaterial(ctx.groundMaterial);
        });


        ctx.users = game.add.group();
        ctx.weapons = game.add.group();
        ctx.bullets = game.add.group();
        /**
         * ==========game init block=========
         */

        /**
         * =============ctx.player init block=========
         */
        ctx.player = new Player(ctx.globalPlayerName, undefined, 1, 100, ctx);
        game.camera.follow(ctx.player.sprite);
        /**
         * =============ctx.player init block=========
         */

        /**
         * ==========ctx.weapons init block===============
         */

        for (let key in mapService.forest.weapons) {
            let newWeapon = ctx.weapons.create(mapService.forest.weapons[key].x, mapService.forest.weapons[key].y, 'weapon', mapService.forest.weapons[key].frame);
            newWeapon.guid = ctx.guid();
            newWeapon.fireRate = mapService.forest.weapons[key].fireRate;
            newWeapon.damage = mapService.forest.weapons[key].damage;
        }

        game.physics.p2.enable(ctx.weapons);
        ctx.weapons.setAll('anchor.x', 0.5);
        ctx.weapons.setAll('anchor.y', 0.5);
        ctx.weapons.setAll('checkWorldBounds', true);
        ctx.weapons.setAll('body.fixedRotation', true);
        ctx.weapons.forEach(function (weapon) {
            // weapon.body.setCircle(15);
            weapon.body.setCollisionGroup(ctx.weaponCollisionGroup);
            weapon.body.collides([ctx.weaponCollisionGroup, ctx.groundCollisionGroup, ctx.playerCollisionGroup]);
            weapon.body.setMaterial(ctx.weaponMaterial);
            weapon.body.createGroupCallback(ctx.playerCollisionGroup, ctx.getWeapon);
        });
        /**
         * ==========ctx.weapons init block===============
         */


        /**
         * ============ctx.bullets init block============
         */
        ctx.bullets.enableBody = true;
        ctx.bullets.physicsBodyType = Phaser.Physics.P2JS;
        ctx.bullets.createMultiple(100, 'bullet', 0, false);
        ctx.bullets.setAll('anchor.x', 0.5);
        ctx.bullets.setAll('anchor.y', 0.5);
        ctx.bullets.setAll('checkWorldBounds', true);
        ctx.bullets.setAll('outOfBoundsKill', true);
        ctx.bullets.setAll('scale.x', 0.5);
        ctx.bullets.setAll('scale.y', 0.5);
        ctx.bullets.setAll('body.fixedRotation', true);
        ctx.bullets.forEach(function (bullet) {
            bullet.body.setCollisionGroup(ctx.bulletCollisionGroup);
            bullet.body.collides([ctx.groundCollisionGroup, ctx.playerCollisionGroup]);
            bullet.body.setMaterial(ctx.bulletMaterial);
            bullet.body.createGroupCallback(ctx.groundCollisionGroup, ctx.removeBullet);
            bullet.body.createGroupCallback(ctx.playerCollisionGroup, ctx.hitUser);
        });
        /**
         * ============ctx.bullets init block============
         */
        
    },

    update: function update() {
        const angle = ctx.angleToPointer(ctx.player.sprite);

        if (keys.up.isDown && ctx.checkIfCanJump() && game.time.now > this.jumpTimer) {
            ctx.player.sprite.body.moveUp(700);
            this.jumpTimer = game.time.now + 750;
        }

        if (keys.right.isDown) {
            if (keys.up.isUp) {
                ctx.player.sprite.children[1].animations.play('move');
            }
            else {
                ctx.player.sprite.children[1].animations.stop();
            }
            ctx.player.sprite.body.moveRight(ctx.moveSpeed);
            ctx.player.facing = 1;
            ctx.player.sprite.scale.x = 1;
        }
        else if (keys.left.isDown) {
            if (keys.up.isUp) {
                ctx.player.sprite.children[1].animations.play('move');
            }
            else {
                ctx.player.sprite.children[1].animations.stop();
            }
            ctx.player.sprite.body.moveLeft(ctx.moveSpeed);
            ctx.player.facing = -1;
            ctx.player.sprite.scale.x = -1;
        }
        else {
            ctx.player.sprite.children[1].frame = 0;
            ctx.player.sprite.children[1].animations.stop()
        }

        if (keys.lmb.isDown && ctx.player && ctx.player.sprite.body && ctx.player.sprite.body.weapon && ctx.player.sprite.health > 0) {
            ctx.player.isFiring = true;
            ctx.fire(ctx.player);
        }
        else {
            ctx.player.isFiring = false;
        }

        if (keys.drop.isDown && ctx.player && ctx.player.sprite.body && ctx.player.sprite.body.weapon && ctx.player.sprite.health > 0) {
            ctx.dropWeapon(ctx.globalPlayerName, 80, true)
        }

        ctx.player.sprite.label.alignTo(ctx.player.sprite, Phaser.BOTTOM_CENTER, 0, 50);

        ctx.player.sprite.children.forEach(function (sprite) {
            if (sprite.key !== 'jackBeardBody') {
                if (ctx.player.facing === 1 && (angle > -1.2 && angle < 1.2)) {
                    sprite.scale.x = 1;
                    sprite.rotation = game.physics.arcade.angleToPointer(ctx.player.sprite);
                }
                if (ctx.player.facing === 1 && (angle < -1.2 || angle > 1.2)) {
                    sprite.scale.x = -1;
                    sprite.rotation = Math.PI + game.physics.arcade.angleToPointer(ctx.player.sprite);
                }
                if (ctx.player.facing === -1 && (angle > Math.PI - 1.2 || angle < 1.2 - Math.PI)) {
                    sprite.scale.x = 1;
                    sprite.rotation = Math.PI - game.physics.arcade.angleToPointer(ctx.player.sprite);
                }
                if (ctx.player.facing === -1 && (angle < Math.PI - 1.2 && angle > 1.2 - Math.PI)) {
                    sprite.scale.x = -1;
                    sprite.rotation = -game.physics.arcade.angleToPointer(ctx.player.sprite);
                }
            }
        });
    }


};