var sceneH = window.innerHeight*0.75;
var sceneW = window.innerWidth*0.75;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, sceneW / sceneH, 0.1, 1000 );

scene.fog = new THREE.Fog( 0xcce0ff, 500, 10000 );

//Ground
// var geometry = new THREE.PlaneBufferGeometry( 16000, 16000 );
// var material = new THREE.MeshPhongMaterial( { emissive: 0x000000 } );

// var ground = new THREE.Mesh( geometry, material );
// ground.position.set( 0, FLOOR, 0 );
// scene.add( ground );

// ground.receiveShadow = true;

renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setClearColor( scene.fog.color );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( sceneW, sceneH );
renderer.domElement.style.position = "relative";

document.body.appendChild( renderer.domElement );

renderer.gammaInput = true;
renderer.gammaOutput = true;

renderer.shadowMap.enabled = true;

// Add Objects

var geometry = new THREE.BoxGeometry( 1, 1, 1 );
for ( var i = 0; i < geometry.faces.length; i += 2 ) {
	var hex = Math.random() * 0xffffff;
	geometry.faces[ i ].color.setHex( hex );
	geometry.faces[ i + 1 ].color.setHex( hex );

}
var material = new THREE.MeshDepthMaterial();
var cube = new THREE.Mesh( geometry, material );
cube.position.y = 5;
scene.add( cube );

var geometry = new THREE.PlaneBufferGeometry( 200, 200 );
geometry.rotateX( - Math.PI / 2 );

var material = new THREE.MeshBasicMaterial( { color: 0xe0e0e0, overdraw: 0.5 } );

plane = new THREE.Mesh( geometry, material );
scene.add( plane );

renderer = new THREE.CanvasRenderer();
renderer.setClearColor( 0xf0f0f0 );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
container.appendChild( renderer.domElement );

camera.position.z = 5;
//Render
function render() {
	requestAnimationFrame( render );
	renderer.render( scene, camera );
	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;
	// effect.render( scene, camera );
}

render();