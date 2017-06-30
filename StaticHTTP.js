const StaticHTTP = exports;

const fs = require("fs");
const path = require("path");
const glob = require("glob");

StaticHTTP.serveFile = function(req, res, filepath) {
    glob(`public/{?(${filepath}.*|${filepath}),${filepath}}`, function(err, filepaths) {

        if(err) throw err;

        if(filepaths.length === 0) {
            send404(req, res);
        } else {
            let contentType = getContentType(filepaths[0]);
            fs.readFile(filepaths[0], function (err, data) {
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

function getContentType(filePath) {
    let ext = path.extname(filePath);

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