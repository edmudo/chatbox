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
    var pendingMessage = $("#pending-message").val();

    $.ajax(
        {
            method: "POST",
            url: "http://localhost:8080/send",
            xhrFields: {
                withCredentials: true
            },
            data: {sender_id: 1, receiver_id: 2, msg: pendingMessage}
        }
    )
        .done(function(data, textStatus, xhr) {
            console.log(data);
            console.log(textStatus);
            console.log(xhr.statusText);
            console.log("Received response: " + xhr.statusText);
        })
}
