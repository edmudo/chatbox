var chatClient = {}

$(document).ready(
    function () {
        setup();
        setupChatbox();
        setupOptionsMenu();
    }
);

function setup() {
    $.ajax(
        {
            method: "GET",                      // Temporary GET, switch to POST
            url: "http://localhost:8080/pull_threads",
            xhrFields: {
                withCredentials: true
            },
            data: {user_id: getCookie("user_id")}
        }
    )
        .done(function(data, textStatus, xhr) {
            console.log("Received response: " + xhr.statusText);
            console.log(data);
            chatClient.chatProfile = data;
            setupChat(data);
            setupChatEventHandlers();
        });
}

function setupChat(chatProfile) {
    for (var i = 0; i < chatProfile.threads.length; i++) {
        var thread = chatProfile.threads[i];

        poll(thread.thread_id);
        addThread(thread);
    }
}

function poll(threadId) {
    $.ajax(
        {
            method: "GET",
            url: "http://localhost:8080/poll",
            xhrFields: {
                withCredentials: true
            },
            data: {thread_id: threadId},
            timeout: 0
        }
    )
        .done(function(data, textStatus, xhr) {
            console.log("Long poll response: " + xhr.statusText);
            poll(threadId);
            console.log(data);
        })
}

function addThread(thread) {
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

function setupChatEventHandlers() {
    $("#chats").on("click", "div.chat", function() {
        displayChatThread(this);
        chatClient.currThread = this.getAttribute("data-thread-id");
    });

    $("#conversations").on("click", "div.message", function() {
        console.log('clicked');
        displayTime(this);
    });
}

function displayChatThread(obj) {
    const MESSAGE_TYPE = {
        "sender": "sender",
        "receiver": "receiver"
    };

    var threadId = jQuery(obj).attr("data-thread-id"),
        threadIndex = chatClient.chatProfile.thread_id_indices[threadId.toString()],
        thread = chatClient.chatProfile.threads[threadIndex],
        prevDate = new Date(0);

    // clear conversations before inserting new thread
    $("#conversations").html("");

    for(var i = thread.thread_messages.length - 1; i >= 0; i--) {
        // parse message data
        var messageContent = thread.thread_messages[i],
            messageType = (messageContent.sender_user_id != getCookie("user_id")) ? MESSAGE_TYPE.receiver : MESSAGE_TYPE.sender,
            messageDate = new Date(messageContent.datetime_sent * 1000),
            messageTimeHour = convertHourStandard(messageDate.getHours()),
            messageTimeMinute = padZero(messageDate.getMinutes()),
            messageTimePeriod = (messageDate.getHours() < 12) ? "AM" : "PM",
            messageTimeStr = messageTimeHour + ":" + messageTimeMinute + " " +  messageTimePeriod;

        // determine whether to display date before messages
        if(messageDate.getDate() > prevDate.getDate()
            || messageDate.getMonth() > prevDate.getMonth()
            || messageDate.getFullYear() > prevDate.getFullYear()) {
            displayTimeBreak(messageDate.toDateString());
        }

        displayMessage(messageType, messageContent.message, messageTimeStr);

        prevDate = messageDate;
    }
}

function displayTimeBreak(dateStr) {
    var convoDOM = $("#conversations"),
        $messageTimeTemplate = $($("#message-time-template").html());
    $messageTimeTemplate.find(".message-time-date").html(dateStr);
    convoDOM.append($messageTimeTemplate);
}

function displayMessage(msgType, msg, msgTimeStr) {
    var convoDOM = $("#conversations"),
        $messageTemplate = $($("#message-template").html());

    // appends the message with event handler to show time when clicked
    $messageTemplate.find(".message-type").attr("class", msgType);
    $messageTemplate.find(".message-type-body").attr("class", msgType + "-body");
    $messageTemplate.find(".message-content")
        .attr("class", "message-content " + msgType + "-body-content")
        .html(msg);
    $messageTemplate.find(".time").html(msgTimeStr);

    convoDOM.append($messageTemplate);
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

function displayTime(obj) {
    jQuery(obj).find(".time").toggle();
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
            data: {thread_id: chatClient.currThread, sender_user_id: getCookie("user_id"), msg: pendingMessage}
        }
    )
        .done(function(data, textStatus, jqxhr) {
            // TODO: notify/signal user that message was sent
            console.log("Received response: " + jqxhr.statusText);
        });
}

function autoAdjustTextBox() {
    // Assumes that the padding is 5px
    if(chatClient.messageBox.prop("clientHeight") >= chatClient.charHeight * 3 + 10) {
        chatClient.messageBox.css("overflow", "scroll");
    } else {
        chatClient.messageBox.css("overflow", "hidden");

        // Clears the style
        chatClient.messageBox.css("height","1px");

        // Gets the height of content without css height influence
        var textareaScrollHeight = chatClient.messageBox.prop("scrollHeight");
        chatClient.messageBox.css("height", (textareaScrollHeight - 10).toString() + "px");
    }
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
