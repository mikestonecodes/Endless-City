THREE.Cache.enabled = true;

const NORTH = 1,
    EAST = -0.5,
    SOUTH = 2,
    WEST = 0.5,
    LEAP = 240

var camera,
    scene,
    controls,
    renderer,
    stats,
    loader,
    light,
    mouse = new THREE.Vector2(),
    raycaster = new THREE.Raycaster(),
    carList = [],
    manager = new THREE.LoadingManager(),
    loader = new THREE.GLTFLoader(manager),
    gun = GUN('https://stonegun.herokuapp.com/gun');

var clusterNames = [
    'factory',
    'house2',
    'shoparea',
    'house',
    'apartments',
    'shops',
    'fastfood',
    'house3',
    'stadium',
    'gas',
    'supermarket',
    'coffeeshop',
    'residence',
    'bus',
    'park',
    'supermarket',
]
var tiles = [];
var startingPos =  {x:0,y:0};


// GUN STUFF 
var gunTiles = gun.get('tiles');

function lookedAtNewTile(pos){
    if(this.pTile && Math.round(this.pTile.x)== Math.round(pos.x) && Math.round(this.pTile.y) == Math.round(pos.y)){
        return;
    }
    //console.log("looked at new Tile!","global",globalPosition,"local",lookingAtTile)
    //if(window.tileView){ tileView(globalPosition.x, globalPosition.y) } // Mark's function, comment this on/off to enable his code.
    loadTilesRadius(globalPosition.x, globalPosition.y, 2);
    
    history.pushState(null,null,'#'+parseInt(globalPosition.x)+","+parseInt(globalPosition.y));

    // POLLING FOR TILES?
    //gunTiles.get(x).get(y).once(tile=>{}) ?
    
    this.pTile = pos;
}

function setTile(x,y,type){
    console.log("set", x+','+y, type);
    gunTiles.get(x+','+y).put(type);
    tileView(x,y);
}

function loadTilesRadius(x,y,radius){
    tileView(x, y);
    x = Math.round(x);
    y = Math.round(y);

    var i = 0; while(i++ < radius){ 
        tileView(x+i, y);
        tileView(x-i, y);

        tileView(x, y+i);
        tileView(x, y-i);

        tileView(x+i, y+i);
        tileView(x-i, y-i);

        tileView(x-i, y+i);
        tileView(x+i, y-i);
    }
}

function tileView(x,y){
    x = Math.round(x), y = Math.round(y);
    //console.log("try to load", x,y);
    var meta = gunTiles.get(x+','+y);
    if(meta.watch){ return }
    meta.watch = true;
    meta.x = meta.x;
    meta.y = meta.y;
    meta.on(function(data){
        console.log("see", x,y, data);
        meta.type = data
        if(!meta.tile){ return }
        meta.tile.render();
    });
}

function getTile(x,y){
    //if(!tiles[x])return null;
    //return tiles[x][y];
    var meta = gunTiles.get(x+','+y);
    return meta;
}



var _localTiles = [];

var lclpos= [0,0]

let lookingAtTile = {x:0,y:0}

let globalPosition = {x:0,y:0}

let relOffset = {x:0,z:0}

let innerTileOffset = {x:5,y:5};

let localPos = {x:0,y:0};

function getCoordsFromHash(){
    if(location.hash){
        let pos = location.hash.split("#")[1].split(",");
        goToCoord({x:parseInt(pos[0]),y:parseInt(pos[1])});
    }
}

function goToCoord({x,y}){
    startingPos=  {x,y}
    relOffset = {x:0,z:0};

    if(controls)controls.target.x = 0
    if(camera)camera.position.x = 41.56269377774534
    if(controls)controls.target.z = 0
    if(camera)camera.position.z = 41.562693777745345
}

getCoordsFromHash();

window.addEventListener('hashchange', getCoordsFromHash, false);

loadTilesRadius(lookingAtTile.x, lookingAtTile.y, 1);

var loaded = {};
var thats = new Map;

class Tile {
     constructor(x,z,cluster){   
         this.x = x;
         this.z = z;
       
     }

     loadCluster(cluster) {
        /*if(!cluster){ cluster = 'park' }
        if(! cluster&& this.gtlfScene) {
            scene.remove(this.gtlfScene )
        }
        if(cluster == this.cluster)return;
        var that = this;
        this.cluster = cluster;*/

        if(!cluster){ cluster = 'park' }
        if(cluster === this.cluster){ return }
        //if(this.gtlfScene){ scene.remove(this.gtlfScene)}
        this.cluster = cluster;
        var that = this;
        thats.set(that.lot.x+',')

        if(cluster){
            
        //console.log("load", cluster, this);
        var url = `js/clusters/${cluster}.glb`, tmp;

        /*if(tmp = loaded[url]){
            load(tmp)
        } else {
            loader.load(url,load);
        }*/
        load(tmp);

        function load(gltf){
            loaded[url] = gltf;
           if(that.gtlfScene )scene.remove(that.gtlfScene )
           that.gtlfScene = gltf.scene; 
           that.gtlfScene.traverse(function (child) {

                if (child.isMesh) { 
                    child.receiveShadow = true
                    child.castShadow = true
                }
              
                child.userData.tile = that;
            })
           
            that.gtlfScene.position.set((that.x-5) * 60, 0, (that.z-5) * 60)  
            scene.add(that.gtlfScene )
        }
    }
    }
    getGlobalPosition(){
        let rendoffx = (this.x-lookingAtTile.x ) % 4;
        let rendoffy= (this.z-lookingAtTile.y)  % 4;
        
        if(rendoffx < 0){
         rendoffx = rendoffx % -4
        }
        if(rendoffy < 0){
         rendoffy = rendoffy % -4
        }
        return {x:globalPosition.x+rendoffx,y:globalPosition.y+rendoffy}
    }
    render(){
       

        this.lot = this.lot || this.getGlobalPosition();
        var lot = this.lot;
        var meta = getTile(lot.x, lot.y);
        meta.tile = this;

        this.loadCluster(meta.type);

    }
}
  // Load map

initCity()
animate()




function initCity() {
    // Statistics settings
    stats = new Stats()

    document.body.appendChild(stats.dom)

   
    // Scene settings
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    scene.fog = new THREE.Fog(new THREE.Color(0x000000), 200, 300)

    // Camera settings
    camera = new THREE.PerspectiveCamera(
        40,
        window.innerWidth / window.innerHeight,
        50,
        200
    )
    camera.position.set(0, 100, 0)
    controls = new THREE.MapControls(camera)

    // Lights
    light = new THREE.DirectionalLight(0x9a9a9a, 1)
    light.position.set(-300, 750, -300)
    light.castShadow = true
    light.shadow.mapSize.width = light.shadow.mapSize.height = 4096
    light.shadow.camera.near = 1
    light.shadow.camera.far = 1000
    light.shadow.camera.left = light.shadow.camera.bottom = -200
    light.shadow.camera.right = light.shadow.camera.top = 200
    scene.add(light)
    scene.add(new THREE.HemisphereLight(0xefefef, 0xffffff, 1))

    // Renderer settings
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('canvas'),
        antialias: true,
    })
    renderer.shadowMap.enabled = true
    renderer.gammaInput = renderer.gammaOutput = true
    renderer.gammaFactor = 2.0
    renderer.setSize(window.innerWidth, window.innerHeight)

    //Events
    window.addEventListener('resize', onResize, false)
    window.addEventListener('mousemove', onMouseMove, false)
    window.addEventListener('mousedown', onMouseDown, false)
    window.addEventListener('mouseup', onMouseUp, false)
    window.addEventListener('touchmove', onMouseMove, false)
    window.addEventListener('touchstart', onMouseDown, false)
    window.addEventListener('touchend', onMouseUp, false)

  

    //8x8 road grid
    loader.load(`js/clusters/road.glb`, (gltf) => {
        gltf.scene.position.set(60, 0, 0)  
        scene.add(gltf.scene)
    })
    
    for (let z = 0; z < 8; z++) {
        for (let x = 0; x < 8; x++) {
         
            _localTiles.push(new Tile(x,z));
        }
    }
    

   // if (screen.width > 768) {
        loadCars({ x: 1, z: 0, cluster: 'cars' })
    //}
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

function onMouseMove(event) {

    event.preventDefault()
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.lookedAtNewTile(lookingAtTile);
    //gun.get(data.X).get(data.Y).once(plant => { mikeGameLogic.addPlant(plant).onTile(data.X, data.Y) }) }
}

function onMouseDown(event){
    onMouseDown.when = +new Date;
}
function onMouseUp(event){
    onMouseUp.when = +new Date;
    if(onMouseUp.when - onMouseDown.when < 99){
        onTileClick(event);
    }
}

function onTileClick(event) {
    event.preventDefault()
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObject(scene, true);
    if (intersects.length > 0) {
        var object = intersects[0].object;
        var tile = object.userData.tile
        if(tile){
       
            let tileGlobalPosition = tile.getGlobalPosition();

            var i = ((onTileClick.i + 1) % clusterNames.length);
            onTileClick.i = i;
            var type = this.clusterNames[i]

            //console.log("click", onTileClick.i);
            setTile(tileGlobalPosition.x,tileGlobalPosition.y,type);
        }
     //  object.material.color.set( Math.random() * 0xffffff );
    }
}
onTileClick.i = 0;

function animate() {
    requestAnimationFrame(animate)
    render()
}

function goTo(x,y){
    this.globalPosition = {x,y}    
}

function render() {

    previousLookingAtTile = lookingAtTile;

    stats.begin()
    controls.update()
   
    let rx = 1-((130 - (camera.position.x - 60 ) )/ 420 )
    let rz = 1-((130 - (camera.position.z -60  ) )/ 420 ) 
   
    lookingAtTile = {x:(rx*8)  , y:(rz*8)};
     
  
     globalPosition = {x:startingPos.x +relOffset.x + (lookingAtTile.x-innerTileOffset.x)  ,y:startingPos.y +relOffset.z + (lookingAtTile.y-innerTileOffset.y)}
  
    let resetOffset= 80;

   

   if (camera.position.x > resetOffset*2) {
      
        controls.target.x -= LEAP
        camera.position.x -= LEAP
        carList.forEach((car) => (car.position.x -= LEAP))
       relOffset.x +=4;
      console.log("WRAPPED")
       
    } else if (camera.position.x < -resetOffset*2) {
        controls.target.x += LEAP
        camera.position.x += LEAP
        carList.forEach((car) => (car.position.x += LEAP))
     relOffset.x -=4;
     console.log("WRAPPED")
     
    }
    if (camera.position.z > resetOffset*2) {
        controls.target.z -= LEAP
        camera.position.z -= LEAP
        carList.forEach((car) => (car.position.z -= LEAP))
        relOffset.z +=4;
        console.log("WRAPPED")
      
    } else if (camera.position.z < -resetOffset*2) {
        controls.target.z += LEAP
        camera.position.z += LEAP
        carList.forEach((car) => (car.position.z += LEAP))
       relOffset.z -=4;
       console.log("WRAPPED")
    
    }
   

    carList.forEach((car) => {
        car.r.set(
            new THREE.Vector3(car.position.x + 58, 1, car.position.z),
            new THREE.Vector3(car.userData.x, 0, car.userData.z)
        )
        let _NT = car.r.intersectObjects(carList, true)
        if (_NT.length > 0) {
            car.speed = 0
            return
        } else {
            car.speed = car.speed < car.maxSpeed ? car.speed + 0.002 : car.speed

            if (car.position.x < -380) car.position.x += LEAP * 2
            else if (car.position.x > 100) car.position.x -= LEAP * 2
            if (car.position.z < -320) car.position.x += LEAP * 2
            else if (car.position.z > 160) car.position.x -= LEAP * 2

            car.position.x += car.userData.x * car.speed
            car.position.z += car.userData.z * car.speed
        }
    })
    
    _localTiles.forEach((lc)=>lc.render());

    stats.end()
    renderer.render(scene, camera)
}



function loadCars({ x, z, cluster, direction }) {
    loader.load(`js/clusters/${cluster}.gltf`, (gltf) => {
        gltf.scene.traverse(function (child) {
            if (child.isMesh) { 
                child.receiveShadow = true
                child.castShadow = true
            }
        })

        gltf.scene.position.set(x * 60, 0, z * 60)

        if (direction) gltf.scene.rotation.y = Math.PI * direction
        else if (direction === EAST) gltf.scene.position.x += 20
        else if (direction === WEST) gltf.scene.position.z += 20
        else if (direction === NORTH)
            gltf.scene.position.set(
                gltf.scene.position.x + 20,
                0,
                ogltfbj.scene.position.z + 20
            )

        scene.add(gltf.scene)

        gltf.scene.children.forEach((e) => {
            e.distance = 0
            e.maxSpeed = 0.3
            e.speed = e.maxSpeed
            e.r = new THREE.Raycaster(
                new THREE.Vector3(e.position.x, 2, e.position.z),
                new THREE.Vector3(e.userData.x, 0, e.userData.z),
                5,
                15
            )
            carList.push(e)
        })
    })
}
