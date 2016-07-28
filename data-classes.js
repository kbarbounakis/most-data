

    /**
     * @module most-data/data-classes
     */
    var dataClasses = { };

    var model = require('./data-model'),
        perms = require('./data-permission'),
        functions = require('./functions'),
        DataQueryable = require('./data-queryable').DataQueryable,
        DefaultDataContext = require('./data-context').DefaultDataContext,
        NamedDataContext = require('./data-context').NamedDataContext,
        DataModel = model.DataModel,
        DataObject = require('./data-object'),
        DataFilterResolver = require('./data-filter-resolver').DataFilterResolver;

    dataClasses.DataObject = require('./data-object');
    dataClasses.DefaultDataContext = DefaultDataContext;
    dataClasses.NamedDataContext = NamedDataContext;
    dataClasses.FunctionContext = functions.classes.FunctionContext;
    dataClasses.DataQueryable = DataQueryable;
    dataClasses.DataModel = DataModel;
    dataClasses.DataFilterResolver = DataFilterResolver;
    dataClasses.DataPermissionEventListener = perms.DataPermissionEventListener;
    dataClasses.DataPermissionEventArgs = perms.DataPermissionEventArgs;
    dataClasses.PermissionMask = perms.PermissionMask;

    module.exports = dataClasses;



