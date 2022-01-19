/*jshint esversion: 6 */

let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http, {});
let port = 2000;
let readline = require("readline");
let fs = require("fs");

let logger = fs.createWriteStream('log.txt', {
	flags: 'a'
});

let rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let groups = [];
let energy = require("./energy.js");
let materials = require("./materials.js");
let military = require("./military.js");
let food = require("./food.js");
var scavengerTimerCounter = 0;

var playersList = [];
var bulletsList = [];
var asteroidsList = [];

for(var i=0; i<15; i++) {
	asteroidsList.push({
		size: 1,
		x: Math.random()*4000,
		y: Math.random()*2500,
		xToAdd: Math.random()*4-2,
		yToAdd: Math.random()*4-2,
		peak: [Math.random()*200, Math.random()*200, Math.random()*200, Math.random()*200, Math.random()*200]
	});
}

////////////////////////////////////////////////////////////////////////////////
//
//	HEARTBEAT / TO RUN EVERY SECOND
//
setInterval(() => {
	heartbeat();
	io.sockets.emit("leaderboardHeartbeat", {players: playersList});
	groups.forEach((groupElement) => {
		logger.write(groupElement.name.toString() + " " + groupElement.points.toString() + ",   ");
	});
	if(groups.length > 0) logger.write("\r\n");
}, 1000);

setInterval(function() {
	bulletsList.forEach(function(bulletElement) {
		bulletElement.x += bulletElement.xToAdd;
		bulletElement.y += bulletElement.yToAdd;
	});
	asteroidsList.forEach(function(asteroidElement) {
		asteroidElement.x += asteroidElement.xToAdd;
		asteroidElement.y += asteroidElement.yToAdd;
	});

}, 1000/34);

////////////////////////////////////////////////////////////////////////////////
//
//	SOCKET / MAIN BACKEND CODE
//
io.sockets.on("connection", (socket) => {

	socket.on("enter", (data) => {
        let success = true;
		groups.forEach((groupElement) => {
			if(groupElement.name === data.shipName) success = false;
		});
		if(success)	{
			groups.push({
				name: data.shipName,
				points: (data.points ? data.points : 0),
				items: [],
				challenges: [],
				money: 500,
				game: 0,
			});
		}
		socket.emit("response", {success: success});
	});

	socket.on("requestHeartbeat", function() { heartbeat(); });

	////////////////////////////////////////////////////////////////////////////
	//
	//	ECONOMY SOCKETS
	//
	socket.on("buySell", (data) => {
		if(data.action === "buy") {
			groups.forEach((group) => {
				if(group.name === data.team) {
					if(group.money <= heartbeatData.items[data.category][data.item.name].cost) return;
					else {
						group.items.push(heartbeatData.items[data.category][data.item.name]);
						group.money -= heartbeatData.items[data.category][data.item.name].cost;
						group.points += (heartbeatData.items[data.category][data.item.name].cost - heartbeatData.items[data.category][data.item.name].price);
						heartbeatData.items[data.category][data.item.name].available -= 1;
						heartbeatData.items[data.category][data.item.name].cost = cost(heartbeatData.items[data.category][data.item.name]);
					}
				}
			});
		}
		else if(data.action === "sell") {
			groups.forEach((group) => {
				if(group.name === data.team && group.items.includes(heartbeatData.items[data.category][data.item.name])) {
					group.items.splice(group.items.indexOf(heartbeatData.items[data.category][data.item.name]), 1);
					group.money += heartbeatData.items[data.category][data.item.name].cost;
					heartbeatData.items[data.category][data.item.name].available += 1;
					heartbeatData.items[data.category][data.item.name].cost = cost(heartbeatData.items[data.category][data.item.name]);
				}
			});
		}
		heartbeat();

	});

	////////////////////////////////////////////////////////////////////////////
	//
	//	SIMULATION ROOM SOCKETS
	//
	socket.on("enterVR", function(data) {
		var success = false;
		groups.forEach(function(group) {
			if(group.name === data.group) success = true;
		});
		socket.emit("success", success);
	});

	socket.on("collecting", function(data) {
		groups.forEach(function(group) {
			if(group.name === data.team) group.points += 0.3;
		});
	});

	////////////////////////////////////////////////////////////////////////////
	//
	//	QUESTIONS SOCKETS
	//
	socket.on("questionResponse", function(data) {
		groups.forEach(function(group) {
			if(group.name === data.team) group.points += data.points;
		});
	});

	socket.on("questionsDone", function(data) {
		groups.forEach(function(group) {
			if(group.name === data.team) group.challenges.push("Critical Questions");
		});
	});

	////////////////////////////////////////////////////////////////////////////
	//
	//	GAME SOCKETS
	//
	socket.on("start", function(data) {
		playersList.push({
			id: socket.id,
			name: data.name,
			x: data.x,
			y: data.y,
			r: 0,
			points: 0,
		});
	});

	socket.on("shoot", function(data) {
		bulletsList.push({
			id: socket.id,
			x: data.x,
			y: data.y,
			xToAdd: data.xToAdd,
			yToAdd: data.yToAdd,
			r: data.r
		});
	});

	socket.on("update", function(data) {
		playersList.forEach(function(element) {
			if(element.id === socket.id) {
				element.x += data.x;
				element.y += data.y;
				element.r = data.r;
			}
		});
		socket.emit("gameHeartbeat", {players: playersList, bullets: bulletsList, asteroids: asteroidsList});

	});

	socket.on("playerDied", function(data) {
		groups.forEach(function(groupElement) {
			if(data.group !== groupElement.name) {
				groupElement.game += 20;
			}
		});
	});


	socket.on("disconnect", function() {
		playersList = playersList.filter(function(player) {
			return socket.id !== player.id;
		});
		bulletsList = bulletsList.filter(function(bullet) {
			return socket.id !== bullet.id;
		});
	});

});

////////////////////////////////////////////////////////////////////////////////
//
//	SERVER GARBAGE
//
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/static/index.html');
});
app.get('/addPoints', (req, res) => {
	console.log("Added " + req.query.points + " points");
});
app.get('/questions', (req, res) => {
	res.sendFile(__dirname + '/static/questions.html');
});
app.get('/terminal', (req, res) => {
	res.sendFile(__dirname + '/static/myPage.html');
});
app.get('/admin', (req, res) => {
	res.sendFile(__dirname + '/static/admin.html');
});
app.get('/vr', (req, res) => {
	res.sendFile(__dirname + '/static/cardboard.html');
});
app.get('/game', (req, res) => {
	res.sendFile(__dirname + '/static/game.html');
});
app.use(express.static(__dirname + '/static'));
http.listen(port);
console.log("Server started on port " + port + "\n");

getConsoleInput();

function getConsoleInput() {
	rl.question("Type command:  ", (response) => {
		switch(response.split(" ")[0]) {
			case "help":
				inputHelp();
			break;
			case "asteroids":
				inputAsteroids();
			break;
			case "questions":
				inputQuestions();
			break;
			case "alert":
				alertMessage(response.replace("alert ", ""));
			break;
			case "add":
				addPoints(response.split(" ")[1], response.split(" ")[2]);
			break;
			case "set":
				setPoints(response.split(" ")[1], response.split(" ")[2]);
				break;
			case "scavenger":
				if(response.split(" ")[1] === "start") {
					scavengerTimerCounter = 0;
					startScavengerTimer();
				}
				else scavengerAdd(response.split(" ")[1]);
				console.log("scavenger hunt started \n");
			break;
			case "tournament":
				tournament(response.split(" ")[1]);
				break;
			case "transmission":
				transmission(response.split(" ")[1]);
				break;
			default:
			console.log("Unknown command. Type 'help' for list of commands. \n");
		}
		getConsoleInput();
	});
}

////////////////////////////////////////////////////////////////////////////////
//
//	CONSOLE INPUTS
//
function inputHelp() {
	console.log("'help'...............................brings up a list of commands");
	console.log("'asteroids'..........................alerts all computers of asteroids incoming");
	console.log("'questions'..........................Sends them to the questions page");
	console.log("'alert' + message....................alerts message on all computers");
	console.log("'add' + group + points...............adds points to specified group");
	console.log("'set' + group + points...............sets a group's points to a given amount");
	console.log("'scavenger start'....................starts the scavenger hunt timer");
	console.log("'scavenger' + group..................signifies a group finishing the scavenger hunt");
	console.log("'tournament start'...................starts the scavenger hunt timer");
	console.log("'tournament stop'....................signifies a group finishing the scavenger hunt");
	console.log("'transmission' + group + mark........signifies a group has done the transmission challenge");
}

function inputAsteroids() {
	io.sockets.emit("asteroidsIncoming");
	console.log("sent command: asteroids\n");
}

function inputQuestions() {
	io.sockets.emit("questions");
	console.log("sent command: questions\n");
}

function alertMessage(message) {
	io.sockets.emit("alertMessage", message);
	console.log("sent alert:", message + "\n");
}

function addPoints(group, points) {
	groups.forEach(function(groupElement) {
		if(groupElement.name === group) groupElement.points += parseFloat(points);
	});
	console.log("added " + points + " points to " + group + "\n");
}

function setPoints(group, points) {
	groups.forEach(function(groupElement) {
		if(groupElement.name === group) groupElement.points = parseFloat(points);
	});
	console.log("set " + group + "'s points to " + points + "\n");
}

function scavengerAdd(groupName) {
	groups.forEach(function(groupElement) {
		if(groupElement.name === groupName) {
			groupElement.points += Math.floor(-0.04 * scavengerTimerCounter + 200);
			groupElement.challenges.push("Scavenger hunt");
		}
	});
}

function startScavengerTimer() {
	setTimeout(function() {
		scavengerTimerCounter++;
		startScavengerTimer();
	}, 1000);
}

function tournament(command) {
	if(command === "start") {
		heartbeatData.tournamentOpen = true;
		io.sockets.emit("tournamentStart");
		console.log("Tournament Started \n");
	}
}

function transmission(groupName, mark) {
	groups.forEach(function(groupElement) {
		if(groupElement.name === groupName) {
			groupElement.points += mark * 20;
			groupElement.challenges.push("Alien Transmission Translation");
		}
	});
}

var heartbeatData = {
	groups: groups,
	items: {
		energy: energy,
		military: military,
		materials: materials,
		food: food
	},
	tournamentOpen: false,
};

function heartbeat() {
	io.sockets.emit("heartbeat", heartbeatData);
}


function cost(item) {
	return Math.round(item.price * ((item.amount*item.amount) / (item.available*item.available)));
}