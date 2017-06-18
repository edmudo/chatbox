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
    let query = "INSERT INTO messages (sender_id, receiver_id, message, date_sent) VALUES (?, ?, ?, NOW())";

    connection.update(query, [data.sender_id, data.receiver_id, data.msg], function(statusCode, statusMessage) {
        res.setHeader("Content-Type", "text/html");
        res.writeHead(statusCode, statusMessage);
        res.end();
    });
});

route.register("/pull", function(req, res) {
    let data = url.parse(req.url, true).query;
    let query = "SELECT * FROM messages WHERE (sender_id OR receiver_id) = ? ORDER BY date_sent DESC";

    connection.select(query, [data.sender_id], function() {
        console.log("data retrieved");
    });
});

route.register("/update_profile", function(req, res) {

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
