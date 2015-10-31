/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2015-09-15.
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
            return callback();
        }

        var model = e.model, target = e.target;
        //if model or target is not defined do nothing and exit
        if (dataCommon.isNullOrUndefined(model) || dataCommon.isNullOrUndefined(target)) {
            return callback();
        }
        //if target has $state property defined, set this state and exit
        if (!dataCommon.isNullOrUndefined(target.$state)) {
            //set state
            e.state = target.$state;
            //and exit
            return callback();
        }
        if (!dataCommon.isNullOrUndefined(model.primaryKey)) {
            if (!dataCommon.isNullOrUndefined(target[model.primaryKey])) {
                //The primary key exists, so do nothing
                e.state = 2;
                return callback();
            }
        }
        //get constraint collection (from both model and base model)
        var arr = model.constraintCollection.filter(function(x) { return x.type==='unique' }), context = model.context, objectFound=false;
        if (arr.length==0) {
            //do nothing and exit
            return callback();
        }
        async.eachSeries(arr, function(constraint, cb) {
            try {
                if (objectFound) {
                    return cb();
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