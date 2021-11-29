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

var startingPos = { x: 0, y: 0 };

var _localTiles = {};

let lookingAtTile = { x: 0, y: 0 }

let pointingAtTile = {x: 0,y: 0}

let globalPosition = { x: 0, y: 0 }

let relOffset = { x: 0, z: 0 }

let innerTileOffset = { x: 5, y: 5 }

let mouseOnGround = {x:0,z:0}

let listeningFor = [];

// GUN STUFF 
var gunTiles = gun.get('tiles')

function lookedAtNewTile(pos) {
    if (this.pTile && Math.round(this.pTile.x) == Math.round(pos.x) && Math.round(this.pTile.y) == Math.round(pos.y)) {
        return;
    }

    loadTilesRadius(globalPosition.x, globalPosition.y, 2);

    history.pushState(null, null, '#' + parseInt(globalPosition.x) + "," + parseInt(globalPosition.y));

    this.pTile = pos;
}

function setTile(x, y, type) {
    gunTiles.get(x + ',' + y).put(type);
    tileView(x, y);
}

function loadTilesRadius(x, y, radius) {
    x = Math.round(x), y = Math.round(y);
    tileView(x, y);
    x = Math.round(x);
    y = Math.round(y);

    var i = 0; while (i++ < radius) {
        tileView(x + i, y);
        tileView(x - i, y);

        tileView(x, y + i);
        tileView(x, y - i);

        tileView(x + i, y + i);
        tileView(x - i, y - i);

        tileView(x - i, y + i);
        tileView(x + i, y - i);
    }
}

//ask and recieve updates from network
function tileView(x, y) {
    if(listeningFor.includes(x+","+y))return;
    listeningFor.push(x+","+y);

    gunTiles.get(x + ',' + y).on((data) => {
        console.log("recieved",x,y,data);
        console.log("listening To ", listeningFor)
    });
}

// this is getting called 60fpsx64 times a second! gun.get can work here?
function getTile(x, y) {
    if (!gun._.graph.tiles) return;
    return gun._.graph.tiles[x + "," + y];
}

window.addEventListener('hashchange', getCoordsFromHash, false);
function getCoordsFromHash() {
    if (location.hash) {
        let pos = location.hash.split("#")[1].split(",");
        goToCoord({ x: parseInt(pos[0]), y: parseInt(pos[1]) });
    }
}

function goToCoord({ x, y }) {
    startingPos = { x, y }
    relOffset = { x: 0, z: 0 };

    if (controls) controls.target.x = 0
    if (camera) camera.position.x = 41.56269377774534
    if (controls) controls.target.z = 0
    if (camera) camera.position.z = 41.562693777745345
}

getCoordsFromHash();

function mktxtspr(message, fontsize,color) {
    var ctx, texture, sprite, spriteMaterial,
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
    ctx.font = fontsize + "px Arial";

    // setting canvas width/height before ctx draw, else canvas is empty
    canvas.width = ctx.measureText(message).width;
    canvas.height = fontsize * 2; // fontsize * 1.5

    // after setting the canvas width/height we have to re-set font to apply!?! looks like ctx reset
    ctx.font = fontsize + "px Arial";
    ctx.fillStyle = color;
    ctx.fillText(message, 0, fontsize);

    texture = new THREE.Texture(canvas);
    texture.minFilter = THREE.LinearFilter; // NearestFilter;
    texture.needsUpdate = true;

    spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    sprite = new THREE.Sprite(spriteMaterial);
    return sprite;
}

var loaded = {};


class Tile{
    constructor(localx, localz) {
        this.localx = localx;
        this.localz = localz;
        this.currentTextColor = "rgb(255,0,0)"
    }
    getGlobalTilePosition() {
        let rendoffx = (this.localx - lookingAtTile.x);
        let rendoffy = (this.localz - lookingAtTile.y);
        return { x: globalPosition.x + rendoffx, y: globalPosition.y + rendoffy }
    }
    updateText(text,textcolor){
        if(text == this.text && textcolor == this.textcolor)return;
        if(this.spi)scene.remove(this.spi);
        let spi = mktxtspr(text,600,textcolor);
        spi.position.set((this.localx-5)*60,10,(this.localz-5)*60);
        spi.scale.set(15,15,15)
        scene.add(spi);
        this.spi = spi;
        this.text = text;
        this.textcolor = textcolor;
    }
    loadTile(tileType) {
       // if(!tileType)tileType="park";
        if (tileType === this.tileType) { return }
        if (this.gtlfScene) { scene.remove(this.gtlfScene) }
        this.tileType = tileType;
        if (tileType) {
            var url = `js/clusters/${tileType}.glb`;
            loader.load(url, 
            (gltf) => {
                loaded[url] = gltf;
                if (this.gtlfScene) scene.remove(this.gtlfScene)
                this.gtlfScene = gltf.scene;
                this.gtlfScene.traverse(function (child) {

                    if (child.isMesh) {
                        child.receiveShadow = true
                        child.castShadow = true
                    }

                    child.userData.tile = this;
                })
                this.gtlfScene.position.set((this.localx - 5) * 60, 0, (this.localz - 5) * 60)
               scene.add(this.gtlfScene)
            });
        }
    }
   
    render() {
    
        if(this.localx==pointingAtTile.x && this.localz==pointingAtTile.y){
            this.currentTextColor="rgb(0,0,255)"
        }else{
            this.currentTextColor="rgb(255,0,0)"
        }
       
        let globalTilePosition = this.getGlobalTilePosition();
        var tileType = getTile(globalTilePosition.x, globalTilePosition.y);
        
        this.updateText(globalTilePosition.x+","+globalTilePosition.y,this.currentTextColor);
        this.loadTile(tileType);
    }
}

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
    window.addEventListener('dblclick', onMouseDblclick, false)
    window.addEventListener('mousemove', onMouseMove, false)
    window.addEventListener('touchmove', onMouseMove, false)
    //window.addEventListener('touchstart', onMouseDown, false)
    //window.addEventListener('touchend', onMouseUp, false)

    //8x8 road grid
    loader.load(`js/clusters/road.glb`, (gltf) => {
        gltf.scene.position.set(60, 0, 0)
        this.road = gltf.scene;
        scene.add(this.road);
    })

    for (let z = 0; z < 8; z++) {
        for (let x = 0; x < 8; x++) {
            _localTiles[x+","+z]=new Tile(x, z);
        }
    }

    loadCars({ x: 1, z: 0, cluster: 'cars' })
    loadTilesRadius(globalPosition.x, globalPosition.y, 1);
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


    raycaster.setFromCamera(mouse, camera);
    if (this.road) {
        var intersects = raycaster.intersectObject(this.road,true);
        if (intersects.length > 0) {
            const posX = intersects[0].point.x;
            const posZ = intersects[0].point.z;
            mouseOnGround = {x:posX, z:posZ};
        }
    }
}



function onMouseDblclick(event) {
    let curtil = this._localTiles[pointingAtTile.x+","+pointingAtTile.y];
    let tileToSet = curtil.getGlobalTilePosition();
    setTile(tileToSet.x,tileToSet.y,clusterNames[Math.floor(Math.random()*16)]);
}


function animate() {
    requestAnimationFrame(animate)
    render()
}

function goTo(x, y) {
    this.globalPosition = { x, y }
}

function render() {
 
    stats.begin()
    controls.update()

    let rx = 1 - ((130 - (camera.position.x - 60)) / 420)
    let rz = 1 - ((130 - (camera.position.z - 60)) / 420)

    lookingAtTile = { x: Math.round(rx * 8), y: Math.round(rz * 8) };

    rx = 1 - ((130 - (mouseOnGround.x - 60)) / 420)
    rz = 1 - ((130 - (mouseOnGround.z - 60)) / 420)

    pointingAtTile = { x: Math.ceil(rx * 8), y: Math.ceil(rz * 8) };

    globalPosition = { x: startingPos.x + relOffset.x + (lookingAtTile.x - innerTileOffset.x), y: startingPos.y + relOffset.z + (lookingAtTile.y - innerTileOffset.y) }

    let resetOffset = 80;

    if (camera.position.x > resetOffset * 2) {

        controls.target.x -= LEAP
        camera.position.x -= LEAP
        carList.forEach((car) => (car.position.x -= LEAP))
        relOffset.x += 4;
        console.log("WRAPPED")

    } else if (camera.position.x < -resetOffset * 2) {
        controls.target.x += LEAP
        camera.position.x += LEAP
        carList.forEach((car) => (car.position.x += LEAP))
        relOffset.x -= 4;
        console.log("WRAPPED")

    }
    if (camera.position.z > resetOffset * 2) {
        controls.target.z -= LEAP
        camera.position.z -= LEAP
        carList.forEach((car) => (car.position.z -= LEAP))
        relOffset.z += 4;
        console.log("WRAPPED")

    } else if (camera.position.z < -resetOffset * 2) {
        controls.target.z += LEAP
        camera.position.z += LEAP
        carList.forEach((car) => (car.position.z += LEAP))
        relOffset.z -= 4;
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

    Object.values(_localTiles).forEach((lc) => lc.render());

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
