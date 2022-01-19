var app = angular.module("myPage", ['socket-io', "ngCookies"]);

app.controller("myPageController", ["$scope", "$http", "$window", "socket", "$cookies", function($scope, $http, $window, socket, $cookies) {

	if($cookies.get("group")) {
		socket.emit("enter", {
			shipName: $cookies.get("group"),
			points: parseFloat($cookies.get("points"))
		});

		socket.on("response", function(data) {

		});
	}
	else {
		window.location.href = "/";
	}

	var expiryDate = new Date();
	expiryDate.setDate(expiryDate.getDate() + 1);

	var currentItem = {};
	var hoveredOn = false;
	$scope.categoryOrItem = "category";
	if($cookies.get("questionsDone") === "yes") $("#questionsButton").hide();
	$scope.tournamentOpen = false;
	$scope.transmissionShow = true;

	$scope.itemDialogue = {};
	$scope.hoverBox = {};
	$scope.map = {};
	$scope.itemsList = {};
	$scope.description = {};
	$scope.inventoryList = [];

	$(".left").glitch({
		amount: 8
	});

    ////////////////////////////////////////////////////////////////////////////
    //
    //  SOCKET.ON HEARTBEAT
    //
	if (typeof console != "undefined")
		if (typeof console.log != 'undefined')
			console.olog = console.log;
		else
			console.olog = function() {};

	console.log = function(message) {
		console.olog(message);
		$('#debugDiv').append('<p>' + message + '</p>');
	};
	console.error = console.debug = console.info =  console.log

    socket.on("heartbeat", function(data) {
    	$scope.team = data.groups.find(function(group) { return group.name === $cookies.get("group"); });
    	if(typeof($scope.team) == "undefined") location.reload();
    	$scope.teamsList = data.groups;
        $scope.marketItems = data.items;
        $scope.description.category = data.items;
        if(hoveredOn) $scope.description.items = data.items[$scope.currentCategory][currentItem.name];
        $scope.tasksCompleted = $scope.team.challenges;
		$scope.tournamentOpen = data.tournamentOpen;
		if($scope.team.challenges.includes("Alien Transmission Translation")) $scope.transmissionShow = false;
		//$("body").glitch({ amount: 800 });

		$cookies.put("points", $scope.team.points, {expires: expiryDate});
		if($cookies.get("questionsDone") === "yes" && !$scope.team.challenges.includes("Critical Questions")) socket.emit("questionsDone", { team: $cookies.get("group") });
    });

	socket.on("questions", function() { window.location.href = "/questions"; });

    ////////////////////////////////////////////////////////////////////////////
    //
    //  CONTROLS
    //
    $scope.manageControlDialogue = function(control) {
        $scope.manageControlDialogueShow = true;
        $scope.currentControls = control;
    };

    $scope.itemHover = function(item) {
		currentItem = item;
		$scope.categoryOrItem = "item";
		socket.emit("requestHeartbeat");
		hoveredOn = true;
	};

    $scope.questionsButtonClicked = function() {
    	console.log("clicked");
		if($cookies.get("questionsDone") === "no") window.location.href = '/questions';

	};

    $scope.map.hover = function(category, event) {
    	$scope.currentCategory = category;
    	socket.emit("requestHeartbeat");
    	$scope.hoverBox.show = true;
    	$scope.hoverBox.x = event.x;
		$scope.hoverBox.y = event.y;
		$scope.categoryOrItem = "category";
	};

    $scope.map.click = function(opening) {
		$scope.itemsList.show = opening;
		$scope.map.show = !opening;
	};

    $scope.vrLink = window.location.href.split("/")[2] + "/vr";

    ////////////////////////////////////////////////////////////////////////////
    //
    //  SOCKET.ON CONSOLE INPUTS
    //
    socket.on("alertMessage", function(message) {
        $scope.alertDialogueShow = true;
        $scope.alertDialogueMessage = message;
    });

	socket.on("tournamentStart", function() {
		$scope.manageControlDialogue("tournament");
		$scope.tournamentOpen = true;
	});

	$scope.dialogueShowing = function(item, action) {
		$scope.itemsList.show = false;
		$scope.itemDialogue.show = true;
		$scope.itemDialogue.action = action;
		$scope.itemDialogue.title = action + " " + item.name + "?";
		$scope.itemDialogue.submit = function(success) {
			$scope.itemsList.show = true;
			$scope.itemDialogue.show = false;
			if(success) {
				socket.emit("buySell", {
					action: action,
					item: item,
					category: $scope.currentCategory,
					team: $cookies.get("group"),
				});
			}
		};
	};




}]);
