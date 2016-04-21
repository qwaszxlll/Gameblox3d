'Use Strict'
Physijs.scripts.worker = 'js/Physijs/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

// Scene and Camera Attributes
var WIDTH = document.getElementById("scene").clientWidth,
  	HEIGHT = document.getElementById("scene").clientHeight,
  	gridSize = 21, gridStep = 1, gridOffset = 0,
  	theta = 0, phi = 60,
  	onMouseDownTheta = theta, onMouseDownPhi = phi,
  	panStart = new THREE.Vector3(),
  	zoomSpeed = 1.0,
  	panSpeed = 0.4,
  	cameraCenter = new THREE.Vector3(0,0,0),
  	maxRadius = gridSize,
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
	selectOpacity = 0.8,
	normalVector = new THREE.Vector3( 0, 1, 0 );
var pointerVector = new THREE.Vector2();

//Physics Variables
var collided = false;

//Shadow variables
var planeConstant = -gridStep/2, // this value must be slightly higher than the groundMesh's y position of 0.0
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
	scene.setGravity(new THREE.Vector3( 0, -10, 0 ));
	scene.shadows = [];
	scene.objects = [];
	scene.startPositions = {};
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
	grid = new THREE.GridHelper( gridSize/2, gridStep );
	grid.position.y = -gridStep/2;
	grid.receiveShadow = true;
	scene.add( grid );
	grid.name = "grid";
	// var planeGeometry = new THREE.PlaneGeometry( gridSize, gridSize, 50, 50 );
	// var planeMaterial = new THREE.MeshLambertMaterial( { color: 0xE6E4E6, visible: true } );

	// Ground
	ground_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 'white', visible: true}),
		.8, // high friction
		.3 // low restitution
	);
	ground = new Physijs.BoxMesh(
		new THREE.CubeGeometry(gridSize, 0.01, gridSize),
		ground_material,
		0 // mass
	);
	ground.position.set(0, -gridStep/2, 0);
	ground.renderOrder = -2;
	ground.frustumCulled = false;
	ground.name = "ground";
	camera.add( ground );
	ground.receiveShadow = true;
	scene.add( ground );

	// var wall_material = Physijs.createMaterial(
	// 	new THREE.MeshLambertMaterial({ color: 'white', visible: false}),
	// 	.8, // high friction
	// 	.3 // low restitution
	// );
	// var north_wall = new Physijs.BoxMesh(
	// 	new THREE.CubeGeometry(gridSize, 0.01, gridSize),
	// 	wall_material,
	// 	0 // mass
	// );
	// north_wall.position.set(0, -gridStep/2, gridSize/2);
	// north_wall.renderOrder = -2;
	// north_wall.frustumCulled = false;
	// camera.add( north_wall );
	// north_wall.receiveShadow = true;
	// scene.add( north_wall );


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
	// document.getElementById("sidebar").addEventListener( "mousedown", clickList);
	document.getElementById("scene").addEventListener( "mousedown", on_down );
	document.getElementById("scene").addEventListener( "touchstart", on_down );
	document.getElementById("scene").addEventListener( "mousewheel", on_MouseWheel );
	document.getElementById("scene").onresize = resize;

	requestAnimationFrame( render );
}

/**************************************************************************************\
|*********************************  EDITING FUNCTIONS  ********************************|
\**************************************************************************************/

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
			unselect();
			if (clicked){
				oldPosition.copy( clicked.object.position );
				oldRotationMatrix.extractRotation( clicked.object.matrix );
				worldRotationMatrix.extractRotation( clicked.object.parent.matrixWorld );

				selectObj(clicked.object);
				draggedElement = clicked.object;

				offset.copy( clicked.point );
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
		scene.setGravity(new THREE.Vector3( 0, 0, 0 ));
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
		point.applyMatrix4( oldRotationMatrix );
		point.y = 0;

		draggedElement.__dirtyPosition = true;
		draggedElement.setLinearVelocity(new THREE.Vector3(0, 0, 0));
   		draggedElement.setAngularVelocity(new THREE.Vector3(0, 0, 0));
		draggedElement.position.copy( oldPosition );
		draggedElement.position.add( point );

		// draggedElement.position.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

		draggedElement.position.x = Math.round( draggedElement.position.x / gridStep ) * gridStep;
		// draggedElement.position.y = Math.round( draggedElement.position.y / gridStep ) * gridStep;
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
	scene.setGravity(new THREE.Vector3( 0, -10, 0 ));
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

function roundPosition(element){
	draggedElement.position.x = Math.round( draggedElement.position.x );
	draggedElement.position.y = Math.round( draggedElement.position.y );
	draggedElement.position.z = Math.round( draggedElement.position.z );
}

function selectObj(element){
	element.material.opacity = selectOpacity;
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

function checkCameraBounds(){
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
|***********************************  UI OPERATIONS  **********************************|
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
};

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
};

//Allows User to edit the name of an object
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
};
/**************************************************************************************\
|******************************  MENU BUTTON INTERACTIONS  ****************************|
\**************************************************************************************/
function showEditOptions() {
    document.getElementById("myDropdown").classList.toggle("show");
};

function edit_rotate(){
	document.getElementById("dropBtn").innerHTML = 'Cursor: Edit'
	document.getElementById("scene").style.cursor = "pointer";
	cursorMode = 'edit';
	closeMenu();
};

function pan(){
	document.getElementById("dropBtn").innerHTML = 'Cursor: Pan';
	document.getElementById("scene").style.cursor = "-webkit-grab";
	cursorMode = 'pan';
	closeMenu();
};

function rotate(){
	document.getElementById("dropBtn").innerHTML = 'Cursor: Rotate'
	document.getElementById("scene").style.cursor = "url('/images/rotate.png'), auto";
	cursorMode = 'rotate';
	closeMenu();
};

function closeMenu(){
	var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
	     var openDropdown = dropdowns[i];
	     if (openDropdown.classList.contains('show')) {
	        openDropdown.classList.remove('show');
	     }
    }
};

function toggleGrid(){
	grid.visible = !grid.visible;
	if (grid.visible){
		ground_material = Physijs.createMaterial(
			new THREE.MeshLambertMaterial({ color: 'white' })
		);
	} else{
		ground_material = Physijs.createMaterial(
			new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/grass.png' ) })
		);
		ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
		ground_material.map.repeat.set( 3, 3 );
	}
	ground.material = ground_material;
};

function centerView(){
	cameraCenter = new THREE.Vector3(0,0,0),
	theta = 0, phi = 30,
	cameraRadius = maxRadius;

	camera.position.x = maxRadius * Math.sin( theta * Math.PI / 360 )
                            * Math.cos( phi * Math.PI / 360 );
    camera.position.y = maxRadius * Math.sin( phi * Math.PI / 360 );
    camera.position.z = maxRadius * Math.cos( theta * Math.PI / 360 )
                            * Math.cos( phi * Math.PI / 360 );
	camera.lookAt( cameraCenter );
};

/**************************************************************************************\
|*******************************  GAME STATE FUNCTIONS  *******************************|
\**************************************************************************************/

function swapMode(){
	document.getElementById("play_edit_btn").innerHTML = mode;
	var buttons = document.getElementsByClassName("navElement");

	if (mode == "EDIT"){
		play(buttons);
	} else{
		edit(buttons);
	}
	resize();
}

function play(buttons){
	mode = "PLAY";
	centerView();
	for (var i=0; i<buttons.length; i++){
		buttons[i].style.display = "none";
	}	
	for (var i=0; i<scene.objects.length; i++){
		saveObject(scene.objects[1]);
	}	

	document.getElementById("sidebar").style.display = "none";
	document.getElementById("sceneOptions").style.display = "none";
	document.getElementById("scene").style.height = "100%";
	document.getElementById("editor").style.width = "100%";
	grid.visible = false;
	
	ground_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/grass.png' ) })
	);
	ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
	ground_material.map.repeat.set( 3, 3 );
	ground.material = ground_material;
}

function edit(buttons){
	mode = "EDIT";
	for (var i=0; i<buttons.length; i++){
		buttons[i].style.display = "inline-block";
	}	
	for (var i=0; i<scene.objects.length; i++){
		resetObject(scene.objects[1]);
	}	

	document.getElementById("sidebar").style.display = "block";
	document.getElementById("sceneOptions").style.display = "block";
	document.getElementById("scene").style.height = "70%";
	document.getElementById("editor").style.width = "83%";
	grid.visible = true;

	ground_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 'white' })
	);
	ground.material = ground_material;
}

function saveObject(element){
	console.log(element.position);
	scene.startPositions[element.name] = new THREE.Vector3(element.position.x, element.position.y, element.position.z);
	element.mass = 1;
}

function resetObject(element){
	element.mass = 0;
	element.setLinearVelocity(new THREE.Vector3(0, 0, 0));
    element.setAngularVelocity(new THREE.Vector3(0, 0, 0));

    element.__dirtyPosition = true;
    var old = scene.startPositions[element.name];
    element.position.set(old.x, old.y, old.z);
}

function resize(event){
	WIDTH = document.getElementById("scene").clientWidth;
  	HEIGHT = document.getElementById("scene").clientHeight;
  	renderer.setSize( WIDTH, HEIGHT );
}

/**************************************************************************************\
|********************************  CREATION FUNCTIONS  ********************************|
\**************************************************************************************/

function addCube(){
	var geometry = new THREE.BoxGeometry( gridStep, gridStep, gridStep );
	var material_color = 0xD0021B; //For Random: Math.random() * 0xffffff
	var material = Physijs.createMaterial( new THREE.MeshLambertMaterial( { color: material_color} ),
		0, // medium friction
		.3 // low restitution
	);

	//Randomize colors of faces
	// var hex = Math.random() * 0xffffff;
	// for ( var i = 0; i < geometry.faces.length; i += 2 ) {
	// 	geometry.faces[ i ].color.setHex( hex );
	// 	geometry.faces[ i + 1 ].color.setHex( hex );
	// }

	var cube = new Physijs.BoxMesh( geometry, material);
	addElement(cube);
}

function addSphere(){
	var material_color = 0xD0021B; //For Random: Math.random() * 0xffffff
	var material = Physijs.createMaterial( new THREE.MeshLambertMaterial( { color: material_color} ),
		0, // medium friction
		.3 // low restitution
	);
	var sphere = new Physijs.SphereMesh(
	  new THREE.SphereGeometry(
	    radius = gridStep/2,
	    segments = 8,
	    rings = 8),
	  material);

	addElement(sphere);
}

function addCylinder(){
	var radiusTop = gridStep/2, radiusBottom = gridStep/2, height = gridStep, radiusSegments = 10;
	var material_color = 0xD0021B; //For Random: Math.random() * 0xffffff
	var material = Physijs.createMaterial( new THREE.MeshLambertMaterial( { color: material_color} ),
		0, // medium friction
		.3 // low restitution
	);
	var geometry = new THREE.CylinderGeometry( radiusTop, radiusBottom, height, radiusSegments );
	var cylinder = new Physijs.CylinderMesh( geometry, material );
	addElement(cylinder);
}

function addCone(){
	var radiusTop = 0.001, radiusBottom = gridStep/2, height = gridStep, radiusSegments = 10;
	var material_color = 0xD0021B; //For Random: Math.random() * 0xffffff
	var material = Physijs.createMaterial( new THREE.MeshLambertMaterial( { color: material_color} ),
		0, // medium friction
		.3 // low restitution
	);
	var geometry = new THREE.CylinderGeometry( radiusTop, radiusBottom, height, radiusSegments );
	var cone = new Physijs.CylinderMesh( geometry, material );
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
	element.position.set(0, 0, 0);
	element.mass = 0;

	//Add to Scene
	scene.add( element );
	scene.objects.push( element ); 

	//Make Shadow
	element.shadow = makeShadow(element);
	element.shadow.update(groundPlane, lightPosition4D);
	element.renderOrder = 10;
	updateList();
	selectObj(element);
}

function makeShadow(element){
	shadow = new THREE.ShadowMesh( element );
	shadow.renderOrder = 0;
	shadow.name = element.name + " shadow";
	scene.add( shadow );
	scene.shadows.push(shadow);
	return shadow;
}

/**************************************************************************************\
|********************************  ANIMATION FUNCTIONS  *******************************|
\**************************************************************************************/

// function animate() {
// 	if (SELECTED){
// 		SELECTED.shadow.update(groundPlane, lightPosition4D);
// 	}
// 	render();
// 	scene.simulate();
// }

function render() {
	if (SELECTED){
		SELECTED.shadow.update(groundPlane, lightPosition4D);
	}
	scene.simulate();
	requestAnimationFrame( render );
	renderer.render( scene, camera );
	// sphere_vel_x = bounceX(sphere, 40, VIEW_WIDTH, sphere_vel_x)
	// sphere_vel_y = bounceY(sphere, 40, VIEW_HEIGHT, sphere_vel_y)
	// sphere_vel_z = bounceZ(sphere, 20, 100, sphere_vel_z)
}