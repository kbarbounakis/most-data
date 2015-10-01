/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2014-10-13.
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
 * @type {{inherits:Function,_extend:Function,isArray:Function,format:Function}}
 */
var util = require('util'),
    dataCommon = require('./data-common'),
    types = require('./types'),
    cfg = require('./data-configuration'),
    DataAssociationMapping = types.DataAssociationMapping,
    DataObjectJunction = require('./data-object-junction').DataObjectJunction,
    DataObjectRelation = require('./data-object-relation').DataObjectRelation,
    HasManyAssociation = require('./has-many-association').HasManyAssociation,
    HasOneAssociation = require('./has-one-association').HasOneAssociation,
    HasParentJunction = require('./has-parent-junction').HasParentJunction;

/**
 * CONSTANTS
 */
var STR_MISSING_CALLBACK_ARGUMENT = 'Missing argument. Callback function expected.',
    STR_MISSING_ARGUMENT_CODE = 'EARGM';

/**
 * DataObject class represents a data object that is going to be used in data and other operations
 * @class DataObject
 * @param {string=} type
 * @param {*=} obj The object that is going to be extended
 * @constructor
 * @augments EventEmitter2
 * @property {DataContext}  context - The HttpContext instance related to this object.
 * @property {*}  selector - An object that represents a collection of selectors associated with this data object e.g is(':new'), is(':valid'), is(':enabled') etc
 */
function DataObject(type, obj)
{
    /**
     * @type {string}
     * @private
     */
    var __type = null;
    if (type)
        __type = type;
    Object.defineProperty(this,'type',{
        get: function() { return __type; } ,
        set: function(value) { __type=value; },
        enumerable:false,
        configurable:false
    });
    var __context = null;
    Object.defineProperty(this,'context',{
        get: function() { return __context; } ,
        set: function(value) { __context=value; },
        enumerable:false,
        configurable:false
    });

    if (typeof obj !== 'undefined' && obj != null) {
        util._extend(this, obj);
    }

    var __selectors = { };
    Object.defineProperty(this,'selectors',{
        get: function() { return __selectors; } ,
        set: function(value) { __selectors=value; },
        enumerable:false,
        configurable:false
    });

    this.selector('new', function(callback) {
        if (typeof callback !== 'function') { return new Error(STR_MISSING_CALLBACK_ARGUMENT, STR_MISSING_ARGUMENT_CODE); }
        var self = this,
            model = self.getModel();
        model.inferState(self, function(err, state) {
            if (err) { return callback(err); }
            callback(null, (state==1));
        });
    }).selector('live', function(callback) {
        if (typeof callback !== 'function') { return new Error(STR_MISSING_CALLBACK_ARGUMENT, STR_MISSING_ARGUMENT_CODE); }
        var self = this,
            model = self.getModel();
        model.inferState(self, function(err, state) {
            if (err) { return callback(err); }
            callback(null, (state==2));
        });
    });
}
util.inherits(DataObject, types.EventEmitter2);

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /(?:^|,)\s*([^\s,=]+)/g;

function $args ( func ) {
    var fnStr = func.toString().replace(STRIP_COMMENTS, '');
    var argsList = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')'));
    var result = argsList.match( ARGUMENT_NAMES );

    if(result === null) {
        return [];
    }
    else {
        var stripped = [];
        for ( var i = 0; i < result.length; i++  ) {
            stripped.push( result[i].replace(/[\s,]/g, '') );
        }
        return stripped;
    }
}

/**
 *
 * @param {string} name
 * @param {function=} selector
 */
DataObject.prototype.selector = function(name, selector) {
    /**
     * @private
     * @type {{}|*}
     */
    this.selectors = this.selectors || {};
    if (typeof name !== 'string') {
        return new Error('Invalid argument. String expected.', 'EARG');
    }
    if (typeof selector === 'undefined') {
        return this.selectors[name];
    }
    //get arguments
    this.selectors[name] = selector;
    return this;
};

/**
 *
 * @param {string} selector
 * @returns {Q.IPromise|*}
 */
DataObject.prototype.is = function(selector) {
    if (!/^:\w+$/.test(selector)) {
        throw new Error('Invalid selector. A valid selector should always start with : e.g. :new or :live.');
    }
    this.selectors = this.selectors || {};
    var fn = this.selectors[selector.substr(1)];
    if (typeof fn !== 'function') {
        throw new Error('The specified selector is no associated with this object.','EUNDEF');
    }
    var Q = require('q'), deferred = Q.defer();
    fn.call(this, function(err, result) {
        if (err) { return deferred.reject(err); }
        deferred.resolve(result);
    });
    return deferred.promise;
};

/**
 * Gets the type of this data object.
 * @returns {string}
 */
DataObject.prototype.getType = function() {
    if (typeof this.type === 'string')
        return this.type;
    return this.constructor.name;
};
/**
 * @returns {DataModel}
 */
DataObject.prototype.getModel = function() {
    if (this.context)
        return this.context.model(this.getType());
    return null;
};

/**
 * @returns {DataModel}
 */
DataObject.prototype.idOf = function() {
    if (this.context) {
        var model = this.context.model(this.type);
        if (model) {
            return this[model.primaryKey];
        }
    }
};

/**
 * @param {String} name The relation name
 * @returns {DataQueryable}
 */
DataObject.prototype.property = function(name)
{
    if (typeof name !== 'string')
        return null;
    var self = this;
    //validate relation based on the given name
    var model = self.getModel(), field = model.field(name);
    if (field==null)
        throw new Error('The specified field cannot be found.');
    var mapping = model.inferMapping(field.name);
    if (typeof mapping === 'undefined' || mapping ==null)
        throw new Error('The specified association cannot be found.');
    //validate field association
    if (mapping.associationType=='association') {
        if (mapping.parentModel==model.name)
            return new HasManyAssociation(self, mapping);
        else
            return new HasOneAssociation(self, mapping);
    }
    else if (mapping.associationType=='junction') {
        if (mapping.parentModel==model.name)
            return new DataObjectJunction(self, mapping);
        else
            return new HasParentJunction(self, mapping);
    }
    return null;
};
/**
 * @param {String} name
 * @param {function(Error=,*=)} callback
 */
DataObject.prototype.attrOf = function(name, callback) {
    var model = this.getModel(),
        mapping = model.inferMapping(name);
    if (typeof mapping === 'undefined' || mapping == null) {
        return callback(null, this[name]);
    }
    if (this.hasOwnProperty(name)) {
        if (typeof this[name] === 'object' && this[name] != null) {
            callback(null, this[name][mapping.parentField]);
        }
        else if (this[name] == null) {
            callback();
        }
        else {
            callback(null, this[name]);
        }
    }
    else {
        model.where(model.primaryKey).equal(this[model.primaryKey]).select(mapping.childField).flatten().asArray().first(function(err, result) {
            if (err) { return callback(err); }
            this[name] = result;
            return callback(null, result);
        });
    }
};
/**
 * @param {String} name
 * @param {function(Error=,*=)} callback
 */
DataObject.prototype.attr = function(name, callback)
{
    if (this.hasOwnProperty(name)) {
        callback(null, this[name]);
    }
    else {
        var self = this, model = self.getModel(), field = model.field(name);
        if (field) {
            var mapping = model.inferMapping(field.name);
            if (typeof mapping === 'undefined' || mapping == null) {
                if (self[model.primaryKey]) {
                    model.where(model.primaryKey).equal(self[model.primaryKey]).select([name]).first(function(err, result) {
                        if (err) { callback(err); return; }
                        var value = null;
                        if (result) {
                            value = result[name];
                        }
                        self[name]=value;
                        callback(null, value);
                    });
                }
                else {
                    if (model.constraints.length==0) {
                        callback(new Error( util.format('The value of property [%s] cannot be retrieved. The target data model has no constraints defined.', name)));
                    }
                    else {
                        var arr = model.constraints.filter(function(x) {
                            var valid = true;
                            if (x.fields.length==0)
                                return false;
                            for (var i = 0; i < x.fields.length; i++) {
                                var field = x.fields[i];
                                if (self.hasOwnProperty(field)==false) {
                                    valid = false;
                                    break;
                                }
                            }
                            return valid;
                        });
                        if (arr.length==0) {
                            callback(new Error( util.format('The value of property [%s] cannot be retrieved. The target data model has constraints but the required properties are missing.', name)));
                        }
                        else {
                            //get first constraint
                            var constraint = arr[0], q = null;
                            for (var i = 0; i < constraint.fields.length; i++) {
                                var attr = constraint.fields[i];
                                var value = self[attr];
                                if (q==null)
                                    q = model.where(attr).equal(value);
                                else
                                    q.and(attr).equal(value);
                            }
                            q.select([name]).first(function(err, result) {
                                if (err) { callback(err); return; }
                                var value = null;
                                if (result) {
                                    value = result[name];
                                }
                                self[name]=value;
                                callback(null, value);
                            });
                        }
                    }
                }
            }
            else {
                callback(null, self.property(name));
            }
        }
        else {
            callback(new Error('The specified field cannot be found.'));
        }

    }
};

/**
 * @param {DataContext} value
 * @returns {DataObject}
 * @private
 */
DataObject.prototype.setContext = function(value) {
    if (this.context === undefined )
    {
        var __context = null;
        Object.defineProperty(this,'context',{
            get: function() {
                return __context;
            } ,
            set: function(value) {
                __context=value;
            },
            enumerable:false,
            configurable:false
        });
    }
    this.context = value;
    return this;
};
/**
 *
 * @param {DataContext} context The current data context
 * @param {Function} fn A function that represents the code to be invoked
 */
DataObject.prototype.execute = function(context, fn) {
    var self = this;
    self.setContext(context);
    fn = fn || function() {};
    fn.call(self);
};

/**
 * Gets a DataQueryable object that is going to be used in order to get related items.
 * @param attr {string} A string that contains the relation attribute
 * @returns {DataQueryable}
 */
DataObject.prototype.query = function(attr)
{
    return new DataObjectRelation(this, attr);
};
/**
 * Saves the current data object by executing this action against the underlying database.
 * @param context {DataContext}
 * @param callback {Function}
 */
DataObject.prototype.save = function(context, callback) {
    var self = this, type = self.getType();
    if (!type) {
        callback.call(self, new Error('Object type cannot be empty during save operation.'));
        return;
    }
    //get current application
    var model = context.model(type);
    if (!model) {
        callback.call(self, new Error('Data model cannot be found.'));
        return;
    }
    var i;
    //register before listeners
    var beforeListeners = self.listeners('before.save');
    for (i = 0; i < beforeListeners.length; i++) {
        var beforeListener = beforeListeners[i];
        model.on('before.save', beforeListener);
    }
    //register after listeners
    var afterListeners = self.listeners('after.save');
    for (i = 0; i < afterListeners.length; i++) {
        var afterListener = afterListeners[i];
        model.on('after.save', afterListener);
    }
    model.save(self, callback);
};
/**
 * Deletes the current data object by executing this action against the underlying database.
 * @param context {DataContext}
 * @param callback {Function}
 */
DataObject.prototype.remove = function(context, callback) {
    var self = this;
    if (!self.type) {
        callback.call(self, new Error('Object type cannot be empty during delete operation.'));
        return;
    }
    //get current application
    var model = context.model(self.type);
    if (!model) {
        callback.call(self, new Error('Data model cannot be found.'));
        return;
    }
    //register before listeners
    var beforeListeners = self.listeners('before.remove');
    for (var i = 0; i < beforeListeners.length; i++) {
        var beforeListener = beforeListeners[i];
        model.on('before.remove', beforeListener);
    }
    //register after listeners
    var afterListeners = self.listeners('after.remove');
    for (var j = 0; j < afterListeners.length; j++) {
        var afterListener = afterListeners[j];
        model.on('after.remove', afterListener);
    }
    model.delete(self, callback);
};


if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @constructs DataObject
         */
        DataObject:DataObject

    };
}