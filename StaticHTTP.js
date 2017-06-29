const fs = require("fs");
const path = require("path");
const glob = require("glob");

module.exports = StaticHTTP;

function StaticHTTP() {}

StaticHTTP.prototype.serveFile = function(req, res, filepath) {
    glob(`public/{?(${filepath}.*|${filepath}),${filepath}}`, function(err, filepaths) {

        if(err) throw err;

        if(filepaths.length === 0) {
            res.writeHead(404, "Not Found", {
                "Content-Type": "text/html"
            });
            res.write("<html><body><h1>404 Page Not Found</h1></body></html>");
            res.end();
        } else {
            let contentType = getContentType(filepaths[0]);
            fs.readFile(filepaths[0], function (err, data) {
                if (err) {
                    res.writeHead(404, "Not Found", {
                        "Content-Type": contentType
                    });
                    res.write("<html><body><h1>404 Page Not Found</h1><p>This is probably a bug...</p></body></html>");
                } else {
                    res.writeHead(200, "OK", {
                        "Content-Type": contentType
                    });
                    res.write(data);
                }
                res.end();
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