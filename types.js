/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2014-01-25
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
 * @param callback {function(Error=)}
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


///**
// * @param {*} s
// * @returns {string}
// */
//DataQueryableField.prototype.substring = function(s) {
//    return util('substringof(%s,%s)',this.name,MostClientDataQueryable.escape(s));
//};

var types =
{
    /**
     * @constructs DataQueryableField
     */
    DataQueryableField: DataQueryableField,
    /**
    * DataAdapter abstract class
    * @class
    * @constructor
    */
   DataAdapter: DataAdapter,
   /**
    * DataContext abstract class
    * @class DataContext
    * @constructor
    */
   DataContext: DataContext,
   /**
    * EventEmitter2 class
    * @class
    * @constructor
    */
   EventEmitter2: EventEmitter2,
    /**
     * DataEventArgs class
     * @class
     * @constructor
     */
    DataEventArgs: DataEventArgs,
    /**
     * DataEventListener abstract class
     * @class
     * @abstract
     */
    DataEventListener: DataEventListener,
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
            var res = this.parseDateTime(val);
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
    AccessDeniedException:AccessDeniedException
};

if (typeof exports !== 'undefined')
{
    module.exports = types;
}

