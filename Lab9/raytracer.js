"use strict";

//CORE VARIABLES
var canvas, context, imageBuffer;

var DEBUG = false; //whether to show debug messages
var EPSILON = 0.00001; //error margins

//scene to render
var scene, camera, surfaces, materials, lights, shadow; //etc...

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

var Sphere = function(center, material, radius) {
  this.material = material;
  this.center = center;
  this.radius = radius;
};

Sphere.prototype.intersects = function(ray) {
  var a = ray.direction.dot(ray.direction);
  var b = 2 * (ray.direction.dot(new THREE.Vector3().subVectors(ray.origin, this.center)));
  var c = (new THREE.Vector3().subVectors(ray.origin, this.center).dot(new THREE.Vector3().subVectors(ray.origin, this.center))) - Math.pow(this.radius, 2);
  var t = Math.pow(b, 2) - 4 * a * c;
  if(t < 0) {
    // The ray doesn't intersects the sphere
    return false;
  }
  // The ray intersects the sphere
  return true;
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
  this.color = color;
};

var PointLight = function(source, position, color) {
  // this.source = source;
  this.position = position;
  this.color = color;
};

PointLight.prototype.getDirection = function(point) {
    return new THREE.Vector3().subVectors(this.position, point).normalize();
}

var DirectionalLight = function() {

}

var Ray = function(origin, direction) {
  this.origin = origin;
  this.direction = direction;
}

var Intersection = function(origin, direction) {
  this.origin = origin;
  this.direction = direction;
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
  shadow = scene.shadow_bias;
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
    }
  }
  console.log(lights);
  render(); //render the scene
}

function renderEverything(x, y) {
  var ray = camera.castRay(x, y);
  var color = [0, 0, 0];
  var distance, intersection;
  for (var i = 0; i < surfaces.length; i++) {
    if(surfaces[i].intersects(ray)) {
      color = getColor(ray, surfaces[i], distance, intersection);
    }
  }
  setPixel(x, y, color);
}


function getColor(ray, surface, distance, intersection) {
  var R = 0, G = 0, B = 0;
  var material = materials[surface.material];
    for(var i = 0; i < lights.length; i++) {
    if(lights[i] instanceof(AmbientLight)) {
      R += (material.ka[0] * lights[i].color[0]);
      G += (material.ka[1] * lights[i].color[1]);
      B += (material.ka[2] * lights[i].color[2]);
    }
  }
  return [R, G, B];
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
