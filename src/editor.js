import * as monaco from "monaco-editor";
import * as yaml from "js-yaml";
import * as $ from 'jquery';

let data;

export function initAutocomplete() {
    data = yaml.safeLoad(getApi());

    monaco.languages.registerCompletionItemProvider('php', {
        provideCompletionItems: function (model, position) {
            let textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });
            let suggestions = [];

            // specific connector suggestions
            if (textUntilPosition.endsWith("$connector->getConnection('") || textUntilPosition.endsWith("$connector->getConnection(\"")) {
                suggestions = createConnectionsProposals();
            }

            // specific method suggestions
            if (suggestions.length === 0) {
                for (let key in data.api) {
                    if (textUntilPosition.endsWith(key + "->")) {
                        suggestions = createMethodsProposals(key);
                    }
                }
            }

            // global suggestions
            if (suggestions.length === 0) {
                suggestions = createGlobalProposals();
            }

            return {
                suggestions: suggestions
            };
        }
    });
}

function createConnectionsProposals() {
    let result = [];
    $(".fusio-load-connection").each(function () {
        result.push({
            label: $(this).text(),
            kind: monaco.languages.CompletionItemKind.Text,
            insertText: $(this).text()
        });
    });

    return result;
}

function createMethodsProposals(key) {
    let result = [];
    for (let methodName in data.api[key].methods) {
        let method = data.api[key].methods[methodName];
        let label = methodName;

        let detail = null;
        if (method.return && method.return.type) {
            detail = method.return.type;
        }

        let documentation = null;
        if (method.description) {
            documentation = method.description;
        }

        if (method.arguments) {
            let parts = [];
            method.arguments.forEach((arg) => {
                parts.push(arg.type + " " + arg.name)
            });

            label += "(" + parts.join(", ") + ")";
        }

        result.push({
            label: label,
            kind: monaco.languages.CompletionItemKind.Method,
            detail: detail,
            documentation: documentation,
            insertText: methodName
        });
    }

    return result;
}

function createGlobalProposals() {
    let result = [];
    for (let key in data.api) {
        result.push({
            label: key,
            kind: monaco.languages.CompletionItemKind.Variable,
            documentation: data.api[key].description,
            insertText: key
        });
    }

    return result;
}

function getApi() {
    return `
api:
    $request:
        description: "Represents an incoming HTTP request. This object can be used to access all\\nvalues from an incoming request"
        visible: true
        methods:
            getMethod:
                description: 'Returns the HTTP request method i.e. GET, POST'
                return:
                    type: string
            getHeader:
                description: "Returns a specific header or return null in case the header is not\\navailable"
                return:
                    type: string|null
                arguments:
                    -
                        name: $name
                        type: string
            getHeaders:
                description: 'Returns all available headers'
                return:
                    type: array
            getUriFragment:
                description: "Returns a specific fragment from the uri. To specify a fragment your\\nroute must contain a variable fragment i.e. /foo/:bar, then it is\\npossible to access the bar fragment through this method"
                return:
                    type: string
                arguments:
                    -
                        name: $name
                        type: string
            getUriFragments:
                description: 'Returns all available uri fragments'
                return:
                    type: \\Fusio\\Engine\\Parameters
            getParameter:
                description: "Returns a query parameter from the uri. Those are parsed by the parse_str\\nfunction so the value is either a string or an array in case the\\nparameter uses a \\"[]\\" notation"
                return:
                    type: string|array
                arguments:
                    -
                        name: $name
                        type: string
            getParameters:
                description: 'Returns all available query parameters'
                return:
                    type: \\Fusio\\Engine\\Parameters
            getBody:
                description: "Returns the parsed body. If the body arrives at the action it is already\\nvalid against the defined JSON schema (if provided)"
                return:
                    type: \\PSX\\Record\\RecordInterface
            withBody:
                description: 'Returns a copy of the request object with the provided body'
                return:
                    type: self
                arguments:
                    -
                        name: $body
                        type: \\PSX\\Record\\RecordInterface
    $parameters:
        description: "The parameters represent a general set of key values which is used in various\\nplaces. As argument to the action method it contains the configuration\\nparameters of the action. At the request object it contains the query and uri\\nfragment parameters"
        visible: true
        methods:
            get:
                description: 'Returns a specific parameter'
                return:
                    type: mixed
                arguments:
                    -
                        name: $key
                        type: string
            has:
                description: 'Checks whether a parameter is available'
                return:
                    type: boolean
                arguments:
                    -
                        name: $key
                        type: string
            set:
                description: 'Sets a specific parameter'
                arguments:
                    -
                        name: $key
                        type: string
                    -
                        name: $value
                        type: mixed
            isEmpty:
                description: 'Returns whether no parameter is available'
                return:
                    type: boolean
            toArray:
                description: 'Returns an array representation of this collection'
                return:
                    type: array
    $context:
        description: "The context contains all information about the incoming request which is not\\nHTTP related i.e. it contains the authenticated user and app or also the\\nroute id which was used"
        visible: true
        methods:
            getRouteId:
                description: 'Returns the id of the route'
                return:
                    type: integer
            getBaseUrl:
                description: "Returns the base url of the system to generate i.e. HATEOAS links. The\\nurl has a trailing slash"
                return:
                    type: string
            getApp:
                description: "Returns the app which was used for this request. Can also be an anonymous\\napp if authorization is not required for the endpoint"
                return:
                    type: \\Fusio\\Engine\\Model\\AppInterface
            getUser:
                description: "Returns the user which has authenticated through the app. Can also be an\\nanonymous user if authorization is not required for the endpoint"
                return:
                    type: \\Fusio\\Engine\\Model\\UserInterface
            getAction:
                description: 'Returns the current action'
                return:
                    type: \\Fusio\\Engine\\Model\\ActionInterface
            withAction:
                description: 'Creates a new context containing the given action'
                return:
                    type: \\Fusio\\Engine\\ContextInterface
                arguments:
                    -
                        name: $action
                        type: \\Fusio\\Engine\\Model\\ActionInterface
            getConnection:
                description: 'Returns the connection which is currently used by the action'
                return:
                    type: mixed
            withConnection:
                description: 'Sets the currently used connection'
                return:
                    type: \\Fusio\\Engine\\ContextInterface
                arguments:
                    -
                        name: $connection
                        type: mixed
    $connector:
        description: "Through the connector it is possible to access configured connection objects.\\nA connection is i.e. a MYSQL connection which can be configured at the admin\\npanel. Inside an action it is possible to access this connection through this\\nclass. Which objects is returned depends on the connection type i.e. the\\nMYSQL connection returns a Doctrine DBAL Connection instance and the HTTP\\nconnection returns a Guzzle instance. There are already many adapters\\navailable which allow many different kind of services i.e. ElasticSearch,\\nMongoDB, AMQP, etc."
        visible: true
        methods:
            getConnection:
                description: "Returns an arbitrary connection to a remote service. It is recommended to\\nuse the connection name but you can also use the actual database id of\\nthe connection"
                return:
                    type: mixed
                arguments:
                    -
                        name: $connectionId
                        type: string|integer
    $response:
        description: "The response factory MUST be used to create a response for an action. It is\\na factory method which returns a specific response object. Please always use\\nthis factory since this gives us the freedom to change the response\\nimplementation"
        visible: true
        methods:
            build:
                description: 'Creates a new response object'
                return:
                    type: \\PSX\\Http\\Environment\\HttpResponseInterface
                arguments:
                    -
                        name: $statusCode
                        type: integer
                    -
                        name: $headers
                        type: array
                    -
                        name: $body
                        type: mixed
    $processor:
        description: "The processor can be used to invoke another action. Normally an action should\\nonly contain simple logic but in some cases you may want to invoke an\\nexisting action"
        visible: true
        methods:
            execute:
                description: "Executes a specific action using the request and context and returns a\\nresponse. It is recommended to use the action name but you can also use\\nthe actual database id of the action"
                return:
                    type: \\PSX\\Http\\Environment\\HttpResponseInterface
                arguments:
                    -
                        name: $actionId
                        type: string|integer
                    -
                        name: $request
                        type: \\Fusio\\Engine\\RequestInterface
                    -
                        name: $context
                        type: \\Fusio\\Engine\\ContextInterface
    $dispatcher:
        description: "The dispatcher can be used to trigger specific events. A consumer can\\nsubscribe to such events and they will receive a HTTP POST call to the\\ndefined endpoint in case you dispatch an event. The call happens in the\\nbackground through a cronjob so the dispatch operation is not expensive"
        visible: true
        methods:
            dispatch:
                description: "Dispatches a specific event and sends the payload to all subscribers. The\\npayload gets json encoded so it is recommended to use i.e. an array or\\nstdClass data type"
                arguments:
                    -
                        name: $eventName
                        type: string
                    -
                        name: $payload
                        type: mixed
    $logger:
        description: "Describes a logger instance.\\nThe message MUST be a string or object implementing __toString().\\nThe message MAY contain placeholders in the form: {foo} where foo\\nwill be replaced by the context data in key \\"foo\\".\\nThe context array can contain arbitrary data. The only assumption that\\ncan be made by implementors is that if an Exception instance is given\\nto produce a stack trace, it MUST be in a key named \\"exception\\".\\nSee https://github.com/php-fig/fig-standards/blob/master/accepted/PSR-3-logger-interface.md\\nfor the full interface specification."
        visible: true
        methods:
            emergency:
                description: 'System is unusable.'
                return:
                    type: void
                arguments:
                    -
                        name: $message
                        type: string
                    -
                        name: $context
                        type: array
            alert:
                description: "Action must be taken immediately.\\nExample: Entire website down, database unavailable, etc. This should\\ntrigger the SMS alerts and wake you up."
                return:
                    type: void
                arguments:
                    -
                        name: $message
                        type: string
                    -
                        name: $context
                        type: array
            critical:
                description: "Critical conditions.\\nExample: Application component unavailable, unexpected exception."
                return:
                    type: void
                arguments:
                    -
                        name: $message
                        type: string
                    -
                        name: $context
                        type: array
            error:
                description: "Runtime errors that do not require immediate action but should typically\\nbe logged and monitored."
                return:
                    type: void
                arguments:
                    -
                        name: $message
                        type: string
                    -
                        name: $context
                        type: array
            warning:
                description: "Exceptional occurrences that are not errors.\\nExample: Use of deprecated APIs, poor use of an API, undesirable things\\nthat are not necessarily wrong."
                return:
                    type: void
                arguments:
                    -
                        name: $message
                        type: string
                    -
                        name: $context
                        type: array
            notice:
                description: 'Normal but significant events.'
                return:
                    type: void
                arguments:
                    -
                        name: $message
                        type: string
                    -
                        name: $context
                        type: array
            info:
                description: "Interesting events.\\nExample: User logs in, SQL logs."
                return:
                    type: void
                arguments:
                    -
                        name: $message
                        type: string
                    -
                        name: $context
                        type: array
            debug:
                description: 'Detailed debug information.'
                return:
                    type: void
                arguments:
                    -
                        name: $message
                        type: string
                    -
                        name: $context
                        type: array
            log:
                description: 'Logs with an arbitrary level.'
                return:
                    type: void
                arguments:
                    -
                        name: $level
                        type: mixed
                    -
                        name: $message
                        type: string
                    -
                        name: $context
                        type: array
    $cache:
        description: ''
        visible: true
        methods:
            get:
                description: "Fetches a value from the cache.\\n  MUST be thrown if the $key string is not a legal value."
                return:
                    type: mixed
                    description: 'The value of the item from the cache, or $default in case of cache miss.'
                arguments:
                    -
                        name: $key
                        type: string
                        description: 'The unique key of this item in the cache.'
                    -
                        name: $default
                        type: mixed
                        description: 'Default value to return if the key does not exist.'
            set:
                description: "Persists data in the cache, uniquely referenced by a key with an optional expiration TTL time.\\n                                     the driver supports TTL then the library may set a default value\\n                                     for it or let the driver take care of that.\\n  MUST be thrown if the $key string is not a legal value."
                return:
                    type: bool
                    description: 'True on success and false on failure.'
                arguments:
                    -
                        name: $key
                        type: string
                        description: 'The key of the item to store.'
                    -
                        name: $value
                        type: mixed
                        description: 'The value of the item to store, must be serializable.'
                    -
                        name: $ttl
                        type: null|int|\\DateInterval
                        description: 'Optional. The TTL value of this item. If no value is sent and'
            delete:
                description: "Delete an item from the cache by its unique key.\\n  MUST be thrown if the $key string is not a legal value."
                return:
                    type: bool
                    description: 'True if the item was successfully removed. False if there was an error.'
                arguments:
                    -
                        name: $key
                        type: string
                        description: 'The unique cache key of the item to delete.'
            clear:
                description: 'Wipes clean the entire cache''s keys.'
                return:
                    type: bool
                    description: 'True on success and false on failure.'
            getMultiple:
                description: "Obtains multiple cache items by their unique keys.\\n  MUST be thrown if $keys is neither an array nor a Traversable,\\n  or if any of the $keys are not a legal value."
                return:
                    type: iterable
                    description: 'A list of key => value pairs. Cache keys that do not exist or are stale will have $default as value.'
                arguments:
                    -
                        name: $keys
                        type: iterable
                        description: 'A list of keys that can obtained in a single operation.'
                    -
                        name: $default
                        type: mixed
                        description: 'Default value to return for keys that do not exist.'
            setMultiple:
                description: "Persists a set of key => value pairs in the cache, with an optional TTL.\\n                                      the driver supports TTL then the library may set a default value\\n                                      for it or let the driver take care of that.\\n  MUST be thrown if $values is neither an array nor a Traversable,\\n  or if any of the $values are not a legal value."
                return:
                    type: bool
                    description: 'True on success and false on failure.'
                arguments:
                    -
                        name: $values
                        type: iterable
                        description: 'A list of key => value pairs for a multiple-set operation.'
                    -
                        name: $ttl
                        type: null|int|\\DateInterval
                        description: 'Optional. The TTL value of this item. If no value is sent and'
            deleteMultiple:
                description: "Deletes multiple cache items in a single operation.\\n  MUST be thrown if $keys is neither an array nor a Traversable,\\n  or if any of the $keys are not a legal value."
                return:
                    type: bool
                    description: 'True if the items were successfully removed. False if there was an error.'
                arguments:
                    -
                        name: $keys
                        type: iterable
                        description: 'A list of string-based keys to be deleted.'
            has:
                description: "Determines whether an item is present in the cache.\\nNOTE: It is recommended that has() is only to be used for cache warming type purposes\\nand not to be used within your live applications operations for get/set, as this method\\nis subject to a race condition where your has() will return true and immediately after,\\nanother script can remove it making the state of your app out of date.\\n  MUST be thrown if the $key string is not a legal value."
                return:
                    type: bool
                arguments:
                    -
                        name: $key
                        type: string
                        description: 'The cache item key.'
`;
}

