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
 * @type {{inherits:Function,_extend:Function,isArray:Function}}
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
 * @class HasParentJunction
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj The parent data object reference
 * @param {String|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 */
function HasParentJunction(obj, association) {
    /**
     * @type {DataObject}
     * @private
     */
    var __parent = obj,
        self = this,
        model,
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

    /**
     * @type {DataAssociationMapping}
     */
    this.mapping = undefined;
    if (typeof association === 'string') {
        //infer mapping from field name
        //set relation mapping
        if (self.parent!=null) {
            model = self.parent.getModel();
            if (model!=null)
                self.mapping = model.inferMapping(association);
        }
    }
    else if (typeof association === 'object' && association !=null) {
        //get the specified mapping
        if (association instanceof types.DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = util._extend(new types.DataAssociationMapping(), association);
    }

    //get related model
    model=self.parent.getModel();
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
            //otherwise create model
            var parentModel = self.parent.getModel();
            var parentField = parentModel.field(self.mapping.parentField);
            var childModel = self.parent.context.model(self.mapping.childModel);
            var childField = childModel.field(self.mapping.childField);
            var adapter = self.mapping.associationAdapter;
            baseModel = self.parent.context.model(adapter);
            if (dataCommon.isNullOrUndefined(baseModel)) {
                cfg.current.models[adapter] = { name:adapter, title: adapter, source:adapter, view:adapter, version:'1.0', fields:[
                    { name: "id", type:"Counter", primary: true },
                    { name: 'parentId', nullable:false, type:parentField.type },
                    { name: 'valueId', nullable:false, type:childField.type } ],
                    constraints: [
                        {
                            description: "The relation between two objects must be unique.",
                            type:"unique",
                            fields: [ 'parentId', 'valueId' ]
                        }
                    ]};
                //initialize base model
                baseModel = new DataModel(cfg.current.models[adapter]);
                baseModel.context = self.parent.context;
            }
            return baseModel;
        },configurable:false, enumerable:false
    });

}

util.inherits(HasParentJunction, DataQueryable);

/**
 * Inserts a new association between a parent and a child object.
 * @param {*} obj An object or an identifier that represents the child object
 * @param {Function} callback
 * @private
 */
HasParentJunction.prototype.insertSingleObject = function(obj, callback) {
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
};

/**
 * @param {*|Array} obj An item of a collection of items that is going to be related with parent object
 * @param {Function} callback
 */
HasParentJunction.prototype.insert = function(obj, callback) {
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
                    self.insertSingleObject(parent, function(err) {
                        cb(err);
                    });
                }
                else {
                    //get related model
                    var relatedModel = self.parent.context.model(self.mapping.parentModel);
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
                                self.insertSingleObject(parent, function(err) {
                                    cb(err);
                                });
                            }
                        }
                    });
                }

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
HasParentJunction.prototype.removeSingleObject = function(obj, callback) {
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
};

/**
 * @param {*|Array} obj An item of a collection of items that is going to be related with parent object
 * @param {Function} callback
 */
HasParentJunction.prototype.remove = function(obj, callback) {
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
                            self.removeSingleObject(parent, function(err) {
                                cb(err);
                            });
                        }
                    }
                });
            }, callback);
        }
    })
};

HasParentJunction.prototype.migrate = function(callback) {
    this.baseModel.migrate(callback);
};


if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @constructs HasParentJunction
         */
        HasParentJunction:HasParentJunction

    };
}