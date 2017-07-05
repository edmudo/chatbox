module.exports = Route;

const staticServer = require("./StaticHTTP");

function Route() {
    this.pathHandlers = {};
}

/**
 * Register a defined route
 *
 * @param {String} path - pathname resembling "/example"
 * @param {Object=} options - options for the callback
 * @param {boolean} options.requireAuth - requires a session to continue
 * @param {responseCallback=} cb - if specified, handle the response, otherwise attempt to serve file associated to path
 */

Route.prototype.register = function(path, options = {}, cb) {

    if(typeof options === "function") {
        cb = options;
        options = {};
    }

    options = {
        requireAuth: (typeof options.requireAuth !== "undefined") ? options.requireAuth : true
    };

    if(typeof this.pathHandlers[path] === "undefined") {
        if(typeof cb !== "undefined")
            this.pathHandlers[path] = cb;
        else
            this.pathHandlers[path] = function(req, res) {
                staticServer.serveFile(req, res, path);
            };

        this.pathHandlers[path].requireAuth = options.requireAuth;

        console.log(`Created route: ${path} with options: ${options.requireAuth}`);
    } else {
        console.log("Could not create route: " + path);
    }
};

/**
 * Handle the response
 * @callback responseCallback
 * @param {IncomingMessage} req - the request object
 * @param {ServerResponse} res - the response object
 */
