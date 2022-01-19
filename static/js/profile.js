var app = angular.module("profilePage", ['socket-io', "ngCookies"]); //

app.controller("profilePageController", ["$scope", "$http", "$window", "socket", "$cookies", function($scope, $http, $window, socket, $cookies) {

	var expiryDate = new Date();
	expiryDate.setDate(expiryDate.getDate() + 1);

	$("#shipNameInput").focus();
	if($cookies.get("group")) {
		window.location.href = "/terminal";
	}

	socket.on("heartbeat", function(data) {
		$scope.placements = data.placements;
	});

	$scope.submit = function () {
		if(!$scope.shipNameInput) {
			$window.alert("Please fill all fields");
			return;
		}

		if($scope.shipNameInput.split(" ").length >= 2) {
			$window.alert("Team name cannot contain a space");
			return;
		}

		socket.emit("enter", {
			shipName: $scope.shipNameInput,
		});
		socket.on("response", function(data) {
			if(data.success) {
				$cookies.put("group", $scope.shipNameInput, {expires: expiryDate});
				$cookies.put("questionsDone", "no", {expire: expiryDate});
				window.location.href = "/terminal";
			}
			else {
				$window.alert("Name Already Exists");
			}
		});
	};

	$scope.return = function() {
		window.location.href = "/terminal";
	};

}]);
