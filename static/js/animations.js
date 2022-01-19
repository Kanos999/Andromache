/*jslint browser: true*/
/*global $, jQuery, alert*/
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define */

$(function () {
  "use strict";

  var height = $(document).height() / 1.5;

  $("#tabOpen").hide();
  
  $("#addWindow").hide();
  $("#video").hide();

  $("#newModule").click(function() {
    $("#addWindow").show();
    $("#addWindow").animate({height: 78});

    $("#addPostButton").click(function() {
      $("#addWindow").hide(400);
      $("#addWindow").animate({height: 0});
	  $("#addPostTextbox").val("");
    });
  });

  $("#tabClose").click(function() {
	$("#jstreeContainer").hide(350, function() {
		$("#tabOpen").show(80);
		$("#tabClose").hide(80);
	});
	
  });
  
  $("#tabOpen").click(function() {
	$("#tabOpen").hide(80);
	$("#jstreeContainer").show(350, function() {
		$("#tabClose").show(80);
	});
  });
  
  
  $("#videoButton").click(function() {
    $("#video").show();
    $("#videoScreen").animate({ height: height }, 400);

    $("#videoClose").click(function() {
      $("#video").hide();
      $("#videoScreen").animate({ height: 70 }, 400);
    });
  });

});
