const fs = require("fs");
const mysql = require("mysql");

module.exports = Database;

function Database(credPath) {
    this.creds = JSON.parse(fs.readFileSync(credPath));
    this.pool = mysql.createPool({
        connectionLimit: 100,
        host: this.creds.host,
        user: this.creds.user,
        password: this.creds.password,
        database: this.creds.database,
        debug: false
    });
}

/**
 * @callback requestCallback
 * @param {number} statusCode - http status code
 * @param {string} statusMessage - a description regarding the success of the task
 * @param {Object=} data - a JSON object representing the retrieved data
 */

/**
 * Select requests for the database
 *
 * @param {String} q - the parameterized select query
 * @param {Array} values - parameters for the query
 * @param {requestCallback} cb - handles the response
 */

Database.prototype.select = function(q, values, cb) {
    this.pool.getConnection(function(err, conn) {
        if(err)
            cb(503, "Connection failed.");

        conn.query(q, values, function(err, results) {
            conn.release();

            if(err)
                cb(503, "Database error: " + err.message);
            else
                cb(200, "Results received", results);
        });
    });
};

/**
 * Update requests for the database
 *
 * @param {string} q - the parameterized update query
 * @param {Array} values - parameters for the query
 * @param {requestCallback} cb - handles the response
 */

Database.prototype.update = function(q, values, cb) {
    this.pool.getConnection(function(err, conn) {
        if(err)
            cb(503, "Connection failed.");

        conn.query(q, values, function(err) {
            conn.release();
            if(err)
                cb(503, "Database error: " + err.message);
            else
                cb(204, "Message sent");
        });
    });
};

function cleanQuery(q) {

}