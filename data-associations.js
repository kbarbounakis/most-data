/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2015-09-27.
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
var async = require('async'),
    util = require('util'),
    dataCommon = require('./data-common'),
    dataCache = require('./data-cache');

/**
 * @class DataObjectAssociationListener
 * @constructor
 */
function DataObjectAssociationListener() {
    //
}
/**
 *
 * @param {DataEventArgs} e
 * @param {function(Error=)} callback
 */
DataObjectAssociationListener.prototype.beforeSave = function(e, callback) {
    try {
        if (dataCommon.isNullOrUndefined(e.target)) {
            return callback();
        }
        else {
            var keys = Object.keys(e.target);
            var mappings = [];
            keys.forEach(function(x) {
                if (e.target.hasOwnProperty(x) && typeof e.target[x] === 'object' && e.target[x] != null) {
                        //try to find field mapping, if any
                        var mapping = e.model.inferMapping(x);
                        if (mapping && mapping.associationType==='association' && mapping.childModel===e.model.name)
                            mappings.push(mapping);
                }
            });
            async.eachSeries(mappings,
                /**
                 * @param {DataAssociationMapping} mapping
                 * @param {function(Error=)} cb
                 */
                function(mapping, cb) {
                    if (mapping.associationType==='association' && mapping.childModel===e.model.name) {
                        /**
                         * @type {DataField|*}
                         */
                        var field = e.model.field(mapping.childField),
                            childField = field.property || field.name;
                        //foreign key association
                        if (typeof e.target[childField] !== 'object') {
                            return cb();
                        }
                        if (e.target[childField].hasOwnProperty(mapping.parentField)) {
                            return cb();
                        }
                        //get associated mode
                        var associatedModel = e.model.context.model(mapping.parentModel),
                            er;
                        associatedModel.find(e.target[childField]).select(mapping.parentField).silent().flatten().take(1).list(function(err, result) {
                            if (err) {
                                cb(err);
                            }
                            else if (dataCommon.isNullOrUndefined(result)) {
                                er = new Error('An associated object cannot be found.');er.code = 'EDATA';er.model = associatedModel.name;
                                cb(er);
                            }
                            else if (result.total==0) {
                                er = new Error('An associated object cannot be found.');er.code = 'EDATA';er.model = associatedModel.name;
                                cb(er);
                            }
                            else if (result.total>1) {
                                er = new Error('An associated object is defined more than once and cannot be bound.'); er.code = 'EDATA';er.model = associatedModel.name;
                                cb(er);
                            }
                            else {
                                e.target[childField][mapping.parentField]=result.records[0][mapping.parentField];
                                cb();
                            }
                        });
                    }
                    else {
                       cb();
                    }

                }, function(err) {
                    callback(err);
                });
        }
    }
    catch (e) {
        callback(e);
    }

};

/**
 *
 * @param {DataEventArgs} e
 * @param {function(Error=)} callback
 */
DataObjectAssociationListener.prototype.afterSave = function(e, callback) {
    try {
        if (typeof e.target === 'undefined' || e.target==null) {
            callback(null);
        }
        else {
            var keys = Object.keys(e.target);
            var mappings = [];
            keys.forEach(function(x) {
                if (e.target.hasOwnProperty(x)) {
                    /**
                     * @type DataAssociationMapping
                     */
                    var mapping = e.model.inferMapping(x);
                    if (mapping)
                        if (mapping.associationType=='junction') {
                            mappings.push({ name:x, mapping:mapping });
                        }
                }
            });
            async.eachSeries(mappings,
                /**
                 * @param {{name:string,mapping:DataAssociationMapping}} x
                 * @param {function(Error=)} cb
                 */
                function(x, cb) {
                    if (x.mapping.associationType=='junction') {
                        var obj = e.model.convert(e.target);
                        /**
                         * @type {*|{deleted:Array}}
                         */
                        var childs = obj[x.name], junction;
                        if (!util.isArray(childs)) { return cb(); }
                        if (x.mapping.childModel===e.model.name) {
                            var HasParentJunction = require('./has-parent-junction').HasParentJunction;
                            junction = new HasParentJunction(obj, x.mapping);
                            if (e.state==1 || e.state==2) {
                                junction.insert(childs, function(err) {
                                    if (err) { return cb(err); }
                                    if (!util.isArray(childs.deleted)) { return cb(); }
                                    junction.remove(childs.deleted, function(err) {
                                        if (err) { return cb(err); }
                                        delete childs.deleted;
                                        cb();
                                    });
                                });
                            }
                            else  {
                                cb(null);
                            }
                        }
                        else if (x.mapping.parentModel===e.model.name) {
                            var DataObjectJunction = require('./data-object-junction').DataObjectJunction;
                            junction = new DataObjectJunction(obj, x.mapping);
                            if (e.state==1 || e.state==2) {
                                junction.insert(childs, function(err) {
                                    if (err) { return cb(err); }
                                    if (!util.isArray(childs.deleted)) { return cb(); }
                                    junction.remove(childs.deleted, function(err) {
                                        if (err) { return cb(err); }
                                        delete childs.deleted;
                                        cb();
                                    });
                                });
                            }
                            else  {
                                cb();
                            }
                        }
                        else {
                            cb();
                        }
                    }
                    else
                        cb(null);

                }, function(err) {
                    callback(err);
                });
        }
    }
    catch (e) {
        callback(e);
    }
};



if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @constructs DataObjectAssociationListener
         */
        DataObjectAssociationListener:DataObjectAssociationListener
    };
}