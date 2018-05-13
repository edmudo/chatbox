const app = exports;

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const qs = require("querystring");

app.generateSessionCookie = function(cb) {
    crypto.randomBytes(16, function (err, buf) {
        let sessionId = buf.toString("hex"),
            date = new Date();

        date.setMonth(date.getMonth() + 1);

        cb(sessionId, date, `session_id=${sessionId}; expires=${date.toUTCString()}; path=/`);
    });
};

app.findSession = function(results, ip) {
    for (let result of results) {
        if (result.ip === ip)
            return result;
    }

    return null;
};


app.createThreadProfile = function(userId, results) {
    // Process results into an organized object
    let chatProfile = {};

    chatProfile.threads = [];
    chatProfile.thread_id_indices = {};

    // parses through each message and relevant information to build up a
    // chat/thread profile
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
        let threadMessage = app.messageFormat(result.sender_user_id, senderName, result.message, result.datetime_sent);

        let threadIndex = chatProfile.thread_id_indices[strThreadId],
            relevantThread = chatProfile.threads[threadIndex];

        // Sets up the thread name
        if (result.sender_user_id !== parseInt(userId)
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

app.messageFormat = function(suid, name, message, datetimeSent) {
    return {
        "sender_user_id": suid,
        "sender_name": name,
        "message": message,
        "datetime_sent": datetimeSent
    };
}

app.hashPassword = function(password, cb) {
    bcrypt.hash(password, 10, function(err, hash) {
        cb(hash);
    });
};

app.comparePassword = function(password, hash, cb) {
    bcrypt.compare(password, hash, function(err, result) {
        cb(result)
    });
}

app.generateVerificationLink = function(cb) {
    crypto.randomBytes(16, function(err, buf) {
        cb(buf.toString("hex"));
    });
}