/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD-3-Clause license
 * Date: 2017-11-10
 */

var Symbol = require('symbol');
var util = require('util');
var sprintf = require('sprintf').sprintf;
var Q = require('q');
var pluralize = require('pluralize');
var _ = require('lodash');
var moment = require('moment');
var parseBoolean = require('./types').parsers.parseBoolean;
var DataModel = require('./data-model').DataModel;
var DataContext = require('./types').DataContext;
var XDocument = require('most-xml').XDocument;

// noinspection JSUnusedLocalSymbols
var entityTypesProperty = Symbol('entityTypes');
// noinspection JSUnusedLocalSymbols
var entityContainerProperty = Symbol('entityContainer');
var ignoreEntityTypesProperty = Symbol('ignoredEntityTypes');
var builderProperty = Symbol('builder');
var entityTypeProperty = Symbol('entityType');
// noinspection JSUnusedLocalSymbols
var edmProperty = Symbol('edm');
var SchemaDefaultNamespace = "Edm.Models";
var initializeProperty = Symbol('initialize');

function Args() {
    //
}
/**
 * Checks the expression and throws an exception if the condition is not met.
 * @param {*} expr
 * @param {string} message
 */
Args.check = function(expr, message) {
    Args.notNull(expr,"Expression");
    if (typeof expr === 'function') {
        expr.call()
    }
    var res;
    if (typeof expr === 'function') {
        res = !(expr.call());
    }
    else {
        res = (!expr);
    }
    if (res) {
        var err = new Error(message);
        err.code = "ECHECK";
        throw err;
    }
};
/**
 *
 * @param {*} arg
 * @param {string} name
 */
Args.notNull = function(arg,name) {
    if (typeof arg === 'undefined' || arg === null) {
        var err = new Error(name + " may not be null or undefined");
        err.code = "ENULL";
        throw err;
    }
};

/**
 * @param {*} arg
 * @param {string} name
 */
Args.notString = function(arg, name) {
    if (typeof arg !== 'string') {
        var err = new Error(name + " must be a string");
        err.code = "EARG";
        throw err;
    }
};

/**
 * @param {*} arg
 * @param {string} name
 */
Args.notFunction = function(arg, name) {
    if (typeof arg !== 'function') {
        var err = new Error(name + " must be a function");
        err.code = "EARG";
        throw err;
    }
};

/**
 * @param {*} arg
 * @param {string} name
 */
Args.notNumber = function(arg, name) {
    if (typeof arg !== 'string') {
        var err = new Error(name + " must be number");
        err.code = "EARG";
        throw err;
    }
};
/**
 * @param {string|*} arg
 * @param {string} name
 */
Args.notEmpty = function(arg,name) {
    Args.notNull(arg,name);
    Args.notString(arg,name);
    if (arg.length === 0) {
        var err = new Error(name + " may not be empty");
        err.code = "EEMPTY";
        return err;
    }
};

/**
 * @param {number|*} arg
 * @param {string} name
 */
Args.notNegative = function(arg,name) {
    Args.notNumber(arg,name);
    if (arg<0) {
        var err = new Error(name + " may not be negative");
        err.code = "ENEG";
        return err;
    }
};

/**
 * @param {number|*} arg
 * @param {string} name
 */
Args.positive = function(arg,name) {
    Args.notNumber(arg,name);
    if (arg<=0) {
        var err = new Error(name + " may not be negative or zero");
        err.code = "EPOS";
        return err;
    }
};


/**
 * @enum
 */
function EdmType() {

}

EdmType.EdmBinary = "Edm.Binary";
EdmType.EdmBoolean="Edm.Boolean";
EdmType.EdmByte="Edm.Byte";
EdmType.EdmDate="Edm.Date";
EdmType.EdmDateTimeOffset="Edm.DateTimeOffset";
EdmType.EdmDouble="Edm.Double";
EdmType.EdmDecimal="Edm.Decimal";
EdmType.EdmDuration="Edm.Duration";
EdmType.EdmGuid="Edm.Guid";
EdmType.EdmInt16="Edm.Int16";
EdmType.EdmInt32="Edm.Int32";
EdmType.EdmInt64="Edm.Int64";
EdmType.EdmSByte="Edm.SByte";
EdmType.EdmSingle="Edm.Single";
EdmType.EdmStream="Edm.Stream";
EdmType.EdmString="Edm.String";
EdmType.EdmTimeOfDay="Edm.TimeOfDay";

/**
 * @enum
 */
function EdmMultiplicity() {

}
EdmMultiplicity.Many = "Many";
EdmMultiplicity.One = "One";
EdmMultiplicity.Unknown = "Unknown";
EdmMultiplicity.ZeroOrOne = "ZeroOrOne";

/**
 * @enum
 */
function EntitySetKind() {

}
EntitySetKind.EntitySet = "EntitySet";
EntitySetKind.Singleton = "Singleton";
EntitySetKind.FunctionImport = "FunctionImport";
EntitySetKind.ActionImport = "ActionImport";

// noinspection JSUnusedGlobalSymbols
/**
 * @class
 * @param {string} name
 * @constructor
 */
function ProcedureConfiguration(name) {
    this.name = name;
    this.parameters = [];
    // noinspection JSUnusedGlobalSymbols
    this.isBound = false;
}
/**
 * @param type
 * @returns {ProcedureConfiguration}
 */
ProcedureConfiguration.prototype.returns = function(type) {
    // noinspection JSUnusedGlobalSymbols
    this.returnType = type;
    return this;
};
// noinspection JSUnusedGlobalSymbols
/**
 * @param type
 * @returns {ProcedureConfiguration}
 */
ProcedureConfiguration.prototype.returnsCollection = function(type) {
    // noinspection JSUnusedGlobalSymbols
    this.returnCollectionType =  type;
    return this;
};
/**
 * @param {string} name
 * @param {string} type
 * @param {boolean=} nullable
 */
ProcedureConfiguration.prototype.parameter = function(name, type, nullable) {
    Args.notString(name, "Action parameter name");
    Args.notString(type, "Action parameter type");
    var findRe = new RegExp("^" + name + "$" ,"ig");
    var p = _.find(this.parameters, function(x) {
        return findRe.test(x.name);
    });
    if (p) {
        p.type = type;
    }
    else {
        this.parameters.push({
            "name":name,
            "type":type,
            "nullable": _.isBoolean(nullable) ? nullable : false
        });
    }
    return this;
};

/**
 * @class
 * @constructor
 * @param {string} name
 * @augments ProcedureConfiguration
 * @extends ProcedureConfiguration
 */
function ActionConfiguration(name) {
    ActionConfiguration.super_.bind(this)(name);
    // noinspection JSUnusedGlobalSymbols
    this.isBound = false;
}
util.inherits(ActionConfiguration, ProcedureConfiguration);

/**
 * @class
 * @constructor
 * @param {string} name
 * @augments ProcedureConfiguration
 */
function FunctionConfiguration(name) {
    FunctionConfiguration.super_.bind(this)(name);
    // noinspection JSUnusedGlobalSymbols
    this.isBound = false;
}
util.inherits(FunctionConfiguration, ProcedureConfiguration);

/**
 * @class
 * @param {string} name
 * @constructor
 * @property {string} name - Gets the name of this entity type
 */
function EntityTypeConfiguration(name) {

    Args.notString(name, 'Entity type name');
    Object.defineProperty(this, 'name', {
        get:function() {
            return name;
        }
    });
    this.property = [];
    this.ignoredProperty = [];
    this.navigationProperty = [];
    this.actions = [];
    this.functions = [];

}
// noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} name
     */
    EntityTypeConfiguration.prototype.derivesFrom = function(name) {
        Args.notString(name,"Enity type name");
        this.baseType = name;
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * Creates an action that bind to this entity type
     * @param {string} name
     * @returns ActionConfiguration
     */
    EntityTypeConfiguration.prototype.addAction = function(name) {
        /**
         * @type {ActionConfiguration|*}
         */
        var a = this.hasAction(name);
        if (a) {
            return a;
        }
        a = new ActionConfiguration(name);
        //add current entity as parameter
        a.parameter(_.camelCase(this.name), this.name);
        a.isBound = true;
        this.actions.push(a);
        return a;
    };

    /**
     * Checks if entity type has an action with the given name
     * @param {string} name
     * @returns {ActionConfiguration|*}
     */
    EntityTypeConfiguration.prototype.hasAction = function(name) {
        if (_.isEmpty(name)) {
            return;
        }
        var findRe = new RegExp("^$" + name + "$" ,"ig");
        return _.find(this.actions, function(x) {
            return findRe.test(x.name);
        });
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * Creates an action that bind to this entity type
     * @param {string} name
     * @returns ActionConfiguration
     */
    EntityTypeConfiguration.prototype.addFunction = function(name) {
        var a = this.hasFunction(name);
        if (a) {
            return a;
        }
        a = new FunctionConfiguration(name);
        a.isBound = true;
        a.parameter(_.camelCase(this.name), this.name);
        //add current entity as parameter
        this.functions.push(a);
        return a;
    };

    /**
     * Checks if entity type has a function with the given name
     * @param {string} name
     * @returns {ActionConfiguration|*}
     */
    EntityTypeConfiguration.prototype.hasFunction = function(name) {
        if (_.isEmpty(name)) {
            return;
        }
        var findRe = new RegExp("^" + name + "$" ,"ig");
        return _.find(this.functions, function(x) {
            return findRe.test(x.name);
        });
    };

    /**
     * Adds a new EDM primitive property to this entity type.
     * @param {string} name
     * @param {string} type
     * @param {boolean=} nullable
     * @returns EntityTypeConfiguration
     */
    EntityTypeConfiguration.prototype.addProperty = function(name, type, nullable) {
        Args.notString(name,"Property name");
        var exists =_.findIndex(this.property, function(x) {
            return x.name === name;
        });
        if (exists<0) {
            var p = {
                "name":name,
                "type":type,
                "nullable":_.isBoolean(nullable) ? nullable : true
            };
            this.property.push(p);
        }
        else {
            _.assign(this.property[exists], {
                "type":type,
                "nullable":_.isBoolean(nullable) ? nullable : true
            });
        }
        return this;
    };

// noinspection JSUnusedGlobalSymbols
    /**
     * Adds a new EDM navigation property to this entity type.
     * @param {string} name
     * @param {string} type
     * @param {string} multiplicity
     * @returns EntityTypeConfiguration
     */
    EntityTypeConfiguration.prototype.addNavigationProperty = function(name, type, multiplicity) {
        Args.notString(name,"Property name");
        var exists =_.findIndex(this.navigationProperty, function(x) {
            return x.name === name;
        });

        var p = {
            "name":name,
            "type": (multiplicity==="Many") ? sprintf("Collection(%s)", type) : type
        };
        if ((multiplicity===EdmMultiplicity.ZeroOrOne) || (multiplicity===EdmMultiplicity.Many)) {
            p.nullable = true;
        }

        if (exists<0) {
            this.navigationProperty.push(p);
        }
        else {
            _.assign(this.navigationProperty[exists], p);
        }
        return this;
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * Removes the navigation property from the entity.
     * @param {string} name
     * @returns {EntityTypeConfiguration}
     */
    EntityTypeConfiguration.prototype.removeNavigationProperty = function(name) {
        Args.notString(name,"Property name");
        var hasProperty =_.findIndex(this.property, function(x) {
            return x.name === name;
        });
        if (hasProperty>=0) {
            this.property.splice(hasProperty, 1);
        }
        return this;
    };

    /**
     * Ignores a property from the entity
     * @param name
     * @returns {EntityTypeConfiguration}
     */
    EntityTypeConfiguration.prototype.ignore = function(name) {
        Args.notString(name,"Property name");
        var hasProperty =_.findIndex(this.ignoredProperty, function(x) {
            return x.name === name;
        });
        if (hasProperty>=0) {
            return this;
        }
        this.ignoredProperty.push(name);

    };

    /**
     * Removes the property from the entity.
     * @param {string} name
     * @returns {EntityTypeConfiguration}
     */
    EntityTypeConfiguration.prototype.removeProperty = function(name) {
        Args.notString(name,"Property name");
        var hasProperty =_.findIndex(this.property, function(x) {
            return x.name === name;
        });
        if (hasProperty>=0) {
            this.property.splice(hasProperty, 1);
        }
        return this;
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * Removes the property from the entity keys collection.
     * @param {string} name
     * @returns {EntityTypeConfiguration}
     */
    EntityTypeConfiguration.prototype.removeKey = function(name) {
        Args.notString(name,"Key name");
        if (this.key && _.isArray(this.key.propertyRef)) {
            var hasKeyIndex = _.findIndex(this.key.propertyRef, function(x) {
                return x.name === name;
            });
            if (hasKeyIndex<0) {
                return this;
            }
            this.key.propertyRef.splice(hasKeyIndex, 1);
            return this;
        }
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * Configures the key property(s) for this entity type.
     * @param {string} name
     * @param {string} type
     * @returns {EntityTypeConfiguration}
     */
    EntityTypeConfiguration.prototype.hasKey = function(name, type) {
        this.addProperty(name, type, false);
        this.key = {
            propertyRef: [
                {
                    "name": name
                }
            ]
        };
        return this;
    };

/**
 * @class
 * @param {ODataModelBuilder} builder
 * @param {string} entityType
 * @param {string} name
 */
function EntitySetConfiguration(builder, entityType, name) {
    Args.check(builder instanceof ODataModelBuilder, new TypeError('Invalid argument. Configuration builder must be an instance of ODataModelBuilder class'));
    Args.notString(entityType, 'Entity Type');
    Args.notString(name, 'EntitySet Name');
    this[builderProperty] = builder;
    this[entityTypeProperty] = entityType;
    //ensure entity type
    if (!this[builderProperty].hasEntity(this[entityTypeProperty])) {
        this[builderProperty].addEntity(this[entityTypeProperty]);
    }
    this.name = name;
    this.kind = EntitySetKind.EntitySet;
    //use the given name as entity set URL by default
    this.url = name;

    Object.defineProperty(this,'entityType', {
        get: function() {
            if (!this[builderProperty].hasEntity(this[entityTypeProperty])) {
                return this[builderProperty].addEntity(this[entityTypeProperty]);
            }
            return this[builderProperty].getEntity(this[entityTypeProperty]);
        }
    });

    this.hasContextLink(function(context) {
        var thisBuilder = this.getBuilder();
        if (_.isNil(thisBuilder)) {
            return;
        }
        if (typeof thisBuilder.getContextLink !== 'function') {
            return;
        }
        //get builder context link
        var builderContextLink = thisBuilder.getContextLink(context);
        if (builderContextLink) {
            //add hash for entity set
            return builderContextLink + "#" + this.name;
        }
    });

}
// noinspection JSUnusedGlobalSymbols
EntitySetConfiguration.prototype.hasUrl = function(url) {
        Args.notString(url, 'Entity Resource Path');
        this.url = url;
    };
// noinspection JSUnusedGlobalSymbols
EntitySetConfiguration.prototype.getUrl = function() {
        return this.url;
    };

    /**
     * @returns {ODataModelBuilder}
     */
    EntitySetConfiguration.prototype.getBuilder = function() {
        return this[builderProperty];
    };

// noinspection JSUnusedGlobalSymbols
    /**
     * @returns {*}
     */
    EntitySetConfiguration.prototype.getEntityTypePropertyList = function() {
        var result = {};
        _.forEach(this.entityType.property, function(x) {
            result[x.name] = x;
        });
        var baseEntityType = this.getBuilder().getEntity(this.entityType.baseType);
        while (baseEntityType) {
            _.forEach(baseEntityType.property, function(x) {
                result[x.name] = x;
            });
            baseEntityType = this.getBuilder().getEntity(baseEntityType.baseType);
        }
        return result;
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} name
     * @param  {boolean=} deep
     * @returns {*}
     */
    EntitySetConfiguration.prototype.getEntityTypeProperty = function(name, deep) {
        var re = new RegExp("^" + name + "$","ig");
        var p = _.find(this.entityType.property, function(x) {
            return re.test(x.name);
        });
        if (p) {
            return p;
        }
        var deep_ = _.isBoolean(deep) ? deep : true;
        if (deep_) {
            var baseEntityType = this.getBuilder().getEntity(this.entityType.baseType);
            while (baseEntityType) {
                p = _.find(baseEntityType.property, function(x) {
                    return re.test(x.name);
                });
                if (p) {
                    return p;
                }
                baseEntityType = this.getBuilder().getEntity(baseEntityType.baseType);
            }
        }
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * @returns {*}
     */
    EntitySetConfiguration.prototype.getEntityTypeIgnoredPropertyList = function() {
        var result = [].concat(this.entityType.ignoredProperty);
        var baseEntityType = this.getBuilder().getEntity(this.entityType.baseType);
        while (baseEntityType) {
            result.push.apply(result, baseEntityType.ignoredProperty);
            baseEntityType = this.getBuilder().getEntity(baseEntityType.baseType);
        }
        return result;
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} name
     * @param  {boolean=} deep
     * @returns {*}
     */
    EntitySetConfiguration.prototype.getEntityTypeNavigationProperty = function(name, deep) {
        var re = new RegExp("^" + name + "$","ig");
        var p = _.find(this.entityType.navigationProperty, function(x) {
            return re.test(x.name);
        });
        if (p) {
            return p;
        }
        var deep_ = _.isBoolean(deep) ? deep : true;
        if (deep_) {
            var baseEntityType = this.getBuilder().getEntity(this.entityType.baseType);
            while (baseEntityType) {
                p = _.find(baseEntityType.navigationProperty, function(x) {
                    return re.test(x.name);
                });
                if (p) {
                    return p;
                }
                baseEntityType = this.getBuilder().getEntity(baseEntityType.baseType);
            }
        }
    };

// noinspection JSUnusedGlobalSymbols
    /**
     * @returns {*}
     */
    EntitySetConfiguration.prototype.getEntityTypeNavigationPropertyList = function() {
        var result = [];
        _.forEach(this.entityType.navigationProperty, function(x) {
            result[x.name] = x;
        });
        var baseEntityType = this.getBuilder().getEntity(this.entityType.baseType);
        while (baseEntityType) {
            _.forEach(baseEntityType.navigationProperty, function(x) {
                result[x.name] = x;
            });
            baseEntityType = this.getBuilder().getEntity(baseEntityType.baseType);
        }
        return result;
    };

// noinspection JSUnusedGlobalSymbols
    /**
     * @param contextLinkFunc
     */
    EntitySetConfiguration.prototype.hasContextLink = function(contextLinkFunc) {
// noinspection JSUnusedGlobalSymbols
        this.getContextLink = contextLinkFunc;
    };

// noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param {Function} idLinkFunc
     */
    EntitySetConfiguration.prototype.hasIdLink = function(idLinkFunc) {
// noinspection JSUnusedGlobalSymbols
        this.getIdLink = idLinkFunc;
    };

// noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param {Function} readLinkFunc
     */
    EntitySetConfiguration.prototype.hasReadLink = function(readLinkFunc) {
// noinspection JSUnusedGlobalSymbols
        this.getReadLink = readLinkFunc;
    };

// noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param {Function} editLinkFunc
     */
    EntitySetConfiguration.prototype.hasEditLink = function(editLinkFunc) {
// noinspection JSUnusedGlobalSymbols
        this.getEditLink = editLinkFunc;
    };
/**
 * @param {*} context
 * @param {*} any
 */
EntitySetConfiguration.prototype.mapInstance = function(context, any) {
    if (_.isNil(any)) {
        return;
    }
    if (context) {
        var contextLink = this.getContextLink(context);
        if (contextLink) {
            return _.assign({
                "@odata.context":contextLink + '/$entity'
            }, any);
        }
    }
    return any;
};

EntitySetConfiguration.prototype.mapInstanceSet = function(context, any) {
    if (_.isNil(any)) {
        return;
    }
    var result = {};
    if (context) {
        var contextLink = this.getContextLink(context);
        if (contextLink) {
            result["@odata.context"] = contextLink;
        }
    }
    //search for total property for backward compatibility issues
    if (any.hasOwnProperty("total") && /^\+?\d+$/.test(any["total"])) {
        result["@odata.count"] = parseInt(any["total"]);
    }
    if (any.hasOwnProperty("count") && /^\+?\d+$/.test(any["count"])) {
        result["@odata.count"] = parseInt(any["count"]);
    }
    result["value"] = [];
    if (_.isArray(any)) {
        result["value"] = any;
    }
    //search for records property for backward compatibility issues
    else if (_.isArray(any.records)) {
        result["value"] = any.records;
    }
    else if (_.isArray(any.value)) {
        result["value"] = any.value;
    }
    return result;
};


/**
 * @class
 * @param {*} builder
 * @param {string} entityType
 * @param {string} name
 * @constructor
 * @augments EntitySetConfiguration
 * @extends EntitySetConfiguration
 */
function SingletonConfiguration(builder, entityType, name) {
    SingletonConfiguration.super_.bind(this)(builder, entityType, name);
    this.kind = EntitySetKind.Singleton;
}
util.inherits(SingletonConfiguration, EntitySetConfiguration);


/**
 * @classdesc Represents the OData model builder of an HTTP application
 * @property {string} serviceRoot - Gets or sets the service root URI
 * @param {DataConfiguration} configuration
 * @class
 */
function ODataModelBuilder(configuration) {

    this[entityTypesProperty] = {};
    this[ignoreEntityTypesProperty] = [];
    this[entityContainerProperty] = [];
    this.defaultNamespace = SchemaDefaultNamespace;
    this.getConfiguration = function() {
        return configuration;
    };
    var serviceRoot_;
    var self = this;
    Object.defineProperty(this,'serviceRoot', {
      get:function() {
          return serviceRoot_;
      },
        set: function(value) {
            serviceRoot_ = value;
            if (typeof self.getContextLink === 'undefined') {
                //set context link builder function
                self.hasContextLink(function(context) {
                    var req = context.request;
                    var p = /\/$/g.test(serviceRoot_) ? serviceRoot_ + "$metadata" : serviceRoot_ + "/" + "$metadata";
                    if (req) {
                        return (req.protocol||"http") + "://" + req.headers.host + p;
                    }
                    return p;
                });
            }
        }
    })
}

    /**
     * Gets a registered entity type
     * @param {string} name
     * @returns {EntityTypeConfiguration|*}
     */
    ODataModelBuilder.prototype.getEntity = function(name) {
        if (_.isNil(name)) {
            return;
        }
        Args.notString(name, 'Entity type name');
        return this[entityTypesProperty][name];
    };

    /**
     * Registers an entity type
     * @param {string} name
     * @returns {EntityTypeConfiguration}
     */
    ODataModelBuilder.prototype.addEntity = function(name) {
        if (!this.hasEntity(name)) {
            this[entityTypesProperty][name] = new EntityTypeConfiguration(name);
        }
        return this.getEntity(name)
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * @param {*} entityType
     * @param {string} name
     * @returns SingletonConfiguration|*
     */
    ODataModelBuilder.prototype.addSingleton = function(entityType, name) {
        if (!this.hasSingleton(name)) {
            this[entityContainerProperty].push(new SingletonConfiguration(this, entityType, name));
        }
        return this.getSingleton(name);
    };

    /**
     * Gets an entity set
     * @param name
     * @returns {SingletonConfiguration}
     */
    ODataModelBuilder.prototype.getSingleton =function(name) {
        Args.notString(name, 'Singleton Name');
        var re = new RegExp("^" + name + "$","ig");
        return _.find(this[entityContainerProperty], function(x) {
            return re.test(x.name) && x.kind === EntitySetKind.Singleton;
        });
    };

    /**
     * @param {string} name
     * @returns {SingletonConfiguration|*}
     */
    ODataModelBuilder.prototype.hasSingleton = function(name) {
        var findRe = new RegExp("^" + name + "$" ,"ig");
        return _.findIndex(this[entityContainerProperty], function(x) {
            return findRe.test(x.name) && x.kind === EntitySetKind.Singleton;
        })>=0;
    };

    /**
     * Checks if the given entity set exists in entity container
     * @param {string} name
     * @returns {boolean}
     */
    ODataModelBuilder.prototype.hasEntitySet = function(name) {
        var findRe = new RegExp("^" + name + "$" ,"ig");
        return _.findIndex(this[entityContainerProperty], function(x) {
            return findRe.test(x.name) && x.kind === EntitySetKind.EntitySet;
        })>=0;
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * Registers an entity type
     * @param {string} entityType
     * @param {string} name
     * @returns {EntitySetConfiguration}
     */
    ODataModelBuilder.prototype.addEntitySet = function(entityType, name) {
        if (!this.hasEntitySet(name)) {
            this[entityContainerProperty].push(new EntitySetConfiguration(this, entityType, name));
        }
        return this.getEntitySet(name);
    };

/**
 * Registers an entity type
 * @param {string} name
 * @returns {boolean}
 */
ODataModelBuilder.prototype.removeEntitySet = function(name) {
    var findRe = new RegExp("^" + name + "$" ,"ig");
    var index = _.findIndex(this[entityContainerProperty], function(x) {
        return findRe.test(x.name) && x.kind === EntitySetKind.EntitySet;
    });
    if (index>=0) {
        this[entityContainerProperty].splice(index,1);
        return true;
    }
    return false;
};


    /**
     * Gets an entity set
     * @param name
     * @returns {EntitySetConfiguration}
     */
    ODataModelBuilder.prototype.getEntitySet = function(name) {
        Args.notString(name, 'EntitySet Name');
        var re = new RegExp("^" + name + "$","ig");
        return _.find(this[entityContainerProperty], function(x) {
            return re.test(x.name) && x.kind === EntitySetKind.EntitySet;
        });
    };

    /**
     * Gets an entity set based on the given entity name
     * @param {string} entityName
     * @returns {EntitySetConfiguration}
     */
    ODataModelBuilder.prototype.getEntityTypeEntitySet = function(entityName) {
        Args.notString(entityName, 'Entity Name');
        var re = new RegExp("^" + entityName + "$","ig");
        return _.find(this[entityContainerProperty], function(x) {
            return x.entityType && re.test(x.entityType.name);
        });
    };

    /**
     * Ignores the entity type with the given name
     * @param {string} name
     * @returns {ODataModelBuilder}
     */
    ODataModelBuilder.prototype.ignore = function(name) {
        var hasEntity = this[ignoreEntityTypesProperty].indexOf(name);
        if (hasEntity < 0) {
            this[ignoreEntityTypesProperty].push(name);
        }
        return this;
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * Checks if the given entity type exists in entity's collection
     * @param {string} name
     * @returns {boolean}
     */
    ODataModelBuilder.prototype.hasEntity = function(name) {
        return this[entityTypesProperty].hasOwnProperty(name);
    };

    /**
     * Creates and returns a structure based on the configuration performed using this builder
     * @returns {Promise}
     */
    ODataModelBuilder.prototype.getEdm = function() {
        var self = this;
        return Q.promise(function(resolve, reject) {
            try{
                var schema = {
                    namespace:self.defaultNamespace,
                    entityType:[],
                    entityContainer: {
                        "name":"DefaultContainer",
                        "entitySet":[]
                    }
                };
                //get entity types by excluding ignored entities
                var keys = _.filter(_.keys(self[entityTypesProperty]), function(x) {
                    return self[ignoreEntityTypesProperty].indexOf(x)<0;
                });
                //enumerate entity types
                _.forEach(keys, function(key) {
                    schema.entityType.push(self[entityTypesProperty][key]);
                });
                //apply entity sets
                schema.entityContainer.entitySet.push.apply(schema.entityContainer.entitySet, self[entityContainerProperty]);

                return resolve(schema);
            }
            catch(err) {
                return reject(err);
            }
        });
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * @param {boolean=} all
     * @returns {ODataModelBuilder}
     */
    ODataModelBuilder.prototype.clean = function(all) {
        delete this[edmProperty];
        if (typeof all === 'boolean' && all === true) {
            this[entityTypesProperty] = {};
            this[ignoreEntityTypesProperty] = [];
            this[entityContainerProperty] = [];
        }
        return this;
    };
// noinspection JSUnusedGlobalSymbols
    /**
     * Creates and returns an XML structure based on the configuration performed using this builder
     * @returns {Promise<XDocument>}
     */
    ODataModelBuilder.prototype.getEdmDocument = function() {
        var self = this;
        return Q.promise(function(resolve, reject) {
            try{
                return self.getEdm().then(function(schema) {
                    var doc = new XDocument();
                    var rootElement = doc.createElement("edmx:Edmx");
                    rootElement.setAttribute("xmlns:edmx", "http://docs.oasis-open.org/odata/ns/edmx");
                    rootElement.setAttribute("Version","4.0");
                    doc.appendChild(rootElement);

                    var dataServicesElement = doc.createElement("edmx:DataServices");
                    var schemaElement = doc.createElement("Schema");
                    schemaElement.setAttribute("xmlns", "http://docs.oasis-open.org/odata/ns/edm");
                    schemaElement.setAttribute("Namespace", schema.namespace);
                    var actionElements = [], functionElements = [];
                    //append edmx:DataServices > Schema
                    dataServicesElement.appendChild(schemaElement);
                    _.forEach(schema.entityType,
                        /**
                         *
                         * @param {EntityTypeConfiguration} entityType
                         */
                        function(entityType) {

                            //search for bound actions
                            _.forEach(entityType.actions, function(action) {
                                var actionElement = doc.createElement("Action");
                                actionElement.setAttribute("Name", action.name);
                                actionElement.setAttribute("IsBound", true);
                                actionElement.setAttribute("IsComposable", true);
                                _.forEach(action.parameters, function(parameter) {
                                    var paramElement =  doc.createElement("Parameter");
                                    paramElement.setAttribute("Name", parameter.name);
                                    paramElement.setAttribute("Type", parameter.type);
                                    paramElement.setAttribute("Nullable", _.isBoolean(parameter.nullable) ? parameter.nullable : false);
                                    //append Action > Parameter
                                    actionElement.appendChild(paramElement)
                                });
                                actionElements.push(actionElement);
                            });

                            //search for bound functions
                            _.forEach(entityType.functions, function(func) {
                                var functionElement = doc.createElement("Function");
                                functionElement.setAttribute("Name", func.name);
                                functionElement.setAttribute("IsBound", true);
                                functionElement.setAttribute("IsComposable", true);
                                _.forEach(func.parameters, function(parameter) {
                                    var paramElement =  doc.createElement("Parameter");
                                    paramElement.setAttribute("Name", parameter.name);
                                    paramElement.setAttribute("Type", parameter.type);
                                    paramElement.setAttribute("Nullable", _.isBoolean(parameter.nullable) ? parameter.nullable : false);
                                    //append Function > Parameter
                                    functionElement.appendChild(paramElement)
                                });
                                var returnTypeElement =  doc.createElement("ReturnType");
                                var returnType = func.returnType;
                                if (func.returnCollectionType) {
                                    returnType = func.returnCollectionType;
                                    returnTypeElement.setAttribute("Type", sprintf("Collection(%s)", returnType));
                                }
                                else {
                                    returnTypeElement.setAttribute("Type", returnType);
                                }
                                returnTypeElement.setAttribute("Nullable", true);
                                functionElement.appendChild(returnTypeElement);
                                functionElements.push(functionElement);
                            });

                            //create element Schema > EntityType
                            var entityTypeElement = doc.createElement("EntityType");
                            entityTypeElement.setAttribute("Name", entityType.name);
                            entityTypeElement.setAttribute("OpenType", true);
                            if (entityType.baseType) {
                                entityTypeElement.setAttribute("BaseType", entityType.baseType);
                            }

                            if (entityType.key && entityType.key.propertyRef) {
                                var keyElement = doc.createElement('Key');
                                _.forEach(entityType.key.propertyRef, function(key) {
                                    var keyRefElement = doc.createElement('PropertyRef');
                                    keyRefElement.setAttribute("Name",key.name);
                                    keyElement.appendChild(keyRefElement);
                                });
                                entityTypeElement.appendChild(keyElement);
                            }
                            //enumerate properties
                            _.forEach(entityType.property, function(x) {
                                var propertyElement = doc.createElement('Property');
                                propertyElement.setAttribute("Name",x.name);
                                propertyElement.setAttribute("Type",x.type);
                                if (_.isBoolean(x.nullable) && (x.nullable===false)) {
                                    propertyElement.setAttribute("Nullable",false);
                                }
                                entityTypeElement.appendChild(propertyElement);
                            });
                            //enumerate navigation properties
                            _.forEach(entityType.navigationProperty, function(x) {
                                var propertyElement = doc.createElement('NavigationProperty');
                                propertyElement.setAttribute("Name",x.name);
                                propertyElement.setAttribute("Type",x.type);
                                if (!x.nullable) {
                                    propertyElement.setAttribute("Nullable",false);
                                }
                                entityTypeElement.appendChild(propertyElement);
                            });
                            //append Schema > EntityType
                            schemaElement.appendChild(entityTypeElement);
                        });

                    //append action elements to schema
                    _.forEach(actionElements, function(actionElement) {
                        schemaElement.appendChild(actionElement);
                    });
                    //append function elements to schema
                    _.forEach(functionElements, function(functionElement) {
                        schemaElement.appendChild(functionElement);
                    });



                    //create Schema > EntityContainer
                    var entityContainerElement = doc.createElement("EntityContainer");
                    entityContainerElement.setAttribute("Name", schema.entityContainer.name || "DefaultContainer");

                    _.forEach(schema.entityContainer.entitySet,
                        /**
                         * @param {EntitySetConfiguration} child
                         */
                        function(child) {
                            var childElement = doc.createElement(child.kind);
                            childElement.setAttribute("Name", child.name);
                            if ((child.kind === EntitySetKind.EntitySet) || (child.kind === EntitySetKind.Singleton)) {
                                childElement.setAttribute("EntityType", child.entityType.name);
                            }
                            var childAnnotation = doc.createElement("Annotation");
                            childAnnotation.setAttribute("Term", "Org.OData.Core.V1.ResourcePath");
                            childAnnotation.setAttribute("String", child.getUrl());
                            childElement.appendChild(childAnnotation);
                            //append Schema > EntityContainer > (EntitySet, Singleton, FunctionImport)
                            entityContainerElement.appendChild(childElement);
                        });

                    //append Schema > EntityContainer
                    schemaElement.appendChild(entityContainerElement);

                    //append edmx:Edmx > edmx:DataServices
                    rootElement.appendChild(dataServicesElement);
                    return resolve(doc);
                }).catch(function(err) {
                    return reject(err);
                });
            }
            catch(err) {
                return reject(err);
            }
        });

    };
// noinspection JSUnusedGlobalSymbols
    /**
     * @param {Function} contextLinkFunc
     */
    ODataModelBuilder.prototype.hasContextLink = function(contextLinkFunc) {
        this.getContextLink = contextLinkFunc;
    };

// noinspection JSUnusedGlobalSymbols
/**
 *
 * @param jsonFormatterFunc
 */
ODataModelBuilder.prototype.hasJsonFormatter = function(jsonFormatterFunc) {
        this.jsonFormatter = jsonFormatterFunc;
    };


    /**
     * @param {EntitySetConfiguration} entitySet
     * @param {*} context
     * @param {*} instance
     * @param {*=} options
     * @returns *
     */
    ODataModelBuilder.prototype.jsonFormatter = function(context, entitySet, instance, options) {
        var self = this;
        var defaults = _.assign({
            addContextAttribute:true,
            addCountAttribute:false
        }, options);
        var entityProperty = entitySet.getEntityTypePropertyList();
        var entityNavigationProperty = entitySet.getEntityTypeNavigationPropertyList();
        var ignoredProperty = entitySet.getEntityTypeIgnoredPropertyList();
        var singleJsonFormatter = function(instance) {
            var result = {};
            _.forEach(_.keys(instance), function(key) {
                if (ignoredProperty.indexOf(key)<0) {
                    if (entityProperty.hasOwnProperty(key)) {
                        var p = entityProperty[key];
                        if (p.type === EdmType.EdmBoolean) {
                            result[key] = parseBoolean(instance[key]);
                        }
                        else if (p.type === EdmType.EdmDate) {
                            if (!_.isNil(instance[key])) {
                                result[key] = moment(instance[key]).format('YYYY-MM-DD');
                            }
                        }
                        else if (p.type === EdmType.EdmDateTimeOffset) {
                            if (!_.isNil(instance[key])) {
                                result[key] = moment(instance[key]).format('YYYY-MM-DDTHH:mm:ssZ');
                            }
                        }
                        else {
                            result[key] = instance[key];
                        }
                    }
                    else if (entityNavigationProperty.hasOwnProperty(key)) {
                        if (_.isObject(instance[key])) {
                            var match = /^Collection\((.*?)\)$/.exec(entityNavigationProperty[key].type);
                            var entityType = match ? match[1] : entityNavigationProperty[key].type;
                            var entitySet = self.getEntityTypeEntitySet(/\.?(\w+)$/.exec(entityType)[1]);
                            result[key] = self.jsonFormatter(context, entitySet, instance[key], {
                                addContextAttribute:false
                            });
                        }
                    }
                    else {
                        result[key] = instance[key];
                    }
                }
            });
            return result;
        };
        var value;
        var result = {};
        if (defaults.addContextAttribute) {
            _.assign(result, {
                "@odata.context":self.getContextLink(context).concat("$metadata#", entitySet.name)
            });
        }
        if (_.isArray(instance)) {
            value = _.map(instance, function(x) {
                return singleJsonFormatter(x);
            });
            _.assign(result, {
                "value":value
            });
        }
        else if (_.isObject(instance)) {
            value = singleJsonFormatter(instance);
            if (defaults.addContextAttribute) {
                _.assign(result, {
                    "@odata.context":self.getContextLink(context).concat("$metadata#", entitySet.name, "/$entity")
                });
            }
            _.assign(result, value);
        }
        return result;
    };

/**
 * @class
 * @returns {*}
 * @constructor
 * @param {DataConfiguration} configuration
 * @augments DataContext
 * @extends DataContext
 */
function EntityDataContext(configuration) {
    EntityDataContext.super_.bind(this)();
    this.getConfiguration = function() {
        return configuration;
    };
}
util.inherits(EntityDataContext, DataContext);

EntityDataContext.prototype.model = function(name) {
    if (this.getConfiguration().dataTypes.hasOwnProperty(name)) {
        return;
    }
    var definition = this.getConfiguration().model(name);
    if (_.isNil(definition)) {
        return;
    }
    var res = new DataModel(definition);
    res.context = this;
    return res;
};


/**
 * @class
 * @param {DataConfiguration} configuration
 * @augments ODataModelBuilder
 * @extends ODataModelBuilder
 */
function ODataConventionModelBuilder(configuration) {

    ODataConventionModelBuilder.super_.bind(this)(configuration);

}
util.inherits(ODataConventionModelBuilder, ODataModelBuilder);
    /**
     * Automatically registers an entity type from the given model
     * @param {string} entityType
     * @param {string} name
     * @returns {EntitySetConfiguration}
     */
    ODataConventionModelBuilder.prototype.addEntitySet = function(entityType, name) {
        var self = this;
        var superAddEntitySet = ODataConventionModelBuilder.super_.prototype.addEntitySet;
        /**
         * @type {EntityTypeConfiguration}
         */
        if (this.hasEntitySet(name)) {
            return this.getEntitySet(name);
        }
        /**
         * @type {*}
         */
        var configuration = self.getConfiguration();
        if (configuration) {
            /**
             * @type {EntitySetConfiguration}
             */
            var modelEntitySet = superAddEntitySet.bind(self)(entityType, name);
            /**
             * @type {EntityTypeConfiguration}
             */
            var modelEntityType = modelEntitySet.entityType;
            /**
             * @type {DataModel}
             */
            var definition = configuration.model(entityType);
            if (definition) {
                /**
                 * @type {DataModel}
                 */
                var model = new DataModel(definition);
                model.context = new EntityDataContext(configuration);
                var inheritedAttributes = [];
                var primaryKey = _.find(model.attributes, function(x) {
                    return x.primary;
                });
                if (model.inherits) {
                    //add base entity
                    self.addEntitySet(model.inherits, pluralize(model.inherits));
                    //set inheritance
                    modelEntityType.derivesFrom(model.inherits);
                    var baseModel = model.base();
                    if (baseModel) {
                        inheritedAttributes = baseModel.attributeNames;
                    }
                }
                _.forEach(_.filter(model.attributes, function(x) {
                    if (x.primary && model.inherits) {
                        return false;
                    }
                    return (x.model === model.name) && (inheritedAttributes.indexOf(x.name)<0);
                }), function(x) {
                    var name = x.property || x.name;
                    var mapping = model.inferMapping(x.name);
                    if (_.isNil(mapping)) {
                        //find data type
                        var dataType = configuration.dataTypes[x.type];
                        //add property
                        var edmType = _.isObject(dataType) ? (dataType.hasOwnProperty("edmtype") ? dataType["edmtype"]: "Edm." + x.type) : self.defaultNamespace.concat(".",x.type);
                        modelEntityType.addProperty(name, edmType, x.hasOwnProperty('nullable') ? x.nullable : true);
                        if (x.primary) {
                            modelEntityType.hasKey(name, edmType);
                        }
                    }
                    else {
                        var namespacedType = self.defaultNamespace.concat(".",x.type);
                        //add navigation property
                        var isNullable = x.hasOwnProperty('nullable') ? x.nullable : true;
                        modelEntityType.addNavigationProperty(name, namespacedType, x.many ? EdmMultiplicity.Many: (isNullable ? EdmMultiplicity.ZeroOrOne : EdmMultiplicity.One));
                        //add navigation property entity (if type is not a primitive type)
                        if (!configuration.dataTypes.hasOwnProperty(x.type)) {
                            self.addEntitySet(x.type, pluralize(x.type));
                        }
                    }
                });
                //add link function
                if (typeof self.getContextLink === 'function') {
                    modelEntitySet.hasContextLink(function(context) {
                        return self.getContextLink(context).concat("$metadata#",modelEntitySet.name);
                    });
                }
                //add id link
                if (typeof self.getContextLink === 'function') {
                    if (primaryKey) {
                        modelEntitySet.hasIdLink(function(context, instance) {
                            //get parent model
                            if (_.isNil(instance[primaryKey.name])) {
                                return;
                            }
                            return self.getContextLink(context).concat(modelEntitySet.name, "(", instance[primaryKey.name], ")");
                        });
                    }
                }
                //add read link
                if (typeof self.getContextLink === 'function') {
                    if (primaryKey) {
                        modelEntitySet.hasReadLink(function(context, instance) {
                            //get parent model
                            if (_.isNil(instance[primaryKey.name])) {
                                return;
                            }
                            return self.getContextLink(context).concat(modelEntitySet.name, "(", instance[primaryKey.name], ")");
                        });
                    }
                }
            }
            return modelEntitySet;
        }
        return superAddEntitySet.bind(self)(entityType, name);
    };

    /**
     * @returns {Promise}
     */
    ODataConventionModelBuilder.prototype.initialize = function() {
        var self = this;
        if (self[initializeProperty]) {
            return Q.resolve();
        }
        return Q.promise(function(resolve, reject) {
            /**
             * @type {DataConfiguration|*}
             */
            var configuration = self.getConfiguration();
            if (typeof configuration.getModelPath === 'function') {
                var nativeFsModule = 'fs';
                var fs = require(nativeFsModule);
                var modelPath = configuration.getModelPath();
                if (_.isNil(modelPath)) {
                    self[initializeProperty] = true;
                    return resolve();
                }
                return fs.readdir(modelPath, function(err, files) {
                    try {
                        if (err) {
                            return reject(err);
                        }
                        var models = _.map( _.filter(files, function(x) {
                            return /\.json$/.test(x);
                        }), function(x) {
                            return /(.*?)\.json$/.exec(x)[1];
                        });
                        _.forEach(models, function (x) {
                            if (!_.isNil(x)) {
                                self.addEntitySet(x, pluralize(x));
                            }
                        });
                        //remove hidden models from entity set container
                        for (var i = 0; i < self[entityContainerProperty].length; i++) {
                            var x = self[entityContainerProperty][i];
                            //get model
                            var entityTypeName = x.entityType.name;
                            var definition = self.getConfiguration().model(x.entityType.name);
                            if (definition && definition.hidden) {
                                self.removeEntitySet(x.name);
                                if (!definition.abstract) {
                                    self.ignore(entityTypeName);
                                }
                                i -= 1;
                            }
                        }
                        self[initializeProperty] = true;
                        return resolve();
                    }
                    catch(err) {
                        return reject(err);
                    }
                });
            }
            self[initializeProperty] = true;
            return resolve();
        });

    };

    /**
     * Creates and returns a structure based on the configuration performed using this builder
     * @returns {Promise}
     */
    ODataConventionModelBuilder.prototype.getEdm = function() {
        var self = this, superGetEdm = ODataConventionModelBuilder.super_.prototype.getEdm;
        return Q.promise(function (resolve, reject) {
            try{
                if (_.isObject(self[edmProperty])) {
                    return resolve(self[edmProperty]);
                }
                return self.initialize().then(function() {
                    return superGetEdm.bind(self)().then(function(result) {
                        self[edmProperty] = result;
                        return resolve(self[edmProperty]);
                    });
                });
            }
            catch(err) {
                return reject(err);
            }
        });
    };


//exports

module.exports.EdmType = EdmType;
module.exports.EdmMultiplicity = EdmMultiplicity;
module.exports.EntitySetKind = EntitySetKind;
module.exports.ProcedureConfiguration = ProcedureConfiguration;
module.exports.ActionConfiguration = ActionConfiguration;
module.exports.FunctionConfiguration = FunctionConfiguration;
module.exports.EntityTypeConfiguration = EntityTypeConfiguration;
module.exports.EntitySetConfiguration = EntitySetConfiguration;
module.exports.SingletonConfiguration = SingletonConfiguration;
module.exports.ODataModelBuilder = ODataModelBuilder;
module.exports.ODataConventionModelBuilder = ODataConventionModelBuilder;
