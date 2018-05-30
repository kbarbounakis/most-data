/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2018-01-08.
 *
 * Copyright (c) 2014-2018, Kyriakos Barbounakis k.barbounakis@gmail.com
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
var ODataModelBuilder = require("./odata");
var Q = require('q');
var _ = require('lodash');
var DataNotFoundException = require('./types').DataNotFoundException;
var parseBoolean = require('./types').parsers.parseBoolean;
/**
 * @class
 * @param {DataContext|*} context
 * @constructor
 */
function DataService(context) {

    /**
     * @property {DataContext}
     * @description An instance of DataContext class associated with this object.
     * @name DataService#context
     */
    Object.defineProperty(this,'context', {
       get: function() {
           return context;
       }
    });
}

/**
 * @returns {ODataModelBuilder}
 */
DataService.prototype.getBuilder = function() {
    return this.context.getApplication().service(ODataModelBuilder)();
};
/**
 * @returns {Promise<XDocument>}
 */
DataService.prototype.getMetadata = function() {
    return this.getBuilder().getEdmDocument().then(function (result) {
        return Q.resolve(result.outerXML());
    });
};

DataService.prototype.getIndex = function() {
    var self = this;
    return this.getBuilder().getEdm().then(function (result) {
        return Q.resolve({
            "@odata.context": self.getBuilder().getContextLink(self.context),
            value:result.entityContainer.entitySet
        });
    });
};

DataService.prototype.getIndex = function() {
    var self = this;
    return this.getBuilder().getEdm().then(function (result) {
        return Q.resolve({
            "@odata.context": self.getBuilder().getContextLink(self.context),
            value:result.entityContainer.entitySet
        });
    });
};

DataService.prototype.getItems = function(entitySet, params) {
    var self = this;
    var context = self.context;
    try {
        //get entity set
        var thisEntitySet = this.getBuilder().getEntitySet(entitySet);
        if (_.isNil(thisEntitySet)) {
            return Q.reject(new DataNotFoundException("EntitySet not found"));
        }
        /**
         * @type {DataModel}
         */
        var model = context.model(thisEntitySet.entityType.name);
        if (_.isNil(model)) {
            return Q.reject(new DataNotFoundException("Entity not found"));
        }
        //parse query filter and return a DataQueryable
        return Q.nbind(model.filter,model)(params).then(function(query) {
            var count = parseBoolean(params['$count']);
            if (count) {
                //get items with count
                return query.getList().then(function(result) {
                    //and finally return json result
                    return Q.resolve(thisEntitySet.mapInstanceSet(context,result));
                });
            }
            else {
                //get items
                return query.getItems().then(function(result) {
                    //and finally return json result
                    return Q.resolve(thisEntitySet.mapInstanceSet(context,result));
                });
            }
        });
    }
    catch (err) {
        return Q.reject(err);
    }
};


if (typeof exports !== 'undefined') {
    module.exports.DataService = DataService;
}
