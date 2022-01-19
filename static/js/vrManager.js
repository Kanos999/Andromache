var app = angular.module("vrPage", ['socket-io']);

app.controller("vrController", ["$scope", "$http", "$window", "socket", function($scope, $http, $window, socket) {

	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		return;
	}
	else {
		//window.location.href = "/terminal";
	}
	var ambientAudio = new Audio('textures/patterns/ambience.mp3');
	var explosionAudio = new Audio('textures/patterns/explosion1.mp3');
	var timerAudio = new Audio('textures/patterns/timer1.wav');

	$("#shipNameInput").focus();
	var currentTeam;
	//$("#wholePageSpread").slideUp(200);
	$scope.enterSimulation = function() {

		ambientAudio.play();
		explosionAudio.play();
		timerAudio.play();

		socket.emit("enterVR", {
			group: $scope.shipNameInput,
		});
		socket.on("success", function(success) {
			if(success) {
				$("#wholePageSpread").slideUp(200);
				currentTeam = $scope.shipNameInput;
			}
			else alert("You might want to check your spelling");
		});
	};

	var camera, scene, renderer;
	var effect, controls;
	var element, container;
	var asteroids = [];
	var intersects, crosshair, lookingAt = false;
	var playAudio = true;

	//////////////settings/////////
	var movementSpeed = 1;
	var totalObjects = 100;
	var objectSize = 0.6;
	var sizeRandomness = 400;
	/////////////////////////////////
	var dirs = [];
	var parts = [];

	var room;

	var clock = new THREE.Clock();

	init();
	animate();

	function init() {

		ambientAudio.play();

		renderer = new THREE.WebGLRenderer({antialias: true});
		element = renderer.domElement;
		container = document.getElementById('container');
		container.appendChild(element);

		effect = new THREE.StereoEffect(renderer);

		scene = new THREE.Scene();
		//scene.fog = new THREE.FogExp2(0x222222, 0.03);

		camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.01, 1000);
		camera.position.set(0, 10, 0);
		scene.add(camera);

		controls = new THREE.OrbitControls(camera, element);
		// controls.rotateUp(Math.PI / 4);
		controls.target.set(
			camera.position.x + 0.1,
			camera.position.y,
			camera.position.z
		);
		controls.enableZoom = true;
		controls.enablePan = true;

		crosshair = new THREE.Mesh(
			new THREE.RingGeometry( 0.2, 0.4, 32 ),
			new THREE.MeshBasicMaterial( {
				color: 0xffffff,
				opacity: 1,
				transparent: true
			} )
		);
		crosshair.position.z = - 12;
		camera.add(crosshair);

		room = new THREE.Mesh(
			new THREE.BoxGeometry(60, 60, 60, 8, 8, 8),
			new THREE.MeshBasicMaterial({color: 0x666666, side: THREE.DoubleSide, wireframe: true})
		);
		scene.add(room);

		for (var i = 0; i < 40; i++) {
			var asteroid = new Asteroid();
			var asteroidGeometry = new THREE.BoxGeometry(asteroid.size.x, asteroid.size.y, asteroid.size.z);
			var randomMaterial = Math.floor(Math.random() * 3);
			var asteroidMaterial = new THREE.MeshPhongMaterial({map: THREE.ImageUtils.loadTexture('textures/patterns/rock' + randomMaterial + '.png')});
			asteroidMaterial.map.minFilter = THREE.NearestFilter;
			var asteroidMesh = new THREE.Mesh(asteroidGeometry, new THREE.MeshLambertMaterial({color: asteroid.color})); //COLOR: new THREE.MeshLambertMaterial({color: asteroid.color})
			asteroidMesh.position.x = asteroid.pos.x;
			asteroidMesh.position.y = asteroid.pos.y;
			asteroidMesh.position.z = asteroid.pos.z;
			asteroidMesh.name = "asteroid";
			room.add(asteroidMesh);
			asteroids.push([asteroidMesh, asteroid]);
		}

		function setOrientationControls(e) {
			if (!e.alpha) {
				return;
			}

			controls = new THREE.DeviceOrientationControls(camera, true);
			controls.connect();
			controls.update();

			element.addEventListener('click', fullscreen, false);

			window.removeEventListener('deviceorientation', setOrientationControls, true);
		}

		window.addEventListener('deviceorientation', setOrientationControls, true);

		scene.add(new THREE.HemisphereLight(0x808080, 0xffffff, 0.8)); //0x606060, 0x404040


		// WORLD MESH
		var geometry = new THREE.SphereBufferGeometry(500, 60, 40);
		// invert the geometry on the x-axis so that all of the faces point inward
		geometry.scale(-1, 1, 1);

		var texture = THREE.ImageUtils.loadTexture('textures/patterns/space2.png');
		texture.wrapS = THREE.ClampToEdgeWrapping;
		texture.wrapT = THREE.ClampToEdgeWrapping;
		texture.repeat = new THREE.Vector2(1, 1);
		texture.anisotropy = renderer.getMaxAnisotropy();
		texture.minFilter = THREE.NearestFilter;

		var material = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			specular: 0xffffff,
			shininess: 5,
			shading: THREE.FlatShading,
			map: texture
		});

		var mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);

		// PLANE MESH
		var planeTexture = THREE.ImageUtils.loadTexture('textures/patterns/checker.png');
		planeTexture.wrapS = THREE.RepeatWrapping;
		planeTexture.wrapT = THREE.RepeatWrapping;
		planeTexture.repeat = new THREE.Vector2(4, 4);
		planeTexture.anisotropy = renderer.getMaxAnisotropy();

		var planeMaterial = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			specular: 0xffffff,
			shininess: 5,
			shading: THREE.FlatShading,
			map: planeTexture
		});

		var planeGeometry = new THREE.PlaneGeometry(60, 60);

		var planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
		planeMesh.rotation.x = -Math.PI / 2;
		scene.add(planeMesh);

		window.addEventListener('resize', resize, false);
		setTimeout(resize, 1);





	}

	function resize() {
		var width = container.offsetWidth;
		var height = container.offsetHeight;

		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		renderer.setSize(width, height);
		effect.setSize(width, height);
	}

	function update(dt) {
		resize();

		camera.updateProjectionMatrix();

		controls.update(dt);
	}

	function render(dt) {
		// update the picking ray with the camera and mouse position
		var vector = new THREE.Vector3(0, 0, -1);
		vector = camera.localToWorld(vector);
		vector.sub(camera.position); // Now vector is a unit vector with the same direction as the camera

		var raycaster = new THREE.Raycaster( camera.position, vector);

		// calculate objects intersecting the picking ray
		//console.log(scene.children);
		intersects = raycaster.intersectObjects(room.children);
		//console.log(intersects[0].object.material.color);
		for( var i = 0; i < intersects.length; i++ ) {
			intersects[i].object.material.color.r += (2 - intersects[i].object.material.color.r) / 20;
			intersects[i].object.material.color.g += (2 - intersects[i].object.material.color.g) / 20;
			intersects[i].object.material.color.b += (2 - intersects[i].object.material.color.b) / 20;
		}

		if(intersects[0]) {
			//if(playAudio) timerAudio.play();
			playAudio = false;
			lookingAt = true;
		}
		else {
			lookingAt = false;
			playAudio = true;
			timerAudio.pause();
		}

		var pCount = parts.length;
		while(pCount--) {
			parts[pCount].update();
		}

		effect.render(scene, camera);
	}

	function animate(t) {
		requestAnimationFrame(animate);

		if(ambientAudio.currentTime >= 51.6) ambientAudio.currentTime = 0;

		asteroids.forEach(function (asteroidInList) {
			if (asteroidInList[0].position.x >= 30 || asteroidInList[0].position.x <= -30) asteroidInList[1].velocity.x *= -1;
			if (asteroidInList[0].position.y >= 30 || asteroidInList[0].position.y < 0) asteroidInList[1].velocity.y *= -1;
			if (asteroidInList[0].position.z >= 30 || asteroidInList[0].position.z <= -30) asteroidInList[1].velocity.z *= -1;

			asteroidInList[0].position.x += asteroidInList[1].velocity.x;
			asteroidInList[0].position.y += asteroidInList[1].velocity.y;
			asteroidInList[0].position.z += asteroidInList[1].velocity.z;

			asteroidInList[0].rotation.x += asteroidInList[1].rotation.x;
			asteroidInList[0].rotation.y += asteroidInList[1].rotation.y;
			asteroidInList[0].rotation.z += asteroidInList[1].rotation.z;



			if(asteroidInList[0].material.color.r >= 1.9 &&
				asteroidInList[0].material.color.g >= 1.9 &&
				asteroidInList[0].material.color.b >= 1.9) {

				var removeObject = true;
				var asteroidIndex;
				if(removeObject) {
					asteroidIndex = room.children.indexOf(asteroidInList[0]);
					if(asteroidIndex !== -1) {
						parts.push(new ExplodeAnimation(asteroidInList[0].position.x, asteroidInList[0].position.y, asteroidInList[0].position.z));
						room.children.splice(asteroidIndex, 1);

						socket.emit("collecting", {
							team: currentTeam
						});

						explosionAudio.pause();
						explosionAudio.currentTime = 0;
						explosionAudio.play();
						//dissolvingEffect(asteroidInList[0], asteroidIndex);
						//asteroids.splice(asteroids.indexOf([asteroidInList[0], asteroidInList[1]]), 1);
					}
					removeObject = false;
				}
			}
		});


		update(clock.getDelta());
		render(clock.getDelta());
	}

	function fullscreen() {
		if (container.requestFullscreen) {
			container.requestFullscreen();
		} else if (container.msRequestFullscreen) {
			container.msRequestFullscreen();
		} else if (container.mozRequestFullScreen) {
			container.mozRequestFullScreen();
		} else if (container.webkitRequestFullscreen) {
			container.webkitRequestFullscreen();
		}
	}

	function Asteroid() {
		this.pos = {
			x: Math.random() * 60 - 30,
			y: Math.random() * 30,
			z: Math.random() * 60 - 30
		};

		this.size = {
			x: Math.random() * (5 - 1) + 1,
			y: Math.random() * (5 - 1) + 1,
			z: Math.random() * (5 - 1) + 1
		};

		this.velocity = {
			x: (Math.random() * (0.14 - 0.005) - 0.0675),
			y: (Math.random() * (0.14 - 0.005) - 0.0675),
			z: (Math.random() * (0.14 - 0.005) - 0.0675)
		};

		this.rotation = {
			x: (Math.random() * (0.14 - 0.005) - 0.0675),
			y: (Math.random() * (0.14 - 0.005) - 0.0675),
			z: (Math.random() * (0.14 - 0.005) - 0.0675)
		};

		this.color = Math.random() * 0xffffff;
	}




	function ExplodeAnimation(x, y, z) {
		var geometry = new THREE.Geometry();

		for (i = 0; i < totalObjects; i++) {
			var vertex = new THREE.Vector3();
			vertex.x = x;
			vertex.y = y;
			vertex.z = z;

			geometry.vertices.push(vertex);
			dirs.push({
				x: (Math.random() * movementSpeed) - (movementSpeed / 2),
				y: (Math.random() * movementSpeed) - (movementSpeed / 2),
				z: (Math.random() * movementSpeed) - (movementSpeed / 2)
			});
		}
		var material = new THREE.ParticleBasicMaterial({
			size: objectSize,
			color: 0xffffff
		});
		var particles = new THREE.ParticleSystem(geometry, material);

		this.object = particles;
		this.status = true;

		this.xDir = (Math.random() * movementSpeed) - (movementSpeed / 2);
		this.yDir = (Math.random() * movementSpeed) - (movementSpeed / 2);
		this.zDir = (Math.random() * movementSpeed) - (movementSpeed / 2);

		scene.add(this.object);

		this.update = function() {
			if (this.status === true) {
				var pCount = totalObjects;
				while (pCount--) {
					var particle = this.object.geometry.vertices[pCount];
					particle.y += dirs[pCount].y;
					particle.x += dirs[pCount].x;
					particle.z += dirs[pCount].z;
				}
				this.object.geometry.verticesNeedUpdate = true;
			}
		}

	}

	window.addEventListener( 'mousedown', onclick, false );
	function onclick(){
		event.preventDefault();
		parts.push(new ExplodeAnimation((Math.random() * sizeRandomness)-(sizeRandomness/2), (Math.random() * sizeRandomness)-(sizeRandomness/2)));
	}


}]);