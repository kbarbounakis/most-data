
(function() {

    var model = require('./data-model'),
        perms = require('./data-permission'),
        functions = require('./functions'),
        DataQueryable = require('./data-queryable').DataQueryable,
        DefaultDataContext = require('./data-context').DefaultDataContext,
        NamedDataContext = require('./data-context').NamedDataContext,
        DataModel = model.DataModel,
        DataFilterResolver = require('./data-filter-resolver').DataFilterResolver;

    var classes = {
        /**
         * @alias classes.DataObject
         */
        DataObject : require('./data-object'),
        DefaultDataContext: DefaultDataContext,
        NamedDataContext: NamedDataContext,
        FunctionContext:functions.classes.FunctionContext,
        DataQueryable: DataQueryable,
        DataModel: DataModel,
        DataFilterResolver: DataFilterResolver,
        DataPermissionEventListener:perms.DataPermissionEventListener,
        DataPermissionEventArgs:perms.DataPermissionEventArgs,
        PermissionMask:perms.PermissionMask
    };
    /**
     * @namespace classes
     * @memberOf module:most
     */
    module.exports = classes;
})();


