/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2015-09-15
 */
var dataCache = require('./data-cache'),
    dataCommon = require('./data-common');
/**
 * @class
 * @constructor
 */
function DataObjectCachingListener() {
    //
}
DataObjectCachingListener.prototype.afterSave = function(e, callback) {
    try {
        if (dataCommon.isNullOrUndefined(e.target)) {
            callback();
            return;
        }
        //get object id
        var id = e.model.idOf(e.target);
        //validate object id
        if (dataCommon.isNullOrUndefined(id)) {
            callback();
            return;
        }
        //get item key
        var key = '/' + e.model.name + '/' + id.toString();
        if (dataCache.current) {
            //remove item by key
            dataCache.current.remove(key);
        }
        callback();
    }
    catch (e) {
        if (process.NODE_ENV==='development')
            dataCommon.log(e);
        callback();
    }
};

DataObjectCachingListener.prototype.afterRemove = function(e, callback) {
    DataObjectCachingListener.prototype.afterSave(e, callback);
};

if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @constructs DataObjectCachingListener
         */
        DataObjectCachingListener:DataObjectCachingListener
    };
}