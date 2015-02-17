/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2014-01-25
 */
var mssql = require('mssql'),
    async = require('async'),
    util = require('util'),
    array = require('most-array'),
    qry = require('most-query'),
    model = require('./data-model'),
    __types__ = require('./types'),
    mysql=require('mysql');


function MsSqlQueryArgs() {
    /**
     * @type {Connection}
     */
    this.connection = null;
    /**
     * @type {string}
     */
    this.query = null;
    /**
     * @type {array}
     */
    this.values = null;
}

/**
 * @class
 * @constructor
 * @augments __types__.classes.DataAdapter
 * @augments DataAdapter
 */
function MsSqlAdapter(options)
{
    /**
     * @private
     * @type {Connection}
     */
    this.rawConnection = null;
    /**
     * Gets or sets database connection string
     * @type {*}
     */
    this.options = options;
    /**
     * Gets or sets a boolean that indicates whether connection pooling is enabled or not.
     * @type {boolean}
     */
    this.connectionPooling = false;

    var self = this;
    /**
     * Gets connection string from options.
     * @type {string}
     */
    Object.defineProperty(this, 'connectionString', {
        get: function() {
            var keys = Object.keys(self.options);
            return array(keys).select(function(x) {
                return x.concat('=',self.options[x]);
            }).toArray().join(';');

        }, configurable:false, enumerable:false
    });
}

MsSqlAdapter.prototype.prepare = function(query,values)
{
    var mysql=require('mysql');
    return mysql.format(query,values);
};

/**
 * Opens database connection
 */
MsSqlAdapter.prototype.open = function(callback)
{
    callback = callback || function() {};
    var self = this;
    if (this.rawConnection) {
        callback.call(self);
        return;
    }

    self.rawConnection = new mssql.Connection(self.options);
    self.rawConnection.connect(function(err) {
        if (err) {
            self.rawConnection=null;
            console.log(err);
        }
        callback.call(self, err);
    });

}

MsSqlAdapter.prototype.close = function() {
    var self = this;
    if (!self.rawConnection)
        return;

    self.rawConnection.close(function (err) {
        if (err) {
            console.log(err);
            //do nothing
            self.rawConnection = null;
        }
    });
}
/**
 * Begins a data transaction and executes the given function
 * @param fn {Function}
 * @param callback {Function}
 */
MsSqlAdapter.prototype.executeInTransaction = function(fn, callback) {
    var self = this;
    //ensure callback
    callback = callback || function () {
    };

    //ensure that database connection is open
    self.open(function (err) {
        if (err) {
            callback.call(self, err);
            return;
        }
        //check if transaction is already defined (as object)
        if (self.transaction) {
            //so invoke method
            fn.call(self, function (err) {
                //call callback
                callback.call(self, err);
            });
        }
        else {
            //create transaction
            self.transaction = new mssql.Transaction(self.rawConnection);
            //begin transaction
            self.transaction.begin(function(err) {
                //error check (?)
                if (err) {
                    console.log(err);
                    callback.call(self, err);
                }
                else {
                    try {
                        fn.call(self, function (err) {
                            try {
                                if (err) {
                                    if (self.transaction) {
                                        self.transaction.rollback();
                                        self.transaction=null;
                                    }
                                    callback.call(self, err);
                                }
                                else {
                                    if (typeof self.transaction === 'undefined' || self.transaction === null) {
                                        callback.call(self, new Error('Database transaction cannot be empty on commit.'));
                                        return;
                                    }
                                    self.transaction.commit(function (err) {
                                        if (err) {
                                            self.transaction.rollback();
                                        }
                                        self.transaction = null;
                                        callback.call(self, err);
                                    });
                                }
                            }
                            catch (e) {
                                callback.call(self, e);
                            }
                        });
                    }
                    catch (e) {
                        callback.call(self, e);
                    }

                }
            });

           /* self.transaction.on('begin', function() {
                console.log('begin transaction');
            });*/



        }
    });
}

/**
 * Executes an operation against database and returns the results.
 * @param batch {DataModelBatch}
 * @param callback {Function}
 */
MsSqlAdapter.prototype.executeBatch = function(batch, callback) {
    var self = this;
    //validate callback existence
    callback = callback || function () {};
    //validate the presence of appliesTo property
    if (batch.appliesTo==null)
    {
        //appliesTo is null so execute callback with error and return
        callback.call(self,new Error('The target adapter cannot be empty at this context.'));
        return;

    }
    //begin transaction
    self.executeInTransaction(function(tr) {
        //prepare query
        var query = util.format('INSERT INTO %s VALUES (?)', batch.appliesTo);
        //execute series
        async.eachSeries(batch.add, function(obj, seriesCallback)
        {
            //execute query with the object specified
            self.execute(query, obj, function (err, result) {
                //if error occured leave series to handle it
                if (err) { seriesCallback(err); return; }
                //get model primary key
                var key = batch.model.key();
                //if key exists and result is not null
                if ((key!=null) && (result!=null))
                {
                    //check insertedId result
                    if (result.insertId)
                    //and set object's primary key
                        obj[key.name] = result.insertId;
                }
                //continue series (callback(null))
                seriesCallback(null);
            });
        }, function(err) {
            //commit or rollback transaction according to error
            tr(err);
        });
    }, function (err) {
        //execute callback the callback specified in batch operation
        callback.call(self, err);
    });
}

/**
 * Produces a new identity value for the given entity and attribute.
 * @param entity {String} The target entity name
 * @param attribute {String} The target attribute
 * @param callback {Function=}
 */
MsSqlAdapter.prototype.selectIdentity = function(entity, attribute , callback) {

    var self = this;

    var migration = {
        appliesTo:'increment_id',
        model:'increments',
        version:'1.0',
        description:'Increments migration (version 1.0)',
        add:[
            { name:'id', type:'Counter', primary:true },
            { name:'entity', type:'Text', size:120 },
            { name:'attribute', type:'Text', size:120 },
            { name:'value', type:'Integer' }
        ]
    }
    //ensure increments entity
    self.migrate(migration, function(err)
    {
        //throw error if any
        if (err) { callback.call(self,err); return; }

        self.execute('SELECT * FROM increment_id WHERE entity=? AND attribute=?', [entity, attribute], function(err, result) {
            if (err) { callback.call(self,err); return; }
            if (result.length==0) {
                //get max value by querying the given entity
                var q = qry.query(entity).select([qry.fields.max(attribute)]);
                self.execute(q,null, function(err, result) {
                    if (err) { callback.call(self, err); return; }
                    var value = 1;
                    if (result.length>0) {
                        value = parseInt(result[0][attribute]) + 1;
                    }
                    self.execute('INSERT INTO increment_id(entity, attribute, value) VALUES (?,?,?)',[entity, attribute, value], function(err) {
                        //throw error if any
                        if (err) { callback.call(self, err); return; }
                        //return new increment value
                        callback.call(self, err, value);
                    });
                });
            }
            else {
                //get new increment value
                var value = parseInt(result[0].value) + 1;
                self.execute('UPDATE increment_id SET value=? WHERE id=?',[value, result[0].id], function(err) {
                    //throw error if any
                    if (err) { callback.call(self, err); return; }
                    //return new increment value
                    callback.call(self, err, value);
                });
            }
        });
    });
};

/**
 * @param query {*}
 * @param values {*}
 * @param {function} callback
 */
MsSqlAdapter.prototype.execute = function(query, values, callback) {
    var self = this, sql = null;
    try {

        if (typeof query == 'string') {
            //get raw sql statement
            //todo: this operation may be obsolete (for security reasons)
            sql = query;
        }
        else {
            //format query expression or any object that may be act as query expression
            var formatter = new MsSqlFormatter();
            sql = formatter.format(query);
            //todo: pass current database connection in order to calculate custom query expressions
            //e.g. qry.format(q, db)
        }
        //validate sql statement
        if (typeof sql !== 'string') {
            callback.call(self, new Error('The executing command is of the wrong type or empty.'));
            return;
        }
        //ensure connection
        self.open(function(err) {
            if (err) {
                callback.call(self, err);
            }
            else {
                //todo: validate statement for sql injection (e.g single statement etc)
                //log statement (optional)
                if (process.env.NODE_ENV==='development')
                    console.log(util.format('SQL:%s, Parameters:%s', sql, JSON.stringify(values)));
                //execute raw command
                var request = self.transaction ? new mssql.Request(self.transaction) : new mssql.Request(self.rawConnection);
                var preparedSql=self.prepare(sql , values);
                 if(typeof query.$insert!=='undefined')
                     preparedSql+= ';SELECT @@IDENTITY as insertId'
                request.query(preparedSql, function(err, result) {
                    if(typeof query.$insert==='undefined')
                        callback.call(self, err, result);
                    else {
                        if (result) {
                            if(result.length>0)
                                callback.call(self, err, { insertId:result[0].insertId });
                            else
                                callback.call(self, err, result);
                        }
                        else {
                            callback.call(self, err, result);
                        }
                    }
                });
            }
        });
    }
    catch (e) {
        callback.call(self, e);
    }

};
/**
 * Formats an object based on the format string provided. Valid formats are:
 * %t : Formats a field and returns field type definition
 * %f : Formats a field and returns field name
 * @param format {string}
 * @param obj {*}
 */
MsSqlAdapter.format = function(format, obj)
{
    var result = format;
    if (/%t/.test(format))
        result = result.replace(/%t/g,MsSqlAdapter.formatType(obj));
    if (/%f/.test(format))
        result = result.replace(/%f/g,obj.name);
    return result;
}

MsSqlAdapter.formatType = function(field)
{
    var size = parseInt(field.size);
    var s = 'varchar(512) NULL';
    var type=field.type,
        cfg = require('./data-configuration'),
        dataType=cfg.current.dataTypes[field.type];
    if (dataType)
        if (dataType.sqlType)
            type=dataType.sqlType;
    switch (type)
    {
        case 'Boolean':
            s = 'bit';
            break;
        case 'Byte':
            s = 'tinyint';
            break;
        case 'Number':
        case 'Float':
            s = 'float';
            break;
        case 'Counter':
            return 'int IDENTITY (1,1) NOT NULL';
        case 'Currency':
        case 'Decimal':
            s =  util.format('decimal(%s,0)', size>0? size: 10);
            break;
        case 'Date':
            s = 'date';
            break;
        case 'DateTime':
        case 'Time':
            s = 'datetime';
            break;
        case 'Integer':
        case 'Duration':
            s = 'int';
            break;
        case 'URL':
            if (size>0)
                s =  util.format('varchar(%s)', size);
            else
                s =  'varchar(512)';
            break;
        case 'Text':
            if (size>0)
                s =  util.format('varchar(%s)', size);
            else
                s =  'varchar(512)';
            break;
        case 'Note':
            if (size>0)
                s =  util.format('varchar(%s)', size);
            else
                s =  'text';
            break;
        case 'Image':
        case 'Binary':
            s ='binary';
            break;
        case 'Guid':
            s = 'varchar(36)';
            break;
        case 'Short':
            s = 'smallint';
            break;
        default:
            s = 'int';
            break;
    }
    s += field.nullable===undefined ? ' NULL': field.nullable ? ' NULL': ' NOT NULL';
    return s;
}
/**
 * @param query {QueryExpression}
 */
MsSqlAdapter.prototype.createView = function(name, query, callback) {
    var self = this;
    //open database
    self.open(function(err) {
        if (err) {
            callback.call(self, err);
            return;
        }
        var db = self.rawConnection;
        //begin transaction
        self.executeInTransaction(function(tr)
        {
            async.waterfall([
                function(cb) {

                   self.execute ("SELECT COUNT(*) AS count FROM sys.objects  WHERE name=? AND type='v'", [ name ],function(err, result) {
                        if (err) { throw err; }
                        if (result.length==0)
                            return cb(null, 0);
                        cb(null, result[0].count);
                    });
                },
                function(arg, cb) {
                    if (arg==0) { cb(null, 0); return; }
                    //format query
                    var sql = util.format("DROP VIEW dbo.%s",name);
                    self.execute(sql, null, function(err, result) {
                        if (err) { throw err; }
                        cb(null, 0);
                    });
                },
                function(arg, cb) {
                    //format query
                    var formatter = new MsSqlFormatter();
                    var sql = util.format("EXECUTE(\'CREATE VIEW dbo.%s AS %s\')", name, formatter.format(query));
                    console.log(util.format('CREATE VIEW: %s', sql));
                    self.execute(sql, null, function(err, result) {
                        if (err) { throw err; }
                        cb(null, 0);
                    });
                }
            ], function(err) {
                if (err) { tr(err); return; }
                tr(null);
            })
        }, function(err) {
            callback(err);
        });
    });

}

/**
 *
 * @param obj {DataModelMigration|*} An Object that represents the data model scheme we want to migrate
 * @param callback {Function}
 */
MsSqlAdapter.prototype.migrate = function(obj, callback) {
    if (obj==null)
        return;
    var self = this;
    var migration = obj;
    if (migration.appliesTo==null)
        throw new Error("Model name is undefined");
    self.open(function(err) {
        if (err) {
            callback.call(self, err);
        }
        else {
            async.waterfall([
                //1. Check migrations table existence
                function(cb) {
                    if (MsSqlAdapter.supportMigrations) {
                        cb(null, 1);
                        return;
                    }
                    self.execute("SELECT COUNT(*) AS count FROM sys.objects WHERE name=? and type='u'",
                        ['migrations'], function(err, result) {
                            if (err) { cb(err); return; }
                            MsSqlAdapter.supportMigrations=(result[0].count>0);
                            cb(null, result[0].count);
                        });
                },
                //2. Create migrations table if not exists
                function(arg, cb) {
                    if (arg>0) { cb(null, 0); return; }
                    //create migrations table
                    self.execute('CREATE TABLE migrations(id int IDENTITY(1,1) NOT NULL, ' +
                            'appliesTo varchar(80) NOT NULL, model varchar(120) NULL, description varchar(512),version varchar(40) NOT NULL, PRIMARY KEY(id))',
                        ['migrations'], function(err, result) {
                            if (err) { cb(err); return; }
                            cb(null, 0);
                        });
                },
                //3. Check if migration has already been applied
                function(arg, cb) {
                    self.execute('SELECT COUNT(*) AS count FROM migrations WHERE appliesTo=? and version=?',
                        [migration.appliesTo, migration.version], function(err, result) {
                            if (err) { cb(err); return; }
                            cb(null, result[0].count);
                        });
                },
                //4a. Check table existence
                function(arg, cb) {
                    //migration has already been applied
                    if (arg>0) { obj['updated']=true; cb(null, -1); return; }
                    self.execute('SELECT COUNT(*) AS count FROM sys.objects WHERE name=?',
                        [migration.appliesTo], function(err, result) {
                            if (err) { cb(err); return; }
                            cb(null, result[0].count);
                        });
                },
                //4b. Get table columns
                function(arg, cb) {
                    //migration has already been applied
                    if (arg<0) { cb(null, [arg, null]); return; }
                    self.execute('SELECT c.name AS columnName, c.column_id as ordinal, t.name as dataType,' +
                            'c.max_length as maxLength, c.is_nullable AS  isNullable, object_definition(c.default_object_id) AS defaultValue ' +
                            'FROM sys.columns c INNER JOIN sys.types AS t ON c.user_type_id=t.user_type_id WHERE OBJECT_NAME(c.OBJECT_ID)=?',
                        [migration.appliesTo], function(err, result) {
                            if (err) { cb(err); return; }
                            cb(null, [arg, result]);
                        });
                },
                //5. Migrate target table (create or alter)
                function(args, cb)
                {
                    //migration has already been applied
                    if (args[0]<0) { cb(null, args[0]); return; }
                    var columns = args[1];
                    if (args[0]==0) {
                        //create table and
                        var strFields = array(migration.add).where(function(x) {
                            return !x.oneToMany
                        }).select(
                            function(x) {
                                return MsSqlAdapter.format('%f %t', x);
                            }).toArray().join(', ');
                        var key = array(migration.add).firstOrDefault(function(x) { return x.primary; });
                        var sql = util.format('CREATE TABLE %s (%s, PRIMARY KEY(%s))', migration.appliesTo, strFields, key.name);
                        self.execute(sql, null, function(err, result)
                        {
                            if (err) { cb(err); return; }
                            cb(null, 1);
                            return;
                        });

                    }
                    else {
                        var expressions = []
                        //1. enumerate fields to delete
                        if (migration.remove) {
                            for(i=0;i<migration.remove.length;i++) {
                                var column = array(columns).firstOrDefault(function(x) { return x.columnName == migration.remove[i].name; });
                                if (column!=null) {
                                    var k= 1, deletedColumnName =util.format('xx%s1_%s', k.toString(), column.columnName);
                                    while(array(columns).firstOrDefault(function(x) { return x.columnName == deletedColumnName; })!=null) {
                                        k+=1;
                                        deletedColumnName =util.format('xx%s_%s', k.toString(), column.columnName);
                                    }
                                    expressions.push(util.format('sp_rename \'%s.%s\', \'%s\', \'COLUMN\'', migration.appliesTo, column.columnName, deletedColumnName));
                                }
                            }
                        }

                        //2. enumerate fields to add
                        if (migration.add)
                        {
                            for(i=0;i<migration.add.length;i++)
                            {
                                //check if field exists or not
                                var column = array(columns).firstOrDefault(function(x) { return x.columnName == migration.add[i].name; });
                                if (column==null)
                                {
                                    //add expression for adding column
                                    expressions.push(util.format('ALTER TABLE %s ADD %s %s', migration.appliesTo, migration.add[i].name, MsSqlAdapter.formatType(migration.add[i])));
                                }
                            }
                        }

                        //3. enumerate fields to update
                        if (migration.change) {
                            for(var i=0;i<migration.change.length;i++) {
                                var column = array(columns).firstOrDefault(function(x) { return x.columnName == migration.change[i].name; });
                                if (column!=null) {
                                    //important note: Alter column operation is not supported for column types
                                    //todo:validate basic column altering exceptions (based on database engine rules)
                                    expressions.push(util.format('ALTER TABLE %s ALTER COLUMN %s %s', migration.appliesTo, migration.add[i].name, MsSqlAdapter.formatType(migration.change[i])));
                                }
                            }
                        }

                        if (expressions.length>0) {
                            self.execute(expressions.join(';'), null, function(err)
                            {
                                if (err) { cb(err); return; }
                                cb(null, 1);
                                return;
                            });
                        }
                        else
                            cb(null, 2);
                    }
                }, function(arg, cb) {

                    if (arg>0) {
                        //log migration to database
                        self.execute('INSERT INTO migrations (appliesTo,model,version,description) VALUES (?,?,?,?)', [migration.appliesTo,
                            migration.model,
                            migration.version,
                            migration.description ], function(err, result)
                        {
                            if (err) throw err;
                            cb(null, 1);
                            return;
                        });
                    }
                    else
                        cb(null, arg);

                }
            ], function(err, result) {
                callback(err, result);
            });
        }
    });

}

MsSqlAdapter.queryFormat = function (query, values) {
    if (!values) return query;
    return query.replace(/:(\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
            return this.escape(values[key]);
        }
        return txt;
    }.bind(this));
};
/**
 * @class MsSqlFormatter
 * @constructor
 * @augments {SqlFormatter}
 */
function MsSqlFormatter() {
    this.settings = {
        nameFormat:'[$1]'
    }
}
util.inherits(MsSqlFormatter, qry.classes.SqlFormatter);

MsSqlFormatter.prototype.formatLimitSelect = function(obj) {

    var sql=null, self=this;
    if (!obj.$take) {
        sql=this.formatSelect(obj);
    }
    else {
        obj.$take= parseInt(obj.$take) || 0;
        obj.$skip= parseInt(obj.$skip) || 0;
        //add row_number with order
        var keys = Object.keys(obj.$select);
        if (keys.length == 0)
            throw new Error('Entity is missing');
        var qfields = obj.$select[keys[0]], order =obj.$order;
        qfields.push(util.format('ROW_NUMBER() OVER(%s) AS __RowIndex', order ? self.format(order, '%o') : 'ORDER BY (SELECT NULL)'));
        if (order)
            delete obj.$order;
        var subQuery = self.formatSelect(obj);
        if (order)
            obj.$order = order;
        //delete row index field
        qfields.pop();
        var fields = [];
        array(qfields).each(function (x) {
            if (typeof x === 'string') {
                fields.push(new qry.classes.QueryField(x));
            }
            else {
                var field = util._extend(new qry.classes.QueryField(), x);
                fields.push(field.as() || field.name());
            }
        });

        var sql = util.format('SELECT %s FROM (%s) t0 WHERE __RowIndex BETWEEN %s AND %s', array(fields).select(function (x) {
            return self.format(x, '%f');
        }).toArray().join(', '), subQuery, obj.$skip + 1, obj.$skip + obj.$take);
    }

    return sql;
}

/**
 * Implements indexOf(str,substr) expression formatter.
 * @param {String} p0 The source string
 * @param {String} p1 The string to search for
 */
MsSqlFormatter.prototype.$indexof = function(p0, p1)
{
    p1='%'+ p1+ '%';
    var result = 'PATINDEX('.concat( this.escape(p1),',',this.escape(p0),')');
    return result;
};


/**
 * Escapes an object or a value and returns the equivalen sql value.
 * @param {*} value
 */
MsSqlFormatter.prototype.escape = function(value,unquoted)
{
    if (value==null || typeof value==='undefined')
        return mysql.escape(null);

    if(typeof value==='string')
        return '\'' + value.replace(/'/g, "''") + '\'';

    if (typeof value==='boolean')
        return value ? 1 : 0;
    if (typeof value === 'object')
    {
        //add an exception for Date object
        if (value instanceof Date)
            return mysql.escape(value);
        if (value.hasOwnProperty('$name'))
            return value.$name;
    }
    if (unquoted)
        return value.valueOf();
    else
        return mysql.escape(value);
}


/**
 * Implements startsWith(a,b) expression formatter.
 * @param p0 {*}
 * @param p1 {*}
 */
MsSqlFormatter.prototype.$startswith = function(p0, p1)
{

    p1='%' +p1 + '%';
    // (PATINDEX('%S%',  UserData.alternateName))
    var result= util.format('PATINDEX (%s,%s)', this.escape(p1), this.escape(p0));
    return result;

};

/**
 * Implements endsWith(a,b) expression formatter.
 * @param p0 {*}
 * @param p1 {*}
 */
MsSqlFormatter.prototype.$endswith = function(p0, p1)
{
    p1='%' +p1;
    // (PATINDEX('%S%',  UserData.alternateName))
    var result= util.format('(CASE WHEN %s like %s THEN 1 ELSE 0 END)', this.escape(p0), this.escape(p1));
    return result;
};


/**
 * Implements substring(str,pos) expression formatter.
 * @param {String} p0 The source string
 * @param {Number} pos The starting position
 * @param {Number=} length The length of the resulted string
 * @returns {string}
 */
MsSqlFormatter.prototype.$substring = function(p0, pos, length)
{
    if (length)
        return util.format('SUBSTRING(%s,%s,%s)', this.escape(p0), pos.valueOf()+1, length.valueOf());
    else
        return util.format('SUBSTRING(%s,%s,%s)', this.escape(p0), pos.valueOf()+1,255);
};

/**
 * Implements trim(a) expression formatter.
 * @param p0 {*}
 */
MsSqlFormatter.prototype.$trim = function(p0)
{
    return util.format('LTRIM(RTRIM((%s)))', this.escape(p0));
};

if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @class MsSqlAdapter
         * */
        MsSqlAdapter : MsSqlAdapter,
        /**
         * @class MsSqlFormatter
         * */
        MsSqlFormatter : MsSqlFormatter,
        /**
         * Creates an instance of MsSqlAdapter object that represents a MsSql database connection.
         * @param options An object that represents the properties of the underlying database connection.
         * @returns {DataAdapter}
         */
        createInstance: function(options) {
            return new MsSqlAdapter(options);
        },
        /**
         * Formats the query command by using the object provided e.g. SELECT * FROM Table1 WHERE id=:id
         * @param query {string}
         * @param values {*}
         */
        queryFormat: function(query, values) {
            return MsSqlAdapter.queryFormat(query, values);
        }

    }
}