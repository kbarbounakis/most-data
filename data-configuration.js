/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 13/2/2015
 */
var array = require('most-array'),
    util = require('util'),
    path = require("path"),
    fs = require("fs"),
    mssqlAdapter = require('./mssql-adapter');

/**
 * @class
 * @constructor
 * @property {string} name
 * @property {string} defaultUserGroup
 * @property {string} unattendedExecutionAccount
 * @property {number} timeout
 * @property {boolean} slidingExpiration
 * @property {string} loginPage
 */
function DataConfigurationAuth() {
    //
}

/**
 * Holds the configuration of data modeling infrastructure
 * @class
 * @constructor
 * @property {DataConfigurationAuth} auth
 */
function DataConfiguration() {
    /**
     * Model caching object (e.g. cfg.models.Migration, cfg.models.User etc)
     * @type {*}
     */
    this.models = { };

    /**
     * @type {*}
     * @private
     */
    var dataTypes = null;
    /**
     * Gets or sets an array of items that indicates all the data types that is going to be used in data modeling.
     * @type {*}
     */
    Object.defineProperty(this, 'dataTypes', {
        get: function()
        {
            if (dataTypes)
                return dataTypes;
            //get data types from configuration file
            try {
                dataTypes = require(path.join(process.cwd(), 'config/dataTypes.json'));
                if (typeof dataTypes === 'undefined' || dataTypes == null) {
                    console.log('Application data types are empty. The default data types will be loaded instead.');
                    dataTypes = require('./dataTypes.json');
                }
            }
            catch(e) {
                console.log('An error occured while loading application data types');
                console.log(e);
                console.log('The default data types will be loaded instead.');
                dataTypes = require('./dataTypes.json');
            }
            return dataTypes;
        }
    });

    //get application-defined adapter types, if any
    var config;
    try {
        config = require(path.join(process.cwd(), 'config/app.json')) || {};
    }
    catch (e) {
        console.log('An error occured while trying to open application configuation.');
        console.log(e);
        config = {};
    }

    /**
     * @type {Array}
     * @private
     */
    var adapters = null;
    Object.defineProperty(this, 'adapters', {
        get: function()
        {
            if (adapters)
                return adapters;
            /**
             * get data types from configuration file
             * @property {Array} adapters
             * @type {*}
             */
            adapters = config.adapters || [];
            return adapters;
        }
    });

    var adapterTypes = {
        mssql: {
            /** Gets the invariant name of this adapter */
            invariantName:"mssql",
            /** Gets the name of the data adapter */
            name:"Microsoft SQL Server Data Provider",
            /**
             * @param options {*}
             * @returns {DataAdapter}
             */
            createInstance: function(options) {
                return mssqlAdapter.createInstance(options);
            }
        }
    };


    if (config.adapterTypes) {
        if (util.isArray(config.adapterTypes)) {
            config.adapterTypes.forEach(function(x) {
                //first of all validate module
                x.invariantName = x.invariantName || 'unknown';
                x.name = x.name || 'Unknown Data Adapter';
                var valid = false, adapterModule;
                if (x.type) {
                    try {
                        adapterModule = require(x.type);
                        if (typeof adapterModule.createInstance === 'function') {
                            valid = true;
                        }
                        else {
                            //adapter type does not export a createInstance(options) function
                            console.log(util.log("The specified data adapter type (%s) does not have the appropriate constructor. Adapter type cannot be loaded.", x.invariantName));
                        }
                    }
                    catch(e) {
                        //catch error
                        console.log(e);
                        //and log a specific error for this adapter type
                        console.log(util.log("The specified data adapter type (%s) cannot be instantiated. Adapter type cannot be loaded.", x.invariantName));
                    }
                    if (valid) {
                        //register adapter
                        adapterTypes[x.invariantName] = {
                            invariantName:x.invariantName,
                            name: x.name,
                            createInstance:adapterModule.createInstance
                        };
                    }
                }
                else {
                    console.log(util.log("The specified data adapter type (%s) does not have a type defined. Adapter type cannot be loaded.", x.invariantName));
                }
            });
        }
    }

    Object.defineProperty(this, 'adapterTypes', {
        get: function()
        {
            return adapterTypes;
        }
    });

    var auth;
    Object.defineProperty(this, 'auth', {
        get: function()
        {
            try {
                if (auth) { return auth; }
                if (typeof config.settings === 'undefined' || config.settings== null) {
                    auth = config.auth || {};
                    return auth;
                }
                auth = config.settings.auth || {};
                return auth;
            }
            catch(e) {
                console.log('An error occured while trying to load auth configuration');
                auth = {};
                return auth;
            }
        }
    });

}
/**
 * @returns {*}
 * @param name {string}
 */
DataConfiguration.prototype.model = function(name)
{
    var self = this;
    if (typeof name !== 'string')
        return null;
    var keys = Object.keys(this.models), mr = new RegExp('^' + name + '$','i');
    for (var i = 0; i < keys.length; i++) {
        mr.lastIndex=0;
        if (mr.test(keys[i]))
            return this.models[keys[i]];
    }
    //try to find if model definition is already in cache
    if (typeof this.models[name] !== 'undefined')
        //and return it
        return this.models[name];
    //otherwise open definition file
    var modelPath = path.join(process.cwd(),'config', 'models');
    if (!fs.existsSync(modelPath)) {
        //models folder does not exist
        //so set model to null
        this.models[name]=null;
        //and return
        return null;
    }
    //read files from models directory
    var files;
    //store file list in a private variable
    if (typeof this._files === 'undefined') { this._files = fs.readdirSync(modelPath); }
    //and finally get this list of file
    files = this._files;
    if (files.length==0)
        return null;
    var r = new RegExp('^' + name.concat('.json') + '$','i');
    for (var i = 0; i < files.length; i++) {
        r.lastIndex=0;
        if (r.test(files[i])) {
            //build model file path
            var finalPath = path.join(modelPath, files[i]);
            //get model
            var result = require(finalPath), finalName = result.name;
            //cache model definition
            self.models[finalName] = result;
            //and finally return this definition
            return result;
        }
    }
    return null;

};

/**
 *
 * @param file {string}
 * @param throwOnMissing {boolean=}
 * @returns {array}
 */
DataConfiguration.prototype.loadSync = function(file, throwOnMissing) {

    var throwError = throwOnMissing;
    var configPath = path.join(process.cwd(),'config',file);
    if (!fs.existsSync(configPath)) {
        if (throwError)
            throw new Error('The specified configuration file is missing.');
        else
            return null;
    }
    //load JSON formatted configuration file
    var data = fs.readFileSync(configPath, 'utf8');
    //return JSON object
    return JSON.parse(data);
};

//DataConfiguration.current = (function() {
//    return new DataConfiguration();
//}).call();

var cfg = {
    /**
     * @type DataConfiguration
     */
    current:undefined,
    /**
     * @namespace
     */
    classes: {
        /**
         * DataConfiguration class
         * @constructor
         */
        DataConfiguration:DataConfiguration  
    },
    /**
     * Creates a instance data configuration class
     * @returns {DataConfiguration}  Returns an instance of DataConfiguration class
     */
    createInstance: function() {
       return new DataConfiguration();
    }
};
/**
 * @type DataConfiguration
 */
var __cfg;

Object.defineProperty(cfg, 'current', {
    get: function() {
        if (__cfg)
            return __cfg;
        __cfg = new DataConfiguration();
        return __cfg;
    }, configurable:false, enumerable:false
    });


if (typeof exports !== 'undefined')
{
    module.exports = cfg;
}
