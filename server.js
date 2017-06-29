const SERVER_PORT = '';

const http = require("http");
const fs = require("fs");
const url = require("url");
const qs = require("querystring");

const StaticHTTP = require("./StaticHTTP");
const Database = require("./Database");
const Route = require("./Route");

const staticServer = new StaticHTTP();
const connection = new Database("./lib/creds.json");
const route = new Route();

route.register("/login", function(req, res) {
    let data = req.data;
    let buf = crypto.randomBytes(16);
    let date = new Date();
    date.setMonth(date.getMonth() + 1);

    let query = "SELECT user_emails.email, users.password, users.first_name, users.last_name " +
        "FROM user_emails " +
        "LEFT JOIN users ON user_emails.user_id = users.user_id " +
        "WHERE user_emails.email = ? AND users.password = ?";

    connection.select(query, [data.email, data.password], function(statusCode, statusMessage, results) {

        if(results.length > 0) {
            res.writeHead(302, statusMessage, {
                "Content-Type": "text/html",
                "Set-Cookie": `sessionId=${buf.toString("hex")}; expires=${date.toUTCString()}; path=/`,
                "Location": "http://localhost/ChatClient/chatbox.html"
            });
            res.end();
        } else {
            res.writeHead(statusCode, statusMessage, {
                "Content-Type": "text/html"
            });
            res.end();
        }
    })
});

route.register("/send", function(req, res) {
    let data = req.data;
    let query = "INSERT INTO messages (thread_id, sender_user_id, message) VALUES (?, ?, ?)";

    connection.update(query, [data.thread_id, data.sender_user_id, data.msg], function(statusCode, statusMessage) {
        res.writeHead(statusCode, statusMessage, {
            "Content-Type": "text/html"
        });
        res.end();
    });
});

route.register("/pull", function(req, res) {
    let data = url.parse(req.url, true).query;

    // Selects 20 entries of each thread relevant to the user
    let query =
        "SELECT " +
            "threads_users.pinned, threads_users.thread_id, threads.is_group, threads.thread_name, " +
            "messages_limited.sender_user_id, users.first_name, users.last_name, " +
            "messages_limited.message, UNIX_TIMESTAMP(messages_limited.datetime_sent) AS datetime_sent " +
        "FROM threads_users " +
        "LEFT JOIN threads ON threads_users.thread_id = threads.thread_id " +
        "LEFT JOIN (" +
            "SELECT " +
                "messages.message_id, messages.thread_id, messages.sender_user_id, messages.message, " +
                "messages.datetime_sent, COUNT(*) AS rn " +
            "FROM messages " +
            "JOIN messages AS messages_self ON messages_self.thread_id = messages.thread_id " +
                "AND (messages_self.thread_id >= messages.thread_id AND messages_self.message_id <= messages.message_id) " +
            "GROUP BY messages.message_id, messages.thread_id, messages.message " +
            "HAVING COUNT(*) <= 20" +
        ") AS messages_limited ON threads_users.thread_id = messages_limited.thread_id " +
        "LEFT JOIN users ON messages_limited.sender_user_id = users.user_id " +
        "LEFT JOIN (" +
            "SELECT threads.thread_id, max(messages.datetime_sent) AS last_updated " +
            "FROM threads " +
            "LEFT JOIN messages ON threads.thread_id = messages.thread_id " +
            "GROUP BY threads.thread_id" +
        ") AS threads_last_update ON threads_users.thread_id = threads_last_update.thread_id " +
        "WHERE threads_users.user_id = ? " +
        "ORDER BY " +
            "threads_users.pinned DESC, threads_last_update.last_updated DESC, " +
            "threads_users.thread_id, messages_limited.datetime_sent DESC";

    connection.select(query, [data.user_id], function(statusCode, statusMessage, results) {
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
            if(isGroupThread === 0 && result.sender_user_id !== parseInt(data.user_id)) {
                relevantThread.thread_name = senderName;
            } else if(isGroupThread === 1
                && result.sender_user_id !== parseInt(data.user_id)
                && typeof relevantThread.participants[result.sender_user_id.toString()] === "undefined") {

                if(relevantThread.thread_name.length === 0)
                    relevantThread.thread_name += senderName;
                else
                    relevantThread.thread_name += ", " + senderName;

                relevantThread.participants[result.sender_user_id.toString()] = senderName;
            }

            relevantThread.thread_messages.push(threadMessage);
        }

        res.writeHead(statusCode, statusMessage, {
            "Content-Type": "application/json"
        });
        res.write(JSON.stringify(chatProfile));
        res.end();
    });
});

route.register("/pull_profile", function(req, res) {

});

route.register("/save_profile", function (req, res) {

});

route.register("/seen", function(req, res) {

});

http.createServer(function (req, res) {
    let pathName = url.parse(req.url).pathname;
    let pathHandler = route.pathHandlers[pathName];

    if(typeof pathHandler !== "undefined") {
        res.setHeader("Access-Control-Allow-Origin", "localhost:8080");
        res.setHeader("Access-Control-Allow-Credentials", "true");

        if (req.method.toUpperCase() === "GET") {
            pathHandler(req, res)
        } else if (req.method.toUpperCase() === "POST") {
            let reqData = '';

            req.on("data", function(data) {
                reqData += data;
                if(req.data > 4e7) {
                    res.setHeader("Content-Type", "text/html");
                    res.writeHead(413, "Payload too large");
                    res.end();
                }
            });

            req.on("end", function (data) {
                req.data = qs.parse(reqData);
                pathHandler(req, res);
            });
        }
    } else {
        if(req.method.toUpperCase() === "GET") {
            staticServer.serveFile(req, res, pathName.substr(1));
        }
    }
}).listen(8080);

console.log("Server listening");