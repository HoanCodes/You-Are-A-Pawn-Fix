// background, walking mechanic sketch with collision + cinematic zoom + choice
let moveSound;
let player;
let bg;
let sprites = {};
let king;
let fadeIn = true;
let fadeInAlpha = 255;
let transformFade = 0; 
let transforming = false;
let newDialogueTriggered = false;
let choiceActive = false; // final choice flag
let whiteFade = 0;
let redirecting = false;
let turnSound;
let zoomAmount = 1; 
let zoomTarget = 1;
let smokeSound;

// collision zones
let blockZones = [
  { x: 370, y: 150, size: 130 },
  { x: 370, y: 250, size: 130 },
  { x: 370, y: 350, size: 100 },
];

// Dialogue sequences
let dialogues = [
  { speaker: "queen", text: "All my servants... They are all gone, just to protect me from my broken marriage." },
  { speaker: "pawn", text: "Pawn… you have carried what was never yours: her grief, his neglect, their endless quarrels." },
  { speaker: "pawn", text: "Through fire and tears, you have grown stronger. No longer a mere piece on this board." },
  { speaker: "pawn", text: "Why must you continue to bear this burden?" },
  { speaker: "pawn", text: "Step to the far end of the board. BECOME THE QUEEN." },
  { speaker: "pawn", text: "Carry all that was forced upon you, and strike at them both in your own name." }
];

let newDialogues = [
  { speaker: "queen", text: "So… this is the shape you have taken, born of all we displaced onto you." },
  { speaker: "queen", text: "Every fire, every tear… none of it was yours to bear, yet you carried it all." },
  { speaker: "queen", text: "I have failed to protect you, failed to see the burden we placed upon your shoulders." },
  { speaker: "queen", text: "Strike if you must… this foolish quarrel has claimed far too many already." }
];

let currentDialogue = 0;
let showingDialogue = true;
let currentText = "";
let charIndex = 0;
let lastCharTime = 0;
let charDelay = 40;
let typeSound;
function preload() {
  novaCut = loadFont('assets/NovaCut-Regular.ttf');
  bgmusic = loadSound('sound/inner-void-clavier-365482.mp3');
  moveSound = loadSound("sound/move.wav");
  typeSound = loadSound("sound/dialogue.wav");
  turnSound = loadSound("sound/turn.wav");
  smokeSound = loadSound("sound/smoke.wav");
  bg = loadImage('assets/mapfireball.png');
  king = loadImage("assets/kingidleanimation.gif");
  queenHead = loadImage("assets/kinghead.png");
  pawnHead = loadImage("assets/narrator.png");

  // Starting sprites
  sprites.front = loadImage("assets/pawnfrontbruised.png");
  sprites.back = loadImage("assets/pawnback.png");
  sprites.left = loadImage("assets/pawnturnleft.png");
  sprites.right = loadImage("assets/pawnturnright.png");

  sprites.walkFront = loadImage("assets/walkfrontinjured.gif");
  sprites.walkBack = loadImage("assets/walkback.gif");
  sprites.walkLeft = loadImage("assets/walkleft.gif");
  sprites.walkRight = loadImage("assets/walkright.gif");
}

function setup() {
  createCanvas(windowHeight, windowHeight);
  bgmusic.loop();   // loops forever
  bgmusic.setVolume(0.5); // 0.0 = mute, 1.0 = full volume
  player = {
    x: width / 2,
    y: height - 100,
    speed: 2.5,
    currentSprite: sprites.back,
    facing: "back",
    scale: 0.5,
    transformed: false
  };
}

function draw() {
  background(200);

  // Quinn transformation shake
  let shakeX = 0, shakeY = 0;
  if (transforming) {
    shakeX = random(-12, 12);
    shakeY = random(-12, 12);
  }

  // cinematic zoom around king
  push();
  translate(width/2 + shakeX, height/3 + shakeY);
  scale(zoomAmount);
  translate(-width/2, -height/3);

  imageMode(CENTER);
  image(bg, width / 2, height / 2, width, height);
  image(king, width / 2, height / 3, king.width * 0.3, king.height * 0.3);
  imageMode(CENTER);
  image(player.currentSprite, player.x, player.y, player.currentSprite.width * player.scale, player.currentSprite.height * player.scale);

  pop();

  if (!showingDialogue && !transforming && !choiceActive) handleInput();

  if (showingDialogue) {
    typeWriterEffect();
    drawDialogueBox();
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
  
  // Fade in from black
  if (fadeIn) {
    fadeInAlpha -= 5;
    if (fadeInAlpha <= 0) fadeIn = false;
    noStroke();
    fill(0, fadeInAlpha);
    rect(0, 0, width, height);
  }

  // Quinn transformation fade
  if (transforming) {
    // Flashing white overlay
    let flashAlpha = map(sin(frameCount * 0.3), -1, 1, 100, 220);
    fill(255, flashAlpha);
    noStroke();
    rect(0, 0, width, height);
    smokeSound.play();

    // Shockwave circle
    let shockR = map(transformFade, 0, 255, 0, width * 0.8);
    fill(255, 255, 0, 80);
    noStroke();
    ellipse(player.x, player.y, shockR, shockR);

    transformFade += 5; 
    if (transformFade >= 255) {
      transformFade = 255;
      transforming = false;
      player.transformed = true;
    }
    noStroke();
    fill(0, transformFade);
    rect(0, 0, width, height);
    turnSound.play();
  }

  // Trigger new dialogue when Quinn touches the king
  if (player.transformed && !showingDialogue && !newDialogueTriggered) {
    let kingX = width / 2;
    let kingY = height / 3;
    let d = dist(player.x, player.y, kingX, kingY);
    if (d < 160) { 
      newDialogueTriggered = true;
      showingDialogue = true;
      currentDialogue = 0;
      dialogues = newDialogues;
      currentText = "";
      charIndex = 0;
      zoomTarget = 1.5;
    }
  }

  // Smooth zoom effect
  zoomAmount = lerp(zoomAmount, zoomTarget, 0.02);

  // Draw choice screen
  if (choiceActive) {
    drawChoice();
  }

  // White fade out
  if (redirecting) {
    whiteFade += 5;
    fill(255, whiteFade);
    rect(0, 0, width, height);
    if (whiteFade >= 255) {
      window.location.href = "index.html";
    }
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

  for (let zone of blockZones) {
    if (player.x > zone.x - zone.size/2 &&
        player.x < zone.x + zone.size/2 &&
        player.y > zone.y - zone.size/2 &&
        player.y < zone.y + zone.size/2) {
      player.x = oldX;
      player.y = oldY;
    }
  }

  if (!moving) {
    if (player.facing === "front") player.currentSprite = sprites.front;
    if (player.facing === "back") player.currentSprite = sprites.back;
    if (player.facing === "left") player.currentSprite = sprites.left;
    if (player.facing === "right") player.currentSprite = sprites.right;
  }

  // Quinn transformation trigger
  if (player.y - halfH <= 0 && !player.transformed && !transforming) {
    transforming = true;
    setTimeout(() => {
      sprites.front = loadImage("assets/quinnfront.png");
      sprites.back = loadImage("assets/quinnback.png");
      sprites.left = loadImage("assets/quinnturnleft.png");
      sprites.right = loadImage("assets/quinnturnright.png");

      sprites.walkFront = loadImage("assets/quinn.walkfront.gif");
      sprites.walkBack = loadImage("assets/quinn.walkback.gif");
      sprites.walkLeft = loadImage("assets/quinn.walkleft.gif");
      sprites.walkRight = loadImage("assets/quinn.walkright.gif");

      player.scale = 0.4;
      transformFade = 0;
    }, 500);
  }
}

// Dialogue functions
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
  let boxY = 500;

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
        if (newDialogueTriggered) {
          dialogues = [];
          zoomTarget = 1;
          // after zooms out, trigger pawn choice
          setTimeout(() => {
            choiceActive = true;
          }, 2000);
        }
      } else {
        currentText = "";
        charIndex = 0;
      }
    }
  }
}

// Choice UI
function drawChoice() {
  fill(42, 31, 45, 230);
  rect(width/2 - 200, height - 180, 400, 100, 10);

  fill(255);
  textFont(novaCut);
  textSize(22);
  textAlign(CENTER, CENTER);
  text("Will you carry on this vengeance?", width/2, height - 150);

  // Buttons
  drawButton(width/2 - 100, height - 100, 80, 40, "Yes", () => redirecting = true);
  drawButton(width/2 + 20, height - 100, 80, 40, "No", () => redirecting = true);
}

function drawButton(x, y, w, h, label, onClick) {
  fill(90);
  rect(x, y, w, h, 5);
  fill(255);
  textSize(18);
  textAlign(CENTER, CENTER);
  text(label, x + w/2, y + h/2);

  if (mouseIsPressed &&
      mouseX > x && mouseX < x + w &&
      mouseY > y && mouseY < y + h) {
    onClick();
  }
}
