/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2015-02-13.
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
var async = require('async'),
    dataCommon = require('./data-common'),
    util = require('util'),
    dataCache = require('./data-cache');
/**
 * @class NotNullConstraintListener
 * @constructor
 */
function NotNullConstraintListener() {
    //
}
/**
 *
 * @param {DataEventArgs} e
 * @param {Function} callback
 */
NotNullConstraintListener.prototype.beforeSave = function(e, callback) {

    //find all attributes that have not null flag
    var attrs = e.model.attributes.filter(
        function(x) {
            return !x.primary && !(typeof x.nullable === 'undefined' ? true: x.nullable);
        });
    if (attrs.length==0) {
        callback(null);
        return 0;
    }
    async.eachSeries(attrs, function(attr, cb)
    {
        var name = attr.property || attr.name, value = e.target[name];
        if ((((value == null) || (value===undefined))  && (e.state==1))
            || ((value == null) && (typeof value!=='undefined') && (e.state == 2)))
        {
            cb(new Error(util.format('%s property of %s model cannot be null.', attr.title || name, e.model.title || e.model.name)));
        }
        else
            cb(null);
    }, function(err) {
        callback(err);
    });
};

/**
 * @class UniqueContraintListener
 * @constructor
 */
function UniqueContraintListener() {
    //
}
/**
 *
 * @param {DataEventArgs} e
 * @param  {Function} callback
 */
UniqueContraintListener.prototype.beforeSave = function(e, callback) {

    //there are no constraints
    if (e.model.constraints==null)
    {
        //do nothing
        callback(null);
        return;
    }
    //get unique constraints
    var constraints = e.model.constraints.filter(function(x) {
        return (x.type=='unique');
    });
    if (constraints.length==0) {
        //do nothing
        callback(null);
        return;
    }
    async.eachSeries(constraints, function(constraint, cb)
    {
        /**
         * @type {DataQueryable}
         */
        var q;
        //build query
        for (var i = 0; i < constraint.fields.length; i++) {
            var attr = constraint.fields[i];
            var value = e.target[attr];
            if (typeof value === 'undefined') {
                cb(null);
                return;
            }
            //check field mapping
            var mapping = e.model.inferMapping(attr);
            if (typeof mapping !== 'undefined' && mapping !== null) {
                if (typeof e.target[attr] === 'object') {
                    value=e.target[attr][mapping.parentField];
                }
            }
            if (typeof value=== 'undefined')
                value = null;
            if (q) {
                q.and(attr).equal(value);
            }
            else {
                q = e.model.where(attr).equal(value);
            }
        }
        if (typeof q === 'undefined')
            cb(null);
        else {
            q.silent().select(e.model.primaryKey).first(function(err, result) {
                if (err) {
                    cb(err);
                    return;
                }
                if (!result) {
                    //object does not exist
                    cb(null);
                }
                else {
                    var objectExists = true;
                    if (e.state==2) {
                        //validate object id (check if target object is the same with the returned object)
                        objectExists = (result[e.model.primaryKey]!= e.target[e.model.primaryKey]);
                    }
                    //if object already exists
                    if (objectExists) {
                        //so throw exception
                        if (constraint.description) {
                            cb(new Error(constraint.description));
                        }
                        else {
                            cb(new Error("Object already exists. Operation is not valid due to a unique constraint."))
                        }
                    }
                    else {
                        cb(null);
                    }
                }
            });
        }
    }, function(err) {
        callback(err);
    });
};

/**
 * @class CalculatedValueListener
 * @constructor
 * Represents data object default value listener
 */
function CalculatedValueListener() {
    //
}
/**
 *
 * @param {DataEventArgs} e
 * @param {Function} callback
 */
CalculatedValueListener.prototype.beforeSave = function(e, callback) {
    //get function context
    var functions = require('./functions'),
        functionContext = functions.createContext();
    util._extend(functionContext, e);
    //find all attributes that have a default value
    var attrs = e.model.attributes.filter(function(x) { return (x.calculation!==undefined); });
    async.eachSeries(attrs, function(attr, cb) {
        var expr = attr.calculation;
        //validate expression
        if (typeof expr !== 'string') {
            e.target[attr.name] = expr;
            return cb();
        }
        //check javascript: keyword for code evaluation
        if (expr.indexOf('javascript:')==0) {
            //get expression
            var fnstr = expr.substring('javascript:'.length);
            //if expression starts with function add parenthesis (fo evaluation)
            if (fnstr.indexOf('function')==0) {
                fnstr = '('.concat(fnstr,')');
            }
            //if expression starts with return then normalize expression (surround with function() {} keyword)
            else if (fnstr.indexOf('return')==0) {
                fnstr = '(function() { '.concat(fnstr,'})');
            }
            var value = eval(fnstr);
            //if value is function
            if (typeof value === 'function') {
                //then call function against the target object
                var value1 = value.call(functionContext);
                if (typeof value1 !== 'undefined' && value1 !=null && typeof value1.then === 'function') {
                    //we have a promise, so we need to wait for answer
                    value1.then(function(result) {
                        //otherwise set result
                        e.target[attr.name] = result;
                        return cb();
                    }).catch(function(err) {
                        cb(err);
                    });
                }
                else {
                    e.target[attr.name] = value1;
                    return cb();
                }
            }
            else if (typeof value !== 'undefined' && value !=null && typeof value.then === 'function') {
                //we have a promise, so we need to wait for answer
                value.then(function(result) {
                    //otherwise set result
                    e.target[attr.name] = result;
                    return cb();
                }).catch(function(err) {
                    cb(err);
                });
            }
            else {
                //otherwise get value
                e.target[attr.name] = value;
                return cb();
            }
        }
        else {
            functionContext.eval(expr, function(err, result) {
                if (err) {
                    cb(err);
                }
                else {
                    e.target[attr.name] = result;
                    cb(null);
                }
            });
        }

    }, function(err) {
        callback(err);
    });
};


/**
 * @class DataModelLookupCachingListener
 * @constructor
 */
function DataModelLookupCachingListener() {
    //
}
/**
 *
 * @param {DataEventArgs} e
 * @param {Function} callback
 */
DataModelLookupCachingListener.prototype.afterSave = function(e, callback) {
    try {
        if (dataCommon.isNullOrUndefined(e.model)) {
            callback();
            return;
        }
        //get item key
        var key = '/' + e.model.name + '/lookup';
        if (dataCache.current) {
            //remove item by key
            dataCache.current.remove(key);
        }
        callback();
    }
    catch (e) {
        if (process.NODE_ENV==='development')
            dataCommon.log(e);
        callback();
    }
};
/**
 *
 * @param {DataEventArgs} e
 * @param {Function} callback
 */
DataModelLookupCachingListener.prototype.afterRemove = function(e, callback) {
    DataModelLookupCachingListener.prototype.afterSave(e, callback);
};


/**
 * @class DefaultValueListener
 * @constructor
 * Represents data object default value listener
 */
function DefaultValueListener() {
    //
}
/**
 *
 * @param {DataEventArgs} e
 * @param {Function} callback
 */
DefaultValueListener.prototype.beforeSave = function(e, callback) {

    var state = e.state!==undefined ? e.state : 0;
    if (state!=1)
    {
        callback(null);
    }
    else {
        //get function context
        var functions = require('./functions'), functionContext = functions.createContext();
        util._extend(functionContext, e);
        //find all attributes that have a default value
        var attrs = e.model.attributes.filter(function(x) { return (x.value!==undefined); });
        async.eachSeries(attrs, function(attr, cb) {
            var expr = attr.value;
            //if attribute is already defined
            if (typeof e.target[attr.name] !== 'undefined') {
                //do nothing
                cb(null);
                return;
            }
            //validate expression
            if (typeof expr !== 'string') {
                e.target[attr.name] = expr;
                return cb();
            }
            //check javascript: keyword for code evaluation
            if (expr.indexOf('javascript:')==0) {
                //get expression
                var fnstr = expr.substring('javascript:'.length);
                //if expression starts with function add parenthesis (fo evaluation)
                if (fnstr.indexOf('function')==0) {
                    fnstr = '('.concat(fnstr,')');
                }
                //if expression starts with return then normalize expression (surround with function() {} keyword)
                else if (fnstr.indexOf('return')==0) {
                    fnstr = '(function() { '.concat(fnstr,'})');
                }
                var value = eval(fnstr);
                //if value is function
                if (typeof value === 'function') {
                    //then call function against the target object
                    var value1 = value.call(functionContext);
                    if (typeof value1 !== 'undefined' && value1 !=null && typeof value1.then === 'function') {
                        //we have a promise, so we need to wait for answer
                        value1.then(function(result) {
                            //otherwise set result
                            e.target[attr.name] = result;
                            return cb();
                        }).catch(function(err) {
                            cb(err);
                        });
                    }
                    else {
                        e.target[attr.name] = value1;
                        return cb();
                    }
                }
                else if (typeof value !== 'undefined' && value !=null && typeof value.then === 'function') {
                    //we have a promise, so we need to wait for answer
                    value.then(function(result) {
                        //otherwise set result
                        e.target[attr.name] = result;
                        return cb();
                    }).catch(function(err) {
                       cb(err);
                    });
                }
                else {
                    //otherwise get value
                    e.target[attr.name] = value;
                    return cb();
                }
            }
            else {
                functionContext.eval(expr, function(err, result) {
                    if (err) {
                        cb(err);
                    }
                    else {
                        e.target[attr.name] = result;
                        cb(null);
                    }
                });
            }

        }, function(err) {
            callback(err);
        });
    }
};


if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @constructs NotNullConstraintListener
         */
        NotNullConstraintListener:NotNullConstraintListener,
        /**
         * @constructs UniqueContraintListener
         */
        UniqueContraintListener:UniqueContraintListener,
        /**
         * @constructs CalculatedValueListener
         */
        CalculatedValueListener:CalculatedValueListener,
        /**
         * @constructs DataModelLookupCachingListener
         */
        DataModelLookupCachingListener:DataModelLookupCachingListener,
        /**
         * @constructs DefaultValueListener
         */
        DefaultValueListener:DefaultValueListener
    };
}