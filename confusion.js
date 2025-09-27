// === Background, Walking, Collision, Spotlight ===
let moveSound;
let player;
let bg;
let sprites = {};
let transitioning = false;
let fadeAlpha = 0;
let fadeIn = true;     // start with fade-in active
let fadeInAlpha = 255; // fully black at the start

let lightsOut = false;      // spotlight effect toggle
let lightsOutTimer = 0;     // when to start shrinking
let spotlightSize;          // current spotlight diameter
let targetSpotlightSize = 220; // final size around player
let shrinkSpeed = 20;       // how fast the spotlight shrinks
let pg;                     // offscreen graphics buffer
let fireflies = [];
let firefliesActive = false;

// === Dialogue system ===
let dialogues = [
  { speaker: "queen", text: "How has it come to this?" },
  { speaker: "queen", text: "Once we moved as one. Flawless, in harmony." },
  { speaker: "queen", text: "Was it my pride that cast him away?" },
  { speaker: "queen", text: "Or blindness to his silent burdens?" },
  { speaker: "queen", text: "I trace our every move, yet the pattern slips from me." },
  { speaker: "queen", text: "Pawn… tread where I cannot. Walk the shadows of my doubt, the labyrinth of my heart." },
  { speaker: "queen", text: "The path is shrouded. Unseen. Every wrong turn, every dead end, is a riddle I cannot solve." }
];

let currentDialogue = 0;
let showingDialogue = true;
let currentText = "";
let charIndex = 0;
let lastCharTime = 0;
let charDelay = 40; // ms between characters
let typeSound;

let blockZones = [
  { x: 40, y: 460, size: 90 },
  { x: 180, y: 600, size: 90 },
  { x: 330, y: 470, size: 70 },
  { x: 480, y: 470, size: 70 },
  { x: 40, y: 50, size: 90 },
  { x: 470, y: 30, size: 90 },
  { x: 600, y: 30, size: 90 },
  { x: 480, y: 170, size: 90 },
  { x: 310, y: 170, size: 90 }
];

function preload() {
  novaCut = loadFont('assets/NovaCut-Regular.ttf');
  bg = loadImage('assets/map.png');
  bgmusic = loadSound('sound/wizards-road-slowed-371776.mp3');
typeSound = loadSound("sound/dialogue.wav");
  moveSound = loadSound("sound/move.wav");

  // Standing sprites
  sprites.front = loadImage("assets/pawnfront.png");
  sprites.back = loadImage("assets/pawnback.png");
  sprites.left = loadImage("assets/pawnturnleft.png");
  sprites.right = loadImage("assets/pawnturnright.png");
  queenHead = loadImage("assets/queenhead.png");
  pawnHead = loadImage("assets/narrator.png");

  // Walking gifs
  sprites.walkFront = loadImage("assets/walkfront.gif");
  sprites.walkBack = loadImage("assets/walkback.gif");
  sprites.walkLeft = loadImage("assets/walkleft.gif");
  sprites.walkRight = loadImage("assets/walkright.gif");
}

function setup() {
  //createCanvas(windowHeight, windowHeight);
  createCanvas(800, 800);
  bgmusic.loop();   // loops forever
  bgmusic.setVolume(0.5); // 0.0 = mute, 1.0 = full volume
  pg = createGraphics(width, height);
  pg.pixelDensity(1);

  player = {
    x: width / 2,
    y: height - 100,
    speed: 4,
    currentSprite: sprites.back,
    facing: "back",
    scale: 0.5
  };

  // start spotlight as full screen
  spotlightSize = max(width, height) * 2;
  lightsOutTimer = millis(); // timer starts now
}

let footsteps = [];
let lastStepX, lastStepY;

function draw() {
  background(200);
  imageMode(CENTER);
  image(bg, width / 2, height / 2, width, height);

  // Draw footsteps as pairs of darker fading ovals (3s fade)
  for (let i = footsteps.length - 1; i >= 0; i--) {
    let step = footsteps[i];
    step.alpha -= 1.0;
    if (step.alpha <= 0) {
      footsteps.splice(i, 1);
      continue;
    }
    noStroke();
    fill(40, 40, 60, step.alpha);
    // Left foot
    ellipse(step.x - 10, step.y + 10, 24, 18);
    // Right foot
    ellipse(step.x + 10, step.y - 10, 24, 18);
  }

  // Movement only if no dialogue
  if (!showingDialogue) {
    handleInput();
  }

  // Draw player
  image(player.currentSprite, player.x, player.y,
        player.currentSprite.width * player.scale,
        player.currentSprite.height * player.scale);

  // === Fade in from black at start ===
  if (fadeIn) {
    fadeInAlpha -= 5;
    if (fadeInAlpha <= 0) {
      fadeInAlpha = 0;
      fadeIn = false;
      lightsOut = true; // start spotlight after fade-in
    }
    noStroke();
    fill(0, fadeInAlpha);
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
  
  // === Spotlight effect ===
if (lightsOut) {
  if (spotlightSize > targetSpotlightSize) {
    spotlightSize -= shrinkSpeed;
    if (spotlightSize < targetSpotlightSize) {
      spotlightSize = targetSpotlightSize;
    }
  } else if (!firefliesActive) {
    // when shrinking finishes, spawn fireflies once
    spawnFireflies(30); 
    firefliesActive = true;
  }

  // draw overlay with hole
  pg.clear();
  pg.noStroke();
  pg.fill(0, 240);
  pg.rect(0, 0, pg.width, pg.height);

  const ctx = pg.drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  pg.ellipse(player.x, player.y, spotlightSize);
  ctx.restore();

  imageMode(CORNER);
  image(pg, 0, 0);

  // draw fireflies on top
  if (firefliesActive) {
    updateFireflies();
  }
}

    // Dialogue system
  if (showingDialogue) {
    typeWriterEffect();
    drawDialogueBox();
  }

  // === Fade out to next stage ===
  if (transitioning) {
    fadeAlpha += 5;
    if (fadeAlpha >= 255) {
      window.location.href = "sorrow.html";
    }
    noStroke();
    fill(0, fadeAlpha);
    rect(0, 0, width, height);
  }
}

function handleInput() {
  let oldX = player.x;
  let oldY = player.y;
  let moving = false;

  if (keyIsDown(87) || keyIsDown(UP_ARROW)) {
    player.y -= player.speed;
    player.currentSprite = sprites.walkBack;
    player.facing = "back";
    moving = true;
  }
  else if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) {
    player.y += player.speed;
    player.currentSprite = sprites.walkFront;
    player.facing = "front";
    moving = true;
  }
  else if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) {
    player.x -= player.speed;
    player.currentSprite = sprites.walkLeft;
    player.facing = "left";
    moving = true;
  }
  else if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) {
    player.x += player.speed;
    player.currentSprite = sprites.walkRight;
    player.facing = "right";
    moving = true;
  }

  let halfW = (player.currentSprite.width * player.scale) / 2;
  let halfH = (player.currentSprite.height * player.scale) / 2;
  player.x = constrain(player.x, halfW, width - halfW);
  player.y = constrain(player.y, halfH, height - halfH);

  if (insideBlockZones(player.x, player.y, halfW*2, halfH*2)) {
    player.x = oldX;
    player.y = oldY;
  }

  // === Transition trigger ===
  if (!transitioning && player.y - halfH <= 0) {
    transitioning = true;
  }

  // Add a fading oval at the bottom of the sprite if moved enough
  if (moving && (player.x !== oldX || player.y !== oldY)) {
    if (lastStepX === undefined || dist(player.x, player.y, lastStepX, lastStepY) > 40) {
      let footY = oldY + (player.currentSprite.height * player.scale) / 2;
      footsteps.push({ x: oldX, y: footY, alpha: 180 });
      lastStepX = player.x;
      lastStepY = player.y;
      if (footsteps.length > 80) footsteps.shift();
    }
  }

  if (!moving) {
    if (player.facing === "front") player.currentSprite = sprites.front;
    if (player.facing === "back")  player.currentSprite = sprites.back;
    if (player.facing === "left")  player.currentSprite = sprites.left;
    if (player.facing === "right") player.currentSprite = sprites.right;
  }
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

  // Portrait
  let speaker = dialogues[currentDialogue].speaker;
  let portrait = speaker === "queen" ? queenHead : pawnHead;
  imageMode(CORNER);
  image(portrait, boxX, boxY - 52);

  // Text
  fill(255);
  noStroke();
  textFont(novaCut);
  textSize(22);
  textAlign(LEFT, TOP);
  let textX = boxX + 140;
  let textY = boxY + 30;
  let textW = boxW - 180;
  text(currentText, textX, textY, textW, boxH - 40);

  // "Press Z" prompt
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

      // Stop sound instantly
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
  }
}


// === Collision Helpers ===
function drawBlockZones() {
  noFill();
  stroke(255, 0, 0);
  for (let b of blockZones) {
    rect(b.x, b.y, b.size, b.size);
  }
}

function insideBlockZones(px, py, pw, ph) {
  for (let b of blockZones) {
    let hit = !(
      px + pw/2 < b.x ||
      px - pw/2 > b.x + b.size ||
      py + ph/2 < b.y ||
      py - ph/2 > b.y + b.size
    );
    if (hit) return true;
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowHeight, windowHeight);
  pg = createGraphics(width, height);
  pg.pixelDensity(1);
  // reset spotlight to full screen if resizing
  spotlightSize = max(width, height) * 2;
}

function spawnFireflies(n) {
  for (let i = 0; i < n; i++) {
    fireflies.push({
      x: random(width),
      y: random(height),
      r: random(3, 6),       // radius
      speedX: random(-0.5, 0.5),
      speedY: random(-0.5, 0.5),
      phase: random(TWO_PI), // for blinking
    });
  }
}

function updateFireflies() {
  for (let f of fireflies) {
    f.x += f.speedX;
    f.y += f.speedY;

    // wrap around screen
    if (f.x < 0) f.x = width;
    if (f.x > width) f.x = 0;
    if (f.y < 0) f.y = height;
    if (f.y > height) f.y = 0;

    // flicker
    let alpha = 150 + 105 * sin(frameCount * 0.05 + f.phase);

    noStroke();
    fill(249, 251, 246, alpha);
    square(f.x, f.y, f.r);
  }
}
