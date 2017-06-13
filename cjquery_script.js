$(document).ready(
    function () {
        var $userOptions = $("#user-options");
        var $userOptionsMenu = $userOptions.find("ul");

        var $pendingMessage = $("#pending-message");

        $pendingMessage.on("keydown", function (event) {
            var keyID = event.keyCode;
            switch (keyID) {
                case 8:
                    autoAdjustTextBox();
                    break;
                case 13:
                    sendMessage();
                    break;
                case 46:
                    autoAdjustTextBox();
                    break;
                default:
                    break;
            }
        });

        if($pendingMessage.style.height >= 61) {
            $pendingMessage.style.overflow = "scroll";
        } else {
            $pendingMessage.style.overflow = "hidden";
        }

        $userOptions.find("input").click(
            function (event) {
                $userOptionsMenu.toggle();
                event.stopPropagation();
            }
        );

        $("body").click(
            function () {
                if($userOptionsMenu.css("display") !== "none") {
                    $userOptionsMenu.toggle();
                }
            }
        );

    }
);

function sendMessage() {

    var pendingMessage = $("#pending-message").value;

    $.ajax(
        {
            method: "POST",
            url: "http://localhost:8080/",
            data: {message: pendingMessage}
        }
    )
        .done(function(response) {
            console.log("Received response");
        })
}
