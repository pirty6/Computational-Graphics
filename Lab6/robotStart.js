////////////////////////////////////////////////////////////////////////////////
/*global THREE, Coordinates, document, window  */
var camera, scene, renderer;
var cameraControls;

var clock = new THREE.Clock();

function fillScene() {
	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0x808080, 2000, 4000 );

	// LIGHTS

	scene.add( new THREE.AmbientLight( 0x222222 ) );

	var light = new THREE.DirectionalLight( 0xffffff, 0.7 );
	light.position.set( 200, 500, 500 );

	scene.add( light );

	light = new THREE.DirectionalLight( 0xffffff, 0.9 );
	light.position.set( -200, -100, -400 );

	scene.add( light );

//grid xz
 var gridXZ = new THREE.GridHelper(2000, 100, new THREE.Color(0xCCCCCC), new THREE.Color(0x888888));
 scene.add(gridXZ);

 //axes
 var axes = new THREE.AxisHelper(150);
 axes.position.y = 1;
 scene.add(axes);

 drawRobot();
}

function drawRobot() {

	//////////////////////////////
	// MATERIALS

	var bodyMaterial = new THREE.MeshLambertMaterial();
	bodyMaterial.color.setRGB( 0.5, 0.5, 0.5 );
	let materialGrey = new THREE.MeshPhongMaterial({color: 0x404040});
	let materialYellow = new THREE.MeshLambertMaterial({color: 0xEDE817});

	let root = new THREE.Group();

	let tJoint = new THREE.Mesh(new THREE.SphereBufferGeometry(6,32,32), materialGrey);
	let tBone = new THREE.Mesh(new THREE.CylinderBufferGeometry(5,5,30,32), materialYellow);
	let tPiece = new THREE.Object3D();
	let tFeet = new THREE.Mesh(new THREE.BoxBufferGeometry(10, 5, 21), materialYellow);
	tBone.position.y = -18;
	tFeet.position.y = -5;
	tFeet.position.z = 5;
	tPiece.add(tJoint);
	tPiece.add(tBone);

	// Left Ankle
	let lAnkle = new THREE.Object3D();
	lAnkle.add(tJoint.clone());
	lAnkle.add(tFeet);

	// Right Ankle
	let rAnkle = lAnkle.clone();

	// Left Knee
	let lKnee = new THREE.Object3D();
	let tKnee = tPiece.clone();
	tKnee.position.y = 30;
	lKnee.add(tKnee);
	lKnee.add(lAnkle);

	// Right Knee
	let rKnee = new THREE.Object3D();
	let rtKnee = tKnee.clone();
	rKnee.add(rtKnee);
	rKnee.add(rAnkle);

	lKnee.rotation.x = Math.PI / 10;
	lKnee.position.z = -10;
	rKnee.rotation.x = Math.PI / 10;
	rKnee.position.z = -10;

	// Left Hip
	let lHip = new THREE.Object3D();
	let tHip = tPiece.clone();
	tHip.position.y = 60;
	lHip.add(tHip);
	lHip.add(lKnee);
	lHip.position.x = -15;

	// Right Ankle
	let rHip = new THREE.Object3D();
	let rTHip = tHip.clone();
	rHip.add(rTHip);
	rHip.add(rKnee);
	rHip.position.x = 15;

	rHip.rotation.x = Math.PI / 8;
	rHip.position.z = -25;
	lHip.rotation.x =  - Math.PI / 8;
	lHip.position.z = 25;

	// Neck
	let tNeck = new THREE.Mesh(new THREE.SphereBufferGeometry(7,32,32), materialGrey);
	tNeck.position.y = 24;

	// Face
	let rEye = new THREE.Mesh(new THREE.SphereBufferGeometry(3,32,32), materialGrey);
	rEye.position.y = 3;
	let lEar = rEye.clone();
	let rEar = rEye.clone();
	rEye.position.z = 10;
	let lEye = rEye.clone();
	lEar.position.x = -20;
	rEar.position.x = 20;
	lEye.position.x = -9;
	rEye.position.x = 9;
	let mouth = new THREE.Mesh(new THREE.BoxBufferGeometry(15, 3, 15), materialGrey);
	mouth.position.y = -5;
	mouth.position.z = 6;

	// Head
	let tHead = new THREE.Mesh(new THREE.BoxBufferGeometry(40, 20, 20), materialYellow)
	tHead.position.y = 37;
	tHead.add(rEye);
	tHead.add(lEye);
	tHead.add(mouth);
	tHead.add(lEar);
	tHead.add(rEar);

	// Left Hand
	let lHand = new THREE.Object3D();
	let tHand = new THREE.Mesh(new THREE.BoxBufferGeometry(5, 10, 10), materialYellow);
	tHand.position.y = -5;
	lHand.add(tJoint.clone());
	lHand.add(tHand);
	lHand.position.y = - 30;
	let rHand = lHand.clone();

	// Elbows
	let lElbow = tPiece.clone();
	lElbow.position.y = -30
	let rElbow = lElbow.clone();
	lElbow.add(lHand);
	rElbow.add(rHand);
	lElbow.rotation.x = - Math.PI / 8;
	rElbow.rotation.x = - Math.PI / 8;

	// Left Shoulder
	let lShld = tPiece.clone();
	lShld.position.y = 13;

	// Right Shoulder
	rShoulder = lShld.clone();
	rShoulder.position.x = 25;
	rShoulder.add(rElbow);
	rShoulder.rotation.z = Math.PI / 8;

	lShld.position.x = -25;
	lShld.rotation.z = - Math.PI / 8;
	lShld.add(lElbow);

	// Chest
	let tChest = new THREE.Mesh(new THREE.BoxBufferGeometry(40, 40, 20), materialYellow);
	tChest.position.y = 95;
	tChest.add(tNeck);
	tChest.add(tHead);
	tChest.add(lShld);
	tChest.add(rShoulder);

	// Root
	let troot = new THREE.Mesh(new THREE.BoxBufferGeometry(40, 5, 20), materialYellow);
	let tjroot = new THREE.Mesh(new THREE.SphereBufferGeometry(10,32,32), materialGrey);
	troot.position.y = 63;
	tjroot.position.y = 71;
	root.add(troot);
	root.add(tjroot);
	root.add(lHip);
	root.add(rHip);
	root.add(tChest);
	root.position.y = 10;
	var cylinder;

	// MODELS

 //body
	cylinder = new THREE.Mesh(
		new THREE.CylinderGeometry( 60, 60, 150, 32 ), bodyMaterial );
	cylinder.position.x = 0;
	cylinder.position.y = 320;
	cylinder.position.z = 0;
	scene.add( root );

}

function init() {
	var canvasWidth = 600;
	var canvasHeight = 400;
	var canvasRatio = canvasWidth / canvasHeight;

	// RENDERER
	renderer = new THREE.WebGLRenderer( { antialias: true } );

	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.setSize(canvasWidth, canvasHeight);
	renderer.setClearColor( 0xAAAAAA, 1.0 );

	// CAMERA
	camera = new THREE.PerspectiveCamera( 45, canvasRatio, 1, 4000 );
	// CONTROLS
	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	camera.position.set( -800, 600, -500);
	cameraControls.target.set(4,301,92);
}

function addToDOM() {
    var canvas = document.getElementById('canvas');
    canvas.appendChild(renderer.domElement);
}

function animate() {
	window.requestAnimationFrame(animate);
	render();
}

function render() {
	var delta = clock.getDelta();
	cameraControls.update(delta);

	renderer.render(scene, camera);
}

try {
  init();
  fillScene();
  addToDOM();
  animate();
} catch(error) {
    console.log("Your program encountered an unrecoverable error, can not draw on canvas. Error was:");
    console.log(error);
}
