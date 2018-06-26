var chatClient = {
    currThread: -1,
    prevThreadMsgDate: {},
    chatProfile: {}
}

$(document).ready(
    function () {
        setup();
        setupChatbox();
        setupMenuToggle();

        $("#message-box-text").focusout(function() {
            if ($("#message-box-text").text().trim() == "") {
                $("#message-box-text").empty();
            }
        });
    }
);

function setup() {
    $.ajax(
        {
            method: "GET",
            url: "http://localhost:8080/pull_threads",
            xhrFields: {
                withCredentials: true
            },
            data: {user_id: getCookie("user_id")}
        }
    )
        .done(function(data, textStatus, xhr) {
            console.log("Received response: " + xhr.statusText);
            chatClient.chatProfile = data;
            setupChat(chatClient.chatProfile);
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
            displayMessage(JSON.parse(data));
            $("#chatbox").scrollTop($("#chatbox")[0].scrollHeight - $("#chatbox")[0].clientHeight);
        })
}

function addThread(thread) {
    // format data
    var avatarURL = "https://qph.ec.quoracdn.net/main-thumb-422971-50-2rW6VfaPKyuCl1ZzHXrCcHwZu2z36PdT.jpeg",
        preview = thread.thread_messages[0].message,
        currDate = new Date(),
        date = new Date(thread.thread_messages[0].datetime_sent * 1000),
        dateStr = "";

    if(currDate.getFullYear() === date.getFullYear())
        dateStr = (date.getMonth() + 1) + "/" + date.getDate();
    else
        dateStr = (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();

    var $chatTemplate = $($("#chatroom-template").html());
    $chatTemplate.attr("data-thread-id", thread.thread_id);
    $chatTemplate.find(".avatar img").attr("src", avatarURL);// link to submitted avatar
    $chatTemplate.find(".chat-pane-name").html(thread.thread_name);
    $chatTemplate.find(".chat-pane-preview-message").html(preview);
    $chatTemplate.find(".chat-pane-preview-date").html(dateStr);

    $("#chatrooms").append($chatTemplate);
}

function setupChatEventHandlers() {
    $("#chatrooms").on("click", "div.chatroom", function() {
        displayChatThread(this);
        chatClient.currThread = this.getAttribute("data-thread-id");
    });

    $("#chatbox").on("click", "div.message-wrapper", function() {
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
        thread = chatClient.chatProfile.threads[threadIndex];

    chatClient.prevThreadMsgDate = new Date(0);

    // clear conversations before displaying thread conversations
    $("#chatbox").html("");

    for(var i = thread.thread_messages.length - 1; i >= 0; i--) {
        displayMessage(thread.thread_messages[i]);
    }
}

function displayMessage(msgObj) {
    const MESSAGE_TYPE = {
        "sender": "sender",
        "receiver": "receiver"
    };

    var messageType = (msgObj.sender_user_id == getCookie("user_id")) ? MESSAGE_TYPE.sender : MESSAGE_TYPE.receiver,
        messageDate = new Date(msgObj.datetime_sent * 1000),
        messageTimeHour = convertHourStandard(messageDate.getHours()),
        messageTimeMinute = padZero(messageDate.getMinutes()),
        messageTimePeriod = (messageDate.getHours() < 12) ? "AM" : "PM",
        messageTimeStr = messageTimeHour + ":" + messageTimeMinute + " " +  messageTimePeriod;

    // determine whether to display date before messages
    if (messageDate.getDate() > chatClient.prevThreadMsgDate.getDate()
        || messageDate.getMonth() > chatClient.prevThreadMsgDate.getMonth()
        || messageDate.getFullYear() > chatClient.prevThreadMsgDate.getFullYear()) {
        displayTimeBreak(messageDate.toDateString());
    }

    appendMessage(messageType, msgObj.message, messageTimeStr);

    chatClient.prevThreadMsgDate = messageDate;
}

function displayTimeBreak(dateStr) {
    var convoDOM = $("#chatbox"),
        $messageTimeTemplate = $($("#message-time-template").html());
    $messageTimeTemplate.find(".message-time-date").html(dateStr);
    convoDOM.append($messageTimeTemplate);
}

function appendMessage(msgType, msg, msgTimeStr) {
    var convoDOM = $("#chatbox"),
        $msgWrapperDiv = jQuery("<div/>", {
            class: "message-wrapper " + msgType + "-wrapper",
        }),
        $msgGroupDiv = jQuery("<div/>"),
        $msgDiv = jQuery("<div/>", {
            class: "message " + msgType,
            text: msg
        }),
        $msgDivTime = jQuery("<div/>", {
            class: "time",
            text: msgTimeStr
        }),
        $msgTemplate = $msgWrapperDiv.append(
            $msgGroupDiv.append($msgDiv).append($msgDivTime));

    convoDOM.append($msgTemplate);
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

function setupMenuToggle() {
    var $container = $(".contains-hidden");
    var $hiddenItem = $container.find(".hidden-item");

    $container.find(".toggle").click(
        function (event) {
            $hiddenItem.toggle();
            event.stopPropagation();
        }
    );

    $("body").click(
        function () {
            if($hiddenItem.css("display") !== "none") {
                $hiddenItem.toggle();
            }
        }
    );
}

function setupChatbox() {
    var $pendingMessage = $("#message-box-text");

    $pendingMessage.on("keydown", function (event) {
        var keyID = event.keyCode;
        switch (keyID) {
            case 13:
                if (!event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                }
                break;
            default:
                break;
        }
    });
}

function sendMessage() {
    var pendingMessage = $("#message-box-text").text();

    if (chatClient.currThread < 0 || pendingMessage.trim() == "")
        return;

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
            $("#message-box-text").empty();
            console.log("Received response: " + jqxhr.statusText);
        });
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
