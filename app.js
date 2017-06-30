const app = exports;

const crypto = require("crypto");
const qs = require("querystring");

app.generateSessionCookie = function(cb) {
    crypto.randomBytes(16, function (err, buf) {
        let sessionId = buf.toString("hex"),
            date = new Date();

        date.setMonth(date.getMonth() + 1);

        cb(sessionId, date, `sessionId=${sessionId}; expires=${date.toUTCString()}; path=/`);
    });
};

app.findSession = function(results, ip) {
    for (let result of results) {
        if (result.ip === ip) {
            return result;
        }
    }

    return null;
};


app.createThreadProfile = function(userId, results) {
    // Process results into an organized object
    let chatProfile = {};

    chatProfile.threads = [];
    chatProfile.thread_id_indices = {};

    for(let result of results) {
        let threadId = result.thread_id,
            strThreadId = threadId.toString(),
            isGroupThread = result.is_group,
            senderName = result.first_name + " " + result.last_name;

        // Sets up thread if id does not exist
        if(!chatProfile.thread_id_indices.hasOwnProperty(threadId)) {
            let thread = {};

            thread.pinned = (result.pinned === 1);
            thread.thread_id = threadId;
            thread.thread_name = "";
            thread.is_group = result.is_group;
            thread.participants = {};
            thread.thread_messages = [];

            chatProfile.threads.push(thread);
            chatProfile.thread_id_indices[strThreadId] = chatProfile.threads.length - 1;
        }

        // Thread message format
        let threadMessage = {
            "sender_user_id": result.sender_user_id,
            "sender_name": senderName,
            "message": result.message,
            "datetime_sent": result.datetime_sent
        };

        let threadIndex = chatProfile.thread_id_indices[strThreadId],
            relevantThread = chatProfile.threads[threadIndex];

        // Sets up the thread name
        if(isGroupThread === 0 && result.sender_user_id !== parseInt(userId)) {
            relevantThread.thread_name = senderName;
        } else if(isGroupThread === 1
            && result.sender_user_id !== parseInt(userId)
            && typeof relevantThread.participants[result.sender_user_id.toString()] === "undefined") {

            if(relevantThread.thread_name.length === 0)
                relevantThread.thread_name += senderName;
            else
                relevantThread.thread_name += ", " + senderName;

            relevantThread.participants[result.sender_user_id.toString()] = senderName;
        }

        relevantThread.thread_messages.push(threadMessage);
    }

    return chatProfile;
};