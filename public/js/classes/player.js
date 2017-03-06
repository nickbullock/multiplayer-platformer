class Player {
    constructor(name, color, facing, health, ctx) {
        this.name = name;

        const textStyle = {
            font: '16px Arial',
            fill: '#ffffff',
            align: 'center'
        };

        this.color = color;
        this.sprite = ctx.users.create(0, 0);
        game.physics.p2.enable(this.sprite);

        this.sprite.name = this.name;
        this.sprite.checkWorldBounds = true;
        this.sprite.body.x = Math.floor(Math.random() * (1000 - 80 + 1)) + 80;
        this.sprite.body.y = Math.floor(Math.random() * (150 - 100 + 1)) + 100;
        this.sprite.body.collideWorldBounds = true;
        this.sprite.body.setRectangle(40, 75, 0, 0);
        this.sprite.anchor.setTo(0.5, 0.5);
        this.sprite.body.fixedRotation = true;
        this.sprite.body.mass = 5;
        this.sprite.body.setCollisionGroup(ctx.playerCollisionGroup);
        this.sprite.body.collides([ctx.playerCollisionGroup, ctx.groundCollisionGroup, ctx.weaponCollisionGroup, ctx.bulletCollisionGroup]);
        this.sprite.body.setMaterial(ctx.playerMaterial);

        this.backArm = game.add.sprite(3, -3, 'jackBeardBackArm');
        this.body = game.add.sprite(4, 15, 'jackBeardBody');
        this.head = game.add.sprite(0, -15, 'jackBeardHead');
        this.frontArm = game.add.sprite(0, 0, 'jackBeardFrontArm');

        this.backArm.anchor.setTo(0.4, 0.5);
        this.frontArm.anchor.setTo(0.4, 0.5);
        this.body.anchor.setTo(0.5, 0.5);
        this.head.anchor.setTo(0.5, 0.51);

        this.sprite.addChild(this.backArm);
        this.sprite.addChild(this.body);
        this.sprite.addChild(this.head);
        this.sprite.addChild(this.frontArm);

        this.facing = facing;
        this.sprite.health = health;

        this.sprite.label = game.add.text(0, 0, this.name, textStyle);
        this.sprite.label.anchor.set(0.5);

        this.sprite.children[1].animations.add('move', [1,2,3,4,5,6,7,8], 20, true);

        if(this.sprite.body && name !== ctx.globalPlayerName){
            this.sprite.body.static = true;
        }

        return this;
    }

    updatePlayer(name, rotation, facing, health, x, y, isFiring) {
        let user = ctx.users[name];

        user.sprite.children.forEach(function (sprite) {
            if (sprite.key !== 'jackBeardBody') {
                sprite.rotation = rotation;
            }
        });

        if (user.sprite.body && Math.round(user.sprite.previousPosition.x) === Math.round(x)) {
            user.sprite.children[1].frame = 0;
            user.sprite.children[1].animations.stop()
        }
        else if (facing === 1 && user.sprite.children[1]) {
            user.sprite.children[1].animations.play('move');
            user.sprite.scale.x = 1;
            user.facing = 1;
        }
        else if (facing === -1 && user.sprite.children[1]) {
            user.sprite.children[1].animations.play('move');
            user.sprite.scale.x = -1;
            user.facing = -1;
        }

        if (user.sprite.body) {
            user.sprite.body.x = x;
            user.sprite.body.y = y;
        }
        user.sprite.health = health;

        user.sprite.label.alignTo(user.sprite, Phaser.BOTTOM_CENTER, 0, 50);

        if (isFiring && health > 0 && user.sprite.alive) {
            ctx.fire(user)
        }

        return user;
    }

    disconnect() {
        let user = ctx.users[this.name];
        if (user) {
            if (user.sprite.body && user.sprite.body.weapon) {
                ctx.dropWeapon(this.name, 0, false);
            }
            user.sprite.destroy();
            user.sprite.label.destroy();
        }
    }
}