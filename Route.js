module.exports = Route;

function Route() {
    this.pathHandlers = {};
}

Route.prototype.register = function(path, cb) {
    if(typeof this.pathHandlers[path] === "undefined") {
        this.pathHandlers[path] = cb;
        console.log("Created route: " + path);
    } else {
        console.log("Could not create route: " + path);
    }
};
