var game3D = function(domElement, mode, testing){

    'Use Strict'
    Physijs.scripts.worker = 'js/Physijs/physijs_worker.js';
    Physijs.scripts.ammo = 'ammo.js';

    //Define Scene and THREEjs Elements
    var WIDTH = domElement.clientWidth,
      	HEIGHT = domElement.clientHeight,
      	gridSize = 21, gridStep = 1, gridOffset = 0, gridHeight = 0,
        scene, renderer, camera, grid, ground;

    //Camera Manipulation Parameters
    var theta = 0, phi = 60,
      	onMouseDownTheta = theta, onMouseDownPhi = phi,
      	zoomSpeed = 1.0, panSpeed = 0.4,
        maxRadius = gridSize,
      	cameraRadius = maxRadius,
        panStart = new THREE.Vector3(),
      	cameraCenter = new THREE.Vector3(0,0,0);

    //Play Variables
    var fps = 60, multiplayer = false,
        block_dispatcher = new block3D.dispatcher();

    //Control Variables
    var cursorMode = 'edit',
  	    rightbarMode = 'selected',
    	editingList = false;

    //Movement/Manipulation Variables
    var point = new THREE.Vector3(),
    	oldPosition = new THREE.Vector3(),
        pointerVector = new THREE.Vector2(),
        normalVector = new THREE.Vector3( 0, 1, 0 ),
        offset = new THREE.Vector3(),
        raycaster = new THREE.Raycaster(),
        worldRotationMatrix  = new THREE.Matrix4(),
        oldRotationMatrix = new THREE.Matrix4(),
        tempMatrix = new THREE.Matrix4(),
        rotObjectMatrix,
        mouseDown = false,
        onMouseDownPosition = [0,0],
    	  draggedElement = false,
    	  SELECTED = false,
    	  selectOpacity = 0.6;

    //Physics Variables
    var bounce = 0.3;

    //Shadow variables
    var planeConstant = -gridStep/2,
    	  groundPlane = new THREE.Plane( new THREE.Vector3( 0, 1, 0 ), planeConstant ),
    	  lightPosition4D = new THREE.Vector4();

    this.init = function(){
        //Scene
        scene = new Physijs.Scene;
        scene.setGravity(new THREE.Vector3( 0, -10, 0 ));
        scene.shadows = [];
        scene.objects = [];
        scene.walls = {};
        scene.startPositions = {};
        scene.castShadow = true;

        //Renderer
        renderer = new THREE.CanvasRenderer();
        renderer.setClearColor( 0xf0f0f0 );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( WIDTH, HEIGHT );
        // renderer.sortObjects = false; //BLENDING STUFF, NOT WORKING YET
        // renderer.shadowMapEnabled = true; //SHADOW STUFF, NOT WORKING YET
        // renderer.shadowMapType = THREE.PCFSoftShadowMap; //SHADOW STUFF, NOT WORKING YET
        domElement.appendChild( renderer.domElement );

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
        grid.name = "grid";
        scene.add( grid );

        // Ground
        ground_material = Physijs.createMaterial(
            new THREE.MeshLambertMaterial({ color: 'white', visible: true}),
            0, // high friction
            bounce // low restitution
        );
        ground = new Physijs.BoxMesh(
            new THREE.CubeGeometry(gridSize, 0.01, gridSize),
            ground_material,
            0 // mass
        );
        ground.position.set(0, -gridStep/2, 0);
        ground.renderOrder = -2;
        ground.frustumCulled = false;
        ground.receiveShadow = true;
        ground.name = "ground";
        camera.add( ground );
        scene.add( ground );

        buildWalls();


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
        light2.position.x = gridSize/4;
        light2.position.z = gridSize/2;
        light2.castShadow = true;
        scene.add( light2 );

        //Attach Listeners
        document.addEventListener( "mousedown", on_doc_down);
        document.addEventListener( "mouseup", on_up );
        domElement.addEventListener( "mousedown", on_down );
        domElement.addEventListener( "touchstart", on_down );
        domElement.addEventListener( "mousewheel", on_MouseWheel );
        domElement.onresize = resize;
        toggleSelected();

        //Begin Rendering
        requestAnimationFrame( render );
    }

    function buildWalls(){
    	var positions = [
        	[0, gridSize/2 - gridStep, gridSize/2],
        	[-gridSize/2, gridSize/2 - gridStep, 0],
        	[0, gridSize/2 - gridStep, -gridSize/2],
        	[gridSize/2, gridSize/2 - gridStep, 0]
        ];
        var names = ["top", "left", "bottom", "right"];

    	var wall_material = Physijs.createMaterial(
    		new THREE.MeshLambertMaterial({ color: 'red', visible: false}),
    		0, // friction
    		1 // restitution
    	);

    	for (var i = 0; i < 4; i++){
    		var wall = new Physijs.BoxMesh(
    			new THREE.CubeGeometry(gridSize, 0.01, gridSize),
    			wall_material,
    			0 // mass
    		);
    		wall.position.set(positions[i][0], positions[i][1], positions[i][2]);
    		if (i == 1 || i == 3){
    			rotateAroundObjectAxis(wall, "z", Math.PI/2);
    		}
    		rotateAroundObjectAxis(wall, "x", Math.PI/2);
    		// wall.addEventListener( 'collision', function( other_object, relative_velocity, relative_rotation, contact_normal ) {
    		// 	var dot = relative_velocity.dot(contact_normal.normalize());
    		// 	var newVel = relative_velocity - contact_normal.multiplyScalar(dot);
    		// 	other_object.setLinearVelocity(newVel);
    		// });
            scene.walls[names[i]] = wall;
    		scene.add(wall);
    	}
    }

    /**************************************************************************************\
    |*********************************  EDITING FUNCTIONS  ********************************|
    \**************************************************************************************/

    /*
    * Handler for making the element controller appear or disappear.
    */
    function on_down(event){
      	if (mode =='EDIT'){
        //EDIT MODE
    		mouseDown = true;
    		onMouseDownPosition = [event.clientX, event.clientY];
    		onMouseDownTheta = theta;
    		onMouseDownPhi = phi;

    		if (cursorMode =='edit'){
            handleCursorEdit();
    		} else if (cursorMode == 'pan'){
            handleCursorPan();
    		}
      	} else{
        //PLAY MODE
  		  domElement.style.cursor = "default";
      	}
        window.addEventListener( "mousemove", on_move );
    }

    function on_move(event){
        if (mode == "EDIT"){
            if (draggedElement && mouseDown){
                handleCursorDrag();
            } else if ((cursorMode == 'rotate' || cursorMode == 'edit') && mouseDown && !draggedElement){
                handleCameraRotation();
            } else if (cursorMode =='pan' && mouseDown){
                handleCameraPan();
            }
        }
    }

    function on_up(event){
    	// scene.setGravity(new THREE.Vector3( 0, -10, 0 )); //Make Elements Drop When Editing
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

        if (mode == "EDIT"){
            handleCameraZoom();
        }
    }

    function handleCursorEdit(){
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
    }

    function handleCursorPan(){
        var mouseX = ( event.clientX / window.innerWidth ) * 2 - 1;
        var mouseY = -( event.clientY / window.innerHeight ) * 2 + 1;
        vector = new THREE.Vector3( mouseX, mouseY, camera.near );
        var projector = new THREE.Projector();
        projector.unprojectVector( vector, camera );
        raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
        intersects = raycaster.intersectObject( ground );

        if ( intersects.length > 0 ) {
          panStart = intersects[ 0 ].point;
        }
    }

    function handleCursorDrag(){
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
        updateFormPos();
    }

    function handleCameraRotation(){
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
    }

    function handleCameraPan(){
        var mouseX = ( event.clientX / window.innerWidth ) * 2 - 1;
        var mouseY = -( event.clientY / window.innerHeight ) * 2 + 1;

        vector = new THREE.Vector3( mouseX, mouseY, camera.near );
        var projector = new THREE.Projector();
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

    function handleCameraZoom(){
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

    this.toggleGrid = function(){
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

    this.centerView = function(){
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

    function roundPosition(element){
    	draggedElement.position.x = Math.round( draggedElement.position.x );
    	draggedElement.position.y = Math.round( draggedElement.position.y );
    	draggedElement.position.z = Math.round( draggedElement.position.z );
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

    function rotateAroundObjectAxis(object, axis, radians) {
    	var rotAxis;
    	if (axis == "x"){
    		rotAxis = new THREE.Vector3(1,0,0);
    	} else if (axis = "y"){
    		rotAxis = new THREE.Vector3(0,1,0);
    	} else{
    		rotAxis = new THREE.Vector3(0,0,1);
    	}

        rotObjectMatrix = new THREE.Matrix4();
        rotObjectMatrix.makeRotationAxis(rotAxis.normalize(), radians);

        // old code for Three.JS pre r54:
        // object.matrix.multiplySelf(rotObjectMatrix);      // post-multiply
        // new code for Three.JS r55+:
        object.matrix.multiply(rotObjectMatrix);

        // old code for Three.js pre r49:
        // object.rotation.getRotationFromMatrix(object.matrix, object.scale);
        // old code for Three.js r50-r58:
        // object.rotation.setEulerFromRotationMatrix(object.matrix);
        // new code for Three.js r59+:
        object.rotation.setFromRotationMatrix(object.matrix);
    }

    /**************************************************************************************\
    |***********************************  UI OPERATIONS  **********************************|
    |*************************************  TEST ONLY  ************************************|
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
    		if (event.target.localName == "li"){
    			if(SELECTED){
    				unselect();
    			}
    			// console.log("select!");
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

    this.showEditOptions = function() {
        document.getElementById("myDropdown").classList.toggle("show");
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

    this.edit_rotate = function(){
    	document.getElementById("dropBtn").innerHTML = 'Cursor: Edit'
    	document.getElementById("scene").style.cursor = "pointer";
    	cursorMode = 'edit';
    	closeMenu();
    };

    this.pan = function(){
    	document.getElementById("dropBtn").innerHTML = 'Cursor: Pan';
    	document.getElementById("scene").style.cursor = "-webkit-grab";
    	cursorMode = 'pan';
    	closeMenu();
    };

    this.rotate = function(){
    	document.getElementById("dropBtn").innerHTML = 'Cursor: Rotate'
    	document.getElementById("scene").style.cursor = "url('/images/rotate.png'), auto";
    	cursorMode = 'rotate';
    	closeMenu();
    };



    //SELECTION HELPERS

    function submitSelectedForm(){
        readForm(SELECTED);
        return false;
    }

    function fillWorldForm(){
        var inputs = document.getElementById("editWorld")
        inputs[0].value = gridSize;
        inputs[1].value = gridHeight;
        inputs[2].value = fps;
        inputs[3].checked = multiplayer;
    }

    this.editSelected = function(){
        document.getElementById("editSelectedBtn").style.background = "#69A0E1";
        document.getElementById("editSelectedBtn").style.color = "white";
        document.getElementById("editWorldBtn").style.background = "#F3F3F3";
        document.getElementById("editWorldBtn").style.color = "#2A292A";
        console.log(document.getElementById("editSelected").childNodes[1]);

        document.getElementById("editSelected").style.display = "block";
        document.getElementById("editWorld").style.display = "none";
        rightbarMode = 'selected';

        toggleSelected();
    }

    this.editWorld = function(){
        document.getElementById("editWorldBtn").style.background = "#69A0E1";
        document.getElementById("editWorldBtn").style.color = "white";
        document.getElementById("editSelected").style.display = "none";
        document.getElementById("editSelectedBtn").style.background = "#F3F3F3";
        document.getElementById("editSelectedBtn").style.color = "#2A292A";
        document.getElementById("editWorld").style.display = "block";
        rightbarMode = 'world';
        fillWorldForm();
    }


    function updateFormPos(){
        if (testing){
            var inputs = document.getElementById("editSelected")
        	inputs[0].value = SELECTED.position.x;
        	inputs[2].value = SELECTED.position.z;
        } else{
            //TODO
        }
    }

    this.swapMode = function(){
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
    	game.centerView();
    	for (var i=0; i<buttons.length; i++){
    		buttons[i].style.display = "none";
    	}
    	for (var i=0; i<scene.objects.length; i++){
    		saveObject(scene.objects[i]);
    	}

    	document.getElementById("sidebar").style.display = "none";
    	document.getElementById("rightbar").style.display = "none";
    	document.getElementById("sceneOptions").style.display = "none";
    	document.getElementById("scene").style.height = "100%";
    	document.getElementById("editor").style.width = "100%";
    	document.getElementById("editor").style.left = 0;
    	grid.visible = false;

    	ground_material = Physijs.createMaterial(
    		new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/grass.png' ) }),
    		bounce
    	);
    	ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
    	ground_material.map.repeat.set( 3, 3 );
    	ground.material = ground_material;

        block_dispatcher.play();
    }

    function edit(buttons){
    	mode = "EDIT";
    	for (var i=0; i<buttons.length; i++){
    		buttons[i].style.display = "inline-block";
    	}
    	for (var i=0; i<scene.objects.length; i++){
    		resetObject(scene.objects[i]);
    	}

    	document.getElementById("sidebar").style.display = "block";
    	document.getElementById("rightbar").style.display = "block";
    	document.getElementById("sceneOptions").style.display = "block";
    	document.getElementById("scene").style.height = "70%";
    	document.getElementById("editor").style.width = "66%";
    	document.getElementById("editor").style.left = "17%";
    	grid.visible = true;

    	ground_material = Physijs.createMaterial(
    		new THREE.MeshLambertMaterial({ color: 'white' }),
    		bounce
    	);
    	ground.material = ground_material;

        block_dispatcher.reset();
    }

    function toggleSelected(){
        if (testing){
            var inputs = document.getElementById("editSelected")
        	var disabled = true;

        	if (SELECTED){
        		disabled = false;
        	}
        	for (var i=0; i < inputs.length; i++){
        		inputs[i].disabled = disabled;
        		if (SELECTED){
        			fillForm(inputs[i], SELECTED);
        		} else{
        			if (inputs[i].type == "text"){
        				inputs[i].value = "";
        			} else if (inputs[i].type == "checkbox"){
        				inputs[i].checked = false;
        			} else{
        				inputs[i].value = "terrain";
        			}
        		}
        	}
        }
    }

    function fillForm(input, selected){
    	switch(input.name){
    		case "pos_x":
    			selected.__dirtyPosition = true;
    			input.value = selected.position.x;
    			break;
    		case "pos_y":
    			selected.__dirtyPosition = true;
    			input.value = selected.position.y;
    			break;
    		case "pos_z":
    			selected.__dirtyPosition = true;
    			input.value = selected.position.z;
    			break;
    		case "scale_x":
    			input.value = selected.scale.x;
    			break;
    		case "scale_y":
    			input.value = selected.scale.y;
    			break;
    		case "scale_z":
    			input.value = selected.scale.z;
    			break;
    		case "rot_x":
    			selected.__dirtyRotation = true;
    			input.value = selected.rotation.x;
    			break;
    		case "rot_y":
    			selected.__dirtyRotation = true;
    			input.value = selected.rotation.y;
    			break;
    		case "rot_z":
    			selected.__dirtyRotation = true;
    			input.value = selected.rotation.z;
    			break;
    		case "classType":
    			if (selected.classType == "hero"){
    				input.value = "hero";
    				input.disabled = true;
    			} else{
    				document.getElementById("classDropdown").options[2].style.display = "none";
    			}
    		case "mass":
    			input.value = selected.playAttributes.mass;
    			break;
    		case "friction":
    			input.value = selected.material._physijs.friction;
    			break;
    		case "bounce":
    			input.value = selected.material._physijs.restitution;
    			break;
    		case "vel_x":
    			input.value = selected.playAttributes.velocity.x;
    			break;
    		case "vel_y":
    			input.value = selected.playAttributes.velocity.y;
    			break;
    		case "vel_z":
    			input.value = selected.playAttributes.velocity.z;
    			break;
    		case "invis":
    			input.checked = selected.playAttributes.invisible;
    			break;
    		case "drag":
    			input.checked = selected.playAttributes.draggable;
    			break;
    		case "stop_drag":
    			input.checked = selected.playAttributes.stop_after_drag;
    			break;
    		case "collision":
    			input.checked = selected.playAttributes.ignore_collision;
    			break;
    		case "edges":
    			input.checked = selected.playAttributes.ignore_edges;
    			break;
    		default:
    	}
    }

    function readForm(selected){
    	var inputs = document.getElementById("editSelected");
    	for (var i=0; i < inputs.length; i++){
    		var input = inputs[i];
    		input.blur();
    		switch(input.name){
    			case "pos_x":
    				if (input.value != selected.position.x){
    					selected.position.set(input.value, selected.position.y, selected.position.z);
    				}
    				break;
    			case "pos_y":
    				if (input.value != selected.position.x){
    					input.value = Math.max(0, input.value)
    					selected.position.set(selected.position.x, input.value, selected.position.z);
    				}
    				break;
    			case "pos_z":
    				if (input.value != selected.position.x){
    					selected.position.set(selected.position.x, selected.position.y, input.value);
    				}
    				break;
    			case "scale_x":
    				selected.scale.x = input.value;
    				break;
    			case "scale_y":
    				selected.scale.y = input.value;
    				break;
    			case "scale_z":
    				selected.scale.z = input.value;
    				break;
    			case "rot_x":
    				selected.rotation.x = input.value;
    				break;
    			case "rot_y":
    				selected.rotation.y = input.value;
    				break;
    			case "rot_z":
    				selected.rotation.z = input.value;
    				break;
    			case "classType":
    				if (selected.classType != "hero"){
    					selected.classType = input.value
    				}
    			case "mass":
    				input.value = Math.max(0, input.value)
    				selected.playAttributes.mass = input.value;
    				break;
    			case "friction":
    				selected.material._physijs.friction = input.value;
    				break;
    			case "bounce":
    				selected.material._physijs.restitution = input.value;
    				break;
    			case "vel_x":
    				selected.playAttributes.velocity.x = input.value;
    				break;
    			case "vel_y":
    				selected.playAttributes.velocity.y = input.value;
    				break;
    			case "vel_z":
    				selected.playAttributes.velocity.z = input.value;
    				break;
    			case "invis":
    				selected.playAttributes.invisible = input.value;
    				break;
    			case "drag":
    				selected.playAttributes.draggable = input.value;
    				break;
    			case "stop_drag":
    				selected.playAttributes.stop_after_drag = input.value;
    				break;
    			case "collision":
    				selected.playAttributes.ignore_collision = input.value;
    				break;
    			case "edges":
    				selected.playAttributes.ignore_edges = input.value;
    				break;
    			default:
    		}
    	}
    }

    function resize(event){
    	WIDTH = document.getElementById("scene").clientWidth;
      	HEIGHT = document.getElementById("scene").clientHeight;
      	renderer.setSize( WIDTH, HEIGHT );
    }

    /**************************************************************************************\
    |*******************************  GAME STATE FUNCTIONS  *******************************|
    \**************************************************************************************/

    function selectObj(element){
    	element.material.opacity = selectOpacity;
    	SELECTED = element;
        if (testing){
            SELECTED.listLink.style.background = '#69A0E1';
        	SELECTED.listLink.style.color = 'white';
        	toggleSelected();
        }
    }

    function unselect(){
    	if (SELECTED){
            SELECTED.material.opacity = 1;
            if (testing){
                readForm(SELECTED);
        		SELECTED.listLink.style.background = '';
        		SELECTED.listLink.style.color = '';
            }
    	}
    	SELECTED = false;
        toggleSelected();
    }

    function saveObject(element){
    	scene.startPositions[element.name] = new THREE.Vector3(element.position.x, element.position.y, element.position.z);
    	element.mass = 1;
    	element.setLinearVelocity(element.playAttributes.velocity);
    }

    function resetObject(element){
    	element.mass = 0;
    	element.setLinearVelocity(new THREE.Vector3(0, 0, 0));
        element.setAngularVelocity(new THREE.Vector3(0, 0, 0));

        element.__dirtyPosition = true;
        var old = scene.startPositions[element.name];
        element.position.set(old.x, old.y, old.z);
    }

    /**************************************************************************************\
    |********************************  CREATION FUNCTIONS  ********************************|
    \**************************************************************************************/

    this.addCube = function(){
    	var geometry = new THREE.BoxGeometry( gridStep, gridStep, gridStep );
    	var material_color = 0xD0021B; //For Random: Math.random() * 0xffffff
    	var material = Physijs.createMaterial( new THREE.MeshLambertMaterial( { color: material_color} ),
    		0, // friction
    		0.9 // restitution
    	);

    	var cube = new Physijs.BoxMesh( geometry, material);
    	cube.class = "Class 1"
    	addElement(cube);
    }

    this.addSphere = function(){
    	var material_color = 0xD0021B; //For Random: Math.random() * 0xffffff
    	var material = Physijs.createMaterial( new THREE.MeshLambertMaterial( { color: material_color} ),
    		0, // friction
    		0.9 // restitution
    	);
    	var sphere = new Physijs.SphereMesh(
    	  new THREE.SphereGeometry(
    	    radius = gridStep/2,
    	    segments = 8,
    	    rings = 8),
    	  material);

    	sphere.class = "Class 2"
    	return addElement(sphere);
    }

    this.addCylinder = function(){
    	var radiusTop = gridStep/2, radiusBottom = gridStep/2, height = gridStep, radiusSegments = 10;
    	var material_color = 0xD0021B; //For Random: Math.random() * 0xffffff
    	var material = Physijs.createMaterial( new THREE.MeshLambertMaterial( { color: material_color} ),
    		0, // friction
    		1 // restitution
    	);
    	var geometry = new THREE.CylinderGeometry( radiusTop, radiusBottom, height, radiusSegments );
    	var cylinder = new Physijs.CylinderMesh( geometry, material );

    	cylinder.class = "Class 3"
    	return addElement(cylinder);
    }

    this.addCone = function(){
    	var radiusTop = 0.001, radiusBottom = gridStep/2, height = gridStep, radiusSegments = 10;
    	var material_color = 0xD0021B; //For Random: Math.random() * 0xffffff
    	var material = Physijs.createMaterial( new THREE.MeshLambertMaterial( { color: material_color} ),
    		0, // medium friction
    		.3 // low restitution
    	);
    	var geometry = new THREE.CylinderGeometry( radiusTop, radiusBottom, height, radiusSegments );
    	var cone = new Physijs.CylinderMesh( geometry, material );

    	cone.class = "hero"
        var move_forward = new block3D.motion.velocity(cone, 0, 0, -5);
        var move_left = new block3D.motion.velocity(cone, -5, 0, 0);
        var move_back = new block3D.motion.velocity(cone, 0, 0, 5);
        var move_right = new block3D.motion.velocity(cone, 5, 0, 0);
        var jump = new block3D.motion.velocity(cone, 0, 5, 0);
        var upKey = new block3D.input.whileDown('up', [move_forward]);
        var leftKey = new block3D.input.whileDown('left', [move_left]);
        var downKey = new block3D.input.whileDown('down', [move_back]);
        var rightKey = new block3D.input.whileDown('right', [move_right]);
        var spaceKey = new block3D.input.onDown('a', [jump]);
        block_dispatcher.add(upKey);
        block_dispatcher.add(leftKey);
        block_dispatcher.add(downKey);
        block_dispatcher.add(rightKey);
        block_dispatcher.add(spaceKey);
        console.log(block_dispatcher);

    	return addElement(cone);
    }

    this.addHero = function(){
    	var loader = new THREE.ObjectLoader();
    	// var loader = new THREE.JSONLoader();

    	loader.load("models/player.json",function ( obj ) {
    		// var bear = obj.children[0];
    		// bear.renderOrder = 10;
    		// // bear.position.y = 1;
    		// // bear.scale = new THREE.Vector3(0.5, 0.5, 0.5);
    		// console.log(bear)
    		// scene.add(bear);
    		console.log(obj);
    		scene.add(obj)
    		obj.shadow = makeShadow(obj);
    		obj.shadow.update(groundPlane, lightPosition4D);
    		obj.renderOrder = 10;

    		scene.objects.push(obj)
    	});

    	// loader.load( 'models/player.json', function ( geometry, materials ) {
    	//     var bear = new THREE.Mesh( geometry, new THREE.MeshFaceMaterial( materials ) );
    	//     console.log(bear)
    	// 	scene.add( bear );
    	// 	// scene.objects.push( bear );
    	// 	// bear.shadow = makeShadow(bear);
    	// 	// bear.shadow.update(groundPlane, lightPosition4D);
    	// 	// bear.renderOrder = 10;
    	// });
    }

    this.newObject = function(){
    	alert("this feature is not supported yet.");
    }

    function addElement(element){
    	unselect();
    	//Name
    	currIndex = scene.objects.length;
    	element.name = "Object" + (currIndex + 1);
    	if (element.class == "hero"){
    		element.classType = "hero"
    		document.getElementById("heroBtn").style.display = "none";
    		element.name = "Hero"
    		currIndex -= 1;
    	} else{
    		element.classType = "terrain"
    	}

    	element.position.set(0, 0, 0);
    	element.mass = 0;
    	element.playAttributes = {
    		// velocity: new THREE.Vector3(5 * (Math.random() - 0.5) , 20 * (Math.random() - 0.5), 5 * (Math.random() - 0.5)),
    		mass: 1,
    		invisible: false,
    		draggable: false,
    		stop_after_drag: true,
    		ignore_collision: false,
    		ignore_edges: false,
    		velocity: new THREE.Vector3(0,0,0)
    	}

    	//Add to Scene
    	scene.add( element );
    	scene.objects.push( element );

    	// Enable CCD if the object moves more than 1 meter in one simulation frame
    	element.setCcdMotionThreshold(1);

    	// Set the radius of the embedded sphere such that it is smaller than the object
    	element.setCcdSweptSphereRadius(0.2);

    	//Make Shadow
    	element.shadow = makeShadow(element);
    	element.shadow.update(groundPlane, lightPosition4D);
    	element.renderOrder = 10;

        if (testing){
            updateList();
        }
    	selectObj(element);
        return element;
    }

    function makeShadow(element){
    	shadow = new THREE.ShadowMesh( element );
    	shadow.renderOrder = 0;
    	shadow.name = element.name + " shadow";
    	scene.add( shadow );
    	scene.shadows.push(shadow);
    	return shadow;
    }

    this.updatePosition = function(element, x, y, z){
        element.__dirtyPosition = true;
        element.position.set(x, y, z);
    }

    /**************************************************************************************\
    |********************************  ANIMATION FUNCTIONS  *******************************|
    \**************************************************************************************/

    function render() {
    	// if (SELECTED){
    	// 	SELECTED.shadow.update(groundPlane, lightPosition4D);
    	// }
    	// if (mode == "PLAY"){
    	// 	for (var i = 0; i < scene.objects.length; i++){
    	// 		scene.objects[i].shadow.update(groundPlane, lightPosition4D);
    	// 	}
    	// }
    	if (mode == 'EDIT'){
    		for (var i = 0; i < scene.objects.length; i++){
    			scene.objects[i].__dirtyPosition = true;
    		}
    	}
    	for (var i = 0; i < scene.objects.length; i++){
    		scene.objects[i].shadow.update(groundPlane, lightPosition4D);
    	}
    	scene.simulate();
    	requestAnimationFrame( render );
    	renderer.render( scene, camera );
    }
}
var game = new game3D(document.getElementById("scene"), "EDIT", true);
// console.log(game);
game.init();
