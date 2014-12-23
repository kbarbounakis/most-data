/**
 * Created by kbarbounakis on 19/6/2014.
 */
var model = require('./data-model'),
    util=require('util'),
    array = require('most-array'),
    qry = require('most-query'),
    async = require('async');

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
}


DataPermissionEventListener.prototype.validate = function(e, callback)
{
    var model = e.model,
        context = e.model.context,
        requestMask = 1,
        workspace = 1;
    if (e.state==1)
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
    users.where('name').equal(context.user.name).or('name').equal('anonymous').select(['id', 'name']).silent().take(2,function(err, result) {
        if (err) { callback(err); return; }
        //init user object
        var user = users.convert({ id:0, enabled:true });
        //filter result to exclude anonymous user
        var filtered = result.filter(function(x) { return x.name!='anonymous'; }, result);
        //if user was found
        if (filtered.length>0)
            user = users.convert(filtered[0]);
        //if anonymous was found
        else if (result.length>0)
            user = users.convert(result[0]);
        //init accounts array
        var accounts = [ ];
        //add user (and anonymous)
        result.forEach(function(x) { accounts.push(x.id); }, result);
        user.property('groups').select('id').silent().all(function(err, groups) {
            if (err) { callback(err); return; }
            groups.forEach(function(x) {this.push(x.id)}, accounts );
            var permEnabled = model.privileges.filter(function(x) { return !x.disabled; }, model.privileges).length>0;
            //get all enabled privileges
            var privileges = model.privileges.filter(function(x) { return !x.disabled && (x.mask && requestMask == requestMask) }, model.privileges);
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
                e.result = false
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
    });
}

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
        privilege = e.privilege
        //and model is the parent privilege
        parentPrivilege = model.name;
    }
    //do not check permissions if the target model has no privileges defined
    if (model.privileges.filter(function(x) { return !x.disabled; }, model.privileges).length==0) {
        callback(null);
        return;
    }

    util.log(util.format('Execute custom listener for %s.', model.name));
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
        users.where('name').equal(context.user.name).or('name').equal('anonymous').silent().take(2, function(err, result) {
            //init user object
            var user = users.convert({ id:0, enabled:true });
            //filter result to exclude anonymous user
            var filtered = result.filter(function(x) { return x.name!='anonymous'; }, result);
            //if user was found
            if (filtered.length>0)
                user = users.convert(filtered[0]);
            //if anonymous was found
            else if (result.length>0)
                user = users.convert(result[0]);
            //init accounts array
            var accounts = [ ];
            //add user (and anonymous)
            result.forEach(function(x) { accounts.push(x.id); }, result);
            user.property('groups').select('id').silent().all(function(err, groups) {
                if (err) { throw err; }
                //create permissions
                array(groups).each(function(x) {
                    accounts.push(x.id);
                });
                //get all enabled privileges
                var privileges = array(model.privileges).where(function(x) {
                    return !x.disabled && (x.mask && requestMask == requestMask);
                }).toArray();

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
                            e.query.where(e.model.primaryKey).equal(null).prepare();
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

