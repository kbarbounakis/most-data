/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2014-03-30.
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com
 Anthi Oikonomou anthioikonomou@gmail.com
 All rights reserved.
 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this
 list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.
 * Neither the name of MOST Web Framework nor the names of its
 contributors may be used to endorse or promote products derived from
 this software without specific prior written permission.
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @ignore
 */
var types = require('./types'),
    sprintf = require('sprintf'),
    dataCommon = require('./data-common'),
    moment = require('moment'),
    _ = require('lodash'),
    Q = require("q");

/**
 * @exports most-data/functions
 */
var functions = { };
/**
 * @class
 * @param {DataContext=} context
 * @param {DataModel=} model
 * @param {*=} target
 * @constructor
*/
function FunctionContext(context, model, target) {
    /**
     * @type {DataContext}
    */
    this.context = context;
     /**
      * @type {DataModel}
      */
    this.model = model;
    if (_.isNil(context) && _.isObject(model)) {
        //get current context from DataModel.context property
        this.context = model.context;
    }
    /**
     * @type {*}
     */
    this.target = target;
}

FunctionContext.prototype.eval = function(expr, callback) {
    callback = callback || function() {};
    if (typeof expr !=='string') {
        callback(null);
        return;
    }
    var re = /(fn:)\s?(.*?)\s?\((.*?)\)/, expr1=expr;
    if (expr.indexOf('fn:')!==0) {
        expr1 = 'fn:' + expr1;
    }
    var match = re.exec(expr1);
    if (match) {
        var expr2eval;
        //check parameters (match[3])
        if (match[3].length==0) {
            expr2eval = expr1.replace(/(fn:)\s?(.*?)\s?\((.*?)\)/, "(function() { return this.$2(); });");
        }
        else {
            expr2eval = expr1.replace(/(fn:)\s?(.*?)\s?\((.*?)\)/, "(function() { return this.$2($3); });");
        }
        //evaluate expression
        try {
            var f = eval(expr2eval);
            var value1 = f.call(this);
            if (typeof value1 !== 'undefined' && value1 !== null && typeof value1.then === 'function') {
                value1.then(function(result) {
                    return callback(null, result);
                }).catch(function(err) {
                    callback(err);
                });
            }
            else {
                return callback(null, value1);
            }
        }
        catch(err) {
            callback(err);
        }
    }
    else {
        console.log(sprintf.sprintf('Cannot evaluate %s.', expr1));
        callback(new Error('Cannot evaluate expression.'));
    }

};
/**
 * @returns {Promise|*}
 */
FunctionContext.prototype.now = function() {
    var deferred = Q.defer();
    process.nextTick(function() {
        deferred.resolve(new Date());
    });
    return deferred.promise;
};
/**
 * @returns {Promise|*}
 */
FunctionContext.prototype.today = function() {
    var deferred = Q.defer();
    process.nextTick(function() {
        deferred.resolve((new Date()).getDate());
    });
    return deferred.promise;
};
/**
 * @returns {Promise|*}
 */
FunctionContext.prototype.newid = function() {
    var deferred = Q.defer();
    this.model.context.db.selectIdentity(this.model.sourceAdapter, this.model.primaryKey, function(err, result) {
        if (err) {
            return deferred.reject(err);
        }
        deferred.resolve(result);
    });
    return deferred.promise;
};

var UUID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

function newGuidInternal() {
    var chars = UUID_CHARS, uuid = [], i;
    // rfc4122, version 4 form
    var r;
    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';

    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (i = 0; i < 36; i++) {
        if (!uuid[i]) {
            r = 0 | Math.random()*16;
            uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
    }
    return uuid.join('');
}
/**
 * @returns {Promise|*}
 */
FunctionContext.prototype.newGuid = function() {
    var deferred = Q.defer();
    process.nextTick(function() {
        try {
            deferred.resolve(newGuidInternal());
        }
        catch(err) {
            deferred.reject(err)
        }
    });
    return deferred.promise;
};

/**
 * Generates a random integer value between the given minimum and maximum value
 * @param {number} min
 * @param {number} max
 * @returns {Promise|*}
 */
FunctionContext.prototype.int = function(min, max) {
    var deferred = Q.defer();
    process.nextTick(function() {
        try {
            return deferred.resolve(_.random(min, max));
        }
        catch (err) {
            deferred.reject(err);
        }
        deferred.resolve((new Date()).getDate());
    });
    return deferred.promise;
};

/**
 * Generates a random sequence of numeric characters
 * @param {number} length - A integer which represents the length of the sequence
 * @returns {Promise|*}
 */
FunctionContext.prototype.numbers = function(length) {
    var deferred = Q.defer();
    process.nextTick(function() {
        try {
            length = length || 8;
            if (length<0) {
                return deferred.reject(new Error("Number sequence length must be greater than zero."));
            }
            if (length>255) {
                return deferred.reject(new Error("Number sequence length exceeds the maximum of 255 characters."));
            }
            var times = Math.ceil(length / 10);
            var res = '';
            _.times(times, function() {
                 res += _.random(1000000000, 9000000000)
            });
            return deferred.resolve(res.substr(0,length));
        }
        catch (err) {
            deferred.reject(err);
        }
    });
    return deferred.promise;
};

/**
 * @param {number} length
 * @returns {Promise|*}
 */
FunctionContext.prototype.chars = function(length) {

    var deferred = Q.defer();
    process.nextTick(function() {
        try {
            length = length || 8;
            var chars = "abcdefghkmnopqursuvwxz2456789ABCDEFHJKLMNPQURSTUVWXYZ";
            var str = "";
            for(var i = 0; i < length; i++) {
                str += chars.substr(_.random(0, chars.length-1),1);
            }
            deferred.resolve(str);
        }
        catch (err) {
            return deferred.reject(err);
        }
    });
    return deferred.promise;
};
/**
 * @param {number} length
 * @returns {Promise|*}
 */
FunctionContext.prototype.password = function(length) {
    var deferred = Q.defer();
    process.nextTick(function() {
        try {
            length = length || 8;
            var chars = "abcdefghkmnopqursuvwxz2456789ABCDEFHJKLMNPQURSTUVWXYZ",
                str = "";
            for(var i = 0; i < length; i++) {
                str += chars.substr(_.random(0, chars.length-1),1);
            }
            deferred.resolve('{clear}' + str);
        }
        catch (err) {
            return deferred.reject(err);
        }
    });
    return deferred.promise;
};
/**
 * @returns {Promise|*}
 */
FunctionContext.prototype.user = function() {
    var self = this, context = self.model.context, deferred = Q.defer();
    var user = context.interactiveUser || context.user || { };
    process.nextTick(function() {
        if (typeof user.id !== 'undefined') {
            return deferred.resolve(user.id);
        }
        var userModel = context.model('User'), parser, undefinedUser = null;
        userModel.where('name').equal(user.name).silent().select('id').first(function(err, result) {
            if (err) {
                dataCommon.log(err);
                //try to get undefined user
                parser = types.parsers['parse' + userModel.field('id').type];
                if (typeof parser === 'function')
                    undefinedUser = parser(null);
                //set id for next calls
                user.id = undefinedUser;
                if (_.isNil(context.user)) {
                    context.user = user;
                }
                return deferred.resolve(undefinedUser);
            }
            else if (_.isNil(result)) {
                //try to get undefined user
                parser = types.parsers['parse' + userModel.field('id').type];
                if (typeof parser === 'function')
                    undefinedUser = parser(null);
                //set id for next calls
                user.id = undefinedUser;
                if (_.isNil(context.user)) {
                    context.user = user;
                }
                return deferred.resolve(undefinedUser);
            }
            else {
                //set id for next calls
                user.id = result.id;
                return deferred.resolve(result.id);
            }
        });
    });
    return deferred.promise;
};
/**
 * @returns {Promise|*}
 */
FunctionContext.prototype.me = function() {
    return this.user();
};

functions.FunctionContext = FunctionContext;
/**
 * Creates a new instance of FunctionContext class
 * @param {DataContext|*=} context
 * @param {DataModel|*=} model
 * @param {*=} target
 * @returns FunctionContext
 */
// eslint-disable-next-line no-unused-vars
functions.createContext = function(context, model, target) {
    return new FunctionContext();
};
/**
 * Gets the current date and time
 * @param {FunctionContext} e The current function context
 * @param {Function} callback The callback function to be called
 */
functions.now = function(e, callback) {
    callback.call(this, null, new Date());
};
/**
 * Gets the current date
 * @param {FunctionContext} e
 * @param {Function} callback
 */
functions.today = function(e, callback) {
    var d = new Date();
    callback.call(this, d.getDate());
};
/**
 * Gets new identity key for a primary key column
 * @param {FunctionContext} e
 * @param {Function} callback
 */
functions.newid = function(e, callback)
{
    e.model.context.db.selectIdentity(e.model.sourceAdapter, e.model.primaryKey, callback);
};

/**
 * Gets the current user
 * @param {FunctionContext} e The current function context
 * @param {Function} callback The callback function to be called
 */
functions.user = function(e, callback) {
    callback = callback || function() {};
    var user = e.model.context.interactiveUser || e.model.context.user || {  };
    //ensure user name (or anonymous)
    user.name = user.name || 'anonymous';
    if (user['id']) {
        return callback(null, user['id']);
    }
    var userModel = e.model.context.model('User');
    userModel.where('name').equal(user.name).silent().select('id','name').first(function(err, result) {
        if (err) {
            console.log(err);
            callback();
        }
        else {
            //filter result to exclude anonymous user
            var filtered = result.filter(function(x) { return x.name!=='anonymous'; }, result);
            //if user was found
            if (filtered.length>0) {
                e.model.context.user.id = result[0].id;
                callback(null, result[0].id);
            }
            //if anonymous was found
            else if (result.length>0) {
                callback(null, result[0].id);
            }
            else
                callback();
        }
    });
};
module.exports = functions;
