var http = require("http");
var fs = require("fs");
var url = require("url");

var route = {
    getPaths: {},
    postPaths: {},
    get: function(path, cb) {
        if(typeof route.getPaths[path] === 'undefined') {
            route.getPaths[path] = cb;
            console.log("Created");
        } else {
            console.log("not created");
        }
    },
    post: function(path, cb) {
        if(typeof route.postPaths[path] === "undefined") {
            route.postPaths[path] = cb;
        }
    }
};

var Database = require("./Database");
var connection = new Database("./lib/creds.json");

route.get("/send", function(req, res) {
    var data = url.parse(req.url, true).query;

    var query = "INSERT INTO messages (senderId, receiverId, message, dateSent) VALUES (?, ?, ?, NOW())";
    connection.update(query, [data.senderId, data.receiverId, data.msg], function() {
        console.log("updated successfully");
    });
});

route.get("/receive", function(req, res) {

});

http.createServer(function (request, response) {
    if(request.method.toUpperCase() === "GET") {
        route.getPaths[url.parse(request.url).pathname](request, response);
        response.end();
    }

    if(request.method.toUpperCase() === "POST") {
        route.postPaths[url.parse(request.url).pathname](request, response);
        response.end();
    }
}).listen(8080);

console.log("Server listening");
