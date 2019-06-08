import * as monaco from 'monaco-editor';
import * as $ from 'jquery';
import {Fusio} from 'fusio-sdk';
import {initAutocomplete} from './editor';

let editor;

$(document).ready(function () {
    init();

    $("#login").submit(onLogin);
    $("#logout").click(onLogout);
    $("#execute").submit(onExecute);
    $("#newAction").submit(onNewAction);
});

function init() {
    let fusioUrl = fusio_url;
    let accessToken = window.localStorage.getItem("token");
    let token = tokenDecode(accessToken);

    if (token !== false) {
        Fusio.init({
            baseUrl: fusioUrl,
            accessToken: accessToken
        });

        $(".fusio-login").css("display", "none");
        $(".fusio-app").css("display", "block");
        $("#user").html(token.name);

        load();
    } else {
        Fusio.init({
            baseUrl: fusioUrl
        });

        $(".fusio-login").css("display", "block");
        $(".fusio-app").css("display", "none");
    }
}

function initEditor() {
    editor = monaco.editor.create(document.getElementById('container'), {
        value: '',
        language: 'php'
    });

    editor.addAction({
        id: 'execute',
        label: 'Execute action',
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_E
        ],
        precondition: null,
        keybindingContext: null,
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.5,
        run: function(ed) {
            onExecute();
            return null;
        }
    });

    initAutocomplete();
}

function load() {
    loadActions();
    loadConnections();
    initEditor();
    
    $("#newActionButton").click(onNewAction);
}

function loadActions() {
    Fusio.backend.action.collection().get({count: 1024}).then((resp) => {
        let html = "";
        resp.data.entry.forEach((entry) => {
            html += "<li class=\"nav-item\"><a href=\"#\" class=\"fusio-load-action\" data-id=\"" + entry.id + "\">" + entry.name + "</a></li>"
        });

        $("#fusioActions").html(html);

        $(".fusio-load-action").each(function () {
            $(this).off("click");
            $(this).click(function () {
                loadAction($(this).data("id"));
                return false;
            });
        });
    });
}

function loadAction(id) {
    Fusio.backend.action.entity(id).get().then((resp) => {
        $("#actionId").val(id).data("action", resp.data);
        $("#editorTitle").html(resp.data.name);
        $("#executeButton").removeAttr("disabled");

        let code;
        if (resp.data.class === 'Fusio\\Adapter\\Php\\Action\\PhpSandbox') {
            code = resp.data.config.code;
        } else {
            code = "<?php\n\n// Note this editor can only edit PHP-Sandbox actions\n// It is still possible to execute this action\n\n/*\n" + JSON.stringify(resp.data, null, 4) + "\n*/";
        }

        if (code) {
            let model = monaco.editor.createModel(code, "php");
            editor.setModel(model);
        }
        editor.layout();
    });
}

function loadConnections() {
    Fusio.backend.connection.collection().get({count: 1024}).then((resp) => {
        let html = "";
        resp.data.entry.forEach((entry) => {
            html += "<li class=\"nav-item\"><a href=\"#\" class=\"fusio-load-connection\" data-id=\"" + entry.id + "\">" + entry.name + "</a></li>"
        });

        $("#fusioConnections").html(html);

        $(".fusio-load-connection").each(function () {
            $(this).off("click");
            $(this).click(function () {
                loadConnection($(this).data("id"));
                return false;
            });
        });
    });
}

function loadConnection(id) {
    Fusio.backend.connection.entity(id).get().then((resp) => {
        let code = "";
        code += "<?php\n\n";

        if (resp.data.class === 'Fusio\\Impl\\Connection\\System') {
            code += "// This is the system connection which works on the database where also\n";
            code += "// Fusio is installed. It returns a Doctrine DBAL Connection.\n";
            code += "// The following is an example how you can use it inside an action:\n";
            code += "\n";
            code += "/**\n";
            code += " * @see https://www.doctrine-project.org/api/dbal/2.5/Doctrine/DBAL/Connection.html\n";
            code += " * @var \\Doctrine\\DBAL\\Connection $connection\n";
            code += " */\n";
            code += "$connection = $connector->getConnection('" + resp.data.name + "');\n\n";
        } else if (resp.data.class === 'Fusio\\Adapter\\Sql\\Connection\\Sql' || resp.data.class === 'Fusio\\Adapter\\Sql\\Connection\\SqlAdvanced') {
            code += "// This is a connection to a database. It returns a Doctrine DBAL Connection.\n";
            code += "// The following is an example how you can use it inside an action:\n";
            code += "\n";
            code += "/**\n";
            code += " * @see https://www.doctrine-project.org/api/dbal/2.5/Doctrine/DBAL/Connection.html\n";
            code += " * @var \\Doctrine\\DBAL\\Connection $connection\n";
            code += " */\n";
            code += "$connection = $connector->getConnection('" + resp.data.name + "');\n\n";
        } else if (resp.data.class === 'Fusio\\Adapter\\Http\\Connection\\Http') {
            code += "// This is a connection to a remote HTTP server. It returns a Guzzle client.\n";
            code += "// The following is an example how you can use it inside an action:\n";
            code += "\n";
            code += "/**\n";
            code += " * @see http://docs.guzzlephp.org/en/latest/\n";
            code += " * @var \\GuzzleHttp\\Client\n";
            code += " */\n";
            code += "$client = $connector->getConnection('" + resp.data.name + "');\n\n";
        }

        let model = monaco.editor.createModel(code, "php");
        editor.setModel(model);
        editor.layout();
    });
}

function onLogin() {
    let username = $("#username").val();
    let password = $("#password").val();
    Fusio.backend.token.do().clientCredentials(username, password).then((resp) => {
        let accessToken = resp.data.access_token;
        if (accessToken) {
            window.localStorage.setItem("token", accessToken);
            init();
        }
    });
    return false;
}

function onLogout() {
    window.localStorage.removeItem("token");
    location.reload();
    return false;
}

function onExecute() {
    let actionId = $("#actionId").val();
    let method = $("#method").val();
    let uriFragments = $("#uriFragments").val();
    let parameters = $("#parameters").val();
    let headers = $("#headers").val();
    let body = $("#body").val();

    if (!actionId) {
        return;
    }

    let options = {
        method: method
    };

    if (uriFragments) {
        options.uriFragments = uriFragments;
    }

    if (parameters) {
        options.parameters = parameters;
    }

    if (headers) {
        options.headers = headers;
    }

    if (body) {
        options.body = JSON.parse(body);
    }

    let action = $("#actionId").data("action");
    if (action.class === 'Fusio\\Adapter\\Php\\Action\\PhpSandbox') {
        // update and execute the action
        action.config.code = editor.getValue();

        Fusio.backend.action.entity(actionId).put(action)
            .then((resp) => {
                Fusio.backend.action.execute(actionId).post(options).then((resp) => {
                    $("#responseCode").html(resp.data.statusCode);
                    $("#output").html(JSON.stringify(resp.data.body, null, 4)).css("color", "black");
                });
            })
            .catch((error) => {
                $("#responseCode").html("");
                $("#output").html(JSON.stringify(error.response.data, null, 4)).css("color", "red");
            });
    } else {
        // otherwise we can still execute the action
        Fusio.backend.action.execute(actionId).post(options).then((resp) => {
            $("#responseCode").html(resp.data.statusCode);
            $("#output").html(JSON.stringify(resp.data.body, null, 4));
        });
    }

    return false;
}

function onNewAction() {
    let name = prompt("Please enter the action name:");
    if (!name) {
        return;
    }

    let action = {
        name: name,
        class: 'Fusio\\Adapter\\Php\\Action\\PhpSandbox',
        engine: 'Fusio\\Engine\\Factory\\Resolver\\PhpClass',
        config: {
            code: '<?php\n' +
                '\n' +
                '// @TODO implement my new action\n' +
                '\n' +
                'return $response->build(200, [], [\n' +
                '    \'hello\' => \'world\',\n' +
                ']);\n'
        }
    };

    Fusio.backend.action.collection().post(action)
        .then((resp) => {
            loadActions();
        })
        .catch((error) => {
            $("#responseCode").html("");
            $("#output").html(JSON.stringify(error.response.data, null, 4)).css("color", "red");
        });

    return false;
}

function tokenDecode(token) {
    if (!token) {
        return false;
    }

    let parts = token.split(".");
    if (parts.length >= 2) {
        let body = JSON.parse(atob(parts[1]));

        if (Math.floor(Date.now() / 1000) > body.exp) {
            return false;
        }

        return body;
    } else {
        return false;
    }
}
