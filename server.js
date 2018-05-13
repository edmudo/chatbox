const http = require("http");
const url = require("url");
const qs = require("querystring");

const Database = require("./Database");
const Route = require("./Route");
const PollingHandler = require("./PollingHandler.js");

const app = require("./app");
const connection = new Database("./lib/creds.json");
const route = new Route();
const ph = new PollingHandler();
const staticServer = require("./StaticHTTP");

route.register("/", function(req, res) {
    if(typeof req.session_id === "undefined")
        staticServer.serveFile(req, res, "index");
    else
        staticServer.serveFile(req, res, "chatbox");
});

route.register("/login", {requireAuth: false}, function(req, res) {
    let data = req.data;

    let query = "SELECT users.password " +
        "FROM users " +
        "LEFT JOIN user_emails ON users.user_id = user_emails.user_id " +
        "WHERE user_emails.email = ?";

    connection.select(query, [data.email], function(statusCode, statusMessage, results) {
        console.log(results);
        if (statusCode == 200 && results.length > 0) {
            app.comparePassword(data.password, results[0].password, function(compResult) {
                if (!compResult)
                    return;

                query =
                    "SELECT " +
                        "users.user_id, user_emails.email, users.password, users.first_name, users.last_name, " +
                        "user_sessions.ip, user_sessions.hex_id, user_sessions.expire " +
                    "FROM user_emails " +
                    "LEFT JOIN users ON user_emails.user_id = users.user_id " +
                    "LEFT JOIN user_sessions ON user_emails.user_id = user_sessions.user_id " +
                    "WHERE user_emails.email = ? AND users.password = ?";
            
                connection.select(query, [data.email, results[0].password], function(statusCode, statusMessage, results) {
                    console.log(results);
                    if(results.length > 0) {
                        if (results[0].hex_id === null) {
                            app.generateSessionCookie(function(sessionId, expire, sessionCookie) {
                                console.log(sessionId);
                                query = "INSERT INTO user_sessions (user_id, ip, hex_id, expire) VALUES (?, ?, ?, ?)";
                                connection.update(query, [results[0].user_id, req.connection.remoteAddress, sessionId, expire]);
                
                                res.writeHead(200, statusMessage, {
                                    "Content-Type": "text/html",
                                    "Set-Cookie": [
                                        `user_id=${results[0].user_id}; expires=${expire}; path=/`,
                                        `${sessionCookie}`
                                    ],
                                    "x-chatbox-location": "http://localhost:8080/chatbox.html"
                                });
                                res.end();
                            });
                        } else {
                            let session = app.findSession(results, req.connection.remoteAddress);
            
                            if(session) {
                                res.writeHead(200, statusMessage, {
                                    "Content-Type": "text/html",
                                    "Set-Cookie": [
                                        `user_id=${results[0].user_id}; expires=${session.expire}; path=/`,
                                        `session_id=${session.hex_id}; expires=${session.expire}; path=/`,
                                    ],
                                    "x-chatbox-location": "http://localhost:8080/"
                                });
                                res.end();
                            } else {
                                // TODO: Logged in on new device
                            }
                        }
                    } else {
                        res.writeHead(statusCode, statusMessage, {
                            "Content-Type": "text/html"
                        });
                        res.end();
                    }
                });
            });
        }
    });
});

route.register("/poll", function(req, res) {
    // TODO: Verify user
    let data = req.data;
    
    ph.addThread(data.thread_id);
    ph.bindResToThread(res, data.thread_id);
    ph.print();
});

route.register("/send", function(req, res) {
    let data = req.data;
    let query = "INSERT INTO messages (thread_id, sender_user_id, message) VALUES (?, ?, ?)";

    connection.update(query, [data.thread_id, data.sender_user_id, data.msg], function(statusCode, statusMessage) {
        if (statusCode == 204) {
            query = "SELECT users.first_name, users.last_name, messages.datetime_sent " +
                "FROM messages " +
                "LEFT JOIN users ON messages.sender_user_id = users.user_id " +
                "WHERE messages.thread_id = ? " +
                "ORDER BY messages.datetime_sent DESC";
            connection.select(query, [data.thread_id], function(statusCode, statusMessage, results) {
                ph.print();
                if (results.length > 0) {
                    let name = results[0].first_name + " " + results[0].last_name;
                    ph.send(data.thread_id, data.sender_user_id, name, data.msg, results[0].datetime_sent);
                }
            });
        }

        res.writeHead(statusCode, statusMessage, {
            "Content-Type": "text/html"
        });
        res.end();
    });
});

route.register("/pull_threads", function(req, res) {
    // Selects 20 entries of each thread relevant to the user
    let query =
        "SELECT " +
            "threads_users.pinned, threads_users.thread_id, threads.is_group, threads.thread_name, " +
            "messages_limited.sender_user_id, users.first_name, users.last_name, " +
            "messages_limited.message, UNIX_TIMESTAMP(messages_limited.datetime_sent) AS datetime_sent " +
        "FROM threads_users " +
        "LEFT JOIN user_sessions ON threads_users.user_id = user_sessions.user_id " +
        "LEFT JOIN threads ON threads_users.thread_id = threads.thread_id " +
        "LEFT JOIN (" +
            "SELECT " +
                "messages.message_id, messages.thread_id, messages.sender_user_id, messages.message, " +
                "messages.datetime_sent, COUNT(*) AS thread_message_count " +
            "FROM messages " +
            "JOIN messages AS messages_self ON messages_self.thread_id = messages.thread_id " +
                "AND (messages_self.thread_id >= messages.thread_id AND messages_self.message_id <= messages.message_id) " +
            "GROUP BY messages.message_id, messages.thread_id, messages.message " +
            "ORDER BY messages.datetime_sent DESC LIMIT 20" +
        ") AS messages_limited ON threads_users.thread_id = messages_limited.thread_id " +
        "LEFT JOIN users ON messages_limited.sender_user_id = users.user_id " +
        "LEFT JOIN (" +
            "SELECT threads.thread_id, max(messages.datetime_sent) AS last_updated " +
            "FROM threads " +
            "LEFT JOIN messages ON threads.thread_id = messages.thread_id " +
            "GROUP BY threads.thread_id" +
        ") AS threads_last_update ON threads_users.thread_id = threads_last_update.thread_id " +
        "WHERE user_sessions.hex_id = ? " +
        "ORDER BY " +
            "threads_users.pinned DESC, threads_last_update.last_updated DESC, " +
            "threads_users.thread_id, messages_limited.datetime_sent DESC";

    connection.select(query, [req.session_id], function(statusCode, statusMessage, results) {
        // Process results into an organized object
        let chatProfile = app.createThreadProfile(req.user_id, results);

        res.writeHead(statusCode, statusMessage, {
            "Content-Type": "application/json"
        });
        res.write(JSON.stringify(chatProfile));
        res.end();
    });
});

route.register("/pull", function(req, res) {
    let data = req.data;
    
    let query = 
        "SELECT messages.thread_id, messages.sender_user_id, messages.message, messages.datetime_sent " +
        "FROM messages " +
        "WHERE thread_id = ? AND datetime_sent >= ?" +
        "ORDER BY messages.datetime_sent DESC";

    connection.select(query, [data.thread_id, data.datetime_sent], function(statusCode, statusMessage, data) {
        res.writeHead(statusCode, statusMessage, {
            "Content-Type": "application/json"
        });
        res.write(JSON.stringify(chatProfile));
        res.end();
    });

});

route.register("/create_account", {requireAuth: false}, function(req, res) {
    let data = req.data;

    let query = "INSERT INTO users (first_name, last_name, password) VALUES (?, ?, ?)";

    if (data.password != data.c_password) {
        res.writeHead(200, "OK");
        res.end();
    }

    app.hashPassword(data.password, function(hash) {
        connection.update(query, [data.first_name, data.last_name, hash], function(statusCode, statusMessage, results) {
            if (statusCode == 204) {
                query = "INSERT INTO user_emails (user_id, email, verification_id, verified) VALUES(?, ?, ?, ?)";
                app.generateVerificationLink(function(link) {
                    console.log(link);
                    connection.update(query, [results.insertId, data.email, link, 0], function(statusCode, statusMessage, results) {
                        console.log(statusCode+statusMessage);
                    });
                    staticServer.serveFile(req, res, "success");
                });
            }
        })
    });
});

route.register("/verify_email", {requireAuth: false}, function(req, res) {
    let data = req.data;

    let query = "SELECT user_emails.email, user_emails.verification_id " +
        "FROM user_emails " + 
        "WHERE user_emails.user_id = ? AND user_emails.email = ? AND user_emails.verification_id = ?";

    connection.select(query, [data.user_id, data.email, data.verification_id], function(statusCode, statusMessage, results) {
        if (results.length > 0) {
            query = "UPDATE user_emails " + 
                "SET user_emails.verified=1 " +
                "WHERE user_emails.user_id = ? AND user_emails.email = ?";
            connection.update(query, [data.user_id, data.email], function(statusCode, statusMessage, results) {
                if (statusCode == 204) {
                    staticServer.serveFile(req, res, "success");
                }
            });
        }
    })
});

route.register("/pull_profile", function(req, res) {

});

route.register("/save_profile", function (req, res) {

});

route.register("/seen", function(req, res) {

});

http.createServer(function (req, res) {
    let reqData = "";

    req.on("error", function(err) {
        console.log(err);
    });

    req.on("data", function (data) {
        reqData += data;
        if (req.data > 4e7) {
            res.setHeader("Content-Type", "text/html");
            res.writeHead(413, "Payload too large");
            res.end();
        }
    });

    req.on("end", function () {
        req.pathname = url.parse(req.url).pathname;

        if(req.method.toUpperCase() === "GET")
            req.data = url.parse(req.url, true).query;
        else if(req.method.toUpperCase() === "POST")
            req.data = qs.parse(reqData);

        httpRequestRouteHandler(req, res);
    });
}).listen(8080);

function verifyUser(req, res, cb) {
    if(req.headers["cookie"]) {
        let cookieStr = req.headers["cookie"].replace(";", "&").replace(" ", "");
        let cookieObj = qs.parse(cookieStr);

        req.user_id = cookieObj.user_id;
        req.session_id = cookieObj.session_id;

        let query =
            "SELECT user_sessions.ip, user_sessions.hex_id " +
            "FROM user_sessions " +
            "WHERE user_id = ? AND ip = ? AND hex_id = ?";

        connection.select(query, [req.user_id, req.connection.remoteAddress, req.session_id], function(statusCode, statusMessage, results) {
            cb(results.length > 0);
        });
    } else {
        staticServer.serveFile(req, res, "index");
    }
}

function httpRequestRouteHandler(req, res) {
    let pathName = req.pathname;
    let pathHandler = route.pathHandlers[pathName];

    if(typeof pathHandler !== "undefined") {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080");
        res.setHeader("Access-Control-Allow-Credentials", "true");

        if(pathHandler.requireAuth === true) {
            verifyUser(req, res, function(isVerified) {
                if(isVerified)
                    pathHandler(req, res);
                else
                    staticServer.serveFile(req, res, "index");
            });
        } else {
            pathHandler(req, res);
        }
    } else {
        if(req.method.toUpperCase() === "GET")
            staticServer.serveFile(req, res, pathName);
        else
            staticServer.serve404(req, res);
    }
}

console.log("Server listening");