'Use Strict'
// Scene and Camera Attributes
var WIDTH = document.getElementById("scene").clientWidth,
  	HEIGHT = document.getElementById("scene").clientHeight,
  	gridSize = 105, gridStep = 10,
  	theta = 0, phi = 60,
  	onMouseDownTheta = theta, onMouseDownPhi = phi,
  	panStart = new THREE.Vector3(),
  	zoomSpeed = 1.0,
  	panSpeed = 0.4,
  	cameraCenter = new THREE.Vector3(0,0,0),
  	maxRadius = 1.8 * gridSize,
  	cameraRadius = maxRadius;

//Control Variables
var mode = 'EDIT',
	cursorMode = 'edit',
	editingList = false;

//Movement Variables
var control = undefined,
	point = new THREE.Vector3(),
	oldPosition = new THREE.Vector3();
	draggedElement = false,
	SELECTED = false,
	mouseDown = false,
	onMouseDownPosition = [0,0],
	normalVector = new THREE.Vector3( 0, 1, 0 );
var pointerVector = new THREE.Vector2();

//Shadow variables
var planeConstant = -0.01, // this value must be slightly higher than the groundMesh's y position of 0.0
	groundPlane = new THREE.Plane( new THREE.Vector3( 0, 1, 0 ), planeConstant ),
	lightPosition4D = new THREE.Vector4();

//Define Global Elements
var scene, renderer, camera, grid, ground;

//Experimental Elements
var container, interval,
	projector, plane, cube, linesMaterial, mesh,
	color = 0,colors = [ 0xDF1F1F, 0xDFAF1F, 0x80DF1F, 0x1FDF50, 0x1FDFDF, 0x1F4FDF, 0x7F1FDF, 0xDF1FAF, 0xEFEFEF, 0x303030 ],
	ray, brush, objectHovered,
	isShiftDown = false;
var raycaster = new THREE.Raycaster();
var offset = new THREE.Vector3();
var worldRotationMatrix  = new THREE.Matrix4();
var oldRotationMatrix = new THREE.Matrix4();
var tempMatrix = new THREE.Matrix4();

init();

//Add Sphere
// var sphere = makeSphere(20, 16, 16, 0xCC0000);
// sphere.position.y = 100;
// makeDraggable(sphere);

// sphere_vel_x = 1;
// sphere_vel_y = 2;
// sphere_vel_z = 3;

//Add Cube
// var box = makeBox(50, 50, 50, 0xCC0000);
// box.position.y = 100
// makeDraggable(box);

/**************************************************************************************\
|*********************************  Helper Functions  *********************************|
\**************************************************************************************/


function init(){
	//Scene
	// scene = new THREE.Scene();
	scene = new Physijs.Scene;
	scene.setGravity(new THREE.Vector3( 0, -30, 0 ));
	scene.addEventListener(
		'update',
		function() {
			scene.simulate( undefined, 1 );
		}
	);
	scene.shadows = [];
	scene.objects = [];
	scene.castShadow = true;

	//Renderer
	renderer = new THREE.CanvasRenderer();
	renderer.setClearColor( 0xf0f0f0 );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( WIDTH, HEIGHT );
	renderer.sortObjects = false; //BLENDING STUFF, NOT WORKING YET
	renderer.shadowMapEnabled = true; //SHADOW STUFF, NOT WORKING YET
	renderer.shadowMapType = THREE.PCFSoftShadowMap; //SHADOW STUFF, NOT WORKING YET
	document.getElementById("scene").appendChild( renderer.domElement );

	// Camera
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.x = cameraRadius * Math.sin( theta * Math.PI / 360 )
                            * Math.cos( phi * Math.PI / 360 );
    camera.position.y = cameraRadius * Math.sin( phi * Math.PI / 360 );
    camera.position.z = cameraRadius * Math.cos( theta * Math.PI / 360 )
                            * Math.cos( phi * Math.PI / 360 );
	camera.lookAt(cameraCenter);	
	scene.add(camera);


	//Grid
	grid = new THREE.GridHelper( gridSize, gridStep )
	grid.receiveShadow = true;
	scene.add( grid );
	var planeGeometry = new THREE.PlaneGeometry( gridSize*2, gridSize*2, 50, 50 );
	var planeMaterial = new THREE.MeshLambertMaterial( { color: 0xE6E4E6, visible: true } );
	ground = new THREE.Mesh( planeGeometry, planeMaterial );
	ground.rotation.set( - Math.PI / 2, 0, 0 );
	ground.renderOrder = -2;
	ground.frustumCulled = false;
	camera.add( ground );
	ground.receiveShadow = true;
	scene.add(ground);

	//Configure Lighting
	var light = new THREE.DirectionalLight( 'rgb(255,255,255)', 1 );
	light.lookAt( new THREE.Vector3(0,0,0) );
	lightPosition4D.x = light.position.x;
	lightPosition4D.y = light.position.y;
	lightPosition4D.z = light.position.z;
	lightPosition4D.w = 0.001;
	light.castShadow = true;
	scene.add( light );

	scene.add( new THREE.AmbientLight( 0x505050 ) );

	var light2 = new THREE.DirectionalLight( 'rgb(255,255,255)', 1 );
	light2.lookAt( new THREE.Vector3(0,0,0) );
	// light.position.y = gridSize*2;
	light.position.x = gridSize/4;
	light.position.z = gridSize/2;
	scene.add( light2 );
	light2.castShadow = true;


	// var light3 = new THREE.SpotLight( 0xffffff, 1.5 );
	// light3.position.set( 0, 100, 100 );
	// // light2.lookAt( new THREE.Vector3(0,0,0) );
	// light3.castShadow = true;

	// light3.shadow.camera.near = 200;
	// light3.shadow.camera.far = camera.far;
	// light3.shadow.camera.fov = 50;
	// light3.shadow.camera.visible = true;

	// light3.shadow.bias = -0.00022;

	// light3.shadow.mapSize.width = 2048;
	// light3.shadow.mapSize.height = 2048;

	// scene.add( light3 );

	document.addEventListener( "mousedown", on_doc_down);
	document.addEventListener( "mouseup", on_up );
	document.getElementById("sidebar").addEventListener( "mousedown", clickList);
	document.getElementById("scene").addEventListener( "mousedown", on_down );
	document.getElementById("scene").addEventListener( "touchstart", on_down );
	document.getElementById("scene").addEventListener( "mousewheel", on_MouseWheel );
	document.getElementById("scene").onresize = resize;

	animate();
	scene.simulate();
}

/**************************************************************************************\
|**********************************  DOM OPERATIONS  **********************************|
\**************************************************************************************/

function on_doc_down(event){
	//Toggle Cursor Menu Dropdown
	if (!event.target.matches('#dropBtn') && !event.target.classList.contains('menuBtn')) {
	    closeMenu();
  	}

  	//Confirm name change of sidebar element if clicking outside of textbox
  	if (editingList && event.target.type != 'text'){
  		var li = editingList.parentElement.parentElement;
		li.attached.name = editingList.value;
		li.innerHTML = editingList.value;
		editingList = false;
		return false;
	}

	//Reset all object opacities
	for (var i=0; i<scene.objects.length; i++){
		if (scene.objects[i] != SELECTED){
			scene.objects[i].material.opacity = 1;
		}
	}
	
	//Select a cube if name in sidebar is clicked, otherwise unselect all
	if (event.target != renderer.domElement){
		unselect();
		if (event.target.localName == "li"){
			console.log("select!");
			selectObj(event.srcElement.attached);
		}
	}
}
/*
* Handler for making the element controller appear or disappear. 
*/
function on_down(event){
	if (mode =='EDIT'){
		mouseDown = true;
		onMouseDownPosition = [event.clientX, event.clientY];
		onMouseDownTheta = theta;
		onMouseDownPhi = phi;

		if (cursorMode =='edit'){
			var pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;

			var intersections = intersectObjects( pointer, scene.objects );
			var clicked = intersections[ 0 ] ? intersections[ 0 ] : false;
			if (clicked){
				oldPosition.copy( clicked.object.position );
				oldRotationMatrix.extractRotation( clicked.object.matrix );
				worldRotationMatrix.extractRotation( clicked.object.parent.matrixWorld );

				selectObj(clicked.object);
				draggedElement = clicked.object;

				offset.copy( clicked.point );
			} else{
				unselect();
			}

		} else if (cursorMode == 'pan'){
			var mouseX = ( event.clientX / window.innerWidth ) * 2 - 1;
			var mouseY = -( event.clientY / window.innerHeight ) * 2 + 1;

			vector = new THREE.Vector3( mouseX, mouseY, camera.near );
			projector = new THREE.Projector();
			projector.unprojectVector( vector, camera );
			raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
			intersects = raycaster.intersectObject( ground );

			if ( intersects.length > 0 ) {

				panStart = intersects[ 0 ].point;

			}
		}	
		window.addEventListener( "mousemove", on_move );

	} else{
		document.getElementById("scene").style.cursor = "default";
	}		
}

function on_move(event){
	if (draggedElement && mouseDown){
		var pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;
		var intersections = intersectObjects( pointer, [ground] );
		var planeIntersect = intersections[ 0 ] ? intersections[ 0 ] : false;
		
		if ( planeIntersect === false ) return;

		point.copy( planeIntersect.point );
		point.y = Math.max(0, Math.min(gridSize/2, point.y));
		point.x = Math.max(-gridSize + gridStep, Math.min(gridSize, point.x));
		point.z = Math.max(-gridSize + gridStep, Math.min(gridSize, point.z));
		point.sub( offset );
		point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );
		point.y = 0;
		point.applyMatrix4( oldRotationMatrix );

		draggedElement.position.copy( oldPosition );
		draggedElement.position.add( point );
		// draggedElement.position.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

		draggedElement.position.x = Math.round( draggedElement.position.x / gridStep ) * gridStep;
		draggedElement.position.y = Math.round( draggedElement.position.y / gridStep ) * gridStep - gridStep/2;
		draggedElement.position.z = Math.round( draggedElement.position.z / gridStep ) * gridStep;


	} else if ((cursorMode == 'rotate' || cursorMode == 'edit') && mouseDown && !draggedElement){
        theta = - ( ( event.clientX - onMouseDownPosition[0] ) * 0.5 )
                + onMouseDownTheta;
        phi = ( ( event.clientY - onMouseDownPosition[1] ) * 0.5 )
              + onMouseDownPhi;

        phi = Math.min( 180, Math.max( 0, phi ) );

        camera.position.x = cameraCenter.x + cameraRadius * Math.sin( theta * Math.PI / 360 )
                            * Math.cos( phi * Math.PI / 360 );
        camera.position.y = cameraCenter.y + cameraRadius * Math.sin( phi * Math.PI / 360 );
        camera.position.z = cameraCenter.z + cameraRadius * Math.cos( theta * Math.PI / 360 )
                            * Math.cos( phi * Math.PI / 360 );
        camera.updateMatrix();
        camera.lookAt(cameraCenter);

    } else if (cursorMode =='pan' && mouseDown){
    	var mouseX = ( event.clientX / window.innerWidth ) * 2 - 1;
		var mouseY = -( event.clientY / window.innerHeight ) * 2 + 1;

		vector = new THREE.Vector3( mouseX, mouseY, camera.near );
		projector = new THREE.Projector();
		projector.unprojectVector( vector, camera );
		raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
		intersects = raycaster.intersectObject( ground );

		if ( intersects.length > 0 ) {

			panDelta = intersects[ 0 ].point;

			var delta = new THREE.Vector3();
			delta.subVectors( panStart, panDelta );
			// delta_3d = new THREE.Vector3(delta.x, 0, -delta.z);
			var oldPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);

			camera.position.addVectors( camera.position, delta );
			cameraCenter.addVectors(cameraCenter, delta);
			// cameraRadius = camera.position.length();
		}
	}
}

function on_up(event){
	if (draggedElement){
		draggedElement = false;
	}
	mouseDown = false;
	onMouseDownPosition[0] = event.clientX - onMouseDownPosition.x;
	onMouseDownPosition[1] = event.clientY - onMouseDownPosition.y;
	window.removeEventListener( "mousemove", on_move );
}

function on_MouseWheel( event ) {

	event.preventDefault();
	event.stopPropagation();

	var delta = 0;

	if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

		delta = event.wheelDelta;

	} else if ( event.detail ) { // Firefox

		delta = - event.detail;

	}
	
	var currentRadius = camera.position.length();
	delta = Math.max(-1000, Math.min(1000, delta));

	if ((currentRadius < maxRadius || delta > 0) && (currentRadius > gridStep*2 || delta < 0)){
		var zoomOffset = new THREE.Vector3();
		var te = camera.matrix.elements;
		zoomOffset.set( te[8], te[9], te[10] );
		zoomOffset.multiplyScalar( delta * -zoomSpeed * camera.position.y/1000 );
		camera.position.addVectors( camera.position, zoomOffset );
		checkCameraBounds();
	}

}

function checkCameraBounds(){
	// camera.position.x = Math.max(-gridSize, Math.min(gridSize, camera.position.x));
	// camera.position.y = Math.max(0, Math.min(gridSize, camera.position.y));
	// camera.position.z = Math.max(-gridSize, Math.min(1.5 * gridSize, camera.position.z));
	// cameraRadius = camera.position.length();
	if (camera.position.length() - cameraCenter.length() > maxRadius){
		var overflow_frac = (camera.position.length() - cameraCenter.length())/maxRadius
		camera.position.subVectors(camera.position, cameraCenter);
		camera.position.divideScalar(overflow_frac);
		camera.position.addVectors(camera.position, cameraCenter);
	} else if (camera.position.length() < gridStep*2){
		camera.position.divideScalar(camera.position.length()/gridStep/2)
	}
	cameraRadius = camera.position.length();
}

function clickList(event){
	// if (event.target.localName == "li"){
	// 	selecObj(event.srcElement.attached);
	// }	
}

function selectObj(element){
	element.material.opacity = 0.5;
	SELECTED = element;
	SELECTED.listLink.style.background = '#69A0E1';
	SELECTED.listLink.style.color = 'white';
}

function unselect(){
	if (SELECTED){
		SELECTED.material.opacity = 1;
		SELECTED.listLink.style.background = '';
		SELECTED.listLink.style.color = '';
	}
	SELECTED = false;
}

function updateList(){
	var list = document.getElementById( "elementList")
	if (list.children.length != scene.objects.length){
		while (list.firstChild) {
		    list.removeChild(list.firstChild);
		}
		for (var i=0; i<scene.objects.length; i++){
			var li = document.createElement("li");
			li.tabIndex = "0";
			li.innerHTML = scene.objects[i].name;
		  	// li.appendChild(document.createTextNode(scene.objects[i].name));
		  	li.attached = scene.objects[i];
		  	li.addEventListener("dblclick", editList);
		 	scene.objects[i].listLink = li;
		  	list.appendChild(li);
		}
	}
}

/* When the user clicks on the button, 
toggle between hiding and showing the dropdown content */
function showEditOptions() {
    document.getElementById("myDropdown").classList.toggle("show");
}

function editObj(){
	document.getElementById("dropBtn").innerHTML = 'Cursor: Edit'
	document.getElementById("scene").style.cursor = "pointer";
	cursorMode = 'edit';
	closeMenu();
}

function pan(){
	document.getElementById("dropBtn").innerHTML = 'Cursor: Pan';
	document.getElementById("scene").style.cursor = "-webkit-grab";
	cursorMode = 'pan';
	closeMenu();
}

function rotate(){
	document.getElementById("dropBtn").innerHTML = 'Cursor: Rotate'
	document.getElementById("scene").style.cursor = "url('/images/rotate.png'), auto";
	cursorMode = 'rotate';
	closeMenu();
}

function closeMenu(){
	var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
	     var openDropdown = dropdowns[i];
	     if (openDropdown.classList.contains('show')) {
	        openDropdown.classList.remove('show');
	     }
    }
}

function toggleGrid(){
	grid.visible = !grid.visible;
}

function centerView(){
	cameraCenter = new THREE.Vector3(0,0,0);
	cameraRadius = maxRadius;
	theta = 0, phi = 60;

	camera.position.x = cameraRadius * Math.sin( theta * Math.PI / 360 )
                            * Math.cos( phi * Math.PI / 360 );
    camera.position.y = cameraRadius * Math.sin( phi * Math.PI / 360 );
    camera.position.z = cameraRadius * Math.cos( theta * Math.PI / 360 )
                            * Math.cos( phi * Math.PI / 360 );
	camera.lookAt(cameraCenter);
}

function swapMode(){
	document.getElementById("play_edit_btn").innerHTML = mode;
	var buttons = document.getElementsByClassName("navElement");

	if (mode == "EDIT"){
		mode = "PLAY";
		centerView();
		for (var i=0; i<buttons.length; i++){
			buttons[i].style.display = "none";
		}	
		document.getElementById("sidebar").style.display = "none";
		document.getElementById("sceneOptions").style.display = "none";
		document.getElementById("scene").style.height = "100%";
		document.getElementById("editor").style.width = "100%";
		grid.visible = false;
		resize();
	} else{
		mode = "EDIT";
		for (var i=0; i<buttons.length; i++){
			buttons[i].style.display = "inline-block";
		}	
		document.getElementById("sidebar").style.display = "block";
		document.getElementById("sceneOptions").style.display = "block";
		document.getElementById("scene").style.height = "70%";
		document.getElementById("editor").style.width = "83%";
		grid.visible = true;
		resize();
	}
}

function resize(event){
	WIDTH = document.getElementById("scene").clientWidth;
  	HEIGHT = document.getElementById("scene").clientHeight;
  	renderer.setSize( WIDTH, HEIGHT );
}

function editList(event){
	if (!editingList){
		// makeUndraggable(event.target.attached);
		var form = document.createElement("form");
		var input = document.createElement("input");
		input.type = "text";
		input.value = event.target.innerHTML;
		input.attached = event.target.attached;
		editingList = input;

		form.onsubmit = function(){
			editingList = false;
			event.target.attached.name = input.value;
			event.target.innerHTML = input.value;
			event.target.attached.material.opacity = 1;
			return false;
		};
		form.appendChild(input);
		event.target.innerHTML = "";
		event.target.appendChild(form);
		input.select();
	}	
}


/**************************************************************************************\
|********************************  CREATION FUNCTIONS  ********************************|
\**************************************************************************************/

function addCube(){
	var width = gridStep,
		height = gridStep,
		depth = gridStep;
		
	var cube = makeBox(width, height, depth, 0xCC0000);
	addElement(cube);
	cube.position.y = 100;
}

function addSphere(){
	var radius = gridStep/2,
		segments = gridStep*2,
		rings = gridStep*2;

	var sphere = makeSphere(radius, segments, rings);
	addElement(sphere);
}

function addCylinder(){
	var cylinder = makeCylinder(gridStep/2, gridStep/2, gridStep, gridStep*2);
	addElement(cylinder);
}

function addCone(){
	var cone = makeCylinder(0.001, gridStep/2, gridStep, gridStep*2);
	addElement(cone);
}

function newObject(){
	alert("this feature is not supported yet.");
}

function addElement(element){
	// object = new THREE.Object3D(); //SHADOW STUFF, NOT WORKING YET
	// object.add(element); //SHADOW STUFF, NOT WORKING YET
	// object.castShadow = true; //SHADOW STUFF, NOT WORKING YET
	//Name
	currIndex = scene.objects.length;
	element.name = "Object" + (currIndex + 1);

	//Add to Scene
	scene.add( element );
	scene.objects.push( element ); 

	//Make Shadow
	element.position.y = gridStep/2;
	element.shadow = makeShadow(element);
	element.shadow.update(groundPlane, lightPosition4D);
	element.renderOrder = 10;
	updateList();
	selectObj(element);
}

function makeBox(width, height, depth, hexColor){
	var geometry = new THREE.BoxGeometry( width, height, depth );
	handleCollision = function( collided_with, linearVelocity, angularVelocity ) {
		switch ( ++this.collisions ) {
			
			case 1:
				this.material.color.setHex(0xcc8855);
				break;
			
			case 2:
				this.material.color.setHex(0xbb9955);
				break;
			
			case 3:
				this.material.color.setHex(0xaaaa55);
				break;
			
			case 4:
				this.material.color.setHex(0x99bb55);
				break;
			
			case 5:
				this.material.color.setHex(0x88cc55);
				break;
			
			case 6:
				this.material.color.setHex(0x77dd55);
				break;
		}
	}
	var material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial( { vertexColors: THREE.FaceColors, overdraw: 0.5 } ),
		.6, // medium friction
		.3 // low restitution
	);

	//Randomize colors of faces
	var hex = Math.random() * 0xffffff;
	for ( var i = 0; i < geometry.faces.length; i += 2 ) {
		geometry.faces[ i ].color.setHex( hex );
		geometry.faces[ i + 1 ].color.setHex( hex );
	}

	var box = new Physijs.BoxMesh( geometry, material, 10 );
	box.collisions = 0;
	box.castShadow = true;
	box.receiveShadow = true;
	box.addEventListener( 'collision', handleCollision );
	box.addEventListener( 'ready', makeBox );
	return box;
}

function makeSphere(radius, segments, rings){
	var sphereMaterial = 
	  new THREE.MeshLambertMaterial(
	    {
	      color: Math.random() * 0xffffff
	    });

	var sphere = new THREE.Mesh(

	  new THREE.SphereGeometry(
	    radius,
	    segments,
	    rings),

	  sphereMaterial);

	return sphere;
}

function makeCylinder(radiusTop, radiusBottom, height, radiusSegments){
	var geometry = new THREE.CylinderGeometry( radiusTop, radiusBottom, height, radiusSegments );
	var material = new THREE.MeshLambertMaterial( {color: Math.random() * 0xffffff} );
	var cylinder = new THREE.Mesh( geometry, material );
	return cylinder;
}

/**************************************************************************************\
|*********************************  CONTROL FUNCTIONS  ********************************|
\**************************************************************************************/

function makeShadow(element){
	shadow = new THREE.ShadowMesh( element );
	shadow.renderOrder = -1;
	scene.add( shadow );
	scene.shadows.push(shadow);
	return shadow;
}

function makeDraggable(element){
	control = new THREE.TransformControls( camera, renderer.domElement );
	control.setTranslationOffset( 0, gridStep/2, 0 );
	control.setTranslationSnap( gridStep );
	control.setXBound(-gridSize + gridStep, gridSize);
	control.setZBound(-gridSize + gridStep, gridSize);
	control.setYBound(0, gridSize/2);
	control.addEventListener( 'change', render );
	control.attach( element );
	scene.add( control );
	draggedElement = element;
	element.listLink.focus();
	window.addEventListener( 'keydown', setManipulationControlsDown);
	element.material.opacity = 0.3;
	document.getElementById("info").style.opacity = 1;
}

function makeUndraggable(element){
	// window.removeEventListener('keyup', setManipulationControlsUp);
	window.removeEventListener('keydown', setManipulationControlsDown);
	control.removeEventListener( 'change', render );
	control.dispose();
	scene.remove( control );
	control = undefined;
	draggedElement = false;
	element.material.opacity = 1;
	document.getElementById("info").style.opacity = 0;
}

function setManipulationControlsDown( event ){
	switch ( event.keyCode ) {
			case 81: // Q
				control.setMode( "translate" );
				break;

			case 87: // W
				control.setMode( "rotate" );
				break;

			case 69: // E
				control.setMode( "scale" );
				break;

			// case 82: // R
			// 	control.setTranslationSnap( snapIncrement );
			// 	control.setRotationSnap( THREE.Math.degToRad( 15 ) );
			// 	break;

			// case 84: // T
			// 	control.setSpace( control.space === "local" ? "world" : "local" );
			// 	break;

			// case 187:
			// case 107: // +, =, num+
			// 	control.setSize( control.size + 0.1 );
			// 	break;

			// case 189:
			// case 109: // -, _, num-
			// 	control.setSize( Math.max( control.size - 0.1, 0.1 ) );
			// 	break;

		}
}

function intersectObjects( pointer, objects ) {

	var rect = renderer.domElement.getBoundingClientRect();
	var x = ( pointer.clientX - rect.left ) / rect.width;
	var y = ( pointer.clientY - rect.top ) / rect.height;

	pointerVector.set( ( x * 2 ) - 1, - ( y * 2 ) + 1 );
	raycaster.setFromCamera( pointerVector, camera );

	var intersections = raycaster.intersectObjects( objects, true );
	return intersections;

}

/**************************************************************************************\
|********************************  ANIMATION FUNCTIONS  *******************************|
\**************************************************************************************/

function animate() {
	if (SELECTED){
		SELECTED.shadow.update(groundPlane, lightPosition4D);
	}
	render();

}

function render() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
	// sphere_vel_x = bounceX(sphere, 40, VIEW_WIDTH, sphere_vel_x)
	// sphere_vel_y = bounceY(sphere, 40, VIEW_HEIGHT, sphere_vel_y)
	// sphere_vel_z = bounceZ(sphere, 20, 100, sphere_vel_z)
}