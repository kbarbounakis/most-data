/**
 * Created by Kyriakos Barbounakis on 3/2/14.
 * Most Framework Data Library
 */
var model = require('./data-model'),
    __types__ = require('./types'),
    mysqlAdapter = require('./mysql-adapter'),
    cfg = require('./data-configuration'),
    perms = require('./data-permission'),
    mssqlAdapter = require('./mssql-adapter');

var data = {
    /**
     * @namespace
     */
    cfg: {
        /**
         * Represents the current data configuration
         * @type DataConfiguration
         */
        current:cfg.current
    },
    /**
     * @namespace
     */
    common: model.common,
    /**
     * @namespace
     */
    types: __types__,
    /**
     * @namespace
     */
    classes:model.classes,
    /**
     * @namespace
     */
    mysql: {
        /**
         * @class MySqlAdapter
         * */
        MySqlAdapter : mysqlAdapter.MySqlAdapter,
        /**
         * Creates an instance of MySqlAdapter object that represents a MySql database connection.
         * @param options An object that represents the properties of the underlying database connection.
         * @returns {DataAdapter}
         */
        createAdapter: function(options)
        {
            return mysqlAdapter.createInstance(options);
        }
    },
    /**
     * @namespace
     */
    mssql: {
        /**
         * @class MsSqlAdapter
         * @constructor
         */
        MsSqlAdapter : mssqlAdapter.MsSqlAdapter,
        /**
         * @class MsSqlFormatter
         * @constructor
         */
        MsSqlFormatter : mssqlAdapter.MsSqlFormatter,
        /**
         * Formats a query object and returns the equivalent SQL statement
         * @param query {QueryExpression|*}
         * @param query {string=}
         * @returns {string}
         */
        format: function(query, s) {
            var formatter = new  mssqlAdapter.MsSqlFormatter();
            return formatter.format(query, s);
        },
        /**
         * Creates an instance of MsSqlAdapter object that represents a MsSql database connection.
         * @param options An object that represents the properties of the underlying database connection.
         * @returns {DataAdapter}
         */
        createAdapter: function(options)
        {
            return mssqlAdapter.createInstance(options);
        }
    },

    /**
     *  @returns {DataContext}
     */
    createContext: function()
    {
        return model.createContext();
    },
     /**
     * @param {function(DataContext)} fn - A function fn(context) that is going to be invoked in current context
     */
    execute: function(fn)
    {
        fn = fn || function() {};
        var ctx = model.createContext();
        fn.call(null, ctx);
    },
    /**
     * @param {function(DataContext)} fn - A function fn(context) that is going to be invoked in current context
     */
    executeAs: function(userName, fn)
    {
        fn = fn || function() {};
        var ctx = model.createContext();
        ctx.user = { name:userName, authenticationType:'Basic' }
        fn.call(null, ctx);
    },
    /**
     * @class DataObject
     */
    DataObject: model.classes.DataObject,
    /**
     * DataModelMigration class represents a model migration scheme.
     * @class DataModelMigration
     */
    DataModelMigration: model.classes.DataModelMigration,
    /**
     * @param obj {*}
     * @returns {DataModel}
     */
    createModel: model.createModel
};
/**
 *
 * @class {DataPermissionEventListener}
 * @constructor
 */
data.classes.DataPermissionEventListener = perms.DataPermissionEventListener;
/**
 * @constructor {DataPermissionEventArgs}
 */
data.classes.DataPermissionEventArgs = perms.DataPermissionEventArgs;

if (typeof exports !== 'undefined')
{
        module.exports = data;
}