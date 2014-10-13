/**
 * Created by Kyriakos Barbounakis on 15/3/2014.
 */

var array = require('most-array'),
    util = require('util'),
    path = require("path"),
    fs = require("fs"),
    mysqlAdapter = require('./mysql-adapter'),
    mssqlAdapter = require('./mssql-adapter');

/**
 * Holds the configuration of data modeling infrastructure
 * @class
 * @constructor
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
    var __dataTypes__ = null;
    /**
     * Gets or sets an array of items that indicates all the data types that is going to be used in data modeling.
     * @type {*}
     */
    Object.defineProperty(this, 'dataTypes', {
        get: function()
        {
            if (__dataTypes__)
                return __dataTypes__;
            //get data types from configuration file
            __dataTypes__ = DataConfiguration.prototype.loadSync('dataTypes.json',false) || {};
            return __dataTypes__;
        }
    });
    /**
     * @type {Array}
     * @private
     */
    var __adapters__ = null;
    Object.defineProperty(this, 'adapters', {
        get: function()
        {
            if (__adapters__)
                return __adapters__;
            /**
             * get data types from configuration file
             * @property {Array} adapters
             * @type {*}
             */
            var config = DataConfiguration.prototype.loadSync('app.json',false) || {};
            __adapters__ = config.adapters || [];
            return __adapters__;
        }
    });

    var __adaptersTypes__ = {
        mysql: {
            /** Gets the invariant name of this adapter */
            invariantName:"mysql",
            /** Gets the name of the data adapter */
            name:"MySQL Data Adapter",
            /**
             * @param options {*}
             * @returns {DataAdapter}
             */
            createInstance: function(options) {
                return mysqlAdapter.createInstance(options);
            }
        },
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

    Object.defineProperty(this, 'adapterTypes', {
        get: function()
        {
            return __adaptersTypes__;
        }
    });

}

/**
 * @returns {*}
 * @param name {string}
 */
DataConfiguration.prototype.model = function(name)
{
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
    //read files
    var files = fs.readdirSync(modelPath);
    if (files.length==0)
        return null;
    var r = new RegExp('^' + name.concat('.json') + '$','i');
    for (var i = 0; i < files.length; i++) {
        r.lastIndex=0;
        if (r.test(files[i])) {
            //load JSON formatted configuration file
            var data = fs.readFileSync(path.join(modelPath, files[i]), 'utf8');
            //return JSON object
            var result = JSON.parse(data);
            //cache model definition
            this.models[result.name] = result;
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

DataConfiguration.current = (function() {
    return new DataConfiguration();
}).call();

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

Object.defineProperty(cfg, 'current', {
    get: function() {
        return DataConfiguration.current;
    }, configurable:false, enumerable:false
    });


if (typeof exports !== 'undefined')
{
    module.exports = cfg;
}
