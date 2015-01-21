/**
 * Created by Kyriakos Barbounakis on 10/13/13.
 */

var array = require('most-array'),
    string = require('string'),
    util = require('util'),
    path = require("path"),
    fs = require("fs"),
    crypto = require('crypto'),
    async = require('async'),
    events = require('events'),
    qry = require('most-query'),
    cfg = require('./data-configuration'),
    __types__ = require('./types'), functions = require('./functions');

/**
 * Load native object extensions
 */
if (typeof Array.prototype.find === 'undefined')
{
    /**
     * @param {Function} callback
     * @param {Object=} [thisObject]
     * @returns {*}
     */
    var find = function(callback, thisObject) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisObj = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            if (i in list) {
                value = list[i];
                if (callback.call(thisObj, value, i, list)) {
                    return value;
                }
            }
        }
        return undefined;
    };

    if (Object.defineProperty) {
        try {
            Object.defineProperty(Array.prototype, 'find', {
                value: find, configurable: true, enumerable: false, writable: true
            });
        } catch(e) {}
    }

    if (!Array.prototype.find) { Array.prototype.find = find; }
}


if (typeof Array.prototype.select === 'undefined')
{
    /**
     * @param {Function} callback
     * @param {Object=} [thisObject]
     * @returns {*}
     */
    var select = function(callback, thisObject) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisObj = arguments[1];
        var value;
        var res = [];
        for (var i = 0; i < length; i++) {
            if (i in list) {
                value = list[i];
                var item = callback.call(thisObj, value, i, list);
                if (item)
                    res.push(item);
            }
        }
        return res;
    }

    if (Object.defineProperty) {
        try {
            Object.defineProperty(Array.prototype, 'select', {
                value: select, configurable: true, enumerable: false, writable: true
            });
        } catch(e) {}
    }

    if (!Array.prototype.select) { Array.prototype.select = select; }
}

if (typeof Array.prototype.distinct === 'undefined')
{
    /**
     * @param {Function} callback
     * @param {Object=} [thisObject]
     * @returns {*}
     */
    var distinct = function(callback, thisObject) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisObj = arguments[1];
        var value;
        var res = [];
        for (var i = 0; i < length; i++) {
            if (i in list) {
                value = list[i];
                var item = callback.call(thisObj, value, i, list);
                if (item)
                    if (res.indexOf(item)<0)
                        res.push(item);
            }
        }
        return res;
    }

    if (Object.defineProperty) {
        try {
            Object.defineProperty(Array.prototype, 'distinct', {
                value: select, configurable: true, enumerable: false, writable: true
            });
        } catch(e) {}
    }

    if (!Array.prototype.distinct) { Array.prototype.distinct = distinct; }
}

/**
 * Represents the default data context.
 * @class
 * @constructor
 * @augments __types__.DataContext
 * @augments DataContext
 * @property {__types__.classes.DataAdapter} db - Gets the data adapter that is going to used in data operations.
 */
function DefaultDataContext()
{
    /**
     * @type {__types__.DataAdapter|DataAdapter}
     * @private
     */
    var __db__= null;
    this.__finalize__ = function() {
        if (__db__)
            __db__.close();
        __db__=null;
    };

    Object.defineProperty(this, 'db', {
        get : function() {
            if (__db__)
                return __db__;
            //otherwise load database options from configuration
            var adapter = array(cfg.current.adapters).firstOrDefault(function(x) {
                return x.default;
            });
            if (adapter==null)
                throw new Error('Default data adapter is missing.');
            //get data adapter type
            var adapterType = cfg.current.adapterTypes[adapter.invariantName];
            //validate data adapter type
            if ((adapterType==null) || (adapterType===undefined))
                throw new Error('Default data adapter type cannot be found.');
            //otherwise load adapter
            __db__ = adapterType.createInstance(adapter.options);
            return __db__;
        },
        configurable : false,
        enumerable:false });
}

util.inherits(DefaultDataContext, __types__.DataContext);

/**
 * @param name {string} - A string that represents the model name.
 * @returns {DataModel}
 */
DefaultDataContext.prototype.model = function(name) {
    var self = this;
    if ((name == null) || (name === undefined))
        return null;
    var obj = cfg.current.model(name);
    if (typeof obj === 'undefined' || obj==null)
        return null;
    var model = new DataModel(obj);
    //set model context
    model.context = self;
    //return model
    return model;
};

DefaultDataContext.prototype.finalize = function(cb) {
    cb = cb || function () {};
    this.__finalize__();
    cb.call(this);
};
/**
 * @class DataView
 * @param {DataModel} model
 * @constructor
 */
function DataView(model) {
    /**
     * Gets or sets the title of the current view
     * @type {null}
     */
    this.title = null;
    /**
     * Gets or sets the name of the current data view
     * @type {String}
     */
    this.name = null;
    /**
     * Gets or sets a boolean that indicates whether this data view is public or not.The default value is true.
     * @type {String}
     */
    this.public = true;
    /**
     * Gets or sets a boolean that indicates whether this data view is sealed or not. The default value is true.
     * @type {String}
     */
    this.sealed = true;
    /**
     * Gets or sets the collection of data view's fields
     * @type {Array}
     */
    this.fields = [];
    /**
     * Gets a DataModel instance that represents the parent model of the current view
     * @type {DataModel}
     */
    this.model = undefined;
    var _model = model;
    Object.defineProperty(this,'model', {
       get: function() {
           return _model;
       }, configurable:false, enumerable: false
    });
    /**
     *
     * @type {Array}
     */
    this.attributes = undefined;
    var self = this;
    Object.defineProperty(this,'attributes', {
        get: function() {
            var attrs = [];
            self.fields.forEach(function(x) {
                if (self.model) {
                    var field = util._extend(new DataField(), self.model.field(x.name));
                    if (field)
                        attrs.push(util._extend(field, x));
                    else
                        attrs.push(util._extend({}, x));
                }
                else
                    //unbound view (?)
                    attrs.push(util._extend({}, x));

            });
            return attrs;
        }, configurable:false, enumerable: false
    });

}

function DataField() {
    /**
     * @type {string} - Gets or sets the internal name of this field.
     */
    this.name = null;
    /**
     * @type {string} - Gets or sets the property name for this field.
     */
    this.property = null;
    /**
     * @type {string} - Gets or sets the title of this field.
     */
    this.title = null;
    /**
     * @type {boolean|undefined} - Gets or sets a boolean that indicates whether field is nullable or not.
     */
    this.nullable = true;
    /**
     * Gets or sets the type of this field.
     * @type {string}
     */
    this.type = null;
    /**
     * @type {boolean|undefined} - Gets or sets a boolean that indicates whether field is primary key or not.
     */
    this.primary = false;
    /**
     * @type {boolean|undefined} - Gets or sets a boolean that indicates whether field defines an one-to-many relationship between models.
     */
    this.many = undefined;
    /**
     * Gets or sets the parent model of this field.
     * @type {string}
     */
    this.model = undefined;
    /*
     * Gets or sets the default value of this field.
     * @type *
    **/
    this.value = undefined;
    /*
     * Gets or sets the calculated value of this field.
     * @type *
    **/
    this.calculation = undefined;
    /*
     * Gets or sets a boolean that indicates whether a field is readonly.
     * @type Boolean
    **/
    this.readonly = undefined;
    /**
     * Get or sets the relation mapping attributes.
     * @type {DataAssociationMapping}
     */
    this.mapping = undefined;
    /**
     * Gets or sets a string that indicates the data field's column type. This attribute is used in data view definition
     * @type {String}
     */
    this.coltype = undefined;
    /**
     * Get or sets whether the current field defines an association mapping and the associated data object(s) must be included while getting data.
     * @type {DataAssociationMapping}
     */
    this.expandable = false;
    /**
     * Gets or sets the section where the field belongs.
     * @type {string}
     */
    this.section = null;
    /**
     * Gets or sets a short description for this field.
     * @type {string}
     */
    this.description = null;
    /**
     * Gets or sets a short help for this field.
     * @type {string}
     */
    this.help = null;
    /**
     * Gets or sets the appearance template of this field, if any.
     * @type {string}
     */
    this.appearance = null;
    /**
     * Gets or sets the available options for this field.
     * @type  {{name: string, value: *}[]}
     */
    this.options = null;
}

/**
 * @class DataAssociationMapping
 * @param {*=} obj An object that contains relation mapping attributes
 * @constructor
 */
function DataAssociationMapping(obj) {
    /**
     * Gets or set the storage adapter of a relation.
     * @type {string}
     */
    this.associationAdapter = undefined;
    /**
     * Gets or sets the parent model name
     * @type {string}
     */
    this.parentModel = undefined;
    /**
     * Gets or sets the child model name
     * @type {string}
     */
    this.childModel = undefined;
    /**
     * Gets or sets the parent field that is going to be used as label for this association
     * @type {string}
     */
    this.parentLabel = undefined;
    /**
     * Gets or sets the parent field name or an array of field names
     * @type {string|Array}
     */
    this.parentField = undefined;
    /**
     * Gets or sets the parent property where this association refers to
     * @type {string}
     */
    this.refersTo = undefined;
    /**
     * Gets or sets the child field name or an array of field names
     * @type {string|Array}
     */
    this.childField = undefined;
    /**
     * Gets or sets the action that occurs when parent item is going to be deleted (all|none|null|delete).
     * @type {string}
     */
    this.cascade = 'none';
    /**
     * Gets or sets the type of this association (junction|association|multivalues|lookup).
     * @type {string}
     */
    this.associationType = 'association';
    /**
     * Gets or sets an array of fields to select from associated model. If this property is empty then all associated model fields will be selected.
     * @type {Array}
     */
    this.select = [];

    /**
     * Gets or sets a boolean value that indicates whether current relation is one-to-one relation.
     * @type {Boolean}
     */
    this.oneToOne = false;

    if (typeof obj === 'object')
        util._extend(this, obj);

}
/**
 * @class DataFilterResolver
 * @abstract
 * @constructor
 */
function DataFilterResolver() {
    //
}

DataFilterResolver.resolveMember = function(member, callback) {
    callback(null, this.viewAdapter.concat('.', member))
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
     * Gets an array that contains all model attributes
     * @type {Array|*}
    */
    this.attributes = undefined;
    /**
     * @type {Array} - Gets an array of objects that represents the collection of fields for this model. This collection contains
     * the fields defined in the current model and its parent.
     */
    Object.defineProperty(this, 'attributes', { get: function() {
        //validate self field collection
        array(self.fields).each(function(x) {
            if (x.many===undefined) {
                if (cfg.current.dataTypes[x.type]===undefined) {
                    //set one-to-many attribute
                    x.many = pluralExpression.test(x.name);
                }
                else
                    x.many = false;
            }
            if (x.model===undefined)
                x.model = self.name;
        });
        //clone self fields
        var result = [], baseModel = self.base(), field;
        array(self.fields).each(function(x) {
            var clone = x;
            if (baseModel && !x.primary) {
                field = baseModel.field(x.name);
                if (field) {
                    clone = new DataField();
                    //get all inherited properties
                    util._extend(clone, field);
                    //get all overriden properties
                    util._extend(clone, x);
                    //set field model
                    clone.model = field.model;
                }
            }
            result.push(clone);
        });
        if (baseModel!=null) {
            array(baseModel.attributes).each(function(x) {
                if (!x.primary) {
                    //check if member is overriden by the current model
                    field = self.fields.filter(function(y) { return y.name==x.name; })[0];
                    if (typeof field === 'undefined')
                        result.push(x);
                }
            });
        }
        return result;
    }, enumerable: false, configurable: false});
    /**
     * Gets the primary key name
     * @type String
    */
    this.primaryKey = undefined;
    Object.defineProperty(this, 'primaryKey' , { get: function() {
        var p = array(this.fields).firstOrDefault(function(x) { return x.primary==true; });
        if (p==null) 
            return null;
        return p.name;
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

    //register listeners
    this.registerListeners();
    //call initialize method
    if (typeof this.initialize === 'function')
        this.initialize();
}
util.inherits(DataModel, __types__.EventEmitter2);

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
}
/**
 * Registers default model listeners
 * @protected
 */
DataModel.prototype.registerListeners = function() {
    //register system event listeners
    //0. Permission Event Listener
    var perms = require('./data-permission');
    //1. Default values Listener
    this.on('before.save', DefaultValueListener.beforeSave);
    //2. Calculated values listener
    this.on('before.save', CalculatedValueListener.beforeSave);
    //before execute
    this.on('before.execute', perms.DataPermissionEventListener.prototype.beforeExecute);

    //before save
    this.on('before.save', perms.DataPermissionEventListener.prototype.beforeSave);
    //before remove
    this.on('before.remove', perms.DataPermissionEventListener.prototype.beforeRemove);
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
            }
        }
    }
}

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
 * Applies open data filter, ordering, grouping and paging params and returns the derived data queryable object
 * @param {String|{$filter:string=, $skip:number=, $order:string=, $inlinecount:string=, $expand:string=,$select:string=, $orderby:string=, $group:string=, $groupby:string=}} params - A string that represents an open data filter or an object with open data parameters
 * @param {function(Error=,DataQueryable=)} callback
 */
DataModel.prototype.filter = function(params, callback) {
    var self = this;
    var parser = qry.openData.createParser();
    parser.resolveMember = function(member, cb) {
        var attr = self.field(member);
        if (attr)
            member = attr.name;
        //todo:: throw exception for missing field
        if (typeof self.resolveMember === 'function')
            self.resolveMember.call(self, member, cb)
        else
            DataFilterResolver.resolveMember.call(self, member, cb);
    };
    parser.resolveMethod = function(name, args, cb) {
        if (typeof self.resolveMethod === 'function')
            self.resolveMethod.call(self, name, args, cb)
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
            q.query.prepare();

            if (typeof params === 'object') {
                //apply query parameters
                var select = params.$select,
                    skip = params.$skip || 0,
                    orderBy = params.$orderby || params.$order,
                    groupBy = params.$groupby || params.$group,
                    expand = params.$expand;
                //set $groupby
                var arr, fields, item, field;
                if (typeof groupBy === 'string') {
                    arr = groupBy.split(',');
                    fields = [];
                    arr.filter(function(x) {
                        return (x.length>0);
                    }).forEach(function(x) {
                        field = self.field(x);
                        if (field) {
                            fields.push(field.name);
                        }
                    });
                    if (fields.length>0) {
                        q.query.groupBy(fields);
                    }
                }
                //set $select
                if (typeof select === 'string') {
                    arr = select.split(',');
                    fields = [];
                    for (var i = 0; i < arr.length; i++) {
                        item = string(arr[i]).trim().toString();
                        field = self.field(item);
                        if (field)
                            fields.push(field.name);
                        else {
                            //validate aggregate functions
                            if (/(count|avg|sum|min|max)\((.*?)\)/i.test(item)) {
                                fields.push(q.fieldOf(item));
                            }
                        }
                    }
                    if (fields.length>0) {
                        q.select(fields);
                    }
                }
                //set $skip
                q.skip(skip);
                //set $orderby
                if (orderBy) {
                    arr = orderBy.split(',');
                    for (var i = 0; i < arr.length; i++) {
                        item = string(arr[i]).trim().toString(), name = null, direction = 'asc';
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
                            if (field) {
                                if (direction=='desc')
                                    q.orderByDescending(name);
                                else
                                    q.orderBy(name);
                            }
                            else {
                                //validate aggregate functions
                                if (/(count|avg|sum|min|max)\((.*?)\)/i.test(name)) {
                                    if (direction=='desc')
                                        q.orderByDescending(name);
                                    else
                                        q.orderBy(name);
                                }
                            }

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
 * @param {*} obj An object that is going t
 * @returns DataQueryable
 */
DataModel.prototype.find = function(obj) {
    var self = this;
    if ((obj===undefined) || (obj==null))
    {
        var result = new DataQueryable(this);
        result.where(self.primaryKey).equal(null);
        return result;
    }
    //cast object
    var find = {};
    array(self.attributeNames).each(function(x)
    {
        if (obj.hasOwnProperty(x))
        {
            find[x] = obj[x];
        }
    });

    if (find.hasOwnProperty(self.primaryKey)) {
        var result = new DataQueryable(this);
        return result.where(self.primaryKey).equal(find[self.primaryKey]);
    }
    else {
        var result = new DataQueryable(this);
        var bQueried = false
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
*/
DataModel.prototype.take = function(n, callback) {
    //default size (25)
    n = n || 25;
    var result = new DataQueryable(this);
    result.select(this.attributeNames).take(n, callback)
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
 * Converts an object or a collection of objects to the corresponding data instance
 * @param {Array|*} obj
 * @returns {DataObject|Array}
 */
DataModel.prototype.convert = function(obj)
{
    var self = this;
    if (typeof obj !== 'object' || obj == null)
        return null;
    /**
     * @constructor
     * @augments DataObject
     */
    var DataObjectClass = self['DataObjectClass'];
    if (typeof DataObjectClass === 'undefined')
    {
        var classPath = path.join(process.cwd(),'app','models',util.format('%s-model.js', self.name.toLowerCase()));
        if (fs.existsSync(classPath))
            DataObjectClass = require(classPath);

        else
            DataObjectClass = DataObject;
        cfg.current.models[self.name]['DataObjectClass'] = self['DataObjectClass'] = DataObjectClass;
    }

    if (util.isArray(obj)) {
        var result = [];
        obj.forEach(function(x) {
            var o = new DataObjectClass();
            util._extend(o, x);
            o.context = self.context;
            o.type = self.name;
            result.push(o)
        });
        return result;
    }
    else {
        var result = new DataObjectClass();
        util._extend(result, obj);
        result.context = self.context;
        result.type = self.name;
        return result;
    }
}
/**
 * Extracts an identifier from the given parameter.
 * If the parameter is an object then gets the identifier property, otherwise tries to convert the given parameter to an identifier
 * suitable for this model.
 * @param {*} obj
 * @returns {*|undefined}
 */
DataModel.prototype.id = function(obj) {
    if (typeof obj === 'undefined')
        return;
    if (obj===null)
        return;
    if (typeof obj === 'object')
        return obj[this.primaryKey];
    return obj;
}

DataModel.prototype.cast = function(obj)
{
    var self = this;
    if (obj==null)
        return {};
    if (typeof obj === 'object' && obj instanceof Array)
    {
        return array(obj).select(function(x) {
            return self.cast(x);
        }).toArray();
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
                        if (typeof obj[name] === 'object')
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

                    if (typeof dest[name] === 'object') {
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
}
/**
 * @param obj {Array|*}
 * @param callback {Function}
 */
DataModel.prototype.save = function(obj, callback)
{
    var self = this;
    if (obj==null) {
        callback.call(self, null);
        return;
    }
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
    var self = this;
    callback = callback || function() {};
    if (obj==null) {
        callback.call(self);
        return;
    }
    if (util.isArray(obj)) {
        callback.call(self, new Error('Invalid argument. Source object cannot be an array.'));
        return 0;
    }
    //get object state before any other operation
    var state = obj.$state ? obj.$state : (obj[self.primaryKey]!=null ? 2 : 1);
    var e = {
        model: self,
        target: obj,
        state:state
    };
    //register data association listener
    //self.once('before.save', DataObjectAssociationListener.beforeSave);
    //register data association listener
    self.once('after.save', DataObjectAssociationListener.afterSave);
    //register not null listener at the end of listeners collection (before emit)
    self.once('before.save', NotNullConstraintListener.beforeSave);
    //register unique constraint listener at the end of listeners collection (before emit)
    self.once('before.save', UniqueContraintListener.beforeSave);
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
                                    //get inserted id
                                    if (e.state==1) {
                                        //validate identity primary key
                                        var pm = e.model.field(self.primaryKey);
                                        if (pm.type==='Counter') {
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
                                                self.emit('after.save',e, function(err, result) {
                                                    //invoke callback
                                                    callback.call(self, err, e.target);
                                                });
                                            });
                                        }
                                        else {
                                            //raise after save listeners
                                            self.emit('after.save',e, function(err, result) {
                                                //invoke callback
                                                callback.call(self, err, e.target);
                                            });
                                        }
                                    }
                                    else {
                                        //execute after update events
                                        self.emit('after.save',e, function(err, result) {
                                            //invoke callback
                                            callback.call(self, err, e.target);
                                        });
                                    }
                                }
                            });
                        }
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
        var model = baseModel.base();
        baseModel = model;
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
}

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
}

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
}

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
    self.once('before.remove', DataObjectAssociationListener.afterSave);

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
                db.execute(q, null, function(err, result) {
                    if (err) {
                        callback.call(self, err);
                    }
                    else {
                        //execute after update events
                        self.emit('after.remove',e, function(err, result) {
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
    var fields = array(self.attributes).where(function(x) {
        return (self.name== x.model) && (!x.many);
    }).toArray();

    if ((fields==null) || (fields.length==0))
        throw new Error("Migration is not valid for this model. The model has no fields.");
    var migration = new DataModelMigration();
    migration.add = fields;
    migration.version = self.version!=null ? self.version : '0.0';
    migration.appliesTo = self.sourceAdapter;
    migration.model = self.name;
    migration.description = util.format('%s migration (version %s)', this.title, migration.version);
    if (context==null)
        throw new Error("The underlying data context cannot be empty.");

    //get all related models

    var models = [];

    array(self.fields).where(function(x) {
        return (!cfg.current.dataTypes[x.type] && (self.name!=x.type));
    }).each(function(x) {
        var m = context.model(x.type);
        if (m!=null) {
            if (array(models).where(function(x) {
                return x.name == m.name;
            }).firstOrDefault()!==null)
            {
                //todo:circular model references causes range error
                //models.push(m);
            }
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
    var fields = array(self.attributes).where(function(x) {
        return (self.name== x.model) && (!x.many);
    }).select(function(x) {
        return qry.fields.select(x.name).from(adapter);
    }).toArray();
    /**
     * @type {QueryExpression}
     */
    var q = qry.query(adapter).select(fields);
    //get base adapter
    var baseAdapter = (baseModel!=null) ? baseModel.name.concat('Data') : null, baseFields = [];
    //enumerate columns of base model (if any)
    if (baseModel!=null) {
        array(baseModel.attributes).each(function(x) {
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
    db.createView(view, q, callback);

}

/**
 * Gets the primary key.
 * @return {DataField}
 */
DataModel.prototype.key = function()
{
    var res = array(this.fields).firstOrDefault(function(x) { return x.primary==true; });
    return res;
}
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
 * Gets the specified model view
 * @param {string} name
 * @param {DataView=} obj
 * @returns {DataView}
 */
DataModel.prototype.dataviews = function(name, obj) {
    var self = this;
    //todo::add or update data view
    if (typeof obj !== 'undefined')
        throw new Error('Not implemented.');
    var self = this;
    var view = self.views.filter(function(x) { return x.name==name;})[0];
    if (typeof view==='undefined'|| view == null)
        return null;
    return util._extend(new DataView(self), view);
};

/**
 * Gets a field association mapping based on field attributes, if any. Otherwise returns null.
 * @param {String} name The name of the field
 */
DataModel.prototype.inferMapping = function(name) {
    var self = this;
    var field = self.field(name);

    if (!field)
        return null;
    if (field.mapping)
    {
        //validate mapping
        var result = util._extend(new DataAssociationMapping(), field.mapping);
        return result;
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
                return new DataAssociationMapping({
                    parentModel:associatedModel.name,
                    parentField:associatedModel.primaryKey,
                    childModel:self.name,
                    childField:field.name,
                    associationType:'association',
                    cascade:'null',
                    oneToOne:false
                });
            }
            else
            {
                //return a data relation (parent model is the current model)
                return new DataAssociationMapping({
                    parentModel:self.name,
                    parentField:self.primaryKey,
                    childModel:associatedModel.name,
                    childField:associatedField.name,
                    associationType:'association',
                    cascade:'null',
                    oneToOne:false,
                    refersTo:field.property || field.name
                });
            }
        }
        else {

            //validate pluralize
            var re = new RegExp(DataModel.PluralExpression.source);
            if (re.test(field.name) || field.many) {
                //return a data junction
                return new DataAssociationMapping({
                    associationAdapter: self.name.concat(string(field.name).capitalize()),
                    parentModel: self.name, parentField: self.primaryKey,
                    childModel: associatedModel.name,
                    childField: associatedModel.primaryKey,
                    associationType: 'junction',
                    cascade: 'delete',
                    oneToOne: false
                });
            }
            else {
                return new DataAssociationMapping({
                    parentModel: associatedModel.name,
                    parentField: associatedModel.primaryKey,
                    childModel: self.name,
                    childField: field.name,
                    associationType: 'association',
                    cascade: 'null',
                    oneToOne: false
                });
            }
        }
    }
};

/**
 * @abstract DataContextEmitter
 * @constructor
 */
function DataContextEmitter() {
    //
}
DataContextEmitter.prototype.ensureContext = function() {
    return null;
};

/**
 * @class DataQueryable
 * @property {qry.classes.QueryExpression} query - Gets or sets the query expression
 * @property {DataModel} model - Gets or sets the underlying data model
 * @constructor
 * @param model {DataModel}
 * @augments DataContextEmitter
 */
function DataQueryable(model) {
    /**
     * @type {QueryExpression}
     * @private
     */
    var q = null;
    /**
     * @type {QueryExpression}
     */
    this.query = undefined;
    /**
     * Gets or sets an array of expandable models
     * @type {Array}
     * @private
     */
    this.$expand = undefined;
    /**
     * @type {Boolean}
     * @private
     */
    this.$flatten = undefined;
    /**
     * @type {DataModel}
     * @private
     */
    var m = model;
    /**
     * @type {DataModel}
     */
    this.model = undefined;
    Object.defineProperty(this, 'query', { get: function() {
        if (!q) {
            if (!m) {
                return null;
            }
            q = qry.query(m.viewAdapter);
        }
        return q;
    }, configurable:false, enumerable:false});

    Object.defineProperty(this, 'model', { get: function() {
        return m;
    }, configurable:false, enumerable:false});

}
/**
 * @returns DataQueryable
 */
DataQueryable.prototype.clone = function() {
    var result = new DataQueryable(this.model);
    util._extend(result.query, this.query);
    return result;
};

/**
 * Ensures data queryable context and returns the current data context. This function may be overriden.
 * @returns {DataContext}
 */
DataQueryable.prototype.ensureContext = function() {
    if (this.model!=null)
        if (this.model.context!=null)
            return this.model.context;
    return null;
};

/**
 *
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.where = function(attr) {
    this.query.where(this.fieldOf(attr));
    return this;
};

DataQueryable.prototype.join = function(model)
{
    var self = this;
    if (typeof model === 'undefined' || model == null)
        return this;
    /**
     * @type {DataModel}
     */
    var joinModel = self.model.context.model(model);
    //validate joined model
    if (typeof joinModel === 'undefined' || joinModel == null)
        throw new Error(util.format("An internal error occured.The %s model cannot be found", model));
    var arr = joinModel.attributes.filter(function(x) { return x.type==self.model.name; });
    if (arr.length==0)
        throw new Error(util.format("An internal error occured. The association between %s and %s cannot be found", this.model.name ,model));
    /**
     * @type DataAssociationMapping
     */
    var mapping = joinModel.inferMapping(arr[0].name);
    self.select().query.join(model).with([mapping.parentField, mapping.childField]);
    return self;
};


/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.and = function(attr) {
    this.query.and(this.fieldOf(attr));
    return this;
};
/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.or = function(attr) {
    this.query.or(this.fieldOf(attr));
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.equal = function(obj) {
    this.query.equal(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.notEqual = function(obj) {
    this.query.notEqual(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.greaterThan = function(obj) {
    this.query.greaterThan(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.greaterOrEqual = function(obj) {
    this.query.greaterOrEqual(obj);
    return this;
};

/**
 * @param {*} value The value to be compared
 * @param {Number=} result The result of a bitwise and expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.bit = function(value, result) {
    if (typeof result === 'undefined' || result == null)
        this.query.bit(value, value);
    else
        this.query.bit(value, result);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.lowerThan = function(obj) {
    this.query.lowerThan(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.lowerOrEqual = function(obj) {
    return this.query.lowerOrEqual(obj);
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.startsWith = function(obj) {
    this.query.startsWith(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.endsWith = function(obj) {
    return this.query.endsWith(obj);
};


/**
 * @param objs {Array}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.in = function(objs) {
    this.query.in(objs);
    return this;
};

/**
 * @param {*} obj The value to be compared
 * @param {Number} result The result of modulo expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.mod = function(obj, result) {
    this.query.mod(obj, result)
    return this;
};

/**
 * @param value {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.contains = function(value) {
    this.query.contains(value);
    return this;
};

/**
 * @param attr {String=|Array=} An array of fields, a field or a view name
 * @returns {DataQueryable}
 */
DataQueryable.prototype.select = function(attr) {

    var self = this, arr;
    if (typeof attr === 'string') {
        //validate field or model view
        var field = self.model.field(attr);
        if (field) {

            if (!field.many) {
                arr = [];
                arr.push(field.name);
            }
            else
                self.expand(field.name);
        }
        else {
            var view  = self.model.dataviews(attr);
            if (view) {
                arr = [];
                view.fields.forEach(function(x) {
                    field = self.model.field(x.name);
                    if (field)
                        if (!field.many)
                            arr.push(field.name);
                        else
                            self.expand(field.name);
                });
            }
        }
        if (util.isArray(arr)) {
            if (arr.length==0)
                arr = null;
        }
    }
    else {
        arr = attr;
    }
    if (typeof arr === 'undefined' || arr === null) {
        if (!self.query.hasFields()) {
            //enumerate fields
            var fields = array(self.model.attributes).where(function(x) {
                return (!x.many);
            }).select(function(x) {
                var f = qry.fields.select(x.name).from(self.model.viewAdapter);
                if (x.property)
                    f.as(x.property);
                return f;
            }).toArray();
            //and select fields
            self.select(fields);
        }
    }
    else {
        self.query.select(arr);
    }

    return this;
};

/**
 * @param attr {string}
 * @returns {DataQueryable|QueryField}
 */
DataQueryable.prototype.fieldOf = function(attr) {

    var matches = /(count|avg|sum|min|max)\((.*?)\)/i.exec(attr);
    if (matches) {
        var field = this.model.field(matches[2]);
        if (typeof  field === 'undefined' || field === null)
            throw new Error(util.format('The specified field %s cannot be found in target model.', matches[2]));
        if (matches[1]=='count')
            return qry.fields.count(field.name).from(this.model.viewAdapter).as('countOf'.concat(matches[2]));
        else if (matches[1]=='avg')
            return qry.fields.average(field.name).from(this.model.viewAdapter).as('avgOf'.concat(matches[2]));
        else if (matches[1]=='sum')
            return qry.fields.sum(field.name).from(this.model.viewAdapter).as('sumOf'.concat(matches[2]));
        else if (matches[1]=='min')
            return qry.fields.min(field.name).from(this.model.viewAdapter).as('minOf'.concat(matches[2]));
        else if (matches[1]=='max')
            return qry.fields.max(field.name).from(this.model.viewAdapter).as('maxOf'.concat(matches[2]));
    }
    else {
        var field = this.model.field(attr);
        if (typeof  field === 'undefined' || field === null)
            throw new Error(util.format('The specified field %s cannot be found in target model.', attr));
        return qry.fields.select(field.name).from(this.model.viewAdapter);
    }
    return this;
};

/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.orderBy = function(attr) {

    this.query.orderBy(this.fieldOf(attr));
    return this;
};

/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.thenBy = function(attr) {
    this.query.thenBy(this.fieldOf(attr));
    return this;
};

/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.orderByDescending = function(attr) {
    this.query.orderByDescending(this.fieldOf(attr));
    return this;
};

/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.thenByDescending = function(attr) {
    this.query.thenByDescending(this.fieldOf(attr));
    return this;
};

/**
 * @param callback {Function}
 * @abstract
 * @returns {*}
 */
DataQueryable.prototype.first = function(callback) {
    callback = callback || function() {};
    this.skip(0).take(1, function(err, result) {
        if (err) {
            callback(err);
        }
        else {
            if (result.length>0)
                callback(null, result[0]);
            else
                callback(null);
        }
    });
};

/**
 * @param callback {Function}
 * @returns {Array}
 */
DataQueryable.prototype.all = function(callback) {
    var self = this;
    //remove skip and take
    delete this.query.$skip;
    delete this.query.$take;
    //validate already selected fields
    if (!self.query.hasFields()) {
        //enumerate fields
        var fields = array(self.model.attributes).where(function(x) {
            return (!x.many);
        }).select(function(x) {
            var f = qry.fields.select(x.name).from(self.model.viewAdapter);
            if (x.property)
                f.as(x.property)
            return f;

        }).toArray();
        //and select fields
        self.select(fields);
    }
    callback = callback || function() {};
    //execute select
    self.execute(callback);
};

/**
 * @param n {number}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.skip = function(n) {
    this.query.$skip = n;
    return this;
};

/**
 * @param callback {Function}
 * @param n {Number} - Defines the number of items to take
 * @returns {*} - A collection of objects that meet the query provided
 */
DataQueryable.prototype.take = function(n, callback) {
    var self = this;
    self.query.take(n);
    callback = callback || function() {};

    //validate already selected fields
    if (!self.query.hasFields()) {
        //enumerate fields
        var fields = array(self.model.attributes).where(function(x) {
            return (!x.many);
        }).select(function(x) {
            var f = qry.fields.select(x.name).from(self.model.viewAdapter);
            if (x.property)
                f.as(x.property);
            return f;
        }).toArray();
        //and select fields
        self.select(fields);
    }
    //execute select
    self.execute(callback);
};
/**
 * @param {String} name
 * @param {STring=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.countOf = function(name, alias) {
    alias = alias || 'countOf'.concat(name);
    var res = this.fieldOf(util.format('count(%s)', name));
    if (typeof alias !== 'undefined' && alias!=null)
        res.as(alias);
    return res;
};
/**
 * @param {String} name
 * @param {STring=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.maxOf = function(name, alias) {
    alias = alias || 'maxOf'.concat(name);
    var res = this.fieldOf(util.format('max(%s)', name));
    if (typeof alias !== 'undefined' && alias!=null)
        res.as(alias);
    return res;
};
/**
 * @param {String} name
 * @param {STring=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.minOf = function(name, alias) {
    alias = alias || 'minOf'.concat(name);
    var res = this.fieldOf(util.format('min(%s)', name));
    if (typeof alias !== 'undefined' && alias!=null)
        res.as(alias);
    return res;
}
/**
 * @param {String} name
 * @param {STring=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.averageOf = function(name, alias) {
    alias = alias || 'avgOf'.concat(name);
    var res = this.fieldOf(util.format('avg(%s)', name));
    if (typeof alias !== 'undefined' && alias!=null)
        res.as(alias);
    return res;
}
/**
 * @param {String} name
 * @param {STring=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.sumOf = function(name, alias) {
    alias = alias || 'sumOf'.concat(name);
    var res = this.fieldOf(util.format('sum(%s)', name));
    if (typeof alias !== 'undefined' && alias!=null)
        res.as(alias);
    return res;
}

/**
 * Executes the underlying query statement and returns the count of object found.
 * @param callback {Function}
 * @returns {*} - A collection of objects that meet the query provided
 */
DataQueryable.prototype.count = function(callback) {
    var self = this;
    callback = callback || function() {};
    //add a count expression
    var field = array(self.model.attributes).firstOrDefault();
    if (field==null) {
        callback.call(this, new Error('Queryable collection does not have any property.'));
        return;
    }
    //normalize query and remove skip
    delete self.query.$skip;
    delete self.query.$take;
    delete self.query.$order;
    delete self.query.$group;
    //append count expression
    self.query.select([qry.fields.count(field.name).from(self.model.viewAdapter)]);
    //execute select
    self.execute(function(err, result) {
        if (err) { callback.call(self, err, result); return; }
        var value = null;
        if (util.isArray(result)) {
            //get first value
            if (result.length>0)
                value = result[0][field.name];
        }
        callback.call(self, err, value);
    });
};
/**
 * Executes the underlying query statement and returns the maximum value of the given attribute.
 * @param attr {String}
 * @param callback {Function}
 * @returns {*} Returns the maximum value of the given attribute
 */
DataQueryable.prototype.max = function(attr, callback) {
    var self = this;
    callback = callback || function() {};
    //add a count expression
    var field = self.model.field(attr);
    if (field==null) {
        callback.call(this, new Error('The specified attribute cannot be found.'));
        return;
    }
    //normalize query
    //1. remove skip
    delete self.query.$skip;
    //append count expression
    self.query.select([qry.fields.max(field.name)]);
    //execute select
    self.execute(function(err, result) {
        if (err) { callback.call(self, err, result); return; }
        var value = null;
        if (util.isArray(result)) {
            //get first value
            if (result.length>0)
                value = result[0][attr];
        }
        callback.call(self, err, value);
    });
};

/**
 * Executes the underlying query statement and returns the minimum value of the given attribute.
 * @param attr {String}
 * @param callback {Function}
 * @returns {*} Returns the maximum value of the given attribute
 */
DataQueryable.prototype.min = function(attr, callback) {
    var self = this;
    callback = callback || function() {};
    //add a count expression
    self.model.attributes
    var field = self.model.field(attr);
    if (field==null) {
        callback.call(this, new Error('The specified attribute cannot be found.'));
        return;
    }
    //normalize query
    //1. remove skip
    delete self.query.$skip;
    //append count expression
    self.query.select([qry.fields.min(field.name)]);
    //execute select
    self.execute(function(err, result) {
        if (err) { callback.call(self, err, result); return; }
        var value = null;
        if (util.isArray(result)) {
            //get first value
            if (result.length>0)
                value = result[0][attr];
        }
        callback.call(self, err, value);
    });
};

/**
 * Executes the underlying query statement and returns the average value of the given attribute.
 * @param attr {String}
 * @param callback {Function}
 * @returns {*} Returns the maximum value of the given attribute
 */
DataQueryable.prototype.average = function(attr, callback) {
    var self = this;
    callback = callback || function() {};
    //add a count expression
    var field = self.model.field(attr);
    if (field==null) {
        callback.call(this, new Error('The specified attribute cannot be found.'));
        return;
    }
    //normalize query
    //1. remove skip
    delete self.query.$skip;
    //append count expression
    self.query.select(qry.fields.average(field.name)).take(1, callback);
};
/**
  * @private
 */
DataQueryable.prototype.__executeCount = function(callback) {
    try {
        var self = this, context = self.ensureContext();
        var clonedQuery = self.query.clone();
        //delete properties
        delete clonedQuery.$skip;
        delete clonedQuery.$take;
        //add wildcard field
        clonedQuery.select([qry.fields.count('*')]);
        //execute count
        context.db.execute(clonedQuery, null, function(err, result) {
            if (err) {
                callback(err);
                return;
            }
            callback(err, result.length>0 ? result[0] : 0);
        });
    }
    catch (e) {
        callback(e);
    }

}

DataQueryable.prototype.migrate = function(callback) {
    var self = this;
    try {
        //ensure context
        self.ensureContext();
        if (self.model) {
            self.model.migrate(function(err) {
                callback(err);
            })
        }
        else {
            callback();
        }
    }
    catch (e) {
        callback(e);
    }

};

DataQueryable.prototype.postExecute = function(result, callback) {
    var self = this;
    try {

    }
    catch (e) {
        callback(e);
    }
};

/**
 * Executes the underlying query statement.
 * @param {Function(Error,*=)} callback
 * @private
 */
DataQueryable.prototype.execute = function(callback) {
    var self = this, context = self.ensureContext();
    self.migrate(function(err) {
        if (err) { callback(err); return; }
        var e = { model:self.model, query:self.query, type:'select' };
        if (!self.$flatten) {
            //get expandable fields
            var expandables = self.model.attributes.filter(function(x) { return x.expandable; });
            //get selected fields
            var selected = self.query.$select[self.model.viewAdapter];
            if (util.isArray(selected)) {
                //remove hidden fields
                var hiddens = self.model.attributes.filter(function(x) { return x.hidden; });
                if (hiddens.length>0) {
                    for (var i = 0; i < selected.length; i++) {
                        var x = selected[i];
                        var hiddenField = hiddens.find(function(y) {
                            var f = x instanceof qry.classes.QueryField ? x : new qry.classes.QueryField(x);
                            return f.name() == y.name;
                        });
                        if (hiddenField) {
                            selected.splice(i, 1);
                            i-=1;
                        }
                    }
                }
                //expand fields
                if (expandables.length>0) {
                    selected.forEach(function(x) {
                        //get field
                        var field = expandables.find(function(y) {
                            var f = x instanceof qry.classes.QueryField ? x : new qry.classes.QueryField(x);
                            return f.name() == y.name;
                        });
                        //add expandable models
                        if (field) {
                            var mapping = self.model.inferMapping(field.name);
                            if (mapping)
                                self.expand(mapping);
                        }
                    });
                }
            }
        }
        if (self.$silent) {
            context.db.execute(e.query, null, function(err, result) {
                if (err) { callback(err); return; }
                self.afterExecute(result, callback);
            });
        }
        else {
            self.model.emit('before.execute', e, function(err) {
                if (err) {
                    callback(err);
                }
                else {
                    context.db.execute(e.query, null, function(err, result) {
                        if (err) { callback(err); return; }
                        self.afterExecute(result, callback);
                    });
                }
            });
        }
    });
};

/**
 * @param {*} result
 * @param {Function} callback
 * @private
 */
DataQueryable.prototype.afterExecute = function(result, callback) {
    var self = this;
    if (self.$expand) {
        async.eachSeries(self.$expand,function(expand, cb) {
            /**
             * get mapping
             * @type {DataAssociationMapping}
             */
            var mapping = null;
            if (expand instanceof DataAssociationMapping) {
                mapping = expand;
            }
            else {
                var field = self.model.field(expand);
                if (typeof field === 'undefined')
                    field = self.model.attributes.find(function(x) { return x.type==expand });
                if (field) {
                    mapping = self.model.inferMapping(field.name);
                    if (mapping) { mapping.refersTo = mapping.refersTo || field.name; }
                }
            }
            if (mapping) {
                if (mapping.associationType=='association' || mapping.associationType=='junction') {

                    //1. current model is the parent model and association type is association
                    if ((mapping.parentModel==self.model.name) && (mapping.associationType=='association')) {
                        var associatedModel = self.model.context.model(mapping.childModel), values=[], keyField = mapping.parentField;
                        if (util.isArray(result)) {

                            iterator = function(x) { if (x[keyField]) { if (values.indexOf(x[keyField])==-1) { values.push(x[keyField]); } } };
                            result.forEach(iterator);
                        }
                        else {
                            if (result[keyField])
                                values.push(result[keyField]);
                        }
                        if (values.length==0) {
                            cb(null);
                        }
                        else {
                            var field = associatedModel.field(mapping.childField),
                                parentField = mapping.refersTo;
                            associatedModel.where(field.name).in(values).flatten().silent().all(function(err, childs) {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    var key=null,
                                        selector = function(x) {
                                            return x[field.name]==key;
                                        },
                                        iterator = function(x) {
                                            key =x[mapping.parentField];
                                            x[parentField] = childs.filter(selector);
                                        };
                                    if (util.isArray(result)) {
                                        result.forEach(iterator);
                                    }
                                    else {
                                        key =result[mapping.parentField];
                                        result[parentField] = childs.filter(selector);
                                    }
                                    cb(null);
                                }
                            });
                        }
                    }
                    else if (mapping.childModel==self.model.name && mapping.associationType=='junction') {
                        //create a dummy object
                        var junction = new HasParentJunction(self.model.convert({}), mapping),
                            //ensure array of results
                            arr = util.isArray(result) ? result : [result],
                            //get array of key values (for childs)
                            values = arr.filter(function(x) { return (typeof x[mapping.childField]!=='undefined') && (x[mapping.childField]!=null); }).map(function(x) { return x[mapping.childField] });
                        //query junction model
                        junction.baseModel.where('valueId').in(values).silent().all(function(err, junctions) {
                            if (err) { cb(err); return; }
                            //get array of parent key values
                            values = junctions.map(function(x) { return x['parentId'] });
                            //get parent model
                            var parentModel = self.model.context.model(mapping.parentModel);
                            //query parent with parent key values
                            var q = parentModel.where(mapping.parentField).in(values).silent().flatten();
                            //if selectable fields are defined
                            if (mapping.select)
                                //select these fields
                                q.select(mapping.select);
                            //and finally query parent
                            q.all(function(err, parents) {
                                if (err) { cb(err); return; }
                                //loop result array
                                arr.forEach(function(x) {
                                    //get child (key value)
                                    var valueId = x[mapping.childField];
                                    //get parent(s)
                                    var p = junctions.filter(function(y) { return (y.valueId==valueId); }).map(function(r) { return r['parentId']; });
                                    //filter data and set property value (a filtered array of parent objects)
                                    x[field.name] = parents.filter(function(z) { return p.indexOf(z[mapping.parentField])>=0; });
                                });
                                cb(null);
                            });
                        });
                    }
                    else if (mapping.parentModel==self.model.name && mapping.associationType=='junction') {
                        //create a dummy object
                        var junction = new DataObjectJunction(self.model.convert({}), mapping),
                        //ensure array of results
                            arr = util.isArray(result) ? result : [result],
                        //get array of key values (for parents)
                            values = arr.filter(function(x) { return (typeof x[mapping.parentField]!=='undefined') && (x[mapping.parentField]!=null); }).map(function(x) { return x[mapping.parentField] });
                        //query junction model
                        junction.baseModel.where('parentId').in(values).silent().all(function(err, junctions) {
                            if (err) { cb(err); return; }
                            //get array of child key values
                            values = junctions.map(function(x) { return x['valueId'] });
                            //get child model
                            var childModel = self.model.context.model(mapping.childModel);
                            //query parent with parent key values
                            var q = childModel.where(mapping.childField).in(values).silent().flatten();
                            //if selectable fields are defined
                            if (mapping.select)
                            //select these fields
                                q.select(mapping.select);
                            //and finally query childs
                            q.all(function(err, childs) {
                                if (err) { cb(err); return; }
                                //loop result array
                                arr.forEach(function(x) {
                                    //get parent (key value)
                                    var parentId = x[mapping.parentField];
                                    //get parent(s)
                                    var p = junctions.filter(function(y) { return (y.parentId==parentId); }).map(function(r) { return r['valueId']; });
                                    //filter data and set property value (a filtered array of parent objects)
                                    x[field.name] = childs.filter(function(z) { return p.indexOf(z[mapping.childField])>=0; });
                                });
                                cb(null);
                            });
                        });
                    }
                    else {
                        /**
                         * @type {DataModel}
                         */
                        var associatedModel = self.model.context.model(mapping.parentModel), keyAttr = self.model.field(mapping.childField);
                        values = [];
                        var keyField = keyAttr.property || keyAttr.name;
                        if (util.isArray(result)) {
                            var iterator = function(x) { if (x[keyField]) { if (values.indexOf(x[keyField])==-1) { values.push(x[keyField]); } } };
                            result.forEach(iterator);
                        }
                        else {
                            if (result[keyField])
                                values.push(result[keyField]);
                        }
                        if (values.length==0) {
                            cb(null);
                        }
                        else {
                            var childField = self.model.field(mapping.childField);
                            associatedModel.where(mapping.parentField).in(values).flatten().silent().select(mapping.select).all(function(err, parents) {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    var key=null,
                                        selector = function(x) {
                                            return x[mapping.parentField]==key;
                                        },
                                        iterator = function(x) {
                                            key = x[keyField];
                                            if (childField.property && childField.property!==childField.name) {
                                                x[childField.property] = parents.filter(selector)[0];
                                                delete x[childField.name];
                                            }
                                            else
                                                x[childField.name] = parents.filter(selector)[0];
                                        };
                                    if (util.isArray(result)) {
                                        result.forEach(iterator);
                                    }
                                    else {
                                        key = result[keyField];
                                        if (childField.property && childField.property!==childField.name) {
                                            x[childField.property] = parents.filter(selector)[0];
                                            delete x[childField.name];
                                        }
                                        else
                                            result[childField.name] = parents.filter(selector)[0];
                                    }
                                    cb(null);
                                }
                            });
                        }
                    }
                }
                else {
                    cb(new Error("Not yet implemented"));
                }
            }
            else {
                console.log(util.format('Data assocication mapping (%s) for %s cannot be found or the association between these two models defined more than once.', expand, self.model.title));
                cb(null);
            }
        }, function(err) {
            if (err) {
                callback(err);
            }
            else {
                self.toArrayCallback(result, callback);
            }
        });
    }
    else {
        self.toArrayCallback(result, callback);
    }
};
/**
 * @private
 * @param {Array|*} result
 * @param {Function} callback
 */
DataQueryable.prototype.toArrayCallback = function(result, callback) {
    try {
        var self = this;
        if (self.$asArray) {
            if (typeof self.query === 'undefined') {
                callback(null, result);
                return;
            }
            var fields = self.query.fields();
            if (util.isArray(fields)==false) {
                callback(null, result);
                return;
            }
            if (fields.length==1) {
                var arr = [];
                result.forEach(function(x) {
                    if (typeof x === 'undefined' || x==null)
                        return;
                    var key = Object.keys(x)[0];
                    if (x[key])
                        arr.push(x[key]);
                });
                callback(null, arr);
            }
            else {
                callback(null, result);
            }
        }
        else {
            callback(null, result);
        }
    }
    catch (e) {
        callback(e);
    }

};


/**
 * @param {Boolean=} value
 * @returns {DataQueryable}
 */
DataQueryable.prototype.silent = function(value) {
    /**
     * @type {boolean}
     * @private
     */
    this.$silent = false;
    if (typeof value === 'undefined') {
        this.$silent = true;
    }
    else {
        this.$silent = value;
    }
    return this;
};

/**
 * @param {Boolean=} value
 * @returns {DataQueryable}
 */
DataQueryable.prototype.asArray = function(value) {
    /**
     * @type {boolean}
     * @private
     */
    this.$asArray = false;
    if (typeof value === 'undefined') {
        this.$asArray = true;
    }
    else {
        this.$asArray = value;
    }
    return this;
};

/**
 * Sets the expandable model or models.
 * @param {String|DataAssociationMapping|Array} model A string or object that represents a model or an array of models to be expanded.
 * @returns {DataQueryable}
 */
DataQueryable.prototype.expand = function(model) {
    var self = this;
    if (typeof model === 'undefined' || model===null) {
        delete self.$expand;
    }
    else {
        if (!util.isArray(this.$expand))
            self.$expand=[];
        if (util.isArray(model)) {

            model.forEach(function(x) { self.$expand.push(x); });
        }
        else {
            self.$expand.push(model);
        }
    }
    return self;
};
/**
 * @param {boolean=} value
 * @returns {DataQueryable}
 */
DataQueryable.prototype.flatten = function(value) {

    if (value || (typeof value==='undefined')) {
        //delete expandable data (if any)
        delete this.$expand;
        this.$flatten = true;
    }
    else {
        delete this.$flatten;
    }

    return this;
};

function DataModelBatch() {
    /**
     * Gets or sets a string that represents the data table that is going to be used in this operation.
     * This property cannot be null.
     */
    this.appliesTo = null;
    /**
     * Gets an array that contains the items to be added
     */
    this.add = [];
    /**
     * Gets an array that contains the items to be updated
     */
    this.change = [];
    /**
     * Gets an array that contains the items to be updated
     */
    this.remove = [];
    /**
     * Gets or sets the target model
     * @type {DataModel}
     */
    this.model = null;
}

DataModelBatch.prototype.prepare = function(obj) {
    var self = this;
    if (self.model==null)
        throw new Error('The model of a batch operation cannot be empty at this context.');
    var key = self.model.key();
    if (!obj)
        return;
    var items = util.isArray(obj) ? obj : [obj];
    array(items).each(function(x) {
        if (x[key.name]!=null) {
        //state is modified
            self.change = self.change || [];
            self.change.push(x);
        }
        else {
        //state is added
            self.add = self.add || [];
            self.add.push(x);
        }
    });
};
/**
 * @constructor
 * Represents a model migration scheme against data adapters
 */
function DataModelMigration() {
    /**
     * Gets an array that contains the definition of fields that are going to be added
     * @type {Array}
     */
    this.add = [];
    /**
     * Gets an array that contains the definition of fields that are going to be deleted
     * @type {Array}
     */
    this.remove = [];
    /**
     * Gets an array that contains the definition of fields that are going to be changed
     * @type {Array}
     */
    this.change = [];
    /**
     * Gets or sets a string that contains the internal version of this migration. This property cannot be null.
     * @type {string}
     */
    this.version = '0.0';
    /**
     * Gets or sets a string that represents a short description of this migration
     * @type {string}
     */
    this.description = null;
    /**
     * Gets or sets a string that represents the adapter that is going to be migrated through this operation.
     * This property cannot be null.
     */
    this.appliesTo = null;
    /**
     * Gets or sets a string that represents the model that is going to be migrated through this operation.
     * This property may be null.
     */
    this.model = null;
}
/**
 * DataObject class represents a data object that is going to be used in data and other operations
 * @class DataObject
 * @param {string=} type
 * @param {*=} obj The object that is going to be extended
 * @constructor
 * @augments EventEmitter2
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
    /**
     * @type {DataContext}
     */
    this.context = undefined;

    if (typeof obj !== 'undefined' && obj != null) {
        util._extend(this, obj);
    }

}
util.inherits(DataObject, __types__.EventEmitter2);

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
    //register before listeners
    var beforeListeners = self.listeners('before.save');
    for (var i = 0; i < beforeListeners.length; i++) {
        var beforeListener = beforeListeners[i];
        model.on('before.save', beforeListener);
    }
    //register after listeners
    var afterListeners = self.listeners('after.save');
    for (var i = 0; i < afterListeners.length; i++) {
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
/**
 * @class DataObjectRelation
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj
 * @param {String} name
 * @property {DataObject} parent Gets or sets the parent data object
 */
function DataObjectRelation(obj, name)
{
    /**
     * @type {DataObject}
     * @private
     */
    var p = obj;
    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return p;
    }, set: function (value) {
        p = value;
    }, configurable: false, enumerable: false});
    /**
     * @type {DataAssociationMapping}
     */
    this.mapping = undefined;
    //DataObjectRelation.super_.call(this, relatedModel);
    var self = this;
    //set relation mapping
    if (self.parent!=null) {
        var model = self.parent.getModel();
        if (model!=null) {
            self.mapping = model.inferMapping(name);
        }
    }

    var q = null;
    //override query property
    Object.defineProperty(this, 'query', {
        get:function() {
            //if query is already defined
            if (q!=null)
                //return this query
                return q;
            if (typeof self.mapping != 'object')
                throw new Error('Data relation mapping cannot be empty when defining the underlying query of a data object relation.')
            //get model (the child model of relation mapping)
            var model = new DataModel(cfg.current.model(self.mapping.childModel));
            //get related model (the parent model of relation mapping)
            var relatedModel = new DataModel(cfg.current.model(self.mapping.parentModel));
            //get related model's adapter
            var relatedAdapter = relatedModel.viewAdapter;
            //query related adapter
            q = qry.query(relatedAdapter)
            //ensure context (based on data object ensure context)
            q.ensureContext = self.ensureContext;
            //select all fields
            q.select(array(relatedModel.attributeNames).select(function(x) {
                return qry.fields.select(x).from(relatedAdapter);
            }).toArray());
            //prepare query by selecting the foreign key of the related object
            q = qry.query(relatedAdapter).where(self.mapping.parentField).equal(self.parent[self.mapping.childField]).prepare();
            return q;
        }, configurable:false, enumerable:false
    });

    var m = null;
    //override model property
    Object.defineProperty(this, 'model', {
        get:function() {
            //if query is already defined
            if (m!=null)
            //return this query
                return m;
            m = new DataModel(cfg.current.model(self.mapping.parentModel));
            return m;
        }, configurable:false, enumerable:false
    });


}
util.inherits(DataObjectRelation, DataQueryable);
/**
 * @param {Function} callback
 */
DataObjectRelation.prototype.remove = function(callback) {
    var self = this;
    if (typeof self.mapping === 'object') {
        if (typeof self.parent === 'object') {
            self.parent[self.mapping.childField] = null;
            var ctx = self.ensureContext();
            self.parent.save(ctx, callback);
        }
        else
            callback(new Error('The target object cannot be empty at this context.'));
    }
    else
        callback(new Error('The relation mapping cannot be empty at this context.'));
};

DataObjectRelation.prototype.insert = function(obj, callback) {
    var self = this;
    if (typeof self.mapping === 'object') {
        if (typeof self.parent === 'object') {
            self.parent[self.mapping.childField] = obj[self.mapping.parentField];
            var ctx = self.ensureContext();
            self.parent.save(ctx, function(err) {
                callback(err);
            });
        }
        else
            callback(new Error('The target object cannot be empty at this context.'));
    }
    else
        callback(new Error('The relation mapping cannot be empty at this context.'));
};

/**
 * @class HasManyAssociation
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj A DataObject instance that represents the parent data object
 * @param {String|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 * @property {DataObject} parent Gets or sets the parent data object
 */
function HasManyAssociation(obj, association)
{
    /**
     * @type {DataObject}
     * @private
     */
    var parent = obj;
    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return parent;
    }, set: function (value) {
        parent = value;
    }, configurable: false, enumerable: false});
    var self = this;
    /**
     * @type {DataAssociationMapping}
     */
    this.mapping = undefined;
    if (typeof association === 'string') {
        //infer mapping from field name
        //set relation mapping
        if (self.parent!=null) {
            var model = self.parent.getModel();
            if (model!=null)
                self.mapping = model.inferMapping(association);
        }
    }
    else if (typeof association === 'object' && association !=null) {
        //get the specified mapping
        if (association instanceof DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = util._extend(new DataAssociationMapping(), association);
    }

    var q = null;
    //override query property
    Object.defineProperty(this, 'query', {
        get:function() {
            //if query is already defined
            if (q!=null)
            //return this query
                return q;
            if (typeof self.mapping === 'undefined' || self.mapping==null)
                throw new Error('Data association mapping cannot be empty at this context.');
            //prepare query by selecting the foreign key of the related object
            q = qry.query(self.model.viewAdapter).where(self.mapping.childField).equal(self.parent[self.mapping.parentField]).prepare();
            return q;
        }, configurable:false, enumerable:false
    });

    var m = null;
    //override model property
    Object.defineProperty(this, 'model', {
        get:function() {
            //if query is already defined
            if (m!=null)
            //return this query
                return m;
            m = self.parent.context.model(self.mapping.childModel);
            return m;
        }, configurable:false, enumerable:false
    });


}
util.inherits(HasManyAssociation, DataQueryable);


/**
 * @class HasManyAssociation
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj A DataObject instance that represents the parent data object
 * @param {String|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 * @property {DataObject} parent Gets or sets the parent data object
 */
function HasOneAssociation(obj, association)
{
    /**
     * @type {DataObject}
     * @private
     */
    var parent = obj;
    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return parent;
    }, set: function (value) {
        parent = value;
    }, configurable: false, enumerable: false});
    var self = this;
    /**
     * @type {DataAssociationMapping}
     */
    this.mapping = undefined;
    if (typeof association === 'string') {
        //infer mapping from field name
        //set relation mapping
        if (self.parent!=null) {
            var model = self.parent.getModel();
            if (model!=null)
                self.mapping = model.inferMapping(association);
        }
    }
    else if (typeof association === 'object' && association !=null) {
        //get the specified mapping
        if (association instanceof DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = util._extend(new DataAssociationMapping(), association);
    }

    var q = null;
    //override query property
    Object.defineProperty(this, 'query', {
        get:function() {
            //if query is already defined
            if (q!=null)
            //return this query
                return q;
            if (typeof self.mapping === 'undefined' || self.mapping==null)
                throw new Error('Data association mapping cannot be empty at this context.');
            //prepare query by selecting the foreign key of the related object
            q = qry.query(self.model.viewAdapter).where(self.mapping.parentField).equal(self.parent[self.mapping.childField]).prepare();
            return q;
        }, configurable:false, enumerable:false
    });

    var m = null;
    //override model property
    Object.defineProperty(this, 'model', {
        get:function() {
            //if query is already defined
            if (m!=null)
            //return this query
                return m;
            m = self.parent.context.model(self.mapping.parentModel);
            return m;
        }, configurable:false, enumerable:false
    });


}
util.inherits(HasOneAssociation, DataQueryable);

/**
 * @class HasParentJunction
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj The parent data object reference
 * @param {String|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 */
function HasParentJunction(obj, association) {
    /**
     * @type {DataObject}
     * @private
     */
    var __parent = obj;
    var self = this;
    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return __parent;
    }, set: function (value) {
        __parent = value;
    }, configurable: false, enumerable: false});

    /**
     * @type {DataAssociationMapping}
     */
    this.mapping = undefined;
    if (typeof association === 'string') {
        //infer mapping from field name
        //set relation mapping
        if (self.parent!=null) {
            var model = self.parent.getModel();
            if (model!=null)
                self.mapping = model.inferMapping(association);
        }
    }
    else if (typeof association === 'object' && association !=null) {
        //get the specified mapping
        if (association instanceof DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = util._extend(new DataAssociationMapping(), association);
    }

    //get related model
    var model=self.parent.getModel(),  relatedModel = this.parent.context.model(self.mapping.parentModel);
    //call super class constructor
    HasParentJunction.super_.call(this, relatedModel);
    //modify query (add join model)
    var adapter = relatedModel.viewAdapter;
    var left = {}, right = {};
    this.query.select(array(relatedModel.attributes).where(function(x) {
        return !x.many;
    }).select(function(x) {
        return qry.fields.select(x.name).from(adapter);
    }).toArray());
    var associationAdapter = self.mapping.associationAdapter,
        parentField = qry.fields.select(DataObjectJunction.STR_OBJECT_FIELD).from(associationAdapter).$name,
        childField = qry.fields.select(DataObjectJunction.STR_VALUE_FIELD).from(associationAdapter).$name;
    left[adapter] = [ this.mapping.parentField ];
    right[associationAdapter] = [parentField];
    this.query.join(this.mapping.associationAdapter, []).with([left, right]).where(childField).equal(obj[this.mapping.childField]).prepare();

    /**
     * Gets the model that holds association data
     * @type {DataModel}
     */
    this.baseModel = undefined;
    var baseModel = null;
    Object.defineProperty(this, 'baseModel', {
        get: function() {
            if (baseModel)
                return baseModel;
            //sarch in cache (configuration.current.cache)
            if (cfg.current.models[self.mapping.associationAdapter]) {
                baseModel = new DataModel(cfg.current.models[self.mapping.associationAdapter]);
                baseModel.context = self.parent.context;
                return baseModel;
            }
            //otherwise create model
            var parentModel = self.parent.getModel();
            var parentField = parentModel.field(self.mapping.parentField);
            var childModel = self.parent.context.model(self.mapping.childModel);
            var childField = childModel.field(self.mapping.childField);
            var adapter = self.mapping.associationAdapter;
            cfg.current.models[adapter] = { name:adapter, title: adapter, source:adapter, view:adapter, version:'1.0', fields:[
                { name: "id", type:"Counter", primary: true },
                { name: 'parentId', nullable:false, type:parentField.type },
                { name: 'valueId', nullable:false, type:childField.type } ],
                constraints: [
                    {
                        description: "The relation between two objects must be unique.",
                        type:"unique",
                        fields: [ 'parentId', 'valueId' ]
                    }
                ]};
            //initialize base model
            baseModel = new DataModel(cfg.current.models[adapter]);
            baseModel.context = self.parent.context;
            return baseModel;
        },configurable:false, enumerable:false
    });

}

util.inherits(HasParentJunction, DataQueryable);

/**
 * Inserts a new association between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
HasParentJunction.prototype.insertSingleObject = function(obj, callback) {
    var self = this;
    //get parent and child
    var parent = obj;
    if (typeof obj !== 'object') {
        parent = {};
        parent[self.mapping.parentField] = obj;
    }
    var parentId = parent[self.mapping.parentField], childId = self.parent[self.mapping.childField];
    //validate relation existance
    self.baseModel.where('parentId').equal(parentId).and('valueId').equal(childId).first(function(err, result) {
        if (err) {
            //on error exit with error
            callback(err);
            return;
        }
        else {
            if (result) {
                //if relation already exists, do nothing
                callback(null);
                return;
            }
            else {
                //otherwise create new item
                var newItem = { };
                newItem['parentId'] = parentId;
                newItem['valueId'] = childId;
                //and insert it
                self.baseModel.insert(newItem, callback);
            }
        }
    });
};

/**
 * @param {*|Array} obj An item of a collection of items that is going to be related with parent object
 * @param {Function} callback
 */
HasParentJunction.prototype.insert = function(obj, callback) {
    var self = this;
    var arr = [];
    if (util.isArray(obj))
        arr = obj;
    else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err)
            callback(err);
        else {
            async.eachSeries(arr, function(item, cb) {
                var parent = item;
                if (typeof item !== 'object') {
                    parent = {};
                    parent[self.mapping.parentField] = item;
                }
                //validate if child identifierr exists
                if (parent.hasOwnProperty(self.mapping.parentField)) {
                    self.insertSingleObject(parent, function(err) {
                        cb(err);
                    });
                }
                else {
                    //get related model
                    var relatedModel = self.parent.context.model(self.mapping.parentModel);
                    //find object by querying child object
                    relatedModel.find(item).select([self.mapping.parentField]).first(function (err, result) {
                        if (err) {
                            cb(null);
                        }
                        else {
                            if (!result) {
                                //child was not found (do nothing or throw exception)
                                cb(null);
                            }
                            else {
                                parent[self.mapping.parentField] = result[self.mapping.parentField];
                                self.insertSingleObject(parent, function(err) {
                                    cb(err);
                                });
                            }
                        }
                    });
                }

            }, callback);
        }
    })

};

/**
 * Removes a relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
HasParentJunction.prototype.removeSingleObject = function(obj, callback) {
    var self = this;
    //get parent and child
    var parent = obj;
    if (typeof obj !== 'object') {
        parent = {};
        parent[self.mapping.parentField] = obj;
    }
    var parentId = parent[self.mapping.parentField], childId = self.parent[self.mapping.childField];
    //get relation model
    self.baseModel.where('parentId').equal(parentId).and('valueId').equal(childId).first(function(err, result) {
        if (err) {
            callback(err);
            return;
        }
        else {
            if (!result) {
                callback(null);
            }
            else {
                //otherwise remove item
                self.baseModel.remove(result, callback);
            }
        }
    });
};

/**
 * @param {*|Array} obj An item of a collection of items that is going to be related with parent object
 * @param {Function} callback
 */
HasParentJunction.prototype.remove = function(obj, callback) {
    var self = this;
    var arr = [];
    if (util.isArray(obj))
        arr = obj;
    else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err)
            callback(err);
        else
        {
            async.eachSeries(arr, function(item, cb) {
                var parent = item;
                if (typeof item !== 'object') {
                    parent = {};
                    parent[self.mapping.parentField] = item;
                }
                //get related model
                var relatedModel = self.parent.context.model(self.mapping.parentModel);
                //find object by querying child object
                relatedModel.find(parent).select([self.mapping.parentField]).first(function (err, result) {
                    if (err) {
                        cb(null);
                        return;
                    }
                    else {
                        if (!result) {
                            //child was not found (do nothing or throw exception)
                            cb(null);
                        }
                        else {
                            parent[self.mapping.parentField] = result[self.mapping.parentField];
                            self.removeSingleObject(parent, function(err) {
                                cb(err);
                            });
                        }
                    }
                });
            }, callback);
        }
    })
};

HasParentJunction.prototype.migrate = function(callback) {
    this.baseModel.migrate(callback);
};

/**
 * @class DataObjectJunction
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj The parent data object reference
 * @param {String|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 */
function DataObjectJunction(obj, association) {
    /**
     * @type {DataObject}
     * @private
     */
    var __parent = obj;
    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return __parent;
    }, set: function (value) {
        __parent = value;
    }, configurable: false, enumerable: false});
    var self = this;
    /**
     * @type {DataAssociationMapping}
     */
    this.mapping = undefined;
    if (typeof association === 'string') {
        //infer mapping from field name
        //set relation mapping
        if (self.parent!=null) {
            var model = self.parent.getModel();
            if (model!=null)
                self.mapping = model.inferMapping(association);
        }
    }
    else if (typeof association === 'object' && association !=null) {
        //get the specified mapping
        if (association instanceof DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = util._extend(new DataAssociationMapping(), association);
    }
    //get related model
    var relatedModel = this.parent.context.model(self.mapping.childModel);
    //call super class constructor
    DataObjectJunction.super_.call(this, relatedModel);
    //modify query (add join model)
    var adapter = relatedModel.viewAdapter;
    var left = {}, right = {};
    this.query.select(array(relatedModel.attributes).where(function(x) {
        return !x.many;
    }).select(function(x) {
        return qry.fields.select(x.name).from(adapter);
    }).toArray());
    left[adapter] = [ relatedModel.primaryKey ];
    right[this.mapping.associationAdapter] = [qry.fields.select(DataObjectJunction.STR_VALUE_FIELD).from(this.mapping.associationAdapter).$name];
    var field1 = qry.fields.select(DataObjectJunction.STR_OBJECT_FIELD).from(this.mapping.associationAdapter).$name;
    this.query.join(this.mapping.associationAdapter, []).with([left, right]).where(field1).equal(obj[this.mapping.parentField]).prepare();

    var self = this;
    /**
     * Gets the model that holds association data
     * @type {DataModel}
     */
    this.baseModel = undefined;
    var baseModel = null;
    Object.defineProperty(this, 'baseModel', {
        get: function() {
            if (baseModel)
                return baseModel;
            //sarch in cache (configuration.current.cache)
            if (cfg.current.models[self.mapping.associationAdapter]) {
                baseModel = new DataModel(cfg.current.models[self.mapping.associationAdapter]);
                baseModel.context = self.parent.context;
                return baseModel;
            }
            //get parent and child field in order to get junction field types
            var parentModel = self.parent.getModel();
            var parentField = parentModel.field(self.mapping.parentField);
            //todo::child model is optional (e.g. multiple value fields). Sometimes it needs to be ignored.
            var childModel = self.parent.context.model(self.mapping.childModel);
            var childField = childModel.field(self.mapping.childField);
            var adapter = self.mapping.associationAdapter;
            var tempModel = { name:adapter, title: adapter, source:adapter, view:adapter, version:'1.0', fields:[
                { name: "id", type:"Counter", primary: true },
                { name: DataObjectJunction.STR_OBJECT_FIELD, nullable:false, type: (parentField.type=='Counter') ? 'Integer' : parentField.type },
                { name: DataObjectJunction.STR_VALUE_FIELD, nullable:false, type: (childField.type=='Counter') ? 'Integer' : childField.type } ],
                constraints: [
                    {
                        description: "The relation between two objects must be unique.",
                        type:"unique",
                        fields: [ DataObjectJunction.STR_OBJECT_FIELD, DataObjectJunction.STR_VALUE_FIELD ]
                    }
                ]};
            //cache model
            cfg.current.models[self.mapping.associationAdapter] = new DataModel(tempModel);
            //initialize base model
            baseModel = new DataModel(cfg.current.models[self.mapping.associationAdapter]);
            baseModel.context = self.parent.context;
            return baseModel;
        },configurable:false, enumerable:false
    });

}
DataObjectJunction.STR_OBJECT_FIELD = 'parentId';
DataObjectJunction.STR_VALUE_FIELD = 'valueId';

util.inherits(DataObjectJunction, DataQueryable);
/**
 * Gets a temporary data model that refers to the current object relation
 * @private
 * @returns {DataModel}
 */
DataObjectJunction.prototype.getRelationModel = function()
{
    var self = this;
    //get parent and child field in order to get junction field types
    var parentModel = self.parent.getModel();
    var parentField = parentModel.field(self.mapping.parentField);
    //todo::child model is optional (e.g. multiple value fields). Sometimes it needs to be ignored.
    var childModel = self.parent.context.model(self.mapping.childModel);
    var childField = childModel.field(self.mapping.childField);
    var adapter = self.mapping.associationAdapter;
    var tempModel = { name:adapter, title: adapter, source:adapter, view:adapter, version:'1.0', fields:[
        { name: "id", type:"Counter", primary: true },
        { name: DataObjectJunction.STR_OBJECT_FIELD, nullable:false, type: (parentField.type=='Counter') ? 'Integer' : parentField.type },
        { name: DataObjectJunction.STR_VALUE_FIELD, nullable:false, type: (childField.type=='Counter') ? 'Integer' : childField.type } ],
        constraints: [
            {
                description: "The relation between two objects must be unique.",
                type:"unique",
                fields: [ DataObjectJunction.STR_OBJECT_FIELD, DataObjectJunction.STR_VALUE_FIELD ]
            }
        ]};
    var relationModel = new DataModel(tempModel);
    relationModel.context = self.parent.context;
    return relationModel;
};

DataObjectJunction.prototype.migrate = function(callback) {
    var model = this.getRelationModel();
    model.migrate(callback);
};

DataObjectJunction.prototype.execute = function(callback) {
    var self = this;
    self.migrate(function(err) {
        if (err) { callback(err); return; }
        //noinspection JSPotentiallyInvalidConstructorUsage
        DataObjectJunction.super_.prototype.execute.call(self, callback);
    });
};

/**
 * @param {*|Array} obj An item of a collection of items that is going to be related with parent object
 * @param {Function} callback
 */
DataObjectJunction.prototype.insert = function(obj, callback) {
    var self = this;
    var arr = [];
    if (util.isArray(obj))
        arr = obj;
    else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err)
            callback(err);
        else {
            async.eachSeries(arr, function(item, cb) {
                var child = item;
                if (typeof item !== 'object') {
                    child = {};
                    child[self.mapping.childField] = item;
                }
                //validate if child identifierr exists
                if (child.hasOwnProperty(self.mapping.childField)) {
                    self.insertSingleObject(child, function(err) {
                        cb(err);
                    });
                }
                else {
                    /**
                     * Get related model. The related model is the model of any child object of this junction.
                     * @type {DataModel}
                     */
                    var relatedModel = self.parent.context.model(self.mapping.childModel);
                    //find object by querying child object
                    relatedModel.find(child).select([self.mapping.childField]).first(function (err, result) {
                        if (err) {
                            cb(err);
                        }
                        else {
                            /**
                             * Validates related object, inserts this object if does not exists
                             * and finally defines the relation between child and parent objects
                             */
                            if (!result) {
                                //insert related item if does not exists
                                relatedModel.insert(child, function(err) {
                                   if (err) {
                                       cb(err);
                                   }
                                    else {
                                       //insert relation between child and parent
                                       self.insertSingleObject(child, function(err) { cb(err); });
                                   }
                                });
                            }
                            else {
                                //set primary key
                                child[self.mapping.childField] = result[self.mapping.childField];
                                //insert relation between child and parent
                                self.insertSingleObject(child, function(err) { cb(err); });
                            }
                        }
                    });
                }

            }, callback);
        }
    })

};

/**
 * Removes all the associated items
 * @param {Function} callback
 */
DataObjectJunction.prototype.clear = function(callback) {
    var self = this;
    self.migrate(function(err) {
        if (err)
            callback(err);
        else {
            //get parent id
            var parentId = self.parent[self.mapping.parentField]
            //get relation model
            var relationModel = self.getRelationModel();
            //validate relation existance
            relationModel.where(DataObjectJunction.STR_OBJECT_FIELD).equal(parentId).all(function(err, result) {
                if (err) {
                    callback(err);
                }
                else {
                    relationModel.remove(result, callback);
                }
            });
        }
    });
};

/**
 * Inserts a new relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
DataObjectJunction.prototype.insertSingleObject = function(obj, callback) {
    var self = this;
    //get parent and child
    var child = obj;
    if (typeof obj !== 'object') {
        child = {};
        child[self.mapping.childField] = obj;
    }
    var parentId = self.parent[self.mapping.parentField], childId = child[self.mapping.childField];
    //get relation model
    var relationModel = self.getRelationModel();
    //validate relation existance
    relationModel.where(DataObjectJunction.STR_OBJECT_FIELD).equal(parentId).and(DataObjectJunction.STR_VALUE_FIELD).equal(childId).first(function(err, result) {
        if (err) {
            //on error exit with error
            callback(err);
            return;
        }
        else {
            if (result) {
                //if relation already exists, do nothing
                callback(null);
                return;
            }
            else {
                //otherwise create new item
                var newItem = { };
                newItem[DataObjectJunction.STR_OBJECT_FIELD] = parentId;
                newItem[DataObjectJunction.STR_VALUE_FIELD] = childId;
                //and insert it
                relationModel.insert(newItem, callback);
            }
        }
    });

};
/**
 * Migrates current junction data storage
 * @param {Function} callback
 */
DataObjectJunction.prototype.migrate = function(callback)
{
    var self = this;
    //auto migrate junction table
    var migrationModel = cfg.current.models.Migration.clone(self.parent.context);
    var relationModel = self.getRelationModel();
    migrationModel.find({ appliesTo:relationModel.source, version: relationModel.version }).first(function(err, result) {
        if (err) {
            callback(err);
        }
        else {
            if (!result) {
                //migrate junction table
                relationModel.migrate(function(err) {
                    if (err) {
                        callback(err);
                    }
                    else
                        callback(null);
                })
            }
            else
                callback(null);
        }
    });
}

/**
 * @param {*|Array} obj An item of a collection of items that is going to be related with parent object
 * @param {Function} callback
 */
DataObjectJunction.prototype.remove = function(obj, callback) {
    var self = this;
    var arr = [];
    if (util.isArray(obj))
        arr = obj;
    else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err)
            callback(err);
        else
        {
            async.eachSeries(arr, function(item, cb) {
                var child = item;
                if (typeof item !== 'object') {
                    child = {};
                    child[self.mapping.childField] = item;
                }
                //get related model
                var relatedModel = self.parent.context.model(self.mapping.childModel);
                //find object by querying child object
                relatedModel.find(child).select([self.mapping.childField]).first(function (err, result) {
                    if (err) {
                        cb(null);
                        return;
                    }
                    else {
                        if (!result) {
                            //child was not found (do nothing or throw exception)
                            cb(null);
                        }
                        else {
                            child[self.mapping.childField] = result[self.mapping.childField];
                            self.removeSingleObject(child, function(err) {
                                cb(err);
                            });
                        }
                    }
                });
            }, callback);
        }
    })
};

/**
 * Removes a relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
DataObjectJunction.prototype.removeSingleObject = function(obj, callback) {
    var self = this;
    //get parent and child
    var child = obj;
    if (typeof obj !== 'object') {
        child = {};
        child[self.mapping.childField] = obj;
    }
    var parentId = self.parent[self.mapping.parentField], childId = child[self.mapping.childField];
    //get relation model
    var relationModel = self.getRelationModel();
    relationModel.where(DataObjectJunction.STR_OBJECT_FIELD).equal(parentId).and(DataObjectJunction.STR_VALUE_FIELD).equal(childId).first(function(err, result) {
        if (err) {
            callback(err);
            return;
        }
        else {
            if (!result) {
                callback(null);
            }
            else {
                //otherwise remove item
                relationModel.remove(result, callback);
            }
        }
    });
};

/**
 * @class DataObjectJunction
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj The parent data object reference
 */
function DataObjectValues(obj, name) {
    /**
     * @type {DataObject}
     * @private
     */
    var __parent = obj;
    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return __parent;
    }, set: function (value) {
        __parent = value;
    }, configurable: false, enumerable: false});

    //get object model
    var model = this.parent.getModel();
    //get model's field based on the given name
    var field = model.field(name);
    /**
     * Gets data relation mapping
     * @type {DataAssociationMapping}
     */
    this.mapping = new DataAssociationMapping(
        {
            parentModel: model.name,
            parentField: model.primaryKey,
            associationType: 'multivalued',
            associationAdapter: model.name.concat(string(field.name).capitalize())
        });
    if (field.mapping) {
        //extend the already defined relation type
        util._extend(this.mapping, field.mapping);
    }

    //call super class constructor
    DataObjectRelation.super_.call(this, null);
    //modify query (add join model)
    var adapter = this.mapping.associationAdapter;
    var left = {}, right = {};
    this.query.select(array([DataObjectJunction.STR_OBJECT_FIELD,DataObjectJunction.STR_VALUE_FIELD]).select(function(x) {
        return qry.fields.select(x).from(adapter);
    }).toArray());
    left[model.sourceAdapter] = [ model.primaryKey ];
    right[adapter] = [qry.fields.select(DataObjectJunction.STR_VALUE_FIELD).from(this.mapping.associationAdapter).$name];
    var field1 = qry.fields.select(DataObjectJunction.STR_OBJECT_FIELD).from(this.mapping.associationAdapter).$name;
    this.query.join(adapter, []).with([left, right]).where(field1).equal(obj[model.primaryKey]);

}

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
DefaultValueListener.beforeSave = function(e, callback) {

    var self = this, state = e.state!==undefined ? e.state : 0;
    if (state!=1)
    {
        callback(null);
    }
    else {
        //get function context
        var functions = require('./functions'), functionContext = functions.createContext();
        util._extend(functionContext, e);
        //find all attributes that have a default value
        var attrs = array(e.model.attributes).where(function(x) { return (x.value!==undefined); }).toArray();
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
                cb(null);
                return 0;
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
                if (typeof value === 'function')
                //then call function against the target object
                    e.target[attr.name] = value.call(e.target);
                else
                //otherwise get value
                    e.target[attr.name] = value;
                cb(null);
                return 0;
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
            /*if (expr.indexOf('fn:')==0) {
                expr = expr.substring('fn:'.length);
                if (expr.indexOf('()')>0)
                    expr = expr.substring(0, expr.indexOf('()'));
                var fn = functionContext[expr];
                if (typeof fn === 'function') {
                    fn.call(self, e, function(err, result) {
                        if (err) {
                            cb(err);
                        }
                        else {
                            e.target[attr.name] = result;
                            cb(null);
                        }
                    });
                }
                else {
                    //do nothing
                    cb(null);
                }
            }
            else {
                //do nothing
                cb(null);
            }*/
        }, function(err) {
            callback(err);
        });
    }
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
CalculatedValueListener.beforeSave = function(e, callback) {
    //get function context
    var functions = require('./functions'), functionContext = functions.createContext();
    util._extend(functionContext, e);
    //find all attributes that have a default value
    var attrs = array(e.model.attributes).where(function(x) { return (x.calculation!==undefined); }).toArray();
    async.eachSeries(attrs, function(attr, cb) {
        var expr = attr.calculation;
        //validate expression
        if (typeof expr !== 'string') {
            e.target[attr.name] = expr;
            cb(null);
            return 0;
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
            if (typeof value === 'function')
            //then call function against the target object
                e.target[attr.name] = value.call(e.target);
            else
            //otherwise get value
                e.target[attr.name] = value;
            cb(null);
            return 0;
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
        /*if (expr.indexOf('fn:')==0) {
            *//*expr = expr.substring('fn:'.length);
            if (expr.indexOf('()')>0)
                expr = expr.substring(0, expr.indexOf('()'));*//*
            *//*functionContext.eval(expr, function(err, result) {
                if (err) {
                    cb(err);
                }
                else {
                    e.target[attr.name] = result;
                    cb(null);
                }
            });*//*

            *//*var fn = functionContext[expr];
            if (typeof fn === 'function') {
                *//**//*fn.call(self, e, function(err, result) {
                    if (err) {
                        cb(err);
                    }
                    else {
                        e.target[attr.name] = result;
                        cb(null);
                    }
                });*//**//*
            }
            else {
                //do nothing
                cb(null);
            }*//*
        }
        else {
            //do nothing
            cb(null);
        }*/
    }, function(err) {
        callback(err);
    });
};

/**
 * @class DataObjectAssociationListener
 * @constructor
 */
function DataObjectAssociationListener() {
    //
}

DataObjectAssociationListener.beforeSave = function(e, callback) {
    try {
        if (typeof e.target === 'undefined' || e.target==null) {
            callback(null);
        }
        else {
            var keys = Object.keys(e.target);
            var mappings = [];
            keys.forEach(function(x) {
               if (e.target.hasOwnProperty(x)) {
                   if (typeof e.target[x] === 'object' && e.target[x]!=null) {
                       //try to find field mapping, if any
                       var mapping = e.model.inferMapping(x);
                       if (mapping)
                           mappings.push(mapping);
                   }
               }
            });
            async.eachSeries(mappings,
                /**
                 * @param {DataAssociationMapping} mapping
                 * @param {Function(Error=)} cb
                 */
                function(mapping, cb) {
                    if (mapping.associationType='association') {
                        if (mapping.childModel== e.model.name) {
                            //get child field
                            var childAttr = e.model.field(mapping.childField), childField = childAttr.property || childAttr.name;
                            //foreign key association
                            if (typeof e.target[childField] !== 'object') {
                                cb(null);
                                return;
                            }
                            var value = e.target[childField][mapping.parentField];
                            if (value) {
                                e.target[mapping.childField] = value;
                                if (childAttr.property)
                                    delete e.target[childAttr.property];
                                cb(null);
                            }
                            else {
                                //try to find foreign item
                                var associatedModel = e.model.context.model(mapping.parentModel);
                                associatedModel.find(e.target[childField]).select(mapping.parentField).silent().first(function(err, result) {
                                    if (err) {
                                        cb(err);
                                    }
                                    else {
                                        if (result) {
                                            e.target[childField] = result[mapping.parentField];
                                            cb(null);
                                        }
                                        else {
                                            cb(new Error(util.format('The associated object of type %s cannot be found.',associatedModel.name)))
                                        }
                                    }
                                });
                            }
                            return;
                        }
                    }
                    cb(null);

            }, function(err) {
               callback(err);
            });
        }
    }
    catch (e) {
        callback(e);
    }

}

DataObjectAssociationListener.afterSave = function(e, callback) {
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
                 * @param {DataAssociationMapping} mapping
                 * @param {Function(Error=)} cb
                 */
                    function(x, cb) {
                    if (x.mapping.associationType=='junction') {
                        var obj = e.model.convert(e.target);
                        var junction = new DataObjectJunction(obj, x.mapping);
                        var childs = obj[x.name];
                        if (!util.isArray(childs)) {
                            cb(null);
                            return;
                        }
                        junction.clear(function(err) {
                            if (err) {
                                cb(null);
                                return;
                            }
                            if (e.state==1 || e.state==2) {
                                junction.insert(childs, function(err, result) {
                                    if (err) {
                                        cb(err);
                                    }
                                    else {
                                        cb(null);
                                    }
                                });
                            }
                            else  {
                                cb(null);
                            }
                        });
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

}

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
NotNullConstraintListener.beforeSave = function(e, callback) {

    //find all attributes that have not null flag
    var attrs = array(e.model.attributes).where(
        function(x) { return (x.nullable!==undefined) && (!x.primary);
        }).where(function(y) {
            return !y.nullable;
        }).toArray();
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
UniqueContraintListener.beforeSave = function(e, callback) {

    //there are no constraints
    if (e.model.constraints==null)
    {
        //do nothing
        callback(null);
        return;
    }
    //get unique constraints
    var constraints = array(e.model.constraints).where(function(x) {
       return (x.type=='unique');
    }).toArray();
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
        var q = null;
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
            if (value===undefined)
                value = null;
            if (q==null)
                q = e.model.where(attr).equal(value);
            else
                q.and(attr).equal(value);
        }
        if (q==null)
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
                        objectExists = result[e.model.primaryKey]!= e.target[e.model.primaryKey];
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
}

/***********/
/* globals */
/***********/
/**
 * Represents the default model for data migrations
 * @type {*}
 */
DataModel.MigrationModelDefinition =
{
    name:'Migration', title:'Data Model Migrations', id: 14, source:'migrations', view:'migrations', hidden: true, sealed:true, fields:[
    { name:'id', type:'Counter', primary:true },
    { name:'appliesTo', type:'Text', size:180, nullable:false },
    { name:'model', type:'Text', size:120 },
    { name:'description', type:'Text', size:512},
    { name:'version', type:'Text', size:40, nullable:false }
],
    constraints:[
        { type:'unique', fields:[ 'appliesTo', 'version' ] }
    ]
};
/**
 * register migration model
 */
cfg.current.models.Migration =(function() {
    //todo::use Object.defineProperty('Migration') instead of direct assignment of this property
    return new DataModel(DataModel.MigrationModelDefinition);
}).call();

var __model__ = {
    /*
     * @namespace
     **/
    common: {
        /**
         *
         * @param {Number} howMany - The length of the random sequence of characters
         * @param {string=} chars - A sequence of characters to be used in random sequence
         * @returns {string}
         */
           randomChars: function(howMany, chars) {
            chars = chars
                || "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789";
            var rnd = crypto.randomBytes(howMany)
                , value = new Array(howMany)
                , len = chars.length;
            for (var i = 0; i < howMany; i++) {
                value[i] = chars[rnd[i] % len]
            };
            return value.join('');
        }
    },
    /*
     * @namespace
    **/
    classes: {
        /**
         * Represents a data object.
         * @class
         * @constructor
         */
        DataObject : DataObject,
        /**
         * Represents a data model.
         * @class
         * @constructor
         */
        DataModel : DataModel,
        /**
         * Represents a data batch operation.
         * @class
         * @constructor
         */
        DataModelBatch : DataModelBatch,
        /**
         * Represents a data model migration.
         * @class
         * @constructor
         */
        DataModelMigration: DataModelMigration,
        /**
         * Represents a data queryable definition.
         * @class
         * @constructor
         */
        DataQueryable: DataQueryable,
        /**
         * Represents a data queryable definition.
         * @class DefaultDataContext
         * @constructor
         */
        DefaultDataContext: DefaultDataContext,
        /**
         * Represents the main data filter resolver.
         * @class DefaultDataContext
         * @constructor
         */
        DataFilterResolver: DataFilterResolver,
        /**
         * Represents the default function context.
         * @class FunctionContext
         * @constructor
         */
        FunctionContext:functions.classes.FunctionContext
    },
    /**
    * Creates an instance of DataModel class that represents a model that is going to be use in database operations.
    * @param obj {*=} An object that holds model definition and is going to be extended to DataModel
    * @returns {DataModel}
    */
   createModel: function(obj) {
       if (typeof obj === 'object')
       {
           var result = new DataModel();
           for (var prop in obj) {
               if (obj.hasOwnProperty(prop)) { result[prop] = obj[prop] }
           }
           return result;
       }
       return new DataModel();
   },
   /**
    * Creates an instance of DataContext class that represents the current data context.
    * @returns {DataContext}
    */
   createContext: function() {
       return new DefaultDataContext();
   }
};

if (typeof exports !== 'undefined')
{
    module.exports = __model__;
}


