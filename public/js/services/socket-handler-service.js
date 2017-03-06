
var socketInit = function(){

    const socket = socketCluster.connect();

    /**
     * =============socket interaction block=============
     */
    socket.subscribe(ctx.getUserPresenceChannelName(ctx.globalPlayerName)).watch(function (userData) {
        if (userData === "kill") {
            if (ctx.player.sprite.alive) {
                ctx.player.sprite.kill();
                ctx.player.sprite.label.kill();
            }
        }
        else {
            ctx.weapons.removeAll(true);

            if (userData.weapons && Array.isArray(userData.weapons)) {
                userData.weapons.forEach(function (weaponFromServer) {
                    let newWeapon = ctx.weapons.create(weaponFromServer.x, weaponFromServer.y, 'weapon', weaponFromServer.index);
                    newWeapon.guid = weaponFromServer.guid;
                    newWeapon.fireRate = weaponFromServer.fireRate;
                    newWeapon.damage = weaponFromServer.damage;
                });

                game.physics.p2.enable(ctx.weapons);
                ctx.weapons.setAll('anchor.x', 0.5);
                ctx.weapons.setAll('anchor.y', 0.5);
                ctx.weapons.setAll('checkWorldBounds', true);
                ctx.weapons.setAll('body.fixedRotation', true);
                ctx.weapons.forEach(function (weapon) {
                    weapon.body.setCollisionGroup(ctx.weaponCollisionGroup);
                    weapon.body.collides([ctx.weaponCollisionGroup, ctx.groundCollisionGroup, ctx.playerCollisionGroup]);
                    weapon.body.setMaterial(ctx.weaponMaterial);
                    weapon.body.createGroupCallback(ctx.playerCollisionGroup, ctx.getWeapon);
                });
            }

            ctx.playerCreateUpdateHandler(userData);
        }
    });
    socket.subscribe("drop").watch(function (username) {
        if (username !== ctx.globalPlayerName) {
            ctx.dropWeapon(username, 80, false);
        }
    });

    socket.subscribe('player-join').watch(function (userData) {
        if (userData && ctx.player && userData.name != ctx.globalPlayerName) {
            ctx.playerCreateUpdateHandler(userData);
            const initDataToNewPlayer = {
                name: ctx.globalPlayerName,
                x: ctx.player.x,
                y: ctx.player.y,
                facing: ctx.player.facing,
                spriteType: ctx.player.spriteType,
                rotation: ctx.player.sprite.children[0].rotation,
                health: ctx.player.sprite.health,
                isFiring: ctx.player.isFiring,
                weapons: ctx.weapons.children.map(function (weapon) {
                    return {
                        guid: weapon.guid,
                        fireRate: weapon.fireRate,
                        damage: weapon.damage,
                        index: weapon._frame.index,
                        x: ctx.player.sprite.body.weapon && (weapon.guid === ctx.player.sprite.body.weapon.guid) ? ctx.player.sprite.body.weapon.previousPosition.x : weapon.x,
                        y: ctx.player.sprite.body.weapon && (weapon.guid === ctx.player.sprite.body.weapon.guid) ? ctx.player.sprite.body.weapon.previousPosition.y : weapon.y
                    }
                })
            };

            socket.publish(ctx.getUserPresenceChannelName(userData.name), initDataToNewPlayer);
        }
    });

    socket.subscribe('player-leave').watch(function (userData) {
        if (ctx.player && userData.name !== ctx.globalPlayerName) {
            ctx.users[userData.name].disconnect()
        }
    });

    socket.subscribe('player-positions').watch(function (userDataList) {
        if (ctx.player) {
            userDataList.forEach(function (userData) {
                if (userData.name != ctx.globalPlayerName) {
                    ctx.playerCreateUpdateHandler(userData);
                }
            });
        }
    });

    socket.emit('join', {
        name: ctx.globalPlayerName,
        x: ctx.player.x,
        y: ctx.player.y,
        facing: ctx.player.facing,
        spriteType: ctx.player.spriteType,
        rotation: ctx.player.sprite.children[0].rotation,
        isFiring: ctx.player.isFiring,
        health: ctx.player.sprite.health
    });

    function sendPlayerMove() {
        socket.emit('move', {
            x: ctx.player.sprite.body.x,
            y: ctx.player.sprite.body.y,
            facing: ctx.player.facing,
            spriteType: ctx.player.spriteType,
            rotation: ctx.player.sprite.children[0].rotation,
            isFiring: ctx.player.isFiring,
            health: ctx.player.sprite.health
        });
    }

    setInterval(function () {
            sendPlayerMove();
        },
        10);
    /**
     * =============socket interaction block=============
     */
};

