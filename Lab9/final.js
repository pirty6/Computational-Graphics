"use strict";

//CORE VARIABLES
var canvas, context, imageBuffer;

var DEBUG = false; //whether to show debug messages
var EPSILON = 0.00001; //error margins

var antialiasing_level = 8;
var penumbra_level = 1;

//scene to render
var scene, camera, surfaces, lights, materials, bounce_depth = 0, shadow_bias = EPSILON; //etc...

// Objects
var Camera = function(eye, at, up, fovy, aspect) {
    this.eye = eye;
    this.at = at;
    this.up = up;
    this.fovy = fovy;
    this.aspect = aspect;
    this.h = 2 * Math.tan(rad(fovy/2.0));
    this.w = this.h * aspect;
    this.wVec = new THREE.Vector3().subVectors(eye, at).normalize();
    this.uVec = new THREE.Vector3().crossVectors(up, this.wVec).normalize();
    this.vVec = new THREE.Vector3().crossVectors(this.wVec, this.uVec).normalize();
};

Camera.prototype.castRay = function(x, y) {
  var u = (this.w * x / (canvas.width - 1)) - (this.w / 2.0);
  var v = (-this.h * y / (canvas.height - 1)) + (this.h / 2.0);
  var uComp = this.uVec.clone().multiplyScalar(u);
  var vComp = this.vVec.clone().multiplyScalar(v);
  var direction = new THREE.Vector3().addVectors(uComp, vComp);
  return new Ray(this.eye, new THREE.Vector3().addVectors(direction, this.wVec.clone().multiplyScalar(-1)).normalize());
}

var Ray = function(origin, direction) {
  this.origin = origin;
  this.direction = direction;
}

var Sphere = function(material, center, radius, objname, transformations) {
  this.center = center;
  this.radius = radius;
  Surface.call(this, material, objname, transformations);
}

// Return the normal at the given point.
Sphere.prototype.normal = function(point) {
  return new THREE.Vector3().subVectors(point, this.center).normalize();
}

// Return the intersection point or null if it does not exist.
Sphere.prototype.intersects = function(ray) {
  var a = ray.direction.dot(ray.direction);
  var b = 2 * (ray.direction.dot(new THREE.Vector3().subVectors(ray.origin, this.center)));
  var c = (new THREE.Vector3().subVectors(ray.origin, this.center).dot(new THREE.Vector3().subVectors(ray.origin, this.center))) - Math.pow(this.radius, 2);
  var t = Math.pow(b, 2) - 4 * a * c;
  if(t > 0) {
    t = Math.sqrt(t);
    t = (-b - t) / (2 * a);
    if (0 < t) {
      var distance = t * Math.sqrt(a);
      var intersection = new THREE.Vector3().copy(ray.direction).multiplyScalar(t).add(ray.origin);
      return intersection;
    }
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

var Intersection = function(surface, intersection, distance) {
  this.surface = surface;
  this.intersection = intersection;
  this.distance = distance;
}

var Triangle = function(material, p1, p2, p3, objname, transforms) {
    Surface.call(this, material, objname, transforms);
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
}

// Return the normal at the given point.
Triangle.prototype.normal = function(point) {
    var edge1 = new THREE.Vector3().subVectors(this.p3, this.p1);
    var edge2 = new THREE.Vector3().subVectors(this.p2, this.p1);
    return new THREE.Vector3().crossVectors(edge1, edge2).normalize();
}

Triangle.prototype.intersects = function(ray) {
    var edge1 = new THREE.Vector3().subVectors(this.p2, this.p1);
    var edge2 = new THREE.Vector3().subVectors(this.p3, this.p1);
    var h = new THREE.Vector3().crossVectors(ray.direction, edge2);
    var a = edge1.dot(h);
    if (-EPSILON < a && a < EPSILON) {
      return null;
    }
    var f = 1 / a;
    var s = new THREE.Vector3().subVectors(ray.origin, this.p1);
    var u = s.dot(h) * f;
    if (1 < u || u < 0) {
      return null;
    }
    var q = new THREE.Vector3().crossVectors(s, edge1);
    var v = f * ray.direction.dot(q);
    if (1 < u + v || v < 0) {
      return null;
    }
    var t = f * edge2.dot(q);
    if (EPSILON < t) {
        var intersection = new THREE.Vector3().copy(ray.direction).multiplyScalar(t).add(ray.origin);
        return intersection;
    } else {
      return null;
    }
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
  var eye = new THREE.Vector3().fromArray(scene.camera.eye);
  var at = new THREE.Vector3().fromArray(scene.camera.at);
  var up = new THREE.Vector3().fromArray(scene.camera.up);
  camera = new Camera(eye, at, up, scene.camera.fovy, scene.camera.aspect);

  (scene.shadow_bias) ? shadow_bias = scene.shadow_bias : null;
  (scene.bounce_depth) ? bounce_depth = scene.bounce_depth : null;

  surfaces = [];
  for(var i = 0; i < scene.surfaces.length; i++) {
    var currentSurface = scene.surfaces[i];
    if(currentSurface.shape === "Sphere") {
      var center = new THREE.Vector3().fromArray(currentSurface.center);
      surfaces.push(new Sphere(currentSurface.material, center, currentSurface.radius, currentSurface.name, currentSurface.transforms));
    } else if(currentSurface.shape === "Triangle") {
      var p1 = new THREE.Vector3().fromArray(currentSurface.p1);
      var p2 = new THREE.Vector3().fromArray(currentSurface.p2);
      var p3 = new THREE.Vector3().fromArray(currentSurface.p3);
      surfaces.push(new Triangle(currentSurface.material,p1, p2, p3, currentSurface.name, currentSurface.transforms));
    }
  }

  materials = [];
  for(var i = 0; i < scene.materials.length; i++) {
    var currentMaterial = scene.materials[i];
    materials.push(new Material(currentMaterial.name, currentMaterial.shininess, currentMaterial.ka, currentMaterial.kd, currentMaterial.ks, currentMaterial.kr));
  }

  lights = [];
  for(var i = 0; i < scene.lights.length; i++) {
    var currentLight = scene.lights[i];
    if(currentLight.source === "Ambient") {
      lights.push(new AmbientLight(currentLight.source, currentLight.color));
    } else if(currentLight.source === "Point") {
      lights.push(new PointLight(currentLight.source, currentLight.color, currentLight.position));
    } else if(currentLight.source === "Directional") {
      lights.push(new DirectionalLight(currentLight.source, currentLight.color, currentLight.direction));
    }
  }

  render(); //render the scene
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
    return new Intersection(surface, intersection, distance);
}

function trace(ray, depth) {
  var color = [0, 0, 0];

  var closest = closestSurface(ray);
  if (depth > bounce_depth || closest.surface == null) {
    return color;
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
          reflection = trace(reflectionRay, depth + 1);
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

          var shadowCaster = closestSurface(lightRay);

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

      }
  }

  return [R, G, B];
}

//renders the scene
function render() {
  var start = Date.now(); //for logging
  var color = [0, 0, 0];
  for (var x = 0; x < canvas.width; x++) {
      for (var y = 0; y < canvas.height; y++) {
        for(var i = 0; i < 8; i++) {
          for(var j = 0; j < 8; j++) {
            var ray = camera.castRay(x + (i + Math.random()) / 8, y + (j + Math.random()) / 8);
            var col = trace(ray, 0);
            for(var k = 0; k < 3; k++) {
              color[k] += col[k];
            }
          }
        }
        for(var m = 0; m < 3; m++) {
          color[m] /= Math.pow(8, 2);
        }
        setPixel(x, y, color);
      }
  }
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
