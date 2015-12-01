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
    DataQueryable = require('./data-queryable').DataQueryable;


/**
 * @class
 * @constructor
 * @augments DataQueryable
 * @param {DataObject} obj
 * @param {String} name
 * @property {DataObject} parent Gets or sets the parent data object
 */
function DataObjectRelation(obj, name)
{
    /**
     * @type {DataObject}
     * @private
     */
    var p = obj,
        DataModel = require('./data-model').DataModel;
    /**
     * Gets or sets the parent data object
     * @type DataObject
     */
    Object.defineProperty(this, 'parent', { get: function () {
        return p;
    }, set: function (value) {
        p = value;
    }, configurable: false, enumerable: false});
    /**
     * @type {DataAssociationMapping}
     */
    this.mapping = undefined;
    //DataObjectRelation.super_.call(this, relatedModel);
    var self = this;
    //set relation mapping
    if (self.parent!=null) {
        var model = self.parent.getModel();
        if (model!=null) {
            self.mapping = model.inferMapping(name);
        }
    }

    var q = null;
    //override query property
    Object.defineProperty(this, 'query', {
        get:function() {
            //if query is already defined
            if (q!=null)
            //return this query
                return q;
            if (typeof self.mapping != 'object')
                throw new Error('Data relation mapping cannot be empty when defining the underlying query of a data object relation.')
            //get model (the child model of relation mapping)
            var model = new DataModel(cfg.current.model(self.mapping.childModel));
            //get related model (the parent model of relation mapping)
            var relatedModel = new DataModel(cfg.current.model(self.mapping.parentModel));
            //get related model's adapter
            var relatedAdapter = relatedModel.viewAdapter;
            //query related adapter
            q = qry.query(relatedAdapter);
            //ensure context (based on data object ensure context)
            q.ensureContext = self.ensureContext;
            //select all fields
            q.select(relatedModel.attributeNames.map(function(x) {
                return qry.fields.select(x).from(relatedAdapter);
            }));
            //prepare query by selecting the foreign key of the related object
            q = qry.query(relatedAdapter).where(self.mapping.parentField).equal(self.parent[self.mapping.childField]).prepare();
            return q;
        }, configurable:false, enumerable:false
    });

    var m = null;
    //override model property
    Object.defineProperty(this, 'model', {
        get:function() {
            //if query is already defined
            if (m!=null)
            //return this query
                return m;
            m = new DataModel(cfg.current.model(self.mapping.parentModel));
            return m;
        }, configurable:false, enumerable:false
    });


}
util.inherits(DataObjectRelation, DataQueryable);
/**
 * @param {Function} callback
 */
DataObjectRelation.prototype.remove = function(callback) {
    var self = this;
    if (typeof self.mapping === 'object') {
        if (typeof self.parent === 'object') {
            self.parent[self.mapping.childField] = null;
            var ctx = self.ensureContext();
            self.parent.save(ctx, callback);
        }
        else
            callback(new Error('The target object cannot be empty at this context.'));
    }
    else
        callback(new Error('The relation mapping cannot be empty at this context.'));
};

DataObjectRelation.prototype.insert = function(obj, callback) {
    var self = this;
    if (typeof self.mapping === 'object') {
        if (typeof self.parent === 'object') {
            self.parent[self.mapping.childField] = obj[self.mapping.parentField];
            var ctx = self.ensureContext();
            self.parent.save(ctx, function(err) {
                callback(err);
            });
        }
        else
            callback(new Error('The target object cannot be empty at this context.'));
    }
    else
        callback(new Error('The relation mapping cannot be empty at this context.'));
};


if (typeof exports !== 'undefined')
{
    module.exports = {
        DataObjectRelation:DataObjectRelation
    };
}