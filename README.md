# MOST Web Framework Data Module

The most-data module is the main ORM module of [MOST Web Framework](https://github.com/kbarbounakis/most-web) applications and enables developers
to write scalable data-driven applications and services.

## Features
### JSON schema based data modelling
Each data model is represented by a JSON schema which contains the complete model definition including fields, constraints,
triggers, associations, privileges, data views etc:

    {
    	"name": "User", "id": 90, "title": "Users", "inherits": "Account", "hidden": false, "sealed": false, "abstract": false, "version": "1.4",
    	"fields": [
    		{
    			"name": "id", "title": "Id", "description": "The identifier of the item.",
    			"type": "Integer",
    			"nullable": false,
    			"primary": true
    		},
            {
                "name": "accountType",  "title": "Account Type", "description": "Contains a set of flags that define the type and scope of an account object.",
                "type": "Integer",
                "readonly":true,
                "value":"javascript:return 0;"
            },
    		{
    			"name": "lockoutTime", "title": "Lockout Time", "description": "The date and time that this account was locked out.",
    			"type": "DateTime",
    			"readonly": true
    		},
    		{
    			"name": "logonCount", "title": "Logon Count", "description": "The number of times the account has successfully logged on.",
    			"type": "Integer",
    			"value": "javascript:return 0;",
    			"readonly": true
    		},
    		{
    			"name": "enabled", "title": "Enabled", "description": "Indicates whether a user is enabled or not.",
    			"type": "Boolean",
    			"nullable": false,
    			"value": "javascript:return true;"
    		},
    		{
    			"name": "lastLogon", "title": "Last Logon", "description": "The last time and date the user logged on.",
    			"type": "DateTime",
    			"readonly": true
    		},
    		{
    			"name": "groups", "title": "User Groups", "description": "A collection of groups where user belongs.",
    			"type": "Group",
    			"expandable": true,
    			"mapping": {
    				"associationAdapter": "GroupMembers", "parentModel": "Group",
    				"parentField": "id", "childModel": "User", "childField": "id",
    				"associationType": "junction", "cascade": "delete",
    				"select": [
    					"id",
    					"name",
    					"alternateName"
    				]
    			}
    		},
    		{
    			"name": "additionalType",
                "value":"javascript:return this.model.name;",
                "readonly":true
    		},
    		{
    			"name": "accountType",
    			"value": "javascript:return 0;"
    		}
    	], "privileges":[
            { "mask":1, "type":"self", "filter":"id eq me()" },
            { "mask":15, "type":"global", "account":"*" }
        ],
        "constraints":[
            {
                "description": "User name must be unique across different records.",
                "type":"unique",
                "fields": [ "name" ]
            }
        ],
    	"views": [
    		{
    			"name":"list", "title":"Users List", "fields":[
                    { "name":"id", "hidden":true },
                    { "name":"description" },
                    { "name":"name" },
                    { "name":"enabled" },
                    { "name":"dateCreated" },
    			    { "name":"dateModified" }
    		    ], "order":"dateModified desc"
    		}
        ],
        "eventListeners": [
    		{ "name":"New User Credentials Provider", "type":"/app/controllers/user-credentials-listener" }
        ],
        "seed":[
            {
                "name":"anonymous",
                "description":"Anonymous User",
                "groups":[
                    { "name":"Guests" }
                ]
            },
    		{
    			"name":"admin@example.com",
    			"description":"Site Administrator",
    			"groups":[
    				{ "name":"Administrators" }
    			]
    		}
        ]
    }
## Automatic data model migration
Each data model will be automatically migrated after its first use.
DataModel.version property enables data model versioning:

    {
        "name": "User", "id": 90, "title": "Users", "inherits": "Account", "hidden": false,
        "sealed": false, "abstract": false, "version": "1.4",
        "fields": [ .. ]
        ...
    }

## Data model inheritance
MOST data models support model inheritance. DataModel.inherits property defines the inherited model of data model.

    //User model inherits Account model
    {
        "name": "User", "id": 90, "title": "Users", "inherits": "Account", "hidden": false,
        "sealed": false, "abstract": false, "version": "1.4",
        "fields": [ .. ]
        ...
    }

## Data object constraint validation
Each data model may have one or more constraints for validating data object state:

    //User model has a unique constraint based on user name.
    ...
    "constraints":[
        {
            "description": "User name must be unique across different records.",
            "type":"unique",
            "fields": [ "name" ]
        }
    ]
    ...

## Data field validation
Data field definition allows developers to specify validation rules (nullable, readonly etc):

    ...
    {
        "name": "enabled", "title": "Enabled", "description": "Indicates whether a user is enabled or not.",
        "type": "Boolean",
        "nullable": false,
        "value": "javascript:return true;"
    },
    {
        "name": "dateCreated",
        "title": "Date Created",
        "description": "The date on which this item was created.",
        "type": "Date",
        "value":"javascript:return (new Date());",
        "readonly":true
    }
    ...

## Default and calculated values
Data field definition allows developers to specify default and calculated values:

    ...
    {
        "name": "dateModified",
        "title": "Date Modified",
        "description": "The date on which this item was most recently modified.",
        "type": "Date",
        "readonly":true,
        "value":"javascript:return (new Date());",
        "calculation":"javascript:return (new Date());"
    }
    ...

## Data Model one-to-many associations
Each data model may have one-to-many associations with other models.

    {
        "name": "Order", "id": 449, "title": "Order", "hidden": false, ...
        "fields": [
            ...
            {
                "name": "customer",
                "title": "Customer",
                "description": "Party placing the order.",
                "type": "Party",
                "expandable":true
            }
            ...
        ]
    }

## Data Model many-to-many associations
A data model may have many-to-many assocations with other models.

    ...
    {
        "name": "groups", "title": "User Groups", "description": "A collection of groups where user belongs.",
        "type": "Group",
        "expandable": true,
        "mapping": {
            "associationAdapter": "GroupMembers", "parentModel": "Group",
            "parentField": "id", "childModel": "User", "childField": "id",
            "associationType": "junction", "cascade": "delete"
        }
    }
    ...

## Data object filtering
The most-data module enables advanced data object filtering:

        //get customers orders with status delivered
        context.model('Order').where('orderStatus/alternateName').equal('OrderedDelivered')
        .and("customer").equal(257)
         .list().then(function(result) {
                done(null, result);
            }).catch(function(err) {
                done(err);
            });

[DataQueryable](https://docs.themost.io/most-data/DataQueryable.html) class offers a wide set of methods for
filtering, paging, ordering and grouping data objects.
## Data object ordering
The most-data module enables advanced data object ordering:

    //get orders order by order date
    context.model('Order').where('orderStatus/alternateName').equal('OrderProcessing')
    .orderBy('orderDate').thenBy('paymentMethod/name')
     .list().then(function(result) {
            done(null, result);
        }).catch(function(err) {
            done(err);
        });

## Data object paging
Use paging parameters for retrieved a paged resultset.

    //skip 15 orders and take next 15
    context.model('Order').where('orderStatus/alternateName').equal('OrderProcessing')
    .take(15).skip(15)
     .list().then(function(result) {
            done(null, result);
        }).catch(function(err) {
            done(err);
        });

The result of a paged query is an instance of [DataResultSet](https://docs.themost.io/most-data/DataResultSet.html) class.

## Data query field selection
[DataQueryable](https://docs.themost.io/most-data/DataQueryable.html) class allows developers to define
a collection of selected fields which are going to be included in the result. This collection may contain
fields which belong to the current model and others which belong to models associated with the current.

    context.model('Order').where('orderStatus/alternateName').equal('OrderProcessing')
    .select('id','orderDate','orderedItem/name as productName', 'customer/description as customerName')
    .take(15)
     .list().then(function(result) {
            done(null, result);
        }).catch(function(err) {
            done(err);
        });

## Data object grouping
Use data object grouping and produce on-the-fly statistical results based on the given parameters:

    //count orders by order status
    context.model('Order')
    .select('count(id) as orderCount','orderStatus/name as orderStatusName')
    .groupBy('orderStatus/name')
    .where('orderDate').getMonth().equal(10).and('orderDate').getFullYear().equal(2015)
     .all().then(function(result) {
            done(null, result);
        }).catch(function(err) {
            done(err);
        });

## Data model listeners
Data model definition may contains a collection of event listeners which represents a set of procedures that
are going to be executed before and after inserting, updating or deleting a data object.

    //Order.json schema
    ...
    "eventListeners": [
        { "name":"New Order Notification", "type":"/app/controllers/new-order-listener" }
    ]
    ...

    //new-order-listener.js listener
    ...
    exports.afterSave = function(event, callback) {
        if (event.state!=1) { return callback(); }
        //use most web mailer module
        var mm = require("most-web-mailer");
         mm.mailer(context).subject("New Order Notification")
         .subject("New Order")
         .template("new-order-notification")
         .to("employee1@example.com")
         .test()
         .send(event.target, function(err, res) {
            if (err) { return done(err); }
            return done();
        });
    }

## Data model privileges
Data model definition may contain a collection of privileges which should be given in users or groups.
User access rights will be validated during read, insert, update or delete data operations.

    ...
    "privileges":[
        { "mask":1, "type":"self", "filter":"id eq me()" },
        { "mask":15, "type":"global", "account":"*" }
    ]
    ...

## Data caching
The most-data module allows developers to use data caching mechanisms while getting data.
DataModel.caching property indicates whether data will be cached or not.

    {
        "name": "OrderStatus", "id": 9507079, "title": "Order Status", "hidden": false, "sealed": false,
        "abstract": false, "version": "1.1", "caching":"always"
    }


## Data seeding
Data model definition may contain a seed property which is a collection of data items to be inserted
 when model will be migrated for the first time.

    {
        "name": "OrderStatus", "id": 9507079, "title": "Order Status", "hidden": false,
        "sealed": false, "abstract": false, "version": "1.1",
        ...
        "fields": [
        ...
        ],
        ..
        "seed": [
            {  "id":1, "name":"Delivered", "alternateName":"OrderDelivered", "description":"Representing the successful delivery of an order."
            }, {
                "id":2, "name":"Cancelled", "alternateName":"OrderCancelled", "description":"Representing the cancellation of an order."
            }, {
                "id":3, "name":"In Transit", "alternateName":"OrderInTransit", "description":"Representing that an order is in transit."
            }, {
                "id":4, "name":"Payment Due", "alternateName":"OrderPaymentDue", "description":"Representing that payment is due on an order."
            }, {
                "id":5, "name":"Pickup", "alternateName":"OrderPickup", "description":"Representing availability of an order for pickup."
            }, {
                "id":6, "name":"Processing", "alternateName":"OrderProcessing", "description":"Representing that an order is being processed."
            }, {
                "id":7, "name":"Problem", "alternateName":"OrderProblem", "description":"Representing that there is a problem with the order."
            }, {
                "id":8, "name":"Returned", "alternateName":"OrderReturned", "description":"Representing that an order has been returned."
            }
        ]
    }


## Data Connectors
There are different data connectors for the most popular database engines:
#### MOST Web Framework MySQL Adapter for connecting with MySQL Database Server

Install the data adapter:

    npm install most-data-mysql

Append the adapter type in application configuration (app.json#adapterTypes):

    ...
     "adapterTypes": [
     ...
     { "name":"MySQL Data Adapter", "invariantName": "mysql", "type":"most-data-mysql" }
     ...
     ]

Register an adapter in application configuration (app.json#adapters):

    adapters: [
     ...
     { "name":"development", "invariantName":"mysql", "default":true,
         "options": {
           "host":"localhost",
           "port":3306,
           "user":"user",
           "password":"password",
           "database":"test"
         }
     }
     ...
     ]

#### MOST Web Framework MSSQL Adapter for connecting with Microsoft SQL Database Server

Install the data adapter:

    npm install most-data-mssql

Append the adapter type in application configuration (app.json#adapterTypes):

    ...
     "adapterTypes": [
     ...
     { "name":"MSSQL Data Adapter", "invariantName": "mssql", "type":"most-data-mssql" }
     ...
     ]

Register an adapter in application configuration (app.json#adapters):

    adapters: [
     ...
     { "name":"development", "invariantName":"mssql", "default":true,
            "options": {
              "server":"localhost",
              "user":"user",
              "password":"password",
              "database":"test"
            }
        }
     ...
     ]

#### MOST Web Framework PostgreSQL Adapter for connecting with PostgreSQL Database Server

Install the data adapter:

    npm install most-data-pg

Append the adapter type in application configuration (app.json#adapterTypes):

    ...
     "adapterTypes": [
     ...
     { "name":"PostgreSQL Data Adapter", "invariantName": "postgres", "type":"most-data-pg" }
     ...
     ]

Register an adapter in application configuration (app.json#adapters):

    adapters: [
     ...
     { "name":"development", "invariantName":"postgres", "default":true,
            "options": {
              "host":"localhost",
              "post":5432,
              "user":"user",
              "password":"password",
              "database":"db"
            }
        }
     ...
     ]

#### MOST Web Framework Oracle Adapter for connecting with Oracle Database Server

Install the data adapter:

    npm install most-data-oracle

Append the adapter type in application configuration (app.json#adapterTypes):

    ...
     "adapterTypes": [
     ...
     { "name":"Oracle Data Adapter", "invariantName": "oracle", "type":"most-data-oracle" }
     ...
     ]

Register an adapter in application configuration (app.json#adapters):

    adapters: [
     ...
     { "name":"development", "invariantName":"oracle", "default":true,
            "options": {
              "host":"localhost",
              "port":1521,
              "user":"user",
              "password":"password",
              "service":"orcl",
              "schema":"PUBLIC"
            }
        }
     ...
     ]

#### MOST Web Framework SQLite Adapter for connecting with Sqlite Databases

Install the data adapter:

    npm install most-data-sqlite

Append the adapter type in application configuration (app.json#adapterTypes):

    ...
     "adapterTypes": [
     ...
     { "name":"SQLite Data Adapter", "invariantName": "sqlite", "type":"most-data-sqlite" }
     ...
     ]

Register an adapter in application configuration (app.json#adapters):

    adapters: [
     ...
     { "name":"development", "invariantName":"sqlite", "default":true,
            "options": {
                database:"db/local.db"
            }
        }
     ...
     ]