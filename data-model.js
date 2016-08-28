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
 * @private
 */
var string = require('string'),
    util = require('util'),
    path = require("path"),
    fs = require("fs"),
    async = require('async'),
    events = require('events'),
    qry = require('most-query'),
    types = require('./types'),
    functions = require('./functions'),
    dataCommon = require('./data-common'),
    dataListeners = require('./data-listeners'),
    validators = require('./data-validator'),
    dataAssociations = require('./data-associations'),
    DataNestedObjectListener = require("./data-nested-object-listener").DataNestedObjectListener,
    DataQueryable = require('./data-queryable').DataQueryable,
    DataAttributeResolver = require('./data-queryable').DataAttributeResolver,
    DataObjectAssociationListener = dataAssociations.DataObjectAssociationListener,
    DataModelView = require('./data-model-view').DataModelView,
    DataFilterResolver = require('./data-filter-resolver').DataFilterResolver,
    Q = require("q");

/**
 * @ignore
 * @class
 * @constructor
 * @augments QueryExpression
 */
function EmptyQueryExpression() {
    //
}

/**
 * @classdesc DataModel class extends a JSON data model and performs all data operations (select, insert, update and delete) in MOST Data Applications.
 <p>
     These JSON schemas are in config/models folder:
 </p>
 <pre class="prettyprint"><code>
 /
 + config
   + models
     - User.json
     - Group.json
     - Account.json
     ...
 </code></pre>
 <p class="pln">
 The following JSON schema presents a typical User model with fields, views, privileges, constraints, listeners, and seeding:
 </p>
 <pre class="prettyprint"><code>
 {
     "name": "User", "id": 90, "title": "Application Users", "inherits": "Account", "hidden": false, "sealed": false, "abstract": false, "version": "1.4",
     "fields": [
         {
             "name": "id", "title": "Id", "description": "The identifier of the item.",
             "type": "Integer",
             "nullable": false,
             "primary": true
         },
         {
             "name": "accountType",  "title": "Account Type", "description": "Contains a set of flags that define the type and scope of an account object.",
             "type": "Integer",
             "readonly":true,
             "value":"javascript:return 0;"
         },
         {
             "name": "lockoutTime", "title": "Lockout Time", "description": "The date and time that this account was locked out.",
             "type": "DateTime",
             "readonly": true
         },
         {
             "name": "logonCount", "title": "Logon Count", "description": "The number of times the account has successfully logged on.",
             "type": "Integer",
             "value": "javascript:return 0;",
             "readonly": true
         },
         {
             "name": "enabled", "title": "Enabled", "description": "Indicates whether a user is enabled or not.",
             "type": "Boolean",
             "nullable": false,
             "value": "javascript:return true;"
         },
         {
             "name": "lastLogon", "title": "Last Logon", "description": "The last time and date the user logged on.",
             "type": "DateTime",
             "readonly": true
         },
         {
             "name": "groups", "title": "User Groups", "description": "A collection of groups where user belongs.",
             "type": "Group",
             "expandable": true,
             "mapping": {
                 "associationAdapter": "GroupMembers", "parentModel": "Group",
                 "parentField": "id", "childModel": "User", "childField": "id",
                 "associationType": "junction", "cascade": "delete",
                 "select": [
                     "id",
                     "name",
                     "alternateName"
                 ]
             }
         },
         {
             "name": "additionalType",
             "value":"javascript:return this.model.name;",
             "readonly":true
         },
         {
             "name": "accountType",
             "value": "javascript:return 0;"
         }
     ], "privileges":[
         { "mask":1, "type":"self", "filter":"id eq me()" },
         { "mask":15, "type":"global", "account":"*" }
     ],
     "constraints":[
         {
             "description": "User name must be unique across different records.",
             "type":"unique",
             "fields": [ "name" ]
         }
     ],
     "views": [
         {
             "name":"list", "title":"Users", "fields":[
                 { "name":"id", "hidden":true },
                 { "name":"description" },
                 { "name":"name" },
                 { "name":"enabled" , "format":"yesno" },
                 { "name":"dateCreated", "format":"moment : 'LLL'" },
                 { "name":"dateModified", "format":"moment : 'LLL'" }
             ], "order":"dateModified desc"
         }
     ],
     "eventListeners": [
         { "name":"New User Credentials Provider", "type":"/app/controllers/user-credentials-listener" }
     ],
     "seed":[
         {
             "name":"anonymous",
             "description":"Anonymous User",
             "groups":[
                 { "name":"Guests" }
             ]
         },
         {
             "name":"admin@example.com",
             "description":"Site Administrator",
             "groups":[
                 { "name":"Administrators" }
             ]
         }
     ]
 }
 </code></pre>
 *
 * @class
 * @property {string} classPath - Gets or sets a string which represents the path of the DataObject subclass associated with this model.
 * @property {string} name - Gets or sets a string that represents the name of the model.
 * @property {number} id - Gets or sets an integer that represents the internal identifier of the model.
 * @property {boolean} hidden - Gets or sets a boolean that indicates whether the current model is hidden or not. The default value is false.
 * @property {string} title - Gets or sets a title for this data model.
 * @property {boolean} sealed - Gets or sets a boolean that indicates whether current model is sealed or not. A sealed model cannot be migrated.
 * @property {boolean} abstract - Gets or sets a boolean that indicates whether current model is an abstract model or not.
 * @property {string} version - Gets or sets the version of this data model.
 * @property {string} type - Gets or sets an internal type for this model.
 * @property {DataCachingType|string} caching - Gets or sets a string that indicates the caching type for this model. The default value is none.
 * @property {string} inherits - Gets or sets a string that contains the model that is inherited by the current model.
 * @property {DataField[]} fields - Gets or sets an array that represents the collection of model fields.
 * @property {DataModelEventListener[]} eventListeners - Gets or sets an array that represents the collection of model listeners.
 * @property {Array} constraints - Gets or sets the array of constraints which are defined for this model
 * @property {DataModelView[]} views - Gets or sets the array of views which are defined for this model
 * @property {DataModelPrivilege[]} privileges - Gets or sets the array of privileges which are defined for this model
 * @property {string} source - Gets or sets a string which represents the source database object for this model.
 * @property {string} view - Gets or sets a string which represents the view database object for this model.
 * @property {DataContext|*} - Gets or sets the data context of this model.
 * @property {DataField[]} attributes - Gets an array of DataField objects which represents the collection of model fields (including fields which are inherited from the base model).
 * @property {Array} seed - An array of objects which represents a collection of items to be seeded when the model is being generated for the first time
 * @constructor
 * @augments EventEmitter2
 * @param {*=} obj An object instance that holds data model attributes. This parameter is optional.
 */
function DataModel(obj) {

    this.hidden = false;
    this.sealed = false;
    this.abstract = false;
    this.version = '0.1';
    this.type = 'data';
    this.caching = 'none';
    this.fields = [];
    this.eventListeners = [];
    this.constraints = [];
    this.views = [];
    this.privileges = [];
    //extend model if obj parameter is defined
    if (obj)
    {
        if (typeof obj === 'object')
            util._extend(this, obj);
    }

    /**
     * Gets or sets the underlying data adapter
     * @type {DataContext}
     * @private
     */
    var context_ = null;
    var self = this;
    Object.defineProperty(this, 'context', { get: function() {
        return context_;
    }, set: function(value) {
        context_ = value;
    }, enumerable: false, configurable: false});

    Object.defineProperty(this, 'sourceAdapter', { get: function() {
        return dataCommon.isDefined(self.source) ? self.source :  self.name.concat('Base');
    }, enumerable: false, configurable: false});

    Object.defineProperty(this, 'viewAdapter', { get: function() {
        return dataCommon.isDefined(self.view) ? self.view :  self.name.concat('Data');
    }, enumerable: false, configurable: false});

    var silent_ = false;
    /**
     * Prepares a silent data operation (for query, update, insert, delete etc).
     * In a silent execution, permission check will be omitted.
     * Any other listeners which are prepared for using silent execution will use this parameter.
     * @param {Boolean=} value
     * @returns DataModel
     */
    this.silent = function(value) {
        if (typeof value === 'undefined')
            silent_ = true;
        else
            silent_ = !!value;
        return this;
    };
    Object.defineProperty(this, '$silent', { get: function() {
        return silent_;
    }, enumerable: false, configurable: false});

    var pluralExpression = /([a-zA-Z]+?)([e']s|[^aiou]s)$/;
    /**
     * @type {Array}
     */
    var attributes;
    /**
     * @private
     */
    this._clearAttributes = function() {
        attributes = null;
    };

    /**
     * Gets an array of objects that represents the collection of fields for this model.
     * This collection contains the fields defined in the current model and its parent.
     * @type {Array}
     *
     */
    Object.defineProperty(this, 'attributes', { get: function() {
        //validate self field collection
        if (typeof attributes !== 'undefined' && attributes != null)
            return attributes;
        //init attributes collection
        attributes = [];
        //get base model (if any)
        var baseModel = self.base(), field;
        //enumerate fields
        self.fields.forEach(function(x) {
            if (typeof x.many === 'undefined') {
                if (typeof self.context.getConfiguration().dataTypes[x.type] === 'undefined')
                    //set one-to-many attribute (based on a naming convention)
                    x.many = pluralExpression.test(x.name) || (x.mapping && x.mapping.associationType === 'junction');
                else
                    //otherwise set one-to-many attribute to false
                    x.many = false;
            }
            //re-define field model attribute
            if (typeof x.model === 'undefined')
                x.model = self.name;
            var clone = x;
            //if base model exists and current field is not primary key field
            if (baseModel && !x.primary) {
                //get base field
                field = baseModel.field(x.name);
                if (field) {
                    //clone field
                    clone = { };
                    //get all inherited properties
                    util._extend(clone, field);
                    //get all overriden properties
                    util._extend(clone, x);
                    //set field model
                    clone.model = field.model;
                }
            }
            //finally push field
            attributes.push(clone);
        });
        if (baseModel) {
            baseModel.attributes.forEach(function(x) {
                if (!x.primary) {
                    //check if member is overridden by the current model
                    field = self.fields.find(function(y) { return y.name == x.name; });
                    if (typeof field === 'undefined')
                        attributes.push(x);
                }
            });
        }
        return attributes;
    }, enumerable: false, configurable: false});
    /**
     * Gets the primary key name
     * @type String
    */
    this.primaryKey = undefined;
    //local variable for DateModel.primaryKey
    var primaryKey_;
    Object.defineProperty(this, 'primaryKey' , { get: function() {
        return self.getPrimaryKey();
    }, enumerable: false, configurable: false});

    this.getPrimaryKey = function() {
        if (typeof primaryKey_ !== 'undefined') { return primaryKey_; }
        var p = self.fields.find(function(x) { return x.primary==true; });
        if (p) {
            primaryKey_ = p.name;
            return primaryKey_;
        }
    };

    /**
     * Gets an array that contains model attribute names
     * @type Array
    */
    this.attributeNames = undefined;
    Object.defineProperty(this, 'attributeNames' , { get: function() {
        return self.attributes.map(function(x) {
            return x.name;
        });
    }, enumerable: false, configurable: false});
    Object.defineProperty(this, 'constraintCollection' , { get: function() {
        var arr = [];
        if (util.isArray(self.constraints)) {
            //apend constraints to collection
            self.constraints.forEach(function(x) {
                arr.push(x);
            });
        }
        //get base model
        var baseModel = self.base();
        if (baseModel) {
            //get base model constraints
            var baseArr = baseModel.constraintCollection;
            if (util.isArray(baseArr)) {
                //apend to collection
                baseArr.forEach(function(x) {
                    arr.push(x);
                });
            }
        }
        return arr;
    }, enumerable: false, configurable: false});

    //register listeners
    registerListeners_.call(this);
    //call initialize method
    if (typeof this.initialize === 'function')
        this.initialize();
}

util.inherits(DataModel, types.EventEmitter2);

/**
 * Initializes the current data model. This method is used for extending the behaviour of an install of DataModel class.
 */
DataModel.prototype.initialize = function() {
    //
};

/**
 * Clones the current data model
 * @param {DataContext=} context - An instance of DataContext class which represents the current data context.
 * @returns {DataModel} Returns a new DataModel instance
 */
DataModel.prototype.clone = function(context) {
    var result = new DataModel(this);
    if (context)
        result.context = context;
    return result;
};
/**
 * @private
 */
 function registerListeners_() {

    //change: 2015-01-19
    //description: change default max listeners (10) to 32 in order to avoid node.js message
    // for reaching the maximum number of listeners
    //author: k.barbounakis@gmail.com
    if (typeof this.setMaxListeners === 'function') {
        this.setMaxListeners(32);
    }

    var CalculatedValueListener = dataListeners.CalculatedValueListener,
        DefaultValueListener = dataListeners.DefaultValueListener,
        DataCachingListener = dataListeners.DataCachingListener,
        DataModelCreateViewListener = dataListeners.DataModelCreateViewListener,
        DataModelSeedListener = dataListeners.DataModelSeedListener,
        DataStateValidatorListener = require('./data-state-validator').DataStateValidatorListener;

    //register system event listeners
    this.removeAllListeners('before.save');
    this.removeAllListeners('after.save');
    this.removeAllListeners('before.remove');
    this.removeAllListeners('after.remove');
    this.removeAllListeners('before.execute');
    this.removeAllListeners('after.execute');
    this.removeAllListeners('after.upgrade');

    //0. Permission Event Listener
    var perms = require('./data-permission');
    //1. State validator listener
    this.on('before.save', DataStateValidatorListener.prototype.beforeSave);
    this.on('before.remove', DataStateValidatorListener.prototype.beforeRemove);
    //2. Default values Listener
    this.on('before.save', DefaultValueListener.prototype.beforeSave);
    //3. Calculated values listener
    this.on('before.save', CalculatedValueListener.prototype.beforeSave);

    //register before execute caching
    if (this.caching=='always' || this.caching=='conditional') {
        this.on('before.execute', DataCachingListener.prototype.beforeExecute);
    }
    //register after execute caching
    if (this.caching=='always' || this.caching=='conditional') {
        this.on('after.execute', DataCachingListener.prototype.afterExecute);
    }

    //migration listeners
    this.on('after.upgrade',DataModelCreateViewListener.prototype.afterUpgrade);
    this.on('after.upgrade',DataModelSeedListener.prototype.afterUpgrade);

    /**
     * change:8-Jun 2015
     * description: Set lookup default listeners as obsolete.
     */
    ////register lookup model listeners
    //if (this.type === 'lookup') {
    //    //after save (clear lookup caching)
    //    this.on('after.save', DataModelLookupCachingListener.afterSave);
    //    //after remove (clear lookup caching)
    //    this.on('after.remove', DataModelLookupCachingListener.afterRemove);
    //}
    //register configuration listeners
    if (this.eventListeners) {
        for (var i = 0; i < this.eventListeners.length; i++) {
            var listener = this.eventListeners[i];
            //get listener type (e.g. type: require('./custom-listener.js'))
            if (listener.type && !listener.disabled)
            {
                /**
                 * Load event listener from the defined type
                 * @type DataEventListener
                 */
                var m = listener.type.indexOf('/')==0 ? require(path.join(process.cwd(), listener.type)) : require(listener.type);
                //if listener exports beforeSave function then register this as before.save event listener
                if (typeof m.beforeSave == 'function')
                    this.on('before.save', m.beforeSave);
                //if listener exports afterSave then register this as after.save event listener
                if (typeof m.afterSave == 'function')
                    this.on('after.save', m.afterSave);
                //if listener exports beforeRemove then register this as before.remove event listener
                if (typeof m.beforeRemove == 'function')
                    this.on('before.remove', m.beforeRemove);
                //if listener exports afterRemove then register this as after.remove event listener
                if (typeof m.afterRemove == 'function')
                    this.on('after.remove', m.afterRemove);
                //if listener exports beforeExecute then register this as before.execute event listener
                if (typeof m.beforeExecute == 'function')
                    this.on('before.execute', m.beforeExecute);
                //if listener exports afterExecute then register this as after.execute event listener
                if (typeof m.afterExecute == 'function')
                    this.on('after.execute', m.afterExecute);
                //if listener exports afterUpgrade then register this as after.upgrade event listener
                if (typeof m.afterUpgrade == 'function')
                    this.on('after.upgrade', m.afterUpgrade);
            }
        }
    }
    //before execute
    this.on('before.execute', perms.DataPermissionEventListener.prototype.beforeExecute);
    //before save (validate permissions)
    this.on('before.save', perms.DataPermissionEventListener.prototype.beforeSave);
    //before remove (validate permissions)
    this.on('before.remove', perms.DataPermissionEventListener.prototype.beforeRemove);
}

DataModel.prototype.join = function(model) {
    var result = new DataQueryable(this);
    return result.join(model);
};

/**
 * Initializes a where statement and returns an instance of DataQueryable class.
 * @param {String|*} attr - A string that represents the name of a field
 * @returns DataQueryable
*/
DataModel.prototype.where = function(attr) {
    var result = new DataQueryable(this);
    return result.where(attr);
};

/**
 * Initializes a full-text search statement and returns an instance of DataQueryable class.
 * @param {String} text - A string that represents the text to search for
 * @returns DataQueryable
 */
DataModel.prototype.search = function(text) {
    var result = new DataQueryable(this);
    return result.search(text);
};

/**
 * Returns a DataQueryable instance of the current model
 * @returns {DataQueryable}
 */
DataModel.prototype.asQueryable = function() {
    return new DataQueryable(this);
};


/**
 * Applies open data filter, ordering, grouping and paging params and returns a data queryable object
 * @param {String|{$filter:string=, $skip:number=, $levels:number=, $top:number=, $take:number=, $order:string=, $inlinecount:string=, $expand:string=,$select:string=, $orderby:string=, $group:string=, $groupby:string=}} params - A string that represents an open data filter or an object with open data parameters
 * @param {function(Error=,DataQueryable=)} callback -  A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain an instance of DataQueryable class.
 * @example
 context.model('Order').filter(context.params, function(err,q) {
    if (err) { return callback(err); }
    q.take(10, function(err, result) {
        if (err) { return callback(err); }
        callback(null, result);
    });
 });
 */
DataModel.prototype.filter = function(params, callback) {
    var self = this;
    var parser = qry.openData.createParser(), $joinExpressions = [], view;
    if (typeof params !== 'undefined' && params != null && typeof params.$select === 'string') {
        //split select
        var arr = params.$select.split(',');
        if (arr.length==1) {
            //try to get data view
            view = self.dataviews(arr[0]);
        }
    }
    parser.resolveMember = function(member, cb) {
        if (view) {
            var field = view.fields.find(function(x) { return x.property === member });
            if (field) { member = field.name; }
        }
        var attr = self.field(member);
        if (attr)
            member = attr.name;
        if (DataAttributeResolver.prototype.testNestedAttribute.call(self,member)) {
            try {
                var member1 = member.split("/"),
                    mapping = self.inferMapping(member1[0]),
                    expr;
                if (mapping && mapping.associationType === 'junction') {
                    var expr1 = DataAttributeResolver.prototype.resolveJunctionAttributeJoin.call(self, member);
                    expr = expr1.$expand;
                    //replace member expression
                    member = expr1.$select.$name.replace(/\./g,"/");
                }
                else {
                    expr = DataAttributeResolver.prototype.resolveNestedAttributeJoin.call(self, member);
                }
                if (expr) {
                    var arrExpr = [];
                    if (util.isArray(expr))
                        arrExpr.push.apply(arrExpr, expr);
                    else
                        arrExpr.push(expr);
                    arrExpr.forEach(function(y) {
                        var joinExpr = $joinExpressions.find(function(x) {
                            if (x.$entity && x.$entity.$as) {
                                    return (x.$entity.$as === y.$entity.$as);
                                }
                            return false;
                        });
                        if (dataCommon.isNullOrUndefined(joinExpr))
                            $joinExpressions.push(y);
                    });
                }
            }
            catch (err) {
                cb(err);
                return;
            }
        }
        if (typeof self.resolveMember === 'function')
            self.resolveMember.call(self, member, cb);
        else
            DataFilterResolver.prototype.resolveMember.call(self, member, cb);
    };
    parser.resolveMethod = function(name, args, cb) {
        if (typeof self.resolveMethod === 'function')
            self.resolveMethod.call(self, name, args, cb);
        else
            DataFilterResolver.prototype.resolveMethod.call(self, name, args, cb);
    };
    var filter;

    if ((params instanceof DataQueryable) && (self.name === params.model.name)) {
        var q = new DataQueryable(self);
        util._extend(q, params);
        util._extend(q.query, params.query);
        return callback(null, q);
    }

    if (typeof params === 'string') {
        filter = params;
    }
    else if (typeof params === 'object') {
        filter = params.$filter;
    }
    parser.parse(filter, function(err, query) {
        if (err) {
            callback(err);
        }
        else {
            //create a DataQueryable instance
            var q = new DataQueryable(self);
            q.query.$where = query;
            if ($joinExpressions.length>0)
                q.query.$expand = $joinExpressions;
            //prepare
            q.query.prepare();

            if (typeof params === 'object') {
                //apply query parameters
                var select = params.$select,
                    skip = params.$skip || 0,
                    orderBy = params.$orderby || params.$order,
                    groupBy = params.$groupby || params.$group,
                    expand = params.$expand,
                    levels = parseInt(params.$levels),
                    top = params.$top || params.$take;
                //select fields
                if (typeof select === 'string') {
                    q.select.apply(q, select.split(',').map(function(x) {
                        return x.replace(/^\s+|\s+$/g, '');
                    }));
                }
                //apply group by fields
                if (typeof groupBy === 'string') {
                    q.groupBy.apply(q, groupBy.split(',').map(function(x) {
                        return x.replace(/^\s+|\s+$/g, '');
                    }));
                }
                if ((typeof levels === 'number') && !isNaN(levels)) {
                    //set expand levels
                    q.levels(levels);
                }
                //set $skip
                q.skip(skip);
                if (top)
                    q.query.take(top);
                //set $orderby
                if (orderBy) {
                    orderBy.split(',').map(function(x) {
                        return x.replace(/^\s+|\s+$/g, '');
                    }).forEach(function(x) {
                        if (/\s+desc$/i.test(x)) {
                            q.orderByDescending(x.replace(/\s+desc$/i, ''));
                        }
                        else if (/\s+asc/i.test(x)) {
                            q.orderBy(x.replace(/\s+asc/i, ''));
                        }
                        else {
                            q.orderBy(x);
                        }
                    });
                }
                if (expand) {

                    var resolver = require("./data-expand-resolver");
                    var matches = resolver.testExpandExpression(expand);
                    if (matches && matches.length>0) {
                        q.expand.apply(q, matches);
                    }
                }
                //return
                callback(null, q);
            }
            else {
                //and finally return DataQueryable instance
                callback(null, q);
            }

        }
    });
};

/**
 * Prepares a data query with the given object as parameters and returns the equivalent DataQueryable instance
 * @param {*} obj - An object which represents the query parameters
 * @returns DataQueryable - An instance of DataQueryable class that represents a data query based on the given parameters.
 * @example
 context.model('Order').find({ "paymentMethod":1 }).orderBy('dateCreated').take(10, function(err,result) {
    if (err) { return callback(err); }
    return callback(null, result);
 });
 */
DataModel.prototype.find = function(obj) {
    var self = this, result;
    if (dataCommon.isNullOrUndefined(obj))
    {
        result = new DataQueryable(this);
        result.where(self.primaryKey).equal(null);
        return result;
    }
    //cast object
    var find = {};
    self.attributeNames.forEach(function(x)
    {
        if (obj.hasOwnProperty(x))
        {
            find[x] = obj[x];
        }
    });

    if (find.hasOwnProperty(self.primaryKey)) {
        result = new DataQueryable(this);
        return result.where(self.primaryKey).equal(find[self.primaryKey]);
    }
    else {
        result = new DataQueryable(this);
        var bQueried = false;
        //enumerate properties and build query
        for(var key in find) {
            if (find.hasOwnProperty(key)) {
                if (!bQueried) {
                    result.where(key).equal(find[key]);
                    bQueried = true;
                }
                else
                    result.and(key).equal(find[key]);
            }
        }
        if (!bQueried) {
            //there is no query defined a dummy one (e.g. primary key is null)
            result.where(self.primaryKey).equal(null);
        }
        return result;
    }
};

/**
 * Selects the given attribute or attributes and return an instance of DataQueryable class
 * @param {...string} attr - An array of fields, a field or a view name
 * @returns {DataQueryable}
 */
DataModel.prototype.select = function(attr) {
    var result = new DataQueryable(this);
    return result.select.apply(result, arguments);
};

/**
 * Prepares an ascending order by expression and returns an instance of DataQueryable class.
 * @param {string|*} attr - A string that is going to be used in this expression.
 * @returns DataQueryable
 * @example
 context.model('Person').orderBy('givenName').list().then(function(result) {
    done(null, result);
 }).catch(function(err) {
    done(err);
 });
*/
DataModel.prototype.orderBy = function(attr) {
    var result = new DataQueryable(this);
    return result.orderBy(attr);
};

/**
 * Takes an array of maximum [n] items.
 * @param {Number} n - The maximum number of items that is going to be retrieved
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
 * @returns DataQueryable|undefined If callback parameter is missing then returns a DataQueryable object.
 */
DataModel.prototype.take = function(n, callback) {
    n = n || 25;
    var result = new DataQueryable(this);
    if (typeof callback === 'undefined')
        return result;
    result.take(n, callback);
};

/**
 * Returns an instance of DataResultSet of the current model.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
 * @returns {Promise<T>|*} If callback parameter is missing then returns a Promise object.
 * @deprecated Use DataModel.asQueryable().list().
 * @example
 context.model('User').list(function(err, result) {
    if (err) { return done(err); }
    return done(null, result);
 });
 */
DataModel.prototype.list = function(callback) {
    var result = new DataQueryable(this);
    return result.list(callback);
};

/**
 * Returns the first item of the current model.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
 * @returns {Promise<T>|*} If callback parameter is missing then returns a Promise object.
 * @deprecated Use DataModel.asQueryable().first().
 * @example
 context.model('User').first(function(err, result) {
    if (err) { return done(err); }
    return done(null, result);
 });
*/
DataModel.prototype.first = function(callback) {
    var result = new DataQueryable(this);
    return result.select(this.attributeNames).first(callback);
};

/**
 * A helper function for getting an object based on the given primary key value
 * @param {String|*} key - The primary key value to search for.
 * @param {Function} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result, if any.
 * @returns {Deferred|*} If callback parameter is missing then returns a Deferred object.
 * @example
 context.model('User').get(1).then(function(result) {
    return done(null, result);
}).catch(function(err) {
    return done(err);
});
 */
DataModel.prototype.get = function(key, callback) {
    var result = new DataQueryable(this);
    return result.where(this.primaryKey).equal(key).first(callback);
};

/**
 * Returns the last item of the current model based.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
 * @returns {Promise<T>|*} If callback parameter is missing then returns a Promise object.
 * @example
 context.model('User').last(function(err, result) {
    if (err) { return done(err); }
    return done(null, result);
 });
 */
DataModel.prototype.last = function(callback) {
    var result = new DataQueryable(this);
    return result.orderByDescending(this.primaryKey).select(this.attributeNames).first(callback);
};

/**
 * Returns all data items.
 * @param {Function} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result, if any.
*/
DataModel.prototype.all = function(callback) {
    var result = new DataQueryable(this);
    return result.select(this.attributeNames).all(callback);
};

/**
 * Bypasses a number of items based on the given parameter. This method is used in data paging operations.
 * @param {Number} n - The number of items to skip.
 * @returns DataQueryable
*/
DataModel.prototype.skip = function(n) {
    var result = new DataQueryable(this);
    return result.skip(n);
};

/**
 * Prepares an descending order by expression and returns an instance of DataQueryable class.
 * @param {string|*} attr - A string that is going to be used in this expression.
 * @returns DataQueryable
 * @example
 context.model('Person').orderByDescending('givenName').list().then(function(result) {
    done(null, result);
 }).catch(function(err) {
    done(err);
 });
 */
DataModel.prototype.orderByDescending = function(attr) {
    var result = new DataQueryable(this);
    return result.orderBy(attr);
};

/**
 * Returns the maximum value for a field.
 * @param {string} attr - A string that represents the name of the field.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
 * @returns {Promise<T>|*} If callback parameter is missing then returns a Promise object.
 */
DataModel.prototype.max = function(attr, callback) {
    var result = new DataQueryable(this);
    return result.max(attr, callback);
};

/**
 * Returns the minimum value for a field.
 * @param {string} attr - A string that represents the name of the field.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
 * @returns {Promise<T>|*} If callback parameter is missing then returns a Promise object.
 */
DataModel.prototype.min = function(attr, callback) {
    var result = new DataQueryable(this);
    return result.min(attr, callback);
};

/**
 * Gets a DataModel instance which represents the inherited data model of this item, if any.
 * @returns {DataModel}
 */
DataModel.prototype.base = function()
{
    if (typeof this.inherits === 'undefined' || this.inherits == null)
        return null;
    if (typeof this.context === 'undefined' || this.context == null)
        throw new Error("The underlying data context cannot be empty.");
    return this.context.model(this.inherits);
};
/**
 * @private
 * @param {*} obj
 */
 function convertInternal_(obj) {
    var self = this;
    //get type parsers (or default type parsers)
    var parsers = self.parsers || types.parsers, parser, value;
    self.attributes.forEach(function(x) {
        value = obj[x.name];
        if (value) {
            //get parser for this type
            parser = parsers['parse'.concat(x.type)];
            //if a parser exists
            if (typeof parser === 'function')
            //parse value
                obj[x.name] = parser(value);
            else {
                //get mapping
                var mapping = self.inferMapping(x.name);
                if (mapping) {
                    if ((mapping.associationType==='association') && (mapping.childModel===self.name)) {
                        var associatedModel = self.context.model(mapping.parentModel);
                        if (associatedModel) {
                            if (typeof value === 'object') {
                                //set associated key value (e.g. primary key value)
                                convertInternal_.call(associatedModel, value);
                            }
                            else {
                                var field = associatedModel.field(mapping.parentField);
                                if (field) {
                                    //parse raw value
                                    parser = parsers['parse'.concat(field.type)];
                                    if (typeof parser === 'function')
                                        obj[x.name] = parser(value);
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

/**
 * Converts an object or a collection of objects to the corresponding data object instance
 * @param {Array|*} obj
 * @param {boolean=} typeConvert - Forces property value conversion for each property based on field type.
 * @returns {DataObject|Array|*} - Returns an instance of DataObject (or an array of DataObject instances)
 *<p>
 This conversion of an anonymous object through DataModel.convert() may be overriden by subclassing DataObject
 and place this class in app/models folder of a MOST Data Appllication:
 </p>
 <pre class="prettyprint"><code>
 /
 + app
   + models
     + user-model.js
 </code></pre>
 <p>
 An example of user model subclassing (user-model.js):
 </p>
 <pre class="prettyprint"><code>
 var util = require('util'),
 md = require('most-data'),
 web = require('most-web');

 function UserModel(obj) {
    UserModel.super_.call(this, 'User', obj);
}
 util.inherits(UserModel, md.classes.DataObject);

 UserModel.prototype.person = function (callback) {
    var self = this, context = self.context;
    try {
        //search person by user name
        return context.model('Person').where('user/name').equal(self.name).first(callback);
    }
    catch (err) {
        callback(err);
    }
};
 if (typeof module !== 'undefined') module.exports = UserModel;
 </code></pre>
 @example
 //get User model
 var users = context.model('User');
 users.where('name').equal(context.user.name).first().then(function(result) {
    if (md.common.isNullOrUndefined(result)) {
        return done(new Error('User cannot be found'));
    }
    //convert result
    var user = users.convert(result);
    //get user's person
    user.person(function(err, result) {
        if (err) { return done(err); }
        if (md.common.isNullOrUndefined(result)) {
            return done(new Error('Person cannot be found'));
        }
        console.log('Person: ' + JSON.stringify(result));
        done(null, result);
    });
}).catch(function(err) {
   done(err);
});
 */
DataModel.prototype.convert = function(obj, typeConvert)
{
    var self = this;
    if (typeof obj === 'undefined' || obj == null)
        return null;
    /**
     * @constructor
     * @augments DataObject
     * @ignore
     */
    var DataObjectClass = self['DataObjectClass'];
    if (typeof DataObjectClass === 'undefined')
    {
        if (typeof self.classPath === 'string') {
            DataObjectClass = require(self.classPath);
        }
        else {
            //try to find class file with data model's name in lower case
            // e.g. OrderDetail -> orderdetail-model.js (backward compatibility naming convention)
            var classPath = path.join(process.cwd(),'app','models',self.name.toLowerCase().concat('-model.js'));
            try {
                DataObjectClass = require(classPath);
            }
            catch(e) {
                if (e.code === 'MODULE_NOT_FOUND') {
                    try {
                        //if the specified class file was not found try to dasherize model name
                        // e.g. OrderDetail -> order-detail-model.js
                        classPath = path.join(process.cwd(),'app','models',dataCommon.dasherize(self.name).concat('-model.js'));
                        DataObjectClass = require(classPath);
                    }
                    catch(e) {
                        if (e.code === 'MODULE_NOT_FOUND') {
                            //if , finally, we are unable to find class file, load default DataObject class
                            DataObjectClass = require('./data-object').DataObject;
                        }
                        else {
                            throw e;
                        }
                    }
                }
                else {
                    throw e;
                }
            }
        }
        //cache DataObject class property
        self.context.getConfiguration().models[self.name]['DataObjectClass'] = self['DataObjectClass'] = DataObjectClass;
    }

    if (util.isArray(obj)) {
        var arr = [], src;
        obj.forEach(function(x) {
            if (typeof x !== 'undefined' && x!=null) {
                var o = new DataObjectClass();
                if (typeof x === 'object') {
                    util._extend(o, x);
                }
                else {
                    src = {}; src[self.primaryKey] = x;
                    util._extend(o, src);
                }
                if (typeConvert)
                    convertInternal_.call(self, o);
                o.context = self.context;
                o.$$type = self.name;
                arr.push(o);
            }
        });
        return arr;
    }
    else {
        var result = new DataObjectClass();
        if (typeof obj === 'object') {
            util._extend(result, obj);
        }
        else {
            src = {}; src[self.primaryKey] = obj;
            util._extend(result, src);
        }
        if (typeConvert)
            convertInternal_.call(self, result);
        result.context = self.context;
        result.$$type = self.name;
        return result;
    }
};
/**
 * Extracts an identifier from the given parameter.
 * If the parameter is an object then gets the identifier property, otherwise tries to convert the given parameter to an identifier
 * suitable for this model.
 * @param {*} obj
 * @returns {*|undefined}
 * @example
 var id = context.model('User').idOf({ id:1, "name":"anonymous"});
 */
DataModel.prototype.idOf = function(obj) {
    if (typeof obj === 'undefined')
        return;
    if (obj===null)
        return;
    if (typeof this.primaryKey === 'undefined' || this.primaryKey == null)
        return;
    if (typeof obj === 'object')
        return obj[this.primaryKey];
    return obj;
};
/**
 * Casts the given object and returns an object that is going to be used against the underlying database.
 * @param {*} obj - The source object which is going to be cast
 * @param {number=} state - The state of the source object.
 * @returns {*} - Returns an object which is going to be against the underlying database.
 */
DataModel.prototype.cast = function(obj, state)
{
   return cast_.call(this, obj, state);
};
/**
 * @param {*} obj
 * @param {number=} state
 * @returns {*}
 * @private
 */
function cast_(obj, state) {
    var self = this;
    if (obj==null)
        return {};
    if (typeof obj === 'object' && obj instanceof Array)
    {
        return obj.map(function(x) {
            return cast_.call(self, x, state);
        });
    }
    else
    {
        //ensure state (set default state to Insert=1)
        state = dataCommon.isNullOrUndefined(state) ? (dataCommon.isNullOrUndefined(obj.$state) ? 1 : obj.$state) : state;
        var result = {}, name;
        self.attributes.filter(function(x) {
            if (x.model!==self.name) { return false; }
            return (!x.readonly) ||
                (x.readonly && (typeof x.calculation!=='undefined') && state==2) ||
                (x.readonly && (typeof x.value!=='undefined') && state==1) ||
                (x.readonly && (typeof x.calculation!=='undefined') && state==1);
        }).filter(function(y) {
            /*
            change: 2016-02-27
            author:k.barbounakis@gmail.com
            description:exclude non editable attributes on update operation
             */
            return (y.state==2) ? (y.hasOwnProperty("editable") ? y.editable : true) : true;
        }).forEach(function(x) {
            name = obj.hasOwnProperty(x.property) ? x.property : x.name;
            if (obj.hasOwnProperty(name))
            {
                var mapping = self.inferMapping(name);
                if (typeof mapping === 'undefined' || mapping === null)
                    result[x.name] = obj[name];
                else if ((mapping.associationType==='association') && (mapping.childModel===self.name)) {
                    if ((typeof obj[name] === 'object') && (obj[name] != null))
                    //set associated key value (e.g. primary key value)
                        result[x.name] = obj[name][mapping.parentField];
                    else
                    //set raw value
                        result[x.name] = obj[name];
                }
            }
        });
        return result;
    }
}

/**
 * Casts the given source object and returns a data object based on the current model.
 * @param {*} dest - The destination object
 * @param {*} src - The source object
 * @param {function(Error=)} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 */
DataModel.prototype.recast = function(dest, src, callback)
{
    callback = callback || function() {};
    var self = this;
    if (typeof src === 'undefined' || src === null) {
        callback();
        return;
    }
    if (typeof dest === 'undefined' || dest === null) {
        dest = { };
    }
    async.eachSeries(self.fields, function(field, cb) {
        try {
            if (src.hasOwnProperty(field.name)) {
                //ensure db property removal
                if (field.property && field.property!==field.name)
                    delete dest[field.name];
                var mapping = self.inferMapping(field.name), name = field.property || field.name;
                if (typeof mapping=== 'undefined' || mapping === null) {
                    //set destination property
                    dest[name] = src[field.name];
                    cb(null);
                }
                else if (mapping.associationType==='association') {

                    if (typeof dest[name] === 'object' && dest[name] ) {
                        //check associated object
                        if (dest[name][mapping.parentField]===src[field.name]) {
                            //return
                            cb(null);
                        }
                        else {
                            //load associated item
                            var associatedModel = self.context.model(mapping.parentModel);
                            associatedModel.where(mapping.parentField).equal(src[field.name]).silent().first(function(err, result) {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    dest[name] = result;
                                    //return
                                    cb(null);
                                }
                            });
                        }
                    }
                    else {
                        //set destination property
                        dest[name] = src[field.name];
                        cb(null);
                    }
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
        callback(err);
    });
};





/**
 * Casts the given object and returns an object that was prepared for insert.
 * @param obj {*} - The object to be cast
 * @returns {*}
 */
DataModel.prototype.new = function(obj)
{
    return this.cast(obj);
};

/**
 *
 * @param {*|Array} obj
 * @param {Function} callback
 * @private
 */
function save_(obj, callback) {
    var self = this;
    if (typeof obj=='undefined' || obj == null) {
        callback.call(self, null);
        return;
    }
    //ensure migration
    self.migrate(function(err) {
        if (err) { callback(err); return; }
        //do save
        var arr = [];
        if (util.isArray(obj)) {
            for (var i = 0; i < obj.length; i++)
                arr.push(obj[i]);
        }
        else
            arr.push(obj);
        var db = self.context.db;
        var res = [];
        db.executeInTransaction(function(cb) {
            async.eachSeries(arr, function(item, saveCallback) {
                saveSingleObject_.call(self, item, function(err, result) {
                    if (err) {
                        saveCallback.call(self, err);
                        return;
                    }
                    res.push(result.insertedId);
                    saveCallback.call(self, null);
                });
            }, function(err) {
                if (err) {
                    res = null;
                    cb(err);
                    return;
                }
                cb(null);
            });
        }, function(err) {
            callback.call(self, err, res);
        });
    });
}

/**
 * Saves the given object or array of objects
 * @param obj {*|Array}
 * @param callback {Function=} - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 * @example
 //save a new group (Sales)
 var group = { "description":"Sales Users", "name":"Sales" };
 context.model("Group").save(group).then(function() {
        console.log('A new group was created with ID ' + group.id);
        done();
    }).catch(function(err) {
        done(err);
    });
 */
DataModel.prototype.save = function(obj, callback)
{
    if (typeof callback !== 'function') {
        var d = Q.defer();
        save_.call(this, obj, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return save_.call(this, obj, callback);
    }
};
/**
 * Infers the state of the given object.
 * @param {DataObject|*} obj - The source object
 * @param {function(Error=,DataObjectState=)} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
 * @see DataObjectState
 */
DataModel.prototype.inferState = function(obj, callback) {
    var self = this,
        DataStateValidatorListener = require('./data-state-validator').DataStateValidatorListener;
    var e = { model:self, target:obj };
    DataStateValidatorListener.prototype.beforeSave(e, function(err) {
        //if error return error
        if (err) { return callback(err); }
        //otherwise return the calucated state
        callback(null, e.state);
    });
};
/**
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
function saveBaseObject_(obj, callback) {
    //ensure callback
    callback = callback || function() {};
    var self = this, base = self.base();
    //if obj is an array of objects throw exception (invoke callback with error)
    if (util.isArray(obj)) {
        callback.call(self, new Error('Invalid argument. Base object cannot be an array.'));
        return 0;
    }
    //if current model does not have a base model
    if (base==null) {
        //exit operation
        callback.call(self, null);
    }
    else {
        base.silent();
        //perform operation
        saveSingleObject_.call(base, obj, function(err, result) {
            callback.call(self, err, result);
        });
    }
}
/**
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
 function saveSingleObject_(obj, callback) {
    var self = this,
        NotNullConstraintListener = dataListeners.NotNullConstraintListener,
        DataValidatorListener = validators.DataValidatorListener,
        UniqueContraintListener = dataListeners.UniqueContraintListener;
    callback = callback || function() {};
    if (obj==null) {
        callback.call(self);
        return;
    }
    if (util.isArray(obj)) {
        callback.call(self, new Error('Invalid argument. Source object cannot be an array.'));
        return 0;
    }
    if (obj.$state == 4) {
        return removeSingleObject_.call(self, obj, callback);
    }
    //get object state before any other operation
    var state = obj.$state ? obj.$state : (obj[self.primaryKey]!=null ? 2 : 1);
    var e = {
        model: self,
        target: obj,
        state:state
    };
    //register nested objects listener (before save)
    self.once('before.save', DataNestedObjectListener.prototype.beforeSave);
    //register data association listener (before save)
    self.once('before.save', DataObjectAssociationListener.prototype.beforeSave);
    //register data association listener
    self.once('after.save', DataObjectAssociationListener.prototype.afterSave);
    //register unique constraint listener at the end of listeners collection (before emit)
    self.once('before.save', UniqueContraintListener.prototype.beforeSave);
    //register data validators at the end of listeners collection (before emit)
    self.once('before.save', DataValidatorListener.prototype.beforeSave);
    //register not null listener at the end of listeners collection (before emit)
    self.once('before.save', NotNullConstraintListener.prototype.beforeSave);
    //execute before update events
    self.emit('before.save', e, function(err) {
        //if an error occured
        if (err) {
            //invoke callback with error
            callback.call(self, err);
        }
        //otherwise execute save operation
        else {
            //save base object if any
            saveBaseObject_.call(self, e.target, function(err, result) {
                if (err) {
                    callback.call(self, err);
                    return;
                }
                //if result is defined
                if (result!==undefined)
                //sync original object
                    util._extend(e.target, result);
                //get db context
                var db = self.context.db;
                //create insert query
                var target = self.cast(e.target, e.state);
                var q = null, key = target[self.primaryKey];
                if (e.state==1)
                    //create insert statement
                    q = qry.insert(target).into(self.sourceAdapter);
                else
                {
                    //create update statement
                    if (key)
                        delete target[self.primaryKey];
                    if (Object.keys(target).length>0)
                        q = qry.update(self.sourceAdapter).set(target).where(self.primaryKey).equal(e.target[self.primaryKey]);
                    else
                        //object does not have any properties other than primary key. do nothing
                        q = new EmptyQueryExpression();
                }
                if (q instanceof EmptyQueryExpression) {
                    if (key)
                        target[self.primaryKey] = key;
                    //get updated object
                    self.recast(e.target, target, function(err) {
                        if (err) {
                            //and return error
                            callback.call(self, err);
                        }
                        else {
                            //execute after update events
                            self.emit('after.save',e, function(err) {
                                //and return
                                return callback.call(self, err, e.target);
                            });
                        }
                    });
                }
                else {
                    var pm = e.model.field(self.primaryKey), nextIdentity, adapter = e.model.sourceAdapter;
                    //search if adapter has a nextIdentity function (also primary key must be a counter and state equal to insert)
                    if (pm.type === 'Counter' && typeof db.nextIdentity === 'function' && e.state==1) {
                        nextIdentity = db.nextIdentity;
                    }
                    else {
                        //otherwise use a dummy nextIdentity function
                        nextIdentity = function(a, b, callback) { return callback(); }
                    }
                    nextIdentity.call(db, adapter, pm.name, function(err, insertedId) {
                        if (err) { return callback.call(self, err); }
                        if (insertedId) {
                            //get object to insert
                            if (q.$insert) {
                                var o = q.$insert[adapter];
                                if (o) {
                                    //set the generated primary key
                                    o[pm.name] = insertedId;
                                }
                            }
                        }
                        db.execute(q, null, function(err, result) {
                            if (err) {
                                callback.call(self, err);
                            }
                            else {
                                if (key)
                                    target[self.primaryKey] = key;
                                //get updated object
                                self.recast(e.target, target, function(err) {
                                    if (err) {
                                        callback.call(self, err);
                                    }
                                    else {
                                        if (pm.type==='Counter' && typeof db.nextIdentity !== 'function' && e.state==1) {
                                            //if data adapter contains lastIdentity function
                                            var lastIdentity = db.lastIdentity || function(lastCallback) {
                                                    if (typeof result === 'undefined' || result === null)
                                                        lastCallback(null, { insertId: null});
                                                    lastCallback(null, result);
                                                };
                                            lastIdentity.call(db, function(err, lastResult) {
                                                if (lastResult)
                                                    if (lastResult.insertId)
                                                        e.target[self.primaryKey] = lastResult.insertId;
                                                //raise after save listeners
                                                self.emit('after.save',e, function(err) {
                                                    //invoke callback
                                                    callback.call(self, err, e.target);
                                                });
                                            });
                                        }
                                        else {
                                            //raise after save listeners
                                            self.emit('after.save',e, function(err) {
                                                //invoke callback
                                                callback.call(self, err, e.target);
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    });

                }
            });
        }
    });
}
/**
 * Gets an array of strings which contains the super types of this model e.g. User model may have ['Account','Thing'] as super types
 * @returns {Array}
 */
DataModel.prototype.getSuperTypes = function() {
    var result=[];
    var baseModel = this.base();
    while(baseModel!=null) {
        result.unshift(baseModel.name);
        baseModel = baseModel.base();
    }
    return result;
};

/**
 * @param {*|Array} obj
 * @param {Function} callback
 * @private
 */
function update_(obj, callback) {
    var self = this;
    //ensure callback
    callback = callback || function() {};
    if ((obj==null) || obj === undefined) {
        callback.call(self, null);
    }
    //set state
    if (util.isArray(obj)) {
        obj.forEach(function(x) {x['$state'] = 2; })
    }
    else {
        obj['$state'] = 2;
    }
    self.save(obj, callback);
}

/**
 * Updates an item or an array of items
 * @param obj {*|Array} - The item or the array of items to update
 * @param callback {Function=} - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 */
DataModel.prototype.update = function(obj, callback)
{
    if (typeof callback !== 'function') {
        var d = Q.defer();
        update_.call(this, obj, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return update_.call(this, obj, callback);
    }
};

/**
 * @param {*|Array} obj
 * @param {Function} callback
 * @private
 */
function insert_(obj, callback) {
    var self = this;
    //ensure callback
    callback = callback || function() {};
    if ((obj==null) || obj === undefined) {
        callback.call(self, null);
    }
    //set state
    if (util.isArray(obj)) {
        obj.forEach(function(x) {x['$state'] = 1; })
    }
    else {
        obj['$state'] = 1;
    }
    self.save(obj, callback);
}

/**
 * Inserts an item or an array of items
 * @param obj {*|Array} - The item or the array of items to update
 * @param callback {Function=} - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 */
DataModel.prototype.insert = function(obj, callback)
{
    if (typeof callback !== 'function') {
        var d = Q.defer();
        insert_.call(this, obj, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return insert_.call(this, obj, callback);
    }
};

/**
 *
 * @param {*|Array} obj
 * @param {Function} callback
 * @private
 */
function remove_(obj, callback) {
    var self = this;
    if (obj==null)
    {
        callback.call(self, null);
        return;
    }

    self.migrate(function(err) {
        if (err) { callback(err); return; }
        var arr = [];
        if (util.isArray(obj)) {
            for (var i = 0; i < obj.length; i++)
                arr.push(obj[i]);
        }
        else
            arr.push(obj);
        //delete objects
        var db = self.context.db;
        db.executeInTransaction(function(cb) {
            async.eachSeries(arr, function(item, removeCallback) {
                removeSingleObject_.call(self, item, function(err) {
                    if (err) {
                        removeCallback.call(self, err);
                        return;
                    }
                    removeCallback.call(self, null);
                });
            }, function(err) {
                if (err) {
                    cb(err);
                    return;
                }
                cb(null);
            });
        }, function(err) {
            callback.call(self, err);
        });
    });
}

/**
 * Deletes the given object or array of objects
 * @param obj {*|Array} The item or the array of items to delete
 * @param callback {Function=} - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 * @example
 //remove group (Sales)
 var group = { "name":"Sales" };
 context.model("Group").remove(group).then(function() {
        done();
    }).catch(function(err) {
        done(err);
    });
 */
DataModel.prototype.remove = function(obj, callback)
{
    if (typeof callback !== 'function') {
        var d = Q.defer();
        remove_.call(this, obj, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return remove_.call(this, obj, callback);
    }
};

/**
 * @param {Object} obj
 * @param {Function} callback
 * @private
 */
 function removeSingleObject_(obj, callback) {
    var self = this;
    callback = callback || function() {};
    if (obj==null) {
        callback.call(self);
        return;
    }
    if (util.isArray(obj)) {
        callback.call(self, new Error('Invalid argument. Object cannot be an array.'));
        return 0;
    }
    var e = {
        model: self,
        target: obj,
        state: 4
    };
    //register nested objects listener
    self.once('before.remove', DataNestedObjectListener.prototype.beforeRemove);
    //register data association listener
    self.once('before.remove', DataObjectAssociationListener.prototype.afterSave);
    //execute before update events
    self.emit('before.remove', e, function(err) {
        //if an error occurred
        if (err) {
            //invoke callback with error
            return callback(err);
        }
        //get db context
        var db = self.context.db;
        //create delete query
        var q = qry.deleteFrom(self.sourceAdapter).where(self.primaryKey).equal(obj[self.primaryKey]);
        //execute delete query
        db.execute(q, null, function(err) {
            if (err) {
                return callback(err);
            }
            //remove base object
            removeBaseObject_.call(self, e.target, function(err, result) {
                if (err) {
                    return callback(err);
                }
                if (typeof result !== 'undefined' && result != null) {
                    util._extend(e.target, result);
                }
                //execute after remove events
                self.emit('after.remove',e, function(err) {
                    //invoke callback
                    return callback(err, e.target);
                });
            });
        });
    });

}

/**
 * @param {*} obj
 * @param {Function} callback
 * @private
 */
function removeBaseObject_(obj, callback) {
    //ensure callback
    callback = callback || function() {};
    var self = this, base = self.base();
    //if obj is an array of objects throw exception (invoke callback with error)
    if (util.isArray(obj)) {
        callback.call(self, new Error('Invalid argument. Object cannot be an array.'));
        return 0;
    }
    //if current model does not have a base model
    if (typeof base === 'undefined' || base == null) {
        //exit operation
        callback.call(self, null);
    }
    else {
        base.silent();
        //perform operation
        removeSingleObject_.call(base, obj, function(err, result) {
            callback.call(self, err, result);
        });
    }
}

/**
 * Validates that the given string is plural or not.
 * @param s {string}
 * @returns {boolean}
 * @private
 */
DataModel.PluralExpression = /([a-zA-Z]+?)([e']s|[^aiou]s)$/;
/**
 * Ensures model data adapter.
 * @param callback
 * @private
 */
DataModel.prototype.ensureModel = function(callback) {
    var self = this;
    if (self.name=='Migration') {
        //do nothing
        callback(null);
        return;
    }
    //get migration model
    var migrationModel = self.context.model("migration");
    //ensure migration
    var version = dataCommon.isDefined(self.version) ? self.version : '0.0';
    migrationModel.where('appliesTo').equal(self.sourceAdapter).and('version').equal(version).count(function(err, result) {
        if (err) {
            callback(err);
        }
        else {
            if (result>0) {
                callback(null);
            }
            else {
                self.migrate(callback);
            }
        }
    });
};

/**
 * Performing an automatic migration of current data model based on the current model's definition.
 * @param {Function} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
 */
DataModel.prototype.migrate = function(callback)
{
    var self = this;
    //cache: data model migration
    //prepare migration cache
    var conf = self.context.getConfiguration();
    conf.cache = conf.cache || {};
    conf.cache[self.name] = conf.cache[self.name] || {};
    if (conf.cache[self.name].version==self.version) {
        //model has already been migrated, so do nothing
        return callback();
    }
    //do not migrate sealed models
    if (self.sealed) {
        return callback();
    }
    var context = self.context;
    //do migration
    var fields = self.attributes.filter(function(x) {
        return (self.name == x.model) && (!x.many);
    });

    if ((fields==null) || (fields.length==0))
        throw new Error("Migration is not valid for this model. The model has no fields.");
    var migration = new types.DataModelMigration();
    migration.add = fields;
    migration.version = self.version!=null ? self.version : '0.0';
    migration.appliesTo = self.sourceAdapter;
    migration.model = self.name;
    migration.description = util.format('%s migration (version %s)', this.title, migration.version);
    if (context==null)
        throw new Error("The underlying data context cannot be empty.");

    //get all related models
    var models = [];
    self.fields.filter(function(x) {
        return (!conf.dataTypes[x.type] && (self.name!=x.type));
    }).forEach(function(x) {
        var m = context.model(x.type);
        if (m) {
            var m1 = models.find(function(y) {
                return y.name == m.name;
            });
        }
    });
    //first of all migrate base models if any
    var baseModel = self.base(), db = context.db;
    if (baseModel) {
        models.push(baseModel);
        //add primary key constraint
        migration.constraints.push({
            type:"foreignKey",
            primaryKeyTable : baseModel.sourceAdapter,
            primaryKeyField: baseModel.primaryKey,
            foreignKeyTable: self.sourceAdapter,
            foreignKeyField: self.primaryKey
        });
    }
    //execute transaction
    db.executeInTransaction(function(tr) {
        if (models.length==0) {
            db.migrate(migration, function(err) {
                if (err) { tr(err); return; }
                if (migration['updated']) {
                    return tr();
                }
                //execute after migrate events
                self.emit('after.upgrade', { model:self }, function(err) {
                    return tr(err);
                });
            });
        }
        else {
            async.eachSeries(models,function(m, cb)
            {
                if (m)
                    m.migrate(cb);
                else
                    cb(null);
            }, function(err) {
                if (err) { tr(err); return; }
                db.migrate(migration, function(err) {
                    if (err) { tr(err); return; }
                    if (migration['updated']) {
                        return tr();
                    }
                    //execute after migrate events
                    self.emit('after.upgrade', { model:self }, function(err) {
                        return tr(err);
                    });
                });
            });
        }
    }, function(err) {
        if (!err) {
            //set migration info to configuration cache (conf.cache.model.version=[current version])
            //cache: data model migration
            conf.cache[self.name].version = self.version;
        }
        callback(err);
    });
};

/**
 * Gets an instance of DataField class which represents the primary key of this model.
 * @returns {DataField|*}
 */
DataModel.prototype.key = function()
{
    return this.attributes.find(function(x) { return x.primary==true; });
};
/**
 * Gets an instance of DataField class based on the given name.
 * @param {String} name - The name of the field.
 * @return {DataField|*} - Returns a data field if exists. Otherwise returns null.
 */
DataModel.prototype.field = function(name)
{
    if (typeof name !== 'string')
        return null;
    return this.attributes.find(function(x) { return (x.name==name) || (x.property==name); });
};
/**
 *
 * @param {string|*} attr
 * @param {string=} alias
 * @returns {DataQueryable|QueryField|*}
 */
DataModel.prototype.fieldOf = function(attr, alias) {
    var q = new DataQueryable(this);
    return q.fieldOf(attr, alias);
};

/**
 * Gets an instance of DataModelView class which represents a model view with the given name.
 * @param {string} name - A string that represents the name of the view.
 * @returns {DataModelView|undefined}
 *@example
 var view = context.model('Person').dataviews('summary');
 *
 */
DataModel.prototype.dataviews = function(name) {
    var self = this;
    var re = new RegExp('^' + name.replace('*','\\*').replace('$','\\$') + '$', 'ig');
    var view = self.views.filter(function(x) { return re.test(x.name);})[0];
    if (dataCommon.isNullOrUndefined(view))
        return;
    return util._extend(new DataModelView(self), view);
};

/**
 * Gets an instance of DataModelView class which represents a model view with the given name.
 * @param {string} name - A string that represents the name of the view.
 * @returns {DataModelView|undefined}
 *@example
 var view = context.model('Person').getDataView('summary');
 *
 */
DataModel.prototype.getDataView = function(name) {
    var self = this;
    var re = new RegExp('^' + name.replace('$','\$') + '$', 'ig');
    var view = self.views.filter(function(x) { return re.test(x.name);})[0];
    if (dataCommon.isNullOrUndefined(view))
    {
        return util._extend(new DataModelView(self), {
            "name":"default",
            "title":"Default View",
            "fields": self.attributes.map(function(x) {
                return { "name":x.name }
            })
        });
    }
    return util._extend(new DataModelView(self), view);
};


/**
 * @param {DataField|*} field
 * @param {DataAssociationMapping|*} mapping
 * @private
 */
  function cacheMapping_(field, mapping) {
    if (typeof field === 'undefined' || field == null)
        return;
    //cache mapping
    var cachedModel = this.getConfiguration().models[this.name];
    if (cachedModel) {
        var cachedField = cachedModel.fields.find(function(x) { return x.name === field.name });
        if (typeof cachedField === 'undefined') {
            //search in attributes
            cachedField = this.attributes.find(function(x) { return x.name === field.name });
            if (cachedField) {
                //add overriden field
                cachedModel.fields.push(util._extend({ }, cachedField));
                cachedField = cachedModel.fields[cachedModel.fields.length-1];
                //clear attributes
                this._clearAttributes();
            }
        }
        if (cachedField)
        //add mapping
            cachedField.mapping = mapping;
    }
}

/**
 * Gets a field association mapping based on field attributes, if any. Otherwise returns null.
 * @param {string} name - The name of the field
 * @returns {DataAssociationMapping|undefined}
 */
DataModel.prototype.inferMapping = function(name) {
    var self = this;
    //ensure model cached mappings
    var conf = self.context.getConfiguration().model(self.name);
    if (typeof conf === "undefined" || conf == null) {
        return;
    }
    if (typeof conf.mappings_ === 'undefined') {
        conf.mappings_ = { };
    }
    if (typeof conf.mappings_[name] !== 'undefined') {
        if (conf.mappings_[name] instanceof types.DataAssociationMapping)
            return conf.mappings_[name];
        else
            return  new types.DataAssociationMapping(conf.mappings_[name]);
    }
    var field = self.field(name), result;
    if (!field)
        return null;
    if (field.mapping) {
        //if field model is different than the current model
        if (field.model !== self.name) {
            //if field mapping is already associated with the current model
            // (child or parent model is equal to the current model)
            if ((field.mapping.childModel===self.name) || (field.mapping.parentModel===self.name)) {
                //cache mapping
                conf.mappings_[name] = new types.DataAssociationMapping(field.mapping);
                //do nothing and return field mapping
                return conf.mappings_[name];
            }
            //get super types
            var superTypes = self.getSuperTypes();
            //map an inherited association
            //1. super model has a foreign key association with another model
            //(where super model is the child or the parent model)
            if (field.mapping.associationType === 'association') {
                //create a new cloned association
                result = new types.DataAssociationMapping(field.mapping);
                //check super types
                if (superTypes.indexOf(field.mapping.childModel)>=0) {
                    //set child model equal to current model
                    result.childModel = self.name;
                }
                else if (superTypes.indexOf(field.mapping.parentModel)>=0) {
                    //set child model equal to current model
                    result.childModel = self.name;
                }
                else {
                    //this is an exception
                    throw new types.DataException("EMAP","An inherited data association cannot be mapped.");
                }
                //cache mapping
                conf.mappings_[name] = result;
                //and finally return the newly created DataAssociationMapping object
                return result;
            }
            //2. super model has a junction (many-to-many association) with another model
            //(where super model is the child or the parent model)
            else if (field.mapping.associationType === 'junction') {
                //create a new cloned association
                result = new types.DataAssociationMapping(field.mapping);
                if (superTypes.indexOf(field.mapping.childModel)>=0) {
                    //set child model equal to current model
                    result.childModel = self.name;
                }
                else if (superTypes.indexOf(field.mapping.parentModel)>=0) {
                    //set parent model equal to current model
                    result.parentModel = self.name;
                }
                else {
                    //this is an exception
                    throw new types.DataException("EMAP","An inherited data association cannot be mapped.");
                }
                //cache mapping
                conf.mappings_[name] = result;
                //and finally return the newly created DataAssociationMapping object
                return result;
            }
        }
        //in any other case return the assocation mapping object
        if (field.mapping instanceof types.DataAssociationMapping) {
            //cache mapping
            conf.mappings_[name] = field.mapping;
            //and return
            return field.mapping;
        }
        result = util._extend(new types.DataAssociationMapping(), field.mapping);
        //cache mapping
        conf.mappings_[name] = result;
        //and return
        return result;
    }
    else {
        //get field model type
        var associatedModel = self.context.model(field.type);
        if ((typeof associatedModel === 'undefined') || (associatedModel == null))
        {
            return null;
        }
        //in this case we have two possible associations. Junction or Foreign Key association
        //try to find a field that belongs to the associated model and holds the foreign key of this model.
        var associatedField = associatedModel.attributes.find(function(x) {
           return x.type === self.name;
        });
        if (associatedField)
        {
            if (associatedField.many)
            {
                //return a data relation (parent model is the associated model)
                result = new types.DataAssociationMapping({
                    parentModel:associatedModel.name,
                    parentField:associatedModel.primaryKey,
                    childModel:self.name,
                    childField:field.name,
                    associationType:'association',
                    cascade:'null',
                    oneToOne:false
                });
                //cache mapping
                conf.mappings_[name] = result;
                //and finally return mapping
                return result;
            }
            else
            {
                //return a data relation (parent model is the current model)
                result = new types.DataAssociationMapping({
                    parentModel:self.name,
                    parentField:self.primaryKey,
                    childModel:associatedModel.name,
                    childField:associatedField.name,
                    associationType:'association',
                    cascade:'null',
                    oneToOne:false,
                    refersTo:field.property || field.name
                });
                //cache mapping
                conf.mappings_[name] = result;
                //and finally return mapping
                return result;
            }
        }
        else {

            //validate pluralize
            var re = new RegExp(DataModel.PluralExpression.source);
            if (re.test(field.name) || field.many) {
                //return a data junction
                result = new types.DataAssociationMapping({
                    associationAdapter: self.name.concat(string(field.name).capitalize()),
                    parentModel: self.name, parentField: self.primaryKey,
                    childModel: associatedModel.name,
                    childField: associatedModel.primaryKey,
                    associationType: 'junction',
                    cascade: 'delete',
                    oneToOne: false
                });
                //cache mapping
                conf.mappings_[name] = result;
                //and finally return mapping
                return result;
            }
            else {
                result = new types.DataAssociationMapping({
                    parentModel: associatedModel.name,
                    parentField: associatedModel.primaryKey,
                    childModel: self.name,
                    childField: field.name,
                    associationType: 'association',
                    cascade: 'null',
                    oneToOne: false
                });
                //cache mapping
                conf.mappings_[name] = result;
                //and finally return mapping
                return result;
            }
        }
    }
};


/**
 *
 * @param {*} obj
 * @param {number} state
 * @param {Function} callback
 * @private
 */
function validate_(obj, state, callback) {
    /**
     * @type {DataModel|*}
     */
    var self = this;
    if (typeof obj === 'undefined' || obj == null) {
        return callback();
    }
    //get object copy (based on the defined state)
    var objCopy = self.cast(obj, state);
    async.eachSeries(self.attributes, function(attr, cb) {
        var validator, validationResult;
        //get value
        var value = objCopy[attr.name];
        //build validators array
        var arrValidators=[];
        //-- RequiredValidator
        if (attr.hasOwnProperty('nullable') && !attr.nullable)
        {
            if (state==1 && !attr.primary) {
                arrValidators.push(new validators.RequiredValidator());
            }
            else if (state==2 && !attr.primary && objCopy.hasOwnProperty(attr.name)) {
                arrValidators.push(new validators.RequiredValidator());
            }
        }
        //-- MaxLengthValidator
        if (attr.hasOwnProperty('size') && objCopy.hasOwnProperty(attr.name)) {
            if (!(attr.validation && attr.validation.maxLength))
                arrValidators.push(new validators.MaxLengthValidator(attr.size));
        }
        //-- CustomValidator
        if (attr.validation && attr.validation['validator'] && objCopy.hasOwnProperty(attr.name)) {
            var validatorModule;
            try {
                if (/^\./ig.test(attr.validation['validator'])) {
                    var modulePath = path.resolve(process.cwd(), attr.validation['validator']);
                    validatorModule = require(modulePath);
                }
                else {
                    validatorModule = require(attr.validation['validator']);
                }
            }
            catch (e) {
                dataCommon.debug(util.format("Data validator module (%s) cannot be loaded", attr.validation.type));
                dataCommon.debug(e);
                return cb(e);
            }
            if (typeof validatorModule.createInstance !== 'function') {
                dataCommon.debug(util.format("Data validator module (%s) does not export createInstance() method.", attr.validation.type));
                return cb(new Error("Invalid data validator type."));
            }
            arrValidators.push(validatorModule.createInstance(attr));
        }
        //-- DataTypeValidator #1
        if (attr.validation && objCopy.hasOwnProperty(attr.name)) {
            if (typeof attr.validation.type === 'string') {
                arrValidators.push(new validators.DataTypeValidator(attr.validation.type));
            }
            else {
                //convert validation data to pseudo type declaration
                var validationProperties = {
                    properties:attr.validation
                };
                arrValidators.push(new validators.DataTypeValidator(validationProperties));
            }
        }
        //-- DataTypeValidator #2
        if (attr.type && objCopy.hasOwnProperty(attr.name)) {
            arrValidators.push(new validators.DataTypeValidator(attr.type));
        }

        if (arrValidators.length == 0) {
            return cb();
        }
        //do validation
        async.eachSeries(arrValidators, function(validator, cb) {

            //set context
            if (typeof validator.setContext === 'function') {
                validator.setContext(self.context);
            }
            //set target
            validator.target = obj;
            if (typeof validator.validateSync === 'function') {
                validationResult = validator.validateSync(value);
                if (validationResult) {
                    return cb(new types.DataException(validationResult.code || "EVALIDATE",validationResult.message, validationResult.innerMessage, self.name, attr.name));
                }
                else {
                    return cb();
                }
            }
            else if (typeof validator.validate === 'function') {
                return validator.validate(value, function(err, validationResult) {
                    if (err) {
                        return cb(err);
                    }
                    if (validationResult) {
                        return cb(new types.DataException(validationResult.code || "EVALIDATE",validationResult.message, validationResult.innerMessage, self.name, attr.name));
                    }
                    return cb();
                });
            }
            else {
                dataCommon.debug(util.format("Data validator (%s) does not have either validate() or validateSync() methods.", attr.validation.type));
                return cb(new Error("Invalid data validator type."));
            }
        }, function(err) {
            return cb(err);
        });

    }, function(err) {
        return callback(err);
    });
}
/**
 * Validates the given object against validation rules which are defined either by the data type or the definition of each attribute
 <p>Read more about data validation <a href="DataValidatorListener.html">here</a>.</p>
 * @param {*} obj - The data object which is going to be validated
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @returns {Promise|*} - If callback parameter is missing then returns a Promise object.
 */
DataModel.prototype.validateForUpdate = function(obj, callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        validate_.call(this, obj, 2, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return validate_.call(this, obj, callback);
    }
};

/**
 * Validates the given object against validation rules which are defined either by the data type or the definition of each attribute
 <p>Read more about data validation <a href="DataValidatorListener.html">here</a>.</p>
 * @param {*} obj - The data object which is going to be validated
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @returns {Promise|*} - If callback parameter is missing then returns a Promise object.
 <p>Read more about data validation <a href="DataValidationListener.html">here</a></p>
 */
DataModel.prototype.validateForInsert = function(obj, callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        validate_.call(this, obj, 1, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return validate_.call(this, obj, callback);
    }
};

/**
 * Sets the number of levels of the expandable attributes.
 * The default value is 1 which means that any expandable attribute will be flat (without any other nested attribute).
 * If the value is greater than 1 then the nested objects may contain other nested objects and so on.
 * @param {Number=} value - A number which represents the number of levels which are going to be used in expandable attributes.
 * @returns {DataQueryable}
 * @example
 //get orders, expand customer and get customer's nested objects if any.
 context.model('Order')
 .levels(2)
 .orderByDescending('dateCreated)
 .expand('customer')
 .getItems().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataModel.prototype.levels = function(value) {
    var result = new DataQueryable(this);
    return result.levels(value);
};
/**
 * Gets an array of active models which are derived from this model.
 * @returns {Promise|*}
 * @example
 * context.model("Thing").getSubTypes().then(function(result) {
        console.log(JSON.stringify(result,null,4));
        return done();
    }).catch(function(err) {
        return done(err);
    });
 */
DataModel.prototype.getSubTypes = function () {
    var self = this;
    var d = Q.defer();
    process.nextTick(function() {
        var migrations = self.context.model("Migration");
        if (typeof migrations === 'undefined' || migrations == null) {
            return d.resolve([]);
        }
        migrations.silent()
            .select("model")
            .groupBy("model")
            .all().then(function(result) {
            var conf = self.context.getConfiguration(), arr = [];
            result.forEach(function(x) {
                var m = conf.getModelDefinition(x.model);
                if (m && m.inherits === self.name) {
                    arr.push(m.name);
                }
            });
            return d.resolve(arr);
        }).catch(function(err) {
            return d.reject(err)
        });
    });
    return d.promise;
};

if (typeof exports !== 'undefined') {
    module.exports.DataModel = DataModel;
}


