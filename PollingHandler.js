const EventEmitter = require("events").EventEmitter;
const app = require("./app.js");

module.exports = PollingHandler;

function PollingHandler() {
    this.d = new Date();
    this.threads = {};
    this.ee = new EventEmitter();
}

PollingHandler.prototype.isThreadActive = function(threadId) {
    return typeof this.threads[threadId] !== "undefined";
}

PollingHandler.prototype.addThread = function(threadId) {
    if (this.isThreadActive(threadId)) {
        return;
    }
    console.log("added");
    this.threads[threadId] = [];
    this.ee.on(threadId, (suid, name, message, datetimeSent) => {
        for (let res of this.threads[threadId]) {
            let fmsg = app.messageFormat(suid, name, message, datetimeSent);
            res.writeHead(200, "OK");
            res.write(JSON.stringify(fmsg));
            res.end();
        }
        
        // clear responses
        this.threads[threadId] = [];
    });
};

PollingHandler.prototype.bindResToThread = function(res, threadId) {
    let arrLgt = this.threads[threadId].length;
    this.threads[threadId][arrLgt] = res;
    console.log(this.threads);
};

PollingHandler.prototype.send = function(threadId, suid, name, message, datetimeSent) {
    this.ee.emit(threadId, suid, name, message, datetimeSent);
};

PollingHandler.prototype.print = function() {
    console.log(this.d.getTime() + ": ");
    console.log(this.threads);
}

PollingHandler.prototype.prune = function() {};