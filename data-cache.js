/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2015-02-13
 */
var types = require('./types'), util = require('util');
/**
 * Implements the cache for a data application.
 * @class DataCache
 * @constructor
 * @augments EventEmitter2
 */
function DataCache() {
    this.initialized = false;
}
util.inherits(DataCache, types.EventEmitter2);
/**
 * Initializes data caching.
 * @param {function(Error=)} callback
 */
DataCache.prototype.init = function(callback) {
    try {
        if (this.initialized) {
            callback();
            return;
        }
        var NodeCache = require( "node-cache" );
        this.rawCache = new NodeCache();
        this.initialized = true;
        callback();
    }
    catch (e) {
        callback(e);
    }
};

/**
 * Removes a cached value.
 * @param {string} key - A string that represents the key of the cached value
 * @param {function(Error=,number=)} callback - Returns the number of deleted entries. This parameter is optional.
 */
DataCache.prototype.remove = function(key, callback) {
    var self = this;
    callback = callback || function() {};
    self.init(function(err) {
        if (err) {
            callback(err);
        }
        else {
            self.rawCache.set(key, callback);
        }
    });
};

/**
* Flush all cached data.
* @param {function(Error=)} callback - This parameter is optional.
*/
DataCache.prototype.removeAll = function(callback) {
    var self = this;
    callback = callback || function() {};
    self.init(function(err) {
        if (err) {
            callback(err);
        }
        else {
            self.rawCache.flushAll();
            callback();
        }
    });
};

/**
 * Sets a key value pair in cache.
 * @param {string} key - A string that represents the key of the cached value
 * @param {*} value - The value to be cached
 * @param {number=} ttl - A TTL in seconds. This parameter is optional.
 * @param {function(Error=,boolean=)} callback - Returns true on success. This parameter is optional.
 */
DataCache.prototype.add = function(key, value, ttl, callback) {
    var self = this;
    callback = callback || function() {};
    self.init(function(err) {
       if (err) {
           callback(err);
       }
        else {
           self.rawCache.set(key, value, ttl, callback);
       }
    });
};
/**
 * Gets a cached value defined by the given key.
 * @param {string|*} key
 * @param {function(Error=,*=)} callback - A callback that returns the cached value, if any.
 */
DataCache.prototype.get = function(key, callback) {
    var self = this;
    callback = callback || function() {};
    if (typeof key === 'undefined' || key == null) {
        callback();
    }
    self.init(function(err) {
        if (err) {
            callback(err);
        }
        else {
            self.rawCache.get(key, function(err, value) {
                if (err) {
                    callback(err);
                }
                else {
                    if (typeof value[key] !== 'undefined') {
                        callback(null, value[key]);
                    }
                    else {
                        callback();
                    }
                }
            });
        }
    });
};
/**
 * @type {{DataCache: DataCache}, {current:DataCache}}
 */
var dataCache = {
    /**
     * @constructs DataCache
     */
    DataCache:DataCache
};
/**
 * @type DataCache
 */
var currentDataCache;
Object.defineProperty(dataCache, 'current', { get: function () {
    if (typeof currentDataCache !== 'undefined')
        return currentDataCache;
    currentDataCache = new DataCache();
    return currentDataCache;
}, configurable: false, enumerable: false});

if (typeof exports !== 'undefined')
{
    /**
     * @see dataCache
     */
    module.exports = dataCache;
}