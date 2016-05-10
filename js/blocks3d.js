var block3D = function(){};
block3D.dispatcher = function(){
    this.root_directory = {};
    this.directory = {};
    this.add = function(block, parent_id){
        if (typeof parent_id == 'undefined' || parent_id == 'root'){
            this.root_directory[block.id] = block;
            this.directory[block.id] = block;
        } else{
            this.directory[parent_id].children.push(block);
            this.directory[block.id] = block
        }
        // if (block.children){
        //     for (var i=0; i<block.children.length; i++){
        //         var child = block.children[i];
        //         this.add(child, block.id);
        //     }
        // }
    }
    this.reattach = function(id, block, parent_id, new_id){
        if (parent_id == 'root'){
            delete this.root_directory[parent_id]
        } else{
            var targetArr = this.root_directory[parent_id].children;
            removeFromArray(block, targetArr);
        }
        this.add(id, block, new_id);
    }
    this.remove = function(id){
        if (this.directory[id]){
            delete this.directory[id];
        }
        if (this.root_directory[id]){
            delete this.root_directory[id];
        }
    }
    this.play = function(){
        for (var key in this.root_directory){
            this.root_directory[key].trigger();
        }
    }
    this.reset = function(){
        for (var key in this.root_directory){
            this.root_directory[key].reset();
        }
    }
}
/******************************************************************************\
|**********************************  EVENTS  **********************************|
\******************************************************************************/
block3D.event = function(){};
block3D.event.onGameStart = function(children, id){
    this.type = "event";
    this.name = "rotation";
    this.id = setDefault(id, guid());
    this.children = setDefault(children, []);
    this.trigger = function(){
        //on game start trigger children
        triggerChildren(this.children);
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}
block3D.event.onCollision = function(obj1, obj2, children, id){
    var scope = this;
    this.type = "event";
    this.name = "object_collision";
    this.id = setDefault(id, guid());
    this.element = obj1;
    this.other = obj2;
    this.children = setDefault(children, []);
    this.trigger = function(){
        this.element.addEventListener('collision', function( other_object, relative_velocity, relative_rotation, contact_normal ){
            if (other_object == scope.other && this == scope.element){
                triggerChildren(scope.children);
            }
        });
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}
block3D.event.onEdgeCollision = function(obj1, edge, walls, children, id){
    var scope = this;
    this.type = "event";
    this.name = "wall_collision";
    this.id = setDefault(id, guid());
    this.element = obj1;
    this.edge = edge;
    this.walls = walls;
    ;
    this.trigger = function(){
        if (this.edge.toLowerCase() in this.walls){
            this.walls[this.edge].addEventListener('collision', function( other_object, relative_velocity, relative_rotation, contact_normal ){
                if (other_object == scope.element){
                    triggerChildren(scope.children);
                }
            });
        } else{
            for (var i=0; i<4; i++){
                this.walls[i].addEventListener('collision', function( other_object, relative_velocity, relative_rotation, contact_normal ){
                    if (other_object == scope.element){
                        triggerChildren(scope.children);
                    }
                });
            }
        }
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}
//NOT SURE HOW THIS WILL WORK
block3D.event.onSpawn = function(obj, children, id){
    var scope = this;
    this.type = "event";
    this.name = "spawn";
    this.id = setDefault(id, guid());
    this.element = obj;
    this.children = setDefault(children, []);
    this.trigger = function(){
        //on game start trigger children
        triggerChildren(scope.children);
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}

block3D.event.gameOver = function(id){
    this.id = setDefault(id, guid());
    this.type = "event";
    this.name = "spawn";
    this.trigger = function(){
        alert('Game Over!');
    }
    this.reset = function(){
    }
}
/******************************************************************************\
|**********************************  MOTION  **********************************|
\******************************************************************************/
block3D.motion = function(){};
block3D.motion.velocity = function(element, x, y, z, id){
    var scope = this;
    this.type = "update";
    this.name = "velocity";
    this.id = setDefault(id, guid());
    this.element = element;
    this.value = new THREE.Vector3(x, y, z);
    this.trigger = function(){
        // var newVel = new THREE.Vector3(this.value.x, this.value.y, this.value.z);
        // newVel.add(this.element.getLinearVelocity());
        // console.log(newVel);
        this.element.setLinearVelocity(scope.value);
    }
    this.reset = function(){
        this.element.setLinearVelocity(new THREE.Vector3(0, 0, 0));
    }
}

block3D.motion.move = function(element, x, y, z, id){
    var scope = this;
    this.type = "update";
    this.name = "move";
    this.id = setDefault(id, guid());
    this.element = element;
    this.x = x;
    this.y = y;
    this.z = z;
    this.trigger = function(){
        var new_x = this.x !== 0 ? this.x : this.element.getLinearVelocity().x;
        var new_y = this.y !== 0 ? this.y : this.element.getLinearVelocity().y;
        var new_z = this.z !== 0 ? this.z : this.element.getLinearVelocity().z;
        var new_vel = new THREE.Vector3(new_x, new_y, new_z);
        // console.log(this.element);
        this.element.setLinearVelocity(new_vel);
    }
    this.reset = function(){
        this.element.setLinearVelocity(new THREE.Vector3(0, 0, 0));
    }
}

block3D.motion.push = function(element, x, y, z, id){
    var scope = this;
    this.type = "update";
    this.name = "move";
    this.id = setDefault(id, guid());
    this.element = element;
    this.force = new THREE.Vector3(x, y, z);
    this.trigger = function(){
        this.element.applyCentralImpulse(this.force);
    }
    this.reset = function(){
        this.element.setLinearVelocity(new THREE.Vector3(0, 0, 0));
    }
}

block3D.motion.position = function(element, x, y, z, id){
    this.type = "update";
    this.name = "position";
    this.id = setDefault(id, guid());
    this.element = element;
    this.oldPos = element.position.copy();
    this.value = new THREE.Vector3(x, y, z);
    this.trigger = function(){
        this.element.__dirtyPosition = true;
        this.element.position.set(new THREE.Vector3(this.x, this.y, this.z));
    }
    this.reset = function(){
        this.element.__dirtyPosition = true;
        this.element.position.set(this.oldPos);
    }
}
block3D.motion.rotation = function(element, x, y, z, id){
    this.type = "update";
    this.name = "rotation";
    this.id = setDefault(id, guid());
    this.element = element;
    this.oldRot = element.rotation.copy();
    this.value = new THREE.Vector3(x, y, z);
    this.trigger = function(){
        this.element.__dirtyRotation = true;
        this.element.rotation.set(new THREE.Vector3(this.x, this.y, this.z));
    }
    this.reset = function(){
        this.element.__dirtyRotation = true;
        this.element.rotation.set(this.oldRot);
    }
}
block3D.motion.spin = function(element, x, y, z, id){
    var scope = this;
    this.type = "update";
    this.name = "move";
    this.id = setDefault(id, guid());
    this.element = element;
    this.spin = new THREE.Vector3(x, y, z);
    // this.x = x;
    // this.y = y;
    // this.z = z;
    this.trigger = function(){
        // var new_x = this.x !== 0 ? this.x : this.element.getLinearVelocity().x;
        // var new_y = this.y !== 0 ? this.y : this.element.getLinearVelocity().y;
        // var new_z = this.z !== 0 ? this.z : this.element.getLinearVelocity().z;
        // var new_vel = new THREE.Vector3(new_x, new_y, new_z);
        // console.log(new_vel);
        this.element.setAngularVelocity(this.spin);
    }
    this.reset = function(){
        this.element.setAngularVelocity(new THREE.Vector3(0, 0, 0));
    }
}

/******************************************************************************\
|***********************************  LOOKS  **********************************|
\******************************************************************************/
block3D.looks = function(){};
block3D.looks.hide = function(element, id){
    this.type = "update";
    this.name = "hide"
    this.id = setDefault(id, guid());
    this.element = element;
    this.trigger = function(){
        this.element.visible = false;
    }
    this.reset = function(){
        this.element.visible = true;
    }
}
block3D.looks.show = function(element, id){
    this.type = "update";
    this.name = "show";
    this.id = setDefault(id, guid());
    this.element = element;
    this.trigger = function(){
        this.element.visible = true;
    }
    this.reset = function(){
        this.element.visible = true;
    }
}
block3D.looks.color = function(element, color, id){
    this.type = "update";
    this.name = "color";
    this.id = setDefault(id, guid());
    this.element = element;
    this.oldColor = this.element.material.color;
    this.color = color;
    this.trigger = function(){
        this.element.material.color = this.color;
    }
    this.reset = function(){
        this.element.material.color = this.oldColor;
    }
}
block3D.looks.clear = function(scene, element, children, id){
    var scope = this;
    this.type = "update";
    this.name = "clear";
    this.id = setDefault(id, guid());
    this.element = element;
    this.children = setDefault(children, []);
    this.trigger = function(){
        scene.remove(scope.element)
        triggerChildren(this.children);
    }
    this.reset = function(){
        scene.add(scope.element);
    }
}

/******************************************************************************\
|**********************************  CONTROL  *********************************|
\******************************************************************************/
block3D.control = function(){};

block3D.control.forever = function(children, id){
    var scope = this;
    this.type = "control";
    this.name = "forever";
    this.id = setDefault(id, guid());
    this.stop = false;
    this.children = setDefault(children, []);
    this.loop = null;
    this.trigger = function(){
        this.loop = setInterval(function(){
            triggerChildren(children);
            if (this.stop){
                clearInterval(loop);
            }
        }, 16)
    }
    this.reset = function(){
        resetChildren(this.children);
        clearInterval(loop);
    }
}
block3D.control.wait = function(delay, children, id){
    var scope = this;
    this.type = "control";
    this.name = "forever";
    this.id = setDefault(id, guid());
    this.delay = delay;
    this.children = setDefault(children, []);
    this.trigger = function(){
        setTimeout(function(){
            triggerChildren(children);
        }, delay)
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}

block3D.control.if = function(logic, children, id){
    this.type = "control";
    this.name = "if";
    this.id = setDefault(id, guid());
    this.children = setDefault(children, []);
    this.trigger = function(){
        if (logic.trigger()){
            triggerChildren(children);
        }
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}

block3D.control.forEach = function(variable, iterable, children, id){
    this.type = "control";
    this.name = "if";
    this.id = setDefault(id, guid());
    this.var = variable;
    this.iterable = iterable;
    this.children = setDefault(children, []);
    this.trigger = function(){
        for (this.var in this.iterable){
            triggerChildren(children);
        }
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}

block3D.control.for = function(variable, low, high, step, children, id){
    this.type = "control";
    this.name = "if";
    this.id = setDefault(id, guid());
    this.var = variable;
    this.low = low;
    this.high = high;
    this.step = step;
    this.children = setDefault(children, []);
    this.trigger = function(){
        for (this.var = this.low; this.var <= this.high; this.var += step ){
            triggerChildren(children);
        }
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}

/******************************************************************************\
|***********************************  LOGIC  **********************************|
\******************************************************************************/
block3D.logic = function(){};
block3D.logic.equal = function(left, right, id){
    this.type = "bool";
    this.name = "equal"
    this.id = setDefault(id, guid());
    this.left = left;
    this.right = right;
    this.trigger = function(){
        return this.left = this.right;
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}
block3D.logic.less = function(left, right, id){
    this.type = "bool";
    this.name = "less"
    this.id = setDefault(id, guid());
    this.left = left;
    this.right = right;
    this.trigger = function(){
        return this.left < this.right;
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}
block3D.logic.greater = function(left, right, id){
    this.type = "bool";
    this.name = "greater"
    this.id = setDefault(id, guid());
    this.left = left;
    this.right = right;
    this.trigger = function(){
        return this.left > this.right;
    }
}
block3D.logic.and = function(left, right, id){
    this.type = "bool";
    this.name = "and"
    this.id = setDefault(id, guid());
    this.left = left;
    this.right = right;
    this.trigger = function(){
        return this.left && this.right;
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}
block3D.logic.or = function(left, right, id){
    this.type = "bool";
    this.name = "or"
    this.id = setDefault(id, guid());
    this.left = left;
    this.right = right;
    this.trigger = function(){
        return this.left || this.right;
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}
block3D.logic.not = function(bool, id){
    this.type = "bool";
    this.name = "greater"
    this.id = setDefault(id, guid());
    this.bool = bool;
    this.trigger = function(){
        return !bool;
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}
block3D.logic.bool = function(bool, id){
    this.type = "bool";
    this.name = "bool"
    this.id = setDefault(id, guid());
    this.bool = bool;
    this.trigger = function(){
        return bool;
    }
    this.reset = function(){
        resetChildren(this.children);
    }
}

/******************************************************************************\
|**********************************  Input  ***********************************|
\******************************************************************************/
block3D.input = function(){};
block3D.input.onDown = function(key, children, id){
    var scope = this;
    this.type = "event";
    this.name = "onPress";
    this.id = setDefault(id, guid());
    this.key = keycodes[key];
    this.down = false;
    this.children = setDefault(children, []);
    this.trigger = function(){
        document.addEventListener('keydown', onDownDown);
        document.addEventListener('keyup', onDownUp);
    }
    this.reset = function(){
        resetChildren(this.children);
        document.removeEventListener('keydown', onDownDown);
        document.removeEventListener('keyup', scope.onDownUp);
    }

    function onDownDown(event){
        if (event.keyCode == scope.key && !scope.down){
            scope.down = true;
            // console.log("key: ", key, scope.key);
            triggerChildren(scope.children);
        }
    }
    function onDownUp(event){
        if (event.keyCode == scope.key){
            scope.down = false;
        }
    }
}

block3D.input.whileDown = function(key, children, id){
    var scope = this;
    this.type = "event";
    this.name = "whileDown";
    this.id = setDefault(id, guid());
    this.key = keycodes[key];
    this.down = false;
    this.interval = null;
    this.children = setDefault(children, []);
    this.trigger = function(){
        // document.onkeydown = whileDownDown;
        // document.onkeyup = whileDownUp;
        document.addEventListener('keydown', scope.whileDownDown);
        document.addEventListener('keyup', scope.whileDownUp);
    }
    this.reset = function(){
        resetChildren(this.children);
        clearInterval(scope.interval);
        scope.interval = null;
        document.removeEventListener('keydown', scope.whileDownDown);
        document.removeEventListener('keyup', scope.whileDownUp);
    }

    this.whileDownDown = function(event){
        // console.log(scope.id);
        // console.log(scope.key);
        if (event.keyCode == scope.key && !scope.interval && !scope.down){
            scope.down = true;
            // console.log("key: ", key, scope.key);
            scope.interval = setInterval(function(){
                triggerChildren(scope.children);
            }, 16);
        }
    }

    this.whileDownUp = function(event){
        if (event.keyCode == scope.key){
            scope.down = false;
            clearInterval(scope.interval);
            resetChildren(scope.children);
            scope.interval = null;
        }
    }
}

block3D.input.isPressed = function(key, children, id){
    var scope = this;
    this.type = "bool";
    this.name = "onPress";
    this.id = setDefault(id, guid());
    this.key = keycodes[key];
    this.down = false;
    this.setup = false;
    this.children = setDefault(children, []);
    this.trigger = function(){
        if (!setup){
            document.addEventListener('keydown', isPressedDown);
            document.addEventListener('keyup', isPressedUp);
            this.setup = true;
        }
        return this.down;
    };
    this.reset = function(){
        resetChildren(this.children);
        this.down = false;
        this.setup = false;
        document.removeEventListener('keydown', isPressedDown);
        document.removeEventListener('keyup', isPressedUp);
    };

    function isPressedDown(event){
        if (event.keyCode == scope.key){
            scope.down = true;
        }
    };

    function isPressedUp(event){
        if (event.keyCode == scope.key){
            scope.down = false;
        }
    };
}

/******************************************************************************\
|**********************************  HELPERS  *********************************|
\******************************************************************************/
function triggerChildren(children){
    for (var i=0; i<children.length; i++){
        children[i].trigger();
    }
}
function resetChildren(children){
    for (var i=children.length-1; i>=0; i--){
        children[i].reset();
    }
}

function removeFromArray(element, array){
    var index = array.indexOf(element);
    if (index > -1){
        array.splice(index, 1);
    }
}

function setDefault(inp, val){
    inp = typeof inp !== 'undefined' ? inp : val;
    return inp;
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

var keycodes = {
    a: 65,
    b: 66,
    c: 67,
    d: 68,
    e: 69,
    f: 70,
    g: 71,
    h: 72,
    i: 73,
    j: 74,
    k: 75,
    l: 76,
    m: 77,
    n: 78,
    o: 79,
    p: 80,
    q: 81,
    r: 82,
    s: 83,
    t: 84,
    u: 85,
    v: 86,
    w: 87,
    x: 88,
    y: 89,
    z: 90,
    0: 48,
    1: 49,
    2: 50,
    3: 51,
    4: 52,
    5: 53,
    6: 54,
    7: 55,
    8: 56,
    9: 57,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    space: 32,
    enter: 13
}
