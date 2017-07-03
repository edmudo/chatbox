const StaticHTTP = exports;

const fs = require("fs");
const path = require("path");
const glob = require("glob");

/**
 * Serves a static file that is found in the public directory
 *
 * @param {ClientRequest} req - the request object
 * @param {ClientResponse} res - the response object
 * @param {String} pathName - the pathname with or without the leading '/'
 */

StaticHTTP.serveFile = function(req, res, pathName) {
    if(pathName.charAt(0) === '/')
        pathName = pathName.substr(1);

    glob(`public/{+(${pathName}.*|${pathName}),${pathName}}`, function(err, pathNames) {

        if(err) throw err;

        if(pathNames.length === 0) {
            send404(req, res);
        } else {
            let contentType = getContentType(pathNames[0]);
            fs.readFile(pathNames[0], function (err, data) {
                if (err) {
                    send404(req, res);
                } else {
                    res.writeHead(200, "OK", {
                        "Content-Type": contentType
                    });
                    res.write(data);
                    res.end();
                }
            });
        }
    });
};

/**
 * Serves a 404
 *
 * @param {ClientRequest} req - the request object
 * @param {ClientResponse} res - the response object
 */

StaticHTTP.serve404 = function(req, res) {
    send404(req, res);
};

/**
 * Determines the content type from it's full pathname
 *
 * @param {String} pathName - the full pathname
 * @returns {String} - the HTTP content type
 */

function getContentType(pathName) {
    let ext = path.extname(pathName);

    switch(ext) {
        case ".html":
            return "text/html";
        case ".js":
            return "text/javascript";
        case ".css":
            return "text/css";
        case ".png": case ".jpeg": case ".jpg":
        return "image/" + ext.substr(1);
        default:
            return "text/plain";
    }
}

function send404(req, res, appendText) {
    let text = "";

    if(typeof appendText !== "undefined")
        text = appendText;

    res.writeHead(404, "Not Found", {
        "Content-Type": "text/html"
    });
    res.write(`<html><body><h1>404 Page Not Found</h1>${text}</body></html>`);
    res.end();
}