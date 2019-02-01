////////////////////////////////////////////////////////////////////////////////
/*global THREE, document, window  */
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
;

//grid xz
 var gridXZ = new THREE.GridHelper(2000, 100);
 gridXZ.setColors( new THREE.Color(0xCCCCCC), new THREE.Color(0x888888) );
 scene.add(gridXZ);

 //axes
 var axes = new THREE.AxisHelper(150);
 axes.position.y = 1;
 scene.add(axes);

 drawBall();
}

function drawBall() {

	var cylinder;

	// One material is defined here. You'll need to define a second
	// material to get a multi-colored rubber ball. A good way is to use
	// an array.
	var cylinderMaterial	= new THREE.MeshPhongMaterial(
		{ color: 0x5500DD,
			specular: 0xD1F5FD,
			shininess: 100 } );


	// We can set up the cylinder geometry here"
	var cylinderGeo = new THREE.CylinderGeometry( 3, 3, 500, 32 );

	// Below is the code to create and position single cylinder object. You'll need to
	// make a loop to create many cylinders pointing in random directions.

	// YOUR CODE CHANGES BEGIN
	for(var i = 0; i < 500; i++) {
		// create the cylinder object using the geometry and material above
		cylinder = new THREE.Mesh( cylinderGeo, cylinderMaterial );

		var untransformedCylinder = cylinder.clone();
		console.log("Untransformed cylinder matrix:")
		console.log(untransformedCylinder.matrix); // Look at the console
		scene.add(untransformedCylinder);

		var x = getCoor();
		var y = getCoor();
		var z = getCoor();

		var maxCorner = new THREE.Vector3(  x, y, z );
		var minCorner = new THREE.Vector3( -x, -y, -z );

		// this creates a vector in the direction from minCorner to maxCorner
		var cylAxis = new THREE.Vector3().subVectors( maxCorner, minCorner );

		// normalize the axis
		cylAxis.normalize();
		// we can derive the angle by taking arccos of the y axis
		var theta = Math.acos( cylAxis.y );

		/*
		We'll rotate the cylinder around only the x axis for demonstration purposes.
		Rotations around arbitrary vectors will result in less readable values
		in the matrix.
		(this rotation axis will also need to be randomized for the rubber ball):
		*/
		var a = getCoor();
		var b = getCoor();
		var c = getCoor();

		var rotationAxis = new THREE.Vector3(a, b, c);
		/*
		makeRotationAxis wants the axis normalized
		*/
		rotationAxis.normalize();
		/*
		Don't use position, rotation, scale. Instead, we'll use
		the matrix property to rotate theta radians around the rotation axis:
		*/
		cylinder.matrixAutoUpdate = false;
		/*
		This is how we manually set the rotation for the matrix. makeRotationAxis()
		takes a vector representing a rotation axis and a value (in radians) representing
		the angle around that axis to rotate.
		*/
		cylinder.matrix.makeRotationAxis( rotationAxis, theta );

		console.log("Theta: " + theta);
		console.log("  cos: " + Math.cos(theta));
		console.log("  sin: " + Math.sin(theta));

		console.log("Transformed cylinder matrix:")
		console.log(cylinder.matrix); // Look at the console
		// We add the cylinder to the scene:
		scene.add( cylinder );

	}

	// YOUR CODE CHANGES END
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
	camera.position.set( -800, 600, 500);
	cameraControls.target.set(0,0,0);
}

function getCoor() {
	var num = Math.random() * 2 - 1;
	return num;
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
