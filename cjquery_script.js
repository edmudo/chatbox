var chatClient = {}

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
            data: {user_id: 1}
        }
    )
        .done(function(data, textStatus, xhr) {
            console.log("Received response: " + xhr.statusText);
            chatClient.chatProfile = data;
            fillPage(data);
            setupChatEventHandlers();
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

function setupChatEventHandlers() {
    $(".chat").click(function (event) {

        const MESSAGE_TYPE = {
            "sender": "sender",
            "receiver": "receiver"
        };

        $("#conversations").html("");

        var threadId = jQuery(this).attr("data-thread-id"),
            threadIndex = chatClient.chatProfile.thread_id_indices[threadId.toString()],
            thread = chatClient.chatProfile.threads[threadIndex],
            prevDate = new Date(0);

        for(var i = thread.thread_messages.length - 1; i >= 0; i--) {
            var messageContent = thread.thread_messages[i],
                messageType = (messageContent.sender_user_id !== 1) ? MESSAGE_TYPE.receiver : MESSAGE_TYPE.sender,
                messageDate = new Date(messageContent.datetime_sent * 1000);

            var messageTimeHour = convertHourStandard(messageDate.getHours()),
                messageTimeMinute = padZero(messageDate.getMinutes()),
                messageTimePeriod = (messageDate.getHours() < 12) ? "AM" : "PM";

            var messageTimeStr = messageTimeHour + ":" + messageTimeMinute + " " +  messageTimePeriod;

            var $messageTimeTemplate = $($("#message-time-template").html());

            if(messageDate.getDate() > prevDate.getDate()
                || messageDate.getMonth() > prevDate.getMonth()
                || messageDate.getFullYear() > prevDate.getFullYear()) {
                $messageTimeTemplate.find(".message-time-date").html(messageDate.toDateString());
                $("#conversations").append($messageTimeTemplate);
            }

            var $messageTemplate = $($("#message-template").html());
            $messageTemplate.find(".message-type").attr("class", messageType);
            $messageTemplate.find(".message-type-body").attr("class", messageType + "-body");
            $messageTemplate.find(".message-content")
                .attr("class", "message-content " + messageType + "-body-content")
                .html(messageContent.message);
            $messageTemplate.find(".time").html(messageTimeStr);

            $("#conversations").append($messageTemplate);
            prevDate = messageDate;
        }
    });
}

function convertHourStandard(hour) {
    hour %= 12;

    if(hour === 0)
        hour = 12;

    return hour;
}

function padZero(min) {
    if(min < 10)
        return "0" + min;

    return min;
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
