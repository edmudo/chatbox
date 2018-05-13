const EventEmitter = require("events").EventEmitter;
const app = require("./app.js");

module.exports = PollingHandler;

function PollingHandler() {
    this.d = new Date();
    this.threads = {};
    this.ee = new EventEmitter();
}

/**
 * Check if a thread is active
 *
 * @param {Integer} threadId - the ID of the thread to look for
 */

PollingHandler.prototype.isThreadActive = function(threadId) {
    return typeof this.threads[threadId] !== "undefined";
}

/**
 * Makes a thread active if it is not already and set up with
 * relevant emission event
 *
 * @param {Integer} threadId - the ID of the thread to add
 */
PollingHandler.prototype.addThread = function(threadId) {
    if (this.isThreadActive(threadId)) {
        return;
    }

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

/**
 * Add a response to the thread to update.
 * 
 * @param {ServerResponse} res - the response from the client
 * @param {Integer} threadId - the ID of the thread to bind to res
 */

PollingHandler.prototype.bindResToThread = function(res, threadId) {
    let arrLgt = this.threads[threadId].length;
    this.threads[threadId][arrLgt] = res;
    console.log(this.threads);
};

/**
 * Emit the message to all clients
 * 
 * @param {Integer} threadId - the ID of the thread to emit from
 * @param {Integer} suid - the sender user id
 * @param {String} name - name of the sender
 * @param {String} message - the message to be emitted
 * @param {Datetime} datetimeSent - the datetime at which the message was sent
 */

PollingHandler.prototype.send = function(threadId, suid, name, message, datetimeSent) {
    this.ee.emit(threadId, suid, name, message, datetimeSent);
};

PollingHandler.prototype.prune = function() {};