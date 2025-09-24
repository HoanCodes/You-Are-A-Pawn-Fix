// === Background, Walking, Collision ===
let moveSound;
let player;
let bg;
let sprites = {};
let xe, xe2, pawn, queen, queenHead, pawnHead;
let transitioning = false;
let fadeAlpha = 0;
let coverImage;
let title;

// === Dialogue system ===
let dialogues = [
  { speaker: "queen", text: "Pawn… step forward." },
  { speaker: "queen", text: "My heart cannot cross this battlefield, so you must." },
  { speaker: "queen", text: "Take this letter to the King. Do not falter, do not question." },
  { speaker: "queen", text: "What I cannot say to him, you will carry in my stead." },
  { speaker: "queen", text: "Go. Each step you take is a step I cannot bear to make myself." },
  { speaker: "pawn", text: "Move using WASD or arrow keys. When you are ready, venture forth." }
];

let currentDialogue = 0;
let showingDialogue = false; // start false; will be true after intro
let currentText = "";
let charIndex = 0;
let lastCharTime = 0;
let charDelay = 40; // ms between characters
let typeSound;

let blockZones = [
  { x: 190, y: 470, size: 60 },
  { x: 490, y: 470, size: 60 },
  { x: 490, y: 600, size: 60 },
  { x: 190, y: 600, size: 60 },
  { x: 620, y: 600, size: 60 },
  { x: 50, y: 600, size: 60 },
  { x: 335, y: 600, size: 60 },
];

// === Intro sequence state ===
let intro = true;            
let introStage = 'fadeInCover';    // start directly fading in cover
let coverAlpha = 100;         // coverImage alpha
let uiAlpha = 255;          // title + "click to begin" alpha
let blackAlpha = 255;       // black overlay alpha
let titleY;                 // animated title y position
let titleTargetY;           // 1/3 from top
let titleStartY;            // starting off-screen
let titleScale = 0.5;       // requested size
let bgmusic;

function preload() {
  novaCut = loadFont('assets/NovaCut-Regular.ttf');
  typeSound = loadSound("sound/dialogue.wav");
  moveSound = loadSound("sound/move.wav");
  bg = loadImage('assets/map.png');
  xe = loadImage("assets/xe.png");
  xe2 = loadImage("assets/xe2.png");
  pawn = loadImage("assets/pawnnpc.png");
  queen = loadImage("assets/queenidleanimation.gif");
  queenHead = loadImage("assets/queenhead.png");
  pawnHead = loadImage("assets/narrator.png");
  coverImage = loadImage("assets/coverart.png");
  title = loadImage("assets/youareapawn.png");

  // Standing sprites
  sprites.front = loadImage("assets/pawnfront.png");
  sprites.back = loadImage("assets/pawnback.png");
  sprites.left = loadImage("assets/pawnturnleft.png");
  sprites.right = loadImage("assets/pawnturnright.png");

  // Walking gifs
  sprites.walkFront = loadImage("assets/walkfront.gif");
  sprites.walkBack = loadImage("assets/walkback.gif");
  sprites.walkLeft = loadImage("assets/walkleft.gif");
  sprites.walkRight = loadImage("assets/walkright.gif");

  // music
  bgmusic = loadSound('sound/please-call-me-slowed-reverb-385731.mp3');
}

function setup() {
  createCanvas(windowHeight, windowHeight);
bgmusic.setVolume(0.5);
bgmusic.loop();
  // Player setup
  player = {
    x: width / 2,
    y: height / 2,
    speed: 4,
    currentSprite: sprites.front,
    facing: "front",
    scale: 0.5
  };

  // Title animation targets
  titleTargetY = height / 3.5;
  titleStartY = - (title.height * titleScale); // start above canvas
  titleY = titleStartY;

  // Ensure dialogue doesn't start until intro done
  showingDialogue = false;
  currentDialogue = 0;
  currentText = "";
  charIndex = 0;
}

function draw() {
  background(200);
  imageMode(CENTER);
  image(bg, width / 2, height / 2, width, height);

  // Draw NPCs & player behind the intro UI
  image(player.currentSprite, player.x, player.y,
        player.currentSprite.width * player.scale,
        player.currentSprite.height * player.scale);

  image(xe, width - 650, height - 150);
  image(xe2, 650, height - 150);
  image(pawn, width/3.25, height - 260);
  image(pawn, width/3.25, height - 120);
  image(queen, width/2, height - 230, queen.width / 2.5, queen.height / 2.5);

  // Mirrored pawns
  push();
  translate(width/1.4, height - 260);
  scale(-1, 1);
  imageMode(CENTER);
  image(pawn, 0, 0);
  pop();

  push();
  translate(width/1.4, height - 120);
  scale(-1, 1);
  imageMode(CENTER);
  image(pawn, 0, 0);
  pop();

  // --- Intro sequence handling ---
  if (intro) {
    handleIntro();

    // draw the cover image scaled same as bg, with its alpha
    push();
    tint(255, coverAlpha);
    imageMode(CENTER);
    image(coverImage, width/2, height/2, width, height);
    pop();

    // title (centered horizontally) dropping down
    push();
    translate(width/2, titleY);
    imageMode(CENTER);
    tint(255, uiAlpha);
    image(title, 0, 0, title.width * titleScale, title.height * titleScale);
    pop();

    // blinking "Click anywhere to begin" at bottom
    push();
    textFont(novaCut);
    textSize(20);
    textAlign(CENTER, BOTTOM);
    let blink = (sin(millis() / 350) + 1) / 2; // 0..1
    let blinkAlpha = lerp(80, 255, blink);
    fill(255, uiAlpha * (blinkAlpha/255));
    strokeWeight(2);
    stroke(42, 31, 45);
    text("Click anywhere to begin", width/2, height - 30);
    pop();

    // black overlay (only at beginning)
    if (blackAlpha > 0 && introStage === 'fadeInCover') {
      noStroke();
      fill(0, blackAlpha);
      rect(0,0,width,height);
    }

    return; // skip dialogue/movement while intro
  }

  // Transition fade when moving off top of screen
  if (transitioning) {
    fadeAlpha += 5;
    if (fadeAlpha >= 255) {
      window.location.href = "confusion.html";
    }
    noStroke();
    fill(0, fadeAlpha);
    rect(0,0,width,height);
    return;
  }

  // Movement only if no dialogue
  if (!showingDialogue) {
    handleInput();
  }

  // Dialogue system
  if (showingDialogue) {
    typeWriterEffect();
    drawDialogueBox();
  }

  // Check if player is moving (for moveSound)
  let moving = keyIsDown(65) || keyIsDown(68) || keyIsDown(87) || keyIsDown(83) ||
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
}

function handleIntro() {
  // stages: 'fadeInCover' -> 'idle' -> 'fadeOutUI' -> 'done'
  if (introStage === 'fadeInCover') {
    blackAlpha = max(0, blackAlpha - 6);
    coverAlpha = min(255, coverAlpha + 6);
    titleY = lerp(titleY, titleTargetY, 0.08);

    if (blackAlpha === 0 && coverAlpha >= 254 && abs(titleY - titleTargetY) < 1) {
      introStage = 'idle';
    }
  } else if (introStage === 'idle') {
    coverAlpha = 255;
    uiAlpha = 255;
  } else if (introStage === 'fadeOutUI') {
    uiAlpha = max(0, uiAlpha - 6);
    coverAlpha = max(0, coverAlpha - 6);
    if (uiAlpha === 0 && coverAlpha === 0) {
      introStage = 'done';
      setTimeout(() => {
        intro = false;
        startSceneAfterIntro();
      }, 200);
    }
  }
}

function startSceneAfterIntro() {
  coverAlpha = 0;
  uiAlpha = 0;
  blackAlpha = 0;

  showingDialogue = true;
  currentDialogue = 0;
  currentText = "";
  charIndex = 0;
}

function mousePressed() {
  if (!intro) return;
  if (introStage === 'idle') {
    introStage = 'fadeOutUI';
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

  if (!transitioning && player.y - halfH <= 0) {
    transitioning = true;
  }

  if (!moving) {
    if (player.facing === "front") player.currentSprite = sprites.front;
    if (player.facing === "back")  player.currentSprite = sprites.back;
    if (player.facing === "left")  player.currentSprite = sprites.left;
    if (player.facing === "right") player.currentSprite = sprites.right;
  }
}

function typeWriterEffect() {
  if (charIndex < dialogues[currentDialogue].text.length) {
    if (millis() - lastCharTime > charDelay) {
      currentText += dialogues[currentDialogue].text.charAt(charIndex);
      charIndex++;
      lastCharTime = millis();
      if (!typeSound.isPlaying()) {
        typeSound.loop();
      }
    }
  } else {
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
  if (intro) return;

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