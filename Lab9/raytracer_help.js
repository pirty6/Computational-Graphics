"use strict";

var testFiles = [
    "Triangletest",         // Yes
    "SphereTest",           // Yes

    "TriangleShadingTest",  // Yes
    "SphereShadingTest1",   // Yes
    "SphereShadingTest1",   // Yes
    "ShadowTest1",          // Yes
    "ShadowTest2",            // this.source = source;// Yes
    "CornellBox",           // No

    "FullTest",             // No
    "RecursiveTest",        // No
    "TransformationTest",   // No
]

var defaultFile = testFiles[6];

var DEBUG = false;
var EPSILON = 0.00001;

var bounce_depth, shadow_bias;
var canvas, context, imageBuffer;
var scene, camera, surfaces, materials, lights;

/* SETUP */

function init() {
    canvas = $("#canvas")[0];
    context = canvas.getContext("2d");
    imageBuffer = context.createImageData(canvas.width, canvas.height);
}

function loadSceneFile(filepath) {
    scene = Utils.loadJSON(filepath);
    camera = new Camera(scene.camera.eye, scene.camera.at, scene.camera.up, scene.camera.fovy, scene.camera.aspect);
    bounce_depth = scene.bounce_depth;
    shadow_bias = scene.shadow_bias;
    extractLights(scene);
    extractSurfaces(scene);
    extractMaterials(scene);
    console.log(materials);
}

function extractLights(scene) {
    lights = [];
    for (var light of scene.lights) {
        if (light.source === "Ambient") {
            lights.push(new AmbientLight(light.source, light.color));
        } else if (light.source === "Point") {
            lights.push(new PointLight(light.source, light.color, light.position));
        } else if (light.source === "Directional") {
            lights.push(new DirectionalLight(light.source, light.color, light.direction));
        } else {
            console.log("Invalid light source: " + light.source);
        }
    }
}

function extractSurfaces(scene) {
    surfaces = [];
    for (var surface of scene.surfaces) {
        if (surface.shape === "Sphere") {
            surfaces.push(new Sphere(
                surface.material,
                surface.center,
                surface.radius,
                surface.name,
                surface.transforms
            ));
        } else if (surface.shape === "Triangle") {
            surfaces.push(new Triangle(
                surface.material,
                surface.p1,
                surface.p2,
                surface.p3,
                surface.name,
                surface.transforms
            ));
        } else {
            console.log("Invalid shape: " + surface.shape);
        }
    }
}

function extractMaterials(scene) {
    materials = [];
    for (var material of scene.materials) {
        materials.push(new Material(
            material.name,
            material.shininess,
            material.ka,
            material.kd,
            material.ks,
            material.kr
        ));
    }
}

/* OBJECTS */

var Camera = function(eye, at, up, fovy, aspect) {
    this.eye = new THREE.Vector3().fromArray(eye);
    this.at = new THREE.Vector3().fromArray(at);
    this.up = new THREE.Vector3().fromArray(up);
    this.wVec = new THREE.Vector3().subVectors(this.eye, this.at).normalize();
    this.uVec = new THREE.Vector3().crossVectors(this.up, this.wVec).normalize();
    this.vVec = new THREE.Vector3().crossVectors(this.wVec, this.uVec).normalize();
    this.fovy = fovy;
    this.aspect = aspect;
    this.halfCameraHeight = Math.tan(this.fovy * Math.PI / 360);
    this.halfCameraWidth = this.halfCameraHeight * this.aspect;
    this.cameraWidth = 2 * this.halfCameraWidth;
    this.cameraHeight = 2 * this.halfCameraHeight;
    this.pixelHeight = this.cameraHeight / (canvas.height - 1);
    this.pixelWidth = this.cameraWidth / (canvas.width - 1);
}

var Light = function(source, color) {
    this.source = source;
    this.color = color;
}

var AmbientLight = function(source, color) {
    Light.call(this, source, color);
}

var PointLight = function(source, color, position) {
    Light.call(this, source, color);
    this.position = new THREE.Vector3().fromArray(position);
}

var DirectionalLight = function(source, color, direction) {
    Light.call(this, source, color);
    this.direction = new THREE.Vector3().fromArray(direction).normalize().negate();
}

var Material = function(name, shininess, ka, kd, ks, kr) {
    this.name = name;
    this.shininess = shininess;
    this.ka = ka;
    this.kd = kd;
    this.ks = ks;
    this.kr = kr;
}

var Surface = function(material, objname, transforms) {
    this.material = material;
    this.objname = objname;
    this.transforms = transforms;
}

var Sphere = function(material, center, radius, objname, transforms) {
    Surface.call(this, material, objname, transforms);
    this.center = new THREE.Vector3().fromArray(center);
    this.radius = radius;
}

var Triangle = function(material, p1, p2, p3, objname, transforms) {
    Surface.call(this, material, objname, transforms);
    this.p1 = new THREE.Vector3().fromArray(p1);
    this.p2 = new THREE.Vector3().fromArray(p2);
    this.p3 = new THREE.Vector3().fromArray(p3);
}

/* OBJECT FUNCTIONS */

// Return the ray corresponding to pixel (x, y).
Camera.prototype.castRay = function(x, y) {
    var u = (x * this.pixelWidth) - this.halfCameraWidth;
    var v = this.halfCameraHeight - (y * this.pixelHeight);
    var uComp = new THREE.Vector3().copy(this.uVec).multiplyScalar(u);
    var vComp = new THREE.Vector3().copy(this.vVec).multiplyScalar(v);
    var sum = new THREE.Vector3().addVectors(uComp, vComp);
    var ray = {
        "origin": this.eye,
        "direction": new THREE.Vector3().copy(this.wVec).negate().add(sum).normalize()
    }
    return ray;
}

// Return the normal at the given point.
Sphere.prototype.normal = function(point) {
    return new THREE.Vector3().subVectors(point, this.center).normalize();
}

// Return the intersection point or null if it does not exist.
Sphere.prototype.intersects = function(ray) {
    var raydir = ray.direction;
    var rayorig = ray.origin;
    var pos = this.center;
    var rad = this.radius;
    var a = raydir.dot(raydir);
    var b = raydir.dot(new THREE.Vector3().subVectors(rayorig, pos).multiplyScalar(2));
    var c = pos.dot(pos) + rayorig.dot(rayorig) - rayorig.dot(pos) * 2 - rad * rad;
    var D = b * b - 4 * a * c;
    if (D < 0) return null;
    D = Math.sqrt(D);
    var t = (b + D) / (-2 * a);
    if (0 < t) {
        var distance = t * Math.sqrt(a);
        var intersection = new THREE.Vector3().copy(raydir).multiplyScalar(t).add(rayorig);
        var normal = new THREE.Vector3().subVectors(intersection, pos).multiplyScalar(1 / rad).normalize();
        return intersection;
    }
    return null;
}

// Return the normal at the given point.
Triangle.prototype.normal = function(point) {
    var edge1 = new THREE.Vector3().subVectors(this.p3, this.p1);
    var edge2 = new THREE.Vector3().subVectors(this.p2, this.p1);
    return new THREE.Vector3().crossVectors(edge1, edge2).normalize();
}

// Return the intersection point or null if it does not exist.
Triangle.prototype.intersects = function(ray) {
    // Möller–Trumbore intersection algorithm
    // https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
    var edge1 = new THREE.Vector3().subVectors(this.p2, this.p1);
    var edge2 = new THREE.Vector3().subVectors(this.p3, this.p1);
    var h = new THREE.Vector3().crossVectors(ray.direction, edge2);
    var a = edge1.dot(h);
    if (-EPSILON < a && a < EPSILON) return null;
    var f = 1 / a;
    var s = new THREE.Vector3().subVectors(ray.origin, this.p1);
    var u = s.dot(h) * f;
    if (1 < u || u < 0) return null;
    var q = new THREE.Vector3().crossVectors(s, edge1);
    var v = f * ray.direction.dot(q);
    if (1 < u + v || v < 0) return null;
    var t = f * edge2.dot(q);
    if (EPSILON < t) {
        var intersection = new THREE.Vector3().copy(ray.direction).multiplyScalar(t).add(ray.origin);
        return intersection;
    } else return null;
}

PointLight.prototype.getDirection = function(point) {
    return new THREE.Vector3().subVectors(this.position, point).normalize();
}

DirectionalLight.prototype.getDirection = function(point) {
    return this.direction;
}

/* RAY TRACING */

// Loop through pixels and color them all.
function render() {
    var start = Date.now();
    for (var x = 0; x < canvas.width; x++) {
        for (var y = 0; y < canvas.height; y++) {
            renderPoint(x, y);
        }
    }
    context.putImageData(imageBuffer, 0, 0);
    var end = Date.now(); // for logging
    $("#log").html("Rendered in: " + (end - start) + "ms");
    console.log("Rendered in: " + (end - start) + "ms");
}

function renderPoint(x, y) {
    var ray = camera.castRay(x, y);
    var color = trace(ray, 0);
    setPixel(x, y, color);
}

var hewwo = -1;
// Follow "ray" and determine its color.
function trace(ray, depth) {
    const black = [0, 0, 0];
    if (depth > bounce_depth) return;

    var closest = closestSurface(ray);
    if (closest.surface === null) return black;

    var surface = closest.surface;
    var intersection = closest.intersection;
    var material = materials[surface.material];

    var R = 0;
    var G = 0;
    var B = 0;

    for (var light of lights) {
        if (light instanceof AmbientLight) {
            // Ambient Shading Calculation
            var aR = material.ka[0] * light.color[0];
            var aG = material.ka[1] * light.color[1];
            var aB = material.ka[2] * light.color[2];
            R = R + aR;
            G = G + aG;
            B = B + aB;
        } else {
            var light2intersection = light.getDirection(intersection);
            var normal = surface.normal(intersection);

            var lightRay = {
                "origin": new THREE.Vector3().copy(normal).multiplyScalar(shadow_bias).add(intersection),
                "direction": light2intersection
            };

            var shadowCaster = closestSurface(lightRay);
            if (shadowCaster.surface === null) {
                var h = new THREE.Vector3().copy(ray.direction).negate().add(light2intersection).normalize();

                var dR = material.kd[0] * light.color[0] * Math.max(0, normal.dot(light2intersection));
                var dG = material.kd[1] * light.color[1] * Math.max(0, normal.dot(light2intersection));
                var dB = material.kd[2] * light.color[2] * Math.max(0, normal.dot(light2intersection));

                var p = material.shininess;
                var kR = material.ks[0] * light.color[0] * Math.pow(Math.max(0, normal.dot(h)), p);
                var kG = material.ks[1] * light.color[1] * Math.pow(Math.max(0, normal.dot(h)), p);
                var kB = material.ks[2] * light.color[2] * Math.pow(Math.max(0, normal.dot(h)), p);

                R = R + dR + kR;
                G = G + dG + kG;
                B = B + dB + kB;
            }
        }
    }

    return [R, G, B];
}

function closestSurface(ray) {
    var surface = null
    var intersection = null;
    var distance = Infinity;
    for (var currentSurface of surfaces) {
        var currentIntersection = currentSurface.intersects(ray);
        if (currentIntersection === null) continue;
        var currentDistance = (ray.origin).distanceTo(currentIntersection);
        if (0 < currentDistance && currentDistance < distance) {
            var surface = currentSurface;
            var intersection = currentIntersection;
            var distance = currentDistance;
        }
    }
    return {
        "surface": surface,
        "intersection": intersection,
        "distance": distance
    };
}

function setPixel(x, y, color) {
    var i = (y * imageBuffer.width + x) * 4;
    imageBuffer.data[i] = (color[0] * 255) | 0;
    imageBuffer.data[i + 1] = (color[1] * 255) | 0;
    imageBuffer.data[i + 2] = (color[2] * 255) | 0;
    imageBuffer.data[i + 3] = 255; //(color[3] * 255) | 0; //switch to include transparency
}

/* RUN */

$(document).ready(function() {
    init();
    loadSceneFile("assets/" + defaultFile + ".json");
    render();
    $("#load_scene_button").click(function() {
        var filepath = "assets/" + $("#scene_file_input").val() + ".json";
        loadSceneFile(filepath);
        render();
    });
    $("#canvas").click(function(e) {
        var x = e.pageX - $("#canvas").offset().left;
        var y = e.pageY - $("#canvas").offset().top;
        DEBUG = true;
        renderPoint(x, y);
        DEBUG = false;
    });
});
