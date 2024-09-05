// Main Menu Scene
const MenuScene = new Phaser.Scene('MenuScene');

MenuScene.preload = function() {
    // Load assets for the menu, if any
    this.load.image('menuBackground', 'Images/MenuBackground.png');
};

MenuScene.create = function() {
    // Add a background image or color
    this.add.image(400, 300, 'menuBackground');

    // Add the title text
    this.add.text(400, 150, 'Space Defender', { fontSize: '64px', fill: '#000', fontStyle: 'bold'}).setOrigin(0.5);

    // Add the "Start Game" option
    let startText = this.add.text(400, 300, 'Start Game', { fontSize: '32px', fill: '#FFF' }).setOrigin(0.5);
    startText.setInteractive();
    startText.on('pointerdown', () => {
        this.scene.start('GameScene');
    });

    // Optionally, add an instructions option
    let instructionsText = this.add.text(400, 400, 'Instructions', { fontSize: '32px', fill: '#FFF' }).setOrigin(0.5);
    instructionsText.setInteractive();
    instructionsText.on('pointerdown', () => {
        // Display instructions or switch to an instructions scene
    });

    // Optionally, add a quit option
    let quitText = this.add.text(400, 500, 'Quit', { fontSize: '32px', fill: '#FFF' }).setOrigin(0.5);
    quitText.setInteractive();
    quitText.on('pointerdown', () => {
        // Handle quitting the game, if applicable
    });
};

// Game Scene
const GameScene = new Phaser.Scene('GameScene');

// Updated game config to include the MenuScene and GameScene
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: [MenuScene, GameScene] // Add both scenes
};

// Create a new Phaser game instance with the updated config
const game = new Phaser.Game(config);

// Define the 4 sides of the screen
const LEFT_SIDE = 0;
const RIGHT_SIDE = config.width;
const TOP_SIDE = 0;
const BOTTOM_SIDE = config.height;

// Set up the game's variables 
let player;
let shield;
let cursors;
let bullets;
let alienBullets;
let aliens;
let asteroids;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0; // Retrieve high score from local storage
let scoreText;
let highScoreText;
let timerText;
let lastShot = 0;
let player_shot = 0;
let startTime; // Variable to track the start time
let gameOverFlag = false; // Flag to check if the game is over
let shieldHits


// Your existing preload function
GameScene.preload = function() {
    // Load images for the game objects
    this.load.image('background', 'Images/background.jpg');
    this.load.image('player', 'Images/Bat.png');
    this.load.image('bullet', 'Images/player_bullet_fixed.png');
    this.load.image('alien', 'Images/aliens.png');
    this.load.image('asteroid', 'Images/asteroid.png');
    this.load.image('alienBullet', 'Images/alien_bullet_fixed.png');
    this.load.image('shieldPickup', 'Images/shield.png');
    this.load.image('bombPickup', 'Images/bomb.png');
    this.load.image('lifePickup', 'Images/extraLife.png');
    this.load.image('threeShot', 'Images/ThreeShot.png');
    this.load.image('bonusPickup', 'Images/bonusPoints.png');
    this.load.image('rapidPickup', 'Images/RapidFire.png');
    this.load.image('fakePickup', 'Images/fake.png');
    this.load.image('shield', 'Images/shieldSprite.png');

    // Load Audio for the game
    this.load.audio('shootSound', 'Audio/laserShoot.wav');
};

// Your existing create function
GameScene.create = function() {
    gameOverFlag = false; // Reset the game-over flag at the start

    // Start the timer
    startTime = this.time.now;

    // Add background image
    this.add.image(400, 300, 'background');

    // Add the shoot sound to the scene
    this.shootSound = this.sound.add('shootSound');

    // Add the player sprite and enable physics
    player = this.physics.add.sprite(400, 550, 'player');
    player.setCollideWorldBounds(true);

    // Set a smaller collision box
    player.setSize(40, 40); // Adjust size to fit the visible part of your sprite
    player.setOffset(10, 10); // Optional: Offset if the sprite's visible part is not centered

    // Set up keyboard input
    cursors = this.input.keyboard.createCursorKeys();

    // Create groups for bullets, alien bullets, aliens, and asteroids
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 10
    });
    alienBullets = this.physics.add.group({
        defaultKey: 'alienBullet',
        maxSize: 50
    });
    aliens = this.physics.add.group();
    asteroids = this.physics.add.group();

    // Add text to display the score, high score and timer
    if (gameOverFlag == false) {
        scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '32px', fill: '#FFF' });
        highScoreText = this.add.text(10, 50, `High Score: ${highScore}`, { fontSize: '32px', fill: '#FFF' });
    }
    timerText = this.add.text(680, 10, '00:00', { fontSize: '32px', fill: '#FFF' });

    // Periodically add aliens and asteroids to the game
    this.alienTimer = this.time.addEvent({
        delay: Phaser.Math.Between(1000, 3000),
        callback: addAlien,
        callbackScope: this,
        loop: true
    });
    this.asteroidTimer = this.time.addEvent({
        delay: Phaser.Math.Between(500, 2000),
        callback: addAsteroid,
        callbackScope: this,
        loop: true
    });

    // Add power ups into the game
    this.powerTimer = this.time.addEvent({
        delay: Phaser.Math.Between(15000, 30000),
        callback: spawnPowerup,
        callbackScope: this,
        loop: true
    });

    // Set up collision detection between game objects
    this.physics.add.overlap(bullets, aliens, destroyAlien, null, this);
    this.physics.add.overlap(bullets, asteroids, destroyAsteroid, null, this);
    this.physics.add.overlap(player, aliens, gameOver, null, this);
    this.physics.add.overlap(player, asteroids, gameOver, null, this);
    this.physics.add.overlap(player, alienBullets, gameOver, null, this);
    
    // Enable visual debugging
    this.physics.world.createDebugGraphic();

    // Correct the size of hitbox and change positioning
    player.setSize(60,50)
    player.setOffset(2.5,10); 


};

// Your existing update function
GameScene.update = function(time) {
    if (gameOverFlag) {
        // If game over, don't update game logic
        return; // Exit the update function early
    }

    // Handle player movement
    if (cursors.left.isDown) {
        player.setVelocityX(-200);
    } else if (cursors.right.isDown) {
        player.setVelocityX(200);
    } else {
        player.setVelocityX(0);
    }

    if (cursors.up.isDown) {
        player.setVelocityY(-200);
    } else if (cursors.down.isDown) {
        player.setVelocityY(200);
    } else {
        player.setVelocityY(0);
    }

    // Handle shooting bullets
    if (cursors.space.isDown && time > lastShot) {
        let bullet;
        // Alternating bullet positions
        if (player_shot % 2 == 0) {
            bullet = bullets.get(player.x - 25, player.y - 20); 
        } else {
            bullet = bullets.get(player.x + 25, player.y - 20);
        }

        if (bullet) {
            
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.body.enable = true; // Re-enable the physics body of the bullet
            bullet.body.velocity.y = -300;
            lastShot = time + 400;
            player_shot += 1;

            // Play the shoot sound
            this.shootSound.play();

            // Set a smaller collision box 
            bullet.setSize(10,40);
        }
    }

    // Deactivate bullets that move off-screen
    bullets.children.iterate(function (child) {
        if (child && child.active && child.y < 0) {
            child.setActive(false);
            child.setVisible(false);
        }
    });

    // Deactivate alien bullets that move off-screen
    alienBullets.children.iterate(function (child) {
        if (child && child.active && child.y > 600) {
            child.setActive(false);
            child.setVisible(false);
        }
    });

    // Update the game timer based on the start time
    let elapsed = time - startTime;
    let seconds = Math.floor(elapsed / 1000 % 60);
    let minutes = Math.floor(elapsed / 60000 % 24);
    timerText.setText(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

    // Ensure aliens change direction when hitting the screen edges
    aliens.children.iterate(function (alien) {
        if (alien.x - 25 <= LEFT_SIDE) {
            alien.setVelocityX(Phaser.Math.Between(50, 100));
        } else if (alien.x + 25 >= RIGHT_SIDE) {
            alien.setVelocityX(Phaser.Math.Between(-100, -50));
        }
    });

    if (shield) {
        shield.x = player.x
        shield.y = player.y
    }
};

function randomSpawn(spriteName) {
    return this.physics.add.sprite(Phaser.Math.Between(0, 800), Phaser.Math.Between(0, 600), spriteName);
}

function spawnPowerup(){
    let randomPower = Phaser.Math.Between(1, 1);
    if (randomPower == 1) {
        // Shield
        shieldPickup = randomSpawn.call(this, 'shieldPickup')
        this.physics.add.overlap(player, shieldPickup, shieldCreate, null, this);
    } 
    else if (randomPower == 2) {
        // Kill All
        bombPickup = randomSpawn.call(this, 'bombPickup')
        this.physics.add.overlap(player, bombPickup, killAll, null, this);
    }
    else if (randomPower == 3) {
        // Extra Life
        lifePickup = randomSpawn.call(this, 'lifePickup')
        this.physics.add.overlap(player, lifePickup, extraLife, null, this);
    }
    else if (randomPower == 4) {
        // 3 Shot
        threeShotPickup = randomSpawn.call(this, 'threeShot')
        this.physics.add.overlap(player, threeShotPickup, multiShoot, null, this);
    }
    else if (randomPower == 5) {
        // Double Points
        bonusPickup = randomSpawn.call(this, 'bonusPickup')
        this.physics.add.overlap(player, bonusPickup, doublePoints, null, this);
    }
    else if (randomPower == 6) {
        // Rapid Fire
        rapidPickup = randomSpawn.call(this, 'rapidPickup')
        this.physics.add.overlap(player, rapidPickup, rapidFire, null, this);
    }
    else {
        // Fake Power Up
        fakePickup = randomSpawn.call(this, 'fakePickup')
        this.physics.add.overlap(player, fakePickup, shield, null, this);
    }
}

function shieldCreate(player, shieldPickup) {
    // Check if a shield already exists
    if (!shield) {
        // Create the shield and position it around the player
        shield = this.physics.add.sprite(player.x, player.y, 'shield');
        shield.setCollideWorldBounds(true); // Prevent the shield from going out of bounds

        shieldHits = 0; // Initialize shield hits to 0

        // Set up collisions with the shield for bullets, aliens, and asteroids
        this.physics.add.overlap(shield, aliens, hitShield, null, this);
        this.physics.add.overlap(shield, alienBullets, hitShield, null, this);
        this.physics.add.overlap(shield, asteroids, hitShield, null, this);

        // Set a timer to remove the shield after 12.5 seconds
        this.time.delayedCall(10000, function() {
            if (shield) {
                shield.destroy();
                shield = null;
            }
        }, [], this);
    }

    // Remove the shield power-up from the game
    // Destroy the power-up sprite after it's collected
    shieldPickup.destroy(); 
}

function hitShield(shield, object) {
    // Check if the object is an alien, alien bullet, or asteroid
    if (object) {
        object.destroy();  // Destroy the object upon collision

        // Increment the shield hit counter
        shieldHits += 1;
        
        if (shieldHits >= 10) {
            // Destroy the shield after 10 hits
            shield.destroy();
            shield = null; // Reset the shield variable
        }
    }
}



function addAlien() {
    // Add a new alien at a random position
    let alien = aliens.create(Phaser.Math.Between(0, 800), 50, 'alien');
    let randomDirection = Phaser.Math.Between(1, 2);

    // Set random horizontal velocity for the alien
    if (randomDirection == 1) {
        alien.setVelocityX(Phaser.Math.Between(50, 200));
    } else {
        alien.setVelocityX(Phaser.Math.Between(-50, -200));
    }

    // Assign a unique shooting timer for each alien
    alien.shootTimer = this.time.addEvent({
        delay: Phaser.Math.Between(1000, 3000),
        callback: alienShoot,
        args: [alien],
        callbackScope: this,
        loop: true
    });
}

function alienShoot(alien) {
    // Aliens shoot bullets downwards
    if (!alien.active) return; // Ensure the alien is still active

    if (gameOverFlag) return;

    let alienBullet = alienBullets.get(alien.x, alien.y + 20);

    if (alienBullet) {
        alienBullet.setActive(true);
        alienBullet.setVisible(true);
        alienBullet.body.velocity.y = 300; // Set bullet velocity
        // Set a smaller collision box 
        alienBullet.setSize(10,40);
    }
}

function addAsteroid() {
    // Add a new asteroid at a random position
    let asteroid = asteroids.create(Phaser.Math.Between(0, 800), -20, 'asteroid');
    asteroid.setVelocityY(Phaser.Math.Between(100, 300)); // Set random downward velocity

    // Set a smaller collision box 
    asteroid.setSize(60,60);
}

function destroyAlien(bullet, alien) {
    // Destroy bullet and alien upon collision, update score
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.body.enable = false; // Disable the physics body of the bullet

    alien.shootTimer.remove(); // Remove the shoot timer when alien is destroyed
    alien.destroy();
    score += 5;
    scoreText.setText('Score: ' + score);
}

function destroyAsteroid(bullet, asteroid) {
    // Destroy bullet and asteroid upon collision, update score
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.body.enable = false; // Disable the physics body of the bullet

    asteroid.destroy();
    score += 1;
    scoreText.setText('Score: ' + score);
}

function gameOver(player) {
    // Set game-over flag and stop the game timers
    gameOverFlag = true;

    // Hide the Score and high score text
    scoreText.setVisible(false);
    highScoreText.setVisible(false);

    // Pause the player and give red tint
    player.setVelocityX(0);
    player.setVelocityY(0);
    player.setTint(0xff0000); 

    // Pause the aliens
    aliens.setVelocityX(0);
    aliens.setVelocityY(0);

    // Pause the Astroids
    asteroids.setVelocityX(0);
    asteroids.setVelocityY(0);

    // Pause the Aliens bullets
    alienBullets.setVelocityX(0);
    alienBullets.setVelocityY(0);

    // Pause the players bullets
    bullets.setVelocityX(0);
    bullets.setVelocityY(0);

    // Stop the timers for aliens, asteroids and powerups
    this.alienTimer.remove();
    this.asteroidTimer.remove();
    this.powerTimer.remove()

    // Display game-over text
    this.add.text(400, 200, 'Game Over', { fontSize: '64px', fill: '#FFF' }).setOrigin(0.5);

    // High score update / score text
    if (score > highScore) {
        this.add.text(400, 300, `New High Score: ${highScore}`, { fontSize: '32px', fill: '#FFF' }).setOrigin(0.5);
        highScore = score;
        localStorage.setItem('highScore', highScore); // Store the new high score
    } 
    else {
        this.add.text(400, 300, `High Score: ${highScore}`, { fontSize: '32px', fill: '#FFF' }).setOrigin(0.5);
        this.add.text(400, 350, `Score: ${score}`, { fontSize: '32px', fill: '#FFF' }).setOrigin(0.5);
    }
    
    // Add the "Play Again" option
    let playagainText = this.add.text(400, 425, 'Play Again', { fontSize: '32px', fill: '#FFF' }).setOrigin(0.5);
    playagainText.setInteractive();
    playagainText.on('pointerdown', () => {
        // Stop and restart the game scene
        this.scene.stop('GameScene');
        this.scene.start('GameScene');
        score = 0
    });

    // Add the "Menu" option
    let menuText = this.add.text(400, 500, 'Menu', { fontSize: '32px', fill: '#FFF' }).setOrigin(0.5);
    menuText.setInteractive();
    menuText.on('pointerdown', () => {
        this.scene.start('MenuScene');
    });
}