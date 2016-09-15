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
 * @ignore
 */
var util = require('util'),
    _ = require('lodash'),
    async = require('async'),
    qry = require('most-query'),
    DataAssociationMapping = require('./types').DataAssociationMapping,
    DataQueryable = require('./data-queryable').DataQueryable;

/**
 * @classdesc Represents a many-to-many association between two data models.
 * <p>
 *     This association may be defined in a field of a child model as follows:
 * </p>
 * <pre class="prettyprint"><code>
 {
     "name": "User", "id": 90, "title": "Users", "inherits": "Account", "hidden": false, "sealed": false, "abstract": false, "version": "1.4",
     "fields": [
        ...
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
		}
        ...
     ]
     }
 </code></pre>
 <p>
 where model [User] has a many-to-many association with model [Group] in order to define the groups where a user belongs.
 This association will produce a database table with name of the specified association adapter name. If this name is missing
 then it will produce a table with a default name which comes of the concatenation of the model and the associated model.
 </p>
 <p>
    An instance of HasParentJunction class overrides DataQueryable methods for filtering associated objects:
 </p>
 <pre class="prettyprint"><code>
 //check if the selected user belongs to Administrators group by querying user groups
 var users = context.model('User');
 users.where('name').equal('alexis.rees@example.com')
 .first().then(function(result) {
        var user = users.convert(result);
        user.property('groups').where('name').equal('Users').count().then(function(result) {
            done(null, result);
        });
    }).catch(function(err) {
        done(err);
    });
 </code></pre>
 <p>
 Connects two objects (by inserting an association between parent and child object):
 </p>
 <pre class="prettyprint"><code>
 //add the selected user to Administrators
 var users = context.model('User');
 users.where('name').equal('alexis.rees@example.com')
 .first().then(function(result) {
        var user = users.convert(result);
        user.property('groups').insert({ name:"Administrators" }).then(function(result) {
            done(null, result);
        });
    }).catch(function(err) {
        done(err);
    });
 </code></pre>
 <p>
 Disconnects two objects (by removing an existing association):
 </p>
 <pre class="prettyprint"><code>
 //remove the selected user from Administrators group
 var users = context.model('User');
 users.where('name').equal('alexis.rees@example.com')
 .first().then(function(result) {
        var user = users.convert(result);
        user.property('groups').remove({ name:"Administrators" }).then(function(result) {
            done(null, result);
        });
    }).catch(function(err) {
        done(err);
    });
 </code></pre>
 * @class
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj The parent data object reference
 * @param {string|*} association - A string that represents the name of the field which holds association mapping or the association mapping itself.
 * @property {DataModel} baseModel - The model associated with this data object junction
 * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectJunction class.
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
function HasParentJunction(obj, association) {
    var self = this;
    /**
     * @type {DataObject}
     * @private
     */
    var parent_ = obj,
        /**
         * @type {DataModel}
         */
        model_,
        DataModel = require('./data-model').DataModel;
    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return parent_;
    }, set: function (value) {
        parent_ = value;
    }, configurable: false, enumerable: false});

    //get association mapping
    if (typeof association === 'string') {
        if (parent_) {
            model_ = parent_.getModel();
            if (model_!=null)
                self.mapping = model_.inferMapping(association);
        }
    }
    else if (typeof association === 'object' && association !=null) {
        //get the specified mapping
        if (association instanceof DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = util._extend(new DataAssociationMapping(), association);
    }

    var relatedModel = this.parent.context.model(self.mapping.parentModel);
    //call super class constructor
    HasParentJunction.super_.call(this, relatedModel);
    //modify query (add join model)
    var adapter = relatedModel.viewAdapter;
    var left = {}, right = {};
    this.query.select(relatedModel.attributes.filter(function(x) {
        return !x.many;
    }).map(function(x) {
        return qry.fields.select(x.name).from(adapter);
    }));
    var associationAdapter = self.mapping.associationAdapter,
        parentField = qry.fields.select('parentId').from(associationAdapter).$name,
        childField = qry.fields.select('valueId').from(associationAdapter).$name;
    left[adapter] = [ this.mapping.parentField ];
    right[associationAdapter] = [parentField];
    this.query.join(this.mapping.associationAdapter, []).with([left, right]).where(childField).equal(obj[this.mapping.childField]).prepare();

    var baseModel;
    Object.defineProperty(this, 'baseModel', {
        get: function() {
            if (baseModel)
                return baseModel;
            var conf = self.parent.context.getConfiguration();
            //search in cache (configuration.current.cache)
            if (conf.models[self.mapping.associationAdapter]) {
                baseModel = new DataModel(conf.models[self.mapping.associationAdapter]);
                baseModel.context = self.parent.context;
                return baseModel;
            }
            //otherwise create model
            var parentModel = self.parent.getModel();
            var parentField = parentModel.field(self.mapping.parentField);
            var childModel = self.parent.context.model(self.mapping.childModel);
            var childField = childModel.field(self.mapping.childField);
            var adapter = self.mapping.associationAdapter;
            baseModel = self.parent.context.model(adapter);
            if (_.isNil(baseModel)) {
                conf.models[adapter] = { name:adapter, title: adapter, sealed:false, hidden:true, type:"hidden", source:adapter, view:adapter, version:'1.0', fields:[
                    { name: "id", type:"Counter", primary: true },
                    { name: 'parentId', indexed: true, nullable:false, type: (parentField.type=='Counter') ? 'Integer' : parentField.type },
                    { name: 'valueId', indexed: true, nullable:false, type: (childField.type=='Counter') ? 'Integer' : childField.type } ],
                    constraints: [
                        {
                            description: "The relation between two objects must be unique.",
                            type:"unique",
                            fields: [ 'parentId', 'valueId' ]
                        }
                    ], "privileges":[
                        { "mask":15, "type":"global" }
                    ]};
                //initialize base model
                baseModel = new DataModel(conf.models[adapter]);
                baseModel.context = self.parent.context;
            }
            return baseModel;
        },configurable:false, enumerable:false
    });
    /**
     * Gets an instance of DataModel class which represents the data adapter of this association
     * @returns {DataModel}
     */
    this.getBaseModel = function() {
        return this.baseModel;
    }

}
util.inherits(HasParentJunction, DataQueryable);

/**
 * Inserts a new association between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
function insertSingleObject_(obj, callback) {
    var self = this;
    //get parent and child
    var parent = obj;
    if (typeof obj !== 'object') {
        parent = {};
        parent[self.mapping.parentField] = obj;
    }
    var parentId = parent[self.mapping.parentField], childId = self.parent[self.mapping.childField];
    //validate relation existance
    self.baseModel.where('parentId').equal(parentId).and('valueId').equal(childId).first(function(err, result) {
        if (err) {
            //on error exit with error
            return callback(err);
        }
        else {
            if (result) {
                //if relation already exists, do nothing
                return callback(null);
            }
            else {
                //otherwise create new item
                var newItem = { };
                newItem['parentId'] = parentId;
                newItem['valueId'] = childId;
                //and insert it
                self.baseModel.insert(newItem, callback);
            }
        }
    });
}

function insert_(obj, callback) {
    var self = this;
    var arr = [];
    if (util.isArray(obj))
        arr = obj;
    else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err)
            callback(err);
        else {
            async.eachSeries(arr, function(item, cb) {
                var parent = item;
                if (typeof item !== 'object') {
                    parent = {};
                    parent[self.mapping.parentField] = item;
                }
                //validate if child identifierr exists
                if (parent.hasOwnProperty(self.mapping.parentField)) {
                    insertSingleObject_.call(self, parent, function(err) {
                        cb(err);
                    });
                }
                else {
                    //get related model
                    var relatedModel = self.parent.context.model(self.mapping.parentModel);
                    //ensure silent mode
                    if (self.getBaseModel().$silent) { relatedModel.silent(); }
                    //find object by querying child object
                    relatedModel.find(item).select([self.mapping.parentField]).first(function (err, result) {
                        if (err) {
                            cb(null);
                        }
                        else {
                            if (!result) {
                                //child was not found (do nothing or throw exception)
                                cb(null);
                            }
                            else {
                                parent[self.mapping.parentField] = result[self.mapping.parentField];
                                insertSingleObject_.call(self, parent, function(err) {
                                    cb(err);
                                });
                            }
                        }
                    });
                }

            }, callback);
        }
    });
}

/**
 * Inserts an association between parent object and the given object or array of objects.
 * @param {*|Array} obj - An object or an array of objects to be related with parent object
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 * @example
 //add the selected user to Administrators
 var users = context.model('User');
 users.where('name').equal('alexis.rees@example.com')
 .first().then(function(result) {
        var user = users.convert(result);
        user.property('groups').insert({ name:"Administrators" }).then(function(result) {
            done(null, result);
        });
    }).catch(function(err) {
        done(err);
    });
 */
HasParentJunction.prototype.insert = function(obj, callback) {
    var self = this;
    if (typeof callback !== 'function') {
        var Q = require('q'), deferred = Q.defer();
        insert_.call(self, obj, function(err) {
            if (err) { return deferred.reject(err); }
            deferred.resolve(null);
        });
        return deferred.promise;
    }
    else {
        return insert_.call(self, obj, callback);
    }
};

/**
 * Removes a relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
function removeSingleObject_(obj, callback) {
    var self = this;
    //get parent and child
    var parent = obj;
    if (typeof obj !== 'object') {
        parent = {};
        parent[self.mapping.parentField] = obj;
    }
    var parentId = parent[self.mapping.parentField], childId = self.parent[self.mapping.childField];
    //get relation model
    self.baseModel.where('parentId').equal(parentId).and('valueId').equal(childId).first(function(err, result) {
        if (err) {
            callback(err);
        }
        else {
            if (!result) {
                callback(null);
            }
            else {
                //otherwise remove item
                self.baseModel.remove(result, callback);
            }
        }
    });
}

function remove_(obj, callback) {
    var self = this, arr = [];
    if (util.isArray(obj))
        arr = obj;
    else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err)
            callback(err);
        else
        {
            async.eachSeries(arr, function(item, cb) {
                var parent = item;
                if (typeof item !== 'object') {
                    parent = {};
                    parent[self.mapping.parentField] = item;
                }
                //get related model
                var relatedModel = self.parent.context.model(self.mapping.parentModel);
                //find object by querying child object
                relatedModel.find(parent).select([self.mapping.parentField]).first(function (err, result) {
                    if (err) {
                        return cb(null);
                    }
                    else {
                        if (!result) {
                            //child was not found (do nothing or throw exception)
                            cb(null);
                        }
                        else {
                            parent[self.mapping.parentField] = result[self.mapping.parentField];
                            removeSingleObject_.call(self, parent, function(err) {
                                cb(err);
                            });
                        }
                    }
                });
            }, callback);
        }
    });
}

/**
 * Removes the association between parent object and the given object or array of objects.
 * @param {*|Array} obj - An object or an array of objects to be disconnected from parent object
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 * @example
 //remove the selected user from Administrators group
 var users = context.model('User');
 users.where('name').equal('alexis.rees@example.com')
 .first().then(function(result) {
        var user = users.convert(result);
        user.property('groups').remove({ name:"Administrators" }).then(function(result) {
            done(null, result);
        });
    }).catch(function(err) {
        done(err);
    });
 */
HasParentJunction.prototype.remove = function(obj, callback) {
    var self = this;
    if (typeof callback !== 'function') {
        var Q = require('q'), deferred = Q.defer();
        remove_.call(self, obj, function(err) {
            if (err) { return deferred.reject(err); }
            deferred.resolve(null);
        });
        return deferred.promise;
    }
    else {
        return remove_.call(self, obj, callback);
    }
};

HasParentJunction.prototype.migrate = function(callback) {
    this.baseModel.migrate(callback);
};


if (typeof exports !== 'undefined')
{
    module.exports = {
        HasParentJunction:HasParentJunction
    };
}