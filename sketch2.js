// === Fireball stage ===
let moveSound;
let player;
let bg;
let sprites = {};
let eyebox;
let eyeball;
let fireballs = [];
let fireballImg;
let particles = [];
let lives = 3;
let gameOver = false;
let shieldImg;
let maxLives = 3;
let transitioning = false;
let fadeAlpha = 0;
let fadeIn = true;
let fadeInAlpha = 255;
let fireSound;
let fireSoundPlayed = false;
let hurtSound;
// === Dialogue system ===
let dialogues = [
  { speaker: "queen", text: "Enough of doubts and tears then. His absence burns me now more than it breaks me." },
  { speaker: "queen", text: "How dare he leave me to rule alone? To carry the weight of crown while he hides across the board." },
  { speaker: "queen", text: "Every promise, every vow, turned to ash… and I am left with nothing but fire." },
  { speaker: "queen", text: "Let the board burn, let the pieces scatter—I care not who is caught beneath the flames." },
  { speaker: "pawn", text: "Little pawn, avoid the flames! Get to the other side, where safety lies!" }
];

let currentDialogue = 0;
let showingDialogue = true;
let currentText = "";
let charIndex = 0;
let lastCharTime = 0;
let charDelay = 40;
let typeSound;
let queenHead, pawnHead;

function preload() {
  hurtSound = loadSound("sound/hurt.wav");
  fireSound = loadSound("sound/fire.mp3");
  novaCut = loadFont('assets/NovaCut-Regular.ttf');
  bg = loadImage('assets/mapwet.png');
  bgmusic = loadSound('sound/nwhere-318242.mp3');
  moveSound = loadSound("sound/move.wav");
  typeSound = loadSound("sound/dialogue.wav");
  eyebox = loadImage("assets/angryeyes.gif");
  eyeball = loadImage("assets/eyeball.png");
  fireballImg = loadImage("assets/fireball.gif");
  shieldImg = loadImage("assets/shield.png");

  queenHead = loadImage("assets/queenheadangry.png");
  pawnHead = loadImage("assets/narrator.png");

  // Standing sprites
  sprites.front = loadImage("assets/pawnfrontwet.png");
  sprites.back = loadImage("assets/pawnback.png");
  sprites.left = loadImage("assets/pawnturnleft.png");
  sprites.right = loadImage("assets/pawnturnright.png");

  // Walking gifs
  sprites.walkFront = loadImage("assets/walkfrontwet.gif");
  sprites.walkBack = loadImage("assets/walkback.gif");
  sprites.walkLeft = loadImage("assets/walkleft.gif");
  sprites.walkRight = loadImage("assets/walkright.gif");
}

function setup() {
  //createCanvas(windowHeight, windowHeight);
  createCanvas(800, 800);
  bgmusic.loop();   // loops forever
  bgmusic.setVolume(0.5); // 0.0 = mute, 1.0 = full volume
  noSmooth();
  player = {
    x: width / 2,
    y: height - 100,
    speed: 4,
    currentSprite: sprites.front,
    facing: "front",
    scale: 0.5
  };

  angleMode(DEGREES);
  imageMode(CENTER);
}

function draw() {
  if (gameOver) {
    if (bgmusic.isPlaying()) bgmusic.stop();
    if (moveSound.isPlaying()) moveSound.stop();
    if (fireSound.isPlaying()) fireSound.stop();
    if (hurtSound.isPlaying()) hurtSound.stop();
    if (typeSound.isPlaying()) typeSound.stop();
    background(249, 251, 266);
    fill(42, 31, 45);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("The blow landed where it shouldn't.", width / 2, height / 2);
    text("Press Z and keep going?", width / 2, height / 2 + 40);
    return;
  }

  background(200);
  imageMode(CENTER);
  image(bg, width / 2, height / 2, width, height);

  if (transitioning) {
    fadeAlpha += 5;
    if (fadeAlpha >= 255) {
      window.location.href = "theking.html";
    }
  }

      // Draw player
    imageMode(CENTER);
    image(
      player.currentSprite,
      player.x,
      player.y,
      player.currentSprite.width * player.scale,
      player.currentSprite.height * player.scale
    );


  if (showingDialogue) {
    typeWriterEffect();
    drawDialogueBox();
  } else {
    // Movement + animation
    handleInput();

    // Fireballs
    updateFireballs();
    drawFireballs();

    // Eyebox
    imageMode(CENTER);
    image(eyebox, width / 2, width / 6, eyebox.width * 0.5, eyebox.height * 0.5);

    // Eyeballs tracking player
    let eyeX = width / 3.2;
    let eyeY = width / 6.5;
    let dx = player.x - eyeX;
    let dy = player.y - eyeY;
    let maxOffsetX = 30;
    let maxOffsetY = 11;
    let mag = sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx = (dx / mag) * maxOffsetX;
      dy = (dy / mag) * maxOffsetY;
    }
    image(eyeball, eyeX + dx, eyeY + dy, eyeball.width * 0.7, eyeball.height * 0.7);
    image(eyeball, width / 1.5 + dx, eyeY + dy, eyeball.width * 0.7, eyeball.height * 0.7);

    // Shields
    drawShields();

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 5;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      noStroke();
      fill(200, p.alpha);
      rect(p.x, p.y, p.size, p.size);
    }
  }

  // Fade in
  if (fadeIn) {
    fadeInAlpha -= 5;
    if (fadeInAlpha <= 0) {
      fadeInAlpha = 0;
      fadeIn = false;
    }
    noStroke();
    fill(0, fadeInAlpha);
    rect(0, 0, width, height);
  }

  if (transitioning) {
    noStroke();
    fill(0, fadeAlpha);
    rect(0, 0, width, height);
  }

  // Check if player is moving
  let moving = keyIsDown(65) || keyIsDown(68) || keyIsDown(87) || keyIsDown(83) || // WASD
               keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW) || keyIsDown(UP_ARROW) || keyIsDown(DOWN_ARROW);

  if (moving) {
    if (!moveSound.isPlaying()) {
      moveSound.loop();
    }
  } else {
    if (moveSound.isPlaying()) {
      moveSound.stop();
    }
  }

  if (!showingDialogue && !fireSoundPlayed) {
    fireSound.loop();
    fireSoundPlayed = true;
  }
}


function handleInput() {
  let moving = false;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) {
    player.y -= player.speed;
    player.currentSprite = sprites.walkBack;
    player.facing = "back";
    moving = true;
  } else if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) {
    player.y += player.speed;
    player.currentSprite = sprites.walkFront;
    player.facing = "front";
    moving = true;
  } else if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) {
    player.x -= player.speed;
    player.currentSprite = sprites.walkLeft;
    player.facing = "left";
    moving = true;
  } else if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) {
    player.x += player.speed;
    player.currentSprite = sprites.walkRight;
    player.facing = "right";
    moving = true;
  }

  let halfW = (player.currentSprite.width * player.scale) / 2;
  let halfH = (player.currentSprite.height * player.scale) / 2;
  player.x = constrain(player.x, halfW, width - halfW);
  player.y = constrain(player.y, halfH, height - halfH);

  if (!transitioning && player.y - halfH <= 0) {
    transitioning = true;
  }

  if (!moving) {
    if (player.facing === "front") player.currentSprite = sprites.front;
    if (player.facing === "back") player.currentSprite = sprites.back;
    if (player.facing === "left") player.currentSprite = sprites.left;
    if (player.facing === "right") player.currentSprite = sprites.right;
  }
}
function updateFireballs() {
  // Spawn new fireballs only if not transitioning
  if (!transitioning && frameCount % 30 === 0) {
    let amount = floor(random(2, 5));
    for (let i = 0; i < amount; i++) {
      fireballs.push({
        x: random(50, width - 50),
        y: -50,
        speed: random(4, 6),
        size: random(50, 70),
        shrinkRate: 4,
        stopY: height - random(50, 800),
        state: "falling",
        trail: []
      });
    }
  }

  for (let i = fireballs.length - 1; i >= 0; i--) {
    let f = fireballs[i];

    if (f.state === "falling") {
      f.y += f.speed;
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > 15) f.trail.shift();

      // Only hurt player if not transitioning
      if (!transitioning) {
        let d = dist(player.x, player.y, f.x, f.y);
        if (d < 40) {
          lives--;
          hurtSound.play();
          fireballs.splice(i, 1);
          if (lives <= 0) gameOver = true;
          continue;
        }
      }

      // Switch to shrinking once stopped
      if (f.y >= f.stopY) {
        f.y = f.stopY;
        f.state = "shrinking";
        f.trail = [];
      }
    } else if (f.state === "shrinking") {
      f.size -= f.shrinkRate;
      if (f.size <= 0) {
        for (let p = 0; p < 10; p++) {
          particles.push({
            x: f.x,
            y: f.y,
            vx: random(-1, 1),
            vy: random(-2, -0.5),
            alpha: 255,
            size: random(10, 18)
          });
        }
        fireballs.splice(i, 1);
        continue;
      }
    }
  }
}


function drawFireballs() {
  for (let f of fireballs) {
    if (f.state === "falling") {
      for (let t = 0; t < f.trail.length; t++) {
        let pos = f.trail[t];
        let alpha = map(t, 0, f.trail.length - 1, 50, 200);
        tint(255, alpha);
        image(fireballImg, pos.x, pos.y, f.size * 0.5, f.size * 0.5);
      }
      noTint();
    }
    image(fireballImg, f.x, f.y, f.size, f.size);
  }
}

function drawShields() {
  let shieldSize = 50;
  let spacing = 10;
  let startX = 80;
  let startY = height - shieldSize - 20;

  for (let i = 0; i < maxLives; i++) {
    let x = startX + i * (shieldSize + spacing);
    let y = startY;
    if (i < lives) {
      tint(255, 255);
    } else {
      tint(255, 80);
    }
    image(shieldImg, x, y, shieldSize, shieldSize);
  }
  noTint();
}

// === Dialogue functions ===
function typeWriterEffect() {
  if (charIndex < dialogues[currentDialogue].text.length) {
    if (millis() - lastCharTime > charDelay) {
      currentText += dialogues[currentDialogue].text.charAt(charIndex);
      charIndex++;
      lastCharTime = millis();

      // Start typewriter sound if not already playing
      if (!typeSound.isPlaying()) {
        typeSound.loop();
      }
    }
  } else {
    // Stop sound when finished typing
    if (typeSound.isPlaying()) {
      typeSound.stop();
    }
  }
}


function drawDialogueBox() {
  let boxW = width * 0.8;
  let boxH = 140;
  let boxX = width / 2 - boxW / 2;
  let boxY = 100;

  fill(42, 31, 45);
  stroke(255);
  strokeWeight(3);
  rect(boxX, boxY, boxW, boxH);

  let speaker = dialogues[currentDialogue].speaker;
  let portrait = speaker === "queen" ? queenHead : pawnHead;
  imageMode(CORNER);
  image(portrait, boxX, boxY - 52);

  fill(255);
  noStroke();
  textFont(novaCut);
  textSize(22);
  textAlign(LEFT, TOP);
  let textX = boxX + 140;
  let textY = boxY + 30;
  let textW = boxW - 180;
  text(currentText, textX, textY, textW, boxH - 40);

  if (charIndex >= dialogues[currentDialogue].text.length) {
    textSize(16);
    fill(200);
    textAlign(RIGHT, BOTTOM);
    text("Press Z to continue", boxX + boxW - 20, boxY + boxH - 10);
  }
}

function keyPressed() {
  if (showingDialogue && (key === 'z' || key === 'Z')) {
    if (charIndex < dialogues[currentDialogue].text.length) {
      currentText = dialogues[currentDialogue].text;
      charIndex = dialogues[currentDialogue].text.length;

      if (typeSound.isPlaying()) {
        typeSound.stop();
      }
    } else {
      currentDialogue++;
      if (currentDialogue >= dialogues.length) {
        showingDialogue = false;
      } else {
        currentText = "";
        charIndex = 0;
      }
    }
  } else if (gameOver && (key === 'z' || key === 'Z')) {
    location.reload();
  }
}
