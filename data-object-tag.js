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
    DataQueryable = require('./data-queryable').DataQueryable;

/**
 * @classdesc Represents a collection of values associated with a data object e.g. a collection of tags of an article, a set of skills of a person etc.
 * <p>
 *     This association may be defined in a field of a data model as follows:
 * </p>
 * <pre class="prettyprint"><code>
 {
     "name": "Person", "title": "Persons", "inherits":"Party", "version": "1.1",
     "fields": [
        ...
        {
            "@id": "https://themost.io/skills",
            "name": "skills",
            "title": "Skills",
            "description": "A collection of skills of the person.",
            "many": true,
            "type": "Text"
        }
        ...
     ]
     }
 </code></pre>
 <p>
 where model [Person] has a one-to-many association with a collection of strings in order to define the skills of a person.
 </p>
 <p>
 An instance of DataObjectTag class overrides DataQueryable methods for filtering associated values:
 </p>
 <pre class="prettyprint"><code>
 var persons = context.model('Person');
 persons.where('email').equal('veronica.fletcher@example.com')
 .getTypedItem().then(function(person) {
        person.property('skills').where('name').equal('alexis.rees@example.com').all().then(function(result) {
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
 //add a user (by name) in Administrators group
 var groups = context.model('Group');
 groups.where('name').equal('Administrators')
 .first().then(function(result) {
        var group = groups.convert(result);
        group.property('members').insert({ name: 'alexis.rees@example.com' }).then(function() {
            done();
        });
    }).catch(function(err) {
        done(err);
    });
 </code></pre>
 <p>
 Disconnects two objects (by removing an existing association):
 </p>
 <pre class="prettyprint"><code>
 //remove a user (by name) from Administrators group
 var groups = context.model('Group');
 groups.where('name').equal('Administrators')
 .first().then(function(result) {
        var group = groups.convert(result);
        group.property('members').remove({ name: 'alexis.rees@example.com' }).then(function() {
            done();
        });
    }).catch(function(err) {
        done(err);
    });
 </code></pre>
 * @class
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj An object which represents the parent data object
 * @param {String|*} association A string that represents the name of the field which holds association mapping or the association mapping itself.
 * @property {DataModel} baseModel - The model associated with this data object junction
 * @property {DataObject} parent - Gets or sets the parent data object associated with this instance of DataObjectTag class.
 * @property {DataAssociationMapping} mapping - Gets or sets the mapping definition of this data object association.
 */
function DataObjectTag(obj, association) {
    /**
     * @type {DataObject}
     * @private
     */
    var parent_ = obj,
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
    var self = this;
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
        if (association instanceof types.DataAssociationMapping)
            self.mapping = association;
        else
            self.mapping = util._extend(new types.DataAssociationMapping(), association);
    }
    //validate mapping
    var baseModel_;
    Object.defineProperty(this, 'baseModel', {
        get: function() {
            if (baseModel_)
                return baseModel_;
            //get parent context
            var context = self.parent.context;
            var conf = context.getConfiguration();
            var definition = conf.getModelDefinition(self.mapping.associationAdapter);
            if (typeof definition === 'undefined' || definition == null) {
                var parentModel = self.parent.getModel(),
                    refersTo = parentModel.getAttribute(self.mapping.refersTo),
                    parentField = parentModel.getAttribute(self.mapping.parentField);
                definition = {
                    "name": self.mapping.associationAdapter,
                    "hidden": true,
                    "source": self.mapping.associationAdapter,
                    "view": self.mapping.associationAdapter,
                    "version": "1.0",
                    "fields": [
                        {
                            "name": "id", "type": "Counter", "nullable": false, "primary": true
                        },
                        {
                            "name": "object", "type": parentField.type, "nullable": false, "many": false
                        },
                        {
                            "name": "value", "type": refersTo.type, "nullable": false
                        }
                    ],
                    "constraints": [
                        { "type":"unique", "fields": [ "object", "value" ] }
                    ],
                    "privileges": [
                        {
                            "mask": 15, "type": "global"
                        }
                    ]
                };
                conf.setModelDefinition(definition);
            }
            baseModel_ = new DataModel(definition);
            baseModel_.context = self.parent.context;
            return baseModel_;
        },configurable:false, enumerable:false
    });

    /**
     * Gets an instance of DataModel class which represents the data adapter of this association
     * @returns {DataModel}
     */
    this.getBaseModel = function() {
        return this.baseModel;
    };

    //call super class constructor
    DataObjectTag.super_.call(this, self.getBaseModel());
    //add select
    this.select("value").asArray();
    //modify query (add join parent model)
    var left = {}, right = {};
    var parentAdapter = self.parent.getModel().viewAdapter;
    left[ parentAdapter ] = [ this.mapping.parentField ];
    right[this.mapping.associationAdapter] = [ qry.fields.select("object").from(this.mapping.associationAdapter).$name ];
    var field1 = qry.fields.select("object").from(this.mapping.associationAdapter).$name;
    this.query.join(parentAdapter, []).with([left, right]).where(field1).equal(obj[this.mapping.parentField]).prepare(false);
}

util.inherits(DataObjectTag, DataQueryable);

/**
 * Migrates the underlying data association adapter.
 * @param callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 */
DataObjectTag.prototype.migrate = function(callback) {
    this.getBaseModel().migrate(callback);
};
/**
 * Overrides DataQueryable.execute() method
 * @param callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @ignore
 */
DataObjectTag.prototype.execute = function(callback) {
    var self = this;
    self.migrate(function(err) {
        if (err) { return callback(err); }
        DataObjectTag.super_.prototype.execute.call(self, callback);
    });
};

function insert_(obj, callback) {
    var self = this, arr = [];
    if (util.isArray(obj))
        arr = obj;
    else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err)
            return callback(err);

        var items = arr.map(function (x) {
            return {
                "object": self.parent[self.mapping.parentField],
                "value": x
            }
        });
        if (self.$silent) { self.getBaseModel().silent(); }
        return self.getBaseModel().save(items, callback);
    });
}

/**
 * Inserts an association between parent object and the given object or array of objects.
 * @param {*|Array} obj - An object or an array of objects to be related with parent object
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 * @example
 //add a user (by name) in Administrators group
 var groups = context.model('Group');
 groups.where('name').equal('Administrators')
 .first().then(function(result) {
        var group = groups.convert(result);
        group.property('members').insert({ name: 'alexis.rees@example.com' }).then(function() {
            done();
        });
    }).catch(function(err) {
        done(err);
    });
 */
DataObjectTag.prototype.insert = function(obj, callback) {
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

function clear_(callback) {
    var self = this;
    self.migrate(function(err) {
        if (err) {
            return callback(err);
        }
        if (self.$silent) { this.getBaseModel().silent(); }
        self.getBaseModel().where("object").equal(self.parent[self.mapping.parentField]).select("id").all().then(function(result) {
            if (result.length==0) { return callback(); }
            return self.getBaseModel().remove(result).then(function () {
               return callback();
            });
        }).catch(function(err) {
           return callback(err);
        });
    });
}

/**
 * Removes all the associated items
 * @param {Function=} callback
 */
DataObjectTag.prototype.clear = function(callback) {
    var self = this;
    if (typeof callback !== 'function') {
        var Q = require('q'), deferred = Q.defer();
        clear_.call(self, function(err) {
            if (err) { return deferred.reject(err); }
            deferred.resolve();
        });
        return deferred.promise;
    }
    else {
        return clear_.call(self, callback);
    }
};

function remove_(obj, callback) {
    var self = this;
    var arr = [];
    if (util.isArray(obj))
        arr = obj;
    else {
        arr.push(obj);
    }
    self.migrate(function(err) {
        if (err) {
            return callback(err);
        }
        var items = arr.map(function (x) {
            return {
                "object": self.parent[self.mapping.parentField],
                "value": x
            }
        });
        if (self.$silent) { self.getBaseModel().silent(); }
        return self.getBaseModel().remove(items, callback);
    });
}

/**
 * Removes the association between parent object and the given object or array of objects.
 * @param {*|Array} obj - An object or an array of objects to be disconnected from parent object
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise.
 * @returns {Promise<T>|*} - If callback parameter is missing then returns a Promise object.
 * @example
 //remove a user (by name) from Administrators group
 var groups = context.model('Group');
 groups.where('name').equal('Administrators')
 .first().then(function(result) {
        var group = groups.convert(result);
        group.property('members').remove({ name: 'alexis.rees@example.com' }).then(function() {
            done();
        });
    }).catch(function(err) {
        done(err);
    });
 */
DataObjectTag.prototype.remove = function(obj, callback) {
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

if (typeof exports !== 'undefined')
{
    module.exports = {
        DataObjectTag:DataObjectTag
    };
}