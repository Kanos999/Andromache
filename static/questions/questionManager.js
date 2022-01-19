var app = angular.module("questionPage", ['socket-io', "ngCookies"]);

app.controller("questionController", ["$scope", "$http", "$window", "socket", "$cookies", function($scope, $http, $window, socket, $cookies) {
	if($cookies.get("questionsDone") === "yes") window.location.href = "/terminal";
	var expiryDate = new Date();
	expiryDate.setDate(expiryDate.getDate() + 1);

	$scope.clickAnswer = function(answer, div) {
		$scope.answer = answer;
		$(".answerList").removeClass("hoverEffect");
		$("#answer" + div).addClass("hoverEffect");
	};

	$scope.submitAnswer = function(correct) {
		if($scope.questionCounter > 5) {
			$cookies.put("questionsDone", "yes", {expires: expiryDate});
			socket.emit("questionsDone", {
				team: $cookies.get("group")
			});
			window.location.href = "/terminal";
		}
		$scope.questionCounter += 1;
		if(correct) {
			socket.emit("questionResponse", {
				team: $cookies.get("group"),
				points: 10,
			});
		}
	};

}]);
