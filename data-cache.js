/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2015-03-12.
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
var types = require('./types'), util = require('util');
/**
 * Implements the cache for a data application.
 * @class DataCache
 * @property {Number} ttl
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
 * Gets data from cache or executes the defined function and adds the result to the cache with the specified key
 * @param {string|*} key - A string thath represents the of the cached data
 * @param {function(function(Error=,*=))} fn - A function to execute if data will not be found in cache
 * @param {function(Error=,*=)} callback - A callback function that will return the result or an error, if any.
 */
DataCache.prototype.ensure = function(key, fn, callback) {
    var self = this;
    callback = callback || function() {};
    if (typeof fn !== 'function') {
        callback(new Error('Invalid argument. Expected function.'));
        return;
    }
    //try to get from cache
    self.get(key, function(err, result) {
        if (err) { callback(err); return; }
        if (typeof result !== 'undefined') {
            callback(null, result);
        }
        else {
            //execute fn
            fn(function(err, result) {
                if (err) { callback(err); return; }
                self.add(key, (typeof result === 'undefined') ? null: result, self.ttl, function() {
                    callback(null, result);
                });
            });
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
    //first of all check if a global application exists
    if (typeof global !== 'undefined' || global!=null) {
        var app = global.application;
        if (app) {
            //and if this application has a cache object
            if (app.cache) {
                //use this cache
                return app.cache;
            }
        }
    }
    //otherwise get current cache
    if (typeof currentDataCache !== 'undefined')
        return currentDataCache;
    //or initialize current cache object
    currentDataCache = new DataCache();
    //and return it
    return currentDataCache;
}, configurable: false, enumerable: false});

if (typeof exports !== 'undefined')
{
    /**
     * @see dataCache
     */
    module.exports = dataCache;
}