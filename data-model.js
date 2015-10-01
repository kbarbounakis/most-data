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
var string = require('string'),
    util = require('util'),
    path = require("path"),
    fs = require("fs"),
    async = require('async'),
    events = require('events'),
    qry = require('most-query'),
    cfg = require('./data-configuration'),
    types = require('./types'),
    functions = require('./functions'),
    dataCache = require('./data-cache'),
    dataCommon = require('./data-common'),
    dataListeners = require('./data-listeners'),
    dataAssociations = require('./data-associations'),
    DataObject = require('./data-object').DataObject,
    DataQueryable = require('./data-queryable').DataQueryable,
    DataAttributeResolver = require('./data-queryable').DataAttributeResolver
    DataObjectAssociationListener = dataAssociations.DataObjectAssociationListener,
    DataField = types.DataField,
    DataModelView = require('./data-model-view').DataModelView;


/**
 * @class DataFilterResolver
 * @abstract
 * @constructor
 */
function DataFilterResolver() {
    //
}

DataFilterResolver.resolveMember = function(member, callback) {
    if (/\//.test(member)) {
        callback(null, member.replace(/\//, '.'));
    }
    else {
        callback(null, this.viewAdapter.concat('.', member))
    }
};

DataFilterResolver.resolveMethod = function(name, args, callback) {
    callback();
};

/**
 * @class EmptyQueryExpression
 * @constructor
 * @augments QueryExpression
 */
function EmptyQueryExpression() {
    //
}

/**
 * Database Object Management for node.js
 * @class {DataModel}
 * @property {Array} seed - An array instance that represents a collection of items to be seeded when the model is being upgraded for the first time
 * @property {string} classPath - Gets or sets a string which represents the path of the DataObject subclass associated with this model.
 * @constructor
 * @augments EventEmitter2
 * @param {*=} obj An object instance that holds data model attributes. This parameter is optional.
 */
function DataModel(obj) {
    /**
     * Gets or sets a string that represents the name of the model.
     * @type {string}
     */
    this.name = null;
    /**
     * Gets or sets an integer that represents an internal identifier.
     * @type {number}
     */
    this.id = null;
    /**
     * Gets or sets a boolean that indicates whether the current model is hidden or not.
     * @type {boolean}
     */
    this.hidden = false;
    /**
     * Gets or sets a title for a model object.
     * @type {null}
     */
    this.title = null;
    /**
     * Gets or sets a boolean that indicates whether model is sealed or not.
     * @type {boolean}
     */
    this.sealed = false;
    /**
     * Gets or sets a boolean that indicates whether model is an abstract model or not.
     * @type {boolean}
     */
    this.abstract = false;
    /**
     * Gets or sets a string that represents the version of the current model.
     * @type {string}
     */
    this.version = '0.1';
    /**
     * Gets or sets a string that represents an internal type for this model.
     * @type {string}
     */
    this.type = 'data';
    /**
     * Gets or sets a string that contains the model that is inherited by the current model.
     * @type {string}
     */
    this.inherits = undefined;
    /**
     *
     * @type {Array}
     */
    this.fields = [];
    /**
     * Gets or sets the array of listeners attached to this model
     * @type {Array}
     */
    this.eventListeners = [];
    /**
     * Gets or sets the array of constraints that are defined for this model
     * @type {Array}
     */
    this.constraints = [];
    /**
     * Gets or sets the array of views that are defined for this model
     * @type {Array}
     */
    this.views = [];
    /**
     * Gets or sets the array of privileges that are defined for this model
     * @type {Array}
     */
    this.privileges = [];
    /**
     * @type {string} - Gets or sets a string that contains the database source.
     */
    this.source = undefined;
    /**
     * @type {string} - Gets or sets a string that contains the database source.
     */
    this.view = undefined;

    //extend model if obj parameter is defined
    if (obj)
    {
        if (typeof obj === 'object')
            util._extend(this, obj);
    }

    /**
     * Gets or sets the underlying data adapter
     * @type {DataContext}
     * @private
     */
    var __context__ = null;
    var self = this;
    /**
     * @type {DataContext}
     */
    Object.defineProperty(this, 'context', { get: function() {
        return __context__;
    }, set: function(value) {
        __context__ = value;
    }, enumerable: false, configurable: false});

    /**
     * @type {string}
     */
    Object.defineProperty(this, 'sourceAdapter', { get: function() {
        return self.source!=null ? self.source :  self.name.concat('Base');
    }, enumerable: false, configurable: false});
    /**
     * @type {string}
     */
    Object.defineProperty(this, 'viewAdapter', { get: function() {
        return self.view!=null ? self.view :  self.name.concat('Data');
    }, enumerable: false, configurable: false});

    var pluralExpression = /([a-zA-Z]+?)([e']s|[^aiou]s)$/;
    /**
     * @type {Array}
     */
    var attributes;

    /**
     * Gets an array that contains all model attributes
     * @type {Array|*}
    */
    this.attributes = undefined;
    /**
     * @private
     */
    this._clearAttributes = function() {
        attributes = undefined;
    };

    /**
     * @type {Array} - Gets an array of objects that represents the collection of fields for this model. This collection contains
     * the fields defined in the current model and its parent.
     */
    Object.defineProperty(this, 'attributes', { get: function() {
        //validate self field collection
        if (typeof attributes !== 'undefined')
            return attributes;
        //init attributes collection
        attributes = [];
        //get base model (if any)
        var baseModel = self.base(), field;
        //enumerate fields
        self.fields.forEach(function(x) {
            if (typeof x.many === 'undefined') {
                if (typeof cfg.current.dataTypes[x.type] === 'undefined')
                    //set one-to-many attribute (based on a naming convention)
                    x.many = pluralExpression.test(x.name) || (x.mapping && x.mapping.associationType === 'junction');
                else
                    //otherwise set one-to-many attribute to false
                    x.many = false;
            }
            //re-define field model attribute
            if (typeof x.model === 'undefined')
                x.model = self.name;
            var clone = x;
            //if base model exists and current field is not primary key field
            if (baseModel && !x.primary) {
                //get base field
                field = baseModel.field(x.name);
                if (field) {
                    //clone field
                    clone = { };
                    //get all inherited properties
                    util._extend(clone, field);
                    //get all overriden properties
                    util._extend(clone, x);
                    //set field model
                    clone.model = field.model;
                }
            }
            //finally push field
            attributes.push(clone);
        });
        if (baseModel) {
            baseModel.attributes.forEach(function(x) {
                if (!x.primary) {
                    //check if member is overriden by the current model
                    field = self.fields.find(function(y) { return y.name == x.name; });
                    if (typeof field === 'undefined')
                        attributes.push(x);
                }
            });
        }
        return attributes;
    }, enumerable: false, configurable: false});
    /**
     * Gets the primary key name
     * @type String
    */
    this.primaryKey = undefined;
    Object.defineProperty(this, 'primaryKey' , { get: function() {
        var p = self.fields.find(function(x) { return x.primary==true; });
        if (p)
            return p.name;
        return null;
    }, enumerable: false, configurable: false});
    /**
     * Gets an array that contains model attribute names
     * @type Array
    */
    this.attributeNames = undefined;
    Object.defineProperty(this, 'attributeNames' , { get: function() {
        return self.attributes.map(function(x) {
            return x.name;
        });
    }, enumerable: false, configurable: false});
    Object.defineProperty(this, 'constraintCollection' , { get: function() {
        var arr = [];
        if (util.isArray(self.constraints)) {
            //apend constraints to collection
            self.constraints.forEach(function(x) {
                arr.push(x);
            });
        }
        //get base model
        var baseModel = self.base();
        if (baseModel) {
            //get base model constraints
            var baseArr = baseModel.constraintCollection;
            if (util.isArray(baseArr)) {
                //apend to collection
                baseArr.forEach(function(x) {
                    arr.push(x);
                });
            }
        }
        return arr;
    }, enumerable: false, configurable: false});

    //register listeners
    this.registerListeners();
    //call initialize method
    if (typeof this.initialize === 'function')
        this.initialize();
}
util.inherits(DataModel, types.EventEmitter2);

DataModel.prototype.initialize = function() {
    //
};

/**
 * Clones the current data model
 * @param {DataContext=} context The current data context
 * @returns {DataModel} Returns a new DataModel instance
 */
DataModel.prototype.clone = function(context) {
    var result = new DataModel(this);
    if (context)
        result.context = context;
    return result;
};
/**
 * Registers default model listeners
 * @protected
 */
DataModel.prototype.registerListeners = function() {

    var CalculatedValueListener = dataListeners.CalculatedValueListener,
        DefaultValueListener = dataListeners.DefaultValueListener,
        DataObjectCachingListener = require('./data-object-caching-listener').DataObjectCachingListener,
        DataStateValidatorListener = require('./data-state-validator').DataStateValidatorListener;

    //register system event listeners
    this.removeAllListeners('before.save');
    this.removeAllListeners('after.save');
    this.removeAllListeners('before.remove');
    this.removeAllListeners('after.remove');
    this.removeAllListeners('before.execute');
    this.removeAllListeners('after.execute');

    //0. Permission Event Listener
    var perms = require('./data-permission');
    //1. State validator listener
    this.on('before.save', DataStateValidatorListener.prototype.beforeSave);
    //2. Default values Listener
    this.on('before.save', DefaultValueListener.prototype.beforeSave);
    //3. Calculated values listener
    this.on('before.save', CalculatedValueListener.prototype.beforeSave);
    //before execute
    this.on('before.execute', perms.DataPermissionEventListener.prototype.beforeExecute);
    //before save (validate permissions)
    this.on('before.save', perms.DataPermissionEventListener.prototype.beforeSave);
    //before remove (validate permissions)
    this.on('before.remove', perms.DataPermissionEventListener.prototype.beforeRemove);
    //after save (clear caching)
    this.on('after.save', DataObjectCachingListener.prototype.afterSave);
    //after remove (clear caching)
    this.on('after.remove', DataObjectCachingListener.prototype.afterRemove);
    /**
     * change:8-Jun 2015
     * description: Set lookup default listeners as obsolete.
     */
    ////register lookup model listeners
    //if (this.type === 'lookup') {
    //    //after save (clear lookup caching)
    //    this.on('after.save', DataModelLookupCachingListener.afterSave);
    //    //after remove (clear lookup caching)
    //    this.on('after.remove', DataModelLookupCachingListener.afterRemove);
    //}
    //register configuration listeners
    if (this.eventListeners) {
        for (var i = 0; i < this.eventListeners.length; i++) {
            var listener = this.eventListeners[i];
            //get listener type (e.g. type: require('./custom-listener.js'))
            if (listener.type)
            {
                /**
                 * Load event listener from the defined type
                 * @type DataEventListener
                 */
                var m = listener.type.indexOf('/')==0 ? require(path.join(process.cwd(), listener.type)) : require(listener.type);
                //if listener exports beforeSave function then register this as before.save event listener
                if (typeof m.beforeSave == 'function')
                    this.on('before.save', m.beforeSave);
                //if listener exports afterSave then register this as after.save event listener
                if (typeof m.afterSave == 'function')
                    this.on('after.save', m.afterSave);
                //if listener exports beforeRemove then register this as before.remove event listener
                if (typeof m.beforeRemove == 'function')
                    this.on('before.remove', m.beforeRemove);
                //if listener exports afterRemove then register this as after.remove event listener
                if (typeof m.afterRemove == 'function')
                    this.on('after.remove', m.afterRemove);
                //if listener exports beforeExecute then register this as before.execute event listener
                if (typeof m.beforeExecute == 'function')
                    this.on('before.execute', m.beforeExecute);
                //if listener exports afterExecute then register this as after.execute event listener
                if (typeof m.afterExecute == 'function')
                    this.on('after.execute', m.afterExecute);
            }
        }
    }
};

DataModel.prototype.join = function(model) {
    var result = new DataQueryable(this);
    return result.join(model);
};

/**
 * Filters a data model based on the given attribute
 * @param {String|*} attr
 * @returns DataQueryable
*/
DataModel.prototype.where = function(attr) {
    var result = new DataQueryable(this);
    return result.where(attr);
};
/**
 * Returns a DataQueryable instance of the current model
 * @returns DataQueryable
 */
DataModel.prototype.asQueryable = function() {
    return new DataQueryable(this);
};


/**
 * Applies open data filter, ordering, grouping and paging params and returns the derived data queryable object
 * @param {String|{$filter:string=, $skip:number=, $top:number=, $take:number=, $order:string=, $inlinecount:string=, $expand:string=,$select:string=, $orderby:string=, $group:string=, $groupby:string=}} params - A string that represents an open data filter or an object with open data parameters
 * @param {function(Error=,DataQueryable=)} callback
 */
DataModel.prototype.filter = function(params, callback) {
    var self = this;
    var parser = qry.openData.createParser(), $joinExpressions = [];
    parser.resolveMember = function(member, cb) {
        var attr = self.field(member);
        if (attr)
            member = attr.name;
        if (/\//.test(member)) {
            try {
                var expr = DataAttributeResolver.prototype.resolveNestedAttributeJoin.call(self, member);
                if (expr) {
                    var joinExpr = $joinExpressions.find(function(x) {
                        if (x.$entity) {
                            if (x.$entity.$as) {
                                return (x.$entity.$as === expr.$entity.$as);
                            }
                        }
                        return false;
                    });
                    if (dataCommon.isNullOrUndefined(joinExpr))
                        $joinExpressions.push(expr);
                }
            }
            catch (err) {
                cb(err);
                return;
            }
        }
        if (typeof self.resolveMember === 'function')
            self.resolveMember.call(self, member, cb);
        else
            DataFilterResolver.resolveMember.call(self, member, cb);
    };
    parser.resolveMethod = function(name, args, cb) {
        if (typeof self.resolveMethod === 'function')
            self.resolveMethod.call(self, name, args, cb);
        else
            DataFilterResolver.resolveMethod.call(self, name, args, cb);
    };
    var filter;
    if (typeof params === 'string') {
        filter = params;
    }
    else if (typeof params === 'object') {
        filter = params.$filter;
    }
    parser.parse(filter, function(err, query) {
        if (err) {
            callback(err);
        }
        else {
            //create a DataQueryable instance
            var q = new DataQueryable(self);
            q.query.$where = query;
            if ($joinExpressions.length>0)
                q.query.$expand = $joinExpressions;
            //prepare
            q.query.prepare();

            if (typeof params === 'object') {
                //apply query parameters
                var select = params.$select,
                    skip = params.$skip || 0,
                    orderBy = params.$orderby || params.$order,
                    groupBy = params.$groupby || params.$group,
                    expand = params.$expand,
                    top = params.$top || params.$take;
                //set $select
                if (typeof select === 'string') {
                    arr = select.split(',');
                    if (arr.length>0)
                        q.select(arr);
                }
                //set $group
                var arr, fields, item, field;
                if (typeof groupBy === 'string') {
                    if (groupBy.length>0)
                        q.groupBy(groupBy.split(','));
                }
                //set $skip
                q.skip(skip);
                if (top)
                    q.query.take(top);
                //set $orderby
                if (orderBy) {
                    arr = orderBy.split(',');
                    for (var i = 0; i < arr.length; i++) {
                        item = string(arr[i]).trim().toString();
                        var name = null, direction = 'asc';
                        if (/ asc$/i.test(item)) {
                            name=item.substr(0,item.length-4);
                        }
                        else if (/ desc$/i.test(item)) {
                            direction = 'desc';
                            name=item.substr(0,item.length-5);
                        }
                        else if (!/\s/.test(item)) {
                            name = item;
                        }
                        if (name) {
                            field = self.field(name);
                            if (direction=='desc')
                                q.orderByDescending(name);
                            else
                                q.orderBy(name);
                        }
                    }
                }
                if (expand) {
                    if (expand.length>0) {
                        expand.split(',').map(function(x) { return x.replace(/\s/g,''); }).forEach(function(x) {
                            if (x.length)
                                q.expand(x.replace(/\s/g,''));
                        });
                    }
                }
                //return
                callback(null, q);
            }
            else {
                //and finally return DataQueryable instance
                callback(null, q);
            }

        }
    });
};
/**
 *
 * @param {string|*} constraint
 * @param {*} target
 * @returns {DataQueryable|undefined}
 */
function constraintAsQueryable(constraint, target) {
    /**
     * @type {DataModel|*}
     */
    var self = this, con = constraint;
    if (typeof constraint === 'string') {
        self.constraints = self.constraints || [];
        con = self.constraints.find(function(x) { return x.type === 'constraint'; });
        if (dataCommon.isNullOrUndefined(con)) {
             return;
        }
    }
    if (!dataCommon.isNullOrUndefined(target)) {
        con.fields = con.fields || [];
        if (con.fields.length==0) { return; }
        //enumerate fields
        var find = { }, result = new DataQueryable(self), value, bQueried = false;
        for (var i = 0; i < con.fields.length; i++) {
            var x = con.fields[i], field = self.field(x);
            if (dataCommon.isNullOrUndefined(field)) {
                throw new Error('A field which is defined in a constraint cannot be found in target model.');
            }
            if (target.hasOwnProperty(x)) {
                if (typeof target[x] !== 'undefined' && target[x] != null) {
                    var mapping = self.inferMapping(x);
                    if (typeof mapping === 'undefined' || mapping === null)
                        value = target[x];
                    else if ((mapping.associationType==='association') && (mapping.childModel===self.name)) {
                        if (typeof target[x] === 'object')
                            value = target[x][mapping.parentField];
                        else
                            value = target[x];
                    }
                    else {
                        //unsupported type of mapping
                        return;
                    }
                }
                else
                //cannot search by constraint because of null or undefined constraint field
                    return;
                //add query expression
                if (bQueried) {
                    result.and(x).equal(value);
                }
                else {
                    result.where(x).equal(value);
                    bQueried = true;
                }
            }
            else {
                //cannot search by constraint because of missing field
                return;
            }
        }
    }
}

/**
 *
 * @param {*} obj An object that is going t
 * @returns DataQueryable
 */
DataModel.prototype.find = function(obj) {
    var self = this, result;
    if (dataCommon.isNullOrUndefined(obj))
    {
        result = new DataQueryable(this);
        result.where(self.primaryKey).equal(null);
        return result;
    }
    //cast object
    var find = {};
    self.attributeNames.forEach(function(x)
    {
        if (obj.hasOwnProperty(x))
        {
            find[x] = obj[x];
        }
    });

    if (find.hasOwnProperty(self.primaryKey)) {
        result = new DataQueryable(this);
        return result.where(self.primaryKey).equal(find[self.primaryKey]);
    }
    else {
        result = new DataQueryable(this);
        var bQueried = false;
        //enumerate properties and build query
        for(var key in find) {
            if (find.hasOwnProperty(key)) {
                if (!bQueried) {
                    result.where(key).equal(find[key]);
                    bQueried = true;
                }
                else
                    result.and(key).equal(find[key]);
            }
        }
        if (!bQueried) {
            //there is no query defined a dummy one (e.g. primary key is null)
            result.where(self.primaryKey).equal(null);
        }
        return result;
    }
};

/**
 * Selects an attribute or a collection of attributes
 * @param {String|Array} attr
 * @returns DataQueryable
*/
DataModel.prototype.select = function(attr) {
    var result = new DataQueryable(this);
    return result.select(attr);
};

/**
 * Sorts data model items based on the given attribute
 * @param {String|Array} attr
 * @returns DataQueryable
*/
DataModel.prototype.orderBy = function(attr) {
    var result = new DataQueryable(this);
    return result.orderBy(attr);
};

/**
 * Returns an array of items based on the given parameter
 * @param {Number} n - The number of items that is going to be retrieved
 * @param {Function} callback - A callback function that will be invoked.
 * @returns DataQueryable|undefined
 */
DataModel.prototype.take = function(n, callback) {
    //default size (25)
    n = n || 25;
    var result = new DataQueryable(this);
    if (typeof callback === 'undefined')
        return result;
    result.take(n, callback);
};

DataModel.prototype.list = function(callback) {
    //default size (25)
    n = n || 25;
    var result = new DataQueryable(this);
    result.list(callback);
};

/**
 * Returns the first data item.
 * @param {Function} callback - A callback function that will be invoked.
*/
DataModel.prototype.first = function(callback) {
    var result = new DataQueryable(this);
    return result.select(this.attributeNames).first(callback);
};

/**
 * Returns a data item based on the given key.
 * @param {String} key
 * @param {Function} callback - A callback function that will be invoked.
*/
DataModel.prototype.get = function(key, callback) {
    var result = new DataQueryable(this);
    result.where(this.primaryKey).equal(key).first(callback);
};

/**
 * Returns the last data item.
 * @param {Function} callback - A callback function that will be invoked.
*/
DataModel.prototype.last = function(callback) {
    var result = new DataQueryable(this);
    return result.orderByDescending(this.primaryKey).select(this.attributeNames).first(callback);
};

/**
 * Returns all data items.
 * @param {Function} callback - A callback function that will be invoked.
*/
DataModel.prototype.all = function(callback) {
    var result = new DataQueryable(this);
    return result.select(this.attributeNames).all(callback);
};

/**
 * Bypasses a number of items based on the given parameter
 * @param {Number} n
 * @returns DataQueryable
*/
DataModel.prototype.skip = function(n) {
    var result = new DataQueryable(this);
    return result.skip(n);
};

/**
 * Sorts data model items in descending order based on the given attribute
 * @param {String|Array} attr
 * @returns DataQueryable
*/
DataModel.prototype.orderByDescending = function(attr) {
    var result = new DataQueryable(this);
    return result.orderBy(attr);
};

/**
 * Returns the maximum value for a column.
 * @param {String} attr
 * @param {Function} callback - A callback function that will be invoked.
 */
DataModel.prototype.max = function(attr, callback) {
    var result = new DataQueryable(this);
    return result.max(attr, callback);
};

/**
 * Returns the minimum value for a column.
 * @param {String} attr
 * @param {Function} callback - A callback function that will be invoked.
 */
DataModel.prototype.min = function(attr, callback) {
    var result = new DataQueryable(this);
    return result.min(attr, callback);
};

/**
 * Gets a DataModel object that represents the base of the current model if any.
 * @returns {DataModel}
 */
DataModel.prototype.base = function()
{
    if (this.inherits==null)
        return null;
    if (this.context==null)
        throw new Error("The underlying data context cannot be empty.");
    return this.context.model(this.inherits);
};
/**
 * @private
 * @param {*} obj
 */
DataModel.prototype.convertInternal = function(obj) {
    var self = this;
    //get type parsers (or default type parsers)
    var parsers = self.parsers || types.parsers, parser, value;
    self.attributes.forEach(function(x) {
        value = obj[x.name];
        if (value) {
            //get parser for this type
            parser = parsers['parse'.concat(x.type)];
            //if a parser exists
            if (typeof parser === 'function')
            //parse value
                obj[x.name] = parser(value);
            else {
                //get mapping
                var mapping = self.inferMapping(x.name);
                if (mapping) {
                    if ((mapping.associationType==='association') && (mapping.childModel===self.name)) {
                        var associatedModel = self.context.model(mapping.parentModel);
                        if (associatedModel) {
                            if (typeof value === 'object') {
                                //set associated key value (e.g. primary key value)
                                associatedModel.convertInternal(value);
                            }
                            else {
                                var field = associatedModel.field(mapping.parentField);
                                if (field) {
                                    //parse raw value
                                    parser = parsers['parse'.concat(field.type)];
                                    if (typeof parser === 'function')
                                        obj[x.name] = parser(value);
                                }
                            }
                        }
                    }
                }
            }
        }
    });
};

/**
 * Converts an object or a collection of objects to the corresponding data instance
 * @param {Array|*} obj
 * @param {boolean=} typeConvert - Forces property value conversion for each property based on field type.
 * @returns {DataObject|Array|*}
 */
DataModel.prototype.convert = function(obj, typeConvert)
{
    var self = this;
    if (typeof obj === 'undefined' || obj == null)
        return null;
    /**
     * @constructor
     * @augments DataObject
     */
    var DataObjectClass = self['DataObjectClass'];
    if (typeof DataObjectClass === 'undefined')
    {
        if (typeof self.classPath === 'string') {
            DataObjectClass = require(self.classPath);
        }
        else {
            //try to find class file with data model's name in lower case
            // e.g. OrderDetail -> orderdetail-model.js (backward compatibility naming convention)
            var classPath = path.join(process.cwd(),'app','models',self.name.toLowerCase().concat('-model.js'));
            try {
                DataObjectClass = require(classPath);
            }
            catch(e) {
                if (e.code === 'MODULE_NOT_FOUND') {
                    try {
                        //if the specified class file was not found try to dasherize model name
                        // e.g. OrderDetail -> order-detail-model.js
                        classPath = path.join(process.cwd(),'app','models',dataCommon.dasherize(self.name).concat('-model.js'));
                        DataObjectClass = require(classPath);
                    }
                    catch(e) {
                        if (e.code === 'MODULE_NOT_FOUND') {
                            //if , finally, we are unable to find class file, load default DataObject class
                            DataObjectClass = DataObject;
                        }
                        else {
                            throw e;
                        }
                    }
                }
                else {
                    throw e;
                }
            }
        }
        //cache DataObject class property
        cfg.current.models[self.name]['DataObjectClass'] = self['DataObjectClass'] = DataObjectClass;
    }

    if (util.isArray(obj)) {
        var arr = [], src;
        obj.forEach(function(x) {
            if (typeof x !== 'undefined' && x!=null) {
                var o = new DataObjectClass();
                if (typeof x === 'object') {
                    util._extend(o, x);
                }
                else {
                    src = {}; src[self.primaryKey] = x;
                    util._extend(o, src);
                }
                if (typeConvert)
                    self.convertInternal(o);
                o.context = self.context;
                o.type = self.name;
                arr.push(o);
            }
        });
        return arr;
    }
    else {
        var result = new DataObjectClass();
        if (typeof obj === 'object') {
            util._extend(result, obj);
        }
        else {
            src = {}; src[self.primaryKey] = obj;
            util._extend(result, src);
        }
        if (typeConvert)
            self.convertInternal(result);
        result.context = self.context;
        result.type = self.name;
        return result;
    }
};
/**
 * Extracts an identifier from the given parameter.
 * If the parameter is an object then gets the identifier property, otherwise tries to convert the given parameter to an identifier
 * suitable for this model.
 * @param {*} obj
 * @returns {*|undefined}
 */
DataModel.prototype.idOf = function(obj) {
    if (typeof obj === 'undefined')
        return;
    if (obj===null)
        return;
    if (typeof this.primaryKey === 'undefined' || this.primaryKey == null)
        return;
    if (typeof obj === 'object')
        return obj[this.primaryKey];
    return obj;
};

DataModel.prototype.cast = function(obj)
{
    var self = this;
    if (obj==null)
        return {};
    if (typeof obj === 'object' && obj instanceof Array)
    {
        return obj.map(function(x) {
            return self.cast(x);
        });
    }
    else
    {
        var result = {}, name;
        self.attributes.forEach(function(x) {
            name = obj.hasOwnProperty(x.property) ? x.property : x.name;
            if (obj.hasOwnProperty(name))
            {
                if (!(x.readonly && typeof x.value==='undefined') && (x.model===self.name)) {
                    var mapping = self.inferMapping(name);
                    if (typeof mapping === 'undefined' || mapping === null)
                        result[x.name] = obj[name];
                    else if ((mapping.associationType==='association') && (mapping.childModel===self.name)) {
                        if ((typeof obj[name] === 'object') && (obj[name] != null))
                            //set associated key value (e.g. primary key value)
                            result[x.name] = obj[name][mapping.parentField];
                        else
                            //set raw value
                            result[x.name] = obj[name];
                    }
                }
            }
        });
        return result;
    }
};
/**
 * @param {*} dest
 * @param {*} src
 * @param {function(Error=)} callback
 */
DataModel.prototype.recast = function(dest, src, callback)
{
    callback = callback || function() {};
    var self = this;
    if (typeof src === 'undefined' || src === null) {
        callback();
        return;
    }
    if (typeof dest === 'undefined' || dest === null) {
        dest = { };
    }
    async.eachSeries(self.fields, function(field, cb) {
        try {
            if (src.hasOwnProperty(field.name)) {
                //ensure db property removal
                if (field.property && field.property!==field.name)
                    delete dest[field.name];
                var mapping = self.inferMapping(field.name), name = field.property || field.name;
                if (typeof mapping=== 'undefined' || mapping === null) {
                    //set destination property
                    dest[name] = src[field.name];
                    cb(null);
                }
                else if (mapping.associationType==='association') {

                    if (typeof dest[name] === 'object' && dest[name] ) {
                        //check associated object
                        if (dest[name][mapping.parentField]===src[field.name]) {
                            //return
                            cb(null);
                        }
                        else {
                            //load associated item
                            var associatedModel = self.context.model(mapping.parentModel);
                            associatedModel.where(mapping.parentField).equal(src[field.name]).silent().first(function(err, result) {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    dest[name] = result;
                                    //return
                                    cb(null);
                                }
                            });
                        }
                    }
                    else {
                        //set destination property
                        dest[name] = src[field.name];
                        cb(null);
                    }
                }
            }
            else {
                cb(null);
            }
        }
        catch (e) {
            cb(e);
        }
    }, function(err) {
        callback(err);
    });
};





/**
 *
 * @param obj {*}
 * @returns {*}
 */
DataModel.prototype.new = function(obj)
{
    return this.cast(obj);
};
/**
 * @param obj {Array|*}
 * @param callback {Function}
 */
DataModel.prototype.save = function(obj, callback)
{
    var self = this;
    if (typeof obj=='undefined' || obj == null) {
        callback.call(self, null);
        return;
    }
    //ensure migration
    self.migrate(function(err) {
       if (err) { callback(err); return; }
        //do save
        var arr = [];
        if (util.isArray(obj)) {
            for (var i = 0; i < obj.length; i++)
                arr.push(obj[i]);
        }
        else
            arr.push(obj);
        var db = self.context.db;
        var res = [];
        db.executeInTransaction(function(cb) {
            async.eachSeries(arr, function(item, saveCallback) {
                self.saveSingleObject(item, function(err, result) {
                    if (err) {
                        saveCallback.call(self, err);
                        return;
                    }
                    res.push(result.insertedId);
                    saveCallback.call(self, null);
                });
            }, function(err) {
                if (err) {
                    res = null;
                    cb(err);
                    return;
                }
                cb(null);
            });
        }, function(err) {
            callback.call(self, err, res);
        });
    });

};
/**
 *
 * @param {DataObject|*} obj
 * @param {function(Error=,*=)} callback
 */
DataModel.prototype.inferState = function(obj, callback) {
    var self = this,
        DataStateValidatorListener = require('./data-state-validator').DataStateValidatorListener;
    var e = { model:self, target:obj };
    DataStateValidatorListener.prototype.beforeSave(e, function(err) {
        //if error return error
        if (err) { return callback(err); }
        //otherwise return the calucated state
        callback(null, e.state);
    });
};
/**
 * Saves the base object if any.
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
DataModel.prototype.saveBaseObject = function(obj, callback) {
    //ensure callback
    callback = callback || function() {};
    var self = this, base = self.base();
    //if obj is an array of objects throw exception (invoke callback with error)
    if (util.isArray(obj)) {
        callback.call(self, new Error('Invalid argument. Base object cannot be an array.'));
        return 0;
    }
    //if current model does not have a base model
    if (base==null) {
        //exit operation
        callback.call(self, null);
    }
    else {
        //perform operation
        base.saveSingleObject(obj, function(err, result) {
            callback.call(self, err, result);
        });
    }
};
/**
 * Saves a single object and performs all the operation needed.
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
DataModel.prototype.saveSingleObject = function(obj, callback) {
    var self = this,
        NotNullConstraintListener = dataListeners.NotNullConstraintListener,
        UniqueContraintListener = dataListeners.UniqueContraintListener;
    callback = callback || function() {};
    if (obj==null) {
        callback.call(self);
        return;
    }
    if (util.isArray(obj)) {
        callback.call(self, new Error('Invalid argument. Source object cannot be an array.'));
        return 0;
    }
    if (obj.$state == 4) {
        return self.removeSingleObject(obj, callback);
    }
    //get object state before any other operation
    var state = obj.$state ? obj.$state : (obj[self.primaryKey]!=null ? 2 : 1);
    var e = {
        model: self,
        target: obj,
        state:state
    };
    //register data association listener
    self.once('after.save', DataObjectAssociationListener.prototype.afterSave);
    //register unique constraint listener at the end of listeners collection (before emit)
    self.once('before.save', UniqueContraintListener.prototype.beforeSave);
    //register not null listener at the end of listeners collection (before emit)
    self.once('before.save', NotNullConstraintListener.prototype.beforeSave);
    //execute before update events
    self.emit('before.save', e, function(err) {
        //if an error occured
        if (err) {
            //invoke callback with error
            callback.call(self, err);
        }
        //otherwise execute save operation
        else {
            //save base object if any
            self.saveBaseObject(e.target, function(err, result) {
                if (err) {
                    callback.call(self, err);
                    return;
                }
                //if result is defined
                if (result!==undefined)
                //sync original object
                    util._extend(e.target, result);
                //get db context
                var db = self.context.db;
                //create insert query
                var target = self.cast(e.target);
                var q = null, key = target[self.primaryKey];
                if (e.state==1)
                    //create insert statement
                    q = qry.insert(target).into(self.sourceAdapter);
                else
                {
                    //create update statement
                    if (key)
                        delete target[self.primaryKey];
                    if (Object.keys(target).length>0)
                        q = qry.update(self.sourceAdapter).set(target).where(self.primaryKey).equal(e.target[self.primaryKey]);
                    else
                        //object does not have any properties other than primary key. do nothing
                        q = new EmptyQueryExpression();
                }
                if (q instanceof EmptyQueryExpression) {
                    if (key)
                        target[self.primaryKey] = key;
                    //get updated object
                    self.recast(e.target, target, function(err) {
                        if (err) {
                            callback.call(self, err);
                        }
                        else {
                            //execute after update events
                            self.emit('after.save',e, function(err) {
                                //invoke callback
                                callback.call(self, err, e.target);
                            });
                        }
                    });
                }
                else {
                    var pm = e.model.field(self.primaryKey), nextIdentity, adapter = e.model.sourceAdapter;
                    //search if adapter has a nextIdentity function (also primary key must be a counter and state equal to insert)
                    if (pm.type === 'Counter' && typeof db.nextIdentity === 'function' && e.state==1) {
                        nextIdentity = db.nextIdentity;
                    }
                    else {
                        //otherwise use a dummy nextIdentity function
                        nextIdentity = function(a, b, callback) { return callback(); }
                    }
                    nextIdentity.call(db, adapter, pm.name, function(err, insertedId) {
                        if (err) { return callback.call(self, err); }
                        if (insertedId) {
                            //get object to insert
                            if (q.$insert) {
                                var o = q.$insert[adapter];
                                if (o) {
                                    //set the generated primary key
                                    o[pm.name] = insertedId;
                                }
                            }
                        }
                        db.execute(q, null, function(err, result) {
                            if (err) {
                                callback.call(self, err);
                            }
                            else {
                                if (key)
                                    target[self.primaryKey] = key;
                                //get updated object
                                self.recast(e.target, target, function(err) {
                                    if (err) {
                                        callback.call(self, err);
                                    }
                                    else {
                                        if (pm.type==='Counter' && typeof db.nextIdentity !== 'function' && e.state==1) {
                                            //if data adapter contains lastIdentity function
                                            var lastIdentity = db.lastIdentity || function(lastCallback) {
                                                    if (typeof result === 'undefined' || result === null)
                                                        lastCallback(null, { insertId: null});
                                                    lastCallback(null, result);
                                                };
                                            lastIdentity.call(db, function(err, lastResult) {
                                                if (lastResult)
                                                    if (lastResult.insertId)
                                                        e.target[self.primaryKey] = lastResult.insertId;
                                                //raise after save listeners
                                                self.emit('after.save',e, function(err) {
                                                    //invoke callback
                                                    callback.call(self, err, e.target);
                                                });
                                            });
                                        }
                                        else {
                                            //raise after save listeners
                                            self.emit('after.save',e, function(err) {
                                                //invoke callback
                                                callback.call(self, err, e.target);
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    });

                }
            });
        }
    });
};
DataModel.prototype.superTypes = function() {
    var result=[];
    var baseModel = this.base();
    while(baseModel!=null) {
        result.unshift(baseModel);
        baseModel = baseModel.base();
    }
    return result;
};

/**
 * Inserts an item or an array of items
 * @param obj {*|Array} The item or the array of items to insert
 * @param callback {Function=} A callback function that raises the error and the result of this operation.
 */
DataModel.prototype.insert = function(obj, callback)
{
    var self = this, key = self.key();
    //ensure callback
    callback = callback || function() {};
    if ((obj==null) || obj === undefined) {
        callback.call(self, null);
    }

    var setState = function(x, state) {
        Object.defineProperty(x,'$state',{
            get: function() {
                return state;
            }
            ,configurable:false,enumerable:false
        });
    };

    //todo::validate state for each object
    if (!util.isArray(obj))
    {
        if (key.type=='Counter') {
            if (obj[key])
                callback.call(self,new Error('Invalid object state. Primary key cannot be defined while an object is going to be inserted.'));
        }
        setState(obj, 1);
    }
    else {
        obj.forEach(function(x) {
            setState(x, 1);
        });
    }
    this.save(obj, callback);
};

/**
 * Updates an item or an array of items
 * @param obj {*|Array} The item or the array of items to insert
 * @param callback {Function=} A callback function that raises the error and the result of this operation.
 */
DataModel.prototype.update = function(obj, callback)
{
    var self = this, key = self.key();
    //ensure callback
    callback = callback || function() {};
    if ((obj==null) || obj === undefined) {
        callback.call(self, null);
    }
    //todo::validate state for each object
    if (!util.isArray(obj))
    {
        if (key.type=='Counter') {
            if (!obj[key])
                callback.call(self,new Error('Invalid object state. Primary key cannot be empty while an object is going to be updated.'));
        }
    }
    this.save(obj, callback);
};

/**
 * Deletes an item or an array of items
 * @param obj {*|Array} The item or the array of items to delete
 * @param callback {Function=} A callback function that raises the error and the result of this operation.
 */
DataModel.prototype.remove = function(obj, callback)
{
    var self = this;
    if (obj==null)
    {
        callback.call(self, null);
        return;
    }

    self.migrate(function(err) {
        if (err) { callback(err); return; }
        var arr = [];
        if (util.isArray(obj)) {
            for (var i = 0; i < obj.length; i++)
                arr.push(obj[i]);
        }
        else
            arr.push(obj);
        //delete objects
        var db = self.context.db;
        db.executeInTransaction(function(cb) {
            async.eachSeries(arr, function(item, removeCallback) {
                self.removeSingleObject(item, function(err, result) {
                    if (err) {
                        removeCallback.call(self, err);
                        return;
                    }
                    removeCallback.call(self, null);
                });
            }, function(err) {
                if (err) {
                    cb(err);
                    return;
                }
                cb(null);
            });
        }, function(err) {
            callback.call(self, err);
        });
    });
};

/**
 * Deletes a single object and performs all the operation needed.
 * @param {Object} obj
 * @param {Function} callback
 * @private
 */
DataModel.prototype.removeSingleObject = function(obj, callback) {
    var self = this;
    callback = callback || function() {};
    if (obj==null) {
        callback.call(self);
        return;
    }
    if (util.isArray(obj)) {
        callback.call(self, new Error('Invalid argument. Object cannot be an array.'));
        return 0;
    }
    var e = {
        model: self,
        target: obj,
        state:4
    };

    //register data association listener
    self.once('before.remove', DataObjectAssociationListener.prototype.afterSave);

    //execute before update events
    self.emit('before.remove', e, function(err, result) {
        //if an error occured
        if (err) {
            //invoke callback with error
            callback.call(self, err);
        }
        //otherwise execute save operation
        else {
            //save base object if any
            self.removeBaseObject(e.target, function(err, result) {
                //if result is defined
                if (result!==undefined)
                //sync original object
                    util._extend(e.target, result);
                //get db context
                var db = self.context.db;
                //create delete query
                var q = qry.deleteFrom(self.sourceAdapter).where(self.primaryKey).equal(obj[self.primaryKey]);
                db.execute(q, null, function(err) {
                    if (err) {
                        callback.call(self, err);
                    }
                    else {
                        //execute after update events
                        self.emit('after.remove',e, function(err) {
                            //invoke callback
                            callback.call(self, err, e.target);
                        });
                    }
                });
            });
        }
    });
};

/**
 * Deletes the base object if any.
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
DataModel.prototype.removeBaseObject = function(obj, callback) {
    //ensure callback
    callback = callback || function() {};
    var self = this, base = self.base();
    //if obj is an array of objects throw exception (invoke callback with error)
    if (util.isArray(obj)) {
        callback.call(self, new Error('Invalid argument. Object cannot be an array.'));
        return 0;
    }
    //if current model does not have a base model
    if (base==null) {
        //exit operation
        callback.call(self, null);
    }
    else {
        //perform operation
        base.removeSingleObject(obj, function(err, result) {
            callback.call(self, err, result);
        });
    }
};

/**
 * Validates that the given string is plural or not.
 * @param s {string}
 * @returns {boolean}
 * @private
 */
DataModel.PluralExpression = /([a-zA-Z]+?)([e']s|[^aiou]s)$/;
/**
 * Ensures model data adapter.
 * @param callback
 */
DataModel.prototype.ensureModel = function(callback) {
    var self = this;
    if (self.name=='Migration') {
        //do nothing
        callback(null);
        return;
    }
    //get migration model
    var migrationModel = new DataModel(cfg.current.models.Migration);
    migrationModel.context = self.context;
    //ensure migration
    var version = self.version!=null ? self.version : '0.0';
    migrationModel.where('appliesTo').equal(self.sourceAdapter).and('version').equal(version).count(function(err, result) {
        if (err) {
            callback(err);
        }
        else {
            if (result>0) {
                callback(null);
            }
            else {
                self.migrate(callback);
            }
        }
    });
};

/**
 * Migrates current data model based on current definition
 * @param {Function} callback
 */
DataModel.prototype.migrate = function(callback)
{
    var self = this;
    //cache: data model migration
    //prepare migration cache
    cfg.current.cache = cfg.current.cache || {};
    cfg.current.cache[self.name] = cfg.current.cache[self.name] || {};
    if (cfg.current.cache[self.name].version==self.version) {
        //model has already been migrated, so do nothing
        callback();
        return;
    }
    //do not migrate sealed models
    if (self.sealed) {
        callback();
        return;
    }
    var context = self.context;
    //do migration
    var fields = self.attributes.filter(function(x) {
        return (self.name== x.model) && (!x.many);
    });

    if ((fields==null) || (fields.length==0))
        throw new Error("Migration is not valid for this model. The model has no fields.");
    var migration = new types.DataModelMigration();
    migration.add = fields;
    migration.version = self.version!=null ? self.version : '0.0';
    migration.appliesTo = self.sourceAdapter;
    migration.model = self.name;
    migration.description = util.format('%s migration (version %s)', this.title, migration.version);
    if (context==null)
        throw new Error("The underlying data context cannot be empty.");

    //get all related models
    var models = [];
    self.fields.filter(function(x) {
        return (!cfg.current.dataTypes[x.type] && (self.name!=x.type));
    }).forEach(function(x) {
        var m = context.model(x.type);
        if (m) {
            var m1 = models.find(function(y) {
                return y.name == m.name;
            });
        }

    });
    //first of all migrate base models if any
    var baseModel = self.base(), db = context.db;
    if (baseModel!=null) {
        models.push(baseModel);
    }
    //execute transaction
    db.executeInTransaction(function(tr) {
        if (models.length==0) {
            db.migrate(migration, function(err) {
                if (err) { tr(err); return; }
                if (migration['updated']) {
                    tr(null);
                    return;
                }
                self.migrateInternal(db, function(err) {
                    if (err) { tr(err); return; }
                    tr(null);
                });
            });
        }
        else {
            async.eachSeries(models,function(m, cb)
            {
                if (m)
                    m.migrate(cb);
                else
                    cb(null);
            }, function(err) {
                if (err) { tr(err); return; }
                db.migrate(migration, function(err) {
                    if (err) { tr(err); return; }
                    if (migration['updated']) {
                        tr(null);
                        return;
                    }
                    self.migrateInternal(db, function(err) {
                        if (err) { tr(err); return; }
                        tr(null);
                    });
                });
            });
        }
    }, function(err) {
        if (!err) {
            //set migration info to configuration cache (cfg.current.cache.model.version=[current version])
            //cache: data model migration
            cfg.current.cache[self.name].version = self.version;
        }
        callback(err);
    });
}
/**
 * @param db {DataAdapter}
 * @param callback {Function}
 * @private
 */
DataModel.prototype.migrateInternal = function(db, callback) {

    var self = this;
    var view = self.viewAdapter, adapter = self.sourceAdapter;
    if (view==adapter) {
        //exit (with no action)
        callback(null);
        return;
    }
    var baseModel = self.base();
    //get array of fields
    var fields = self.attributes.filter(function(x) {
        return (self.name== x.model) && (!x.many);
    }).map(function(x) {
        return qry.fields.select(x.name).from(adapter);
    });
    /**
     * @type {QueryExpression}
     */
    var q = qry.query(adapter).select(fields);
    //get base adapter
    var baseAdapter = (baseModel!=null) ? baseModel.name.concat('Data') : null, baseFields = [];
    //enumerate columns of base model (if any)
    if (baseModel!=null) {
        baseModel.attributes.forEach(function(x) {
            //get all fields (except primary and one-to-many relations)
            if ((!x.primary) && (!x.many))
                baseFields.push(qry.fields.select(x.name).from(baseAdapter))
        });
    }
    if (baseFields.length>0)
    {
        var from = qry.createField(adapter, self.key().name),
            to = qry.createField(baseAdapter, self.base().key().name);
        q.$expand = { $entity: { },$with:[] };
        q.$expand.$entity[baseAdapter]=baseFields;
        q.$expand.$with.push(from);
        q.$expand.$with.push(to);
    }
    //execute query
    db.createView(view, q, function(err) {
        if (err) {
            callback(err);
        }
        else {
            self.seedInternal(callback);
        }
    });
};

DataModel.prototype.seedInternal = function(callback) {
    var self = this;
    try {
        /**
         * Gets items to be seeded
         * @type {Array}
         */
        var items = self['seed'];
        //if model has an array of items to be seeded
        if (util.isArray(items)) {
            if (items.length==0) {
                //if seed array is empty exit
                callback(); return;
            }
            //try to insert items if model does not have any record
            self.asQueryable().silent().flatten().count(function(err, count) {
                if (err) {
                    callback(err); return;
                }
                //if model has no data
                if (count==0) {
                    //set items state to new
                    items.forEach(function(x) {x.$state=1; });
                    //check for unattended execution support
                    if (typeof self.context.unattended === 'function') {
                        self.context.unattended(function(cb) {
                            //seed items
                            self.save(items, cb);
                        }, function(err) {
                            callback(err);
                        });
                    }
                    else {
                        //seed items
                        self.save(items, callback);
                    }
                }
                else {
                    //model was already seeded
                    callback();
                }
            });
        }
        else {
            //do nothing and exit
            callback();
        }
    }
    catch (e) {
        callback(e);
    }
}

/**
 * Gets the primary key.
 * @return {DataField}
 */
DataModel.prototype.key = function()
{
    return this.fields.find(function(x) { return x.primary==true; });
};
/**
 * Gets a field based on the given name.
 * @param {String} name - The name of the field.
 * @return {DataField} - Returns a data field if exists. Otherwise returns null.
 */
DataModel.prototype.field = function(name)
{
    if (typeof name !== 'string')
        return null;
    return this.attributes.find(function(x) { return (x.name==name) || (x.property==name); });
};
/**
 *
 * @param {string|*} attr
 * @param {string=} alias
 * @returns {DataQueryable|QueryField|*}
 */
DataModel.prototype.fieldOf = function(attr, alias) {
    var q = new DataQueryable(this);
    return q.fieldOf(attr, alias);
};

/**
 * Gets the specified model view
 * @param {string} name
 * @param {DataModelView} obj
 * @returns {DataModelView|undefined}
 */
DataModel.prototype.dataviews = function(name, obj) {
    var self = this;
    //todo::add or update data view
    if (typeof obj !== 'undefined')
        throw new Error('Not implemented.');
    var re = new RegExp('^' + name.replace('$','\$') + '$', 'ig');
    var view = self.views.filter(function(x) { return re.test(x.name);})[0];
    if (dataCommon.isNullOrUndefined(view))
        return;
    return util._extend(new DataModelView(self), view);
};
/**
 * Caches a mapping associated with the given field
 * @param {DataField|*} field
 * @param {DataAssociationMapping|*} mapping
 * @private
 */
DataModel.prototype.cacheMappingInternal  = function(field, mapping) {
    if (typeof field === 'undefined' || field == null)
        return;
    //cache mapping
    var cachedModel = cfg.current.models[this.name];
    if (cachedModel) {
        var cachedField = cachedModel.fields.find(function(x) { return x.name === field.name });
        if (typeof cachedField === 'undefined') {
            //search in attributes
            cachedField = this.attributes.find(function(x) { return x.name === field.name });
            if (cachedField) {
                //add overriden field
                cachedModel.fields.push(util._extend({}, cachedField));
                cachedField = cachedModel.fields[cachedModel.fields.length-1];
                //clear attributes
                this._clearAttributes();
            }
        }
        if (cachedField)
        //add mapping
            cachedField.mapping = mapping;
    }
};

/**
 * Gets a field association mapping based on field attributes, if any. Otherwise returns null.
 * @param {String} name The name of the field
 */
DataModel.prototype.inferMapping = function(name) {
    var self = this;
    var field = self.field(name), result;

    if (!field)
        return null;
    if (field.mapping) {
        //validate mapping
        return util._extend(new types.DataAssociationMapping(), field.mapping);
    }
    else {
        //get field model type
        var associatedModel = self.context.model(field.type);
        if (associatedModel==null)
        {
            return null;
        }
        //in this case we have two possible associations. Junction or Foreign Key association
        //try to find a field that belongs to the associated model and holds the foreign key of this model.
        var associatedField = associatedModel.attributes.find(function(x) {
           return x.type== self.name;
        });
        if (associatedField)
        {
            if (associatedField.many)
            {
                //return a data relation (parent model is the associated model)
                result = new types.DataAssociationMapping({
                    parentModel:associatedModel.name,
                    parentField:associatedModel.primaryKey,
                    childModel:self.name,
                    childField:field.name,
                    associationType:'association',
                    cascade:'null',
                    oneToOne:false
                });
                //cache mapping
                self.cacheMappingInternal(field, result);
                //and finally return mapping
                return result;
            }
            else
            {
                //return a data relation (parent model is the current model)
                result = new types.DataAssociationMapping({
                    parentModel:self.name,
                    parentField:self.primaryKey,
                    childModel:associatedModel.name,
                    childField:associatedField.name,
                    associationType:'association',
                    cascade:'null',
                    oneToOne:false,
                    refersTo:field.property || field.name
                });
                //cache mapping
                self.cacheMappingInternal(field, result);
                //and finally return mapping
                return result;
            }
        }
        else {

            //validate pluralize
            var re = new RegExp(DataModel.PluralExpression.source);
            if (re.test(field.name) || field.many) {
                //return a data junction
                result = new types.DataAssociationMapping({
                    associationAdapter: self.name.concat(string(field.name).capitalize()),
                    parentModel: self.name, parentField: self.primaryKey,
                    childModel: associatedModel.name,
                    childField: associatedModel.primaryKey,
                    associationType: 'junction',
                    cascade: 'delete',
                    oneToOne: false
                });
                //cache mapping
                self.cacheMappingInternal(field, result);
                //and finally return mapping
                return result;
            }
            else {
                result = new types.DataAssociationMapping({
                    parentModel: associatedModel.name,
                    parentField: associatedModel.primaryKey,
                    childModel: self.name,
                    childField: field.name,
                    associationType: 'association',
                    cascade: 'null',
                    oneToOne: false
                });
                //cache mapping
                self.cacheMappingInternal(field, result);
                //and finally return mapping
                return result;
            }
        }
    }
};

/**
 * Gets or sets an object that represents the user of the current data context.
 * @property {string|undefined}
 * @name process#NODE_ENV
 * @memberof process
 */

/**
 * register migration model
 */
cfg.current.models.Migration =(function() {
    var data = require('./migration');
    return new DataModel(data);
}).call();

if (typeof exports !== 'undefined') {
    module.exports = {
        /**
         * DataModel class constructor.
         * @constructs DataModel
         */
        DataModel : DataModel,
        /**
         * DataFilterResolver class constructor.
         * @constructs DataFilterResolver
         */
        DataFilterResolver: DataFilterResolver
    }

; }


