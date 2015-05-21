/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2015-03-12
 */

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
    };

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
                value: distinct, configurable: true, enumerable: false, writable: true
            });
        } catch(e) {}
    }

    if (!Array.prototype.distinct) { Array.prototype.distinct = distinct; }
}

if (typeof Object.prototype.isNullOrUndefined === 'undefined')
{
    /****
     * @param {*} obj
     * @returns {boolean}
     */
    var isNullOrUndefined = function(obj) {
        return (typeof obj === 'undefined') || (obj==null);
    };

    if (Object.defineProperty) {
        try {
            Object.defineProperty(Object.prototype, 'isNullOrUndefined', {
                value: isNullOrUndefined, configurable: true, enumerable: false, writable: true
            });
        } catch(e) {}
    }
    if (!Object.prototype.isNullOrUndefined) { Object.prototype.isNullOrUndefined = isNullOrUndefined; }
}

var dataCommon = {
    /**
     *
     * @param {Error|string|{message:string,stack:string}|*} data
     */
    log:function(data) {
        util.log(data);
        if (data.stack) {
            util.log(data.stack);
        }
    },
    /**
     *
     * @param {Error|string|{message:string,stack:string}|*} data
     */
    debug:function(data) {
        if (process.env.NODE_ENV==='development')
            util.log(data);
    },
    /**
     *
     * @param {String} data
     */
    dasherize:function(data) {
        if (typeof data === 'string')
        {
            return data.replace(/(^\s*|\s*$)/g, '').replace(/[_\s]+/g, '-').replace(/([A-Z])/g, '-$1').replace(/-+/g, '-').replace(/^-/,'').toLowerCase();
        }
    },
    /**
     * Checks if the specified object argument is undefined or null.
     * @param {*} obj
     * @returns {boolean}
     */
    isNullOrUndefined: function(obj) {
        return (typeof obj === 'undefined' || obj === null);
    }
};

if (typeof exports !== 'undefined')
{
    module.exports = dataCommon;
}