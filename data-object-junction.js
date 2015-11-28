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
    async = require('async'),
    qry = require('most-query'),
    dataCommon = require('./data-common'),
    types = require('./types'),
    cfg = require('./data-configuration'),
    DataAssociationMapping = types.DataAssociationMapping,
    DataQueryable = require('./data-queryable').DataQueryable;

/**
 * @class DataObjectJunction
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj The parent data object reference
 * @param {String|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 */
function DataObjectJunction(obj, association) {
    /**
     * @type {DataObject}
     * @private
     */
    var __parent = obj,
        DataModel = require('./data-model').DataModel;

    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return __parent;
    }, set: function (value) {
        __parent = value;
    }, configurable: false, enumerable: false});
    var self = this;
    /**
     * @type {DataAssociationMapping}
     */
    this.mapping = undefined;
    if (typeof association === 'string') {
        //infer mapping from field name
        //set relation mapping
        if (self.parent!=null) {
            var model = self.parent.getModel();
            if (model!=null)
                self.mapping = model.inferMapping(association);
        }
    }
    else if (typeof association === 'object' && association !=null) {
        //get the specified mapping
        if (association instanceof DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = util._extend(new DataAssociationMapping(), association);
    }
    //get related model
    var relatedModel = this.parent.context.model(self.mapping.childModel);
    //call super class constructor
    DataObjectJunction.super_.call(this, relatedModel);
    //modify query (add join model)
    var adapter = relatedModel.viewAdapter;
    var left = {}, right = {};
    this.query.select(relatedModel.attributes.filter(function(x) {
        return !x.many;
    }).map(function(x) {
        return qry.fields.select(x.name).from(adapter);
    }));
    left[adapter] = [ relatedModel.primaryKey ];
    right[this.mapping.associationAdapter] = [qry.fields.select(DataObjectJunction.STR_VALUE_FIELD).from(this.mapping.associationAdapter).$name];
    var field1 = qry.fields.select(DataObjectJunction.STR_OBJECT_FIELD).from(this.mapping.associationAdapter).$name;
    this.query.join(this.mapping.associationAdapter, []).with([left, right]).where(field1).equal(obj[this.mapping.parentField]).prepare();
    /**
     * Gets the model that holds association data
     * @type {DataModel}
     */
    this.baseModel = undefined;
    var baseModel = null;
    Object.defineProperty(this, 'baseModel', {
        get: function() {
            if (baseModel)
                return baseModel;
            //sarch in cache (configuration.current.cache)
            if (cfg.current.models[self.mapping.associationAdapter]) {
                baseModel = new DataModel(cfg.current.models[self.mapping.associationAdapter]);
                baseModel.context = self.parent.context;
                return baseModel;
            }
            //get parent and child field in order to get junction field types
            var parentModel = self.parent.getModel();
            var parentField = parentModel.field(self.mapping.parentField);
            //todo::child model is optional (e.g. multiple value fields). Sometimes it needs to be ignored.
            var childModel = self.parent.context.model(self.mapping.childModel);
            var childField = childModel.field(self.mapping.childField);
            var adapter = self.mapping.associationAdapter;
            baseModel = self.parent.context.model(adapter);
            if (dataCommon.isNullOrUndefined(baseModel)) {
                cfg.current.models[self.mapping.associationAdapter] = { name:adapter, title: adapter, source:adapter, view:adapter, version:'1.0', fields:[
                    { name: "id", type:"Counter", primary: true },
                    { name: DataObjectJunction.STR_OBJECT_FIELD, nullable:false, type: (parentField.type=='Counter') ? 'Integer' : parentField.type },
                    { name: DataObjectJunction.STR_VALUE_FIELD, nullable:false, type: (childField.type=='Counter') ? 'Integer' : childField.type } ],
                    constraints: [
                        {
                            description: "The relation between two objects must be unique.",
                            type:"unique",
                            fields: [ DataObjectJunction.STR_OBJECT_FIELD, DataObjectJunction.STR_VALUE_FIELD ]
                        }
                    ]};
                //initialize base model
                baseModel = new DataModel(cfg.current.models[self.mapping.associationAdapter]);
                baseModel.context = self.parent.context;
            }
            return baseModel;
        },configurable:false, enumerable:false
    });

}
DataObjectJunction.STR_OBJECT_FIELD = 'parentId';
DataObjectJunction.STR_VALUE_FIELD = 'valueId';

util.inherits(DataObjectJunction, DataQueryable);
/**
 * Gets a temporary data model that refers to the current object relation
 * @private
 * @returns {DataModel}
 */
DataObjectJunction.prototype.getRelationModel = function()
{
    var self = this,
        DataModel = require('./data-model').DataModel;
    //get parent and child field in order to get junction field types
    var parentModel = self.parent.getModel();
    var parentField = parentModel.field(self.mapping.parentField);
    //todo::child model is optional (e.g. multiple value fields). Sometimes it needs to be ignored.
    var childModel = self.parent.context.model(self.mapping.childModel);
    var childField = childModel.field(self.mapping.childField);
    var adapter = self.mapping.associationAdapter;
    var relationModel = self.parent.context.model(adapter);
    if (dataCommon.isNullOrUndefined(relationModel)) {
        var tempModel = { name:adapter, title: adapter, source:adapter, view:adapter, version:'1.0', fields:[
            { name: "id", type:"Counter", primary: true },
            { name: DataObjectJunction.STR_OBJECT_FIELD, nullable:false, type: (parentField.type=='Counter') ? 'Integer' : parentField.type },
            { name: DataObjectJunction.STR_VALUE_FIELD, nullable:false, type: (childField.type=='Counter') ? 'Integer' : childField.type } ],
            constraints: [
                {
                    description: "The relation between two objects must be unique.",
                    type:"unique",
                    fields: [ DataObjectJunction.STR_OBJECT_FIELD, DataObjectJunction.STR_VALUE_FIELD ]
                }
            ]};
        relationModel = new DataModel(tempModel);
        relationModel.context = self.parent.context;
    }
    return relationModel;
};

DataObjectJunction.prototype.migrate = function(callback) {
    var model = this.getRelationModel();
    model.migrate(function(err) {
        if (err) {
            callback(err);
        }
        else {
            //migrate related model
            var relatedModel = self.parent.context.model(self.mapping.childModel);
            relatedModel.migrate(callback);
        }
    });
};

DataObjectJunction.prototype.execute = function(callback) {
    var self = this;
    self.migrate(function(err) {
        if (err) { callback(err); return; }
        //noinspection JSPotentiallyInvalidConstructorUsage
        DataObjectJunction.super_.prototype.execute.call(self, callback);
    });
};

/**
 * @param {*|Array} obj An item of a collection of items that is going to be related with parent object
 * @param {Function} callback
 */
DataObjectJunction.prototype.insert = function(obj, callback) {
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
                var child = item;
                if (typeof item !== 'object') {
                    child = {};
                    child[self.mapping.childField] = item;
                }
                //validate if child identifierr exists
                if (child.hasOwnProperty(self.mapping.childField)) {
                    self.insertSingleObject(child, function(err) {
                        cb(err);
                    });
                }
                else {
                    /**
                     * Get related model. The related model is the model of any child object of this junction.
                     * @type {DataModel}
                     */
                    var relatedModel = self.parent.context.model(self.mapping.childModel);
                    //find object by querying child object
                    relatedModel.find(child).select([self.mapping.childField]).first(function (err, result) {
                        if (err) {
                            cb(err);
                        }
                        else {
                            /**
                             * Validates related object, inserts this object if does not exists
                             * and finally defines the relation between child and parent objects
                             */
                            if (!result) {
                                //insert related item if does not exists
                                relatedModel.insert(child, function(err) {
                                    if (err) {
                                        cb(err);
                                    }
                                    else {
                                        //insert relation between child and parent
                                        self.insertSingleObject(child, function(err) { cb(err); });
                                    }
                                });
                            }
                            else {
                                //set primary key
                                child[self.mapping.childField] = result[self.mapping.childField];
                                //insert relation between child and parent
                                self.insertSingleObject(child, function(err) { cb(err); });
                            }
                        }
                    });
                }

            }, callback);
        }
    })

};

/**
 * Removes all the associated items
 * @param {Function} callback
 */
DataObjectJunction.prototype.clear = function(callback) {
    var self = this;
    self.migrate(function(err) {
        if (err)
            callback(err);
        else {
            //get parent id
            var parentId = self.parent[self.mapping.parentField];
            //get relation model
            var relationModel = self.getRelationModel();
            //validate relation existance
            relationModel.where(DataObjectJunction.STR_OBJECT_FIELD).equal(parentId).all(function(err, result) {
                if (err) {
                    callback(err);
                }
                else {
                    relationModel.remove(result, callback);
                }
            });
        }
    });
};

/**
 * Inserts a new relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
DataObjectJunction.prototype.insertSingleObject = function(obj, callback) {
    var self = this;
    //get parent and child
    var child = obj;
    if (typeof obj !== 'object') {
        child = {};
        child[self.mapping.childField] = obj;
    }
    var parentId = self.parent[self.mapping.parentField], childId = child[self.mapping.childField];
    //get relation model
    var relationModel = self.getRelationModel();
    //validate relation existance
    relationModel.where(DataObjectJunction.STR_OBJECT_FIELD).equal(parentId).and(DataObjectJunction.STR_VALUE_FIELD).equal(childId).first(function(err, result) {
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
                newItem[DataObjectJunction.STR_OBJECT_FIELD] = parentId;
                newItem[DataObjectJunction.STR_VALUE_FIELD] = childId;
                //and insert it
                relationModel.insert(newItem, callback);
            }
        }
    });

};
/**
 * Migrates current junction data storage
 * @param {Function} callback
 */
DataObjectJunction.prototype.migrate = function(callback)
{
    var self = this;
    //auto migrate junction table
    var migrationModel = cfg.current.models.Migration.clone(self.parent.context);
    var relationModel = self.getRelationModel();
    migrationModel.find({ appliesTo:relationModel.source, version: relationModel.version }).first(function(err, result) {
        if (err) {
            callback(err);
        }
        else {
            if (!result) {
                //migrate junction table
                relationModel.migrate(function(err) {
                    if (err) {
                        callback(err);
                    }
                    else
                        callback(null);
                })
            }
            else
                callback(null);
        }
    });
};

/**
 * @param {*|Array} obj An item of a collection of items that is going to be related with parent object
 * @param {Function} callback
 */
DataObjectJunction.prototype.remove = function(obj, callback) {
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
        else
        {
            async.eachSeries(arr, function(item, cb) {
                var child = item;
                if (typeof item !== 'object') {
                    child = {};
                    child[self.mapping.childField] = item;
                }
                //get related model
                var relatedModel = self.parent.context.model(self.mapping.childModel);
                //find object by querying child object
                relatedModel.find(child).select([self.mapping.childField]).first(function (err, result) {
                    if (err) {
                        cb(null);
                    }
                    else {
                        if (!result) {
                            //child was not found (do nothing or throw exception)
                            cb(null);
                        }
                        else {
                            child[self.mapping.childField] = result[self.mapping.childField];
                            self.removeSingleObject(child, function(err) {
                                cb(err);
                            });
                        }
                    }
                });
            }, callback);
        }
    })
};

/**
 * Removes a relation between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
DataObjectJunction.prototype.removeSingleObject = function(obj, callback) {
    var self = this;
    //get parent and child
    var child = obj;
    if (typeof obj !== 'object') {
        child = {};
        child[self.mapping.childField] = obj;
    }
    var parentId = self.parent[self.mapping.parentField], childId = child[self.mapping.childField];
    //get relation model
    var relationModel = self.getRelationModel();
    relationModel.where(DataObjectJunction.STR_OBJECT_FIELD).equal(parentId).and(DataObjectJunction.STR_VALUE_FIELD).equal(childId).first(function(err, result) {
        if (err) {
            callback(err);
        }
        else {
            if (!result) {
                callback(null);
            }
            else {
                //otherwise remove item
                relationModel.remove(result, callback);
            }
        }
    });
};

if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @constructs DataObjectJunction
         */
        DataObjectJunction:DataObjectJunction

    };
}