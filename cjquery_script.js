$(document).ready(
    function () {
        setupPage();

        setupChatbox();
        setupOptionsMenu();
    }
);

function setupPage() {
    // TODO: Get user id from successful login

    $.ajax(
        {
            method: "GET",                      // Temporary GET, switch to POST
            url: "http://localhost:8080/pull",
            xhrFields: {
                withCredentials: true
            },
            data: {user_id: 3}
        }
    )
        .done(function(data, textStatus, xhr) {
            console.log(data);
            console.log("Received response: " + xhr.statusText);
            fillPage(data);
            // TODO setupEventHandlers();
        });
}

function fillPage(chatProfile) {

    for(var i = 0; i < chatProfile.threads.length; i++) {
        var thread = chatProfile.threads[i];

        // format data
        var avatarURL = "https://qph.ec.quoracdn.net/main-thumb-422971-50-2rW6VfaPKyuCl1ZzHXrCcHwZu2z36PdT.jpeg",
            tempStr = thread.thread_messages[0].message,
            preview = tempStr.substr(0, 27) + "...",
            currDate = new Date(),
            date = new Date(thread.thread_messages[0].datetime_sent * 1000),
            dateStr = "";

        if(currDate.getFullYear() === date.getFullYear())
            dateStr = (date.getMonth() + 1) + "/" + date.getDate();
        else
            dateStr = (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();

        var $chatTemplate = $($("#chat-template").html());
        $chatTemplate.attr("data-thread-id", thread.thread_id);
        $chatTemplate.find(".avatar img").attr("src", avatarURL);// link to submitted avatar
        $chatTemplate.find(".chat-pane-name").html(thread.thread_name);
        $chatTemplate.find(".chat-pane-preview-message").html(preview);
        $chatTemplate.find(".chat-pane-preview-date").html(dateStr);

        $("#chats").append($chatTemplate);
    }
}

function setupOptionsMenu() {
    var $userOptions = $("#user-options");
    var $userOptionsMenu = $userOptions.find("ul");

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

function setupChatbox() {
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
}

function sendMessage() {
    var pendingMessage = $("#pending-message").val();

    $.ajax(
        {
            method: "POST",
            url: "http://localhost:8080/send",
            xhrFields: {
                withCredentials: true
            },
            data: {thread_id: 1, sender_user_id: 1, msg: pendingMessage}
        }
    )
        .done(function(data, textStatus, xhr) {
            console.log(data);
            console.log(textStatus);
            console.log(xhr.statusText);
            console.log("Received response: " + xhr.statusText);
        });
}
