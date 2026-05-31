// AI Arena

// Engine and scene setup
var canvas = document.getElementById("renderCanvas");
var engine = new BABYLON.Engine(canvas, true);

var scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color3(0.01, 0.01, 0.03);
scene.collisionsEnabled = true;
scene.gravity = new BABYLON.Vector3(0, -0.5, 0);

// Fog for depth (lighter for bigger arena)
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity = 0.006;
scene.fogColor = new BABYLON.Color3(0.02, 0.02, 0.06);

// Glow layer for emissive materials (enemy visors)
var glowLayer = new BABYLON.GlowLayer("glow", scene);
glowLayer.intensity = 0.8;

// === FPS CAMERA ===
var camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(-40, 2.4, -40), scene);
camera.speed = 0.5;
camera.minZ = 0.1;
// Remove default mouse input — we handle mouse manually for pointer lock
camera.inputs.removeByType("FreeCameraMouseInput");

// WASD controls
camera.keysUp = [87];    // W
camera.keysDown = [83];  // S
camera.keysLeft = [65];  // A
camera.keysRight = [68]; // D

// Collisions and gravity
camera.checkCollisions = true;
camera.applyGravity = true;
camera.ellipsoid = new BABYLON.Vector3(0.5, 1.2, 0.5);

// === MUZZLE FLASH LIGHT ===
var muzzleLight = new BABYLON.PointLight("muzzleLight", new BABYLON.Vector3(0, 0, 1), scene);
muzzleLight.parent = camera;
muzzleLight.diffuse = new BABYLON.Color3(1, 0.8, 0.3);
muzzleLight.intensity = 0;
muzzleLight.range = 10;

// === WEAPON BOB ===
var bobTime = 0;

// === POST-PROCESSING PIPELINE ===
var pipeline = new BABYLON.DefaultRenderingPipeline("pipeline", true, scene, [camera]);
pipeline.bloomEnabled = true;
pipeline.bloomThreshold = 0.65;
pipeline.bloomWeight = 0.35;
pipeline.bloomKernel = 64;
pipeline.bloomScale = 0.5;
pipeline.chromaticAberrationEnabled = true;
pipeline.chromaticAberration.aberrationAmount = 12;
pipeline.chromaticAberration.radialIntensity = 0.8;
pipeline.grainEnabled = true;
pipeline.grain.intensity = 18;
pipeline.grain.animated = true;
pipeline.imageProcessing.vignetteEnabled = true;
pipeline.imageProcessing.vignetteWeight = 3.5;
pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 1);
pipeline.imageProcessing.vignetteStretch = 0.5;
pipeline.imageProcessing.toneMappingEnabled = true;
pipeline.imageProcessing.contrast = 1.15;
pipeline.imageProcessing.exposure = 1.05;

// === MINIMAP CAMERA ===
var minimapCamera = new BABYLON.FreeCamera("minimapCamera", new BABYLON.Vector3(0, 120, 0), scene);
minimapCamera.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
minimapCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
var mmSize = 55;
minimapCamera.orthoLeft = -mmSize;
minimapCamera.orthoRight = mmSize;
minimapCamera.orthoTop = mmSize;
minimapCamera.orthoBottom = -mmSize;
minimapCamera.layerMask = 0x0FFFFFFE;

camera.viewport = new BABYLON.Viewport(0, 0, 1, 1);
minimapCamera.viewport = new BABYLON.Viewport(0.78, 0.78, 0.20, 0.20);

scene.activeCameras.push(camera);
scene.activeCameras.push(minimapCamera);

// Player marker on minimap
var playerMarker = BABYLON.MeshBuilder.CreateCylinder("playerMarker", {
    height: 8, diameter: 3, tessellation: 3
}, scene);
var markerMat = new BABYLON.StandardMaterial("markerMat", scene);
markerMat.diffuseColor = new BABYLON.Color3(0, 1, 0.3);
markerMat.emissiveColor = new BABYLON.Color3(0, 1, 0.3);
playerMarker.material = markerMat;
playerMarker.isPickable = false;

// === LIGHTS ===
var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
light.intensity = 0.4;
light.diffuse = new BABYLON.Color3(0.6, 0.65, 0.8);
light.groundColor = new BABYLON.Color3(0.25, 0.25, 0.35);

// Directional light with shadows
var dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, 1), scene);
dirLight.intensity = 0.4;
dirLight.diffuse = new BABYLON.Color3(0.9, 0.85, 1);
dirLight.position = new BABYLON.Vector3(30, 40, -30);

var shadowGen = new BABYLON.ShadowGenerator(1024, dirLight);
shadowGen.useBlurExponentialShadowMap = true;
shadowGen.blurKernel = 16;

// Red emergency light at center
var redLight = new BABYLON.PointLight("redLight", new BABYLON.Vector3(0, 10, 0), scene);
redLight.diffuse = new BABYLON.Color3(1, 0.1, 0.05);
redLight.intensity = 1.5;
redLight.range = 60;

// Accent lights spread across the larger arena
var accentPositions = [
    { x: -40, z: -40, color: new BABYLON.Color3(0.3, 0.5, 1) },
    { x:  40, z:  40, color: new BABYLON.Color3(0.3, 0.5, 1) },
    { x: -40, z:  40, color: new BABYLON.Color3(0.2, 0.8, 0.5) },
    { x:  40, z: -40, color: new BABYLON.Color3(0.8, 0.3, 0.2) },
    { x:   0, z: -40, color: new BABYLON.Color3(0.4, 0.4, 1) },
    { x:   0, z:  40, color: new BABYLON.Color3(0.4, 0.4, 1) },
    { x: -40, z:   0, color: new BABYLON.Color3(0.6, 0.2, 0.8) },
    { x:  40, z:   0, color: new BABYLON.Color3(0.6, 0.2, 0.8) }
];
for (var li = 0; li < accentPositions.length; li++) {
    var al = new BABYLON.PointLight("accent" + li, new BABYLON.Vector3(accentPositions[li].x, 8, accentPositions[li].z), scene);
    al.diffuse = accentPositions[li].color;
    al.intensity = 1.0;
    al.range = 45;
}

// === FLICKERING LIGHTS (damaged spaceship atmosphere) ===
var flickerLights = [];
var flickerPositions = [
    { x: -30, y: 6, z: 30, color: new BABYLON.Color3(1, 0.7, 0.3), range: 25 },
    { x: 35, y: 5, z: -15, color: new BABYLON.Color3(1, 0.4, 0.1), range: 20 },
    { x: -10, y: 7, z: -35, color: new BABYLON.Color3(0.8, 0.9, 1), range: 30 },
    { x: 25, y: 4, z: 38, color: new BABYLON.Color3(1, 0.15, 0.05), range: 18 },
    { x: -45, y: 8, z: -45, color: new BABYLON.Color3(1, 0.05, 0.02), range: 60 },
    { x: 45, y: 8, z: 45, color: new BABYLON.Color3(1, 0.05, 0.02), range: 60 }
];
for (var fi = 0; fi < flickerPositions.length; fi++) {
    var fp = flickerPositions[fi];
    var fl = new BABYLON.PointLight("flicker" + fi, new BABYLON.Vector3(fp.x, fp.y, fp.z), scene);
    fl.diffuse = fp.color;
    fl.intensity = 0.8;
    fl.range = fp.range;
    var isEmergency = fi >= 4;
    flickerLights.push({ light: fl, baseIntensity: isEmergency ? 1.5 : 0.8, phase: Math.random() * Math.PI * 2, speed: isEmergency ? 1.2 : 3 + Math.random() * 5 });
}

// === SPARK PARTICLE SYSTEMS (near pipes/debris) ===
function createSparkEmitter(x, y, z) {
    var sparks = new BABYLON.ParticleSystem("sparks", 30, scene);
    sparks.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
    sparks.emitter = new BABYLON.Vector3(x, y, z);
    sparks.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2);
    sparks.maxEmitBox = new BABYLON.Vector3(0.2, 0, 0.2);
    sparks.color1 = new BABYLON.Color4(1, 0.6, 0.1, 1);
    sparks.color2 = new BABYLON.Color4(1, 0.9, 0.3, 1);
    sparks.colorDead = new BABYLON.Color4(0.3, 0.1, 0, 0);
    sparks.direction1 = new BABYLON.Vector3(-0.5, 1, -0.5);
    sparks.direction2 = new BABYLON.Vector3(0.5, 3, 0.5);
    sparks.gravity = new BABYLON.Vector3(0, -6, 0);
    sparks.minSize = 0.03;
    sparks.maxSize = 0.08;
    sparks.minLifeTime = 0.3;
    sparks.maxLifeTime = 0.8;
    sparks.emitRate = 5;
    sparks.updateSpeed = 0.01;
    sparks.start();
    return sparks;
}
createSparkEmitter(-20, 3, 49.5);  // near pipeN1
createSparkEmitter(49.5, 4, -15);  // near pipeE1
createSparkEmitter(-32, 0.8, 12);  // near debris1

// === SOUND (Web Audio API — procedural, no files needed) ===
var audioCtx = null;
var masterGain = null;
var audioInitialized = false;

function initAudio() {
    if (audioInitialized) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(audioCtx.destination);
    audioInitialized = true;
}

function playShootSound() {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain ? masterGain : audioCtx.destination);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playHitSound() {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = "square";
    osc.connect(gain);
    gain.connect(masterGain ? masterGain : audioCtx.destination);
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playExplosionSound() {
    if (!audioCtx) return;
    var bufferSize = audioCtx.sampleRate * 0.3;
    var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    var source = audioCtx.createBufferSource();
    var gain = audioCtx.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(masterGain ? masterGain : audioCtx.destination);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    source.start();
}

function playDamageSound() {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.connect(gain);
    gain.connect(masterGain ? masterGain : audioCtx.destination);
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function playFootstepSound() {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(masterGain ? masterGain : audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

function playReloadSound() {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(masterGain ? masterGain : audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// === FLOATING SCORES ===
function createFloatingScore(text, x, y) {
    var el = document.createElement("div");
    el.className = "floating-score";
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.getElementById("floatingScoresContainer").appendChild(el);
    setTimeout(function() { el.remove(); }, 1000);
}

// === MATERIALS ===
var floorMat = new BABYLON.StandardMaterial("floorMat", scene);
floorMat.diffuseTexture = new BABYLON.Texture("textures/floor_diff.jpg", scene);
floorMat.diffuseTexture.uScale = 20;
floorMat.diffuseTexture.vScale = 20;
floorMat.bumpTexture = new BABYLON.Texture("textures/floor_nor.jpg", scene);
floorMat.bumpTexture.uScale = 20;
floorMat.bumpTexture.vScale = 20;
floorMat.bumpTexture.level = 0.8;
floorMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.45);
floorMat.specularPower = 32;

var wallMat = new BABYLON.StandardMaterial("wallMat", scene);
wallMat.diffuseTexture = new BABYLON.Texture("textures/wall_diff.jpg", scene);
wallMat.diffuseTexture.uScale = 10;
wallMat.diffuseTexture.vScale = 3;
wallMat.bumpTexture = new BABYLON.Texture("textures/wall_nor.jpg", scene);
wallMat.bumpTexture.uScale = 10;
wallMat.bumpTexture.vScale = 3;
wallMat.bumpTexture.level = 0.6;
wallMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
wallMat.specularPower = 24;

var boxMat = new BABYLON.StandardMaterial("boxMat", scene);
boxMat.diffuseTexture = new BABYLON.Texture("textures/box_diff.jpg", scene);
boxMat.bumpTexture = new BABYLON.Texture("textures/box_nor.jpg", scene);
boxMat.bumpTexture.level = 0.7;
boxMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

var enemyMat = new BABYLON.StandardMaterial("enemyMat", scene);
enemyMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.3);
enemyMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
enemyMat.specularPower = 16;

var enemyEyeMat = new BABYLON.StandardMaterial("eyeMat", scene);
enemyEyeMat.diffuseColor = new BABYLON.Color3(1, 0.1, 0);
enemyEyeMat.emissiveColor = new BABYLON.Color3(1, 0.2, 0);

var bossMat = new BABYLON.StandardMaterial("bossMat", scene);
bossMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.2);
bossMat.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
bossMat.specularPower = 12;

var ceilingMat = new BABYLON.StandardMaterial("ceilingMat", scene);
ceilingMat.diffuseTexture = new BABYLON.Texture("textures/wall_diff.jpg", scene);
ceilingMat.diffuseTexture.uScale = 12;
ceilingMat.diffuseTexture.vScale = 12;
ceilingMat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);

var bulletHoleMat = new BABYLON.StandardMaterial("bulletHoleMat", scene);
bulletHoleMat.diffuseTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/impact.png", scene);
bulletHoleMat.diffuseTexture.hasAlpha = true;
bulletHoleMat.useAlphaFromDiffuseTexture = true;
bulletHoleMat.zOffset = -2;

// === BUILDING THE ARENA (100x100, ceiling height 12) ===
var roomSize = 100;
var wallHeight = 30;

var floor = BABYLON.MeshBuilder.CreateGround("floor", {
    width: roomSize, height: roomSize
}, scene);
floor.material = floorMat;
floor.checkCollisions = true;
floor.receiveShadows = true;

var ceiling = BABYLON.MeshBuilder.CreateBox("ceiling", {
    width: roomSize, height: 0.2, depth: roomSize
}, scene);
ceiling.position.y = wallHeight;
ceiling.material = ceilingMat;
ceiling.layerMask = 1;

function createWall(name, w, h, d, x, y, z, mat) {
    var wall = BABYLON.MeshBuilder.CreateBox(name, {
        width: w, height: h, depth: d
    }, scene);
    wall.position = new BABYLON.Vector3(x, y, z);
    wall.material = mat || wallMat;
    wall.checkCollisions = true;
    wall.receiveShadows = true;
    return wall;
}

// Perimeter walls
createWall("wallN", roomSize, wallHeight, 0.5, 0, wallHeight/2, roomSize/2);
createWall("wallS", roomSize, wallHeight, 0.5, 0, wallHeight/2, -roomSize/2);
createWall("wallE", 0.5, wallHeight, roomSize, roomSize/2, wallHeight/2, 0);
createWall("wallW", 0.5, wallHeight, roomSize, -roomSize/2, wallHeight/2, 0);

// === SPACE WINDOWS ===
var spaceMat = new BABYLON.StandardMaterial("spaceMat", scene);
spaceMat.emissiveColor = new BABYLON.Color3(0.02, 0.05, 0.15); // Deep space color
spaceMat.diffuseColor = new BABYLON.Color3(0, 0, 0);

function createWindow(name, w, h, x, y, z, rotY) {
    var win = BABYLON.MeshBuilder.CreateBox(name, {
        width: w, height: h, depth: 0.1
    }, scene);
    win.position = new BABYLON.Vector3(x, y, z);
    win.rotation.y = rotY;
    win.material = spaceMat;
    
    // Star particles
    var stars = new BABYLON.ParticleSystem("stars_" + name, 100, scene);
    stars.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
    stars.emitter = win;
    var halfW = w/2;
    var halfH = h/2;
    stars.minEmitBox = new BABYLON.Vector3(-halfW, -halfH, 0);
    stars.maxEmitBox = new BABYLON.Vector3(halfW, halfH, 0);
    stars.color1 = new BABYLON.Color4(0.8, 0.9, 1, 1);
    stars.color2 = new BABYLON.Color4(1, 1, 1, 0.8);
    stars.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    stars.minSize = 0.02;
    stars.maxSize = 0.08;
    stars.minLifeTime = 1.0;
    stars.maxLifeTime = 4.0;
    stars.emitRate = 15;
    stars.direction1 = new BABYLON.Vector3(0, 0, 0);
    stars.direction2 = new BABYLON.Vector3(0, 0, 0);
    stars.gravity = new BABYLON.Vector3(0, 0, 0);
    stars.start();
}

// Place windows high on the walls
createWindow("winN1", 16, 6, -20, 18, 49.7, 0);
createWindow("winN2", 16, 6, 20, 18, 49.7, 0);
createWindow("winS1", 24, 6, 0, 18, -49.7, 0);
createWindow("winE1", 12, 5, 49.7, 18, -15, Math.PI/2);
createWindow("winW1", 12, 5, -49.7, 18, 15, Math.PI/2);

// (Boxes removed for cleaner gameplay — pillars provide enough cover)

// Structural columns (spread around arena)
createWall("col1", 3, wallHeight, 3, -20, wallHeight/2, -20, wallMat);
createWall("col2", 3, wallHeight, 3, 20, wallHeight/2, 20, wallMat);
createWall("col3", 3, wallHeight, 3, -20, wallHeight/2, 20, wallMat);
createWall("col4", 3, wallHeight, 3, 20, wallHeight/2, -20, wallMat);
createWall("col5", 2, wallHeight, 2, 0, wallHeight/2, 0, wallMat);
createWall("col6", 2, wallHeight, 2, -40, wallHeight/2, 0, wallMat);
createWall("col7", 2, wallHeight, 2, 40, wallHeight/2, 0, wallMat);
createWall("col8", 2, wallHeight, 2, 0, wallHeight/2, -40, wallMat);
createWall("col9", 2, wallHeight, 2, 0, wallHeight/2, 40, wallMat);



// === SPACESHIP DETAILS ===
var pipeMat = new BABYLON.StandardMaterial("pipeMat", scene);
pipeMat.diffuseColor = new BABYLON.Color3(0.3, 0.32, 0.35);
pipeMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
pipeMat.specularPower = 16;

var stripMat = new BABYLON.StandardMaterial("stripMat", scene);
stripMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
stripMat.emissiveColor = new BABYLON.Color3(0.4, 0.15, 0);

// Wall-mounted pipes (horizontal, along walls)
function createPipe(name, len, x, y, z, rotY) {
    var pipe = BABYLON.MeshBuilder.CreateCylinder(name, {
        height: len, diameter: 0.3, tessellation: 8
    }, scene);
    pipe.position = new BABYLON.Vector3(x, y, z);
    pipe.rotation.z = Math.PI / 2;
    pipe.rotation.y = rotY || 0;
    pipe.material = pipeMat;
    pipe.receiveShadows = true;
    return pipe;
}

createPipe("pipeN1", 30, -20, 3, 49.5, 0);
createPipe("pipeN2", 30, 20, 8, 49.5, 0);
createPipe("pipeS1", 40, 0, 5, -49.5, 0);
createPipe("pipeE1", 25, 49.5, 4, -15, Math.PI/2);
createPipe("pipeE2", 25, 49.5, 9, 15, Math.PI/2);
createPipe("pipeW1", 30, -49.5, 6, 10, Math.PI/2);

// Emissive floor warning strips
function createStrip(name, w, d, x, z) {
    var strip = BABYLON.MeshBuilder.CreateBox(name, {
        width: w, height: 0.02, depth: d
    }, scene);
    strip.position = new BABYLON.Vector3(x, 0.01, z);
    strip.material = stripMat;
    return strip;
}

createStrip("strip1", 60, 0.3, 0, -25);
createStrip("strip2", 60, 0.3, 0, 25);
createStrip("strip3", 0.3, 60, -25, 0);
createStrip("strip4", 0.3, 60, 25, 0);

// Tilted debris (broken panels for variety)
var debrisMat = new BABYLON.StandardMaterial("debrisMat", scene);
debrisMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.22);
var debris1 = BABYLON.MeshBuilder.CreateBox("debris1", { width: 4, height: 0.15, depth: 3 }, scene);
debris1.position = new BABYLON.Vector3(-32, 0.5, 12);
debris1.rotation = new BABYLON.Vector3(0.3, 0.5, 0.15);
debris1.material = debrisMat;
var debris2 = BABYLON.MeshBuilder.CreateBox("debris2", { width: 3, height: 0.15, depth: 5 }, scene);
debris2.position = new BABYLON.Vector3(28, 0.4, -8);
debris2.rotation = new BABYLON.Vector3(-0.2, -0.3, 0.1);
debris2.material = debrisMat;
var debris3 = BABYLON.MeshBuilder.CreateBox("debris3", { width: 2, height: 3, depth: 0.15 }, scene);
debris3.position = new BABYLON.Vector3(15, 1.5, -38);
debris3.rotation = new BABYLON.Vector3(0, 0, 0.4);
debris3.material = debrisMat;

// Ceiling vent grates
var ventMat = new BABYLON.StandardMaterial("ventMat", scene);
ventMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.17);
ventMat.emissiveColor = new BABYLON.Color3(0.02, 0.04, 0.06);
var vent1 = BABYLON.MeshBuilder.CreateBox("vent1", { width: 4, height: 0.1, depth: 4 }, scene);
vent1.position = new BABYLON.Vector3(-15, wallHeight - 0.15, -15);
vent1.material = ventMat;
var vent2 = BABYLON.MeshBuilder.CreateBox("vent2", { width: 4, height: 0.1, depth: 4 }, scene);
vent2.position = new BABYLON.Vector3(25, wallHeight - 0.15, 30);
vent2.material = ventMat;

// === PLAYER STATE ===
var playerHealth = 100;
var playerStamina = 100;
var isSprinting = false;
var score = 0;
var wave = 0;
var gameActive = false;
var playerCodes = 0;
var codesNeeded = 0;
var currentAmmo = 30;
var maxAmmo = 30;
var isReloading = false;
var playerHasEngaged = false;

// === STATS TRACKING ===
var stats = {
    shotsFired: 0,
    shotsHit: 0,
    hackedEnemies: 0,
    startTime: 0,
    endTime: 0
};

// === OVERRIDE CODES (collectibles) ===
var overrideCodes = [];
var codeMat = new BABYLON.StandardMaterial("codeMat", scene);
codeMat.diffuseColor = new BABYLON.Color3(0, 1, 0.8);
codeMat.emissiveColor = new BABYLON.Color3(0, 0.6, 0.5);
codeMat.alpha = 0.85;

function isPositionClear(x, z) {
    // Check if position is inside any box or column by raycasting down
    var ray = new BABYLON.Ray(new BABYLON.Vector3(x, 10, z), BABYLON.Vector3.Down(), 12);
    var hit = scene.pickWithRay(ray, function(mesh) {
        return mesh.name.startsWith("col") || mesh.name.startsWith("wall");
    });
    return !hit.hit;
}

function spawnOverrideCode() {
    var x, z, attempts = 0;
    do {
        x = (Math.random() - 0.5) * (roomSize - 20);
        z = (Math.random() - 0.5) * (roomSize - 20);
        attempts++;
    } while (!isPositionClear(x, z) && attempts < 30);
    
    // Diamond shape — rotated cube looks like a floating crystal
    var pad = BABYLON.MeshBuilder.CreateBox("code" + overrideCodes.length, {
        size: 0.6
    }, scene);
    pad.position = new BABYLON.Vector3(x, 1.8, z);
    pad.rotation = new BABYLON.Vector3(Math.PI / 4, 0, Math.PI / 4);
    pad.material = codeMat;
    pad.isPickable = false;
    
    // Particle trail underneath
    var trail = new BABYLON.ParticleSystem("codeTrail" + overrideCodes.length, 30, scene);
    trail.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
    trail.emitter = pad;
    trail.minEmitBox = BABYLON.Vector3.Zero();
    trail.maxEmitBox = BABYLON.Vector3.Zero();
    trail.color1 = new BABYLON.Color4(0, 1, 0.8, 0.8);
    trail.color2 = new BABYLON.Color4(0.2, 0.8, 1, 0.6);
    trail.colorDead = new BABYLON.Color4(0, 0.2, 0.15, 0);
    trail.direction1 = new BABYLON.Vector3(-0.2, -1, -0.2);
    trail.direction2 = new BABYLON.Vector3(0.2, -0.5, 0.2);
    trail.minSize = 0.05;
    trail.maxSize = 0.15;
    trail.minLifeTime = 0.3;
    trail.maxLifeTime = 0.8;
    trail.emitRate = 15;
    trail.gravity = new BABYLON.Vector3(0, -0.5, 0);
    trail.start();
    
    // Glow light
    var glow = new BABYLON.PointLight("codeLight" + overrideCodes.length, new BABYLON.Vector3(x, 2, z), scene);
    glow.diffuse = new BABYLON.Color3(0, 1, 0.8);
    glow.intensity = 0.5;
    glow.range = 5;
    
    overrideCodes.push({ mesh: pad, light: glow, trail: trail, collected: false });
}

function playCodePickupSound() {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = "sine";
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function playHackSound() {
    if (!audioCtx) return;
    // Rising digital chirp
    var osc1 = audioCtx.createOscillator();
    var osc2 = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc1.type = "square";
    osc2.type = "sine";
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);
    osc1.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.3);
    osc2.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(2000, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc1.start(); osc2.start();
    osc1.stop(audioCtx.currentTime + 0.3);
    osc2.stop(audioCtx.currentTime + 0.3);
}

// Shift to sprint
document.addEventListener("keydown", function(e) {
    if (e.keyCode === 16 && gameActive) isSprinting = true;
    if (e.keyCode === 82 && gameActive && currentAmmo < maxAmmo && !isReloading) {
        // R to reload
        isReloading = true;
        document.getElementById("ammoLabel").textContent = "RELOADING...";
        document.getElementById("ammoFill").style.width = "0%";
        playReloadSound();
        if (weaponViewmodel) weaponViewmodel.position.y -= 0.5; // hide weapon during reload
        setTimeout(function() {
            currentAmmo = maxAmmo;
            isReloading = false;
            if (weaponViewmodel) weaponViewmodel.position.y += 0.5;
            updateInfo();
        }, 1000);
    }
});
document.addEventListener("keyup", function(e) {
    if (e.keyCode === 16) isSprinting = false;
});

// === ADAPTIVE AI — track player behavior ===
var playerBehavior = {
    shotsFired: 0,
    timesMoving: 0,
    timesStanding: 0,
    lastPosition: null
};

function getPlayerStyle() {
    var total = playerBehavior.timesMoving + playerBehavior.timesStanding;
    if (total < 60) return "normal";
    var moveRatio = playerBehavior.timesMoving / total;
    if (moveRatio > 0.7) return "aggressive";
    if (moveRatio < 0.3) return "camper";
    return "normal";
}

// === PRE-LOAD 3D MODEL ===
var enemyContainer = null;
BABYLON.SceneLoader.LoadAssetContainer(
    "textures/", "enemy.glb", scene,
    function(container) {
        enemyContainer = container;
    }
);

var weaponContainer = null;
var weaponViewmodel = null;
BABYLON.SceneLoader.LoadAssetContainer(
    "models/", "blaster-b.glb", scene,
    function(container) {
        weaponContainer = container;
        var weaponNode = container.instantiateModelsToScene(function(n) { return n + "_viewmodel"; }, false);
        weaponViewmodel = weaponNode.rootNodes[0];
        weaponViewmodel.parent = camera;
        weaponViewmodel.position = new BABYLON.Vector3(0.15, -0.3, 0.5);
        weaponViewmodel.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
        weaponViewmodel.rotation = new BABYLON.Vector3(0, Math.PI, 0);
        var wMeshes = weaponViewmodel.getChildMeshes();
        for (var wm = 0; wm < wMeshes.length; wm++) {
            wMeshes[wm].isPickable = false;
            wMeshes[wm].renderingGroupId = 1;
        }
    }
);

// === ENEMIES ===
var enemies = [];
var ENEMY_SPEED = 0.02;
var ENEMY_DAMAGE = 10;
var ENEMY_ATTACK_RANGE = 3.0;
var ENEMY_ATTACK_COOLDOWN = 1500;

function createEnemy(x, z, isBoss) {
    var idx = enemies.length;
    var root = new BABYLON.TransformNode("enemy" + idx, scene);
    root.position = new BABYLON.Vector3(x, 0, z);

    var scale = isBoss ? 1.4 : 1.0;

    // Try to use the 3D model, fallback to primitives
    if (enemyContainer) {
        var entries = enemyContainer.instantiateModelsToScene(
            function(name) { return name + "_" + idx; },
            false
        );
        var modelRoot = entries.rootNodes[0];
        modelRoot.parent = root;
        modelRoot.position = BABYLON.Vector3.Zero();
        var s = 0.015 * scale;
        modelRoot.scaling = new BABYLON.Vector3(s, s, s);

        // Clip animation to walk cycle only (frames 60-170)
        var animGroups = entries.animationGroups;
        if (animGroups.length > 0) {
            var walkFrom = 78;
            var walkTo = 180;
            var spd = 1.3 + Math.random() * 0.3;
            animGroups[0].start(true, spd, walkFrom, walkTo);
            // Stagger start so enemies aren't in lockstep
            animGroups[0].goToFrame(walkFrom + Math.random() * (walkTo - walkFrom));
        }

        // Tint enemy meshes red (normal) or dark blue (boss) and add shadows
        var tintColor = isBoss
            ? new BABYLON.Color3(0.3, 0.3, 0.5)
            : new BABYLON.Color3(0.8, 0.2, 0.15);
        var meshes = modelRoot.getChildMeshes();
        for (var m = 0; m < meshes.length; m++) {
            meshes[m].isPickable = false;
            shadowGen.addShadowCaster(meshes[m]);
            if (meshes[m].material) {
                var tintMat = meshes[m].material.clone("tint_" + idx + "_" + m);
                tintMat.diffuseColor = tintColor;
                tintMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
                meshes[m].material = tintMat;
            }
        }
    } else {
        // Fallback: simple cylinder+sphere enemy
        var mat = isBoss ? bossMat : enemyMat;
        var body = BABYLON.MeshBuilder.CreateCylinder("ebody" + idx, {
            height: 1.5 * scale, diameter: 0.8 * scale, tessellation: 8
        }, scene);
        body.position.y = 0.75 * scale;
        body.material = mat;
        body.parent = root;
        body.isPickable = false;
        shadowGen.addShadowCaster(body);

        var head = BABYLON.MeshBuilder.CreateSphere("ehead" + idx, {
            diameter: 0.5 * scale, segments: 8
        }, scene);
        head.position.y = 1.7 * scale;
        head.material = mat;
        head.parent = root;
        head.isPickable = false;

        var visor = BABYLON.MeshBuilder.CreateBox("evisor" + idx, {
            width: 0.35 * scale, height: 0.07 * scale, depth: 0.06 * scale
        }, scene);
        visor.position.set(0, 1.72 * scale, 0.22 * scale);
        visor.material = enemyEyeMat;
        visor.parent = root;
        visor.isPickable = false;
    }

    // Compute hitboxes from actual model bounding box
    var modelH = 2.7 * scale; // default
    var modelW = 0.8 * scale;
    if (enemyContainer) {
        // Wait one frame for transforms to propagate, then compute bounds
        root.computeWorldMatrix(true);
        var children = root.getChildMeshes();
        if (children.length > 0) {
            var bounds = children[0].getHierarchyBoundingVectors(true);
            modelH = bounds.max.y - bounds.min.y;
            modelW = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z);
        }
    }

    var headCollider = BABYLON.MeshBuilder.CreateBox("hcol" + idx, {
        width: modelW * 0.5, height: modelH * 0.18, depth: modelW * 0.5
    }, scene);
    headCollider.position.y = modelH * 0.88;
    headCollider.parent = root;
    headCollider.visibility = 0;
    headCollider.isPickable = true;

    var bodyCollider = BABYLON.MeshBuilder.CreateBox("bcol" + idx, {
        width: modelW * 0.8, height: modelH * 0.65, depth: modelW * 0.8
    }, scene);
    bodyCollider.position.y = modelH * 0.38;
    bodyCollider.parent = root;
    bodyCollider.visibility = 0;
    bodyCollider.isPickable = true;

    // Random speed variation (±15%) so enemies don't move identically
    var baseSpeed = isBoss ? ENEMY_SPEED * 0.7 : ENEMY_SPEED;
    var speedVariation = baseSpeed * (0.85 + Math.random() * 0.3);

    var enemy = {
        root: root,
        headCollider: headCollider,
        bodyCollider: bodyCollider,
        alive: true,
        hacked: false,
        stunned: false,
        stunUntil: 0,
        health: isBoss ? 10 : 3,
        lastAttack: 0,
        isBoss: isBoss || false,
        speed: speedVariation,
        animGroups: (enemyContainer && typeof animGroups !== 'undefined') ? animGroups : null,
        currentAnim: "walk"
    };
    enemies.push(enemy);
    return enemy;
}

function spawnWave(count) {
    for (var i = 0; i < count; i++) {
        var x = (Math.random() - 0.5) * (roomSize - 10);
        var z = (Math.random() - 0.5) * (roomSize - 10);
        // Make sure enemies don't spawn too close to the player
        while (Math.abs(x - camera.position.x) < 15 && Math.abs(z - camera.position.z) < 15) {
            x = (Math.random() - 0.5) * (roomSize - 10);
            z = (Math.random() - 0.5) * (roomSize - 10);
        }
        createEnemy(x, z, false);
    }
}

function spawnBoss() {
    var x = (Math.random() - 0.5) * 20;
    var z = (Math.random() > 0.5 ? 1 : -1) * 20;
    createEnemy(x, z, true);
}

var codeSpawnTimers = [];

function startWave() {
    wave++;
    if (wave > 1) {
        var ctrl = document.getElementById("controlsOverlay");
        if (ctrl) ctrl.style.opacity = "0";
    }
    var count = 3 + wave;
    spawnWave(count);
    if (wave % 5 === 0) spawnBoss();
    
    // Spawn override codes gradually — first 2 immediately, rest every 4 seconds
    codesNeeded = count + (wave % 5 === 0 ? 1 : 0);
    var immediateCount = Math.min(2, codesNeeded);
    for (var c = 0; c < immediateCount; c++) {
        spawnOverrideCode();
    }
    // Clear old timers
    for (var t = 0; t < codeSpawnTimers.length; t++) {
        clearTimeout(codeSpawnTimers[t]);
    }
    codeSpawnTimers = [];
    // Schedule remaining codes
    for (var c = immediateCount; c < codesNeeded; c++) {
        (function(delay) {
            var timer = setTimeout(function() {
                if (gameActive) spawnOverrideCode();
            }, delay);
            codeSpawnTimers.push(timer);
        })((c - immediateCount + 1) * 4000);
    }
    
    showWaveText(wave);
    updateInfo();
}

// === SHOOTING (mousedown on document — works with pointer lock) ===
document.addEventListener("mousedown", function(e) {
    if (!gameActive) return;
    if (e.button !== 0) return; // left click only
    if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        return;
    }
    if (isReloading || currentAmmo <= 0) {
        if (currentAmmo <= 0 && !isReloading) {
            // Auto reload
            isReloading = true;
            document.getElementById("ammoLabel").textContent = "RELOADING...";
            document.getElementById("ammoFill").style.width = "0%";
            playReloadSound();
            if (weaponViewmodel) weaponViewmodel.position.y -= 0.5;
            setTimeout(function() {
                currentAmmo = maxAmmo;
                isReloading = false;
                if (weaponViewmodel) weaponViewmodel.position.y += 0.5;
                updateInfo();
            }, 1000);
        }
        return;
    }

    playerHasEngaged = true;
    initAudio();
    playShootSound();
    playerBehavior.shotsFired++;
    stats.shotsFired++;
    currentAmmo--;
    updateInfo();
    
    // Muzzle flash
    muzzleLight.intensity = 2.0;

    // Weapon Recoil Animation
    if (weaponViewmodel) {
        var startZ = weaponViewmodel.position.z;
        var startRotX = weaponViewmodel.rotation.x;
        // Kick back and up
        weaponViewmodel.position.z = startZ - 0.15;
        weaponViewmodel.rotation.x = startRotX - 0.1;
        
        // Recover
        var recover = setInterval(function() {
            if (!weaponViewmodel) { clearInterval(recover); return; }
            weaponViewmodel.position.z += 0.03;
            weaponViewmodel.rotation.x += 0.02;
            if (weaponViewmodel.position.z >= startZ) {
                weaponViewmodel.position.z = startZ;
                weaponViewmodel.rotation.x = startRotX;
                clearInterval(recover);
            }
        }, 16);
    }

    var forward = camera.getDirection(BABYLON.Vector3.Forward());
    var ray = new BABYLON.Ray(camera.position, forward, 100);
    var hit = scene.pickWithRay(ray);

    if (hit.hit && hit.pickedMesh) {
        var hitEnemy = false;
        for (var i = 0; i < enemies.length; i++) {
            if (!enemies[i].alive || enemies[i].hacked) continue;

            var isHeadshot = (enemies[i].headCollider === hit.pickedMesh);
            var isBodyshot = (enemies[i].bodyCollider === hit.pickedMesh);

            if (isHeadshot || isBodyshot) {
                hitEnemy = true;
                stats.shotsHit++;
                var damage = isHeadshot ? 3 : 1;
                enemies[i].health -= damage;
                playHitSound();
                showHitMarker();
                
                var meshes = enemies[i].root.getChildMeshes();

                if (enemies[i].health <= 0) {
                    // Screen projection for floating score
                    var screenPos = BABYLON.Vector3.Project(
                        enemies[i].root.position.clone().add(new BABYLON.Vector3(0, 2, 0)),
                        BABYLON.Matrix.Identity(),
                        scene.getTransformMatrix(),
                        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
                    );
                    
                    if (playerCodes > 0) {
                        // === HACK: override the enemy ===
                        playerCodes--;
                        enemies[i].hacked = true;
                        enemies[i].alive = false; // stops AI movement
                        stats.hackedEnemies++;
                        playHackSound();
                        showHackText();
                        if (isHeadshot) showHeadshotText();
                        var pts = enemies[i].isBoss ? 500 : 100;
                        score += pts;
                        createFloatingScore("+" + pts + " HACKED", screenPos.x, screenPos.y);
                        
                        // Tint enemy green to show hacked state
                        var hackedColor = new BABYLON.Color3(0.1, 0.8, 0.5);
                        for (var m = 0; m < meshes.length; m++) {
                            if (meshes[m].material && meshes[m].material.diffuseColor) {
                                meshes[m].material.diffuseColor = hackedColor;
                                meshes[m].material.emissiveColor = new BABYLON.Color3(0, 0.3, 0.2);
                            }
                        }
                        // Stop animation
                        if (enemies[i].animGroups) {
                            for (var ag = 0; ag < enemies[i].animGroups.length; ag++) {
                                enemies[i].animGroups[ag].stop();
                            }
                        }
                        // Green particles effect
                        createHackEffect(enemies[i].root.position.clone().add(new BABYLON.Vector3(0, 1.5, 0)));
                    } else {
                        // === STUN: no codes available ===
                        enemies[i].health = 1; // restore minimal HP
                        enemies[i].stunned = true;
                        enemies[i].stunUntil = Date.now() + 3000;
                        showStunText();
                        createHitEffect(hit.pickedPoint);
                    }
                } else {
                    // Red flash on enemy
                    for (var m = 0; m < meshes.length; m++) {
                        if (meshes[m].material) {
                            var oldEmissive = meshes[m].material.emissiveColor.clone();
                            meshes[m].material.emissiveColor = new BABYLON.Color3(1, 0, 0);
                            (function(mat, old) {
                                setTimeout(function() { mat.emissiveColor = old; }, 100);
                            })(meshes[m].material, oldEmissive);
                        }
                    }
                    createHitEffect(hit.pickedPoint);
                }
                updateInfo();
                break;
            }
        }

        if (!hitEnemy && hit.pickedMesh.isPickable) {
            // Hit a wall/floor — Spawn bullet decal
            var decal = BABYLON.MeshBuilder.CreateDecal("bulletHole", hit.pickedMesh, {
                position: hit.pickedPoint,
                normal: hit.getNormal(true),
                size: new BABYLON.Vector3(0.5, 0.5, 0.5)
            });
            decal.material = bulletHoleMat;
            decal.setParent(hit.pickedMesh);
            createHitEffect(hit.pickedPoint); // Sparks on the wall
            
            // Cleanup decal after 10 seconds to prevent lag
            setTimeout(function() {
                if (decal) decal.dispose();
            }, 10000);
        }
    }
});

// === MANUAL FPS MOUSE LOOK ===
document.addEventListener("mousemove", function(e) {
    if (!gameActive || document.pointerLockElement !== canvas) return;
    camera.rotation.y += e.movementX * 0.002;
    camera.rotation.x += e.movementY * 0.002;
    camera.rotation.x = Math.max(-1.4, Math.min(1.4, camera.rotation.x));
});

// === PARTICLES ===
function createHitEffect(position) {
    var particles = new BABYLON.ParticleSystem("hit", 50, scene);
    particles.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
    particles.emitter = position;
    particles.minEmitBox = new BABYLON.Vector3(0, 0, 0);
    particles.maxEmitBox = new BABYLON.Vector3(0, 0, 0);
    particles.color1 = new BABYLON.Color4(1, 0.3, 0, 1);
    particles.color2 = new BABYLON.Color4(1, 0.8, 0, 1);
    particles.colorDead = new BABYLON.Color4(0.2, 0, 0, 0);
    particles.direction1 = new BABYLON.Vector3(-2, 2, -2);
    particles.direction2 = new BABYLON.Vector3(2, 4, 2);
    particles.minSize = 0.1;
    particles.maxSize = 0.3;
    particles.minLifeTime = 0.2;
    particles.maxLifeTime = 0.5;
    particles.emitRate = 200;
    particles.manualEmitCount = 40;
    particles.targetStopDuration = 0.2;
    particles.disposeOnStop = true;
    particles.start();
}

// Green particles for successful hack
function createHackEffect(position) {
    var particles = new BABYLON.ParticleSystem("hack", 80, scene);
    particles.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
    particles.emitter = position;
    particles.minEmitBox = new BABYLON.Vector3(-0.5, 0, -0.5);
    particles.maxEmitBox = new BABYLON.Vector3(0.5, 0, 0.5);
    particles.color1 = new BABYLON.Color4(0, 1, 0.7, 1);
    particles.color2 = new BABYLON.Color4(0.2, 1, 0.5, 1);
    particles.colorDead = new BABYLON.Color4(0, 0.3, 0.1, 0);
    particles.direction1 = new BABYLON.Vector3(-1, 3, -1);
    particles.direction2 = new BABYLON.Vector3(1, 5, 1);
    particles.minSize = 0.1;
    particles.maxSize = 0.35;
    particles.minLifeTime = 0.4;
    particles.maxLifeTime = 0.8;
    particles.emitRate = 300;
    particles.manualEmitCount = 60;
    particles.targetStopDuration = 0.3;
    particles.disposeOnStop = true;
    particles.start();
}

// === HUD ===
function updateInfo() {
    var alive = 0;
    for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].alive) alive++;
    }
    var style = getPlayerStyle();

    document.getElementById("scoreRow").textContent = "SCORE " + score;
    if (!isReloading) {
        document.getElementById("ammoLabel").textContent = "AMMO " + currentAmmo + " / " + maxAmmo;
        var ammoPct = Math.max(0, (currentAmmo / maxAmmo) * 100);
        document.getElementById("ammoFill").style.width = ammoPct + "%";
        if (currentAmmo <= 5) {
            document.getElementById("ammoLabel").style.color = "#ff2222";
            document.getElementById("ammoFill").style.background = "linear-gradient(90deg, #ff2222, #ff5555)";
        } else {
            document.getElementById("ammoLabel").style.color = "white";
            document.getElementById("ammoFill").style.background = "linear-gradient(90deg, #ffcc00, #ffee66)";
        }
    }
    document.getElementById("waveRow").textContent = "WAVE " + wave + " — " + alive + " HOSTILE" + (alive !== 1 ? "S" : "");
    document.getElementById("codesRow").textContent = "CODES " + playerCodes + " / " + codesNeeded;

    var aiRow = document.getElementById("aiRow");
    if (style === "aggressive") {
        aiRow.style.display = "block";
        aiRow.textContent = "AI: FLANKING";
    } else if (style === "camper") {
        aiRow.style.display = "block";
        aiRow.textContent = "AI: RUSHING";
    } else {
        aiRow.style.display = "none";
    }

    // Health bar & Stamina
    var pct = Math.max(0, playerHealth);
    document.getElementById("healthFill").style.width = pct + "%";
    document.getElementById("healthLabel").textContent = "HP " + pct;
    if (pct > 60) {
        document.getElementById("healthFill").style.background = "linear-gradient(90deg, #00cc66, #33ff99)";
    } else if (pct > 30) {
        document.getElementById("healthFill").style.background = "linear-gradient(90deg, #ff9900, #ffcc00)";
    } else {
        document.getElementById("healthFill").style.background = "linear-gradient(90deg, #ff2222, #ff5555)";
    }
    
    document.getElementById("staminaFill").style.width = Math.max(0, playerStamina) + "%";
}

// === EFFECTS ===
function showHitMarker() {
    var hm = document.getElementById("hitMarker");
    hm.classList.add("hit-active");
    setTimeout(function() { hm.classList.remove("hit-active"); }, 100);
}

function showDirectionalDamage(enemyPos) {
    var dirElement = document.getElementById("damageDir");
    // Calculate angle between player forward and enemy
    var dx = enemyPos.x - camera.position.x;
    var dz = enemyPos.z - camera.position.z;
    var angleToEnemy = Math.atan2(dx, dz);
    var cameraAngle = camera.rotation.y;
    var relativeAngle = angleToEnemy - cameraAngle;
    
    // Rotate the red crescent
    dirElement.style.transform = "translate(-50%, -50%) rotate(" + relativeAngle + "rad)";
    dirElement.style.opacity = "1";
    setTimeout(function() { dirElement.style.opacity = "0"; }, 500);
}

function showDamageFlash() {
    var flash = document.getElementById("damageFlash");
    flash.style.opacity = "1";
    setTimeout(function() { flash.style.opacity = "0"; }, 200);
}

function showHeadshotText() {
    var el = document.getElementById("headshotText");
    el.style.opacity = "1";
    setTimeout(function() { el.style.opacity = "0"; }, 600);
}

function showHackText() {
    var el = document.getElementById("hackText");
    el.style.opacity = "1";
    setTimeout(function() { el.style.opacity = "0"; }, 1200);
}

function showStunText() {
    var el = document.getElementById("stunText");
    el.style.opacity = "1";
    setTimeout(function() { el.style.opacity = "0"; }, 1500);
}

function showWaveText(waveNum) {
    var el = document.getElementById("waveText");
    el.innerHTML = "WAVE " + waveNum + '<br><span style="font-size:18px;color:#00ffcc;letter-spacing:3px;">COLLECT OVERRIDE CODES</span>';
    el.style.opacity = "1";
    setTimeout(function() { el.style.opacity = "0"; }, 2500);
}

function screenShake(intensity, duration) {
    var originalPos = camera.position.clone();
    var shakeStart = Date.now();
    var shakeInterval = setInterval(function() {
        var elapsed = Date.now() - shakeStart;
        if (elapsed > duration) {
            clearInterval(shakeInterval);
            return;
        }
        var factor = 1 - (elapsed / duration); // Fade out
        camera.position.x = originalPos.x + (Math.random() - 0.5) * intensity * factor;
        camera.position.y = originalPos.y + (Math.random() - 0.5) * intensity * factor * 0.5;
    }, 16);
}

// === GAME START / RESTART ===
function startGame() {
    initAudio();
    gameActive = true;
    playerHealth = 100;
    playerStamina = 100;
    score = 0;
    wave = 0;
    playerCodes = 0;
    codesNeeded = 0;
    currentAmmo = maxAmmo;
    isReloading = false;
    playerHasEngaged = false;
    playerBehavior = { shotsFired: 0, timesMoving: 0, timesStanding: 0, lastPosition: null };
    stats = { shotsFired: 0, shotsHit: 0, hackedEnemies: 0, startTime: Date.now(), endTime: 0 };
    
    document.getElementById("statsArea").innerHTML = "";
    var ctrl = document.getElementById("controlsOverlay");
    if (ctrl) ctrl.style.opacity = "1";

    for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].root) enemies[i].root.dispose();
    }
    enemies = [];
    
    // Clean up override codes
    for (var i = 0; i < overrideCodes.length; i++) {
        if (overrideCodes[i].trail) overrideCodes[i].trail.dispose();
        if (overrideCodes[i].mesh) overrideCodes[i].mesh.dispose();
        if (overrideCodes[i].light) overrideCodes[i].light.dispose();
    }
    overrideCodes = [];

    camera.position = new BABYLON.Vector3(-40, 2.4, -40);
    camera.rotation = new BABYLON.Vector3(0, Math.PI / 4, 0);
    document.getElementById("startScreen").style.display = "none";

    // Attach keyboard controls only (mouse is manual)
    camera.attachControl(canvas, true);
    canvas.focus();
    canvas.requestPointerLock();

    startWave();
    updateInfo();
}

function showGameOver() {
    gameActive = false;
    stats.endTime = Date.now();
    var secondsSurvived = Math.floor((stats.endTime - stats.startTime) / 1000);
    var accuracy = stats.shotsFired > 0 ? Math.floor((stats.shotsHit / stats.shotsFired) * 100) : 0;
    
    camera.detachControl(canvas);
    document.getElementById("startScreen").style.display = "flex";
    document.getElementById("startScreen").querySelector("h1").textContent = "GAME OVER";
    document.getElementById("statsArea").innerHTML =
        "Score: <span style='color:#00ffcc'>" + score + "</span><br>" +
        "Waves Survived: <span style='color:#00ffcc'>" + wave + "</span><br>" +
        "Time Alive: <span style='color:#00ffcc'>" + secondsSurvived + "s</span><br>" +
        "Enemies Hacked: <span style='color:#00ffcc'>" + stats.hackedEnemies + "</span><br>" +
        "Accuracy: <span style='color:#00ffcc'>" + accuracy + "%</span>";
    document.getElementById("startBtn").textContent = "RESTART";
    if (document.pointerLockElement) document.exitPointerLock();
}


// Handle pointer lock changes for Pause
document.addEventListener("pointerlockchange", function() {
    if (document.pointerLockElement !== canvas && gameActive && playerHealth > 0) {
        // Player pressed ESC — pause
        gameActive = false;
        document.getElementById("pauseScreen").style.display = "flex";
    }
});

document.getElementById("pauseScreen").addEventListener("click", function() {
    gameActive = true;
    document.getElementById("pauseScreen").style.display = "none";
    canvas.requestPointerLock();
});

document.getElementById("startBtn").addEventListener("click", function(e) {
    e.stopPropagation(); // prevent document mousedown from firing
    if (!enemyContainer) {
        document.getElementById("startBtn").textContent = "LOADING 3D MODEL...";
        return;
    }
    startGame();
});

// === GAME LOOP ===
scene.registerBeforeRender(function() {
    if (!gameActive) return;

    var now = Date.now();
    var aliveCount = 0;
    
    // Muzzle flash decay
    if (muzzleLight.intensity > 0) {
        muzzleLight.intensity = Math.max(0, muzzleLight.intensity - 0.2);
    }
    
    // Track player movement
    var currentPos = camera.position.clone();
    var moved = 0;
    if (playerBehavior.lastPosition) {
        moved = BABYLON.Vector3.Distance(currentPos, playerBehavior.lastPosition);
        if (moved > 0.01) playerBehavior.timesMoving++;
        else playerBehavior.timesStanding++;
    }
    playerBehavior.lastPosition = currentPos;
    
    // Camera Bob and Footsteps
    if (moved > 0.01) {
        playerHasEngaged = true;
        var bobSpeed = isSprinting ? 0.22 : 0.12;
        var bobAmp = isSprinting ? 0.08 : 0.05;
        var oldSin = Math.sin(bobTime);
        bobTime += bobSpeed;
        var newSin = Math.sin(bobTime);
        camera.position.y = 2.4 + newSin * bobAmp;
        
        // Play footstep when crossing 0 downwards
        if (oldSin > 0 && newSin <= 0) {
            playFootstepSound();
        }
    } else {
        // Smoothly return to center
        bobTime = 0;
        camera.position.y += (2.4 - camera.position.y) * 0.1;
    }
    
    // Handle Sprinting & Stamina
    if (isSprinting && playerStamina > 0 && moved > 0.01) {
        playerStamina -= 0.5;
        camera.speed = 1.0;
    } else {
        playerStamina += 0.2;
        camera.speed = 0.5;
    }
    playerStamina = Math.max(0, Math.min(100, playerStamina));

    // === Collect Override Codes ===
    for (var ci = overrideCodes.length - 1; ci >= 0; ci--) {
        var code = overrideCodes[ci];
        if (code.collected) continue;
        
        // Rotate the diamond and float it
        code.mesh.rotation.y += 0.02;
        code.mesh.position.y = 1.8 + Math.sin(now * 0.003 + ci) * 0.4;
        // Pulse the glow
        code.light.intensity = 1.0 + Math.sin(now * 0.005 + ci * 2) * 0.4;
        code.light.position.y = code.mesh.position.y + 0.2;
        
        var dist = BABYLON.Vector3.Distance(camera.position, code.mesh.position);
        if (dist < 2.5) {
            code.collected = true;
            code.trail.stop();
            code.trail.dispose();
            code.mesh.dispose();
            code.light.dispose();
            playerCodes++;
            playCodePickupSound();
            overrideCodes.splice(ci, 1);
        }
    }
    
    updateInfo();

    // === CLAMP PLAYER INSIDE ARENA ===
    var playerLimit = roomSize / 2 - 1.0;
    camera.position.x = Math.max(-playerLimit, Math.min(playerLimit, camera.position.x));
    camera.position.z = Math.max(-playerLimit, Math.min(playerLimit, camera.position.z));

    // Update player marker on minimap
    playerMarker.position.x = camera.position.x;
    playerMarker.position.y = 10;
    playerMarker.position.z = camera.position.z;
    playerMarker.rotation.y = camera.rotation.y;

    var style = getPlayerStyle();
    var waveSpeedMultiplier = 1 + (wave - 1) * 0.15;
    var arenaLimit = roomSize / 2 - 1.5;

    for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].hacked) continue; // hacked enemies stay in scene but are inert
        if (!enemies[i].alive) continue;
        
        if (!playerHasEngaged) {
            if (enemies[i].animGroups && enemies[i].animGroups[0] && enemies[i].animGroups[0].isPlaying) {
                for (var ag = 0; ag < enemies[i].animGroups.length; ag++) {
                    enemies[i].animGroups[ag].pause();
                }
            }
            continue;
        } else {
            if (enemies[i].animGroups && enemies[i].animGroups[0] && !enemies[i].animGroups[0].isPlaying && !enemies[i].stunned) {
                for (var ag = 0; ag < enemies[i].animGroups.length; ag++) {
                    enemies[i].animGroups[ag].play(true);
                }
            }
        }
        
        // Handle stun recovery
        if (enemies[i].stunned) {
            if (now >= enemies[i].stunUntil) {
                enemies[i].stunned = false;
            } else {
                continue; // skip movement while stunned
            }
        }
        
        aliveCount++;

        var enemyPos = enemies[i].root.position;
        var playerPos = camera.position;

        var dir = playerPos.subtract(enemyPos);
        dir.y = 0;
        var distance = dir.length();

        enemies[i].root.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;

        var speed = enemies[i].speed * waveSpeedMultiplier;

        // === ADAPTIVE AI ===
        if (distance > ENEMY_ATTACK_RANGE) {
            dir.normalize();
            var moveDir = dir.clone();

            if (style === "camper") {
                speed *= 1.5;
            } else if (style === "aggressive") {
                var side = new BABYLON.Vector3(-dir.z, 0, dir.x);
                var flankAmount = Math.sin(now * 0.002 + i * 2) * 0.5;
                moveDir.addInPlace(side.scale(flankAmount));
                moveDir.normalize();
            }

            // Save position before move
            var oldX = enemyPos.x;
            var oldZ = enemyPos.z;

            // Obstacle avoidance with ray
            var rayOrigin = enemyPos.add(new BABYLON.Vector3(0, 0.5, 0));
            var obstacleFilter = function(mesh) {
                return mesh.name.startsWith("wall") || mesh.name.startsWith("col");
            };
            var ray = new BABYLON.Ray(rayOrigin, moveDir, 3.0);
            var hit = scene.pickWithRay(ray, obstacleFilter);

            if (hit.hit) {
                // Try both sides and pick the clear one
                var sideL = new BABYLON.Vector3(-moveDir.z, 0, moveDir.x);
                var sideR = new BABYLON.Vector3(moveDir.z, 0, -moveDir.x);
                
                var rayL = new BABYLON.Ray(rayOrigin, sideL, 2.0);
                var rayR = new BABYLON.Ray(rayOrigin, sideR, 2.0);
                var hitL = scene.pickWithRay(rayL, obstacleFilter);
                var hitR = scene.pickWithRay(rayR, obstacleFilter);
                
                var chosenDir;
                if (!hitL.hit && !hitR.hit) {
                    var dotL = sideL.x * dir.x + sideL.z * dir.z;
                    chosenDir = dotL > 0 ? sideL : sideR;
                } else if (!hitL.hit) {
                    chosenDir = sideL;
                } else if (!hitR.hit) {
                    chosenDir = sideR;
                } else {
                    chosenDir = new BABYLON.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2).normalize();
                }
                enemyPos.addInPlace(chosenDir.scale(speed));
            } else {
                enemyPos.addInPlace(moveDir.scale(speed));
            }

            // === HARD PILLAR COLLISION ===
            // Push enemy out of any pillar they overlap with (AABB check)
            var colPositions = [
                { x: -20, z: -20, hw: 1.5 }, { x: 20, z: 20, hw: 1.5 },
                { x: -20, z: 20, hw: 1.5 }, { x: 20, z: -20, hw: 1.5 },
                { x: 0, z: 0, hw: 1.0 }, { x: -40, z: 0, hw: 1.0 },
                { x: 40, z: 0, hw: 1.0 }, { x: 0, z: -40, hw: 1.0 },
                { x: 0, z: 40, hw: 1.0 }
            ];
            var enemyRadius = 1.8;
            for (var cp = 0; cp < colPositions.length; cp++) {
                var col = colPositions[cp];
                var margin = col.hw + enemyRadius;
                var dx = enemyPos.x - col.x;
                var dz = enemyPos.z - col.z;
                if (Math.abs(dx) < margin && Math.abs(dz) < margin) {
                    // Push out along the smallest overlap axis
                    var overlapX = margin - Math.abs(dx);
                    var overlapZ = margin - Math.abs(dz);
                    if (overlapX < overlapZ) {
                        enemyPos.x += (dx > 0 ? overlapX : -overlapX);
                    } else {
                        enemyPos.z += (dz > 0 ? overlapZ : -overlapZ);
                    }
                }
            }

            // Clamp enemy inside arena walls
            enemyPos.x = Math.max(-arenaLimit, Math.min(arenaLimit, enemyPos.x));
            enemyPos.z = Math.max(-arenaLimit, Math.min(arenaLimit, enemyPos.z));
        } else {
            // Attack
            if (now - enemies[i].lastAttack > ENEMY_ATTACK_COOLDOWN) {
                enemies[i].lastAttack = now;
                var dmg = enemies[i].isBoss ? ENEMY_DAMAGE * 2 : ENEMY_DAMAGE;
                playerHealth -= dmg;
                showDamageFlash();
                showDirectionalDamage(enemyPos);
                screenShake(0.15, 150);
                playDamageSound();
                updateInfo();

                if (playerHealth <= 0) {
                    showGameOver();
                    return;
                }
            }
        }
    }

    // Flickering lights update
    for (var fi = 0; fi < flickerLights.length; fi++) {
        var fdata = flickerLights[fi];
        var flicker = Math.sin(now * 0.001 * fdata.speed + fdata.phase) * 0.4
                    + Math.sin(now * 0.003 * fdata.speed + fdata.phase * 2) * 0.2
                    + (Math.random() - 0.5) * 0.3;
        fdata.light.intensity = Math.max(0.05, fdata.baseIntensity + flicker);
    }
    // Red light subtle pulse
    redLight.intensity = 1.5 + Math.sin(now * 0.002) * 0.4;

    // Count how many enemies are hacked vs total
    var hackedCount = 0;
    var totalEnemies = 0;
    for (var ei = 0; ei < enemies.length; ei++) {
        totalEnemies++;
        if (enemies[ei].hacked) hackedCount++;
    }
    
    // Wave complete when all enemies are hacked
    if (totalEnemies > 0 && hackedCount === totalEnemies && gameActive) {
        // Clean up remaining codes
        for (var ci = 0; ci < overrideCodes.length; ci++) {
            if (overrideCodes[ci].trail) overrideCodes[ci].trail.dispose();
            if (overrideCodes[ci].mesh) overrideCodes[ci].mesh.dispose();
            if (overrideCodes[ci].light) overrideCodes[ci].light.dispose();
        }
        overrideCodes = [];
        playerCodes = 0;
        
        // Dispose hacked enemy meshes
        for (var ei = 0; ei < enemies.length; ei++) {
            if (enemies[ei].root) enemies[ei].root.dispose();
        }
        enemies = [];
        
        startWave();
    }
});

// === START ===
engine.runRenderLoop(function() {
    scene.render();
});

window.addEventListener("resize", function() {
    engine.resize();
});
