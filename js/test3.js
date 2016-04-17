'Use Strict'

var WIDTH = window.innerWidth*0.65,
  HEIGHT = window.innerHeight*0.65;

var targetRotation = 0;
var targetRotationOnMouseDown = 0;

var control = undefined;
var draggedElement = false;
var dragged_offset_x = 0;
var dragged_offset_y = 0;
var normalVector = new THREE.Vector3( 0, 1, 0 );
var planeConstant = 0.01; // this value must be slightly higher than the groundMesh's y position of 0.0
var groundPlane = new THREE.Plane( normalVector, planeConstant );
var lightPosition4D = new THREE.Vector4();
var shadows = [];

//Scene
var scene = new THREE.Scene();
scene.objects = [];