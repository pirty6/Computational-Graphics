"use strict";

//CORE VARIABLES
var canvas, context, imageBuffer;

var DEBUG = false; //whether to show debug messages
var EPSILON = 0.00001; //error margins

//scene to render
var scene, camera, surfaces, materials, lights, shadow_bias, bounce_depth; //etc...

// OBJECTS
var Camera = function(eye, at, up, fovy, aspect) {
  this.eye = eye;
  this.at = at;
  this.up = up;
  this.fovy = fovy;
  this.aspect = aspect;
  this.h = 2 * Math.tan(rad(fovy/2.0));
  this.w = this.h * aspect;
  this.back_vector = new THREE.Vector3().subVectors(eye, at).normalize();
  this.side_vector = new THREE.Vector3().crossVectors(up, this.back_vector).normalize();
  this.up_vector = new THREE.Vector3().crossVectors(this.back_vector, this.side_vector).normalize();
};

var hewwo = -1;

Camera.prototype.castRay = function(x, y) {
  var u = (this.w * x/(canvas.width - 1)) - (this.w/2.0);
  var v = (-this.h * y/(canvas.height - 1)) + (this.h/2.0);
  var u_comp = this.side_vector.clone().multiplyScalar(u);
  var v_comp = this.up_vector.clone().multiplyScalar(v);
  var direction = new THREE.Vector3().addVectors(u_comp, v_comp);
  return new Ray(this.eye, new THREE.Vector3().addVectors(direction, this.back_vector.clone().multiplyScalar(-1)).normalize());
}

var Sphere = function(center, material, radius, objname, transforms) {
  Surface.call(this, material, objname, transforms);
  this.material = material;
  this.center = center;
  this.radius = radius;
};

Sphere.prototype.normal = function(point) {
    return new THREE.Vector3().subVectors(point, this.center).normalize();
}

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
};

var Triangle = function(p1, p2, p3, material) {
  this.p1 = p1;
  this.p2 = p2;
  this.p3 = p3;
};

/* TODO: cambiar esto a lo que vimos en clase */
Triangle.prototype.intersects = function(ray) {
  var edge1 = new THREE.Vector3().subVectors(this.p2, this.p1);
  var edge2 = new THREE.Vector3().subVectors(this.p3, this.p1);
  var h = new THREE.Vector3().crossVectors(ray.direction, edge2);
  var a = edge1.dot(h);
  if (-EPSILON < a && a < EPSILON) return false;
  var f = 1 / a;
  var s = new THREE.Vector3().subVectors(ray.origin, this.p1);
  var u = s.dot(h) * f;
  if (1 < u || u < 0) return false;
  var q = new THREE.Vector3().crossVectors(s, edge1);
  var v = f * ray.direction.dot(q);
  if (1 < u + v || v < 0) return false;
  var t = f * edge2.dot(q);
  if (EPSILON < t) return true;
  else return false;
}

var Material = function(ka, kd, ks, kr, shininess) {
  this.ka = ka;
  this.kd = kd;
  this.ks = ks;
  this.kr = kr;
  this.shininess = shininess
};

var AmbientLight = function(source, color) {
  // this.source = source;
  // this.color = color;
  Light.call(this, source, color);
};

var PointLight = function(source, position, color) {
  // this.source = source;
  // this.position = position;
  // this.color = color;
  Light.call(this, source, color);
  this.position = new THREE.Vector3().fromArray(position);
};

PointLight.prototype.getDirection = function(point) {
    return new THREE.Vector3().subVectors(this.position, point).normalize();
}

var DirectionalLight = function(source, color, direction) {
  // this.color = color;
  // this.direction = direction;
  Light.call(this, source, color);
  this.direction = new THREE.Vector3().fromArray(direction).normalize().negate();
}

DirectionalLight.prototype.getDirection = function(point) {
    return this.direction;
}

var Ray = function(origin, direction) {
  this.origin = origin;
  this.direction = direction;
}

var Intersection = function(origin, direction) {
  this.origin = origin;
  this.direction = direction;
}

var Light = function(source, color) {
    this.source = source;
    this.color = color;
}

var Surface = function(material, objname, transforms) {
    this.material = material;
    this.objname = objname;
    this.transforms = transforms;
}

//initializes the canvas and drawing buffers
function init() {
  canvas = $('#canvas')[0];
  context = canvas.getContext("2d");
  imageBuffer = context.createImageData(canvas.width, canvas.height); //buffer for pixels

  loadSceneFile("assets/SphereTest.json");
}

//loads and "parses" the scene file at the given path
function loadSceneFile(filepath) {
  scene = Utils.loadJSON(filepath); //load the scene
  //TODO - set up camera
  var camera_eye = new THREE.Vector3().fromArray(scene.camera.eye);
  var camera_at = new THREE.Vector3().fromArray(scene.camera.at);
  var camera_up = new THREE.Vector3().fromArray(scene.camera.up);
  camera = new Camera(camera_eye, camera_at, camera_up, scene.camera.fovy, scene.camera.aspect);
  //TODO - set up surfaces
  shadow_bias = scene.shadow_bias;
  bounce_depth = bounce_depth;
  surfaces = [];
  console.log(scene.surfaces);
  for(var i = 0; i < scene.surfaces.length; i++) {
    if(scene.surfaces[i].shape === "Sphere") {
      var center = new THREE.Vector3().fromArray(scene.surfaces[i].center);
      surfaces.push(new Sphere(center, scene.surfaces[i].material, scene.surfaces[i].radius));
    } else if (scene.surfaces[i].shape === "Triangle") {
      var p1 = new THREE.Vector3().fromArray(scene.surfaces[i].p1);
      var p2 = new THREE.Vector3().fromArray(scene.surfaces[i].p2);
      var p3 = new THREE.Vector3().fromArray(scene.surfaces[i].p3);
      surfaces.push(new Triangle(p1, p2, p3, scene.surfaces[i].material));
    }
  }

  materials = [];
  for(var i = 0; i < scene.materials.length; i++) {
    materials.push(new Material(scene.materials[i].ka, scene.materials[i].kd, scene.materials[i].kr, scene.materials[i].ks, scene.materials[i].shininess));
  }

  lights = [];
  for(var i = 0; i < scene.lights.length; i++) {
    if(scene.lights[i].source === "Ambient") {
      lights.push(new AmbientLight(scene.lights[i].source, scene.lights[i].color));
    } else if(scene.lights[i].source === "Point") {
      lights.push(new PointLight(scene.lights[i].source, scene.lights[i].position, scene.lights[i].color));
    } else if(scene.lights[i].source === "Directional") {
      lights.push(new DirectionalLight(lights[i].source, scene.lights[i].color, scene.lights[i].direction));
    }
  }
  console.log(lights);
  render(); //render the scene
}

function renderEverything(x, y) {
  var ray = camera.castRay(x, y);
  var color = trace(ray, 0);
  setPixel(x, y, color);
}

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


//renders the scene
function render() {
  var start = Date.now(); //for logging
  //TODO - fire a ray though each pixel
  for(var i = 0; i < canvas.width; i++) {
    for(var j = 0; j < canvas.height; j++) {
      renderEverything(i, j);
    }
  }
  //TODO - calculate the intersection of that ray with the scene

  //TODO - set the pixel to be the color of that intersection (using setPixel() method)

  //render the pixels that have been set
  context.putImageData(imageBuffer,0,0);

  var end = Date.now(); //for logging
  $('#log').html("rendered in: "+(end-start)+"ms");
  console.log("rendered in: "+(end-start)+"ms");
}

//sets the pixel at the given x,y to the given color
/**
 * Sets the pixel at the given screen coordinates to the given color
 * @param {int} x     The x-coordinate of the pixel
 * @param {int} y     The y-coordinate of the pixel
 * @param {float[3]} color A length-3 array (or a vec3) representing the color. Color values should floating point values between 0 and 1
 */
function setPixel(x, y, color){
  var i = (y*imageBuffer.width + x)*4;
  imageBuffer.data[i] = (color[0]*255) | 0;
  imageBuffer.data[i+1] = (color[1]*255) | 0;
  imageBuffer.data[i+2] = (color[2]*255) | 0;
  imageBuffer.data[i+3] = 255; //(color[3]*255) | 0; //switch to include transparency
}

//converts degrees to radians
function rad(degrees){
  return degrees*Math.PI/180;
}

//on document load, run the application
$(document).ready(function(){
  init();
  render();

  //load and render new scene
  $('#load_scene_button').click(function(){
    var filepath = 'assets/'+$('#scene_file_input').val()+'.json';
    loadSceneFile(filepath);
  });

  //debugging - cast a ray through the clicked pixel with DEBUG messaging on
  $('#canvas').click(function(e){
    var x = e.pageX - $('#canvas').offset().left;
    var y = e.pageY - $('#canvas').offset().top;
    DEBUG = true;
    camera.castRay(x,y); //cast a ray through the point
    DEBUG = false;
  });
});
