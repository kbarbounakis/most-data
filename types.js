/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2014-01-25.
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
var events = require('events'), util = require('util'), async = require('async'), qry = require('most-query');
/**
 * Represents a data connection
 * @class DataAdapter
 * @constructor
 */
function DataAdapter(options) {
    /**
     * Represents the native database connection
     * @type {*}
     */
    this.rawConnection=null;
    /**
     * Gets or sets an object that contains native connection options (if any)
     * @type {String}
     */
    this.options = options;
}

/**
 * Opens a database connection
 * @param {function(Error=)} callback
 */
DataAdapter.prototype.open = function(callback) {
    //
};

/**
 * Closes the underlying database connection
 * @param callback {function(Error=)=}
 */
DataAdapter.prototype.close = function(callback) {
    //
};

/**
 * Executes a query and returns the result as an array of objects.
 * @param query {string|*}
 * @param values {*}
 * @param callback {Function}
 */
DataAdapter.prototype.execute = function(query, values, callback) {
    //
};
/**
 * Executes an operation against database and returns the results.
 * @param batch {DataModelBatch}
 * @param callback {Function=}
 */
DataAdapter.prototype.executeBatch = function(batch, callback) {
    //
};

/**
 * Produces a new identity value for the given entity and attribute.
 * @param entity {String} The target entity name
 * @param attribute {String} The target attribute
 * @param callback {Function=}
 */
DataAdapter.prototype.selectIdentity = function(entity, attribute , callback) {
    //
};

/**
 * Begins a transactional operation by executing the given function
 * @param fn {Function} The function to execute
 * @param callback {Function} The callback that contains the error -if any- and the results of the given operation
 */
DataAdapter.prototype.executeInTransaction = function(fn, callback) {
    //
};
/**
 * Creates a database view if the current data adapter supports views
 * @param {string} name A string that represents the name of the view to be created
 * @param {QueryExpression} query The query expression that represents the database vew
 * @param {Function} callback A callback function to be called when operation will be completed.
 */
DataAdapter.prototype.createView = function(name, query, callback) {
    //
}

/**
 * @class EventEmitter2
 * @augments EventEmitter
 * @constructor
 */
function EventEmitter2() {
    //
}
util.inherits(EventEmitter2, events.EventEmitter);
/**
 * Raises the specified event and executes event listeners as series.
 * @param {String} event The event that is going to be raised.
 * @param {*} args An object that contains the event arguments.
 * @param {Function} callback A callback function to be invoked after the execution.
 */
EventEmitter2.prototype.emit = function(event, args, callback)
{
    var self = this;
    ////example: call super class function
    //EventEmitter2.super_.emit.call(this);
    //ensure callback
    callback = callback || function() {};
    //get listeners
    var listeners = this.listeners(event);
    //validate listeners
    if (listeners.length==0) {
        //exit emitter
        callback.call(self, null);
        return;
    }
    /*
     An EventEmitter2 listener must be a function with args and a callback e.g.
     function(e, cb) {
     //do some code
     ...
     //finalize event
     cb(null);
     //or
     cb(err)
     }
     */
    //get event arguments
    var e = args;
    //apply each series
    async.applyEachSeries(listeners, e, function(err) {
        callback.call(self, err);
    });
};

EventEmitter2.prototype.once = function(type, listener) {
    var self = this;
    if (typeof listener !== 'function')
        throw TypeError('listener must be a function');
    var fired = false;
    function g() {
        self.removeListener(type, g);
        if (!fired) {
            fired = true;
            listener.apply(this, arguments);
        }
    }
    g.listener = listener;
    this.on(type, g);
    return this;
};

/**
 * @class DataEventArgs
 * @constructor
 * @property {DataModel|*} model - Represents the underlying model.
 * @property {DataObject|*} target - Represents the underlying data object.
 * @property {Number|*} state - Represents the operation state (Update, Insert, Delete).
 * @property {DataQueryable|*} emitter - Represents the event emitter, normally a DataQueryable object instance.
 * @property {*} query - Represents the underlying query expression. This property may be null.
 */
function DataEventArgs() {
    //
}

/**
 * Represents the main data context.
 * @class DataContext
 * @augments EventEmitter2
 * @constructor
 */
function DataContext() {
    /**
     * Gets the current database adapter
     * @type {DataAdapter}
     */
    this.db = undefined;
    Object.defineProperty(this, 'db', {
        get : function() {
            return null;
        },
        configurable : false,
        enumerable:false });
}

/**
 * Gets a data model based on the given data context
 * @param name {string} A string that represents the model to be loaded.
 * @returns {DataModel}
 */
DataContext.prototype.model = function(name) {
    return null;
};
/**
 * @param cb {Function}
 */
DataContext.prototype.finalize = function(cb) {
    //
};
//set EventEmitter2 inheritance
util.inherits(DataContext, EventEmitter2);

/**
 * @class DataEventListener
 * @constructor
 * @abstract
 * Represents data object event listener
 */
function DataEventListener() {
    //
}
/**
 * @param {DataEventArgs} e
 * @param {Function} cb
 * @returns {DataEventListener}
 */
DataEventListener.prototype.beforeSave = function(e, cb) {
    return this;
}
/**
 * @param {DataEventArgs} e
 * @param {Function} cb
 * @returns {DataEventListener}
 */
DataEventListener.prototype.afterSave = function(e, cb) {
    return this;
};
/**
 * @param {DataEventArgs} e
 * @param {Function} cb
 * @returns {DataEventListener}
 */
DataEventListener.prototype.beforeRemove = function(e, cb) {
    return this;
};
/**
 * @param {DataEventArgs} e
 * @param {Function} cb
 * @returns {DataEventListener}
 */
DataEventListener.prototype.afterRemove = function(e, cb) {
    return this;
};

var DateTimeRegex = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/g;
var BooleanTrueRegex = /^true$/ig;
var BooleanFalseRegex = /^false$/ig;
var NullRegex = /^null$/ig;
var UndefinedRegex = /^undefined$/ig;
var IntegerRegex =/^[-+]?\d+$/g;
var FloatRegex =/^[+-]?\d+(\.\d+)?$/g;

/*
 * EXCEPTIONS
 */

/**
 * @class DataException
 * @param {string=} code
 * @param {string=} message
 * @param {string=} innerMessage
 * @constructor
 * @property {number} status
 * @augments Error
 */
function DataException(code, message, innerMessage) {
    this.code  = code || 'EDATA';
    this.message = message || 'A general data error occured.';
    if (typeof innerMessage !== 'undefined')
        this.innerMessage = innerMessage;
}
util.inherits(DataException, Error);

/**
 * @class AccessDeniedException
 * @param {string=} message
 * @param {string=} innerMessage
 * @constructor
 */
function AccessDeniedException(message, innerMessage) {
    AccessDeniedException.super_.call(this, 'EACCESS', ('Access Denied' || message) , innerMessage);
    this.status = 401;
}
util.inherits(AccessDeniedException, DataException);

/**
 * @class {DataQueryableField}
 * @param name
 * @constructor
 */
function DataQueryableField(name) {
    if (typeof name !== 'string') {
        throw new Error('Invalid argument type. Expected string.')
    }
    this.name = name;
}

/**
 * @returns {DataQueryableField}
 */
DataQueryableField.prototype.as = function(s) {
    if (typeof s === 'undefined' || s==null) {
        delete this.$as;
        return this;
    }
    /**
     * @private
     * @type {string}
     */
    this.$as = s;
    return this;
};

/**
 * Returns the alias expression, if any.
 * @returns {string}
 * @private
 */
DataQueryableField.prototype._as = function() {
    return (typeof this.$as !== 'undefined' && this.$as != null) ? ' as ' + this.$as : '';
};

DataQueryableField.prototype.toString = function() {
    return this.name + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.max = function() {
    return util.format('max(%s)', this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.min = function() {
    return util.format('min(%s)', this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.count = function() {
    return util.format('count(%s)', this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.average = function() {
    return util.format('avg(%s)', this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.length = function() {
    return util.format('length(%s)', this.name) + this._as();
};

///**
// * @param {String} s
// * @returns {string}
// */
//DataQueryableField.prototype.indexOf = function(s) {
//    return util.format('indexof(%s,%s)', this.name, qry.escape(s)) + this._as();
//};

/**
 * @param {number} pos
 * @param {number} length
 * @returns {string}
 */
DataQueryableField.prototype.substr = function(pos, length) {
    return util.format('substring(%s,%s,%s)',this.name, pos, length) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.floor = function() {
    return util.format('floor(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.round = function() {
    return util.format('round(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.getYear = function() {
    return util.format('year(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.getDay = function() {
    return util.format('day(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.getMonth = function() {
    return util.format('month(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.getMinutes = function() {
    return util.format('minute(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.getHours = function() {
    return util.format('hour(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.getSeconds = function() {
    return util.format('second(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.getDate = function() {
    return util.format('date(%s)',this.name) + this._as();
};

///**
// * @returns {string}
// */
//DataQueryableField.prototype.ceil = function() {
//    return util('ceil(%s)',this.name);
//};

/**
 * @returns {string}
 */
DataQueryableField.prototype.toLocaleLowerCase = function() {
    return util.format('tolower(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.toLowerCase = function() {
    return util.format('tolower(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.toLocaleUpperCase = function() {
    return util.format('toupper(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.toUpperCase = function() {
    return util.format('toupper(%s)',this.name) + this._as();
};

/**
 * @returns {string}
 */
DataQueryableField.prototype.trim = function() {
    return util.format('trim(%s)',this.name) + this._as();
};

/** native extensions **/
if (typeof String.prototype.fieldOf === 'undefined')
{
    /**
     * @returns {DataQueryableField}
     */
    var fnFieldOf = function() {
        if (this == null) {
            throw new TypeError('String.prototype.fieldOf called on null or undefined');
        }
        return new DataQueryableField(this.toString());
    };
    if (!String.prototype.fieldOf) { String.prototype.fieldOf = fnFieldOf; }
}


/**
 * @class DataModelMigration
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
 * @class DataModelBatch
 * @constructor
 */
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
/**
 * @param {*} obj
 */
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
 * @class DataField
 * @constructor
 * @property {string} name - Gets or sets the internal name of this field.
 * @property {string} property - Gets or sets the property name for this field.
 * @property {string} title - Gets or sets the title of this field.
 * @property {boolean} nullable - Gets or sets a boolean that indicates whether field is nullable or not.
 * @property {string} type - Gets or sets the type of this field.
 * @property {boolean} primary - Gets or sets a boolean that indicates whether field is primary key or not.
 * @property {boolean} many - Gets or sets a boolean that indicates whether field defines an one-to-many relationship between models.
 * @property {boolean} model - Gets or sets the parent model of this field.
 * @property {*} value - Gets or sets the default value of this field.
 * @property {*} calculation - Gets or sets the calculated value of this field.
 * @property {boolean} readonly - Gets or sets a boolean that indicates whether a field is readonly.
 * @property {DataAssociationMapping} mapping - Get or sets a relation mapping for this field.
 * @property {string} coltype - Gets or sets a string that indicates the data field's column type. This attribute is used in data view definition
 * @property {boolean} expandable - Get or sets whether the current field defines an association mapping and the associated data object(s) must be included while getting data.
 * @property {string} section - Gets or sets the section where the field belongs.
 * @property {string} description - Gets or sets a short description for this field.
 * @property {string} help - Gets or sets a short help for this field.
 * @property {string} appearance - Gets or sets the appearance template of this field, if any.
 * @property {*} options - Gets or sets the available options for this field.
 * @property {boolean} virtual - Gets or sets a boolean that indicates whether this fields is a view only field or not.
 */
function DataField() {
    this.nullable = true;
    this.primary = false;
    this.readonly = false;
    this.expandable = false;
    this.virtual = false;
}


/**
 * @class DataResultSet
 * @constructor
 */
function DataResultSet() {
    /**
     * @type {number}
     */
    this.total = 0;
    /**
     * @type {number}
     */
    this.skip = 0;
    /**
     * @type {Array}
     */
    this.records = [];
}


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


var types =
{
    /**
     * @constructs DataQueryableField
     */
    DataQueryableField: DataQueryableField,
    /**
    * @constructs DataAdapter
    */
   DataAdapter: DataAdapter,
   /**
    * @constructs DataContext
    */
   DataContext: DataContext,
    /**
     * @constructs DataContextEmitter
     */
    DataContextEmitter: DataContextEmitter,
   /**
    * @constructs EventEmitter2
    */
   EventEmitter2: EventEmitter2,
    /**
     * @constructs DataEventArgs
     */
    DataEventArgs: DataEventArgs,
    /**
     * @constructs DataModelMigration
     */
    DataEventListener: DataEventListener,
    /**
     * @constructs DataModelMigration
     */
    DataModelMigration: DataModelMigration,
    /**
     * @constructs DataAssociationMapping
     */
    DataAssociationMapping:DataAssociationMapping,
    /**
     * @constructs DataModelBatch
     */
    DataModelBatch: DataModelBatch,
    parsers: {
        parseInteger: function(val) {
            if (typeof val === 'undefined' || val == null)
                return 0;
            else if (typeof val === 'number')
                return val;
            else if (typeof val === 'string') {
                if (val.match(IntegerRegex) || val.match(FloatRegex)) {
                    return parseInt(val, 10);
                }
                else if (val.match(BooleanTrueRegex))
                    return 1;
                else if (val.match(BooleanFalseRegex))
                    return 0;
            }
            else if (typeof val === 'boolean')
                return val===true ? 1 : 0;
            else {
                return parseInt(val) || 0;
            }
        },
        parseCounter: function(val) {
            return types.parsers.parseInteger(val);
        },
        parseFloat: function(val) {
            if (typeof val === 'undefined' || val == null)
                return 0;
            else if (typeof val === 'number')
                return val;
            else if (typeof val === 'string') {
                if (val.match(IntegerRegex) || val.match(FloatRegex)) {
                    return parseFloat(val);
                }
                else if (val.match(BooleanTrueRegex))
                    return 1;
            }
            else if (typeof val === 'boolean')
                return val===true ? 1 : 0;
            else {
                return parseFloat(val);
            }
        },
        parseNumber: function(val) {
            return types.parsers.parseFloat(val);
        },
        parseDateTime: function(val) {
            if (typeof val === 'undefined' || val == null)
                return null;
            if (val instanceof Date)
                return val;
            if (typeof val === 'string') {
                if (val.match(DateTimeRegex))
                    return new Date(Date.parse(val));
            }
            else if (typeof val === 'number') {
                return new Date(val);
            }
            return null;
        },
        parseDate: function(val) {
            var res = types.parsers.parseDateTime(val);
            if (res instanceof Date) {
                res.setHours(0,0,0,0);
                return res;
            }
            return res;
        },
        parseBoolean: function(val) {
            return (types.parsers.parseInteger(val)!==0);
        },
        parseText: function(val) {
            if (typeof val === 'undefined' || val == null)
                return val;
            else if (typeof val === 'string') {
                return val;
            }
            else {
                return val.toString();
            }
        }
    },
    /**
     * @constructs DataException
     */
    DataException:DataException,
    /**
     * @constructs AccessDeniedException
     */
    AccessDeniedException:AccessDeniedException,
    /**
     * @constructs DataField
     */
    DataField:DataField,
    /**
     * @constructs DataResultSet
     */
    DataResultSet:DataResultSet
};

if (typeof exports !== 'undefined')
{
    module.exports = types;
}

