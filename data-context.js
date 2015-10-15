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
    cfg = require('./data-configuration');
/**
 * Represents the default data context.
 * @class
 * @constructor
 * @augments types.DataContext
 * @augments DataContext
 * @property {types.classes.DataAdapter} db - Gets the data adapter that is going to used in data operations.
 * @static {Function} super_
 */
function DefaultDataContext()
{
    /**
     * @type {types.DataAdapter|DataAdapter}
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
            var adapter = cfg.current.adapters.find(function(x) {
                return x.default;
            });
            if (typeof adapter ==='undefined' || adapter==null) {
                er = new Error('The default data adapter is missing.'); er.code = 'EADAPTER';
                throw er;
            }
            /**
             * @type {{createInstance:Function}|*}
             */
            var adapterType = cfg.current.adapterTypes[adapter.invariantName];
            //validate data adapter type
            var er;
            if (typeof adapterType === 'undefined' || adapterType == null) {
                er = new Error('Invalid adapter type.'); er.code = 'EADAPTER';
                throw er;
            }
            if (typeof adapterType.createInstance !== 'function') {
                er= new Error('Invalid adapter type. Adapter initialization method is missing.'); er.code = 'EADAPTER';
                throw er;
            }
            //otherwise load adapter
            __db__ = adapterType.createInstance(adapter.options);
            return __db__;
        },
        configurable : false,
        enumerable:false });
}

util.inherits(DefaultDataContext, types.DataContext);

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
    var DataModel = require('./data-model').DataModel,
        model = new DataModel(obj);
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
 * Represents a data context based on a data adapter's name.
 * @class NamedDataContext
 * @constructor
 * @augments DataContext
 * @property {DataAdapter} db - Gets the underlying data adapter that is going to used in data operations.
 * @property {Function} NamedDataContext.super_ - Represents the DataContext class constructor
 */
function NamedDataContext(name)
{
    NamedDataContext.super_.call();
    /**
     * @type {DataAdapter}
     * @private
     */
    var __db__;
    /**
     * @private
     */
    this.__finalize__ = function() {
        try {
            if (__db__)
                __db__.close();
        }
        catch(e) {
            dataCommon.debug('An error occure while closing the underlying database context.');
            dataCommon.debug(e);
        }
        __db__ = null;
    };
    //set the name specified
    var __name__ = name;

    Object.defineProperty(this, 'db', {
        get : function() {
            if (__db__)
                return __db__;
            //otherwise load database options from configuration
            var adapter = cfg.current.adapters.find(function(x) {
                return x.name == __name__;
            });
            var er;
            if (typeof adapter ==='undefined' || adapter==null) {
                er = new Error('The specified data adapter is missing.'); er.code = 'EADAPTER';
                throw er;
            }
            //get data adapter type
            var adapterType = cfg.current.adapterTypes[adapter.invariantName];
            //validate data adapter type
            if (typeof adapterType === 'undefined' || adapterType == null) {
                er = new Error('Invalid adapter type.'); er.code = 'EADAPTER';
                throw er;
            }
            if (typeof adapterType.createInstance !== 'function') {
                er= new Error('Invalid adapter type. Adapter initialization method is missing.'); er.code = 'EADAPTER';
                throw er;
            }
            //otherwise load adapter
            __db__ = adapterType.createInstance(adapter.options);
            return __db__;
        },
        configurable : false,
        enumerable:false });

}
util.inherits(NamedDataContext, types.DataContext);

/**
 * @param name {string} - A string that represents the model name.
 * @returns {DataModel}
 */
NamedDataContext.prototype.model = function(name) {
    var self = this;
    if ((name == null) || (name === undefined))
        return null;
    var obj = cfg.current.model(name);
    if (typeof obj === 'undefined' || obj==null)
        return null;
    var DataModel = require('./data-model').DataModel;
    var model = new DataModel(obj);
    //set model context
    model.context = self;
    //return model
    return model;
};

NamedDataContext.prototype.finalize = function(cb) {
    cb = cb || function () {};
    this.__finalize__();
    cb.call(this);
};


if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @constructs DefaultDataContext
         */
        DefaultDataContext:DefaultDataContext,
        /**
         * @constructs DefaultDataContext
         */
        NamedDataContext:NamedDataContext

    };
}