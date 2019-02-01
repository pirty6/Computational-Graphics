
var scene;
var camera;
var renderer;
initializeScene();
renderScene();


var canvasHeight;
var canvasWidth;

var black;
var red;
var orange;
var yellow;
var green;
var blue;
var purple;
var white_rose;

function initializeScene() {
    var step = 0.25;

    var scale = 0.5;

    if (Detector.webgl) {
        renderer = new THREE.WebGLRenderer({antialias: true});
    } else {
        renderer = new THREE.CanvasRenderer();
    }

    canvasWidth = 600;
    canvasHeight = 400;

    renderer.setClearColor(0x000000, 1);
    renderer.setSize(canvasWidth, canvasHeight);
    document.getElementById("canvas").appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, canvasWidth / canvasHeight, 1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(scene.position);
    scene.add(camera);
    var rainbowGeometry = new THREE.Geometry();

    black = new THREE.Color('#000000');
    red = new THREE.Color('#FF0000');
    orange = new THREE.Color('#FF8700');
    yellow = new THREE.Color('#F8F600');
    green = new THREE.Color('#00FF00');
    blue = new THREE.Color('#5D00FF');
    purple = new THREE.Color('#AD00FF');
    white_rose = new THREE.Color('#F600FF');


    function getColor(number) {
        number = number % 16;
        if (number === 0 || number == 15) return black;
        if (number === 1 || number == 14) return red;
        if (number === 2 || number == 13) return orange;
        if (number === 3 || number == 12) return yellow;
        if (number === 4 || number == 11) return green;
        if (number === 5 || number == 10) return blue;
        if (number === 6 || number == 9) return purple;
        if (number === 7) return white_rose;
    }

    for (var d = 0; d <= 360; d += 10) {
        var radian = Math.PI * (d / 180);

        rainbowGeometry.vertices.push(new THREE.Vector3(
            Math.sin(radian) * scale,
            Math.cos(radian) * scale,
            0)
        );

        for (var i = 1; i < 17; i++) {
            rainbowGeometry.vertices.push(new THREE.Vector3(
                Math.sin(radian) * (1 + i * step) * scale,
                Math.cos(radian) * (1 + i * step) * scale,
                0
            ));
            if (rainbowGeometry.vertices.length > 17) {
                rainbowGeometry.faces.push(new THREE.Face3(
                    rainbowGeometry.vertices.length - 1,
                    rainbowGeometry.vertices.length - 2,
                    rainbowGeometry.vertices.length - (17 + 2)
                ));
                rainbowGeometry.faces[rainbowGeometry.faces.length - 1].vertexColors[0] = getColor(i);
                rainbowGeometry.faces[rainbowGeometry.faces.length - 1].vertexColors[1] = getColor(i-1);
                rainbowGeometry.faces[rainbowGeometry.faces.length - 1].vertexColors[2] = getColor(i-1);
                rainbowGeometry.faces.push(new THREE.Face3(
                    rainbowGeometry.vertices.length - 1,
                    rainbowGeometry.vertices.length - (17 + 1),
                    rainbowGeometry.vertices.length - (17 + 2))
                );
                rainbowGeometry.faces[rainbowGeometry.faces.length - 1].vertexColors[0] = getColor(i);
                rainbowGeometry.faces[rainbowGeometry.faces.length - 1].vertexColors[1] = getColor(i);
                rainbowGeometry.faces[rainbowGeometry.faces.length - 1].vertexColors[2] = getColor(i-1);
            }

        }
    }

    var rainbowMaterial = new THREE.MeshBasicMaterial({
        vertexColors: THREE.VertexColors,
        //wireframe: true,
        side: THREE.DoubleSide
    });

    var rainbow = new THREE.Mesh(rainbowGeometry, rainbowMaterial);

    scene.add(rainbow);
}

function renderScene() {
    renderer.render(scene, camera);
}
