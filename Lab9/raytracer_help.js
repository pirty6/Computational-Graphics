"use strict";

var testFiles = [
    "Triangletest",         // 00 Yes
    "SphereTest",           // 01 Yes

    "TriangleShadingTest",  // 02 Yes
    "SphereShadingTest1",   // 03 Yes
    "SphereShadingTest2",   // 04 Yes
    "ShadowTest1",          // 05 Yes
    "ShadowTest2",          // 06 Yes
    "CornellBox",           // 07 Yes

    "RecursiveTest",        // 08 No
    "FullTest",             // 09 No
    "TransformationTest"    // 10 No
]
var testFileNumber = 7;
var defaultFile = testFiles[testFileNumber];
var filepath = "assets/" + defaultFile + ".json"

// Debugging
var DEBUG = false;

// Constants
var EPSILON = 0.000001;
var BG = [0, 0, 0];

// Detail Levels
var antialiasing_level = 10;
var penumbra_level = 1;
// var depth_of_field = 1;

var bounce_depth;
var shadow_bias;

var canvas, context, imageBuffer, filepath;
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

    if (scene.bounce_depth) bounce_depth = scene.bounce_depth;
    else bounce_depth = 0;

    if (scene.shadow_bias) shadow_bias = scene.shadow_bias;
    else shadow_bias = EPSILON;

    extractLights(scene);
    extractSurfaces(scene);
    extractMaterials(scene);
}

function extractLights(scene) {
    lights = [];
    for (var light of scene.lights) {
        if (light.source === "Ambient") {
            lights.push(new AmbientLight(light.source, light.color));
        } else if (light.source === "Directional") {
            lights.push(new DirectionalLight(light.source, light.color, light.direction));
        } else if (light.source === "Point") {
            lights.push(new PointLight(light.source, light.color, light.position));
        } else {
            console.error("Invalid light source: " + light.source);
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
            console.error("Invalid shape: " + surface.shape);
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
    this.transformations = new THREE.Matrix4();

    if (transforms) for (var transformation of transforms) {
        var x = transformation[1][0];
        var y = transformation[1][1];
        var z = transformation[1][2];
        if (transformation[0] === "Translate") this.transformations
            .multiply(new THREE.Matrix4().makeTranslation(x, y, z));
        else if (transformation[0] === "Scale") this.transformations
            .multiply(new THREE.Matrix4().makeScale(x, y, z));
        else if (transformation[0] === "Rotate") this.transformations
            .multiply(new THREE.Matrix4().makeRotationX(x))
            .multiply(new THREE.Matrix4().makeRotationY(y))
            .multiply(new THREE.Matrix4().makeRotationZ(z));
    }
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
    var raydir = new THREE.Vector3().copy(ray.direction);
    var rayorig = new THREE.Vector3().copy(ray.origin);
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

// Return the reflection ray given an incomming ray.
Sphere.prototype.reflection = function(ray) {
    var intersection = this.intersects(ray);
    var normal = this.normal(intersection);
    var reflection = new THREE.Vector3()
        .copy(normal)
        .multiplyScalar(normal.dot(ray.direction) * 2)
        .sub(ray.direction)
        .negate();
    return {
        "origin": intersection,
        "direction": reflection
    }
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

// Return the reflection ray given an incomming ray.
Triangle.prototype.reflection = function(ray) {
    var intersection = this.intersects(ray);
    var normal = this.normal(intersection);
    var reflection = new THREE.Vector3()
        .copy(normal)
        .multiplyScalar(normal.dot(intersection) * 2)
        .sub(intersection)
        .normalize()
        .multiplyScalar(intersection.length())
        .negate();
    return {
        "origin": intersection,
        "direction": reflection
    }
}

PointLight.prototype.directionTo = function(point) {
    return new THREE.Vector3().subVectors(point, this.position).normalize();
}


DirectionalLight.prototype.directionTo = function(point) {
    return new THREE.Vector3().copy(this.direction).negate().normalize();
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

// Render the pixel at (x, y).
function renderPoint(x, y) {
    var color = [0, 0, 0];

    for (var p = 0; p < antialiasing_level; p++) {
        for (var q = 0; q < antialiasing_level; q++) {
            var ray = camera.castRay(
                x + (p + Math.random()) / antialiasing_level,
                y + (q + Math.random()) / antialiasing_level
            );
            var c = trace(ray, 0);

            color[0] = color[0] + c[0];
            color[1] = color[1] + c[1];
            color[2] = color[2] + c[2];
        }
    }

    color[0] = color[0] / Math.pow(antialiasing_level, 2);
    color[1] = color[1] / Math.pow(antialiasing_level, 2);
    color[2] = color[2] / Math.pow(antialiasing_level, 2);

    if (DEBUG) console.log("Final color:");
    if (DEBUG) console.log(color);

    setPixel(x, y, color);
}

// Follow "ray" and determine its color.
function trace(ray, depth) {
    if (depth > bounce_depth) {
        if (DEBUG) console.log("Hit bounce depth.");
        return BG;
    }

    var closest = closestSurface(ray);
    if (closest.surface === null) {
        if (DEBUG) console.log("Doesn't hit anything.");
        return BG;
    }

    var surface = closest.surface;
    var intersection = closest.intersection;
    var normal = surface.normal(intersection);

    var material = materials[surface.material];

    // Start with no color
    var R = 0;
    var G = 0;
    var B = 0;

    if (material.kr) {
        var reflection = null;
        var reflectionRay = surface.reflection(ray);
        if (reflectionRay !== null) {
            if (DEBUG) console.log("Decending to level " + (depth + 1) + ".");
            reflection = trace(reflectionRay, depth + 1);
            if (DEBUG) console.log("Accending to level " + depth + ".");
            if (DEBUG) console.log(reflection);
        }
        if (reflection !== null) {
            // Incorporate the reflection coordinates
            R = material.kr[0] * reflection[0] + (1 - material.kr[0]) * R;
            G = material.kr[1] * reflection[1] + (1 - material.kr[1]) * G;
            B = material.kr[2] * reflection[2] + (1 - material.kr[2]) * B;
        }
    }

    // For each light, add the color imparted.
    for (var light of lights) {
        if (light instanceof AmbientLight) {
            // Ambient Shading Calculation
            var aR = material.ka[0] * light.color[0];
            var aG = material.ka[1] * light.color[1];
            var aB = material.ka[2] * light.color[2];
            R = R + aR;
            G = G + aG;
            B = B + aB;

            if (DEBUG) console.log("Ambient light added:");
            if (DEBUG) console.log([aR, aG, aB]);
        }
        else if (light instanceof PointLight) {
            if (surface instanceof Triangle) {
                if (normal.angleTo(light.directionTo(intersection)) < Math.PI / 2) normal.negate();
            }

            var offsetIntersection = new THREE.Vector3().copy(normal).multiplyScalar(shadow_bias).add(intersection);

            var fromLight = light.directionTo(offsetIntersection);
            var toLight = fromLight.clone().negate();

            var horizontalAxis = new THREE.Vector3().set(-1, 1, (fromLight.x - fromLight.y) / fromLight.z).normalize();
            var verticalAxis = new THREE.Vector3().crossVectors(fromLight, horizontalAxis).normalize();

            var obstructions = 0;
            for (var i = 0; i < penumbra_level; i++) {
                    var horizontalOffset = Math.random() - 0.5;
                    var verticalOffset = Math.random() - 0.5;

                    var shadowRay = {
                        "origin": offsetIntersection,
                        "direction": new THREE.Vector3()
                            .copy(toLight)
                            .add(horizontalAxis.clone().multiplyScalar(horizontalOffset))
                            .add(verticalAxis.clone().multiplyScalar(verticalOffset))
                            .normalize()
                    };

                    var shadowCaster = closestSurface(shadowRay);

                    if (shadowCaster.distance < offsetIntersection.distanceTo(light.position) * (1 + EPSILON)) obstructions++;
            }
            var occlusion = obstructions / Math.pow(penumbra_level, 2);
            var shadowFactor = 1 - occlusion;

            // if (occlusion < EPSILON) {
            //     if (DEBUG) console.log("Point light obscured by:");
            //     if (DEBUG) console.log(shadowCaster);
            // } else {
                var h = new THREE.Vector3().subVectors(shadowRay.direction, ray.direction).normalize();
                var m = Math.max(0, normal.dot(shadowRay.direction));
                var p = Math.pow(Math.max(0, normal.dot(h)), material.shininess);

                var dR = material.kd[0] * light.color[0] * m;
                var dG = material.kd[1] * light.color[1] * m;
                var dB = material.kd[2] * light.color[2] * m;

                var sR = material.ks[0] * light.color[0] * p;
                var sG = material.ks[1] * light.color[1] * p;
                var sB = material.ks[2] * light.color[2] * p;

                R = R + (dR + sR) * shadowFactor;
                G = G + (dG + sG) * shadowFactor;
                B = B + (dB + sB) * shadowFactor;

                if (DEBUG) console.log("Point light added:");
                if (DEBUG) console.log([dR + sR, dG + sG, dB + sB]);
            // }
        }
        else if (light instanceof DirectionalLight) {
            if (surface instanceof Triangle) {
                if (normal.angleTo(light.directionTo(intersection)) < Math.PI / 2) normal.negate();
            }
            var offsetIntersection = new THREE.Vector3().copy(normal).multiplyScalar(shadow_bias).add(intersection);
            var toLight = light.directionTo(offsetIntersection).negate();

            var lightRay = {
                "origin": offsetIntersection,
                "direction": toLight
            };

            var inShadow = true;
            var shadowCaster = closestSurface(lightRay);

            if (shadowCaster.distance === Infinity) inShadow = false;

            if (inShadow) {
                if (DEBUG) console.log("Directional light obscured by:");
                if (DEBUG) console.log(shadowCaster);
            } else {
                var h = new THREE.Vector3().subVectors(lightRay.direction, ray.direction).normalize();
                var m = Math.max(0, normal.dot(lightRay.direction));
                var p = Math.pow(Math.max(0, normal.dot(h)), material.shininess);

                var dR = material.kd[0] * light.color[0] * m;
                var dG = material.kd[1] * light.color[1] * m;
                var dB = material.kd[2] * light.color[2] * m;

                var sR = material.ks[0] * light.color[0] * p;
                var sG = material.ks[1] * light.color[1] * p;
                var sB = material.ks[2] * light.color[2] * p;

                R = R + dR + sR;
                G = G + dG + sG;
                B = B + dB + sB;

                if (DEBUG) console.log("Directional light added:");
                if (DEBUG) console.log([dR + sR, dG + sG, dB + sB]);
            }
        }
    }

    return [R, G, B];
}

// Starting at the origin of the ray and moving in its direction, find the first surface it hits.
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

// Set pixel (x, y) to be the given color.
function setPixel(x, y, color) {
    var i = (y * imageBuffer.width + x) * 4;
    imageBuffer.data[i] = (color[0] * 255) | 0;
    imageBuffer.data[i + 1] = (color[1] * 255) | 0;
    imageBuffer.data[i + 2] = (color[2] * 255) | 0;
    imageBuffer.data[i + 3] = 255; //(color[3] * 255) | 0; //switch to include transparency
}

function load(num) {
    if (num < 0 || num > 10) return;
    loadSceneFile("assets/" + testFiles[num] + ".json");
    render();
}

/* RUN */

$(document).ready(function() {
    init();
    loadSceneFile("assets/" + defaultFile + ".json");
    render();
    $("#load_scene_button").click(function() {
        filepath = "assets/" + $("#scene_file_input").val() + ".json";
        console.log("Starting rendering of: " + filepath)
        loadSceneFile(filepath);
        render();
    });
    $("#reload_scene_button").click(function() {
        console.log("Starting rendering of: " + filepath)
        loadSceneFile(filepath);
        render();
    });

    // Quick load files

    $("#triangle_button").click(function() {
        filepath = "assets/" + testFiles[0] + ".json";
        console.log("Starting rendering of: " + filepath)
        loadSceneFile(filepath);
        render();
    });

    $("#sphere_button").click(function() {
        filepath = "assets/" + testFiles[1] + ".json";
        console.log("Starting rendering of: " + filepath)
        loadSceneFile(filepath);
        render();
    });

    $("#triangle_shading_button").click(function() {
        filepath = "assets/" + testFiles[2] + ".json";
        console.log("Starting rendering of: " + filepath)
        loadSceneFile(filepath);
        render();
    });

    $("#sphere_shading_1_button").click(function() {
        filepath = "assets/" + testFiles[3] + ".json";
        console.log("Starting rendering of: " + filepath)
        loadSceneFile(filepath);
        render();
    });

    $("#sphere_shaidng_2_button").click(function() {
        filepath = "assets/" + testFiles[4] + ".json";
        console.log("Starting rendering of: " + filepath)
        loadSceneFile(filepath);
        render();
    });

    $("#shadow_1_button").click(function() {
        filepath = "assets/" + testFiles[5] + ".json";
        console.log("Starting rendering of: " + filepath)
        loadSceneFile(filepath);
        render();
    });

    $("#shadow_2_button").click(function() {
        filepath = "assets/" + testFiles[6] + ".json";
        console.log("Starting rendering of: " + filepath)
        loadSceneFile(filepath);
        render();
    });

    $("#cornell_button").click(function() {
        filepath = "assets/" + testFiles[7] + ".json";
        console.log("Starting rendering of: " + filepath)
        loadSceneFile(filepath);
        render();
    });



    // Set params

    $("#load_antialiasing_level").click(function() {
        antialiasing_level = parseInt($("#antialiasing_level_input").val());
    });
    $("#load_penumbra_level").click(function() {
        penumbra_level = parseInt($("#penumbra_level_input").val());
    });
    // $("#load_depth_of_field").click(function() {
        // depth_of_field = parseInt($("#depth_of_field_input").val());
    // });
    $("#canvas").click(function(e) {
        var x = e.pageX - $("#canvas").offset().left;
        var y = e.pageY - $("#canvas").offset().top;
        DEBUG = true;
        renderPoint(x, y);
        DEBUG = false;
    });
});
