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
var async=require('async'),
    util = require('util'),
    dataCommon = require('./data-common'),
    types = require('./types'),
    cfg = require('./data-configuration'),
    qry = require('most-query'),
    Q = require('q');

/**
 * @class
 * @constructor
 * @ignore
 */
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

DataAttributeResolver.prototype.selectAggregatedAttribute = function(aggr, attr) {
    var self=this, result;
    if (DataAttributeResolver.prototype.testNestedAttribute(attr)) {
        result = DataAttributeResolver.prototype.selecteNestedAttribute.call(self,attr);
    }
    else {
        result = self.fieldOf(attr);
    }
    var alias = result.as(), name = result.name(), expr;
    if (alias) {
        expr = result[alias];
        result[alias] = { };
        result[alias]['$' + aggr ] = expr;
    }
    else {
        expr = result.$name;
        result[name] = { };
        result[alias]['$' + aggr ] = expr;
        delete field.$name;
    }
    return result;
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
    /**
     * @private
     */
    var matches;
    /**
     * attribute aggregate function with alias e.g. f(x) as a
     * @ignore
     */
    matches = /^(\w+)\((\w+)\)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + ')' , property:matches[3] };
    }
    /**
     * attribute aggregate function with alias e.g. x as a
     * @ignore
     */
    matches = /^(\w+)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] , property:matches[2] };
    }
    /**
     * attribute aggregate function with alias e.g. f(x)
     * @ignore
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
    /**
     * @private
     */
    var matches;
    /**
     * nested attribute aggregate function with alias e.g. f(x/b) as a
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + '/' + matches[3]  + ')', property:matches[4] };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b/c) as a
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + '/' + matches[3] + '/' + matches[4]  + ')', property:matches[5] };
    }
    /**
     * nested attribute with alias e.g. x/b as a
     * @ignore
     */
    matches = /^(\w+)\/(\w+)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '/' + matches[2], property:matches[3] };
    }
    /**
     * nested attribute with alias e.g. x/b/c as a
     * @ignore
     */
    matches = /^(\w+)\/(\w+)\/(\w+)\sas\s(\w+)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '/' + matches[2] + '/' + matches[3], property:matches[4] };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b)
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '(' + matches[2] + '/' + matches[3]  + ')' };
    }
    /**
     * nested attribute aggregate function with alias e.g. f(x/b/c)
     * @ignore
     */
    matches = /^(\w+)\((\w+)\/(\w+)\/(\w+)\)$/i.exec(s);
    if (matches) {
        return { name: matches[1] + '('  + matches[2] + '/' + matches[3] + '/' + matches[4]  +  + ')' };
    }
    /**
     * nested attribute with alias e.g. x/b
     * @ignore
     */
    matches = /^(\w+)\/(\w+)$/.exec(s);
    if (matches) {
        return { name: s };
    }

    /**
     * nested attribute with alias e.g. x/b/c
     * @ignore
     */
    matches = /^(\w+)\/(\w+)\/(\w+)$/.exec(s);
    if (matches) {
        return { name: s };
    }

};


/**
 * @classdesc Represents a dynamic query helper for filtering, paging, grouping and sorting data associated with an instance of DataModel class.
 * @class
 * @property {QueryExpression|*} query - Gets or sets the current query expression
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
 * Clones the current DataQueryable instance.
 * @returns DataQueryable - The cloned object.
 */
DataQueryable.prototype.clone = function() {
    var result = new DataQueryable(this.model);
    //set view if any
    result.$view = this.$view;
    //set silent property
    result.$silent = this.$silent;
    //set flatten property
    result.$flatten = this.$flatten;
    //set expand property
    result.$expand = this.$expand;
    //set query
    util._extend(result.query, this.query);
    return result;
};

/**
 * Ensures data queryable context and returns the current data context. This function may be overriden.
 * @returns {DataContext}
 * @ignore
 */
DataQueryable.prototype.ensureContext = function() {
    if (this.model!=null)
        if (this.model.context!=null)
            return this.model.context;
    return null;
};

/**
 * Serializes the underlying query and clears current filter expression for further filter processing. This operation may be used in complex filtering.
 * @param {Boolean=} useOr - Indicates whether an or statement will be used in the resulted statement.
 * @returns {DataQueryable}
 * @example
 //retrieve a list of order
 context.model('Order')
 .where('orderStatus').equal(1).and('paymentMethod').equal(2)
 .prepare().where('orderStatus').equal(2).and('paymentMethod').equal(2)
 .prepare(true)
 //(((OrderData.orderStatus=1) AND (OrderData.paymentMethod=2)) OR ((OrderData.orderStatus=2) AND (OrderData.paymentMethod=2)))
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.prepare = function(useOr) {
    this.query.prepare(useOr);
    return this;
};

/**
 * Initializes a where expression
 * @param attr {string} - A string which represents the field name that is going to be used as the left operand of this expression
 * @returns {DataQueryable}
 * @example
 context.model('Person')
 .where('user/name').equal('user1@exampl.com')
 .select('description')
 .first().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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
 * Prepares a logical AND expression
 * @param attr {string} - The name of field that is going to be used in this expression
 * @returns {DataQueryable}
 * @example
 context.model('Order').where('customer').equal(298)
 .and('orderStatus').equal(1)
 .list().then(function(result) {
        //SQL: WHERE ((OrderData.customer=298) AND (OrderData.orderStatus=1)
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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
 * Prepares a logical OR expression
 * @param attr {string} - The name of field that is going to be used in this expression
 * @returns {DataQueryable}
 * @example
 //((OrderData.orderStatus=1) OR (OrderData.orderStatus=2)
 context.model('Order').where('orderStatus').equal(1)
 .or('orderStatus').equal(2)
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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
 * Performs an equality comparison.
 * @param obj {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders with order status equal to 1
 context.model('Order').where('orderStatus').equal(1)
 .list().then(function(result) {
        //WHERE (OrderData.orderStatus=1)
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.equal = function(obj) {
    this.query.equal(obj);
    return this;
};

/**
 * Performs an equality comparison.
 * @param obj {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve a person with id equal to 299
 context.model('Person').where('id').is(299)
 .first().then(function(result) {
        //WHERE (PersonData.id=299)
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.is = function(obj) {
    return this.equal(obj);
};

/**
 * Prepares a not equal comparison.
 * @param obj {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders with order status different than 1
 context.model('Order')
 .where('orderStatus').notEqual(1)
 .orderByDescending('orderDate')
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.notEqual = function(obj) {
    this.query.notEqual(obj);
    return this;
};

/**
 * Prepares a greater than comparison.
 * @param obj {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders where product price is greater than 800
 context.model('Order')
 .where('orderedItem/price').greaterThan(800)
 .orderByDescending('orderDate')
 .select('id','orderedItem/name as productName', 'orderedItem/price as productPrice', 'orderDate')
 .take(5)
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 id   productName                                   productPrice  orderDate
 ---  --------------------------------------------  ------------  -----------------------------
 304  Apple iMac (27-Inch, 2013 Version)            1336.27       2015-11-27 23:49:17.000+02:00
 322  Dell B1163w Mono Laser Multifunction Printer  842.86        2015-11-27 20:16:52.000+02:00
 167  Razer Blade (2013)                            1553.43       2015-11-27 04:17:08.000+02:00
 336  Apple iMac (27-Inch, 2013 Version)            1336.27       2015-11-26 07:25:35.000+02:00
 89   Nvidia GeForce GTX 650 Ti Boost               1625.49       2015-11-21 17:29:21.000+02:00
 */
DataQueryable.prototype.greaterThan = function(obj) {
    this.query.greaterThan(obj);
    return this;
};

/**
 * Prepares a greater than or equal comparison.
 * @param obj {*} The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders where product price is greater than or equal to 800
 context.model('Order')
 .where('orderedItem/price').greaterOrEqual(800)
 .orderByDescending('orderDate')
 .take(5)
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.greaterOrEqual = function(obj) {
    this.query.greaterOrEqual(obj);
    return this;
};

/**
 * Prepares a bitwise and comparison.
 * @param {*} value - The right operand of the express
 * @param {Number=} result - The result of a bitwise and expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of permissions for model Person and insert permission mask (2)
 context.model('Permission')
 //prepare bitwise AND (((PermissionData.mask & 2)=2)
 .where('mask').bit(2)
 .and('privilege').equal('Person')
 .and('parentPrivilege').equal(null)
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 *
 */
DataQueryable.prototype.bit = function(value, result) {
    if (typeof result === 'undefined' || result == null)
        this.query.bit(value, value);
    else
        this.query.bit(value, result);
    return this;
};

/**
 * Prepares a lower than comparison
 * @param obj {*}
 * @returns {DataQueryable}
 */
DataQueryable.prototype.lowerThan = function(obj) {
    this.query.lowerThan(obj);
    return this;
};

/**
 * Prepares a lower than or equal comparison.
 * @param obj {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve orders based on payment due date
 context.model('Order')
 .orderBy('paymentDue')
 .where('paymentDue').lowerOrEqual(moment().subtract('days',-7).toDate())
 .and('paymentDue').greaterThan(new Date())
 .take(10).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.lowerOrEqual = function(obj) {
    this.query.lowerOrEqual(obj);
    return this;
};

/**
 * Prepares an ends with comparison
 * @param obj {*} - The string to be searched for at the end of a field.
 * @returns {DataQueryable}
 * @example
 //retrieve people whose given name starts with 'D'
 context.model('Person')
 .where('givenName').startsWith('D')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 id   givenName  familyName
 ---  ---------  ----------
 257  Daisy      Lambert
 275  Dustin     Brooks
 333  Dakota     Gallagher
 */
DataQueryable.prototype.startsWith = function(obj) {
    this.query.startsWith(obj);
    return this;
};

/**
 * Prepares an ends with comparison
 * @param obj {*} - The string to be searched for at the end of a field.
 * @returns {DataQueryable}
 * @example
 //retrieve people whose given name ends with 'y'
 context.model('Person')
 .where('givenName').endsWith('y')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results
 id   givenName  familyName
 ---  ---------  ----------
 257  Daisy      Lambert
 287  Zachary    Field
 295  Anthony    Berry
 339  Brittney   Hunt
 341  Kimberly   Wheeler
 */
DataQueryable.prototype.endsWith = function(obj) {
    this.query.endsWith(obj);
    return this;
};

/**
 * Prepares a typical IN comparison.
 * @param objs {Array} - An array of values which represents the values to be used in expression
 * @returns {DataQueryable}
 * @example
 //retrieve orders with order status 1 or 2
 context.model('Order').where('orderStatus').in([1,2])
 .list().then(function(result) {
        //WHERE (OrderData.orderStatus IN (1, 2))
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.in = function(objs) {
    this.query.in(objs);
    return this;
};

/**
 * Prepares a typical NOT IN comparison.
 * @param objs {Array} - An array of values which represents the values to be used in expression
 * @returns {DataQueryable}
 * @example
 //retrieve orders with order status 1 or 2
 context.model('Order').where('orderStatus').notIn([1,2])
 .list().then(function(result) {
        //WHERE (NOT OrderData.orderStatus IN (1, 2))
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.notIn = function(objs) {
    this.query.notIn(objs);
    return this;
};

/**
 * Prepares a modular arithmetic operation
 * @param {*} obj The value to be compared
 * @param {Number} result The result of modular expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.mod = function(obj, result) {
    this.query.mod(obj, result);
    return this;
};

/**
 * Prepares a contains comparison (e.g. a string contains another string).
 * @param value {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve person where the given name contains
 context.model('Person').select(['id','givenName','familyName'])
 .where('givenName').contains('ex')
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //The result set of this example may be:
 id   givenName  familyName
 ---  ---------  ----------
 297  Alex       Miles
 353  Alexis     Rees
 */
DataQueryable.prototype.contains = function(value) {
    this.query.contains(value);
    return this;
};

/**
 * Prepares a not contains comparison (e.g. a string contains another string).
 * @param value {*} - The right operand of the expression
 * @returns {DataQueryable}
 * @example
 //retrieve persons where the given name not contains 'ar'
 context.model('Person').select(['id','givenName','familyName'])
 .where('givenName').notContains('ar')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //The result set of this example may be:
 id   givenName  familyName
 ---  ---------  ----------
 257  Daisy      Lambert
 259  Peter      French
 261  Kylie      Jordan
 263  Maxwell    Hall
 265  Christian  Marshall
 */
DataQueryable.prototype.notContains = function(value) {
    this.query.notContains(value);
    return this;
};

/**
 * Prepares a comparison where the left operand is between two values
 * @param {*} value1 - The minimum value
 * @param {*} value2 - The maximum value
 * @returns {DataQueryable}
 * @example
 //retrieve products where price is between 150 and 250
 context.model('Product')
 .where('price').between(150,250)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //The result set of this example may be:
 id   name                                        model   price
 ---  ------------------------------------------  ------  ------
 367  Asus Transformer Book T100                  HD2895  224.52
 380  Zotac Zbox Nano XS AD13 Plus                WC5547  228.05
 384  Apple iPad Air                              ZE6015  177.44
 401  Intel Core i7-4960X Extreme Edition         SM5853  194.61
 440  Bose SoundLink Bluetooth Mobile Speaker II  HS5288  155.27
 */
DataQueryable.prototype.between = function(value1, value2) {
    this.query.between(value1, value2);
    return this;
};

/**
 * Selects a field or a collection of fields of the current model.
 * @param {...string} attr  An array of fields, a field or a view name
 * @returns {DataQueryable}
 * @example
 //retrieve the last 5 orders
 context.model('Order').select('id','customer','orderDate','orderedItem')
 .orderBy('orderDate')
 .take(5).list().then(function(result) {
        console.table(result.records);
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 * @example
 //retrieve the last 5 orders by getting the associated customer name and product name
 context.model('Order').select('id','customer/description as customerName','orderDate','orderedItem/name as productName')
 .orderBy('orderDate')
 .take(5).list().then(function(result) {
        console.table(result.records);
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //The result set of this example may be:
 id   customerName         orderDate                      orderedItemName
 ---  -------------------  -----------------------------  ----------------------------------------------------
 46   Nicole Armstrong     2014-12-31 13:35:41.000+02:00  LaCie Blade Runner
 288  Cheyenne Hudson      2015-01-01 13:24:21.000+02:00  Canon Pixma MG5420 Wireless Photo All-in-One Printer
 139  Christian Whitehead  2015-01-01 23:21:24.000+02:00  Olympus OM-D E-M1
 3    Katelyn Kelly        2015-01-02 04:42:58.000+02:00  Kobo Aura
 59   Cheyenne Hudson      2015-01-02 10:47:53.000+02:00  Google Nexus 7 (2013)

 @example
 //retrieve the best customers by getting the associated customer name and a count of orders made by the customer
 context.model('Order').select('customer/description as customerName','count(id) as orderCount')
 .orderBy('count(id)')
 .groupBy('customer/description')
 .take(3).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //The result set of this example may be:
 customerName      orderCount
 ----------------  ----------
 Miranda Bird      19
 Alex Miles        16
 Isaiah Morton     16
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
 * @deprecated
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
 * Prepares an ascending sorting operation
 * @param {string} attr - The field name to use for sorting results
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
 * Prepares a group by expression
 * @param {...string} attr - A param array of string that represents the attributes which are going to be used in group by expression
 * @returns {DataQueryable}
 * @example
 //retrieve products with highest sales during last month
 context.model('Order')
 .select('orderedItem/model as productModel', 'orderedItem/name as productName','count(id) as orderCount')
 .where('orderDate').greaterOrEqual(moment().startOf('month').toDate())
 .groupBy('orderedItem')
 .orderByDescending('count(id)')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results
 productModel  productName                              orderCount
 ------------  ---------------------------------------  ----------
 SM5111        Brother MFC-J6920DW                      3
 FY8135        LaCie Blade Runner                       3
 HA6910        Apple iMac (27-Inch, 2013 Version)       2
 LD4238        Dell XPS 18                              2
 HR6205        Samsung Galaxy Note 10.1 (2014 Edition)  2
 */
DataQueryable.prototype.groupBy = function(attr) {
    var arr = [],
        arg = (arguments.length>1) ? Array.prototype.slice.call(arguments): attr;
    if (util.isArray(arg)) {
        for (var i = 0; i < arg.length; i++) {
            var x = arg[i];
            if (DataAttributeResolver.prototype.testNestedAttribute.call(this,x)) {
                //nested group by
                arr.push(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, x));
            }
            else {
                arr.push(this.fieldOf(x));
            }
        }
    }
    else {
        if (DataAttributeResolver.prototype.testNestedAttribute.call(this,arg)) {
            //nested group by
            arr.push(DataAttributeResolver.prototype.orderByNestedAttribute.call(this, arg));
        }
        else {
            arr.push(this.fieldOf(arg));
        }
    }
    if (arr.length>0) {
        this.query.groupBy(arr);
    }
    return this;
};

/**
 * Continues a ascending sorting operation
 * @param {string} attr - The field to use for sorting results
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
 * Prepares a descending sorting operation
 * @param {string} attr - The field name to use for sorting results
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
 * Continues a descending sorting operation
 * @param {string} - The field name to use for sorting results
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
 * Executes the specified query against the underlying model and returns the first item.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
 * @returns {Deferred|*}
 * @example
 //retrieve an order by id
 context.model('Order')
 .where('id').equal(302)
 .first().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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
    execute_.call(self, callback);
}

/**
 * Prepares a paging operation by skipping the specified number of records
 * @param n {number} - The number of records to be skipped
 * @returns {DataQueryable}
 * @example
 //retrieve a list of products
 context.model('Product')
 .skip(10)
 .take(10)
 .list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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
    execute_.call(self,callback);
}

/**
 * Prepares a data paging operation by taking the specified number of records
 * @param {Number} n - The number of records to take
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
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
 * <p>
 *     The result is an instance of <a href="DataResultSet.html">DataResultSet</a>. The returned records may contain nested objects
 *     based on the definition of the current model (expandable fields).
 *     This operation is one of the common data operations on MOST Data Applications
 *     where the affected records may have nested objects which contain the associated objects of each object.
 * </p>
 <pre class="prettyprint"><code>
 {
    "total": 242,
    "records": [
        ...
        {
            "id": 46,
            "orderDate": "2014-12-31 13:35:41.000+02:00",
            "orderedItem": {
                "id": 413,
                "additionalType": "Product",
                "category": "Storage and Networking Gear",
                "price": 647.13,
                "model": "FY8135",
                "releaseDate": "2015-01-15 18:07:42.000+02:00",
                "name": "LaCie Blade Runner",
                "dateCreated": "2015-11-23 14:53:04.927+02:00",
                "dateModified": "2015-11-23 14:53:04.934+02:00"
            },
            "orderNumber": "DEF193",
            "orderStatus": {
                "id": 7,
                "name": "Problem",
                "alternateName": "OrderProblem",
                "description": "Representing that there is a problem with the order."
            },
            "paymentDue": "2015-01-20 13:35:41.000+02:00",
            "paymentMethod": {
                "id": 7,
                "name": "PayPal",
                "alternateName": "PayPal",
                "description": "Payment via the PayPal payment service."
            },
            "additionalType": "Order",
            "description": null,
            "dateCreated": "2015-11-23 21:00:18.306+02:00",
            "dateModified": "2015-11-23 21:00:18.307+02:00"
        }
        ...
    ]
}
 </code></pre>
 * @param {function(Error=,DataResultSet=)=} callback - A callback function with arguments (err, result) where the first argument is the error, if any
 * and the second argument is an object that represents a result set
 * @returns {Deferred|*} - If callback is missing returns a promise.
 @example
 //retrieve products list order by price
 context.model('Product')
 .where('category').equal('LCDs and Peripherals')
 .orderByDescending('price')
 .take(3).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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
                        var res = { total: total, skip: parseInt(self.query.$skip) || 0 , records: (result || []) };
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
 * @deprecated
 * @ignore
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
 * @deprecated
 * @ignore
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
 * @deprecated
 * @ignore
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
    execute_.call(self, function(err, result) {
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
 * Executes the query against the current model and returns the count of items found.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result, if any.
 * @returns {Deferred|*} - If callback parameter is missing then returns a Deferred object.
 * @example
 //retrieve the number of a product's orders
 context.model('Order')
 .where('orderedItem').equal(302)
 .count().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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
 * @param {string} attr
 * @param callback {Function}
 */
function maxInternal(attr, callback) {
    var self = this;
    delete self.query.$skip;
    var field = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, 'max', attr);
    self.select([field]).flatten().value(function(err, result) {
        if (err) { return callback(err); }
        callback(null, result)
    });
}

/**
 * Executes the query against the current model and returns the maximum value of the given attribute.
 * @param {string} attr - A string that represents a field of the current model
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result, if any.
 * @returns {Deferred|*} - If callback parameter is missing then returns a Deferred object.
 * @example
 //retrieve the maximum price of products sold during last month
 context.model('Order')
 .where('orderDate').greaterOrEqual(moment().startOf('month').toDate())
 .max('orderedItem/price').then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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
 * @param attr {String}
 * @param callback {Function}
 */
function minInternal(attr, callback) {
    var self = this;
    delete self.query.$skip;
    var field = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, 'min', attr);
    self.select([field]).flatten().value(function(err, result) {
        if (err) { return callback(err); }
        callback(null, result)
    });
}

/**
 * Executes the query against the current model and returns the average value of the given attribute.
 * @param {string} attr - A string that represents a field of the current model
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result, if any.
 * @returns {Deferred|*} - If callback parameter is missing then returns a Deferred object.
 * @example
 //retrieve the mininum price of products sold during last month
 context.model('Order')
 .where('orderDate').greaterOrEqual(moment().startOf('month').toDate())
 .min('orderedItem/price').then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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
 */
function averageInternal_(attr, callback) {
    var self = this;
    delete self.query.$skip;
    var field = DataAttributeResolver.prototype.selectAggregatedAttribute.call(self, 'avg', attr);
    self.select([field]).flatten().value(function(err, result) {
        if (err) { return callback(err); }
        callback(null, result)
    });
}

/**
 * Executes the query against the current model and returns the average value of the given attribute.
 * @param {string} attr - A string that represents a field of the current model
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result, if any.
 * @returns {Deferred|*} - If callback parameter is missing then returns a Deferred object.
 * @example
 //retrieve the average price of products sold during last month
 context.model('Order')
 .where('orderDate').greaterOrEqual(moment().startOf('month').toDate())
 .average('orderedItem/price').then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.average = function(attr, callback) {
    if (typeof callback !== 'function') {
        var d = Q.defer();
        averageInternal_.call(this, attr, function(err, result) {
            if (err) { return d.reject(err); }
            d.resolve(result);
        });
        return d.promise;
    }
    else {
        return averageInternal_.call(this, attr, callback);
    }
};
/**
 * @private
 * @param {Function} callback
 */
function executeCount_(callback) {
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
/**
 * Migrates the underlying data model
 * @param {function(Error=)} callback - A callback function that should be called at the end of this operation. The first argument may be an error if any occured.
 */
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
 function execute_(callback) {
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
                    finalExecuteInternal_.call(self, e, callback);
                }
            });
        }
        else {
            //execute query
            finalExecuteInternal_.call(self, e, callback);
        }
    });
};

/**
 * @private
 * @param {*} e
 * @param {function(Error=,*=)} callback
 */
 function finalExecuteInternal_(e, callback) {
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
                afterExecute_.call(self, result, function(err, result) {
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
                afterExecute_.call(self, result, function(err, result) {
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
function afterExecute_(result, callback) {
    var self = this, field, parentField, junction;
    if (self.$expand) {
        //get distinct values
        var expands = self.$expand.distinct(function(x) { return x; });
        async.eachSeries(expands,function(expand, cb) {
            /**
             * get mapping
             * @type {DataAssociationMapping|*}
             */
            var mapping = null;
            if (expand instanceof types.DataAssociationMapping) {
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
                         * @private
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
 * Disables permission listeners and executes the underlying query without applying any permission filters
 * @param {Boolean=} value - A boolean which represents the silent flag. If value is missing the default parameter is true.
 * @returns {DataQueryable}
 * @example
 //retrieve user
 context.model('User')
 .where('name').equal('other@example.com')
 .silent()
 .first().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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
 * Generates a MD5 hashed string for this DataQueryable instance
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
 * Gets or sets query data. This data may be used in before and after execute listeners.
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
 * Gets or sets a string which represents the title of this DataQueryable instance. This title may be used in caching operations
 * @param {string=} value - The title of this DataQueryable instance
 * @returns {string|DataQueryable}
 */
DataQueryable.prototype.title = function(value) {
    return this.data('title', value);
};
/**
 * Gets or sets a boolean which indicates whether results should be cached or not. This parameter is valid for models which have caching mechanisms.
 * @param {string=} value
 * @returns {string|DataQueryable}
 */
DataQueryable.prototype.cache = function(value) {
    return this.data('cache', value);
};

/**
 * Sets an expandable field or collection of fields. An expandable field produces nested objects based on the association between two models.
 * @param {...string} attr - A param array of strings which represents the field or the array of fields that are going to be expanded.
 * If attr is missing then all the previously defined expandable fields will be removed.
 * @returns {DataQueryable}
 * @example
 //retrieve an order and expand customer field
 context.model('Order')
 //note: the field [orderedItem] is defined as expandable in model definition and it will produce a nested object for each order
 .select('id','orderedItem','customer')
 .expand('customer')
 .where('id').equal(46)
 .first().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Result:
 {
    "id": 46,
    "orderedItem": {
        "id": 413,
        "additionalType": "Product",
        "category": "Storage and Networking Gear",
        "price": 647.13,
        "model": "FY8135",
        "releaseDate": "2015-01-15 18:07:42.000+02:00",
        "name": "LaCie Blade Runner",
        "dateCreated": "2015-11-23 14:53:04.927+02:00",
        "dateModified": "2015-11-23 14:53:04.934+02:00"
    },
    "customer": {
        "id": 317,
        "additionalType": "Person",
        "alternateName": null,
        "description": "Nicole Armstrong",
        "image": "https://s3.amazonaws.com/uifaces/faces/twitter/zidoway/128.jpg",
        "dateCreated": "2015-11-23 14:52:57.886+02:00",
        "dateModified": "2015-11-23 14:52:57.917+02:00"
    }
}
 @example //retrieve an order and do not expand customer field
 {
    "id": 46,
    "orderedItem": {
        "id": 413,
        "additionalType": "Product",
        "category": "Storage and Networking Gear",
        "price": 647.13,
        "model": "FY8135",
        "releaseDate": "2015-01-15 18:07:42.000+02:00",
        "name": "LaCie Blade Runner",
        "dateCreated": "2015-11-23 14:53:04.927+02:00",
        "dateModified": "2015-11-23 14:53:04.934+02:00"
    },
    "customer": 317
}
 */
DataQueryable.prototype.expand = function(attr) {
    var self = this,
        arg = (arguments.length>1) ? Array.prototype.slice.call(arguments): attr;
    if (typeof arg === 'undefined' || arg===null) {
        delete self.$expand;
    }
    else {
        if (!util.isArray(this.$expand))
            self.$expand=[];
        if (util.isArray(arg)) {

            arg.forEach(function(x) { self.$expand.push(x); });
        }
        else {
            self.$expand.push(arg);
        }
    }
    return self;
};
/**
 * Disables expandable fields
 * @param {boolean=} value - If the value is true the result will contain only flat objects -without any nested associated object-,
 * even if model definition contains expandable fields. If value is missing, the default parameter is true
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders
 context.model('Order')
 .flatten()
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 id  customer  orderStatus  paymentMethod
 --  --------  -----------  -------------
 1   299       5            6
 2   337       7            5
 3   309       3            3
 4   257       2            4
 5   285       5            2
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
 * Prepares an addition (e.g. ([field] + 4))
 * @param {number|*} x - The
 * @returns {DataQueryable}
 * @example
 //retrieve a list of products
 context.model('Product')
 .select('id','name', 'price')
 //perform ((ProductData.price + 100)>300)
 .where('price').add(100).lowerThan(300)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.add = function(x) {
    this.query.add(x); return this;
};
/**
 * Prepares a subtraction (e.g. ([field] - 4))
 * @param {number|*} x
 * @returns {DataQueryable}
 //retrieve a list of orders
 context.model('Product')
 .select('id','name', 'price')
 //perform ((ProductData.price - 50)<150)
 .where('price').subtract(50).lowerThan(150)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.subtract = function(x) {
    this.query.subtract(x); return this;
};

/**
 * Prepares a multiplication (e.g. ([field] * 0.2))
 * @param {number} x
 * @returns {DataQueryable}
 @example
 //retrieve a list of orders
 context.model('Product')
 .select('id','name', 'price')
 //perform ((ProductData.price * 0.2)<50)
 .where('price').multiply(0.2).lowerThan(50)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.multiply = function(x) {
    this.query.multiply(x); return this;
};

/**
 * Prepares a division (e.g. ([field] / 0.2))
 * @param {number} x
 * @returns {DataQueryable}
 @example
 //retrieve a list of orders
 context.model('Product')
 .select('id','name', 'price')
 //perform ((ProductData.price / 0.8)>500)
 .where('price').divide(0.8).greaterThan(500)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.divide = function(x) {
    this.query.divide(x); return this;
};

/**
 * * Prepares a round mathematical expression
 * @param {number=} n
 * @returns {DataQueryable}
 */
DataQueryable.prototype.round = function(n) {
    this.query.round(x); return this;
};
/**
 * Prepares a substring comparison
 * @param {number} start - The position where to start the extraction. First character is at index 0
 * @param {number=} length - The number of characters to extract
 * @returns {DataQueryable}
 * @example
 //retrieve a list of persons
 context.model('Person')
 .select('givenName')
 .where('givenName').substr(0,4).equal('Alex')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 givenName
 ---------
 Alex
 Alexis
 */
DataQueryable.prototype.substr = function(start,length) {
    this.query.substr(start,length); return this;
};
/**
 * Prepares an indexOf comparison
 * @param {string} s The string to search for
 * @returns {DataQueryable}
 * @example
 //retrieve a list of persons
 context.model('Person')
 .select('givenName')
 .where('givenName').indexOf('a').equal(1)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 givenName
 ---------
 Daisy
 Maxwell
 Mackenzie
 Zachary
 Mason
 */
DataQueryable.prototype.indexOf = function(s) {
    this.query.indexOf(s); return this;
};
/**
 * Prepares a string concatenation expression
 * @param {string} s
 * @returns {DataQueryable}
 */
DataQueryable.prototype.concat = function(s) {
    this.query.concat(s); return this;
};
/**
 * Prepares a string trimming expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.trim = function() {
    this.query.trim(); return this;
};
/**
 * Prepares a string length expression
 * @returns {DataQueryable}
 * @example
 //retrieve a list of persons
 context.model('Person')
 .select('givenName')
 .where('givenName').length().equal(5)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 @example //Results:
 givenName
 ---------
 Daisy
 Peter
 Kylie
 Colin
 Lydia
 */
DataQueryable.prototype.length = function() {
    this.query.length(); return this;
};
/**
 * Prepares an expression by getting the date only value of a datetime field
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders
 context.model('Order')
 .select('id','paymentDue', 'orderDate')
 .where('orderDate').getDate().equal('2015-01-16')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.getDate = function() {
    this.query.getDate(); return this;
};
/**
 * Prepares an expression by getting the year of a datetime field
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders made during 2015
 context.model('Order')
 .where('orderDate').getYear().equal(2015)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.getYear = function() {
    this.query.getYear(); return this;
};
/**
 * Prepares an expression by getting the year of a datetime field
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders made during 2015
 context.model('Order')
 .where('orderDate').getYear().equal(2015)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.getFullYear = function() {
    this.query.getYear(); return this;
};
/**
 * Prepares an expression by getting the month (from 1 to 12) of a datetime field.
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders made during October 2015
 context.model('Order')
 .where('orderDate').getYear().equal(2015)
 .and('orderDate').getMonth().equal(10)
  .take(5).list().then(function(result) {
        console.table(result.records);
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.getMonth = function() {
    this.query.getMonth(); return this;
};
/**
 * Prepares an expression by getting the day of the month of a datetime field
 * @returns {DataQueryable}
 * @example
 //retrieve a list of orders
 context.model('Order')
 .where('orderDate').getYear().equal(2015)
 .and('orderDate').getMonth().equal(1)
 .and('orderDate').getDay().equal(16)
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.getDay = function() {
    this.query.getDay(); return this;
};
/**
 * Prepares an expression by getting the hours (from 0 to 23) a datetime field
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getHours = function() {
    this.query.getHours(); return this;
};
/**
 * Prepares an expression by getting the minutes (from 0 to 59) a datetime field
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getMinutes = function() {
    this.query.getMinutes(); return this;
};
/**
 * Prepares an expression by getting the seconds (from 0 to 59) a datetime field
 * @returns {DataQueryable}
 */
DataQueryable.prototype.getSeconds = function() {
    this.query.getSeconds(); return this;
};
/**
 * Prepares a floor mathematical expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.floor = function() {
    this.query.floor(); return this;
};
/**
 * Prepares a ceil mathematical expression
 * @returns {DataQueryable}
 */
DataQueryable.prototype.ceil = function() {
    this.query.ceil(); return this;
};

/**
 * Prepares a lower case string comparison
 * @returns {DataQueryable}
 */
DataQueryable.prototype.toLocaleLowerCase = function() {
    this.query.toLocaleLowerCase(); return this;
};
/**
 * Prepares a lower case string comparison
 * @returns {DataQueryable}
 * @example
 //retrieve a list of persons
 context.model('Person')
 .where('givenName').toLocaleLowerCase().equal('alexis')
 .take(5).list().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
 */
DataQueryable.prototype.toLowerCase = function() {
    return this.toLocaleLowerCase();
};
/**
 * Prepares an upper case string comparison
 * @returns {DataQueryable}
 */
DataQueryable.prototype.toLocaleUpperCase = function() {
    this.query.toLocaleUpperCase(); return this;
};
/**
 * Prepares an upper case string comparison
 * @returns {DataQueryable}
 */
DataQueryable.prototype.toUpperCase = function() {
    return this.toLocaleUpperCase();
};
/**
 * @private
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
 * Executes the underlying query and a single value.
 * @param {Function=} callback - A callback function where the first argument will contain the Error object if an error occured, or null otherwise. The second argument will contain the result.
 * @returns {Deferred|*}
 * @example
 //retrieve the full name (description) of a person
 context.model('Person')
 .where('user').equal(330)
 .select('description')
 .value().then(function(result) {
        done(null, result);
    }).catch(function(err) {
        done(err);
    });
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

if (typeof exports !== 'undefined')
{
    module.exports = {
        DataQueryable:DataQueryable,
        DataAttributeResolver:DataAttributeResolver
    };
}
