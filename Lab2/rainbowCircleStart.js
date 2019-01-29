var scene;
var camera;
initializeScene();
renderScene();

function initializeScene() {
    if (Detector.webgl) {
        renderer = new THREE.WebGLRenderer({
            antialias: true
        });
    } else {
        renderer = new THREE.CanvasRenderer();
    }

    renderer.setClearColor(0x000000, 1);

    canvasWidth = 600;
    canvasHeight = 600;

    renderer.setSize(canvasWidth, canvasHeight);
    document.getElementById("canvas").appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(85, canvasWidth / canvasHeight, 1, 100);

    camera.position.set(0, 0, 20);

    camera.lookAt(scene.position);

    scene.add(camera);

    var rainbowCircleGeometry = new THREE.Geometry();

    //We rotate around the circle incrementally, adding vertices outward to one "spoke" at a time.
    for (var d = 0; d <= 360; d = d + 10) {
        var angle = Math.PI * (d / 180);
        for (var i = 1; i < 18; i++) {
            //This is the next vertex out. Because it's the middle vertex on the spoke, it's
            //part of two different faces.
            rainbowCircleGeometry.vertices.push(new THREE.Vector3(Math.sin(angle) * i, Math.cos(angle) * i, 0));
            //Create the face if there's at least 3 vertices
            if (rainbowCircleGeometry.vertices.length > 17) {
                //if (rainbowCircleGeometry.vertices.length / 34 == 1) {
                var result = rainbowCircleGeometry.vertices.length / 17;
                if (rainbowCircleGeometry.vertices.length > 3) {
                    rainbowCircleGeometry.faces.push(new THREE.Face3(
                        rainbowCircleGeometry.vertices.length - 1
                        , rainbowCircleGeometry.vertices.length - 15
                        , rainbowCircleGeometry.vertices.length - 18));
                    var hue = i/17;
                    rainbowCircleGeometry.faces[rainbowCircleGeometry.faces.length - 1].vertexColors[0] = new THREE.Color(hue, Math.cos(angle), Math.sin(angle));
                    rainbowCircleGeometry.faces[rainbowCircleGeometry.faces.length - 1].vertexColors[1] = new THREE.Color(hue, Math.cos(angle), Math.sin(angle));
                    rainbowCircleGeometry.faces[rainbowCircleGeometry.faces.length - 1].vertexColors[2] = new THREE.Color(hue, Math.cos(angle), Math.sin(angle));
                }
            }
        }

    }

    var rainbowCircleMat = new THREE.MeshBasicMaterial({
        vertexColors: THREE.VertexColors,
        //wireframe: true,
        side: THREE.DoubleSide
    });

    var rainbowCircleMesh = new THREE.Mesh(rainbowCircleGeometry, rainbowCircleMat);

    scene.add(rainbowCircleMesh);
}


function renderScene() {
    renderer.render(scene, camera);
}
