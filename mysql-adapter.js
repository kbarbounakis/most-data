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
var mysql = require('mysql'),
    async = require('async'),
    util = require('util'),
    array = require('most-array'),
    qry = require('most-query'),
    model = require('./data-model'),
    __types__ = require('./types');

function MySqlQueryArgs() {
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
function MySqlAdapter(options)
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

}

/**
 * Opens database connection
 */
MySqlAdapter.prototype.open = function(callback)
{
    callback = callback || function() {};
    var self = this;
    if (this.rawConnection) {
        callback.call(self);
        return;
    }

    if (self.connectionPooling) {
        if (typeof MySqlAdapter.pool === 'undefined') {
            //todo::use dns.resolve to change domain names to ip (for better performance)
            MySqlAdapter.pool = mysql.createPool(this.options);
        }

        MySqlAdapter.pool.getConnection(function(err, connection) {
            if (err) {
                console.log(err);
                callback.call(self, err);
            }
            else {
                self.rawConnection = connection;
                callback.call(self);
            }
        });
    }
    else {
        this.rawConnection = mysql.createConnection(this.options);
        this.rawConnection.connect(function(err) {
            if (err) {
                console.log(err);
                callback.call(self, err);
            }
            else {
                callback.call(self);
            }
        });
    }
}

MySqlAdapter.prototype.close = function() {
    var self = this;
    if (!self.rawConnection)
        return;
    if (self.connectionPooling) {
        self.rawConnection.release();
        self.rawConnection=null;
    }
    else {
        self.rawConnection.end(function(err) {
            if (err) {
                console.log(err);
                //do nothing
                self.rawConnection=null;
            }
        });
    }
}
/**
 * Begins a data transaction and executes the given function
 * @param fn {Function}
 * @param callback {Function}
 */
MySqlAdapter.prototype.executeInTransaction = function(fn, callback)
{
    var self = this;
    //ensure callback
    callback = callback || function () {};
    //ensure that database connection is open
    self.open(function(err) {
        if (err) {
            callback.call(self,err);
            return;
        }
        //execution is already in transaction
        if (self.__transaction) {
            //so invoke method
            fn.call(self, function(err)
            {
                //call callback
                callback.call(self, err);
            });
            //and return
            return;
        }
        else {
            self.execute('START TRANSACTION',null, function(err) {
                if (err) {
                    callback.call(self, err);
                }
                else {
                    //set transaction flag to true
                    self.__transaction = true;
                    try {
                        //invoke method
                        fn.call(self, function(error)
                        {
                            if (error) {
                                //rollback transaction
                                self.execute('ROLLBACK', null, function(err) {
                                    //st flag to false
                                    self.__transaction = false;
                                    //call callback
                                    callback.call(self, error);
                                });
                            }
                            else {
                                //commit transaction
                                self.execute('COMMIT', null, function(err) {
                                    //set flag to false
                                    self.__transaction = false;
                                    //call callback
                                    callback.call(self, err);
                                });
                            }
                        });
                    }
                    catch(e) {
                        //rollback transaction
                        self.execute('ROLLBACK', null, function(err) {
                            //set flag to false
                            self.__transaction = false;
                            //call callback
                            callback.call(self, e);
                        });
                    }

                }
            });
        }
    });

}

/**
 * Executes an operation against database and returns the results.
 * @param batch {DataModelBatch}
 * @param callback {Function}
 */
MySqlAdapter.prototype.executeBatch = function(batch, callback) {
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
        var query = util.format('INSERT INTO %s SET ?', batch.appliesTo);
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
MySqlAdapter.prototype.selectIdentity = function(entity, attribute , callback) {

    var self = this;

    var migration = {
        appliesTo:'increment_id',
        model:'increments',
        description:'Increments migration (version 1.0)',
        version:'1.0',
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
MySqlAdapter.NAME_FORMAT = '`$1`';
/**
 * @param query {*}
 * @param values {*}
 * @param {function} callback
 */
MySqlAdapter.prototype.execute = function(query, values, callback) {
    var self = this, sql = null;
    try {

        if (typeof query == 'string') {
            //get raw sql statement
            //todo: this operation may be obsolete (for security reasons)
            sql = query;
        }
        else {
            //format query expression or any object that may be act as query expression
            var formatter = new qry.classes.SqlFormatter();
            formatter.settings.nameFormat = MySqlAdapter.NAME_FORMAT;
            sql = formatter.format(query);
            //todo: pass current database connection in order to calculate custom query expressions
            //e.g. formatter.format(q, db)
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
                self.rawConnection.query(sql, values, function(err, result) {
                    callback.call(self, err, result);
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
MySqlAdapter.format = function(format, obj)
{
    var result = format;
    if (/%t/.test(format))
        result = result.replace(/%t/g,MySqlAdapter.formatType(obj));
    if (/%f/.test(format))
        result = result.replace(/%f/g,obj.name);
    return result;
}

MySqlAdapter.formatType = function(field)
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
            s = 'tinyint(1)';
            break;
        case 'Byte':
            s = 'tinyint';
            break;
        case 'Number':
        case 'Float':
            s = 'float';
            break;
        case 'Counter':
            return 'int(11) AUTO_INCREMENT NOT NULL';
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
            s = 'int(11)';
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
            s = size > 0 ? util.format('blob(%s)', size) : 'blob';
            break;
        case 'Guid':
            s = 'varchar(36)';
            break;
        case 'Short':
            s = 'smallint';
            break;
        default:
            s = 'int(11)';
            break;
    }
    s += field.nullable===undefined ? ' NULL': field.nullable ? ' NULL': ' NOT NULL';
    return s;
}
/**
 * @param query {QueryExpression}
 */
MySqlAdapter.prototype.createView = function(name, query, callback) {
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
                    db.query("SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_NAME=? AND TABLE_TYPE='VIEW' AND TABLE_SCHEMA=DATABASE()", [ name ],function(err, result) {
                        if (err) { throw err; }
                        if (result.length==0)
                            return cb(null, 0);
                        cb(null, result[0].count);
                    });
                },
                function(arg, cb) {
                    if (arg==0) { cb(null, 0); return; }
                    //format query
                    var sql = util.format("DROP VIEW %s",name);
                    db.query(sql, null, function(err, result) {
                        if (err) { throw err; }
                        cb(null, 0);
                    });
                },
                function(arg, cb) {
                    //format query
                    var formatter = new qry.classes.SqlFormatter();
                    formatter.settings.nameFormat = MySqlAdapter.NAME_FORMAT;
                    var sql = util.format("CREATE VIEW `%s` AS %s", name, formatter.format(query));
                    console.log(util.format('CREATE VIEW: %s', sql));
                    db.query(sql, null, function(err, result) {
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
MySqlAdapter.prototype.migrate = function(obj, callback) {
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
            var db = self.rawConnection;
            async.waterfall([
                //1. Check migrations table existence
                function(cb) {
                    if (MySqlAdapter.supportMigrations) {
                        cb(null, 1);
                        return;
                    }
                    self.execute('SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_NAME=? AND TABLE_SCHEMA=DATABASE()',
                        ['migrations'], function(err, result) {
                            if (err) { cb(err); return; }
                            MySqlAdapter.supportMigrations=(result[0].count>0);
                            cb(null, result[0].count);
                        });
                },
                //2. Create migrations table if not exists
                function(arg, cb) {
                    if (arg>0) { cb(null, 0); return; }
                    //create migrations table
                    self.execute('CREATE TABLE migrations(id int(11) AUTO_INCREMENT NOT NULL, ' +
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
                    //migration has already been applied (set migration.updated=true)
                    if (arg>0) { obj['updated']=true; cb(null, -1); return; }
                    self.execute('SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_NAME=? AND TABLE_SCHEMA=DATABASE()',
                        [migration.appliesTo], function(err, result) {
                            if (err) { cb(err); return; }
                            cb(null, result[0].count);
                        });
                },
                //4b. Get table columns
                function(arg, cb) {
                    //migration has already been applied
                    if (arg<0) { cb(null, [arg, null]); return; }
                    self.execute('SELECT COLUMN_NAME AS columnName, ORDINAL_POSITION as ordinal, DATA_TYPE as dataType,' +
                            'CHARACTER_MAXIMUM_LENGTH as maxLength, IS_NULLABLE AS  isNullable, COLUMN_DEFAULT AS defaultValue ' +
                            'FROM information_schema.COLUMNS WHERE TABLE_NAME=? AND TABLE_SCHEMA=DATABASE()',
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
                                return MySqlAdapter.format('%f %t', x);
                            }).toArray().join(', ');
                        var key = array(migration.add).firstOrDefault(function(x) { return x.primary; });
                        var sql = util.format('CREATE TABLE `%s` (%s, PRIMARY KEY(%s))', migration.appliesTo, strFields, key.name);
                        db.query(sql, null, function(err, result)
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
                                    expressions.push(util.format('ALTER TABLE %s CHANGE COLUMN %s %s', migration.appliesTo, column.columnName, deletedColumnName));
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
                                    expressions.push(util.format('ALTER TABLE %s ADD COLUMN %s %s', migration.appliesTo, migration.add[i].name, MySqlAdapter.formatType(migration.add[i])));
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
                                    expressions.push(util.format('ALTER TABLE %s MODIFY COLUMN %s %s', migration.appliesTo, migration.add[i].name, MySqlAdapter.formatType(migration.change[i])));
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
                        db.query('INSERT INTO migrations SET ?', { appliesTo:migration.appliesTo,
                            model:migration.model,
                            version:migration.version,
                            description:migration.description }, function(err, result)
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

MySqlAdapter.queryFormat = function (query, values) {
    if (!values) return query;
    return query.replace(/:(\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
            return this.escape(values[key]);
        }
        return txt;
    }.bind(this));
};

if (typeof exports !== 'undefined')
{
    module.exports = {
        /**
         * @class MySqlAdapter
         * */
        MySqlAdapter : MySqlAdapter,
        /**
         * Creates an instance of MySqlAdapter object that represents a MySql database connection.
         * @param options An object that represents the properties of the underlying database connection.
         * @returns {DataAdapter}
         */
        createInstance: function(options) {
            return new MySqlAdapter(options);
        },
        /**
         * Formats the query command by using the object provided e.g. SELECT * FROM Table1 WHERE id=:id
         * @param query {string}
         * @param values {*}
         */
        queryFormat: function(query, values) {
            return MySqlAdapter.queryFormat(query, values);
        }

    }
}