var block3D = function(){};

/******************************************************************************\
|**********************************  EVENTS  **********************************|
\******************************************************************************/
block3D.event = function(){};
block3D.event.onGameStart = function(children){
    this.type = "event";
    this.name = "rotation";
    this.children = children;
    this.trigger = function(){
        //on game start trigger children
        triggerChildren(this.children);
    }
}
block3D.event.onCollision = function(obj1, obj2, children){
    this.type = "event";
    this.name = "object_collision";
    this.element = obj1;
    this.other = obj2;
    this.children = children;
    this.trigger = function(){
        this.element.addEventListener('collision', function( other_object, relative_velocity, relative_rotation, contact_normal ){
            if (other_object == this.other){
                triggerChildren(this.children);
            }
        });
    }
}
block3D.event.onEdgeCollision = function(obj1, edge, walls, children){
    this.type = "event";
    this.name = "wall_collision";
    this.element = obj1;
    this.edge = edge;
    this.walls = walls;
    this.children = children;
    this.trigger = function(){
        if (this.edge.toLowerCase() in this.walls){
            this.walls[this.edge].addEventListener('collision', function( other_object, relative_velocity, relative_rotation, contact_normal ){
                if (other_object == this.element){
                    triggerChildren(this.children);
                }
            });
        } else{
            for (var i=0; i<4; i++){
                this.walls[i].addEventListener('collision', function( other_object, relative_velocity, relative_rotation, contact_normal ){
                    if (other_object == this.element){
                        triggerChildren(this.children);
                    }
                });
            }
        }
    }
}
block3D.event.onSpawn = function(obj, children){
    this.type = "event";
    this.name = "spawn";
    this.element = obj;
    this.children = children;
    this.trigger = function(){
        //on game start trigger children
        triggerChildren(this.children);
    }
}
/******************************************************************************\
|**********************************  MOTION  **********************************|
\******************************************************************************/
block3D.motion = function(){};
block3D.motion.velocity = function(element, x, y, z){
    this.type = "motion";
    this.name = "velocity";
    this.element = element;
    this.value = new THREE.Vector3(x, y, z);
    this.trigger = function(){
        this.element.setLinearVelocity(new THREE.Vector3(this.x, this.y, this.z));
    }
}
block3D.motion.position = function(element, x, y, z){
    this.type = "motion";
    this.name = "position";
    this.element = element;
    this.value = new THREE.Vector3(x, y, z);
    this.trigger = function(){
        this.element.__dirtyPosition = true;
        this.element.position.set(new THREE.Vector3(this.x, this.y, this.z));
    }
}
block3D.motion.rotation = function(element, x, y, z){
    this.type = "motion";
    this.name = "rotation";
    this.element = element;
    this.value = new THREE.Vector3(x, y, z);
    this.trigger = function(){
        this.element.__dirtyRotation = true;
        this.element.rotation.set(new THREE.Vector3(this.x, this.y, this.z));
    }
}

/******************************************************************************\
|***********************************  LOOKS  **********************************|
\******************************************************************************/
block3D.looks.hide = function(element){
    this.type = "looks";
    this.name = "hide"
    this.element = element;
    this.trigger = function(){
        this.element.visible = false;
    }
}
block3D.looks.show = function(element){
    this.type = "looks";
    this.name = "show"
    this.element = element;
    this.trigger = function(){
        this.element.visible = true;
    }
}
block3D.looks.color = function(element, color){
    this.type = "looks";
    this.name = "color"
    this.element = element;
    this.trigger = function(){
        this.element.material.color = color;
    }
}
block3D.looks.clear = function(scene, element){
    this.type = "looks";
    this.name = "clear"
    this.element = element;
    this.trigger = function(){
        scene.remove(this.element)
    }
}

/******************************************************************************\
|**********************************  CONTROL  *********************************|
\******************************************************************************/
block3D.control.forever = function(children){
    this.type = "control";
    this.name = "forever"
    this.children = children;
    this.trigger = function(){
        setTimeout(function(){
            triggerChildren(children);
        }, 16)
    }
}
block3D.control.forever = function(children){
    this.type = "control";
    this.name = "forever";
    this.stop = false;
    this.children = children;
    this.trigger = function(){
        var loop = setInterval(function(){
            triggerChildren(children);
            if (this.stop){
                clearInterval(loop);
            }
        }, 16)
    }
}
block3D.control.wait = function(delay, children){
    this.type = "control";
    this.name = "forever";
    this.delay = delay;
    this.children = children;
    this.trigger = function(){
        setTimeout(function(){
            triggerChildren(children);
        }, delay)
    }
}

block3D.control.if = function(logic, children){
    this.type = "control";
    this.name = "if";
    this.children = children;
    this.trigger = function(){
        if (logic.trigger()){
            triggerChildren(children);
        }
    }
}

block3D.control.forEach = function(variable, iterable, children){
    this.type = "control";
    this.name = "if";
    this.var = variable;
    this.iterable = iterable;
    this.children = children;
    this.trigger = function(){
        for (this.var in this.iterable){
            triggerChildren(children);
        }
    }
}

block3D.control.for = function(variable, low, high, step, children){
    this.type = "control";
    this.name = "if";
    this.var = variable;
    this.low = low;
    this.high = high;
    this.step = step;
    this.children = children;
    this.trigger = function(){
        for (this.var = this.low; this.var <= this.high, this.var += step ){
            triggerChildren(children);
        }
    }
}

/******************************************************************************\
|***********************************  LOGIC  **********************************|
\******************************************************************************/
block3D.logic.equal = function(left, right){
    this.type = "logic";
    this.name = "equal"
    this.left = left;
    this.right = right;
    this.trigger = function(){
        return this.left = this.right;
    }
}
block3D.logic.less = function(left, right){
    this.type = "logic";
    this.name = "less"
    this.left = left;
    this.right = right;
    this.trigger = function(){
        return this.left < this.right;
    }
}
block3D.logic.greater = function(left, right){
    this.type = "logic";
    this.name = "greater"
    this.left = left;
    this.right = right;
    this.trigger = function(){
        return this.left > this.right;
    }
}
block3D.logic.and = function(left, right){
    this.type = "logic";
    this.name = "and"
    this.left = left;
    this.right = right;
    this.trigger = function(){
        return this.left && this.right;
    }
}
block3D.logic.or = function(left, right){
    this.type = "logic";
    this.name = "or"
    this.left = left;
    this.right = right;
    this.trigger = function(){
        return this.left || this.right;
    }
}
block3D.logic.not = function(bool){
    this.type = "logic";
    this.name = "greater"
    this.bool = bool;
    this.trigger = function(){
        return !bool;
    }
}
block3D.logic.bool = function(bool){
    this.type = "logic";
    this.name = "bool"
    this.bool = bool;
    this.trigger = function(){
        return bool;
    }
}

/******************************************************************************\
|**********************************  HELPERS  *********************************|
\******************************************************************************/
function triggerChildren(children){
    for (var i=0; i<children.length; i++){
        children[i].trigger();
    }
}
