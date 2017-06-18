const SERVER_PORT = 63342;

var http = require("http");
var fs = require("fs");
var url = require("url");
var qs = require("querystring");

var Database = require("./Database");
var Route = require("./Route");

var connection = new Database("./lib/creds.json");
var route = new Route();

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
    let data = req.data;

    let query =
        "SELECT threads_users.pinned, threads_users.thread_id, messages.message, messages.datetime_sent " +
        "FROM threads_users " +
        "LEFT JOIN threads ON threads_users.thread_id = threads.thread_id " +
        "LEFT JOIN messages ON threads_users.thread_id = messages.thread_id " +
        "WHERE threads_users.user_id = ? " +
        "ORDER BY threads_users.pinned DESC, threads_users.thread_id, messages.datetime_sent DESC";

    connection.select(query, [data.user_id], function(statusCode, statusMessage, chatProfile) {
        console.log(JSON.stringify(chatProfile));
        res.setHeader("Content-Type", "application/json");
        res.writeHead(statusCode, statusMessage);
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
    // Set response headers
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:" + SERVER_PORT)
    res.setHeader("Access-Control-Allow-Credentials", "true");

    let pathHandler = route.pathHandlers[url.parse(req.url).pathname];

    if(typeof pathHandler !== "undefined") {
        if (req.method.toUpperCase() === "GET") {
            pathHandler(req, res);
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
        res.writeHead(404);
        res.end();
    }
}).listen(8080);

console.log("Server listening");
