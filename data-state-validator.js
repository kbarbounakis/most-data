/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2015-09-15
 */
var dataCommon = require('./data-common'),
    async = require('async'),
    util = require('util');

/**
 * Validates data object's state based on any unique constraint defined.
 * @class DataStateValidatorListener
 * @constructor
 */
function DataStateValidatorListener() {
    //
}
/**
 *
 * @param {DataEventArgs|*} e
 * @param  {function(Error=)} callback
 */
DataStateValidatorListener.prototype.beforeSave = function(e, callback) {
    try {
        if (dataCommon.isNullOrUndefined(e)) {
            callback();
            return;
        }
        if (dataCommon.isNullOrUndefined(e.state)) {e.state = 1; }
        //if state is different than inserted then do nothing and return
        if (e.state!=1) {
            callback();
            return;
        }
        var model = e.model, target = e.target;
        //if model or target is not defined do nothing and exit
        if (dataCommon.isNullOrUndefined(model) || dataCommon.isNullOrUndefined(target)) {
            callback();
            return;
        }
        if (!dataCommon.isNullOrUndefined(model.primaryKey)) {
            if (!dataCommon.isNullOrUndefined(target[model.primaryKey])) {
                //The primary key exists, so do nothing
                e.state = 2;
                callback();
                return;
            }
        }
        //get constraint collection (from both model and base model)
        var arr = model.constraintCollection.filter(function(x) { return x.type==='unique' }), context = model.context, objectFound=false;
        if (arr.length==0) {
            //do nothing and exit
            callback();
            return;
        }
        async.eachSeries(arr, function(constraint, cb) {
            try {
                if (objectFound) {
                    cb();
                    return;
                }
                /**
                 * @type {DataQueryable}
                 */
                var q;
                if (util.isArray(constraint.fields)) {
                    for (var i = 0; i < constraint.fields.length; i++) {
                        var attr = constraint.fields[i];
                        if (!e.target.hasOwnProperty(attr)) {
                            cb();
                            return;
                        }
                        var value = e.target[attr];
                        //check field mapping
                        var mapping = e.model.inferMapping(attr);
                        if (!dataCommon.isNullOrUndefined(mapping)) {
                            if (typeof e.target[attr] === 'object') {
                                value=e.target[attr][mapping.parentField];
                            }
                        }
                        if (dataCommon.isNullOrUndefined(value))
                            value = null;
                        if (q)
                            q.and(attr).equal(value);
                        else
                            q = e.model.where(attr).equal(value);
                    }
                    if (dataCommon.isNullOrUndefined(q)) {
                        cb();
                    }
                    else {
                        if (typeof context.unattended === 'function') {
                            //find object (in unattended model)
                            context.unattended(function(ccb) {
                                q.silent().flatten().select([model.primaryKey]).first(function(err, result) {
                                    if (err) {
                                        ccb(err);
                                    }
                                    else if (result) {
                                        e.target[model.primaryKey] = result[model.primaryKey];
                                        //change state (updated)
                                        e.state = 2;
                                        //object found
                                        objectFound = true;
                                        ccb();
                                    }
                                    else {
                                        ccb();
                                    }
                                });
                            },function(err) {
                                cb(err);
                            });
                        }
                        else {
                            q.silent().flatten().select([model.primaryKey]).first(function(err, result) {
                                if (err) {
                                    cb(err);
                                }
                                else if (result) {
                                    //set primary key value
                                    e.target[model.primaryKey] = result[model.primaryKey];
                                    //change state (updated)
                                    e.state = 2;
                                    //object found
                                    objectFound=true;
                                    cb();
                                }
                                else {
                                    cb();
                                }
                            });
                        }
                    }
                }
                else {
                    cb();
                }
            }
            catch(e) {
                cb(e);
            }
        }, function(err) {
            callback(err);
        });
    }
    catch(er) {
        callback(er);
    }
};

if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @constructs DataStateValidatorListener
         */
        DataStateValidatorListener:DataStateValidatorListener
    };
}