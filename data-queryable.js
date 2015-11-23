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
var async=require('async'),
    util = require('util'),
    dataCommon = require('./data-common'),
    types = require('./types'),
    cfg = require('./data-configuration'),
    qry = require('most-query'),
    DataAssociationMapping = types.DataAssociationMapping,
    Q = require('q');

function DataAttributeResolver() {

}

DataAttributeResolver.prototype.orderByNestedAttribute = function(attr) {
    return DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr);
};

DataAttributeResolver.prototype.selecteNestedAttribute = function(attr, alias) {
    var expr = DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr);
    if (expr) {
        if (typeof alias === 'undefined' || alias == null)
            expr.as(attr.replace(/\//g,'_'));
        else
            expr.as(alias)
    }
    return expr;
};

DataAttributeResolver.prototype.resolveNestedAttribute = function(attr) {
    var self = this;
    if (typeof attr === 'string' && /\//.test(attr)) {
        var expr = DataAttributeResolver.prototype.resolveNestedAttributeJoin.call(this.model, attr), arr, obj;
        if (expr) {
            if (typeof this.query.$expand === 'undefined' || null) {
                this.query.$expand = expr;
            }
            else {
                arr = [];
                if (!util.isArray(self.query.$expand)) {
                    arr.push(self.query.$expand);
                    this.query.$expand = arr;
                }
                arr = [];
                if (util.isArray(expr))
                    arr.push.apply(arr, expr);
                else
                    arr.push(expr);
                arr.forEach(function(y) {
                    obj = self.query.$expand.find(function(x) {
                        if (x.$entity && x.$entity.$as) {
                                return (x.$entity.$as === y.$entity.$as);
                            }
                        return false;
                    });
                    if (typeof obj === 'undefined')
                        self.query.$expand.push(y);
                });
            }
            //add field
            var member = attr.split('/');
            if (member.length>2) {
                return qry.fields.select(member[2]).from(member[1]);
            }
            return qry.fields.select(member[1]).from(member[0]);
        }
        else {
            throw new Error('Member join expression cannot be empty at this context');
        }
    }
};


/**
 *
 * @param {string} memberExpr - A string that represents a member expression e.g. user/id or article/published etc.
 * @returns {*} - An object that represents a query join expression
 */
DataAttributeResolver.prototype.resolveNestedAttributeJoin = function(memberExpr) {
    var self = this;
    if (/\//.test(memberExpr)) {
        //if the specified member contains '/' e.g. user/name then prepare join
        var arrMember = memberExpr.split('/');
        var attrMember = self.field(arrMember[0]);
        if (dataCommon.isNullOrUndefined(attrMember)) {
            throw new Error(util.format('The target model does not have an attribute named as %s',arrMember[0]));
        }
        //search for field mapping
        var mapping = self.inferMapping(arrMember[0]);
        if (dataCommon.isNullOrUndefined(mapping)) {
            throw new Error(util.format('The target model does not have an association defined for attribute named %s',arrMember[0]));
        }
        if (mapping.childModel===self.name && mapping.associationType==='association') {
            //get parent model
            var parentModel = self.context.model(mapping.parentModel);
            if (dataCommon.isNullOrUndefined(parentModel)) {
                throw new Error(util.format('Association parent model (%s) cannot be found.', mapping.parentModel));
            }
            /**
             * store temp query expression
             * @type QueryExpression
             */
            var res =qry.query(self.viewAdapter).select(['*']);
            var expr = qry.query().where(qry.fields.select(mapping.childField).from(self._alias || self.viewAdapter)).equal(qry.fields.select(mapping.parentField).from(mapping.childField));
            var entity = qry.entity(parentModel.viewAdapter).as(mapping.childField).left();
            res.join(entity).with(expr);
            if (arrMember.length>2) {
                parentModel._alias = mapping.childField;
                var expr = DataAttributeResolver.prototype.resolveNestedAttributeJoin.call(parentModel, arrMember[1] + '/' + arrMember[2]);
                var arr = [];
                arr.push(res.$expand);
                arr.push(expr);
                return arr;
            }
            return res.$expand;
        }
        else if (mapping.parentModel===self.name && mapping.associationType==='association') {
            var childModel = self.context.model(mapping.childModel);
            if (dataCommon.isNullOrUndefined(childModel)) {
                throw new Error(util.format('Association child model (%s) cannot be found.', mapping.childModel));
            }
            var res =qry.query('Unknown').select(['*']);
            var expr = qry.query().where(qry.fields.select(mapping.parentField).from(self.viewAdapter)).equal(qry.fields.select(mapping.childField).from(arrMember[0]));
            var entity = qry.entity(childModel.viewAdapter).as(arrMember[0]).left();
            res.join(entity).with(expr);
            return res.$expand;
        }
        else {
            throw new Error(util.format('The association type between %s and %s model is not supported for filtering, grouping or sorting data.', mapping.parentModel , mapping.childModel));
        }
    }
};

/**
 * @param {string} s
 * @returns {*}
 */
DataAttributeResolver.prototype.testAttribute = function(s) {
    if (typeof s !== 'string')
        return;
    var matches;
    /**
     * attribute aggregate function with alias e.g. f(x) as a
     */
    matches = /^(\w+)\((\w+)\)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + ')' , property:matches[3] };
    }
    /**
     * attribute aggregate function with alias e.g. x as a
     */
    matches = /^(\w+)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] , property:matches[2] };
    }
    /**
     * attribute aggregate function with alias e.g. f(x)
     */
    matches = /^(\w+)\((\w+)\)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + ')' };
    }
    // only attribute e.g. x
    if (/^(\w+)$/.test(s)) {
        return { name: s};
    }
};

/**
 * @param {string} s
 * @returns {*}
 */
DataAttributeResolver.prototype.testNestedAttribute = function(s) {
    if (typeof s !== 'string')
        return;
    var matches;
    /**
     * nested attribute aggregate function with alias e.g. f(x/b) as a
     */
    matches = /^(\w+)\((\w+)\/(\w+)\)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + '/' + matches[3]  + ')', property:matches[4] };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b/c) as a
     */
    matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + '/' + matches[3] + '/' + matches[4]  + ')', property:matches[5] };
    }
    /**
     * nested attribute with alias e.g. x/b as a
     */
    matches = /^(\w+)\/(\w+)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '/' + matches[2], property:matches[3] };
    }
    /**
     * nested attribute with alias e.g. x/b/c as a
     */
    matches = /^(\w+)\/(\w+)\/(\w+)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '/' + matches[2] + '/' + matches[3], property:matches[4] };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b)
     */
    matches = /^(\w+)\((\w+)\/(\w+)\)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + '/' + matches[3]  + ')' };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b/c)
     */
    matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '('  + matches[2] + '/' + matches[3] + '/' + matches[4]  +  + ')' };
    }
    /**
     * nested attribute with alias e.g. x/b
     */
    matches = /^(\w+)\/(\w+)$/.exec(s);
    if (matches) {
        return { name: s };
    }

    /**
     * nested attribute with alias e.g. x/b/c
     */
    matches = /^(\w+)\/(\w+)\/(\w+)$/.exec(s);
    if (matches) {
        return { name: s };
    }

};


/**
 * @class DataQueryable
 * @property {QueryExpression|*} query - Gets or sets the query expression
 * @property {DataModel|*} model - Gets or sets the underlying data model
 * @constructor
 * @param model {DataModel|*}
 * @augments DataContextEmitter
 */
function DataQueryable(model) {
    /**
     * @type {QueryExpression}
     * @private
     */
    var q = null;
    /**
     * @type {QueryExpression}
     */
    this.query = undefined;
    /**
     * Gets or sets an array of expandable models
     * @type {Array}
     * @private
     */
    this.$expand = undefined;
    /**
     * @type {Boolean}
     * @private
     */
    this.$flatten = undefined;
    /**
     * @type {DataModel}
     * @private
     */
    var m = model;
    /**
     * @type {DataModel}
     */
    this.model = undefined;
    Object.defineProperty(this, 'query', { get: function() {
        if (!q) {
            if (!m) {
                return null;
            }
            q = qry.query(m.viewAdapter);
        }
        return q;
    }, configurable:false, enumerable:false});

    Object.defineProperty(this, 'model', { get: function() {
        return m;
    }, configurable:false, enumerable:false});
    //get silent property
    if (m)
        this.silent(m.$silent);
}
/**
 * @returns DataQueryable
 */
DataQueryable.prototype.clone = function() {
    var result = new DataQueryable(this.model);
    //set view if any
    result.$view = this.$view;
    //set query
    util._extend(result.query, this.query);
    return result;
};

/**
 * Ensures data queryable context and returns the current data context. This function may be overriden.
 * @returns {DataContext}
 */
DataQueryable.prototype.ensureContext = function() {
    if (this.model!=null)
        if (this.model.context!=null)
            return this.model.context;
    return null;
};

/**
 * Prepares the underlying query
 * @param {Boolean=} useOr - Indicates whether a or statement will be used in the resulted statement.
 * @returns {DataQueryable}
 */
DataQueryable.prototype.prepare = function(useOr) {
    this.query.prepare(useOr);
    return this;
};

/**
 *
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.where = function(attr) {
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.where(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr));
        return this;
    }
    this.query.where(this.fieldOf(attr));
    return this;
};

DataQueryable.prototype.join = function(model)
{
    var self = this;
    if (typeof model === 'undefined' || model == null)
        return this;
    /**
     * @type {DataModel}
     */
    var joinModel = self.model.context.model(model);
    //validate joined model
    if (typeof joinModel === 'undefined' || joinModel == null)
        throw new Error(util.format("The %s model cannot be found", model));
    var arr = self.model.attributes.filter(function(x) { return x.type==joinModel.name; });
    if (arr.length==0)
        throw new Error(util.format("An internal error occured. The association between %s and %s cannot be found", this.model.name ,model));
    var mapping = self.model.inferMapping(arr[0].name);
    var expr = qry.query();
    expr.where(self.fieldOf(mapping.childField)).equal(joinModel.fieldOf(mapping.parentField));
    /**
     * @type DataAssociationMapping
     */
    var entity = qry.entity(joinModel.viewAdapter).left();
    //set join entity (without alias and join type)
    self.select().query.join(entity).with(expr);
    return self;
};


/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.and = function(attr) {
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.and(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr));
        return this;
    }
    this.query.and(this.fieldOf(attr));
    return this;
};
/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.or = function(attr) {
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.or(DataAttributeResolver.prototype.resolveNestedAttribute.call(this, attr));
        return this;
    }
    this.query.or(this.fieldOf(attr));
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.equal = function(obj) {
    this.query.equal(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.is = DataQueryable.prototype.equal;

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.notEqual = function(obj) {
    this.query.notEqual(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.greaterThan = function(obj) {
    this.query.greaterThan(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.greaterOrEqual = function(obj) {
    this.query.greaterOrEqual(obj);
    return this;
};

/**
 * @param {*} value The value to be compared
 * @param {Number=} result The result of a bitwise and expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.bit = function(value, result) {
    if (typeof result === 'undefined' || result == null)
        this.query.bit(value, value);
    else
        this.query.bit(value, result);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.lowerThan = function(obj) {
    this.query.lowerThan(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.lowerOrEqual = function(obj) {
    this.query.lowerOrEqual(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.startsWith = function(obj) {
    this.query.startsWith(obj);
    return this;
};

/**
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.endsWith = function(obj) {
    this.query.endsWith(obj);
    return this;
};


/**
 * @param objs {Array}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.in = function(objs) {
    this.query.in(objs);
    return this;
};

/**
 * @param objs {Array}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.notIn = function(objs) {
    this.query.notIn(objs);
    return this;
};

/**
 * @param {*} obj The value to be compared
 * @param {Number} result The result of modulo expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.mod = function(obj, result) {
    this.query.mod(obj, result);
    return this;
};

/**
 * @param value {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.contains = function(value) {
    this.query.contains(value);
    return this;
};

/**
 * @param value {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.notContains = function(value) {
    this.query.notContains(value);
    return this;
};

/**
 * @param {*} value1
 * @param {*} value2
 * @returns {DataQueryable}
 */
DataQueryable.prototype.between = function(value1, value2) {
    this.query.between(value1, value2);
    return this;
};


/**
 * @param {*=} attr  An array of fields, a field or a view name
 * @returns {DataQueryable}
 */
DataQueryable.prototype.select = function(attr) {

    var self = this, arr, expr,
        arg = (arguments.length>1) ? Array.prototype.slice.call(arguments): attr;

    if (typeof arg === 'string') {
        //validate field or model view
        var field = self.model.field(arg);
        if (field) {
            //validate field
            if (field.many || (field.mapping && field.mapping.associationType === 'junction')) {
                self.expand(field.name);
            }
            else {
                arr = [];
                arr.push(self.fieldOf(field.name));
            }
        }
        else {
            //get data view
            self.$view  = self.model.dataviews(arg);
            //if data view was found
            if (self.$view) {
                arr = [];
                var name;
                self.$view.fields.forEach(function(x) {
                    name = x.name;
                    field = self.model.field(name);
                    //if a field with the given name exists in target model
                    if (field) {
                        //check if this field has an association mapping
                        if (field.many || (field.mapping && field.mapping.associationType === 'junction'))
                            self.expand(field.name);
                        else
                            arr.push(self.fieldOf(field.name));
                    }
                    else {
                        var b = DataAttributeResolver.prototype.testNestedAttribute.call(self,name);
                        if (b) {
                            expr = DataAttributeResolver.prototype.selecteNestedAttribute.call(self, b.name, x.property);
                            if (expr) { arr.push(expr); }
                        }
                        else {
                            b = DataAttributeResolver.prototype.testAttribute.call(self,name);
                            if (b) {
                                arr.push(self.fieldOf(b.name, x.property));
                            }
                            else if (/\./g.test(name)) {
                                name = name.split('.')[0];
                                arr.push(self.fieldOf(name));
                            }
                            else
                            {
                                arr.push(self.fieldOf(name));
                            }
                        }
                    }
                });
            }
            //select a field from a joined entity
            else if (/\//.test(arg)) {
                arr = arr || [];
                expr = DataAttributeResolver.prototype.selecteNestedAttribute.call(self, arg);
                if (expr) { arr.push(expr); }
            }
        }
        if (util.isArray(arr)) {
            if (arr.length==0)
                arr = null;
        }
    }
    else {
        //get array of attributes
        if (util.isArray(arg)) {
            arr = [];
            //check if field is a model dataview
            if (arg.length == 1 && typeof arg[0] === 'string') {
                if (self.model.dataviews(arg[0])) {
                    return self.select(arg[0]);
                }
            }
            arg.forEach(function(x) {
                if (typeof x === 'string') {
                    field = self.model.field(x);
                    if (field) {
                        if (field.many || (field.mapping && field.mapping.associationType === 'junction'))
                            self.expand(field.name);
                        else
                            arr.push(self.fieldOf(field.name));
                    }
                    //test nested attribute and simple attribute expression
                    else {

                        var a = DataAttributeResolver.prototype.testNestedAttribute.call(self,x);
                        if (a) {
                            expr = DataAttributeResolver.prototype.selecteNestedAttribute.call(self, a.name, a.property);
                            if (expr) { arr.push(expr); }
                        }
                        else {
                            a = DataAttributeResolver.prototype.testAttribute.call(self,x);
                            if (a) {
                                arr.push(self.fieldOf(a.name, a.property));
                            }
                            else {
                                arr.push(self.fieldOf(x));
                            }
                        }
                    }
                }
                else {
                    //validate if x is an object (QueryField)
                    arr.push(x);
                }

            });
        }
    }
    if (typeof arr === 'undefined' || arr == null) {
        if (!self.query.hasFields()) {
            //enumerate fields
            var fields = self.model.attributes.filter(function(x) {
                return !(x.many || (x.mapping && x.mapping.associationType === 'junction'));
            }).map(function(x) {
                var f = qry.fields.select(x.name).from(self.model.viewAdapter);
                if (x.property)
                    f.as(x.property);
                return f;
            });
            //and select fields
            self.select(fields);
        }
    }
    else {
        self.query.select(arr);
    }

    return this;
};
/**
 * Adds a field or an array of fields to select statement
 * @param {String|Array|DataField|*} attr
 * @return {DataQueryable}
 */
DataQueryable.prototype.alsoSelect = function(attr) {
    var self = this;
    if (!self.query.hasFields()) {
        return self.select(attr);
    }
    else {
        if (typeof attr === 'undefined' || attr === null)
            return self;
        var arr = [];
        if (typeof attr === 'string') {
            arr.push(attr);
        }
        else if (util.isArray(attr)) {
            arr = attr.slice(0);
        }
        else if (typeof attr === 'object') {
            arr.push(attr);
        }
        var $select = self.query.$select;
        arr.forEach(function(x) {
            var field = self.fieldOf(x);
            if (util.isArray($select[self.model.viewAdapter]))
                $select[self.model.viewAdapter].push(field);

        });
        return self;
    }
};

DataQueryable.prototype.dateOf = function(attr) {
    if (typeof attr ==='undefined' || attr === null)
        return attr;
    if (typeof attr !=='string')
        return attr;
    return this.fieldOf('date(' + attr + ')');
};

/**
 * @param attr {string|*}
 * @param alias {string=}
 * @returns {DataQueryable|QueryField|*}
 */
DataQueryable.prototype.fieldOf = function(attr, alias) {

    if (typeof attr ==='undefined' || attr === null)
        return attr;
    if (typeof attr !=='string')
        return attr;
    var matches = /(count|avg|sum|min|max)\((.*?)\)/i.exec(attr), res, field, aggr, prop;
    if (matches) {
        //get field
        field = this.model.field(matches[2]);
        //get aggregate function
        aggr = matches[1];
        if (typeof  field === 'undefined' || field === null)
            throw new Error(util.format('The specified field %s cannot be found in target model.', matches[2]));
        if (typeof alias === 'undefined' || alias == null) {
            matches = /as\s(\w+)$/i.exec(attr);
            if (matches) {
                alias = matches[1];
            }
            else {
                alias = aggr.concat('Of', field.name);
            }
        }
        if (aggr=='count')
            return qry.fields.count(field.name).from(this.model.viewAdapter).as(alias);
        else if (aggr=='avg')
            return qry.fields.average(field.name).from(this.model.viewAdapter).as(alias);
        else if (aggr=='sum')
            return qry.fields.sum(field.name).from(this.model.viewAdapter).as(alias);
        else if (aggr=='min')
            return qry.fields.min(field.name).from(this.model.viewAdapter).as(alias);
        else if (aggr=='max')
            return qry.fields.max(field.name).from(this.model.viewAdapter).as(alias);
    }
    else {
        matches = /(\w+)\((.*?)\)/i.exec(attr);
        if (matches) {
            res = { };
            field = this.model.field(matches[2]);
            aggr = matches[1];
            if (typeof  field === 'undefined' || field === null)
                throw new Error(util.format('The specified field %s cannot be found in target model.', matches[2]));
            if (typeof alias === 'undefined' || alias == null) {
                matches = /as\s(\w+)$/i.exec(attr);
                if (matches) {
                    alias = matches[1];
                }
            }
            prop = alias || field.property || field.name;
            res[prop] = { }; res[prop]['$' + aggr] = [ qry.fields.select(field.name).from(this.model.viewAdapter) ];
            return res;
        }
        else {
            //matche expression [field] as [alias] e.g. itemType as type
            matches = /^(\w+)\s+as\s+(.*?)$/i.exec(attr);
            if (matches) {
                field = this.model.field(matches[1]);
                if (typeof  field === 'undefined' || field === null)
                    throw new Error(util.format('The specified field %s cannot be found in target model.', attr));
                alias = matches[2];
                prop = alias || field.property || field.name;
                return qry.fields.select(field.name).from(this.model.viewAdapter).as(prop);
            }
            else {
                //try to match field with expression [field] as [alias] or [nested]/[field] as [alias]
                field = this.model.field(attr);
                if (typeof  field === 'undefined' || field === null)
                    throw new Error(util.format('The specified field %s cannot be found in target model.', attr));
                var f = qry.fields.select(field.name).from(this.model.viewAdapter);
                if (field.property)
                    return f.as(field.property);
                return f;
            }
        }
    }
    return this;
};

/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.orderBy = function(attr) {
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.orderBy(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
        return this;
    }
    this.query.orderBy(this.fieldOf(attr));
    return this;
};

/**
 * @param attr {string|Array}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.groupBy = function(attr) {
    var arr = [];
    if (util.isArray(attr)) {
        for (var i = 0; i < attr.length; i++) {
            var x = attr[i];
            if (/\//.test(x)) {
                //nested group by
                arr.push(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, x));
            }
            else {
                arr.push(this.fieldOf(x));
            }
        }
    }
    else {
        if (/\//.test(attr)) {
            //nested group by
            arr.push(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
        }
        else {
            arr.push(this.fieldOf(attr));
        }
    }
    if (arr.length>0) {
        this.query.groupBy(arr);
    }
    return this;
};

/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.thenBy = function(attr) {
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.thenBy(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
        return this;
    }
    this.query.thenBy(this.fieldOf(attr));
    return this;
};

/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.orderByDescending = function(attr) {
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.orderByDescending(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
        return this;
    }
    this.query.orderByDescending(this.fieldOf(attr));
    return this;
};

/**
 * @param attr {string}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.thenByDescending = function(attr) {
    if (typeof attr === 'string' && /\//.test(attr)) {
        this.query.thenByDescending(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, attr));
        return this;
    }
    this.query.thenByDescending(this.fieldOf(attr));
    return this;
};

/**
 * Executes the specified query against the underlying model and returns the first object.
 * @param {Function=} callback
 * @returns {Deferred|*}
 */
DataQueryable.prototype.first = function(callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        firstInternal.call(this, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return firstInternal.call(this, callback);
    }
};
/**
 * @private
 * @param {function(Error=,*=)} callback
 */
function firstInternal(callback) {
    var self = this;
    callback = callback || function() {};
    self.skip(0).take(1, function(err, result) {
        if (err) {
            callback(err);
        }
        else {
            if (result.length>0)
                callback(null, result[0]);
            else
                callback(null);
        }
    });
}


/**
 * @param {function(Error=,Array=)=} callback
 * @returns {Deferred|*} - If callback function is missing returns a promise.
 */
DataQueryable.prototype.all = function(callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        allInternal.call(this, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        allInternal.call(this, callback);
    }
};

/**
 * @private
 * @param {Function} callback
 */
function allInternal(callback) {
    var self = this;
    //remove skip and take
    delete this.query.$skip;
    delete this.query.$take;
    //validate already selected fields
    if (!self.query.hasFields()) {
        self.select();
    }
    callback = callback || function() {};
    //execute select
    self.execute(callback);
}

/**
 * @param n {number}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.skip = function(n) {
    this.query.$skip = n;
    return this;
};

/**
 * @private
 * @param {Number} n - Defines the number of items to take
 * @param {function=} callback
 * @returns {*} - A collection of objects that meet the query provided
 */
function takeInternal(n, callback) {
    var self = this;
    self.query.take(n);
    callback = callback || function() {};
    //validate already selected fields
    if (!self.query.hasFields()) {
        self.select();
    }
    //execute select
    self.execute(callback);
}

/**
 * @param {Number} n - Defines the number of items to take
 * @param {Function=} callback
 * @returns {DataQueryable|*} - If callback function is missing returns a promise.
 */
DataQueryable.prototype.take = function(n, callback) {
    if (typeof callback !== 'function') {
        this.query.take(n);
        return this;
    }
    else {
        takeInternal.call(this, n, callback);
    }
};
/**
 * Executes current query and returns a result set based on the specified paging parameters.
 * @param {function(Error=,DataResultSet=)=} callback - A callback function with arguments (err, result) where the first argument is the error, if any
 * and the second argument is an object that represents a result set
 * @returns {Deferred|*} - If callback is missing returns a promise.
 */
DataQueryable.prototype.list = function(callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        listInternal.call(this, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return listInternal.call(this, callback);
    }
};
/**
 * @private
 * @param {Function} callback
 */
function listInternal(callback) {
    var self = this;
    try {
        callback = callback || function() {};
        //ensure take attribute
        var take = self.query.$take || 25;
        //ensure that fields are already selected (or select all)
        self.select();
        //clone object
        var q1 = self.clone();
        //take objects
        self.take(take, function(err, result)
        {
            if (err) {
                callback(err);
            }
            else {
                // get count of records
                q1.count(function(err, total) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        //and finally create result set
                        var res = { total: total, records: (result || []) };
                        callback(null, res);
                    }
                });
            }
        });
    }
    catch(e) {
        callback(e);
    }
}

/**
 * @param {string} name
 * @param {string=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.countOf = function(name, alias) {
    alias = alias || 'countOf'.concat(name);
    var res = this.fieldOf(util.format('count(%s)', name));
    if (typeof alias !== 'undefined' && alias!=null)
        res.as(alias);
    return res;
};
/**
 * @param {string} name
 * @param {string=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.maxOf = function(name, alias) {
    alias = alias || 'maxOf'.concat(name);
    var res = this.fieldOf(util.format('max(%s)', name));
    if (typeof alias !== 'undefined' && alias!=null)
        res.as(alias);
    return res;
};
/**
 * @param {string} name
 * @param {string=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.minOf = function(name, alias) {
    alias = alias || 'minOf'.concat(name);
    var res = this.fieldOf(util.format('min(%s)', name));
    if (typeof alias !== 'undefined' && alias!=null)
        res.as(alias);
    return res;
};
/**
 * @param {string} name
 * @param {string=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.averageOf = function(name, alias) {
    alias = alias || 'avgOf'.concat(name);
    var res = this.fieldOf(util.format('avg(%s)', name));
    if (typeof alias !== 'undefined' && alias!=null)
        res.as(alias);
    return res;
};
/**
 * @param {string} name
 * @param {string=} alias
 * @returns {*|QueryField}
 */
DataQueryable.prototype.sumOf = function(name, alias) {
    alias = alias || 'sumOf'.concat(name);
    var res = this.fieldOf(util.format('sum(%s)', name));
    if (typeof alias !== 'undefined' && alias!=null)
        res.as(alias);
    return res;
};

/**
 * @private
 * Executes the underlying query statement and returns the count of object found.
 * @param callback {Function}
 * @returns {*} - A collection of objects that meet the query provided
 */
function countInternal(callback) {
    var self = this;
    callback = callback || function() {};
    //add a count expression
    var field = self.model.attributes[0];
    if (field==null)
        return callback.call(this, new Error('Queryable collection does not have any property.'));
    //normalize query and remove skip
    delete self.query.$skip;
    delete self.query.$take;
    delete self.query.$order;
    delete self.query.$group;
    //append count expression
    self.query.select([qry.fields.count(field.name).from(self.model.viewAdapter)]);
    //execute select
    self.execute(function(err, result) {
        if (err) { callback.call(self, err, result); return; }
        var value = null;
        if (util.isArray(result)) {
            //get first value
            if (result.length>0)
                value = result[0][field.name];
        }
        callback.call(self, err, value);
    });
}

/**
 * Executes the underlying query statement and returns the count of object found.
 * @param {Function=} callback
 * @returns {Deferred|*} - A collection of objects that meet the query provided
 */
DataQueryable.prototype.count = function(callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        countInternal.call(this, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return countInternal.call(this, callback);
    }
};

/**
 * @private
 * Executes the underlying query statement and returns the maximum value of the given attribute.
 * @param {string} attr
 * @param callback {Function}
 * @returns {*} Returns the maximum value of the given attribute
 */
function maxInternal(attr, callback) {
    var self = this;
    callback = callback || function() {};
    //add a count expression
    var field = self.model.field(attr);
    if (field==null) {
        callback.call(this, new Error('The specified attribute cannot be found.'));
        return;
    }
    //normalize query
    //1. remove skip
    delete self.query.$skip;
    //append count expression
    self.query.select([qry.fields.max(field.name)]);
    //execute select
    self.execute(function(err, result) {
        if (err) { callback.call(self, err, result); return; }
        var value = null;
        if (util.isArray(result)) {
            //get first value
            if (result.length>0)
                value = result[0][attr];
        }
        callback.call(self, err, value);
    });
}

/**
 * Executes the underlying query statement and returns the maximum value of the given attribute.
 * @param {string} attr
 * @param {Function=} callback
 * @returns {Deferred|*} Returns the maximum value of the given attribute
 */
DataQueryable.prototype.max = function(attr, callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        maxInternal.call(this, attr, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return maxInternal.call(this, attr, callback);
    }
};

/**
 * @private
 * Executes the underlying query statement and returns the minimum value of the given attribute.
 * @param attr {String}
 * @param callback {Function}
 * @returns {*} Returns the maximum value of the given attribute
 */
function minInternal(attr, callback) {
    var self = this;
    callback = callback || function() {};
    //add a count expression
    var field = self.model.field(attr);
    if (field==null) {
        callback.call(this, new Error('The specified attribute cannot be found.'));
        return;
    }
    //normalize query
    //1. remove skip
    delete self.query.$skip;
    //append count expression
    self.query.select([qry.fields.min(field.name)]);
    //execute select
    self.execute(function(err, result) {
        if (err) { callback.call(self, err, result); return; }
        var value = null;
        if (util.isArray(result)) {
            //get first value
            if (result.length>0)
                value = result[0][attr];
        }
        callback.call(self, err, value);
    });
}

/**
 * Executes the underlying query statement and returns the minimum value of the given attribute.
 * @param {String} attr
 * @param {Function=} callback
 * @returns {Deferred|*} Returns the maximum value of the given attribute
 */
DataQueryable.prototype.min = function(attr, callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        minInternal.call(this, attr, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return minInternal.call(this, attr, callback);
    }
};

/**
 * @private
 * @param {string} attr
 * @param {Function} callback
 * @returns {*} Returns the maximum value of the given attribute
 */
function averageInternal(attr, callback) {
    var self = this;
    callback = callback || function() {};
    //add a count expression
    var field = self.model.field(attr);
    if (field==null) {
        callback.call(this, new Error('The specified attribute cannot be found.'));
        return;
    }
    //normalize query
    //1. remove skip
    delete self.query.$skip;
    //append count expression
    self.query.select(qry.fields.average(field.name)).take(1, function(err, result) {
        if (err) { return callback(err); }
        if (dataCommon.isNullOrUndefined(result)) { return callback(); }
        if (result.length==0) { return callback(); }
        var key = Object.keys(result[0])[0];
        if (typeof key === 'undefined') { return callback(); }
        callback(null, result[0][key]);
    });
}

/**
 * Executes the underlying query statement and returns the average value of the given attribute.
 * @param {string} attr
 * @param {Function=} callback
 * @returns {Deferred|*} Returns the maximum value of the given attribute
 */
DataQueryable.prototype.average = function(attr, callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        averageInternal.call(this, attr, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return averageInternal.call(this, attr, callback);
    }
};
/**
 * @private
 */
DataQueryable.prototype.__executeCount = function(callback) {
    try {
        var self = this, context = self.ensureContext();
        var clonedQuery = self.query.clone();
        //delete properties
        delete clonedQuery.$skip;
        delete clonedQuery.$take;
        //add wildcard field
        clonedQuery.select([qry.fields.count('*')]);
        //execute count
        context.db.execute(clonedQuery, null, function(err, result) {
            if (err) {
                callback(err);
                return;
            }
            callback(err, result.length>0 ? result[0] : 0);
        });
    }
    catch (e) {
        callback(e);
    }

};

DataQueryable.prototype.migrate = function(callback) {
    var self = this;
    try {
        //ensure context
        self.ensureContext();
        if (self.model) {
            self.model.migrate(function(err) {
                callback(err);
            })
        }
        else {
            callback();
        }
    }
    catch (e) {
        callback(e);
    }

};

DataQueryable.prototype.postExecute = function(result, callback) {
    callback();
};

/**
 * Executes the underlying query statement.
 * @param {function(Error,*=)} callback
 * @private
 */
DataQueryable.prototype.execute = function(callback) {
    var self = this, context = self.ensureContext();
    self.migrate(function(err) {
        if (err) { callback(err); return; }
        var e = { model:self.model, query:self.query, type:'select' };
        if (!self.$flatten) {
            //get expandable fields
            var expandables = self.model.attributes.filter(function(x) { return x.expandable; });
            //get selected fields
            var selected = self.query.$select[self.model.viewAdapter];
            if (util.isArray(selected)) {
                //remove hidden fields
                var hiddens = self.model.attributes.filter(function(x) { return x.hidden; });
                if (hiddens.length>0) {
                    for (var i = 0; i < selected.length; i++) {
                        var x = selected[i];
                        var hiddenField = hiddens.find(function(y) {
                            var f = x instanceof qry.classes.QueryField ? x : new qry.classes.QueryField(x);
                            return f.name() == y.name;
                        });
                        if (hiddenField) {
                            selected.splice(i, 1);
                            i-=1;
                        }
                    }
                }
                //expand fields
                if (expandables.length>0) {
                    selected.forEach(function(x) {
                        //get field
                        var field = expandables.find(function(y) {
                            var f = x instanceof qry.classes.QueryField ? x : new qry.classes.QueryField(x);
                            return f.name() == y.name;
                        });
                        //add expandable models
                        if (field) {
                            var mapping = self.model.inferMapping(field.name);
                            if (mapping)
                                self.expand(mapping);
                        }
                    });
                }
            }
        }

        //merge view filter. if any
        if (self.$view) {
            self.model.filter({ $filter: self.$view.filter, $order:self.$view.order, $group:self.$view.group }, function(err, q) {
                if (err) {
                    if (err) { callback(err); }
                }
                else {
                    //prepare current filter
                    if (q.query.$prepared) {
                        if (e.query.$where)
                            e.query.prepare();
                        e.query.$where = q.query.$prepared;
                    }
                    if (q.query.$group)
                    //replace group fields
                        e.query.$group = q.query.$group;
                    //add order fields
                    if (q.query.$order) {
                        if (util.isArray(e.query.$order)) {
                            q.query.$order.forEach(function(x) { e.query.$order.push(x); });
                        }
                        else {
                            e.query.$order = q.query.$order;
                        }
                    }
                    //execute query
                    self.finalExecuteInternal(e, callback);
                }
            });
        }
        else {
            //execute query
            self.finalExecuteInternal(e, callback);
        }
    });
};

/**
 * @private
 * @param {*} e
 * @param {function(Error=,*=)} callback
 */
DataQueryable.prototype.finalExecuteInternal = function(e, callback) {
    var self = this, context = self.ensureContext();
    //pass data queryable to event
    e.emitter = this;
    var afterListenerCount = self.model.listeners('after.execute').length;
    self.model.emit('before.execute', e, function(err) {
        if (err) {
            callback(err);
        }
        else {
            //if command has been completed, do not execute the command against the underlying database
            if (typeof e['result'] !== 'undefined') {
                //call after execute
                var result = e['result'];
                self.afterExecute(result, function(err, result) {
                    if (err) { callback(err); return; }
                    if (afterListenerCount==0) { callback(null, result); return; }
                    //raise after execute event
                    self.model.emit('after.execute', e, function(err) {
                        if (err) { callback(err); return; }
                        callback(null, result);
                    });
                });
                return;
            }
            context.db.execute(e.query, null, function(err, result) {
                if (err) { callback(err); return; }
                self.afterExecute(result, function(err, result) {
                    if (err) { callback(err); return; }
                    if (afterListenerCount==0) { callback(null, result); return; }
                    //raise after execute event
                    e.result = result;
                    self.model.emit('after.execute', e, function(err) {
                        if (err) { callback(err); return; }
                        callback(null, result);
                    });
                });
            });
        }
    });
};

/**
 * @param {*} result
 * @param {Function} callback
 * @private
 */
DataQueryable.prototype.afterExecute = function(result, callback) {
    var self = this, field, parentField, junction;
    if (self.$expand) {
        //get distinct values
        var expands = self.$expand.distinct(function(x) { return x; });
        async.eachSeries(expands,function(expand, cb) {
            /**
             * get mapping
             * @type {DataAssociationMapping}
             */
            var mapping = null;
            if (expand instanceof DataAssociationMapping) {
                mapping = expand;
            }
            else {
                field = self.model.field(expand);
                if (typeof field === 'undefined')
                    field = self.model.attributes.find(function(x) { return x.type==expand });
                if (field) {
                    mapping = self.model.inferMapping(field.name);
                    if (mapping) { mapping.refersTo = mapping.refersTo || field.name; }
                }
            }
            if (mapping) {
                var associatedModel, values, keyField, arr, junction;
                if (mapping.associationType=='association' || mapping.associationType=='junction') {
                    //1. current model is the parent model and association type is association
                    if ((mapping.parentModel==self.model.name) && (mapping.associationType=='association') && (mapping.parentModel!=mapping.childModel)) {
                        associatedModel = self.model.context.model(mapping.childModel);
                        values=[];
                        keyField = mapping.parentField;
                        if (util.isArray(result)) {

                            iterator = function(x) { if (x[keyField]) { if (values.indexOf(x[keyField])==-1) { values.push(x[keyField]); } } };
                            result.forEach(iterator);
                        }
                        else {
                            if (result[keyField])
                                values.push(result[keyField]);
                        }
                        if (values.length==0) {
                            return cb(null);
                        }
                        else {
                            field = associatedModel.field(mapping.childField);
                            parentField = mapping.refersTo;
                            //search for view named summary
                            var qChilds = associatedModel.where(field.name).in(values).flatten().silent();
                            if (mapping.select) {
                                qChilds.select(mapping.select);
                            }
                            qChilds.all(function(err, childs) {
                                if (err) {
                                    return cb(err);
                                }
                                else {
                                    var key=null,
                                        attr = (field.property || field.name),
                                        selector = function(x) {
                                            return x[attr]==key;
                                        },
                                        iterator = function(x) {
                                            key =x[mapping.parentField];
                                            x[parentField] = childs.filter(selector);
                                        };
                                    if (util.isArray(result)) {
                                        result.forEach(iterator);
                                    }
                                    else {
                                        key =result[mapping.parentField];
                                        result[parentField] = childs.filter(selector);
                                    }
                                    return cb(null);
                                }
                            });
                        }
                    }
                    else if (mapping.childModel==self.model.name && mapping.associationType=='junction') {
                        //create a dummy object
                        var HasParentJunction = require('./has-parent-junction').HasParentJunction;
                        junction = new HasParentJunction(self.model.convert({}), mapping);
                        //ensure array of results
                        arr = util.isArray(result) ? result : [result];
                        //get array of key values (for childs)
                        values = arr.filter(function(x) { return (typeof x[mapping.childField]!=='undefined') && (x[mapping.childField]!=null); }).map(function(x) { return x[mapping.childField] });
                        //query junction model
                        junction.baseModel.where('valueId').in(values).silent().all(function(err, junctions) {
                            if (err) { return cb(err); }
                            //get array of parent key values
                            values = junctions.map(function(x) { return x['parentId'] });
                            //get parent model
                            var parentModel = self.model.context.model(mapping.parentModel);
                            //query parent with parent key values
                            var q = parentModel.where(mapping.parentField).in(values).flatten().silent();
                            //if selectable fields are defined
                            if (mapping.select)
                            //select these fields
                                q.select(mapping.select);
                            //and finally query parent
                            q.all(function(err, parents) {
                                if (err) { return cb(err); }
                                //if result contains only one item
                                if (arr.length == 1) {
                                    arr[0][field.name] = parents;
                                    return cb();
                                }
                                //otherwise loop result array
                                arr.forEach(function(x) {
                                    //get child (key value)
                                    var valueId = x[mapping.childField];
                                    //get parent(s)
                                    var p = junctions.filter(function(y) { return (y.valueId==valueId); }).map(function(r) { return r['parentId']; });
                                    //filter data and set property value (a filtered array of parent objects)
                                    x[field.name] = parents.filter(function(z) { return p.indexOf(z[mapping.parentField])>=0; });
                                });
                                return cb();
                            });
                        });
                    }
                    else if (mapping.parentModel==self.model.name && mapping.associationType=='junction') {
                        //create a dummy object
                        var DataObjectJunction = require('./data-object-junction').DataObjectJunction;
                        junction = new DataObjectJunction(self.model.convert({}), mapping);
                        //ensure array of results
                        arr = util.isArray(result) ? result : [result];
                        //get array of key values (for parents)
                        values = arr.filter(function(x) { return (typeof x[mapping.parentField]!=='undefined') && (x[mapping.parentField]!=null); }).map(function(x) { return x[mapping.parentField] });
                        //query junction model
                        junction.baseModel.where('parentId').in(values).flatten().silent().all(function(err, junctions) {
                            if (err) { cb(err); return; }
                            //get array of child key values
                            values = junctions.map(function(x) { return x['valueId'] });
                            //get child model
                            var childModel = self.model.context.model(mapping.childModel);
                            //query parent with parent key values
                            var q = childModel.where(mapping.childField).in(values).silent().flatten();
                            //if selectable fields are defined
                            if (mapping.select)
                            //select these fields
                                q.select(mapping.select);
                            //and finally query childs
                            q.all(function(err, childs) {
                                if (err) { return cb(err); }
                                //if result contains only one item
                                if (arr.length == 1) {
                                    arr[0][field.name] = childs;
                                    return cb();
                                }
                                //otherwise loop result array
                                arr.forEach(function(x) {
                                    //get parent (key value)
                                    var parentId = x[mapping.parentField];
                                    //get parent(s)
                                    var p = junctions.filter(function(y) { return (y.parentId==parentId); }).map(function(r) { return r['valueId']; });
                                    //filter data and set property value (a filtered array of parent objects)
                                    x[field.name] = childs.filter(function(z) { return p.indexOf(z[mapping.childField])>=0; });
                                });
                                return cb();
                            });
                        });
                    }
                    else {
                        /**
                         * @type {DataModel}
                         */
                        associatedModel = self.model.context.model(mapping.parentModel);
                        var keyAttr = self.model.field(mapping.childField);
                        values = [];
                        keyField = keyAttr.property || keyAttr.name;
                        if (util.isArray(result)) {
                            var iterator = function(x) { if (x[keyField]) { if (values.indexOf(x[keyField])==-1) { values.push(x[keyField]); } } };
                            result.forEach(iterator);
                        }
                        else {
                            if (result[keyField])
                                values.push(result[keyField]);
                        }
                        if (values.length==0) {
                            return cb();
                        }
                        else {
                            var childField = self.model.field(mapping.childField);
                            associatedModel.where(mapping.parentField).in(values).flatten().silent().select(mapping.select).all(function(err, parents) {
                                if (err) {
                                    return cb(err);
                                }
                                else {
                                    var key=null,
                                        selector = function(x) {
                                            return x[mapping.parentField]==key;
                                        },
                                        iterator = function(x) {
                                            key = x[keyField];
                                            if (childField.property && childField.property!==childField.name) {
                                                x[childField.property] = parents.filter(selector)[0];
                                                delete x[childField.name];
                                            }
                                            else
                                                x[childField.name] = parents.filter(selector)[0];
                                        };
                                    if (util.isArray(result)) {
                                        result.forEach(iterator);
                                    }
                                    else {
                                        key = result[keyField];
                                        if (childField.property && childField.property!==childField.name) {
                                            x[childField.property] = parents.filter(selector)[0];
                                            delete x[childField.name];
                                        }
                                        else
                                            result[childField.name] = parents.filter(selector)[0];
                                    }
                                    return cb(null);
                                }
                            });
                        }
                    }
                }
                else {
                    return cb(new Error("Not yet implemented"));
                }
            }
            else {
                console.log(util.format('Data assocication mapping (%s) for %s cannot be found or the association between these two models defined more than once.', expand, self.model.title));
                return cb(null);
            }
        }, function(err) {
            if (err) {
                callback(err);
            }
            else {
                toArrayCallback.call(self, result, callback);
            }
        });
    }
    else {
        toArrayCallback.call(self, result, callback);
    }
};

/**
 * @private
 * @param {Array|*} result
 * @param {Function} callback
 */
function toArrayCallback(result, callback) {
    try {
        var self = this;
        if (self.$asArray) {
            if (typeof self.query === 'undefined') {
                return callback(null, result);
            }
            var fields = self.query.fields();
            if (util.isArray(fields)==false) {
                return callback(null, result);
            }
            if (fields.length==1) {
                var arr = [];
                result.forEach(function(x) {
                    if (typeof x === 'undefined' || x==null)
                        return;
                    var key = Object.keys(x)[0];
                    if (x[key])
                        arr.push(x[key]);
                });
                return callback(null, arr);
            }
            else {
                return callback(null, result);
            }
        }
        else {
            return callback(null, result);
        }
    }
    catch (e) {
        return callback(e);
    }
}

/**
 * @param {Boolean=} value
 * @returns {DataQueryable}
 */
DataQueryable.prototype.silent = function(value) {
    /**
     * @type {boolean}
     * @private
     */
    this.$silent = false;
    if (typeof value === 'undefined') {
        this.$silent = true;
    }
    else {
        this.$silent = value;
    }
    return this;
};

/**
 * @returns {string}
 */
DataQueryable.prototype.toMD5 = function() {
    var q = { query:this.query };
    if (typeof this.$expand !== 'undefined') { q.$expand =this.$expand; }
    if (typeof this.$flatten!== 'undefined') { q.$flatten =this.$flatten; }
    if (typeof this.$silent!== 'undefined') { q.$silent =this.$silent; }
    if (typeof this.$asArray!== 'undefined') { q.$asArray =this.$asArray; }
    return dataCommon.md5(q);
};

/**
/**
 * @param {Boolean=} value
 * @returns {DataQueryable}
 */
DataQueryable.prototype.asArray = function(value) {
    /**
     * @type {boolean}
     * @private
     */
    this.$asArray = false;
    if (typeof value === 'undefined') {
        this.$asArray = true;
    }
    else {
        this.$asArray = value;
    }
    return this;
};
/**
 * @param {string=} name
 * @param {*=} value
 * @returns {DataQueryable|*}
 */
DataQueryable.prototype.data = function(name, value) {
    this.query.data = this.query.data || {};
    if (typeof name === 'undefined') {
        return this.query.data;
    }
    if (typeof value === 'undefined') {
        return this.query.data[name];
    }
    else {
        this.query.data[name] = value;
    }
    return this;
};
/**
 * @param {string=} value
 * @returns {string|DataQueryable}
 */
DataQueryable.prototype.title = function(value) {
    return this.data('title', value);
};
/**
 * @param {string=} value
 * @returns {string|DataQueryable}
 */
DataQueryable.prototype.cache = function(value) {
    return this.data('cache', value);
};

/**
 * Sets the expandable model or models.
 * @param {String|DataAssociationMapping|Array} model A string or object that represents a model or an array of models to be expanded.
 * @returns {DataQueryable}
 */
DataQueryable.prototype.expand = function(model) {
    var self = this;
    if (typeof model === 'undefined' || model===null) {
        delete self.$expand;
    }
    else {
        if (!util.isArray(this.$expand))
            self.$expand=[];
        if (util.isArray(model)) {

            model.forEach(function(x) { self.$expand.push(x); });
        }
        else {
            self.$expand.push(model);
        }
    }
    return self;
};
/**
 * @param {boolean=} value
 * @returns {DataQueryable}
 */
DataQueryable.prototype.flatten = function(value) {

    if (value || (typeof value==='undefined')) {
        //delete expandable data (if any)
        delete this.$expand;
        this.$flatten = true;
    }
    else {
        delete this.$flatten;
    }
    return this;
};
/**
 * @param {number|*} x
 * @returns {DataQueryable}
 */
DataQueryable.prototype.add = function(x) {
    this.query.add(x); return this;
};
/**
 * @param {number|*} x
 * @returns {DataQueryable}
 */
DataQueryable.prototype.subtract = function(x) {
    this.query.subtract(x); return this;
};

/**
 * @param {number} x
 * @returns {DataQueryable}
 */
DataQueryable.prototype.multiply = function(x) {
    this.query.multiply(x); return this;
};

/**
 * @param {number} x
 * @returns {DataQueryable}
 */
DataQueryable.prototype.divide = function(x) {
    this.query.divide(x); return this;
};

/**
 * @param {number=} n
 * @returns {DataQueryable}
 */
DataQueryable.prototype.round = function(n) {
    this.query.round(x); return this;
};
/**
 * @param {number} start
 * @param {number=} length
 * @returns {DataQueryable}
 */
DataQueryable.prototype.substr = function(start,length) {
    this.query.substr(start,length); return this;
};
/**
 * @param {string} s
 * @returns {DataQueryable}
 */
DataQueryable.prototype.indexOf = function(s) {
    this.query.indexOf(s); return this;
};
/**
 * @param {string} s
 * @returns {DataQueryable}
 */
DataQueryable.prototype.concat = function(s) {
    this.query.concat(s); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.trim = function() {
    this.query.trim(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.length = function() {
    this.query.length(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getDate = function() {
    this.query.getDate(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getYear = function() {
    this.query.getYear(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getMonth = function() {
    this.query.getMonth(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getDay = function() {
    this.query.getDay(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getHours = function() {
    this.query.getHours(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getMinutes = function() {
    this.query.getMinutes(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getSeconds = function() {
    this.query.getSeconds(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.floor = function() {
    this.query.floor(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.ceil = function() {
    this.query.ceil(); return this;
};

/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.toLocaleLowerCase = function() {
    this.query.toLocaleLowerCase(); return this;
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.toLowerCase = DataQueryable.prototype.toLocaleLowerCase;
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.toLocaleUpperCase = function() {
    this.query.toLocaleUpperCase(); return this;
};

/**
 * @private
 * Gets a single value after executing the specified query. In query does not have any fields
 * @param {Function} callback
 */
function valueInternal(callback) {
    if (dataCommon.isNullOrUndefined(this.query.$select)) {
        this.select(this.model.primaryKey);
    }
    firstInternal.call(this, function(err, result) {
        if (err) { return callback(err); }
        if (dataCommon.isNullOrUndefined(result)) { return callback(); }
        var key = Object.keys(result)[0];
        if (typeof key === 'undefined') { return callback(); }
        callback(null, result[key]);
    });
}

/**
 * Gets a single value after executing the specified query. In query does not have any fields
 * @param {Function=} callback
 */
DataQueryable.prototype.value = function(callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        valueInternal.call(this, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return valueInternal.call(this, callback);
    }
};
/**
 * @returns {DataQueryable}
 */
DataQueryable.prototype.toUpperCase = DataQueryable.prototype.toLocaleUpperCase;

if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @constructs DataQueryable
         */
        DataQueryable:DataQueryable,
        /**
         * @constructs DataAttributeResolver
         */
        DataAttributeResolver:DataAttributeResolver
    };
}
