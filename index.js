/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2014-02-03.
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
var model = require('./data-model'),
    types = require('./types'),
    cfg = require('./data-configuration'),
    perms = require('./data-permission'),
    validators = require('./data-validator'),
    dataCache = require('./data-cache'),
    dataCommon = require('./data-common'),
    functions = require('./functions'),
    DataQueryable = require('./data-queryable').DataQueryable,
    DataExpandResolver = require('./data-expand-resolver').DataExpandResolver,
    DefaultDataContext = require('./data-context').DefaultDataContext,
    NamedDataContext = require('./data-context').NamedDataContext,
    DataModel = model.DataModel,
    DataFilterResolver = require('./data-filter-resolver').DataFilterResolver;

/**
 * @private
 */
var dat = {
    cfg: cfg,
    common: dataCommon,
    types: types,
    cache:dataCache,
    validators: validators,
    classes: {
        DataObject : require('./data-object'),
        DefaultDataContext: DefaultDataContext,
        NamedDataContext: NamedDataContext,
        FunctionContext:functions.classes.FunctionContext,
        DataQueryable: DataQueryable,
        DataModel: DataModel,
        DataFilterResolver: DataFilterResolver,
        DataExpandResolver: DataExpandResolver,
        DataPermissionEventListener:perms.DataPermissionEventListener,
        DataPermissionEventArgs:perms.DataPermissionEventArgs
    },
    /**
     * Creates an instance of DataContext class which represents the default data context. If parameter [name] is specified, returns the named data context specified in application configuration.
     * @param {string=} name
     * @returns {DataContext}
     */
    createContext: function(name) {
        if (typeof name === 'undefined' || name == null)
            return new DefaultDataContext();
        else
            return new NamedDataContext(name);
    },
     /**
     * @param {function(DataContext)} fn - A function fn(context) that is going to be invoked in current context
     */
    execute: function(fn)
    {
        fn = fn || function() {};
        var ctx = new DefaultDataContext();
        fn.call(null, ctx);
    },
    /**
     * @param {string} userName
     * @param {function(DataContext)} fn - A function fn(context) that is going to be invoked in current context
     */
    executeAs: function(userName, fn)
    {
        fn = fn || function() {};
        var ctx = new DefaultDataContext();
        ctx.user = { name:userName, authenticationType:'Basic' };
        fn.call(null, ctx);
    },
    /**
     * DataObject class constructor.
     */
    DataObject : require('./data-object')
};


if (typeof exports !== 'undefined')
{
    module.exports = dat;
}