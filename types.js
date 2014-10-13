var events = require('events'), util = require('util'), async = require('async');
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
 * Opens a native database connection
 * @param callback
 */
DataAdapter.prototype.open = function(callback) {
    //
};

/**
 * Closes native database connection
 * @param callback {Function=}
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
 */
function DataEventArgs() {
    /**
     * @type {DataModel}
     */
    this.model = undefined;
    /**
     * @type {*}
     */
    this.target = undefined;
    /**
     * @type {Number|*}
     */
    this.state = undefined;
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

var __types__ =
{
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
    DataEventListener: DataEventListener
};

if (typeof exports !== 'undefined')
{
    module.exports = __types__;
}

