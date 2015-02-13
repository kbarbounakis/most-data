/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2014-03-30
 */
var __types__ = require('./types'), util = require('util');
/**
 * @class FunctionContext
 * @constructor
*/
function FunctionContext() {
    /**
     * @type __model__.classes.DataContext
    */
    this.context = undefined;
     /**
      * @type DataModel
      */
    this.model = undefined;
    /**
     * @type *
     */
    this.target = undefined;
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
        //todo::validate function name and execute sync functions without callback (e.g. randomIntSync(1,10))
        //check parameters (match[3])
        if (match[3].length==0) {
            expr2eval = expr1.replace(/(fn:)\s?(.*?)\s?\((.*?)\)/, "(function() { this.$2(callback); });");
        }
        else {
            expr2eval = expr1.replace(/(fn:)\s?(.*?)\s?\((.*?)\)/, "(function() { this.$2($3,callback); });");
        }
        //evaluate expression
        var f = eval(expr2eval);
        f.call(this);
    }
    else {
        util.log(util.format('Cannot evaluate %s.', expr1));
        callback(new Error('Cannot evaluate expression.'));
    }

};

FunctionContext.prototype.now = function(callback) {
    callback = callback || function() {};
    callback(null, new Date());
};

FunctionContext.prototype.today = function(callback) {
    callback = callback || function() {};
    callback(null, (new Date()).getDate());
};

FunctionContext.prototype.newid = function(callback) {
    callback = callback || function() {};
    this.model.context.db.selectIdentity(this.model.sourceAdapter, this.model.primaryKey, callback);
};

FunctionContext.prototype.user = function(callback) {
    callback = callback || function() {};
    var self = this, context = self.model.context;
    var user = context.interactiveUser || context.user || { };
    if (user['id']) {
        callback(null, user['id']);
        return;
    }
    var userModel = context.model('User');
    userModel.where('name').equal(user.name).or('name').equal('anonymous').silent().select(['id','name']).take(2, function(err, result) {
        if (err) {
            console.log(err);
            callback();
        }
        else {
            //filter result to exclude anonymous user
            var filtered = result.filter(function(x) { return x.name!='anonymous'; }, result);
            //if user was found
            if (filtered.length>0) {
                context.user.id = filtered[0].id;
                callback(null, filtered[0].id);
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

var functions = {
    /**
     * @namespace
     */
    classes: {
        FunctionContext: FunctionContext
    },
    createContext: function() {
        return new FunctionContext();
    },
    /**
     * Gets the current date and time
     * @param {FunctionContext} e The current function context
     * @param {Function} callback The callback function to be called
     */
    now: function(e, callback) {
        callback.call(this, null, new Date());
    },
    /**
     * Gets the current date
     * @param {FunctionContext} e
     * @param {Function} callback
     */
    today: function(e, callback) {
        var d = new Date();
        callback.call(this, d.getDate());
    },
    /**
     * Gets new identity key for a primary key column
     * @param {FunctionContext} e
     * @param {Function} callback
     */
    newid: function(e, callback)
    {
        e.model.context.db.selectIdentity(e.model.sourceAdapter, e.model.primaryKey, callback);
    },
    /**
     * Gets the current user
     * @param {FunctionContext} e The current function context
     * @param {Function} callback The callback function to be called
     */
    user: function(e, callback) {
        callback = callback || function() {};
        var user = e.model.context.user || { };
        if (user['id']) {
            callback(null, user['id']);
            return;
        }
        var userModel = e.model.context.model('User');
        userModel.where('name').equal(user.name).or('name').equal('anonymous').silent().select(['id','name']).take(2, function(err, result) {
            if (err) {
                console.log(err);
                callback();
            }
            else {
                //filter result to exclude anonymous user
                var filtered = result.filter(function(x) { return x.name!='anonymous'; }, result);
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

    }
}
/**
 *
 */
if (typeof exports !== 'undefined') {
    module.exports = functions;
}