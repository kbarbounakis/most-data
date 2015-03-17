/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2014-06-19
 */
var model = require('./data-model'),
    util=require('util'),
    array = require('most-array'),
    qry = require('most-query'),
    async = require('async'),
    dataCache = require('./data-cache');


function DataPermissionEventArgs() {
    /**
     * The target data model
     * @type {DataModel}
     */
    this.model = null;
    /**
     * The underlying query expression
     * @type {QueryExpression}
     */
    this.query = null;
    /**
     * The permission mask
     * @type {Number}
     */
    this.mask = null;
    /**
     * The query type
     * @type {String}
     */
    this.type = null;
    /**
     * The query type
     * @type {String}
     */
    this.privilege = null;
}

var PermissionMask = {
    Read:1,
    Create:2,
    Update:4,
    Delete:8,
    Execute:16,
    Owner:31
};

/**
 * @class DataPermissionEventListener
 * @constructor
 */
function DataPermissionEventListener() {
    //
}

DataPermissionEventListener.prototype.beforeSave = function(e, callback)
{
    DataPermissionEventListener.prototype.validate(e, callback);
}


DataPermissionEventListener.prototype.beforeRemove = function(e, callback)
{
    DataPermissionEventListener.prototype.validate(e, callback);
};

DataPermissionEventListener.prototype.validate = function(e, callback) {
    var model = e.model,
        context = e.model.context,
        requestMask = 1,
        workspace = 1;
    if (e.state == 0)
        requestMask = PermissionMask.Read;
    else if (e.state==1)
        requestMask = PermissionMask.Create;
    else if (e.state==2)
        requestMask = PermissionMask.Update;
    else if (e.state==4)
        requestMask = PermissionMask.Delete;
    else if (e.state==16)
        requestMask = PermissionMask.Execute;
    else {
        callback(new Error('Target object has an invalid state.'));
        return;
    }
    //validate throwError
    if (typeof e.throwError === 'undefined')
        e.throwError = true;
    context.user = context.user || { name:'anonymous',authenticationType:'None' };
    //get user key
    var users = context.model('User'), permissions = context.model('Permission');
    if (typeof users=== 'undefined' || users===null) {
        //do nothing
        callback(null);
        return;
    }
    if (typeof permissions=== 'undefined' || permissions===null) {
        //do nothing
        callback(null);
        return;
    }

    DataPermissionEventListener.effectiveAccounts(context, function(err, accounts) {
        if (err) { callback(err); return; }

        var permEnabled = model.privileges.filter(function(x) { return !x.disabled; }, model.privileges).length>0;
        //get all enabled privileges
        var privileges = model.privileges.filter(function(x) { return !x.disabled && ((x.mask & requestMask) == requestMask) });
        if (privileges.length==0) {
            if (e.throwError) {
                //if the target model has privileges but it has no privileges with the requested mask
                if (permEnabled) {
                    //throw error
                    var error = new Error('Access denied.');
                    error.status = 401;
                    callback(error);
                }
                else {
                    //do nothing
                    callback(null);
                }
            }
            else {
                //set result to false (or true if model has no privileges at all)
                e.result = !permEnabled;
                //and exit
                callback(null);
            }
        }
        else {
            var cancel = false;
            e.result = false;
            //enumerate privileges
            async.eachSeries(privileges, function(item, cb) {
                if (cancel) {
                    cb(null);
                    return;
                }
                //global
                if (item.type=='global') {
                    if (typeof item.account !== 'undefined') {
                        //check if a privilege is assigned by the model
                        if (item.account==='*') {
                            //get permission and exit
                            cancel=true;
                            e.result = true;
                            cb(null);
                            return;
                        }
                    }
                    //try to find user has global permissions assigned
                    permissions.where('privilege').equal(model.name).
                        and('parentPrivilege').equal(null).
                        and('target').equal('0').
                        and('workspace').equal(workspace).
                        and('account').in(accounts).
                        and('mask').bit(requestMask).silent().count(function(err, count) {
                            if (err) {
                                cb(err);
                            }
                            else {
                                if (count>=1) {
                                    cancel=true;
                                    e.result = true;
                                }
                                cb(null);
                            }
                        });
                }
                else if (item.type=='parent') {
                    var mapping = model.inferMapping(item.property);
                    if (!mapping) {
                        cb(null);
                        return;
                    }
                    if (requestMask==PermissionMask.Create) {
                        permissions.where('privilege').equal(mapping.childModel).
                            and('parentPrivilege').equal(mapping.parentModel).
                            and('target').equal(e.target[mapping.childField]).
                            and('workspace').equal(workspace).
                            and('account').in(accounts).
                            and('mask').bit(requestMask).silent().count(function(err, count) {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    if (count>=1) {
                                        cancel=true;
                                        e.result = true;
                                    }
                                    cb(null);
                                }
                            });
                    }
                    else {
                        //get original value
                        model.where(model.primaryKey).equal(e.target[model.primaryKey]).select(mapping.childField).first(function(err, result) {
                            if (err) {
                                cb(err);
                            }
                            else if (result) {
                                permissions.where('privilege').equal(mapping.childModel).
                                    and('parentPrivilege').equal(mapping.parentModel).
                                    and('target').equal(result[mapping.childField]).
                                    and('workspace').equal(workspace).
                                    and('account').in(accounts).
                                    and('mask').bit(requestMask).silent().count(function(err, count) {
                                        if (err) {
                                            cb(err);
                                        }
                                        else {
                                            if (count>=1) {
                                                cancel=true;
                                                e.result = true;
                                            }
                                            cb(null);
                                        }
                                    });
                            }
                            else {
                                cb(null);
                            }
                        });
                    }
                }
                else if (item.type=='item') {
                    //if target object is a new object
                    if (requestMask==PermissionMask.Create) {
                        //do nothing
                        cb(null); return;
                    }
                    permissions.where('privilege').equal(model.name).
                        and('parentPrivilege').equal(null).
                        and('target').equal(e.target[model.primaryKey]).
                        and('workspace').equal(workspace).
                        and('account').in(accounts).
                        and('mask').bit(requestMask).silent().count(function(err, count) {
                            if (err) {
                                cb(err);
                            }
                            else {
                                if (count>=1) {
                                    cancel=true;
                                    e.result = true;
                                }
                                cb(null);
                            }
                        });
                }
                else if (item.type=='self') {
                    if (requestMask==PermissionMask.Create) {
                        var query = qry.query(model.viewAdapter);
                        var attrs = model.attributeNames, fields=[];
                        //cast target
                        var targetObj = model.cast(e.target);
                        attrs.forEach(function(x) {
                            if (targetObj.hasOwnProperty(x)) {
                                var f = {};
                                f[x] = { $value: targetObj[x] };
                                fields.push(f);
                            }
                        }, attrs);
                        //add fields
                        query.select(fields);
                        //set fixed query
                        query.$fixed = true;
                        model.filter(item.filter, function(err, q) {
                            if (err) {
                                cb(err);
                            }
                            else {
                                //set where from DataQueryable.query
                                query.$where = q.query.$prepared;
                                model.context.db.execute(query,null, function(err, result) {
                                    if (err) {
                                        cb(err);
                                    }
                                    else {
                                        if (result.length==1) {
                                            cancel=true;
                                            e.result = true;
                                        }
                                        cb(null);
                                    }
                                });
                            }
                        });
                    }
                    else {
                        //get privilege filter
                        model.filter(item.filter, function(err, q) {
                            if (err) {
                                cb(err);
                            }
                            else {
                                //prepare query and append primary key expression
                                q.where(model.primaryKey).equal(e.target[model.primaryKey]).silent().count(function(err, count) {
                                    if (err) { cb(err); return; }
                                    if (count>=1) {
                                        cancel=true;
                                        e.result = true;
                                    }
                                    cb(null);
                                })
                            }
                        });
                    }
                }
                else {
                    //do nothing (unknown permission)
                    cb(null);
                }

            }, function(err) {
                if (err) {
                    callback(err);
                }
                else {
                    if (e.throwError && !e.result) {
                        var error = new Error('Access denied.');
                        error.status = 401;
                        callback(error);
                    }
                    else {
                        callback(null);
                    }
                }
            });
        }

    });
};
var ANONYMOUS_USER_CACHE_PATH = '/User/anonymous';
/**
 * @param {DataContext} context
 * @param {function(Error=,*=)} callback
 */
DataPermissionEventListener.anonymousUser = function(context, callback) {
    DataPermissionEventListener.queryUser(context, 'anonymous', function(err, result) {
        if (err) {
            callback(err);
        }
        else {
            callback(null, result || { id:0, name:'anonymous', groups:[], enabled:false});
        }
    });
};
/**
 *
 * @param {DataContext} context
 * @param {string} username
 * @param {function(Error=,*=)} callback
 */
DataPermissionEventListener.queryUser = function(context, username, callback) {
    try {
        if (typeof context === 'undefined' || context == null) {
            callback();
        }
        else {
            //get user key
            var users = context.model('User');
            if (typeof users === 'undefined' || users == null) {
                callback();
                return;
            }
            users.where('name').equal(username).silent().select(['id', 'name']).first(function(err, result) {
                if (err) {
                    callback(err);
                }
                else {
                    //if anonymous user was not found
                    if (typeof result === 'undefined' || result == null) {
                        callback();
                        return;
                    }
                    //get anonymous user object
                    var user = users.convert(result);
                    //get user groups
                    user.property('groups').select(['id', 'name']).silent().all(function(err, groups) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        //set anonymous user groups
                        user.groups = groups || [];
                        //return user
                        callback(null, user);
                    });
                }
            });
        }
    }
    catch (e) {
        callback(e);
    }
};
/**
 * @param {DataContext} context
 * @param {function(Error=,Array=)} callback
 */
DataPermissionEventListener.effectiveAccounts = function(context, callback) {
    if (typeof context === 'undefined' || context == null) {
        //push no account
        callback(null, [ 0 ]);
        return;
    }
    /**
     * Gets or sets an object that represents the user of the current data context.
     * @property {*|{name: string, authenticationType: string}}
     * @name DataContext#user
     * @memberof DataContext
     */
    context.user = context.user || { name:'anonymous',authenticationType:'None' };
    context.user.name = context.user.name || 'anonymous';
    //if the current user is anonymous
    if (context.user.name === 'anonymous') {
        //get anonymous user data
        dataCache.current.ensure(ANONYMOUS_USER_CACHE_PATH, function(cb) {
            DataPermissionEventListener.anonymousUser(context, function(err, result) {
                cb(err, result);
            });
        }, function(err, result) {
            if (err) {
                callback(err);
            }
            else {
                var arr = [];
                if (result) {
                    arr.push(result.id);
                    result.groups = result.groups || [];
                    result.groups.forEach(function(x) { arr.push(x.id) });
                }
                if (arr.length==0)
                    arr.push(0);
                callback(null, arr);
            }
        });
    }
    else {
        //try to get data from cache
        var USER_CACHE_PATH = '/User/' + context.user.name;
        dataCache.current.ensure(USER_CACHE_PATH, function(cb) {
            DataPermissionEventListener.queryUser(context, context.user.name, cb);
        }, function(err, user) {
            if (err) { callback(err); return; }
            dataCache.current.ensure(ANONYMOUS_USER_CACHE_PATH, function(cb) {
                DataPermissionEventListener.anonymousUser(context, cb);
            }, function(err, anonymous) {
                if (err) { callback(err); return; }
                var arr = [ ];
                if (user) {
                    arr.push(user.id);
                    if (util.isArray(user.groups))
                        user.groups.forEach(function(x) { arr.push(x.id) });
                }
                if (anonymous) {
                    arr.push(anonymous.id);
                    if (util.isArray(anonymous.groups))
                        anonymous.groups.forEach(function(x) { arr.push(x.id) });
                }
                if (arr.length==0)
                    arr.push(0);
                callback(null, arr);
            });
        });
    }
};

/**
 *
 * @param {DataPermissionEventArgs} e
 * @param {Function} callback
 */
DataPermissionEventListener.prototype.beforeExecute = function(e, callback)
{
    if (typeof e.model==='undefined' || e.model==null) {
        callback(null);
        return;
    }
    var model= e.model, context = e.model.context, requestMask = 1, workspace = 1, privilege = model.name, parentPrivilege=null;
    //get privilege from event arguments if it's defined (e.g. the operation requests execute permission User.ChangePassword where
    // privilege=ChangePassword and parentPrivilege=User)
    if (e.privilege) {
        //event argument is the privilege
        privilege = e.privilege;
        //and model is the parent privilege
        parentPrivilege = model.name;
    }
    //do not check permissions if the target model has no privileges defined
    if (model.privileges.filter(function(x) { return !x.disabled; }, model.privileges).length==0) {
        callback(null);
        return;
    }
    //infer permission mask
    if (typeof e.mask !== 'undefined') {
        requestMask = e.mask;
    }
    else {
        if (e.query) {
            //infer mask from query type
            if (e.query.$select)
            //read permissions
                requestMask=1;
            else if (e.query.$insert)
            //create permissions
                requestMask=2;
            else if (e.query.$update)
            //update permissions
                requestMask=4;
            else if (e.query.$delete)
            //delete permissions
                requestMask=8;
        }
    }
    if (e.query) {
        context.user = context.user || { name:'anonymous',authenticationType:'None' };
        //get user key
        var users = context.model('User'), permissions = context.model('Permission');
        if (typeof users=== 'undefined' || users===null) {
            //do nothing
            callback(null);
            return;
        }
        if (typeof permissions=== 'undefined' || permissions===null) {
            //do nothing
            callback(null);
            return;
        }
        //get model privileges
        var modelPrivileges = model.privileges || [];
        //if model has no privileges defined
        if (modelPrivileges.length==0) {
            //do nothing
            callback(null);
            //and exit
            return;
        }
        //tuning up operation
        //validate request mask permissions against all users privilege { mask:<requestMask>,disabled:false,account:"*" }
        var allUsersPrivilege = modelPrivileges.find(function(x) {
            return (((x.mask && requestMask)==requestMask) && !x.disabled && (x.account==='*'));
        });
        if (typeof allUsersPrivilege !== 'undefined') {
            //do nothing
            callback(null);
            //and exit
            return;
        }

        DataPermissionEventListener.effectiveAccounts(context, function(err, accounts) {
            if (err) { callback(err); return; }
            //get all enabled privileges
            var privileges = modelPrivileges.filter(function(x) {
                return !x.disabled && (x.mask && requestMask == requestMask);
            });

            var cancel = false, assigned = false, entity = qry.entity(model.viewAdapter),
                perms1 = qry.entity(permissions.viewAdapter).as('p0'), expr = null;
            async.eachSeries(privileges, function(item, cb) {
                if (cancel) {
                    cb(null);
                    return;
                }
                try {
                    if (item.type=='global') {
                        //check if a privilege is assigned by the model
                        if (item.account==='*') {
                            //get permission and exit
                            cancel=true;
                            assigned=true;
                            cb(null);
                            return;
                        }
                        //try to find user has global permissions assigned
                        permissions.where('privilege').equal(model.name).
                            and('parentPrivilege').equal(null).
                            and('target').equal('0').
                            and('workspace').equal(1).
                            and('account').in(accounts).
                            and('mask').bit(requestMask).silent().count(function(err, count) {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    if (count>=1) {
                                        cancel=true;
                                        assigned=true;
                                    }
                                    cb(null);
                                }
                            });
                    }
                    else if (item.type=='parent') {
                        //get field mapping
                        var mapping = model.inferMapping(item.property);
                        if (!mapping) {
                            cb(null);
                            return;
                        }
                        if (expr==null)
                            expr = qry.query();
                        expr.where(entity.select(mapping.childField)).equal(perms1.select('target')).
                            and(perms1.select('privilege')).equal(mapping.childModel).
                            and(perms1.select('parentPrivilege')).equal(mapping.parentModel).
                            and(perms1.select('workspace')).equal(workspace).
                            and(perms1.select('mask')).bit(requestMask).
                            and(perms1.select('account')).in(accounts).prepare(true);
                        assigned=true;
                        cb(null);
                    }
                    else if (item.type=='item') {
                        if (expr==null)
                            expr = qry.query();
                        expr.where(entity.select(model.primaryKey)).equal(perms1.select('target')).
                            and(perms1.select('privilege')).equal(model.name).
                            and(perms1.select('parentPrivilege')).equal(null).
                            and(perms1.select('workspace')).equal(workspace).
                            and(perms1.select('mask')).bit(requestMask).
                            and(perms1.select('account')).in(accounts).prepare(true);
                        assigned=true;
                        cb(null);
                    }
                    else if (item.type=='self') {
                        if (typeof item.filter === 'string' ) {
                            model.filter(item.filter, function(err, q) {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    if (q.query.$prepared) {
                                        if (expr==null)
                                            expr = qry.query();
                                        expr.$where = q.query.$prepared;
                                        expr.prepare(true);
                                        assigned=true;
                                        cb(null);
                                    }
                                    else
                                        cb(null);
                                }
                            });
                        }
                        else {
                            cb(null);
                        }
                    }
                    else {
                        cb(null);
                    }
                }
                catch (e) {
                    cb(e);
                }
            }, function(err) {
                if (!err) {
                    if (!assigned) {
                        //prepare no access query
                        e.query.prepare();
                        //add no record parameter
                        e.query.where(e.model.fieldOf(e.model.primaryKey)).equal(null).prepare();
                    }
                    else if (expr) {
                        var q = qry.query(model.viewAdapter).select([model.primaryKey]).distinct();
                        q.join(perms1).with(expr);
                        e.query.join(q.as('q0')).with(qry.where(entity.select(model.primaryKey)).equal(qry.entity('q0').select(model.primaryKey)));
                    }
                }
                callback(err);
            });

        });

    }
    else {
        callback(null);
    }
}

var perms = {
    /**
     * @class DataPermissionEventArgs
     * @constructor
     */
    DataPermissionEventArgs:DataPermissionEventArgs,
    /**
     * @class DataPermissionEventListener
     * @constructor
     */
    DataPermissionEventListener:DataPermissionEventListener

}

if (typeof exports !== 'undefined') {
    module.exports = perms;
}

