// === Main Sketch: Background, dialogue, tears, circles, noisy waves + floating word minigame ===
let thunderSound;
let riverSound;
let bg;
let sprites = {};
let fadeIn = true;
let fadeInAlpha = 255;
let selectSound;

// === Dialogue system ===
let dialogues = [
  { speaker: "queen", text: "I tried to hold myself together... But sorrow spills where love once lived." },
  { speaker: "queen", text: "Pawn… I never meant to burden you." },
  { speaker: "queen", text: "But my grief overflows, and soon it will drown us both." },
  { speaker: "pawn", text: "Console her with kindness. If you wish to live, you must find a way to ease her pain." },
  { speaker: "pawn", text: "Perhaps you could remind her of the beauty that still exists?" }
];

let currentDialogue = 0;
let showingDialogue = true;
let currentText = "";
let charIndex = 0;
let lastCharTime = 0;
let charDelay = 40;
let typeSound;

// Portraits & tears
let portraits = {};
let tearImg;

// === Tears + Circles + Waves ===
let stage = "dialogue"; // dialogue -> tears -> circles -> waves -> minigame
let tears = [];
let circles = [];
let circlesStarted = false;
let circlesDone = false;

// Waves
let waves = [];
let waveSpacing = 50;

// === Minigame words ===
let words = [];
let fadeOut = false;
let fadeOutAlpha = 0;
let riverStarted = false;

// Word click effects
let wordEffects = [];

function preload() {
  novaCut = loadFont('assets/NovaCut-Regular.ttf');
  bg = loadImage('assets/map.png');
  bgmusic = loadSound('sound/solitude-dark-ambient-music-354468.mp3');
  typeSound = loadSound("sound/dialogue.wav");
  thunderSound = loadSound("sound/thunder.mp3");
  riverSound = loadSound("sound/river.mp3");
  selectSound = loadSound("sound/select.wav");

  // Portraits
  portraits.queen = loadImage("assets/queenhead.png");
  portraits.pawn = loadImage("assets/narrator.png");
  sprites.back = loadImage("assets/pawnback.png");

  // Tears
  tearImg = loadImage("assets/tear.png");
}

function setup() {
  createCanvas(windowHeight, windowHeight);
  thunderSound.play();
  bgmusic.loop();   // loops forever
  bgmusic.setVolume(0.5);

  // Initialize waves
  for (let y = 0; y <= height; y += waveSpacing) {
    waves.push({
      y: y,
      amplitude: random(20, 50),
      frequency: random(0.02, 0.06),
      speed: random(0.05, 0.12),
      offset: random(TWO_PI),
      noiseOffset: random(1000),
      alpha: 0
    });
  }
}

function draw() {
  background(200);
  imageMode(CENTER);
  image(bg, width / 2, height / 2, width, height);
  image(sprites.back, width / 2, height - 100, sprites.back.width * 0.5, sprites.back.height * 0.5);

  // === Main stage drawing ===
  if (stage === "dialogue") {
    if (showingDialogue) {
      typeWriterEffect();
      drawDialogueBox();
    } else {
      stage = "tears";
      spawnTears();
    }
  } else if (stage === "tears") {
    runTears();

    if (!circlesStarted && tears.every(t => t.shrinking && t.size <= 0)) {
      spawnCircles();
      circlesStarted = true;
      stage = "circles";
    }
  } else if (stage === "circles") {
    runCircles();
    runTears();

    if (circlesDone) stage = "waves";
  } else if (stage === "waves") {
    runCircles();
    runWaves();

    if (!words.length) spawnWords();
  } else if (stage === "minigame") {
    runCircles();
    if (!riverStarted) {
      riverSound.loop();
      riverSound.setVolume(0.2);
      riverStarted = true;
    }
    runWaves();
    runWords();
  }

  // === Fade-in ===
  if (fadeIn) {
    fadeInAlpha -= 20; // faster fade
    if (fadeInAlpha <= 0) fadeInAlpha = 0, fadeIn = false;
    noStroke();
    fill(0, fadeInAlpha);
    rect(0, 0, width, height);
  }

  // Draw word click effects
  for (let i = wordEffects.length - 1; i >= 0; i--) {
    let e = wordEffects[i];
    e.radius += 4;
    e.alpha -= 8;
    if (e.alpha <= 0) {
      wordEffects.splice(i, 1);
      continue;
    }
    noStroke();
    fill(180, 220, 255, e.alpha);
    ellipse(e.x, e.y, e.radius);
    fill(255, 220, 240, e.alpha * 0.7);
    ellipse(e.x, e.y, e.radius * 0.6);
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

  let speaker = dialogues[currentDialogue].speaker;
  let portrait = portraits[speaker];
  if (portrait) imageMode(CORNER), image(portrait, boxX + 10, boxY - 52);

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


// === Tears ===
function spawnTears() {
  let cols = 2;
  let rows = 5;
  let spacingX = width / (cols + 1);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      tears.push({ x: spacingX * (i + 1) + random(-20, 20), y: -50 - j * 60, size: 64, shrinking: false });
    }
  }
}

function runTears() {
  for (let t of tears) {
    if (!t.shrinking) {
      t.y += 4;
      if (t.y >= height / 2) t.shrinking = true;
    } else {
      t.size -= 2.5;
      if (t.size < 0) t.size = 0;
    }
    if (t.size > 0) imageMode(CENTER), image(tearImg, t.x, t.y, t.size, t.size);
  }
}

// === Circles ===
function spawnCircles() {
  let now = millis();
  circles.push({ x: width / 2 - 80, y: height / 2, startTime: now, duration: 2000, maxR: max(width, height) });
  circles.push({ x: width / 2 + 80, y: height / 2, startTime: now, duration: 2000, maxR: max(width, height) });
}

function runCircles() {
  fill(206, 217, 187);
  noStroke();

  circlesDone = true;
  for (let c of circles) {
    let elapsed = millis() - c.startTime;
    let progress = constrain(elapsed / c.duration, 0, 1);
    let r = progress * c.maxR * 2;
    if (progress < 1) circlesDone = false;
    circle(c.x, c.y, r);
  }
}

// === Waves ===
function runWaves() {
  for (let w of waves) {
    w.offset += w.speed;
    w.noiseOffset += 0.01;
    w.alpha = min(w.alpha + 1, 150);
    let t = millis() * 0.0007 + w.noiseOffset;

    stroke(249, 251, 246, w.alpha);
    strokeWeight(1);
    beginShape();
    for (let x = 0; x <= width; x += 15) {
      let yOffset = sin(x * w.frequency + w.offset) * w.amplitude;
      let noiseDetail = noise(x * 0.01 + t) * 30 - 15;
      let noiseFine = noise(x * 0.04 + t * 2) * 10 - 5;
      vertex(x, w.y + yOffset + noiseDetail + noiseFine);
    }
    vertex(width, height);
    vertex(0, height);
    endShape(CLOSE);
  }
}

function softenWaves() {
  let clicked = words.filter(w => w.positive && w.clicked).length;
  let total = words.filter(w => w.positive).length;
  let softness = map(clicked, 0, total, 0, 1);
  for (let w of waves) {
    w.amplitude = lerp(50, 15, softness); // from strong to soft
    w.speed = lerp(0.12, 0.03, softness); // from fast to slow
  }
}

// === Minigame: floating words ===
function spawnWords() {
  let positive = ["hope", "love", "forgive", "believe", "faith", "strength", "peace"];
  let negative = ["sad", "pain", "loss", "fear", "grief", "anger", "sorrow", "doubt"];
  words = [];

  for (let i = 0; i < 25; i++) {
    let word = random(i < positive.length ? positive : negative);
    words.push({
      text: word,
      x: random(50, width - 50),
      y: random(150, height - 50),
      positive: positive.includes(word),
      clicked: false,
      alpha: 0, // fade-in
      speedX: random(-0.2, 0.2),
      speedY: random(-0.1, 0.1)
    });
  }
  stage = "minigame";
}

function runWords() {
  textAlign(CENTER, CENTER);

  let allPosClicked = words.filter(w => w.positive).every(w => w.clicked);

  for (let w of words) {
    // Fade-in
    if (w.alpha < 255) w.alpha += 1;

    if (!w.clicked) {
      // Drift
      w.x += w.speedX;
      w.y += w.speedY;

      // Bounce inside canvas
      if (w.x < 50 || w.x > width - 50) w.speedX *= -1;
      if (w.y < 150 || w.y > height - 50) w.speedY *= -1;

      // Hover detection and scale
      let isHover = false;
      if (w.positive) {
        let tw = textWidth(w.text);
        let th = 32;
        if (
          mouseX >= w.x - tw / 2 &&
          mouseX <= w.x + tw / 2 &&
          mouseY >= w.y - th / 2 &&
          mouseY <= w.y + th / 2
        ) {
          isHover = true;
        }
      }

      // Draw text
      push();
      fill(color(255, w.alpha));
      textSize(isHover ? 40 : 32); // grow when hovered
      text(w.text, w.x, w.y);
      pop();
    }
  }

  // If all positive words clicked, start fade to black
  if (allPosClicked && !fadeOut) fadeOut = true;

  if (fadeOut) {
    fadeOutAlpha += 5;
    fill(0, fadeOutAlpha);
    noStroke();
    rect(0, 0, width, height);

    if (fadeOutAlpha >= 255) {
      window.location.href = "fireball_stage.html";
    }
  }
}



function mousePressed() {
  if (stage === "minigame") {
    for (let w of words) {
      if (!w.clicked) {
        let tw = textWidth(w.text);
        let th = 32;
        if (
          mouseX >= w.x - tw / 2 &&
          mouseX <= w.x + tw / 2 &&
          mouseY >= w.y - th / 2 &&
          mouseY <= w.y + th / 2
        ) {
          if (w.positive) {
            w.clicked = true;
            selectSound.play();
            wordEffects.push({ x: w.x, y: w.y, radius: 10, alpha: 255 });
            softenWaves();
          }
        }
      }
    }
  }
}
