"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@vscode/debugadapter/lib/messages.js
var require_messages = __commonJS({
  "node_modules/@vscode/debugadapter/lib/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Event = exports2.Response = exports2.Message = void 0;
    var Message = class {
      constructor(type) {
        this.seq = 0;
        this.type = type;
      }
    };
    exports2.Message = Message;
    var Response = class extends Message {
      constructor(request, message) {
        super("response");
        this.request_seq = request.seq;
        this.command = request.command;
        if (message) {
          this.success = false;
          this.message = message;
        } else {
          this.success = true;
        }
      }
    };
    exports2.Response = Response;
    var Event = class extends Message {
      constructor(event, body) {
        super("event");
        this.event = event;
        if (body) {
          this.body = body;
        }
      }
    };
    exports2.Event = Event;
  }
});

// node_modules/@vscode/debugadapter/lib/protocol.js
var require_protocol = __commonJS({
  "node_modules/@vscode/debugadapter/lib/protocol.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProtocolServer = void 0;
    var ee = require("events");
    var messages_1 = require_messages();
    var Emitter = class {
      get event() {
        if (!this._event) {
          this._event = (listener, thisArg) => {
            this._listener = listener;
            this._this = thisArg;
            let result;
            result = {
              dispose: () => {
                this._listener = void 0;
                this._this = void 0;
              }
            };
            return result;
          };
        }
        return this._event;
      }
      fire(event) {
        if (this._listener) {
          try {
            this._listener.call(this._this, event);
          } catch (e) {
          }
        }
      }
      hasListener() {
        return !!this._listener;
      }
      dispose() {
        this._listener = void 0;
        this._this = void 0;
      }
    };
    var ProtocolServer = class _ProtocolServer extends ee.EventEmitter {
      constructor() {
        super();
        this._sendMessage = new Emitter();
        this._sequence = 1;
        this._pendingRequests = /* @__PURE__ */ new Map();
        this.onDidSendMessage = this._sendMessage.event;
      }
      // ---- implements vscode.Debugadapter interface ---------------------------
      dispose() {
      }
      handleMessage(msg) {
        if (msg.type === "request") {
          this.dispatchRequest(msg);
        } else if (msg.type === "response") {
          const response = msg;
          const clb = this._pendingRequests.get(response.request_seq);
          if (clb) {
            this._pendingRequests.delete(response.request_seq);
            clb(response);
          }
        }
      }
      _isRunningInline() {
        return this._sendMessage && this._sendMessage.hasListener();
      }
      //--------------------------------------------------------------------------
      start(inStream, outStream) {
        this._writableStream = outStream;
        this._rawData = Buffer.alloc(0);
        inStream.on("data", (data) => this._handleData(data));
        inStream.on("close", () => {
          this._emitEvent(new messages_1.Event("close"));
        });
        inStream.on("error", (error) => {
          this._emitEvent(new messages_1.Event("error", "inStream error: " + (error && error.message)));
        });
        outStream.on("error", (error) => {
          this._emitEvent(new messages_1.Event("error", "outStream error: " + (error && error.message)));
        });
        inStream.resume();
      }
      stop() {
        if (this._writableStream) {
          this._writableStream.end();
        }
      }
      sendEvent(event) {
        this._send("event", event);
      }
      sendResponse(response) {
        if (response.seq > 0) {
          console.error(`attempt to send more than one response for command ${response.command}`);
        } else {
          this._send("response", response);
        }
      }
      sendRequest(command, args, timeout, cb) {
        const request = {
          command
        };
        if (args && Object.keys(args).length > 0) {
          request.arguments = args;
        }
        this._send("request", request);
        if (cb) {
          this._pendingRequests.set(request.seq, cb);
          const timer = setTimeout(() => {
            clearTimeout(timer);
            const clb = this._pendingRequests.get(request.seq);
            if (clb) {
              this._pendingRequests.delete(request.seq);
              clb(new messages_1.Response(request, "timeout"));
            }
          }, timeout);
        }
      }
      // ---- protected ----------------------------------------------------------
      dispatchRequest(request) {
      }
      // ---- private ------------------------------------------------------------
      _emitEvent(event) {
        this.emit(event.event, event);
      }
      _send(typ, message) {
        message.type = typ;
        message.seq = this._sequence++;
        if (this._writableStream) {
          const json = JSON.stringify(message);
          this._writableStream.write(`Content-Length: ${Buffer.byteLength(json, "utf8")}\r
\r
${json}`, "utf8");
        }
        this._sendMessage.fire(message);
      }
      _handleData(data) {
        this._rawData = Buffer.concat([this._rawData, data]);
        while (true) {
          if (this._contentLength >= 0) {
            if (this._rawData.length >= this._contentLength) {
              const message = this._rawData.toString("utf8", 0, this._contentLength);
              this._rawData = this._rawData.slice(this._contentLength);
              this._contentLength = -1;
              if (message.length > 0) {
                try {
                  let msg = JSON.parse(message);
                  this.handleMessage(msg);
                } catch (e) {
                  this._emitEvent(new messages_1.Event("error", "Error handling data: " + (e && e.message)));
                }
              }
              continue;
            }
          } else {
            const idx = this._rawData.indexOf(_ProtocolServer.TWO_CRLF);
            if (idx !== -1) {
              const header = this._rawData.toString("utf8", 0, idx);
              const lines = header.split("\r\n");
              for (let i = 0; i < lines.length; i++) {
                const pair = lines[i].split(/: +/);
                if (pair[0] == "Content-Length") {
                  this._contentLength = +pair[1];
                }
              }
              this._rawData = this._rawData.slice(idx + _ProtocolServer.TWO_CRLF.length);
              continue;
            }
          }
          break;
        }
      }
    };
    exports2.ProtocolServer = ProtocolServer;
    ProtocolServer.TWO_CRLF = "\r\n\r\n";
  }
});

// node_modules/@vscode/debugadapter/lib/runDebugAdapter.js
var require_runDebugAdapter = __commonJS({
  "node_modules/@vscode/debugadapter/lib/runDebugAdapter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.runDebugAdapter = void 0;
    var Net = require("net");
    function runDebugAdapter(debugSession) {
      let port = 0;
      const args = process.argv.slice(2);
      args.forEach(function(val, index, array) {
        const portMatch = /^--server=(\d{4,5})$/.exec(val);
        if (portMatch) {
          port = parseInt(portMatch[1], 10);
        }
      });
      if (port > 0) {
        console.error(`waiting for debug protocol on port ${port}`);
        Net.createServer((socket) => {
          console.error(">> accepted connection from client");
          socket.on("end", () => {
            console.error(">> client connection closed\n");
          });
          const session = new debugSession(false, true);
          session.setRunAsServer(true);
          session.start(socket, socket);
        }).listen(port);
      } else {
        const session = new debugSession(false);
        process.on("SIGTERM", () => {
          session.shutdown();
        });
        session.start(process.stdin, process.stdout);
      }
    }
    exports2.runDebugAdapter = runDebugAdapter;
  }
});

// node_modules/@vscode/debugadapter/lib/debugSession.js
var require_debugSession = __commonJS({
  "node_modules/@vscode/debugadapter/lib/debugSession.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DebugSession = exports2.ErrorDestination = exports2.MemoryEvent = exports2.InvalidatedEvent = exports2.ProgressEndEvent = exports2.ProgressUpdateEvent = exports2.ProgressStartEvent = exports2.CapabilitiesEvent = exports2.LoadedSourceEvent = exports2.ModuleEvent = exports2.BreakpointEvent = exports2.ThreadEvent = exports2.OutputEvent = exports2.ExitedEvent = exports2.TerminatedEvent = exports2.InitializedEvent = exports2.ContinuedEvent = exports2.StoppedEvent = exports2.CompletionItem = exports2.Module = exports2.Breakpoint = exports2.Variable = exports2.Thread = exports2.StackFrame = exports2.Scope = exports2.Source = void 0;
    var protocol_1 = require_protocol();
    var messages_1 = require_messages();
    var runDebugAdapter_1 = require_runDebugAdapter();
    var url_1 = require("url");
    var Source = class {
      constructor(name, path4, id = 0, origin, data) {
        this.name = name;
        this.path = path4;
        this.sourceReference = id;
        if (origin) {
          this.origin = origin;
        }
        if (data) {
          this.adapterData = data;
        }
      }
    };
    exports2.Source = Source;
    var Scope = class {
      constructor(name, reference, expensive = false) {
        this.name = name;
        this.variablesReference = reference;
        this.expensive = expensive;
      }
    };
    exports2.Scope = Scope;
    var StackFrame = class {
      constructor(i, nm, src, ln = 0, col = 0) {
        this.id = i;
        this.source = src;
        this.line = ln;
        this.column = col;
        this.name = nm;
      }
    };
    exports2.StackFrame = StackFrame;
    var Thread = class {
      constructor(id, name) {
        this.id = id;
        if (name) {
          this.name = name;
        } else {
          this.name = "Thread #" + id;
        }
      }
    };
    exports2.Thread = Thread;
    var Variable = class {
      constructor(name, value, ref = 0, indexedVariables, namedVariables) {
        this.name = name;
        this.value = value;
        this.variablesReference = ref;
        if (typeof namedVariables === "number") {
          this.namedVariables = namedVariables;
        }
        if (typeof indexedVariables === "number") {
          this.indexedVariables = indexedVariables;
        }
      }
    };
    exports2.Variable = Variable;
    var Breakpoint = class {
      constructor(verified, line, column, source) {
        this.verified = verified;
        const e = this;
        if (typeof line === "number") {
          e.line = line;
        }
        if (typeof column === "number") {
          e.column = column;
        }
        if (source) {
          e.source = source;
        }
      }
      setId(id) {
        this.id = id;
      }
    };
    exports2.Breakpoint = Breakpoint;
    var Module = class {
      constructor(id, name) {
        this.id = id;
        this.name = name;
      }
    };
    exports2.Module = Module;
    var CompletionItem = class {
      constructor(label, start, length = 0) {
        this.label = label;
        this.start = start;
        this.length = length;
      }
    };
    exports2.CompletionItem = CompletionItem;
    var StoppedEvent = class extends messages_1.Event {
      constructor(reason, threadId2, exceptionText) {
        super("stopped");
        this.body = {
          reason
        };
        if (typeof threadId2 === "number") {
          this.body.threadId = threadId2;
        }
        if (typeof exceptionText === "string") {
          this.body.text = exceptionText;
        }
      }
    };
    exports2.StoppedEvent = StoppedEvent;
    var ContinuedEvent = class extends messages_1.Event {
      constructor(threadId2, allThreadsContinued) {
        super("continued");
        this.body = {
          threadId: threadId2
        };
        if (typeof allThreadsContinued === "boolean") {
          this.body.allThreadsContinued = allThreadsContinued;
        }
      }
    };
    exports2.ContinuedEvent = ContinuedEvent;
    var InitializedEvent = class extends messages_1.Event {
      constructor() {
        super("initialized");
      }
    };
    exports2.InitializedEvent = InitializedEvent;
    var TerminatedEvent = class extends messages_1.Event {
      constructor(restart) {
        super("terminated");
        if (typeof restart === "boolean" || restart) {
          const e = this;
          e.body = {
            restart
          };
        }
      }
    };
    exports2.TerminatedEvent = TerminatedEvent;
    var ExitedEvent = class extends messages_1.Event {
      constructor(exitCode) {
        super("exited");
        this.body = {
          exitCode
        };
      }
    };
    exports2.ExitedEvent = ExitedEvent;
    var OutputEvent2 = class extends messages_1.Event {
      constructor(output2, category = "console", data) {
        super("output");
        this.body = {
          category,
          output: output2
        };
        if (data !== void 0) {
          this.body.data = data;
        }
      }
    };
    exports2.OutputEvent = OutputEvent2;
    var ThreadEvent = class extends messages_1.Event {
      constructor(reason, threadId2) {
        super("thread");
        this.body = {
          reason,
          threadId: threadId2
        };
      }
    };
    exports2.ThreadEvent = ThreadEvent;
    var BreakpointEvent = class extends messages_1.Event {
      constructor(reason, breakpoint) {
        super("breakpoint");
        this.body = {
          reason,
          breakpoint
        };
      }
    };
    exports2.BreakpointEvent = BreakpointEvent;
    var ModuleEvent = class extends messages_1.Event {
      constructor(reason, module3) {
        super("module");
        this.body = {
          reason,
          module: module3
        };
      }
    };
    exports2.ModuleEvent = ModuleEvent;
    var LoadedSourceEvent = class extends messages_1.Event {
      constructor(reason, source) {
        super("loadedSource");
        this.body = {
          reason,
          source
        };
      }
    };
    exports2.LoadedSourceEvent = LoadedSourceEvent;
    var CapabilitiesEvent = class extends messages_1.Event {
      constructor(capabilities2) {
        super("capabilities");
        this.body = {
          capabilities: capabilities2
        };
      }
    };
    exports2.CapabilitiesEvent = CapabilitiesEvent;
    var ProgressStartEvent = class extends messages_1.Event {
      constructor(progressId, title, message) {
        super("progressStart");
        this.body = {
          progressId,
          title
        };
        if (typeof message === "string") {
          this.body.message = message;
        }
      }
    };
    exports2.ProgressStartEvent = ProgressStartEvent;
    var ProgressUpdateEvent = class extends messages_1.Event {
      constructor(progressId, message) {
        super("progressUpdate");
        this.body = {
          progressId
        };
        if (typeof message === "string") {
          this.body.message = message;
        }
      }
    };
    exports2.ProgressUpdateEvent = ProgressUpdateEvent;
    var ProgressEndEvent = class extends messages_1.Event {
      constructor(progressId, message) {
        super("progressEnd");
        this.body = {
          progressId
        };
        if (typeof message === "string") {
          this.body.message = message;
        }
      }
    };
    exports2.ProgressEndEvent = ProgressEndEvent;
    var InvalidatedEvent = class extends messages_1.Event {
      constructor(areas, threadId2, stackFrameId) {
        super("invalidated");
        this.body = {};
        if (areas) {
          this.body.areas = areas;
        }
        if (threadId2) {
          this.body.threadId = threadId2;
        }
        if (stackFrameId) {
          this.body.stackFrameId = stackFrameId;
        }
      }
    };
    exports2.InvalidatedEvent = InvalidatedEvent;
    var MemoryEvent = class extends messages_1.Event {
      constructor(memoryReference, offset, count) {
        super("memory");
        this.body = { memoryReference, offset, count };
      }
    };
    exports2.MemoryEvent = MemoryEvent;
    var ErrorDestination;
    (function(ErrorDestination2) {
      ErrorDestination2[ErrorDestination2["User"] = 1] = "User";
      ErrorDestination2[ErrorDestination2["Telemetry"] = 2] = "Telemetry";
    })(ErrorDestination = exports2.ErrorDestination || (exports2.ErrorDestination = {}));
    var DebugSession2 = class _DebugSession extends protocol_1.ProtocolServer {
      constructor(obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer) {
        super();
        const linesAndColumnsStartAt1 = typeof obsolete_debuggerLinesAndColumnsStartAt1 === "boolean" ? obsolete_debuggerLinesAndColumnsStartAt1 : false;
        this._debuggerLinesStartAt1 = linesAndColumnsStartAt1;
        this._debuggerColumnsStartAt1 = linesAndColumnsStartAt1;
        this._debuggerPathsAreURIs = false;
        this._clientLinesStartAt1 = true;
        this._clientColumnsStartAt1 = true;
        this._clientPathsAreURIs = false;
        this._isServer = typeof obsolete_isServer === "boolean" ? obsolete_isServer : false;
        this.on("close", () => {
          this.shutdown();
        });
        this.on("error", (error) => {
          this.shutdown();
        });
      }
      setDebuggerPathFormat(format) {
        this._debuggerPathsAreURIs = format !== "path";
      }
      setDebuggerLinesStartAt1(enable) {
        this._debuggerLinesStartAt1 = enable;
      }
      setDebuggerColumnsStartAt1(enable) {
        this._debuggerColumnsStartAt1 = enable;
      }
      setRunAsServer(enable) {
        this._isServer = enable;
      }
      /**
       * A virtual constructor...
       */
      static run(debugSession) {
        (0, runDebugAdapter_1.runDebugAdapter)(debugSession);
      }
      shutdown() {
        if (this._isServer || this._isRunningInline()) {
        } else {
          setTimeout(() => {
            process.exit(0);
          }, 100);
        }
      }
      sendErrorResponse(response, codeOrMessage, format, variables, dest = ErrorDestination.User) {
        let msg;
        if (typeof codeOrMessage === "number") {
          msg = {
            id: codeOrMessage,
            format
          };
          if (variables) {
            msg.variables = variables;
          }
          if (dest & ErrorDestination.User) {
            msg.showUser = true;
          }
          if (dest & ErrorDestination.Telemetry) {
            msg.sendTelemetry = true;
          }
        } else {
          msg = codeOrMessage;
        }
        response.success = false;
        response.message = _DebugSession.formatPII(msg.format, true, msg.variables);
        if (!response.body) {
          response.body = {};
        }
        response.body.error = msg;
        this.sendResponse(response);
      }
      runInTerminalRequest(args, timeout, cb) {
        this.sendRequest("runInTerminal", args, timeout, cb);
      }
      dispatchRequest(request) {
        const response = new messages_1.Response(request);
        try {
          if (request.command === "initialize") {
            var args = request.arguments;
            if (typeof args.linesStartAt1 === "boolean") {
              this._clientLinesStartAt1 = args.linesStartAt1;
            }
            if (typeof args.columnsStartAt1 === "boolean") {
              this._clientColumnsStartAt1 = args.columnsStartAt1;
            }
            if (args.pathFormat !== "path") {
              this.sendErrorResponse(response, 2018, "debug adapter only supports native paths", null, ErrorDestination.Telemetry);
            } else {
              const initializeResponse = response;
              initializeResponse.body = {};
              this.initializeRequest(initializeResponse, args);
            }
          } else if (request.command === "launch") {
            this.launchRequest(response, request.arguments, request);
          } else if (request.command === "attach") {
            this.attachRequest(response, request.arguments, request);
          } else if (request.command === "disconnect") {
            this.disconnectRequest(response, request.arguments, request);
          } else if (request.command === "terminate") {
            this.terminateRequest(response, request.arguments, request);
          } else if (request.command === "restart") {
            this.restartRequest(response, request.arguments, request);
          } else if (request.command === "setBreakpoints") {
            this.setBreakPointsRequest(response, request.arguments, request);
          } else if (request.command === "setFunctionBreakpoints") {
            this.setFunctionBreakPointsRequest(response, request.arguments, request);
          } else if (request.command === "setExceptionBreakpoints") {
            this.setExceptionBreakPointsRequest(response, request.arguments, request);
          } else if (request.command === "configurationDone") {
            this.configurationDoneRequest(response, request.arguments, request);
          } else if (request.command === "continue") {
            this.continueRequest(response, request.arguments, request);
          } else if (request.command === "next") {
            this.nextRequest(response, request.arguments, request);
          } else if (request.command === "stepIn") {
            this.stepInRequest(response, request.arguments, request);
          } else if (request.command === "stepOut") {
            this.stepOutRequest(response, request.arguments, request);
          } else if (request.command === "stepBack") {
            this.stepBackRequest(response, request.arguments, request);
          } else if (request.command === "reverseContinue") {
            this.reverseContinueRequest(response, request.arguments, request);
          } else if (request.command === "restartFrame") {
            this.restartFrameRequest(response, request.arguments, request);
          } else if (request.command === "goto") {
            this.gotoRequest(response, request.arguments, request);
          } else if (request.command === "pause") {
            this.pauseRequest(response, request.arguments, request);
          } else if (request.command === "stackTrace") {
            this.stackTraceRequest(response, request.arguments, request);
          } else if (request.command === "scopes") {
            this.scopesRequest(response, request.arguments, request);
          } else if (request.command === "variables") {
            this.variablesRequest(response, request.arguments, request);
          } else if (request.command === "setVariable") {
            this.setVariableRequest(response, request.arguments, request);
          } else if (request.command === "setExpression") {
            this.setExpressionRequest(response, request.arguments, request);
          } else if (request.command === "source") {
            this.sourceRequest(response, request.arguments, request);
          } else if (request.command === "threads") {
            this.threadsRequest(response, request);
          } else if (request.command === "terminateThreads") {
            this.terminateThreadsRequest(response, request.arguments, request);
          } else if (request.command === "evaluate") {
            this.evaluateRequest(response, request.arguments, request);
          } else if (request.command === "stepInTargets") {
            this.stepInTargetsRequest(response, request.arguments, request);
          } else if (request.command === "gotoTargets") {
            this.gotoTargetsRequest(response, request.arguments, request);
          } else if (request.command === "completions") {
            this.completionsRequest(response, request.arguments, request);
          } else if (request.command === "exceptionInfo") {
            this.exceptionInfoRequest(response, request.arguments, request);
          } else if (request.command === "loadedSources") {
            this.loadedSourcesRequest(response, request.arguments, request);
          } else if (request.command === "dataBreakpointInfo") {
            this.dataBreakpointInfoRequest(response, request.arguments, request);
          } else if (request.command === "setDataBreakpoints") {
            this.setDataBreakpointsRequest(response, request.arguments, request);
          } else if (request.command === "readMemory") {
            this.readMemoryRequest(response, request.arguments, request);
          } else if (request.command === "writeMemory") {
            this.writeMemoryRequest(response, request.arguments, request);
          } else if (request.command === "disassemble") {
            this.disassembleRequest(response, request.arguments, request);
          } else if (request.command === "cancel") {
            this.cancelRequest(response, request.arguments, request);
          } else if (request.command === "breakpointLocations") {
            this.breakpointLocationsRequest(response, request.arguments, request);
          } else if (request.command === "setInstructionBreakpoints") {
            this.setInstructionBreakpointsRequest(response, request.arguments, request);
          } else {
            this.customRequest(request.command, response, request.arguments, request);
          }
        } catch (e) {
          this.sendErrorResponse(response, 1104, "{_stack}", { _exception: e.message, _stack: e.stack }, ErrorDestination.Telemetry);
        }
      }
      initializeRequest(response, args) {
        response.body.supportsConditionalBreakpoints = false;
        response.body.supportsHitConditionalBreakpoints = false;
        response.body.supportsFunctionBreakpoints = false;
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsEvaluateForHovers = false;
        response.body.supportsStepBack = false;
        response.body.supportsSetVariable = false;
        response.body.supportsRestartFrame = false;
        response.body.supportsStepInTargetsRequest = false;
        response.body.supportsGotoTargetsRequest = false;
        response.body.supportsCompletionsRequest = false;
        response.body.supportsRestartRequest = false;
        response.body.supportsExceptionOptions = false;
        response.body.supportsValueFormattingOptions = false;
        response.body.supportsExceptionInfoRequest = false;
        response.body.supportTerminateDebuggee = false;
        response.body.supportsDelayedStackTraceLoading = false;
        response.body.supportsLoadedSourcesRequest = false;
        response.body.supportsLogPoints = false;
        response.body.supportsTerminateThreadsRequest = false;
        response.body.supportsSetExpression = false;
        response.body.supportsTerminateRequest = false;
        response.body.supportsDataBreakpoints = false;
        response.body.supportsReadMemoryRequest = false;
        response.body.supportsDisassembleRequest = false;
        response.body.supportsCancelRequest = false;
        response.body.supportsBreakpointLocationsRequest = false;
        response.body.supportsClipboardContext = false;
        response.body.supportsSteppingGranularity = false;
        response.body.supportsInstructionBreakpoints = false;
        response.body.supportsExceptionFilterOptions = false;
        this.sendResponse(response);
      }
      disconnectRequest(response, args, request) {
        this.sendResponse(response);
        this.shutdown();
      }
      launchRequest(response, args, request) {
        this.sendResponse(response);
      }
      attachRequest(response, args, request) {
        this.sendResponse(response);
      }
      terminateRequest(response, args, request) {
        this.sendResponse(response);
      }
      restartRequest(response, args, request) {
        this.sendResponse(response);
      }
      setBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      setFunctionBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      setExceptionBreakPointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      configurationDoneRequest(response, args, request) {
        this.sendResponse(response);
      }
      continueRequest(response, args, request) {
        this.sendResponse(response);
      }
      nextRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepInRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepOutRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepBackRequest(response, args, request) {
        this.sendResponse(response);
      }
      reverseContinueRequest(response, args, request) {
        this.sendResponse(response);
      }
      restartFrameRequest(response, args, request) {
        this.sendResponse(response);
      }
      gotoRequest(response, args, request) {
        this.sendResponse(response);
      }
      pauseRequest(response, args, request) {
        this.sendResponse(response);
      }
      sourceRequest(response, args, request) {
        this.sendResponse(response);
      }
      threadsRequest(response, request) {
        this.sendResponse(response);
      }
      terminateThreadsRequest(response, args, request) {
        this.sendResponse(response);
      }
      stackTraceRequest(response, args, request) {
        this.sendResponse(response);
      }
      scopesRequest(response, args, request) {
        this.sendResponse(response);
      }
      variablesRequest(response, args, request) {
        this.sendResponse(response);
      }
      setVariableRequest(response, args, request) {
        this.sendResponse(response);
      }
      setExpressionRequest(response, args, request) {
        this.sendResponse(response);
      }
      evaluateRequest(response, args, request) {
        this.sendResponse(response);
      }
      stepInTargetsRequest(response, args, request) {
        this.sendResponse(response);
      }
      gotoTargetsRequest(response, args, request) {
        this.sendResponse(response);
      }
      completionsRequest(response, args, request) {
        this.sendResponse(response);
      }
      exceptionInfoRequest(response, args, request) {
        this.sendResponse(response);
      }
      loadedSourcesRequest(response, args, request) {
        this.sendResponse(response);
      }
      dataBreakpointInfoRequest(response, args, request) {
        this.sendResponse(response);
      }
      setDataBreakpointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      readMemoryRequest(response, args, request) {
        this.sendResponse(response);
      }
      writeMemoryRequest(response, args, request) {
        this.sendResponse(response);
      }
      disassembleRequest(response, args, request) {
        this.sendResponse(response);
      }
      cancelRequest(response, args, request) {
        this.sendResponse(response);
      }
      breakpointLocationsRequest(response, args, request) {
        this.sendResponse(response);
      }
      setInstructionBreakpointsRequest(response, args, request) {
        this.sendResponse(response);
      }
      /**
       * Override this hook to implement custom requests.
       */
      customRequest(command, response, args, request) {
        this.sendErrorResponse(response, 1014, "unrecognized request", null, ErrorDestination.Telemetry);
      }
      //---- protected -------------------------------------------------------------------------------------------------
      convertClientLineToDebugger(line) {
        if (this._debuggerLinesStartAt1) {
          return this._clientLinesStartAt1 ? line : line + 1;
        }
        return this._clientLinesStartAt1 ? line - 1 : line;
      }
      convertDebuggerLineToClient(line) {
        if (this._debuggerLinesStartAt1) {
          return this._clientLinesStartAt1 ? line : line - 1;
        }
        return this._clientLinesStartAt1 ? line + 1 : line;
      }
      convertClientColumnToDebugger(column) {
        if (this._debuggerColumnsStartAt1) {
          return this._clientColumnsStartAt1 ? column : column + 1;
        }
        return this._clientColumnsStartAt1 ? column - 1 : column;
      }
      convertDebuggerColumnToClient(column) {
        if (this._debuggerColumnsStartAt1) {
          return this._clientColumnsStartAt1 ? column : column - 1;
        }
        return this._clientColumnsStartAt1 ? column + 1 : column;
      }
      convertClientPathToDebugger(clientPath) {
        if (this._clientPathsAreURIs !== this._debuggerPathsAreURIs) {
          if (this._clientPathsAreURIs) {
            return _DebugSession.uri2path(clientPath);
          } else {
            return _DebugSession.path2uri(clientPath);
          }
        }
        return clientPath;
      }
      convertDebuggerPathToClient(debuggerPath) {
        if (this._debuggerPathsAreURIs !== this._clientPathsAreURIs) {
          if (this._debuggerPathsAreURIs) {
            return _DebugSession.uri2path(debuggerPath);
          } else {
            return _DebugSession.path2uri(debuggerPath);
          }
        }
        return debuggerPath;
      }
      //---- private -------------------------------------------------------------------------------
      static path2uri(path4) {
        if (process.platform === "win32") {
          if (/^[A-Z]:/.test(path4)) {
            path4 = path4[0].toLowerCase() + path4.substr(1);
          }
          path4 = path4.replace(/\\/g, "/");
        }
        path4 = encodeURI(path4);
        let uri = new url_1.URL(`file:`);
        uri.pathname = path4;
        return uri.toString();
      }
      static uri2path(sourceUri) {
        let uri = new url_1.URL(sourceUri);
        let s = decodeURIComponent(uri.pathname);
        if (process.platform === "win32") {
          if (/^\/[a-zA-Z]:/.test(s)) {
            s = s[1].toLowerCase() + s.substr(2);
          }
          s = s.replace(/\//g, "\\");
        }
        return s;
      }
      /*
      * If argument starts with '_' it is OK to send its value to telemetry.
      */
      static formatPII(format, excludePII, args) {
        return format.replace(_DebugSession._formatPIIRegexp, function(match, paramName) {
          if (excludePII && paramName.length > 0 && paramName[0] !== "_") {
            return match;
          }
          return args[paramName] && args.hasOwnProperty(paramName) ? args[paramName] : match;
        });
      }
    };
    exports2.DebugSession = DebugSession2;
    DebugSession2._formatPIIRegexp = /{([^}]+)}/g;
  }
});

// node_modules/@vscode/debugadapter/lib/internalLogger.js
var require_internalLogger = __commonJS({
  "node_modules/@vscode/debugadapter/lib/internalLogger.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InternalLogger = void 0;
    var fs3 = require("fs");
    var path4 = require("path");
    var logger_1 = require_logger();
    var InternalLogger = class {
      constructor(logCallback, isServer) {
        this.beforeExitCallback = () => this.dispose();
        this._logCallback = logCallback;
        this._logToConsole = isServer;
        this._minLogLevel = logger_1.LogLevel.Warn;
        this.disposeCallback = (signal, code) => {
          this.dispose();
          code = code || 2;
          code += 128;
          process.exit(code);
        };
      }
      async setup(options) {
        this._minLogLevel = options.consoleMinLogLevel;
        this._prependTimestamp = options.prependTimestamp;
        if (options.logFilePath) {
          if (!path4.isAbsolute(options.logFilePath)) {
            this.log(`logFilePath must be an absolute path: ${options.logFilePath}`, logger_1.LogLevel.Error);
          } else {
            const handleError = (err) => this.sendLog(`Error creating log file at path: ${options.logFilePath}. Error: ${err.toString()}
`, logger_1.LogLevel.Error);
            try {
              await fs3.promises.mkdir(path4.dirname(options.logFilePath), { recursive: true });
              this.log(`Verbose logs are written to:
`, logger_1.LogLevel.Warn);
              this.log(options.logFilePath + "\n", logger_1.LogLevel.Warn);
              this._logFileStream = fs3.createWriteStream(options.logFilePath);
              this.logDateTime();
              this.setupShutdownListeners();
              this._logFileStream.on("error", (err) => {
                handleError(err);
              });
            } catch (err) {
              handleError(err);
            }
          }
        }
      }
      logDateTime() {
        let d = /* @__PURE__ */ new Date();
        let dateString = d.getUTCFullYear() + `-${d.getUTCMonth() + 1}-` + d.getUTCDate();
        const timeAndDateStamp = dateString + ", " + getFormattedTimeString();
        this.log(timeAndDateStamp + "\n", logger_1.LogLevel.Verbose, false);
      }
      setupShutdownListeners() {
        process.on("beforeExit", this.beforeExitCallback);
        process.on("SIGTERM", this.disposeCallback);
        process.on("SIGINT", this.disposeCallback);
      }
      removeShutdownListeners() {
        process.removeListener("beforeExit", this.beforeExitCallback);
        process.removeListener("SIGTERM", this.disposeCallback);
        process.removeListener("SIGINT", this.disposeCallback);
      }
      dispose() {
        return new Promise((resolve) => {
          this.removeShutdownListeners();
          if (this._logFileStream) {
            this._logFileStream.end(resolve);
            this._logFileStream = null;
          } else {
            resolve();
          }
        });
      }
      log(msg, level, prependTimestamp = true) {
        if (this._minLogLevel === logger_1.LogLevel.Stop) {
          return;
        }
        if (level >= this._minLogLevel) {
          this.sendLog(msg, level);
        }
        if (this._logToConsole) {
          const logFn = level === logger_1.LogLevel.Error ? console.error : level === logger_1.LogLevel.Warn ? console.warn : null;
          if (logFn) {
            logFn((0, logger_1.trimLastNewline)(msg));
          }
        }
        if (level === logger_1.LogLevel.Error) {
          msg = `[${logger_1.LogLevel[level]}] ${msg}`;
        }
        if (this._prependTimestamp && prependTimestamp) {
          msg = "[" + getFormattedTimeString() + "] " + msg;
        }
        if (this._logFileStream) {
          this._logFileStream.write(msg);
        }
      }
      sendLog(msg, level) {
        if (msg.length > 1500) {
          const endsInNewline = !!msg.match(/(\n|\r\n)$/);
          msg = msg.substr(0, 1500) + "[...]";
          if (endsInNewline) {
            msg = msg + "\n";
          }
        }
        if (this._logCallback) {
          const event = new logger_1.LogOutputEvent(msg, level);
          this._logCallback(event);
        }
      }
    };
    exports2.InternalLogger = InternalLogger;
    function getFormattedTimeString() {
      let d = /* @__PURE__ */ new Date();
      let hourString = _padZeroes(2, String(d.getUTCHours()));
      let minuteString = _padZeroes(2, String(d.getUTCMinutes()));
      let secondString = _padZeroes(2, String(d.getUTCSeconds()));
      let millisecondString = _padZeroes(3, String(d.getUTCMilliseconds()));
      return hourString + ":" + minuteString + ":" + secondString + "." + millisecondString + " UTC";
    }
    function _padZeroes(minDesiredLength, numberToPad) {
      if (numberToPad.length >= minDesiredLength) {
        return numberToPad;
      } else {
        return String("0".repeat(minDesiredLength) + numberToPad).slice(-minDesiredLength);
      }
    }
  }
});

// node_modules/@vscode/debugadapter/lib/logger.js
var require_logger = __commonJS({
  "node_modules/@vscode/debugadapter/lib/logger.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.trimLastNewline = exports2.LogOutputEvent = exports2.logger = exports2.Logger = exports2.LogLevel = void 0;
    var internalLogger_1 = require_internalLogger();
    var debugSession_1 = require_debugSession();
    var LogLevel;
    (function(LogLevel2) {
      LogLevel2[LogLevel2["Verbose"] = 0] = "Verbose";
      LogLevel2[LogLevel2["Log"] = 1] = "Log";
      LogLevel2[LogLevel2["Warn"] = 2] = "Warn";
      LogLevel2[LogLevel2["Error"] = 3] = "Error";
      LogLevel2[LogLevel2["Stop"] = 4] = "Stop";
    })(LogLevel = exports2.LogLevel || (exports2.LogLevel = {}));
    var Logger = class {
      constructor() {
        this._pendingLogQ = [];
      }
      log(msg, level = LogLevel.Log) {
        msg = msg + "\n";
        this._write(msg, level);
      }
      verbose(msg) {
        this.log(msg, LogLevel.Verbose);
      }
      warn(msg) {
        this.log(msg, LogLevel.Warn);
      }
      error(msg) {
        this.log(msg, LogLevel.Error);
      }
      dispose() {
        if (this._currentLogger) {
          const disposeP = this._currentLogger.dispose();
          this._currentLogger = null;
          return disposeP;
        } else {
          return Promise.resolve();
        }
      }
      /**
       * `log` adds a newline, `write` doesn't
       */
      _write(msg, level = LogLevel.Log) {
        msg = msg + "";
        if (this._pendingLogQ) {
          this._pendingLogQ.push({ msg, level });
        } else if (this._currentLogger) {
          this._currentLogger.log(msg, level);
        }
      }
      /**
       * Set the logger's minimum level to log in the console, and whether to log to the file. Log messages are queued before this is
       * called the first time, because minLogLevel defaults to Warn.
       */
      setup(consoleMinLogLevel, _logFilePath, prependTimestamp = true) {
        const logFilePath = typeof _logFilePath === "string" ? _logFilePath : _logFilePath && this._logFilePathFromInit;
        if (this._currentLogger) {
          const options = {
            consoleMinLogLevel,
            logFilePath,
            prependTimestamp
          };
          this._currentLogger.setup(options).then(() => {
            if (this._pendingLogQ) {
              const logQ = this._pendingLogQ;
              this._pendingLogQ = null;
              logQ.forEach((item) => this._write(item.msg, item.level));
            }
          });
        }
      }
      init(logCallback, logFilePath, logToConsole) {
        this._pendingLogQ = this._pendingLogQ || [];
        this._currentLogger = new internalLogger_1.InternalLogger(logCallback, logToConsole);
        this._logFilePathFromInit = logFilePath;
      }
    };
    exports2.Logger = Logger;
    exports2.logger = new Logger();
    var LogOutputEvent = class extends debugSession_1.OutputEvent {
      constructor(msg, level) {
        const category = level === LogLevel.Error ? "stderr" : level === LogLevel.Warn ? "console" : "stdout";
        super(msg, category);
      }
    };
    exports2.LogOutputEvent = LogOutputEvent;
    function trimLastNewline(str) {
      return str.replace(/(\n|\r\n)$/, "");
    }
    exports2.trimLastNewline = trimLastNewline;
  }
});

// node_modules/@vscode/debugadapter/lib/loggingDebugSession.js
var require_loggingDebugSession = __commonJS({
  "node_modules/@vscode/debugadapter/lib/loggingDebugSession.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LoggingDebugSession = void 0;
    var Logger = require_logger();
    var logger = Logger.logger;
    var debugSession_1 = require_debugSession();
    var LoggingDebugSession = class extends debugSession_1.DebugSession {
      constructor(obsolete_logFilePath, obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer) {
        super(obsolete_debuggerLinesAndColumnsStartAt1, obsolete_isServer);
        this.obsolete_logFilePath = obsolete_logFilePath;
        this.on("error", (event) => {
          logger.error(event.body);
        });
      }
      start(inStream, outStream) {
        super.start(inStream, outStream);
        logger.init((e) => this.sendEvent(e), this.obsolete_logFilePath, this._isServer);
      }
      /**
       * Overload sendEvent to log
       */
      sendEvent(event) {
        if (!(event instanceof Logger.LogOutputEvent)) {
          let objectToLog = event;
          if (event instanceof debugSession_1.OutputEvent && event.body && event.body.data && event.body.data.doNotLogOutput) {
            delete event.body.data.doNotLogOutput;
            objectToLog = { ...event };
            objectToLog.body = { ...event.body, output: "<output not logged>" };
          }
          logger.verbose(`To client: ${JSON.stringify(objectToLog)}`);
        }
        super.sendEvent(event);
      }
      /**
       * Overload sendRequest to log
       */
      sendRequest(command, args, timeout, cb) {
        logger.verbose(`To client: ${JSON.stringify(command)}(${JSON.stringify(args)}), timeout: ${timeout}`);
        super.sendRequest(command, args, timeout, cb);
      }
      /**
       * Overload sendResponse to log
       */
      sendResponse(response) {
        logger.verbose(`To client: ${JSON.stringify(response)}`);
        super.sendResponse(response);
      }
      dispatchRequest(request) {
        logger.verbose(`From client: ${request.command}(${JSON.stringify(request.arguments)})`);
        super.dispatchRequest(request);
      }
    };
    exports2.LoggingDebugSession = LoggingDebugSession;
  }
});

// node_modules/@vscode/debugadapter/lib/handles.js
var require_handles = __commonJS({
  "node_modules/@vscode/debugadapter/lib/handles.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Handles = void 0;
    var Handles = class {
      constructor(startHandle) {
        this.START_HANDLE = 1e3;
        this._handleMap = /* @__PURE__ */ new Map();
        this._nextHandle = typeof startHandle === "number" ? startHandle : this.START_HANDLE;
      }
      reset() {
        this._nextHandle = this.START_HANDLE;
        this._handleMap = /* @__PURE__ */ new Map();
      }
      create(value) {
        var handle = this._nextHandle++;
        this._handleMap.set(handle, value);
        return handle;
      }
      get(handle, dflt) {
        return this._handleMap.get(handle) || dflt;
      }
    };
    exports2.Handles = Handles;
  }
});

// node_modules/@vscode/debugadapter/lib/main.js
var require_main = __commonJS({
  "node_modules/@vscode/debugadapter/lib/main.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Handles = exports2.Response = exports2.Event = exports2.ErrorDestination = exports2.CompletionItem = exports2.Module = exports2.Source = exports2.Breakpoint = exports2.Variable = exports2.Scope = exports2.StackFrame = exports2.Thread = exports2.MemoryEvent = exports2.InvalidatedEvent = exports2.ProgressEndEvent = exports2.ProgressUpdateEvent = exports2.ProgressStartEvent = exports2.CapabilitiesEvent = exports2.LoadedSourceEvent = exports2.ModuleEvent = exports2.BreakpointEvent = exports2.ThreadEvent = exports2.OutputEvent = exports2.ContinuedEvent = exports2.StoppedEvent = exports2.ExitedEvent = exports2.TerminatedEvent = exports2.InitializedEvent = exports2.logger = exports2.Logger = exports2.LoggingDebugSession = exports2.DebugSession = void 0;
    var debugSession_1 = require_debugSession();
    Object.defineProperty(exports2, "DebugSession", { enumerable: true, get: function() {
      return debugSession_1.DebugSession;
    } });
    Object.defineProperty(exports2, "InitializedEvent", { enumerable: true, get: function() {
      return debugSession_1.InitializedEvent;
    } });
    Object.defineProperty(exports2, "TerminatedEvent", { enumerable: true, get: function() {
      return debugSession_1.TerminatedEvent;
    } });
    Object.defineProperty(exports2, "ExitedEvent", { enumerable: true, get: function() {
      return debugSession_1.ExitedEvent;
    } });
    Object.defineProperty(exports2, "StoppedEvent", { enumerable: true, get: function() {
      return debugSession_1.StoppedEvent;
    } });
    Object.defineProperty(exports2, "ContinuedEvent", { enumerable: true, get: function() {
      return debugSession_1.ContinuedEvent;
    } });
    Object.defineProperty(exports2, "OutputEvent", { enumerable: true, get: function() {
      return debugSession_1.OutputEvent;
    } });
    Object.defineProperty(exports2, "ThreadEvent", { enumerable: true, get: function() {
      return debugSession_1.ThreadEvent;
    } });
    Object.defineProperty(exports2, "BreakpointEvent", { enumerable: true, get: function() {
      return debugSession_1.BreakpointEvent;
    } });
    Object.defineProperty(exports2, "ModuleEvent", { enumerable: true, get: function() {
      return debugSession_1.ModuleEvent;
    } });
    Object.defineProperty(exports2, "LoadedSourceEvent", { enumerable: true, get: function() {
      return debugSession_1.LoadedSourceEvent;
    } });
    Object.defineProperty(exports2, "CapabilitiesEvent", { enumerable: true, get: function() {
      return debugSession_1.CapabilitiesEvent;
    } });
    Object.defineProperty(exports2, "ProgressStartEvent", { enumerable: true, get: function() {
      return debugSession_1.ProgressStartEvent;
    } });
    Object.defineProperty(exports2, "ProgressUpdateEvent", { enumerable: true, get: function() {
      return debugSession_1.ProgressUpdateEvent;
    } });
    Object.defineProperty(exports2, "ProgressEndEvent", { enumerable: true, get: function() {
      return debugSession_1.ProgressEndEvent;
    } });
    Object.defineProperty(exports2, "InvalidatedEvent", { enumerable: true, get: function() {
      return debugSession_1.InvalidatedEvent;
    } });
    Object.defineProperty(exports2, "MemoryEvent", { enumerable: true, get: function() {
      return debugSession_1.MemoryEvent;
    } });
    Object.defineProperty(exports2, "Thread", { enumerable: true, get: function() {
      return debugSession_1.Thread;
    } });
    Object.defineProperty(exports2, "StackFrame", { enumerable: true, get: function() {
      return debugSession_1.StackFrame;
    } });
    Object.defineProperty(exports2, "Scope", { enumerable: true, get: function() {
      return debugSession_1.Scope;
    } });
    Object.defineProperty(exports2, "Variable", { enumerable: true, get: function() {
      return debugSession_1.Variable;
    } });
    Object.defineProperty(exports2, "Breakpoint", { enumerable: true, get: function() {
      return debugSession_1.Breakpoint;
    } });
    Object.defineProperty(exports2, "Source", { enumerable: true, get: function() {
      return debugSession_1.Source;
    } });
    Object.defineProperty(exports2, "Module", { enumerable: true, get: function() {
      return debugSession_1.Module;
    } });
    Object.defineProperty(exports2, "CompletionItem", { enumerable: true, get: function() {
      return debugSession_1.CompletionItem;
    } });
    Object.defineProperty(exports2, "ErrorDestination", { enumerable: true, get: function() {
      return debugSession_1.ErrorDestination;
    } });
    var loggingDebugSession_1 = require_loggingDebugSession();
    Object.defineProperty(exports2, "LoggingDebugSession", { enumerable: true, get: function() {
      return loggingDebugSession_1.LoggingDebugSession;
    } });
    var Logger = require_logger();
    exports2.Logger = Logger;
    var messages_1 = require_messages();
    Object.defineProperty(exports2, "Event", { enumerable: true, get: function() {
      return messages_1.Event;
    } });
    Object.defineProperty(exports2, "Response", { enumerable: true, get: function() {
      return messages_1.Response;
    } });
    var handles_1 = require_handles();
    Object.defineProperty(exports2, "Handles", { enumerable: true, get: function() {
      return handles_1.Handles;
    } });
    var logger = Logger.logger;
    exports2.logger = logger;
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/constants.js"(exports2, module2) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob)
      BINARY_TYPES.push("blob");
    module2.exports = {
      BINARY_TYPES,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/buffer-util.js"(exports2, module2) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0)
        return EMPTY_BUFFER;
      if (list.length === 1)
        return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output2, offset, length) {
      for (let i = 0; i < length; i++) {
        output2[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data))
        return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module2.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = require("bufferutil");
        module2.exports.mask = function(source, mask, output2, offset, length) {
          if (length < 48)
            _mask(source, mask, output2, offset, length);
          else
            bufferUtil.mask(source, mask, output2, offset, length);
        };
        module2.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32)
            _unmask(buffer, mask);
          else
            bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/limiter.js"(exports2, module2) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency)
          return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module2.exports = Limiter;
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/permessage-deflate.js"(exports2, module2) {
    "use strict";
    var zlib = require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       * @param {Boolean} [isServer=false] Create the instance in either server or
       *     client mode
       * @param {Number} [maxPayload=0] The maximum allowed message length
       */
      constructor(options, isServer, maxPayload) {
        this._maxPayload = maxPayload | 0;
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._isServer = !!isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin)
          this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module2.exports = PerMessageDeflate;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/validation.js"(exports2, module2) {
    "use strict";
    var { isUtf8 } = require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module2.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = require("utf-8-validate");
        module2.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/receiver.js"(exports2, module2) {
    "use strict";
    var { Writable } = require("stream");
    var PerMessageDeflate = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO)
          return cb();
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length)
          return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored)
          cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented)
          this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126)
          this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127)
          this._state = GET_PAYLOAD_LENGTH_64;
        else
          this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked)
          this._state = GET_MASK;
        else
          this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err)
            return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO)
            this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module2.exports = Receiver2;
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/sender.js"(exports2, module2) {
    "use strict";
    var { Duplex } = require("stream");
    var { randomFillSync } = require("crypto");
    var PerMessageDeflate = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions2, generateMask) {
        this._extensions = extensions2 || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1)
          target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask)
          return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking)
          return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else {
            buf.set(data, 2);
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin)
          this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module2.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function")
        cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function")
          callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/event-target.js"(exports2, module2) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module2.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/extension.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0)
        dest[name] = [elem];
      else
        dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1)
              end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1)
              end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1)
              start = i;
            else if (!mustUnescape)
              mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1)
                start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1)
              end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1)
        end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions2) {
      return Object.keys(extensions2).map((extension) => {
        let configurations = extensions2[extension];
        if (!Array.isArray(configurations))
          configurations = [configurations];
        return configurations.map((params) => {
          return [extension].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values))
                values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse };
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/websocket.js"(exports2, module2) {
    "use strict";
    var EventEmitter5 = require("events");
    var https = require("https");
    var http = require("http");
    var net = require("net");
    var tls = require("tls");
    var { randomBytes, createHash } = require("crypto");
    var { Duplex, Readable } = require("stream");
    var { URL: URL2 } = require("url");
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var closeTimeout = 30 * 1e3;
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter5 {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type))
          return;
        this._binaryType = type;
        if (this._receiver)
          this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket)
          return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout)
          socket.setTimeout(0);
        if (socket.setNoDelay)
          socket.setNoDelay();
        if (head.length > 0)
          socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate.extensionName]) {
          this._extensions[PerMessageDeflate.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED)
          return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err)
            return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0)
          mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0)
          mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain)
          this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED)
          return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute])
              return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function")
            return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module2.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        protocolVersion: protocolVersions[1],
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch (e) {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate(
          opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
          false,
          opts.maxPayload
        );
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost)
              delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted])
          return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING)
          return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt)
          websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions2;
          try {
            extensions2 = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions2);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions2[PerMessageDeflate.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket)
          websocket._sender._bufferedBytes += length;
        else
          websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0)
        return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005)
        websocket.close();
      else
        websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused)
        websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong)
        websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED)
        return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      let chunk;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && (chunk = websocket._socket.read()) !== null) {
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/stream.js"(exports2, module2) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data))
          ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed)
          return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed)
          return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called)
            callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy)
          ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null)
          return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted)
            duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused)
          ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module2.exports = createWebSocketStream2;
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/subprotocol.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module2.exports = { parse };
  }
});

// ../bun-inspector-protocol/node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "../bun-inspector-protocol/node_modules/ws/lib/websocket-server.js"(exports2, module2) {
    "use strict";
    var EventEmitter5 = require("events");
    var http = require("http");
    var { Duplex } = require("stream");
    var { createHash } = require("crypto");
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var subprotocol = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter5 {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true)
          options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server)
          return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb)
          this.once("close", cb);
        if (this._state === CLOSING)
          return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path)
            return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions2 = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate(
            this.options.perMessageDeflate,
            true,
            this.options.maxPayload
          );
          try {
            const offers = extension.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
              extensions2[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions2,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info))
            return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions2, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions2, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable)
          return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING)
          return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions2[PerMessageDeflate.extensionName]) {
          const params = extensions2[PerMessageDeflate.extensionName].params;
          const value = extension.format({
            [PerMessageDeflate.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions2;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module2.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map))
        server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// ../../node_modules/source-map-js/lib/base64.js
var require_base64 = __commonJS({
  "../../node_modules/source-map-js/lib/base64.js"(exports2) {
    var intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
    exports2.encode = function(number) {
      if (0 <= number && number < intToCharMap.length) {
        return intToCharMap[number];
      }
      throw new TypeError("Must be between 0 and 63: " + number);
    };
    exports2.decode = function(charCode) {
      var bigA = 65;
      var bigZ = 90;
      var littleA = 97;
      var littleZ = 122;
      var zero = 48;
      var nine = 57;
      var plus = 43;
      var slash = 47;
      var littleOffset = 26;
      var numberOffset = 52;
      if (bigA <= charCode && charCode <= bigZ) {
        return charCode - bigA;
      }
      if (littleA <= charCode && charCode <= littleZ) {
        return charCode - littleA + littleOffset;
      }
      if (zero <= charCode && charCode <= nine) {
        return charCode - zero + numberOffset;
      }
      if (charCode == plus) {
        return 62;
      }
      if (charCode == slash) {
        return 63;
      }
      return -1;
    };
  }
});

// ../../node_modules/source-map-js/lib/base64-vlq.js
var require_base64_vlq = __commonJS({
  "../../node_modules/source-map-js/lib/base64-vlq.js"(exports2) {
    var base64 = require_base64();
    var VLQ_BASE_SHIFT = 5;
    var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
    var VLQ_BASE_MASK = VLQ_BASE - 1;
    var VLQ_CONTINUATION_BIT = VLQ_BASE;
    function toVLQSigned(aValue) {
      return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
    }
    function fromVLQSigned(aValue) {
      var isNegative = (aValue & 1) === 1;
      var shifted = aValue >> 1;
      return isNegative ? -shifted : shifted;
    }
    exports2.encode = function base64VLQ_encode(aValue) {
      var encoded = "";
      var digit;
      var vlq = toVLQSigned(aValue);
      do {
        digit = vlq & VLQ_BASE_MASK;
        vlq >>>= VLQ_BASE_SHIFT;
        if (vlq > 0) {
          digit |= VLQ_CONTINUATION_BIT;
        }
        encoded += base64.encode(digit);
      } while (vlq > 0);
      return encoded;
    };
    exports2.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
      var strLen = aStr.length;
      var result = 0;
      var shift = 0;
      var continuation, digit;
      do {
        if (aIndex >= strLen) {
          throw new Error("Expected more digits in base 64 VLQ value.");
        }
        digit = base64.decode(aStr.charCodeAt(aIndex++));
        if (digit === -1) {
          throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
        }
        continuation = !!(digit & VLQ_CONTINUATION_BIT);
        digit &= VLQ_BASE_MASK;
        result = result + (digit << shift);
        shift += VLQ_BASE_SHIFT;
      } while (continuation);
      aOutParam.value = fromVLQSigned(result);
      aOutParam.rest = aIndex;
    };
  }
});

// ../../node_modules/source-map-js/lib/util.js
var require_util = __commonJS({
  "../../node_modules/source-map-js/lib/util.js"(exports2) {
    function getArg(aArgs, aName, aDefaultValue) {
      if (aName in aArgs) {
        return aArgs[aName];
      } else if (arguments.length === 3) {
        return aDefaultValue;
      } else {
        throw new Error('"' + aName + '" is a required argument.');
      }
    }
    exports2.getArg = getArg;
    var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
    var dataUrlRegexp = /^data:.+\,.+$/;
    function urlParse(aUrl) {
      var match = aUrl.match(urlRegexp);
      if (!match) {
        return null;
      }
      return {
        scheme: match[1],
        auth: match[2],
        host: match[3],
        port: match[4],
        path: match[5]
      };
    }
    exports2.urlParse = urlParse;
    function urlGenerate(aParsedUrl) {
      var url = "";
      if (aParsedUrl.scheme) {
        url += aParsedUrl.scheme + ":";
      }
      url += "//";
      if (aParsedUrl.auth) {
        url += aParsedUrl.auth + "@";
      }
      if (aParsedUrl.host) {
        url += aParsedUrl.host;
      }
      if (aParsedUrl.port) {
        url += ":" + aParsedUrl.port;
      }
      if (aParsedUrl.path) {
        url += aParsedUrl.path;
      }
      return url;
    }
    exports2.urlGenerate = urlGenerate;
    var MAX_CACHED_INPUTS = 32;
    function lruMemoize(f) {
      var cache = [];
      return function(input) {
        for (var i = 0; i < cache.length; i++) {
          if (cache[i].input === input) {
            var temp = cache[0];
            cache[0] = cache[i];
            cache[i] = temp;
            return cache[0].result;
          }
        }
        var result = f(input);
        cache.unshift({
          input,
          result
        });
        if (cache.length > MAX_CACHED_INPUTS) {
          cache.pop();
        }
        return result;
      };
    }
    var normalize3 = lruMemoize(function normalize4(aPath) {
      var path4 = aPath;
      var url = urlParse(aPath);
      if (url) {
        if (!url.path) {
          return aPath;
        }
        path4 = url.path;
      }
      var isAbsolute2 = exports2.isAbsolute(path4);
      var parts = [];
      var start = 0;
      var i = 0;
      while (true) {
        start = i;
        i = path4.indexOf("/", start);
        if (i === -1) {
          parts.push(path4.slice(start));
          break;
        } else {
          parts.push(path4.slice(start, i));
          while (i < path4.length && path4[i] === "/") {
            i++;
          }
        }
      }
      for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
        part = parts[i];
        if (part === ".") {
          parts.splice(i, 1);
        } else if (part === "..") {
          up++;
        } else if (up > 0) {
          if (part === "") {
            parts.splice(i + 1, up);
            up = 0;
          } else {
            parts.splice(i, 2);
            up--;
          }
        }
      }
      path4 = parts.join("/");
      if (path4 === "") {
        path4 = isAbsolute2 ? "/" : ".";
      }
      if (url) {
        url.path = path4;
        return urlGenerate(url);
      }
      return path4;
    });
    exports2.normalize = normalize3;
    function join5(aRoot, aPath) {
      if (aRoot === "") {
        aRoot = ".";
      }
      if (aPath === "") {
        aPath = ".";
      }
      var aPathUrl = urlParse(aPath);
      var aRootUrl = urlParse(aRoot);
      if (aRootUrl) {
        aRoot = aRootUrl.path || "/";
      }
      if (aPathUrl && !aPathUrl.scheme) {
        if (aRootUrl) {
          aPathUrl.scheme = aRootUrl.scheme;
        }
        return urlGenerate(aPathUrl);
      }
      if (aPathUrl || aPath.match(dataUrlRegexp)) {
        return aPath;
      }
      if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
        aRootUrl.host = aPath;
        return urlGenerate(aRootUrl);
      }
      var joined = aPath.charAt(0) === "/" ? aPath : normalize3(aRoot.replace(/\/+$/, "") + "/" + aPath);
      if (aRootUrl) {
        aRootUrl.path = joined;
        return urlGenerate(aRootUrl);
      }
      return joined;
    }
    exports2.join = join5;
    exports2.isAbsolute = function(aPath) {
      return aPath.charAt(0) === "/" || urlRegexp.test(aPath);
    };
    function relative2(aRoot, aPath) {
      if (aRoot === "") {
        aRoot = ".";
      }
      aRoot = aRoot.replace(/\/$/, "");
      var level = 0;
      while (aPath.indexOf(aRoot + "/") !== 0) {
        var index = aRoot.lastIndexOf("/");
        if (index < 0) {
          return aPath;
        }
        aRoot = aRoot.slice(0, index);
        if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
          return aPath;
        }
        ++level;
      }
      return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
    }
    exports2.relative = relative2;
    var supportsNullProto = function() {
      var obj = /* @__PURE__ */ Object.create(null);
      return !("__proto__" in obj);
    }();
    function identity(s) {
      return s;
    }
    function toSetString(aStr) {
      if (isProtoString(aStr)) {
        return "$" + aStr;
      }
      return aStr;
    }
    exports2.toSetString = supportsNullProto ? identity : toSetString;
    function fromSetString(aStr) {
      if (isProtoString(aStr)) {
        return aStr.slice(1);
      }
      return aStr;
    }
    exports2.fromSetString = supportsNullProto ? identity : fromSetString;
    function isProtoString(s) {
      if (!s) {
        return false;
      }
      var length = s.length;
      if (length < 9) {
        return false;
      }
      if (s.charCodeAt(length - 1) !== 95 || s.charCodeAt(length - 2) !== 95 || s.charCodeAt(length - 3) !== 111 || s.charCodeAt(length - 4) !== 116 || s.charCodeAt(length - 5) !== 111 || s.charCodeAt(length - 6) !== 114 || s.charCodeAt(length - 7) !== 112 || s.charCodeAt(length - 8) !== 95 || s.charCodeAt(length - 9) !== 95) {
        return false;
      }
      for (var i = length - 10; i >= 0; i--) {
        if (s.charCodeAt(i) !== 36) {
          return false;
        }
      }
      return true;
    }
    function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
      var cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0 || onlyCompareOriginal) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports2.compareByOriginalPositions = compareByOriginalPositions;
    function compareByOriginalPositionsNoSource(mappingA, mappingB, onlyCompareOriginal) {
      var cmp;
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0 || onlyCompareOriginal) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports2.compareByOriginalPositionsNoSource = compareByOriginalPositionsNoSource;
    function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
      var cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0 || onlyCompareGenerated) {
        return cmp;
      }
      cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports2.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;
    function compareByGeneratedPositionsDeflatedNoLine(mappingA, mappingB, onlyCompareGenerated) {
      var cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0 || onlyCompareGenerated) {
        return cmp;
      }
      cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports2.compareByGeneratedPositionsDeflatedNoLine = compareByGeneratedPositionsDeflatedNoLine;
    function strcmp(aStr1, aStr2) {
      if (aStr1 === aStr2) {
        return 0;
      }
      if (aStr1 === null) {
        return 1;
      }
      if (aStr2 === null) {
        return -1;
      }
      if (aStr1 > aStr2) {
        return 1;
      }
      return -1;
    }
    function compareByGeneratedPositionsInflated(mappingA, mappingB) {
      var cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports2.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;
    function parseSourceMapInput(str) {
      return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
    }
    exports2.parseSourceMapInput = parseSourceMapInput;
    function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
      sourceURL = sourceURL || "";
      if (sourceRoot) {
        if (sourceRoot[sourceRoot.length - 1] !== "/" && sourceURL[0] !== "/") {
          sourceRoot += "/";
        }
        sourceURL = sourceRoot + sourceURL;
      }
      if (sourceMapURL) {
        var parsed = urlParse(sourceMapURL);
        if (!parsed) {
          throw new Error("sourceMapURL could not be parsed");
        }
        if (parsed.path) {
          var index = parsed.path.lastIndexOf("/");
          if (index >= 0) {
            parsed.path = parsed.path.substring(0, index + 1);
          }
        }
        sourceURL = join5(urlGenerate(parsed), sourceURL);
      }
      return normalize3(sourceURL);
    }
    exports2.computeSourceURL = computeSourceURL;
  }
});

// ../../node_modules/source-map-js/lib/array-set.js
var require_array_set = __commonJS({
  "../../node_modules/source-map-js/lib/array-set.js"(exports2) {
    var util = require_util();
    var has = Object.prototype.hasOwnProperty;
    var hasNativeMap = typeof Map !== "undefined";
    function ArraySet() {
      this._array = [];
      this._set = hasNativeMap ? /* @__PURE__ */ new Map() : /* @__PURE__ */ Object.create(null);
    }
    ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
      var set = new ArraySet();
      for (var i = 0, len = aArray.length; i < len; i++) {
        set.add(aArray[i], aAllowDuplicates);
      }
      return set;
    };
    ArraySet.prototype.size = function ArraySet_size() {
      return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
    };
    ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
      var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
      var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
      var idx = this._array.length;
      if (!isDuplicate || aAllowDuplicates) {
        this._array.push(aStr);
      }
      if (!isDuplicate) {
        if (hasNativeMap) {
          this._set.set(aStr, idx);
        } else {
          this._set[sStr] = idx;
        }
      }
    };
    ArraySet.prototype.has = function ArraySet_has(aStr) {
      if (hasNativeMap) {
        return this._set.has(aStr);
      } else {
        var sStr = util.toSetString(aStr);
        return has.call(this._set, sStr);
      }
    };
    ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
      if (hasNativeMap) {
        var idx = this._set.get(aStr);
        if (idx >= 0) {
          return idx;
        }
      } else {
        var sStr = util.toSetString(aStr);
        if (has.call(this._set, sStr)) {
          return this._set[sStr];
        }
      }
      throw new Error('"' + aStr + '" is not in the set.');
    };
    ArraySet.prototype.at = function ArraySet_at(aIdx) {
      if (aIdx >= 0 && aIdx < this._array.length) {
        return this._array[aIdx];
      }
      throw new Error("No element indexed by " + aIdx);
    };
    ArraySet.prototype.toArray = function ArraySet_toArray() {
      return this._array.slice();
    };
    exports2.ArraySet = ArraySet;
  }
});

// ../../node_modules/source-map-js/lib/mapping-list.js
var require_mapping_list = __commonJS({
  "../../node_modules/source-map-js/lib/mapping-list.js"(exports2) {
    var util = require_util();
    function generatedPositionAfter(mappingA, mappingB) {
      var lineA = mappingA.generatedLine;
      var lineB = mappingB.generatedLine;
      var columnA = mappingA.generatedColumn;
      var columnB = mappingB.generatedColumn;
      return lineB > lineA || lineB == lineA && columnB >= columnA || util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
    }
    function MappingList() {
      this._array = [];
      this._sorted = true;
      this._last = { generatedLine: -1, generatedColumn: 0 };
    }
    MappingList.prototype.unsortedForEach = function MappingList_forEach(aCallback, aThisArg) {
      this._array.forEach(aCallback, aThisArg);
    };
    MappingList.prototype.add = function MappingList_add(aMapping) {
      if (generatedPositionAfter(this._last, aMapping)) {
        this._last = aMapping;
        this._array.push(aMapping);
      } else {
        this._sorted = false;
        this._array.push(aMapping);
      }
    };
    MappingList.prototype.toArray = function MappingList_toArray() {
      if (!this._sorted) {
        this._array.sort(util.compareByGeneratedPositionsInflated);
        this._sorted = true;
      }
      return this._array;
    };
    exports2.MappingList = MappingList;
  }
});

// ../../node_modules/source-map-js/lib/source-map-generator.js
var require_source_map_generator = __commonJS({
  "../../node_modules/source-map-js/lib/source-map-generator.js"(exports2) {
    var base64VLQ = require_base64_vlq();
    var util = require_util();
    var ArraySet = require_array_set().ArraySet;
    var MappingList = require_mapping_list().MappingList;
    function SourceMapGenerator(aArgs) {
      if (!aArgs) {
        aArgs = {};
      }
      this._file = util.getArg(aArgs, "file", null);
      this._sourceRoot = util.getArg(aArgs, "sourceRoot", null);
      this._skipValidation = util.getArg(aArgs, "skipValidation", false);
      this._ignoreInvalidMapping = util.getArg(aArgs, "ignoreInvalidMapping", false);
      this._sources = new ArraySet();
      this._names = new ArraySet();
      this._mappings = new MappingList();
      this._sourcesContents = null;
    }
    SourceMapGenerator.prototype._version = 3;
    SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer, generatorOps) {
      var sourceRoot = aSourceMapConsumer.sourceRoot;
      var generator = new SourceMapGenerator(Object.assign(generatorOps || {}, {
        file: aSourceMapConsumer.file,
        sourceRoot
      }));
      aSourceMapConsumer.eachMapping(function(mapping) {
        var newMapping = {
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          }
        };
        if (mapping.source != null) {
          newMapping.source = mapping.source;
          if (sourceRoot != null) {
            newMapping.source = util.relative(sourceRoot, newMapping.source);
          }
          newMapping.original = {
            line: mapping.originalLine,
            column: mapping.originalColumn
          };
          if (mapping.name != null) {
            newMapping.name = mapping.name;
          }
        }
        generator.addMapping(newMapping);
      });
      aSourceMapConsumer.sources.forEach(function(sourceFile) {
        var sourceRelative = sourceFile;
        if (sourceRoot !== null) {
          sourceRelative = util.relative(sourceRoot, sourceFile);
        }
        if (!generator._sources.has(sourceRelative)) {
          generator._sources.add(sourceRelative);
        }
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          generator.setSourceContent(sourceFile, content);
        }
      });
      return generator;
    };
    SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
      var generated = util.getArg(aArgs, "generated");
      var original = util.getArg(aArgs, "original", null);
      var source = util.getArg(aArgs, "source", null);
      var name = util.getArg(aArgs, "name", null);
      if (!this._skipValidation) {
        if (this._validateMapping(generated, original, source, name) === false) {
          return;
        }
      }
      if (source != null) {
        source = String(source);
        if (!this._sources.has(source)) {
          this._sources.add(source);
        }
      }
      if (name != null) {
        name = String(name);
        if (!this._names.has(name)) {
          this._names.add(name);
        }
      }
      this._mappings.add({
        generatedLine: generated.line,
        generatedColumn: generated.column,
        originalLine: original != null && original.line,
        originalColumn: original != null && original.column,
        source,
        name
      });
    };
    SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
      var source = aSourceFile;
      if (this._sourceRoot != null) {
        source = util.relative(this._sourceRoot, source);
      }
      if (aSourceContent != null) {
        if (!this._sourcesContents) {
          this._sourcesContents = /* @__PURE__ */ Object.create(null);
        }
        this._sourcesContents[util.toSetString(source)] = aSourceContent;
      } else if (this._sourcesContents) {
        delete this._sourcesContents[util.toSetString(source)];
        if (Object.keys(this._sourcesContents).length === 0) {
          this._sourcesContents = null;
        }
      }
    };
    SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
      var sourceFile = aSourceFile;
      if (aSourceFile == null) {
        if (aSourceMapConsumer.file == null) {
          throw new Error(
            `SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, or the source map's "file" property. Both were omitted.`
          );
        }
        sourceFile = aSourceMapConsumer.file;
      }
      var sourceRoot = this._sourceRoot;
      if (sourceRoot != null) {
        sourceFile = util.relative(sourceRoot, sourceFile);
      }
      var newSources = new ArraySet();
      var newNames = new ArraySet();
      this._mappings.unsortedForEach(function(mapping) {
        if (mapping.source === sourceFile && mapping.originalLine != null) {
          var original = aSourceMapConsumer.originalPositionFor({
            line: mapping.originalLine,
            column: mapping.originalColumn
          });
          if (original.source != null) {
            mapping.source = original.source;
            if (aSourceMapPath != null) {
              mapping.source = util.join(aSourceMapPath, mapping.source);
            }
            if (sourceRoot != null) {
              mapping.source = util.relative(sourceRoot, mapping.source);
            }
            mapping.originalLine = original.line;
            mapping.originalColumn = original.column;
            if (original.name != null) {
              mapping.name = original.name;
            }
          }
        }
        var source = mapping.source;
        if (source != null && !newSources.has(source)) {
          newSources.add(source);
        }
        var name = mapping.name;
        if (name != null && !newNames.has(name)) {
          newNames.add(name);
        }
      }, this);
      this._sources = newSources;
      this._names = newNames;
      aSourceMapConsumer.sources.forEach(function(sourceFile2) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile2);
        if (content != null) {
          if (aSourceMapPath != null) {
            sourceFile2 = util.join(aSourceMapPath, sourceFile2);
          }
          if (sourceRoot != null) {
            sourceFile2 = util.relative(sourceRoot, sourceFile2);
          }
          this.setSourceContent(sourceFile2, content);
        }
      }, this);
    };
    SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
      if (aOriginal && typeof aOriginal.line !== "number" && typeof aOriginal.column !== "number") {
        var message = "original.line and original.column are not numbers -- you probably meant to omit the original mapping entirely and only map the generated position. If so, pass null for the original mapping instead of an object with empty or null values.";
        if (this._ignoreInvalidMapping) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn(message);
          }
          return false;
        } else {
          throw new Error(message);
        }
      }
      if (aGenerated && "line" in aGenerated && "column" in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
        return;
      } else if (aGenerated && "line" in aGenerated && "column" in aGenerated && aOriginal && "line" in aOriginal && "column" in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
        return;
      } else {
        var message = "Invalid mapping: " + JSON.stringify({
          generated: aGenerated,
          source: aSource,
          original: aOriginal,
          name: aName
        });
        if (this._ignoreInvalidMapping) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn(message);
          }
          return false;
        } else {
          throw new Error(message);
        }
      }
    };
    SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
      var previousGeneratedColumn = 0;
      var previousGeneratedLine = 1;
      var previousOriginalColumn = 0;
      var previousOriginalLine = 0;
      var previousName = 0;
      var previousSource = 0;
      var result = "";
      var next;
      var mapping;
      var nameIdx;
      var sourceIdx;
      var mappings = this._mappings.toArray();
      for (var i = 0, len = mappings.length; i < len; i++) {
        mapping = mappings[i];
        next = "";
        if (mapping.generatedLine !== previousGeneratedLine) {
          previousGeneratedColumn = 0;
          while (mapping.generatedLine !== previousGeneratedLine) {
            next += ";";
            previousGeneratedLine++;
          }
        } else {
          if (i > 0) {
            if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
              continue;
            }
            next += ",";
          }
        }
        next += base64VLQ.encode(mapping.generatedColumn - previousGeneratedColumn);
        previousGeneratedColumn = mapping.generatedColumn;
        if (mapping.source != null) {
          sourceIdx = this._sources.indexOf(mapping.source);
          next += base64VLQ.encode(sourceIdx - previousSource);
          previousSource = sourceIdx;
          next += base64VLQ.encode(mapping.originalLine - 1 - previousOriginalLine);
          previousOriginalLine = mapping.originalLine - 1;
          next += base64VLQ.encode(mapping.originalColumn - previousOriginalColumn);
          previousOriginalColumn = mapping.originalColumn;
          if (mapping.name != null) {
            nameIdx = this._names.indexOf(mapping.name);
            next += base64VLQ.encode(nameIdx - previousName);
            previousName = nameIdx;
          }
        }
        result += next;
      }
      return result;
    };
    SourceMapGenerator.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
      return aSources.map(function(source) {
        if (!this._sourcesContents) {
          return null;
        }
        if (aSourceRoot != null) {
          source = util.relative(aSourceRoot, source);
        }
        var key = util.toSetString(source);
        return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
      }, this);
    };
    SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
      var map = {
        version: this._version,
        sources: this._sources.toArray(),
        names: this._names.toArray(),
        mappings: this._serializeMappings()
      };
      if (this._file != null) {
        map.file = this._file;
      }
      if (this._sourceRoot != null) {
        map.sourceRoot = this._sourceRoot;
      }
      if (this._sourcesContents) {
        map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
      }
      return map;
    };
    SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
      return JSON.stringify(this.toJSON());
    };
    exports2.SourceMapGenerator = SourceMapGenerator;
  }
});

// ../../node_modules/source-map-js/lib/binary-search.js
var require_binary_search = __commonJS({
  "../../node_modules/source-map-js/lib/binary-search.js"(exports2) {
    exports2.GREATEST_LOWER_BOUND = 1;
    exports2.LEAST_UPPER_BOUND = 2;
    function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
      var mid = Math.floor((aHigh - aLow) / 2) + aLow;
      var cmp = aCompare(aNeedle, aHaystack[mid], true);
      if (cmp === 0) {
        return mid;
      } else if (cmp > 0) {
        if (aHigh - mid > 1) {
          return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
        }
        if (aBias == exports2.LEAST_UPPER_BOUND) {
          return aHigh < aHaystack.length ? aHigh : -1;
        } else {
          return mid;
        }
      } else {
        if (mid - aLow > 1) {
          return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
        }
        if (aBias == exports2.LEAST_UPPER_BOUND) {
          return mid;
        } else {
          return aLow < 0 ? -1 : aLow;
        }
      }
    }
    exports2.search = function search(aNeedle, aHaystack, aCompare, aBias) {
      if (aHaystack.length === 0) {
        return -1;
      }
      var index = recursiveSearch(
        -1,
        aHaystack.length,
        aNeedle,
        aHaystack,
        aCompare,
        aBias || exports2.GREATEST_LOWER_BOUND
      );
      if (index < 0) {
        return -1;
      }
      while (index - 1 >= 0) {
        if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
          break;
        }
        --index;
      }
      return index;
    };
  }
});

// ../../node_modules/source-map-js/lib/quick-sort.js
var require_quick_sort = __commonJS({
  "../../node_modules/source-map-js/lib/quick-sort.js"(exports2) {
    function SortTemplate(comparator) {
      function swap(ary, x, y) {
        var temp = ary[x];
        ary[x] = ary[y];
        ary[y] = temp;
      }
      function randomIntInRange(low, high) {
        return Math.round(low + Math.random() * (high - low));
      }
      function doQuickSort(ary, comparator2, p, r) {
        if (p < r) {
          var pivotIndex = randomIntInRange(p, r);
          var i = p - 1;
          swap(ary, pivotIndex, r);
          var pivot = ary[r];
          for (var j = p; j < r; j++) {
            if (comparator2(ary[j], pivot, false) <= 0) {
              i += 1;
              swap(ary, i, j);
            }
          }
          swap(ary, i + 1, j);
          var q = i + 1;
          doQuickSort(ary, comparator2, p, q - 1);
          doQuickSort(ary, comparator2, q + 1, r);
        }
      }
      return doQuickSort;
    }
    function cloneSort(comparator) {
      let template = SortTemplate.toString();
      let templateFn = new Function(`return ${template}`)();
      return templateFn(comparator);
    }
    var sortCache = /* @__PURE__ */ new WeakMap();
    exports2.quickSort = function(ary, comparator, start = 0) {
      let doQuickSort = sortCache.get(comparator);
      if (doQuickSort === void 0) {
        doQuickSort = cloneSort(comparator);
        sortCache.set(comparator, doQuickSort);
      }
      doQuickSort(ary, comparator, start, ary.length - 1);
    };
  }
});

// ../../node_modules/source-map-js/lib/source-map-consumer.js
var require_source_map_consumer = __commonJS({
  "../../node_modules/source-map-js/lib/source-map-consumer.js"(exports2) {
    var util = require_util();
    var binarySearch = require_binary_search();
    var ArraySet = require_array_set().ArraySet;
    var base64VLQ = require_base64_vlq();
    var quickSort = require_quick_sort().quickSort;
    function SourceMapConsumer2(aSourceMap, aSourceMapURL) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === "string") {
        sourceMap = util.parseSourceMapInput(aSourceMap);
      }
      return sourceMap.sections != null ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL) : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
    }
    SourceMapConsumer2.fromSourceMap = function(aSourceMap, aSourceMapURL) {
      return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
    };
    SourceMapConsumer2.prototype._version = 3;
    SourceMapConsumer2.prototype.__generatedMappings = null;
    Object.defineProperty(SourceMapConsumer2.prototype, "_generatedMappings", {
      configurable: true,
      enumerable: true,
      get: function() {
        if (!this.__generatedMappings) {
          this._parseMappings(this._mappings, this.sourceRoot);
        }
        return this.__generatedMappings;
      }
    });
    SourceMapConsumer2.prototype.__originalMappings = null;
    Object.defineProperty(SourceMapConsumer2.prototype, "_originalMappings", {
      configurable: true,
      enumerable: true,
      get: function() {
        if (!this.__originalMappings) {
          this._parseMappings(this._mappings, this.sourceRoot);
        }
        return this.__originalMappings;
      }
    });
    SourceMapConsumer2.prototype._charIsMappingSeparator = function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
      var c = aStr.charAt(index);
      return c === ";" || c === ",";
    };
    SourceMapConsumer2.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      throw new Error("Subclasses must implement _parseMappings");
    };
    SourceMapConsumer2.GENERATED_ORDER = 1;
    SourceMapConsumer2.ORIGINAL_ORDER = 2;
    SourceMapConsumer2.GREATEST_LOWER_BOUND = 1;
    SourceMapConsumer2.LEAST_UPPER_BOUND = 2;
    SourceMapConsumer2.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
      var context = aContext || null;
      var order = aOrder || SourceMapConsumer2.GENERATED_ORDER;
      var mappings;
      switch (order) {
        case SourceMapConsumer2.GENERATED_ORDER:
          mappings = this._generatedMappings;
          break;
        case SourceMapConsumer2.ORIGINAL_ORDER:
          mappings = this._originalMappings;
          break;
        default:
          throw new Error("Unknown order of iteration.");
      }
      var sourceRoot = this.sourceRoot;
      var boundCallback = aCallback.bind(context);
      var names = this._names;
      var sources = this._sources;
      var sourceMapURL = this._sourceMapURL;
      for (var i = 0, n = mappings.length; i < n; i++) {
        var mapping = mappings[i];
        var source = mapping.source === null ? null : sources.at(mapping.source);
        if (source !== null) {
          source = util.computeSourceURL(sourceRoot, source, sourceMapURL);
        }
        boundCallback({
          source,
          generatedLine: mapping.generatedLine,
          generatedColumn: mapping.generatedColumn,
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: mapping.name === null ? null : names.at(mapping.name)
        });
      }
    };
    SourceMapConsumer2.prototype.allGeneratedPositionsFor = function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
      var line = util.getArg(aArgs, "line");
      var needle = {
        source: util.getArg(aArgs, "source"),
        originalLine: line,
        originalColumn: util.getArg(aArgs, "column", 0)
      };
      needle.source = this._findSourceIndex(needle.source);
      if (needle.source < 0) {
        return [];
      }
      var mappings = [];
      var index = this._findMapping(
        needle,
        this._originalMappings,
        "originalLine",
        "originalColumn",
        util.compareByOriginalPositions,
        binarySearch.LEAST_UPPER_BOUND
      );
      if (index >= 0) {
        var mapping = this._originalMappings[index];
        if (aArgs.column === void 0) {
          var originalLine = mapping.originalLine;
          while (mapping && mapping.originalLine === originalLine) {
            mappings.push({
              line: util.getArg(mapping, "generatedLine", null),
              column: util.getArg(mapping, "generatedColumn", null),
              lastColumn: util.getArg(mapping, "lastGeneratedColumn", null)
            });
            mapping = this._originalMappings[++index];
          }
        } else {
          var originalColumn = mapping.originalColumn;
          while (mapping && mapping.originalLine === line && mapping.originalColumn == originalColumn) {
            mappings.push({
              line: util.getArg(mapping, "generatedLine", null),
              column: util.getArg(mapping, "generatedColumn", null),
              lastColumn: util.getArg(mapping, "lastGeneratedColumn", null)
            });
            mapping = this._originalMappings[++index];
          }
        }
      }
      return mappings;
    };
    exports2.SourceMapConsumer = SourceMapConsumer2;
    function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === "string") {
        sourceMap = util.parseSourceMapInput(aSourceMap);
      }
      var version = util.getArg(sourceMap, "version");
      var sources = util.getArg(sourceMap, "sources");
      var names = util.getArg(sourceMap, "names", []);
      var sourceRoot = util.getArg(sourceMap, "sourceRoot", null);
      var sourcesContent = util.getArg(sourceMap, "sourcesContent", null);
      var mappings = util.getArg(sourceMap, "mappings");
      var file = util.getArg(sourceMap, "file", null);
      if (version != this._version) {
        throw new Error("Unsupported version: " + version);
      }
      if (sourceRoot) {
        sourceRoot = util.normalize(sourceRoot);
      }
      sources = sources.map(String).map(util.normalize).map(function(source) {
        return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source) ? util.relative(sourceRoot, source) : source;
      });
      this._names = ArraySet.fromArray(names.map(String), true);
      this._sources = ArraySet.fromArray(sources, true);
      this._absoluteSources = this._sources.toArray().map(function(s) {
        return util.computeSourceURL(sourceRoot, s, aSourceMapURL);
      });
      this.sourceRoot = sourceRoot;
      this.sourcesContent = sourcesContent;
      this._mappings = mappings;
      this._sourceMapURL = aSourceMapURL;
      this.file = file;
    }
    BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer2.prototype);
    BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer2;
    BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
      var relativeSource = aSource;
      if (this.sourceRoot != null) {
        relativeSource = util.relative(this.sourceRoot, relativeSource);
      }
      if (this._sources.has(relativeSource)) {
        return this._sources.indexOf(relativeSource);
      }
      var i;
      for (i = 0; i < this._absoluteSources.length; ++i) {
        if (this._absoluteSources[i] == aSource) {
          return i;
        }
      }
      return -1;
    };
    BasicSourceMapConsumer.fromSourceMap = function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
      var smc = Object.create(BasicSourceMapConsumer.prototype);
      var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
      var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
      smc.sourceRoot = aSourceMap._sourceRoot;
      smc.sourcesContent = aSourceMap._generateSourcesContent(
        smc._sources.toArray(),
        smc.sourceRoot
      );
      smc.file = aSourceMap._file;
      smc._sourceMapURL = aSourceMapURL;
      smc._absoluteSources = smc._sources.toArray().map(function(s) {
        return util.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
      });
      var generatedMappings = aSourceMap._mappings.toArray().slice();
      var destGeneratedMappings = smc.__generatedMappings = [];
      var destOriginalMappings = smc.__originalMappings = [];
      for (var i = 0, length = generatedMappings.length; i < length; i++) {
        var srcMapping = generatedMappings[i];
        var destMapping = new Mapping();
        destMapping.generatedLine = srcMapping.generatedLine;
        destMapping.generatedColumn = srcMapping.generatedColumn;
        if (srcMapping.source) {
          destMapping.source = sources.indexOf(srcMapping.source);
          destMapping.originalLine = srcMapping.originalLine;
          destMapping.originalColumn = srcMapping.originalColumn;
          if (srcMapping.name) {
            destMapping.name = names.indexOf(srcMapping.name);
          }
          destOriginalMappings.push(destMapping);
        }
        destGeneratedMappings.push(destMapping);
      }
      quickSort(smc.__originalMappings, util.compareByOriginalPositions);
      return smc;
    };
    BasicSourceMapConsumer.prototype._version = 3;
    Object.defineProperty(BasicSourceMapConsumer.prototype, "sources", {
      get: function() {
        return this._absoluteSources.slice();
      }
    });
    function Mapping() {
      this.generatedLine = 0;
      this.generatedColumn = 0;
      this.source = null;
      this.originalLine = null;
      this.originalColumn = null;
      this.name = null;
    }
    var compareGenerated = util.compareByGeneratedPositionsDeflatedNoLine;
    function sortGenerated(array, start) {
      let l = array.length;
      let n = array.length - start;
      if (n <= 1) {
        return;
      } else if (n == 2) {
        let a = array[start];
        let b = array[start + 1];
        if (compareGenerated(a, b) > 0) {
          array[start] = b;
          array[start + 1] = a;
        }
      } else if (n < 20) {
        for (let i = start; i < l; i++) {
          for (let j = i; j > start; j--) {
            let a = array[j - 1];
            let b = array[j];
            if (compareGenerated(a, b) <= 0) {
              break;
            }
            array[j - 1] = b;
            array[j] = a;
          }
        }
      } else {
        quickSort(array, compareGenerated, start);
      }
    }
    BasicSourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      var generatedLine = 1;
      var previousGeneratedColumn = 0;
      var previousOriginalLine = 0;
      var previousOriginalColumn = 0;
      var previousSource = 0;
      var previousName = 0;
      var length = aStr.length;
      var index = 0;
      var cachedSegments = {};
      var temp = {};
      var originalMappings = [];
      var generatedMappings = [];
      var mapping, str, segment, end, value;
      let subarrayStart = 0;
      while (index < length) {
        if (aStr.charAt(index) === ";") {
          generatedLine++;
          index++;
          previousGeneratedColumn = 0;
          sortGenerated(generatedMappings, subarrayStart);
          subarrayStart = generatedMappings.length;
        } else if (aStr.charAt(index) === ",") {
          index++;
        } else {
          mapping = new Mapping();
          mapping.generatedLine = generatedLine;
          for (end = index; end < length; end++) {
            if (this._charIsMappingSeparator(aStr, end)) {
              break;
            }
          }
          str = aStr.slice(index, end);
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }
          if (segment.length === 2) {
            throw new Error("Found a source, but no line and column");
          }
          if (segment.length === 3) {
            throw new Error("Found a source and line, but no column");
          }
          mapping.generatedColumn = previousGeneratedColumn + segment[0];
          previousGeneratedColumn = mapping.generatedColumn;
          if (segment.length > 1) {
            mapping.source = previousSource + segment[1];
            previousSource += segment[1];
            mapping.originalLine = previousOriginalLine + segment[2];
            previousOriginalLine = mapping.originalLine;
            mapping.originalLine += 1;
            mapping.originalColumn = previousOriginalColumn + segment[3];
            previousOriginalColumn = mapping.originalColumn;
            if (segment.length > 4) {
              mapping.name = previousName + segment[4];
              previousName += segment[4];
            }
          }
          generatedMappings.push(mapping);
          if (typeof mapping.originalLine === "number") {
            let currentSource = mapping.source;
            while (originalMappings.length <= currentSource) {
              originalMappings.push(null);
            }
            if (originalMappings[currentSource] === null) {
              originalMappings[currentSource] = [];
            }
            originalMappings[currentSource].push(mapping);
          }
        }
      }
      sortGenerated(generatedMappings, subarrayStart);
      this.__generatedMappings = generatedMappings;
      for (var i = 0; i < originalMappings.length; i++) {
        if (originalMappings[i] != null) {
          quickSort(originalMappings[i], util.compareByOriginalPositionsNoSource);
        }
      }
      this.__originalMappings = [].concat(...originalMappings);
    };
    BasicSourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator, aBias) {
      if (aNeedle[aLineName] <= 0) {
        throw new TypeError("Line must be greater than or equal to 1, got " + aNeedle[aLineName]);
      }
      if (aNeedle[aColumnName] < 0) {
        throw new TypeError("Column must be greater than or equal to 0, got " + aNeedle[aColumnName]);
      }
      return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
    };
    BasicSourceMapConsumer.prototype.computeColumnSpans = function SourceMapConsumer_computeColumnSpans() {
      for (var index = 0; index < this._generatedMappings.length; ++index) {
        var mapping = this._generatedMappings[index];
        if (index + 1 < this._generatedMappings.length) {
          var nextMapping = this._generatedMappings[index + 1];
          if (mapping.generatedLine === nextMapping.generatedLine) {
            mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
            continue;
          }
        }
        mapping.lastGeneratedColumn = Infinity;
      }
    };
    BasicSourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, "line"),
        generatedColumn: util.getArg(aArgs, "column")
      };
      var index = this._findMapping(
        needle,
        this._generatedMappings,
        "generatedLine",
        "generatedColumn",
        util.compareByGeneratedPositionsDeflated,
        util.getArg(aArgs, "bias", SourceMapConsumer2.GREATEST_LOWER_BOUND)
      );
      if (index >= 0) {
        var mapping = this._generatedMappings[index];
        if (mapping.generatedLine === needle.generatedLine) {
          var source = util.getArg(mapping, "source", null);
          if (source !== null) {
            source = this._sources.at(source);
            source = util.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
          }
          var name = util.getArg(mapping, "name", null);
          if (name !== null) {
            name = this._names.at(name);
          }
          return {
            source,
            line: util.getArg(mapping, "originalLine", null),
            column: util.getArg(mapping, "originalColumn", null),
            name
          };
        }
      }
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    };
    BasicSourceMapConsumer.prototype.hasContentsOfAllSources = function BasicSourceMapConsumer_hasContentsOfAllSources() {
      if (!this.sourcesContent) {
        return false;
      }
      return this.sourcesContent.length >= this._sources.size() && !this.sourcesContent.some(function(sc) {
        return sc == null;
      });
    };
    BasicSourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
      if (!this.sourcesContent) {
        return null;
      }
      var index = this._findSourceIndex(aSource);
      if (index >= 0) {
        return this.sourcesContent[index];
      }
      var relativeSource = aSource;
      if (this.sourceRoot != null) {
        relativeSource = util.relative(this.sourceRoot, relativeSource);
      }
      var url;
      if (this.sourceRoot != null && (url = util.urlParse(this.sourceRoot))) {
        var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
        if (url.scheme == "file" && this._sources.has(fileUriAbsPath)) {
          return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
        }
        if ((!url.path || url.path == "/") && this._sources.has("/" + relativeSource)) {
          return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
        }
      }
      if (nullOnMissing) {
        return null;
      } else {
        throw new Error('"' + relativeSource + '" is not in the SourceMap.');
      }
    };
    BasicSourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
      var source = util.getArg(aArgs, "source");
      source = this._findSourceIndex(source);
      if (source < 0) {
        return {
          line: null,
          column: null,
          lastColumn: null
        };
      }
      var needle = {
        source,
        originalLine: util.getArg(aArgs, "line"),
        originalColumn: util.getArg(aArgs, "column")
      };
      var index = this._findMapping(
        needle,
        this._originalMappings,
        "originalLine",
        "originalColumn",
        util.compareByOriginalPositions,
        util.getArg(aArgs, "bias", SourceMapConsumer2.GREATEST_LOWER_BOUND)
      );
      if (index >= 0) {
        var mapping = this._originalMappings[index];
        if (mapping.source === needle.source) {
          return {
            line: util.getArg(mapping, "generatedLine", null),
            column: util.getArg(mapping, "generatedColumn", null),
            lastColumn: util.getArg(mapping, "lastGeneratedColumn", null)
          };
        }
      }
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    };
    exports2.BasicSourceMapConsumer = BasicSourceMapConsumer;
    function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === "string") {
        sourceMap = util.parseSourceMapInput(aSourceMap);
      }
      var version = util.getArg(sourceMap, "version");
      var sections = util.getArg(sourceMap, "sections");
      if (version != this._version) {
        throw new Error("Unsupported version: " + version);
      }
      this._sources = new ArraySet();
      this._names = new ArraySet();
      var lastOffset = {
        line: -1,
        column: 0
      };
      this._sections = sections.map(function(s) {
        if (s.url) {
          throw new Error("Support for url field in sections not implemented.");
        }
        var offset = util.getArg(s, "offset");
        var offsetLine = util.getArg(offset, "line");
        var offsetColumn = util.getArg(offset, "column");
        if (offsetLine < lastOffset.line || offsetLine === lastOffset.line && offsetColumn < lastOffset.column) {
          throw new Error("Section offsets must be ordered and non-overlapping.");
        }
        lastOffset = offset;
        return {
          generatedOffset: {
            // The offset fields are 0-based, but we use 1-based indices when
            // encoding/decoding from VLQ.
            generatedLine: offsetLine + 1,
            generatedColumn: offsetColumn + 1
          },
          consumer: new SourceMapConsumer2(util.getArg(s, "map"), aSourceMapURL)
        };
      });
    }
    IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer2.prototype);
    IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer2;
    IndexedSourceMapConsumer.prototype._version = 3;
    Object.defineProperty(IndexedSourceMapConsumer.prototype, "sources", {
      get: function() {
        var sources = [];
        for (var i = 0; i < this._sections.length; i++) {
          for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
            sources.push(this._sections[i].consumer.sources[j]);
          }
        }
        return sources;
      }
    });
    IndexedSourceMapConsumer.prototype.originalPositionFor = function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, "line"),
        generatedColumn: util.getArg(aArgs, "column")
      };
      var sectionIndex = binarySearch.search(
        needle,
        this._sections,
        function(needle2, section2) {
          var cmp = needle2.generatedLine - section2.generatedOffset.generatedLine;
          if (cmp) {
            return cmp;
          }
          return needle2.generatedColumn - section2.generatedOffset.generatedColumn;
        }
      );
      var section = this._sections[sectionIndex];
      if (!section) {
        return {
          source: null,
          line: null,
          column: null,
          name: null
        };
      }
      return section.consumer.originalPositionFor({
        line: needle.generatedLine - (section.generatedOffset.generatedLine - 1),
        column: needle.generatedColumn - (section.generatedOffset.generatedLine === needle.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
        bias: aArgs.bias
      });
    };
    IndexedSourceMapConsumer.prototype.hasContentsOfAllSources = function IndexedSourceMapConsumer_hasContentsOfAllSources() {
      return this._sections.every(function(s) {
        return s.consumer.hasContentsOfAllSources();
      });
    };
    IndexedSourceMapConsumer.prototype.sourceContentFor = function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        var content = section.consumer.sourceContentFor(aSource, true);
        if (content || content === "") {
          return content;
        }
      }
      if (nullOnMissing) {
        return null;
      } else {
        throw new Error('"' + aSource + '" is not in the SourceMap.');
      }
    };
    IndexedSourceMapConsumer.prototype.generatedPositionFor = function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        if (section.consumer._findSourceIndex(util.getArg(aArgs, "source")) === -1) {
          continue;
        }
        var generatedPosition = section.consumer.generatedPositionFor(aArgs);
        if (generatedPosition) {
          var ret = {
            line: generatedPosition.line + (section.generatedOffset.generatedLine - 1),
            column: generatedPosition.column + (section.generatedOffset.generatedLine === generatedPosition.line ? section.generatedOffset.generatedColumn - 1 : 0)
          };
          return ret;
        }
      }
      return {
        line: null,
        column: null
      };
    };
    IndexedSourceMapConsumer.prototype._parseMappings = function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      this.__generatedMappings = [];
      this.__originalMappings = [];
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        var sectionMappings = section.consumer._generatedMappings;
        for (var j = 0; j < sectionMappings.length; j++) {
          var mapping = sectionMappings[j];
          var source = section.consumer._sources.at(mapping.source);
          if (source !== null) {
            source = util.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
          }
          this._sources.add(source);
          source = this._sources.indexOf(source);
          var name = null;
          if (mapping.name) {
            name = section.consumer._names.at(mapping.name);
            this._names.add(name);
            name = this._names.indexOf(name);
          }
          var adjustedMapping = {
            source,
            generatedLine: mapping.generatedLine + (section.generatedOffset.generatedLine - 1),
            generatedColumn: mapping.generatedColumn + (section.generatedOffset.generatedLine === mapping.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
            originalLine: mapping.originalLine,
            originalColumn: mapping.originalColumn,
            name
          };
          this.__generatedMappings.push(adjustedMapping);
          if (typeof adjustedMapping.originalLine === "number") {
            this.__originalMappings.push(adjustedMapping);
          }
        }
      }
      quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
      quickSort(this.__originalMappings, util.compareByOriginalPositions);
    };
    exports2.IndexedSourceMapConsumer = IndexedSourceMapConsumer;
  }
});

// ../../node_modules/source-map-js/lib/source-node.js
var require_source_node = __commonJS({
  "../../node_modules/source-map-js/lib/source-node.js"(exports2) {
    var SourceMapGenerator = require_source_map_generator().SourceMapGenerator;
    var util = require_util();
    var REGEX_NEWLINE = /(\r?\n)/;
    var NEWLINE_CODE = 10;
    var isSourceNode = "$$$isSourceNode$$$";
    function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
      this.children = [];
      this.sourceContents = {};
      this.line = aLine == null ? null : aLine;
      this.column = aColumn == null ? null : aColumn;
      this.source = aSource == null ? null : aSource;
      this.name = aName == null ? null : aName;
      this[isSourceNode] = true;
      if (aChunks != null)
        this.add(aChunks);
    }
    SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
      var node = new SourceNode();
      var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
      var remainingLinesIndex = 0;
      var shiftNextLine = function() {
        var lineContents = getNextLine();
        var newLine = getNextLine() || "";
        return lineContents + newLine;
        function getNextLine() {
          return remainingLinesIndex < remainingLines.length ? remainingLines[remainingLinesIndex++] : void 0;
        }
      };
      var lastGeneratedLine = 1, lastGeneratedColumn = 0;
      var lastMapping = null;
      aSourceMapConsumer.eachMapping(function(mapping) {
        if (lastMapping !== null) {
          if (lastGeneratedLine < mapping.generatedLine) {
            addMappingWithCode(lastMapping, shiftNextLine());
            lastGeneratedLine++;
            lastGeneratedColumn = 0;
          } else {
            var nextLine = remainingLines[remainingLinesIndex] || "";
            var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
            remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
            addMappingWithCode(lastMapping, code);
            lastMapping = mapping;
            return;
          }
        }
        while (lastGeneratedLine < mapping.generatedLine) {
          node.add(shiftNextLine());
          lastGeneratedLine++;
        }
        if (lastGeneratedColumn < mapping.generatedColumn) {
          var nextLine = remainingLines[remainingLinesIndex] || "";
          node.add(nextLine.substr(0, mapping.generatedColumn));
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
        }
        lastMapping = mapping;
      }, this);
      if (remainingLinesIndex < remainingLines.length) {
        if (lastMapping) {
          addMappingWithCode(lastMapping, shiftNextLine());
        }
        node.add(remainingLines.splice(remainingLinesIndex).join(""));
      }
      aSourceMapConsumer.sources.forEach(function(sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aRelativePath != null) {
            sourceFile = util.join(aRelativePath, sourceFile);
          }
          node.setSourceContent(sourceFile, content);
        }
      });
      return node;
      function addMappingWithCode(mapping, code) {
        if (mapping === null || mapping.source === void 0) {
          node.add(code);
        } else {
          var source = aRelativePath ? util.join(aRelativePath, mapping.source) : mapping.source;
          node.add(new SourceNode(
            mapping.originalLine,
            mapping.originalColumn,
            source,
            code,
            mapping.name
          ));
        }
      }
    };
    SourceNode.prototype.add = function SourceNode_add(aChunk) {
      if (Array.isArray(aChunk)) {
        aChunk.forEach(function(chunk) {
          this.add(chunk);
        }, this);
      } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
        if (aChunk) {
          this.children.push(aChunk);
        }
      } else {
        throw new TypeError(
          "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
        );
      }
      return this;
    };
    SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
      if (Array.isArray(aChunk)) {
        for (var i = aChunk.length - 1; i >= 0; i--) {
          this.prepend(aChunk[i]);
        }
      } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
        this.children.unshift(aChunk);
      } else {
        throw new TypeError(
          "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
        );
      }
      return this;
    };
    SourceNode.prototype.walk = function SourceNode_walk(aFn) {
      var chunk;
      for (var i = 0, len = this.children.length; i < len; i++) {
        chunk = this.children[i];
        if (chunk[isSourceNode]) {
          chunk.walk(aFn);
        } else {
          if (chunk !== "") {
            aFn(chunk, {
              source: this.source,
              line: this.line,
              column: this.column,
              name: this.name
            });
          }
        }
      }
    };
    SourceNode.prototype.join = function SourceNode_join(aSep) {
      var newChildren;
      var i;
      var len = this.children.length;
      if (len > 0) {
        newChildren = [];
        for (i = 0; i < len - 1; i++) {
          newChildren.push(this.children[i]);
          newChildren.push(aSep);
        }
        newChildren.push(this.children[i]);
        this.children = newChildren;
      }
      return this;
    };
    SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
      var lastChild = this.children[this.children.length - 1];
      if (lastChild[isSourceNode]) {
        lastChild.replaceRight(aPattern, aReplacement);
      } else if (typeof lastChild === "string") {
        this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
      } else {
        this.children.push("".replace(aPattern, aReplacement));
      }
      return this;
    };
    SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
      this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
    };
    SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
      for (var i = 0, len = this.children.length; i < len; i++) {
        if (this.children[i][isSourceNode]) {
          this.children[i].walkSourceContents(aFn);
        }
      }
      var sources = Object.keys(this.sourceContents);
      for (var i = 0, len = sources.length; i < len; i++) {
        aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
      }
    };
    SourceNode.prototype.toString = function SourceNode_toString() {
      var str = "";
      this.walk(function(chunk) {
        str += chunk;
      });
      return str;
    };
    SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
      var generated = {
        code: "",
        line: 1,
        column: 0
      };
      var map = new SourceMapGenerator(aArgs);
      var sourceMappingActive = false;
      var lastOriginalSource = null;
      var lastOriginalLine = null;
      var lastOriginalColumn = null;
      var lastOriginalName = null;
      this.walk(function(chunk, original) {
        generated.code += chunk;
        if (original.source !== null && original.line !== null && original.column !== null) {
          if (lastOriginalSource !== original.source || lastOriginalLine !== original.line || lastOriginalColumn !== original.column || lastOriginalName !== original.name) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
          lastOriginalSource = original.source;
          lastOriginalLine = original.line;
          lastOriginalColumn = original.column;
          lastOriginalName = original.name;
          sourceMappingActive = true;
        } else if (sourceMappingActive) {
          map.addMapping({
            generated: {
              line: generated.line,
              column: generated.column
            }
          });
          lastOriginalSource = null;
          sourceMappingActive = false;
        }
        for (var idx = 0, length = chunk.length; idx < length; idx++) {
          if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
            generated.line++;
            generated.column = 0;
            if (idx + 1 === length) {
              lastOriginalSource = null;
              sourceMappingActive = false;
            } else if (sourceMappingActive) {
              map.addMapping({
                source: original.source,
                original: {
                  line: original.line,
                  column: original.column
                },
                generated: {
                  line: generated.line,
                  column: generated.column
                },
                name: original.name
              });
            }
          } else {
            generated.column++;
          }
        }
      });
      this.walkSourceContents(function(sourceFile, sourceContent) {
        map.setSourceContent(sourceFile, sourceContent);
      });
      return { code: generated.code, map };
    };
    exports2.SourceNode = SourceNode;
  }
});

// ../../node_modules/source-map-js/source-map.js
var require_source_map = __commonJS({
  "../../node_modules/source-map-js/source-map.js"(exports2) {
    exports2.SourceMapGenerator = require_source_map_generator().SourceMapGenerator;
    exports2.SourceMapConsumer = require_source_map_consumer().SourceMapConsumer;
    exports2.SourceNode = require_source_node().SourceNode;
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  getConfig: () => getConfig
});
module.exports = __toCommonJS(extension_exports);
var vscode8 = __toESM(require("vscode"));

// src/features/debug.ts
var import_debugadapter = __toESM(require_main());
var import_node_os2 = require("node:os");
var path2 = __toESM(require("node:path"));
var import_node_path2 = require("node:path");
var vscode = __toESM(require("vscode"));

// ../bun-debug-adapter-protocol/src/debugger/adapter.ts
var import_node_child_process = require("node:child_process");
var import_node_events4 = require("node:events");
var import_node_net2 = require("node:net");
var path = __toESM(require("node:path"), 1);

// ../bun-inspector-protocol/src/inspector/node-socket.ts
var import_node_events = require("node:events");

// ../bun-debug-adapter-protocol/src/debugger/node-socket-framer.ts
var socketFramerMessageLengthBuffer;
var SocketFramer = class _SocketFramer {
  state = 0 /* WaitingForLength */;
  pendingLength = 0;
  sizeBuffer = Buffer.alloc(4);
  sizeBufferIndex = 0;
  bufferedData = Buffer.alloc(0);
  socket;
  onMessage;
  constructor(socket, onMessage) {
    this.socket = socket;
    this.onMessage = onMessage;
    if (!socketFramerMessageLengthBuffer) {
      socketFramerMessageLengthBuffer = Buffer.alloc(4);
    }
    this.reset();
  }
  reset() {
    this.state = 0 /* WaitingForLength */;
    this.bufferedData = Buffer.alloc(0);
    this.sizeBufferIndex = 0;
    this.sizeBuffer = Buffer.alloc(4);
  }
  send(data) {
    socketFramerMessageLengthBuffer.writeUInt32BE(Buffer.byteLength(data), 0);
    this.socket.write(socketFramerMessageLengthBuffer);
    this.socket.write(data);
  }
  onData(data) {
    this.bufferedData = this.bufferedData.length > 0 ? Buffer.concat([this.bufferedData, data]) : data;
    let messagesToDeliver = [];
    let position = 0;
    while (position < this.bufferedData.length) {
      if (this.bufferedData.length - position < 4) {
        break;
      }
      const messageLength = this.bufferedData.readUInt32BE(position);
      if (messageLength <= 0 || messageLength > 1024 * 1024) {
        let newPosition = position + 1;
        let found = false;
        while (newPosition < this.bufferedData.length - 4) {
          const testLength = this.bufferedData.readUInt32BE(newPosition);
          if (testLength > 0 && testLength <= 1024 * 1024) {
            if (this.bufferedData.length - newPosition - 4 >= testLength) {
              const testMessage = this.bufferedData.toString("utf-8", newPosition + 4, newPosition + 4 + testLength);
              if (testMessage.startsWith('{"')) {
                position = newPosition;
                found = true;
                break;
              }
            }
          }
          newPosition++;
        }
        if (!found) {
          this.bufferedData = this.bufferedData.slice(position + 4);
          return;
        }
        continue;
      }
      if (this.bufferedData.length - position - 4 < messageLength) {
        break;
      }
      const message = this.bufferedData.toString("utf-8", position + 4, position + 4 + messageLength);
      if (message.startsWith('{"')) {
        messagesToDeliver.push(message);
      }
      position += 4 + messageLength;
    }
    if (position > 0) {
      this.bufferedData = position < this.bufferedData.length ? this.bufferedData.slice(position) : _SocketFramer.emptyBuffer;
    }
    if (messagesToDeliver.length === 1) {
      this.onMessage(messagesToDeliver[0]);
    } else if (messagesToDeliver.length > 1) {
      this.onMessage(messagesToDeliver);
    }
  }
  static emptyBuffer = Buffer.from([]);
};

// ../bun-inspector-protocol/src/inspector/node-socket.ts
var NodeSocketInspector = class extends import_node_events.EventEmitter {
  #ready;
  #socket;
  #requestId;
  #pendingRequests;
  #pendingResponses;
  #framer;
  constructor(socket) {
    super();
    this.#socket = socket;
    this.#requestId = 1;
    this.#pendingRequests = [];
    this.#pendingResponses = /* @__PURE__ */ new Map();
    this.#framer = new SocketFramer(socket, (message) => {
      if (Array.isArray(message)) {
        for (const m of message) {
          this.#accept(m);
        }
      } else {
        this.#accept(message);
      }
    });
  }
  onConnectOrImmediately(cb) {
    const isAlreadyConnected = this.#socket.connecting === false;
    if (isAlreadyConnected) {
      cb();
    } else {
      this.#socket.once("connect", cb);
    }
  }
  async start() {
    if (this.#ready) {
      return this.#ready;
    }
    if (this.closed) {
      this.close();
      const addressWithPort = this.#socket.remoteAddress + ":" + this.#socket.remotePort;
      this.emit("Inspector.connecting", addressWithPort);
    }
    const socket = this.#socket;
    this.onConnectOrImmediately(() => {
      this.emit("Inspector.connected");
      for (let i = 0; i < this.#pendingRequests.length; i++) {
        const request = this.#pendingRequests[i];
        if (this.#send(request)) {
          this.emit("Inspector.request", request);
        } else {
          this.#pendingRequests = this.#pendingRequests.slice(i);
          break;
        }
      }
    });
    socket.on("data", (data) => this.#framer.onData(data));
    socket.on("error", (error) => {
      this.#close(unknownToError(error));
    });
    socket.on("close", (hadError) => {
      if (hadError) {
        this.#close(new Error("Socket closed due to a transmission error"));
      } else {
        this.#close();
      }
    });
    const ready = new Promise((resolve) => {
      if (socket.connecting) {
        socket.on("connect", () => resolve(true));
      } else {
        resolve(true);
      }
      socket.on("close", () => resolve(false));
      socket.on("error", () => resolve(false));
    }).finally(() => {
      this.#ready = void 0;
    });
    this.#ready = ready;
    return ready;
  }
  send(method, params) {
    const id = this.#requestId++;
    const request = {
      id,
      method,
      params: params ?? {}
    };
    return new Promise((resolve, reject) => {
      let timerId;
      const done = (result) => {
        this.#pendingResponses.delete(id);
        if (timerId) {
          clearTimeout(timerId);
        }
        if (result instanceof Error) {
          reject(result);
        } else {
          resolve(result);
        }
      };
      this.#pendingResponses.set(id, {
        request,
        done
      });
      if (this.#send(request)) {
        timerId = +setTimeout(() => done(new Error(`Timed out: ${method}`)), 1e4);
        this.emit("Inspector.request", request);
      } else {
        this.emit("Inspector.pendingRequest", request);
      }
    });
  }
  #send(request) {
    this.#framer.send(JSON.stringify(request));
    if (!this.#pendingRequests.includes(request)) {
      this.#pendingRequests.push(request);
    }
    return false;
  }
  #accept(message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch (cause) {
      this.emit("Inspector.error", new Error(`Failed to parse message: ${message}`, { cause }));
      return;
    }
    if (!("id" in data)) {
      this.emit("Inspector.event", data);
      const { method, params } = data;
      this.emit(method, params);
      return;
    }
    this.emit("Inspector.response", data);
    const { id } = data;
    const handle = this.#pendingResponses.get(id);
    if (!handle) {
      this.emit("Inspector.error", new Error(`Failed to find matching request for ID: ${id}`));
      return;
    }
    if ("error" in data) {
      const { error } = data;
      const { message: message2 } = error;
      handle.done(new Error(message2));
    } else {
      const { result } = data;
      handle.done(result);
    }
  }
  get closed() {
    return !this.#socket.writable;
  }
  close() {
    this.#socket?.end();
  }
  #close(error) {
    for (const handle of this.#pendingResponses.values()) {
      handle.done(error ?? new Error("Socket closed while waiting for: " + handle.request.method));
    }
    this.#pendingResponses.clear();
    if (error) {
      this.emit("Inspector.error", error);
    }
    this.emit("Inspector.disconnected", error);
  }
};
function unknownToError(input) {
  if (input instanceof Error) {
    return input;
  }
  if (typeof input === "object" && input !== null && "message" in input) {
    const { message } = input;
    return new Error(`${message}`);
  }
  return new Error(`${input}`);
}

// ../bun-inspector-protocol/src/inspector/websocket.ts
var import_node_events2 = require("node:events");

// ../bun-inspector-protocol/node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);

// ../bun-inspector-protocol/src/inspector/websocket.ts
var WebSocketInspector = class extends import_node_events2.EventEmitter {
  #url;
  #webSocket;
  #ready;
  #requestId;
  #pendingRequests;
  #pendingResponses;
  constructor(url) {
    super();
    this.#url = url ? String(url) : void 0;
    this.#requestId = 1;
    this.#pendingRequests = [];
    this.#pendingResponses = /* @__PURE__ */ new Map();
  }
  get url() {
    return this.#url;
  }
  async start(url) {
    if (url) {
      this.#url = String(url);
    }
    if (!this.#url) {
      this.emit("Inspector.error", new Error("Inspector needs a URL, but none was provided"));
      return false;
    }
    return this.#connect(this.#url);
  }
  async #connect(url) {
    if (this.#ready) {
      return this.#ready;
    }
    this.close(1001, "Restarting...");
    this.emit("Inspector.connecting", url);
    let webSocket;
    try {
      webSocket = new import_websocket.default(url, {
        headers: {
          "Ref-Event-Loop": "0"
        },
        finishRequest: (request) => {
          request.setHeader("Ref-Event-Loop", "0");
          request.end();
        }
      });
    } catch (cause) {
      this.#close(unknownToError2(cause));
      return false;
    }
    webSocket.addEventListener("open", () => {
      this.emit("Inspector.connected");
      for (let i = 0; i < this.#pendingRequests.length; i++) {
        const request = this.#pendingRequests[i];
        if (this.#send(request)) {
          this.emit("Inspector.request", request);
        } else {
          this.#pendingRequests = this.#pendingRequests.slice(i);
          break;
        }
      }
    });
    webSocket.addEventListener("message", ({ data }) => {
      if (typeof data === "string") {
        this.#accept(data);
      } else {
        this.emit("Inspector.error", new Error(`WebSocket received unexpected binary message: ${data.toString()}`));
      }
    });
    webSocket.addEventListener("error", (event) => {
      this.#close(unknownToError2(event));
    });
    webSocket.addEventListener("unexpected-response", () => {
      this.#close(new Error("WebSocket upgrade failed"));
    });
    webSocket.addEventListener("close", ({ code, reason }) => {
      if (code === 1001 || code === 1006) {
        this.#close();
        return;
      }
      this.#close(new Error(`WebSocket closed: ${code} ${reason}`.trimEnd()));
    });
    this.#webSocket = webSocket;
    const ready = new Promise((resolve) => {
      webSocket.addEventListener("open", () => resolve(true));
      webSocket.addEventListener("close", () => resolve(false));
      webSocket.addEventListener("error", () => resolve(false));
    }).finally(() => {
      this.#ready = void 0;
    });
    this.#ready = ready;
    return ready;
  }
  send(method, params) {
    const id = this.#requestId++;
    const request = {
      id,
      method,
      params: params ?? {}
    };
    return new Promise((resolve, reject) => {
      let timerId;
      const done = (result) => {
        this.#pendingResponses.delete(id);
        if (timerId) {
          clearTimeout(timerId);
        }
        if (result instanceof Error) {
          reject(result);
        } else {
          resolve(result);
        }
      };
      this.#pendingResponses.set(id, done);
      if (this.#send(request)) {
        timerId = +setTimeout(() => done(new Error(`Timed out: ${method}`)), 1e4);
        this.emit("Inspector.request", request);
      } else {
        this.emit("Inspector.pendingRequest", request);
      }
    });
  }
  #send(request) {
    if (this.#webSocket) {
      const { readyState } = this.#webSocket;
      if (readyState === import_websocket.default.OPEN) {
        this.#webSocket.send(JSON.stringify(request));
        return true;
      }
    }
    if (!this.#pendingRequests.includes(request)) {
      this.#pendingRequests.push(request);
    }
    return false;
  }
  #accept(message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch (cause) {
      this.emit("Inspector.error", new Error(`Failed to parse message: ${message}`, { cause }));
      return;
    }
    if (!("id" in data)) {
      this.emit("Inspector.event", data);
      const { method, params } = data;
      this.emit(method, params);
      return;
    }
    this.emit("Inspector.response", data);
    const { id } = data;
    const resolve = this.#pendingResponses.get(id);
    if (!resolve) {
      this.emit("Inspector.error", new Error(`Failed to find matching request for ID: ${id}`));
      return;
    }
    if ("error" in data) {
      const { error } = data;
      const { message: message2 } = error;
      resolve(new Error(message2));
    } else {
      const { result } = data;
      resolve(result);
    }
  }
  get closed() {
    if (!this.#webSocket) {
      return true;
    }
    const { readyState } = this.#webSocket;
    switch (readyState) {
      case import_websocket.default.CLOSED:
      case import_websocket.default.CLOSING:
        return true;
    }
    return false;
  }
  close(code, reason) {
    this.#webSocket?.close(code ?? 1001, reason);
  }
  #close(error) {
    for (const resolve of this.#pendingResponses.values()) {
      resolve(error ?? new Error("WebSocket closed"));
    }
    this.#pendingResponses.clear();
    if (error) {
      this.emit("Inspector.error", error);
    }
    this.emit("Inspector.disconnected", error);
  }
};
function unknownToError2(input) {
  if (input instanceof Error) {
    return input;
  }
  if (typeof input === "object" && input !== null && "message" in input) {
    const { message } = input;
    return new Error(`${message}`);
  }
  return new Error(`${input}`);
}

// ../bun-inspector-protocol/src/util/preview.ts
function remoteObjectToString(remoteObject, topLevel) {
  const { type, subtype, value, description: description2, className, preview } = remoteObject;
  switch (type) {
    case "undefined":
      return "undefined";
    case "boolean":
    case "number":
      return description2 ?? JSON.stringify(value);
    case "string":
      if (topLevel) {
        return String(value ?? description2);
      }
      return JSON.stringify(value ?? description2);
    case "symbol":
    case "bigint":
      return description2;
    case "function":
      return description2.replace("function", "\u0192") || "\u0192";
  }
  switch (subtype) {
    case "null":
      return "null";
    case "regexp":
    case "date":
    case "error":
      return description2;
  }
  if (preview) {
    return objectPreviewToString(preview);
  }
  if (className) {
    return className;
  }
  return description2 || "Object";
}
function objectPreviewToString(objectPreview) {
  const { type, subtype, entries, properties, overflow, description: description2, size } = objectPreview;
  if (type !== "object") {
    return remoteObjectToString(objectPreview);
  }
  let items;
  if (entries) {
    items = entries.map(entryPreviewToString).sort();
  } else if (properties) {
    if (isIndexed(subtype)) {
      items = properties.map(indexedPropertyPreviewToString);
      if (subtype !== "array") {
        items.sort();
      }
    } else {
      items = properties.map(namedPropertyPreviewToString).sort();
    }
  } else {
    items = ["\u2026"];
  }
  if (overflow) {
    items.push("\u2026");
  }
  let label;
  if (description2 === "Object") {
    label = "";
  } else if (size === void 0) {
    label = description2;
  } else {
    label = `${description2}(${size})`;
  }
  if (!items.length) {
    return label || "{}";
  }
  if (label) {
    label += " ";
  }
  if (isIndexed(subtype)) {
    return `${label}[${items.join(", ")}]`;
  }
  return `${label}{${items.join(", ")}}`;
}
function propertyPreviewToString(propertyPreview) {
  const { type, value, ...preview } = propertyPreview;
  if (type === "accessor") {
    return "\u0192";
  }
  return remoteObjectToString({ ...preview, type, description: value });
}
function entryPreviewToString(entryPreview) {
  const { key, value } = entryPreview;
  if (key) {
    return `${objectPreviewToString(key)} => ${objectPreviewToString(value)}`;
  }
  return objectPreviewToString(value);
}
function namedPropertyPreviewToString(propertyPreview) {
  const { name, valuePreview } = propertyPreview;
  if (valuePreview) {
    return `${name}: ${objectPreviewToString(valuePreview)}`;
  }
  return `${name}: ${propertyPreviewToString(propertyPreview)}`;
}
function indexedPropertyPreviewToString(propertyPreview) {
  const { valuePreview } = propertyPreview;
  if (valuePreview) {
    return objectPreviewToString(valuePreview);
  }
  return propertyPreviewToString(propertyPreview);
}
function isIndexed(type) {
  return type === "array" || type === "set" || type === "weakset";
}

// ../bun-debug-adapter-protocol/src/debugger/signal.ts
var import_node_events3 = require("node:events");
var import_node_net = require("node:net");
var import_node_os = require("node:os");
var import_node_path = require("node:path");
var isDebug = process.env.NODE_ENV === "development";
var UnixSignal = class extends import_node_events3.EventEmitter {
  #path;
  #server;
  #ready;
  constructor(path4) {
    super();
    this.#path = path4 ? parseUnixPath(path4) : randomUnixPath();
    this.#server = (0, import_node_net.createServer)();
    this.#server.on("listening", () => this.emit("Signal.listening", this.#path));
    this.#server.on("error", (error) => this.emit("Signal.error", error));
    this.#server.on("close", () => this.emit("Signal.closed"));
    this.#server.on("connection", (socket) => {
      this.emit("Signal.Socket.connect", socket);
      socket.on("data", (data) => {
        this.emit("Signal.received", data.toString());
      });
      socket.on("close", () => {
        this.emit("Signal.Socket.closed", socket);
      });
    });
    this.#ready = new Promise((resolve, reject) => {
      this.#server.on("listening", resolve);
      this.#server.on("error", reject);
    });
    this.#server.listen(this.#path);
  }
  emit(event, ...args) {
    if (isDebug) {
      console.log(event, ...args);
    }
    return super.emit(event, ...args);
  }
  /**
   * The path to the UNIX domain socket.
   */
  get url() {
    return `unix://${this.#path}`;
  }
  /**
   * Resolves when the server is listening or rejects if an error occurs.
   */
  get ready() {
    return this.#ready;
  }
  /**
   * Closes the server.
   */
  close() {
    this.#server.close();
  }
};
function randomUnixPath() {
  return (0, import_node_path.join)((0, import_node_os.tmpdir)(), `${Math.random().toString(36).slice(2)}.sock`);
}
function parseUnixPath(path4) {
  if (typeof path4 === "string" && path4.startsWith("/")) {
    return path4;
  }
  try {
    const { pathname } = new URL(path4);
    return pathname;
  } catch {
    throw new Error(`Invalid UNIX path: ${path4}`);
  }
}
var TCPSocketSignal = class extends import_node_events3.EventEmitter {
  #port;
  #server;
  #ready;
  constructor(port) {
    super();
    this.#port = port;
    this.#server = (0, import_node_net.createServer)((socket) => {
      this.emit("Signal.Socket.connect", socket);
      socket.on("data", (data) => {
        this.emit("Signal.received", data.toString());
      });
      socket.on("error", (error) => {
        this.emit("Signal.error", error);
      });
      socket.on("close", () => {
        this.emit("Signal.Socket.closed", socket);
      });
    });
    this.#server.on("close", () => {
      this.emit("Signal.closed");
    });
    this.#ready = new Promise((resolve, reject) => {
      this.#server.listen(this.#port, () => {
        this.emit("Signal.listening");
        resolve();
      });
      this.#server.on("error", reject);
    });
  }
  emit(event, ...args) {
    if (isDebug) {
      console.log(event, ...args);
    }
    return super.emit(event, ...args);
  }
  /**
   * The TCP port.
   */
  get port() {
    return this.#port;
  }
  get url() {
    return `tcp://127.0.0.1:${this.#port}`;
  }
  /**
   * Resolves when the server is listening or rejects if an error occurs.
   */
  get ready() {
    return this.#ready;
  }
  /**
   * Closes the server.
   */
  close() {
    this.#server.close();
  }
};

// ../bun-debug-adapter-protocol/src/debugger/sourcemap.ts
var import_source_map_js = __toESM(require_source_map(), 1);
var ActualSourceMap = class {
  #sourceMap;
  #sources;
  constructor(sourceMap) {
    this.#sourceMap = sourceMap;
    this.#sources = sourceMap._absoluteSources;
  }
  #getSource(url) {
    const sources = this.#sources;
    if (!sources.length) {
      return "";
    }
    if (sources.length === 1 || !url) {
      return sources[0];
    }
    for (const source of sources) {
      if (url.endsWith(source)) {
        return source;
      }
    }
    return "";
  }
  generatedLocation(request) {
    const { line, column, url } = request;
    let lineRange;
    try {
      const source = this.#getSource(url);
      lineRange = this.#sourceMap.generatedPositionFor({
        line: lineTo1BasedLine(line),
        column: columnToColumn(column),
        source
      });
    } catch (error) {
      return {
        line: lineToLine(line),
        column: columnToColumn(column),
        verified: false,
        message: unknownToError3(error)
      };
    }
    if (!locationIsValid(lineRange)) {
      return {
        line: lineToLine(line),
        column: columnToColumn(column),
        verified: false
      };
    }
    const { line: gline, column: gcolumn } = lineRange;
    return {
      line: lineTo0BasedLine(gline),
      column: columnToColumn(gcolumn),
      verified: true
    };
  }
  originalLocation(request) {
    const { line, column } = request;
    let mappedPosition;
    try {
      mappedPosition = this.#sourceMap.originalPositionFor({
        line: lineTo1BasedLine(line),
        column: columnToColumn(column)
      });
    } catch (error) {
      return {
        line: lineToLine(line),
        column: columnToColumn(column),
        verified: false,
        message: unknownToError3(error)
      };
    }
    if (!locationIsValid(mappedPosition)) {
      return {
        line: lineToLine(line),
        column: columnToColumn(column),
        verified: false
      };
    }
    const { line: oline, column: ocolumn } = mappedPosition;
    return {
      line: lineTo0BasedLine(oline),
      column: columnToColumn(ocolumn),
      verified: true
    };
  }
};
var NoopSourceMap = class {
  generatedLocation(request) {
    const { line, column } = request;
    return {
      line: lineToLine(line),
      column: columnToColumn(column),
      verified: true
    };
  }
  originalLocation(request) {
    const { line, column } = request;
    return {
      line: lineToLine(line),
      column: columnToColumn(column),
      verified: true
    };
  }
};
var defaultSourceMap = new NoopSourceMap();
function SourceMap(url) {
  if (!url) {
    return defaultSourceMap;
  }
  if (!url.startsWith("data:")) {
    const match = url.match(/\/\/[#@]\s*sourceMappingURL=(.*)$/m);
    if (!match) {
      return defaultSourceMap;
    }
    const [_, sourceMapUrl] = match;
    url = sourceMapUrl;
  }
  try {
    const [_, base64] = url.split(",", 2);
    const decoded = Buffer.from(base64, "base64url").toString("utf8");
    const schema = JSON.parse(decoded);
    const sourceMap = new import_source_map_js.SourceMapConsumer(schema);
    return new ActualSourceMap(sourceMap);
  } catch (error) {
    console.warn("Failed to parse source map URL", url);
  }
  return defaultSourceMap;
}
function lineTo1BasedLine(line) {
  return numberIsValid(line) ? line + 1 : 1;
}
function lineTo0BasedLine(line) {
  return numberIsValid(line) ? line - 1 : 0;
}
function lineToLine(line) {
  return numberIsValid(line) ? line : 0;
}
function columnToColumn(column) {
  return numberIsValid(column) ? column : 0;
}
function locationIsValid(location) {
  const { line, column } = location;
  return numberIsValid(line) && numberIsValid(column);
}
function numberIsValid(number) {
  return typeof number === "number" && isFinite(number) && number >= 0;
}
function unknownToError3(error) {
  if (error instanceof Error) {
    const { message } = error;
    return message;
  }
  return String(error);
}

// ../bun-debug-adapter-protocol/src/debugger/adapter.ts
async function getAvailablePort() {
  const server = (0, import_node_net2.createServer)();
  server.listen(0);
  return new Promise((resolve) => {
    server.on("listening", () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}
var capabilities = {
  supportsConfigurationDoneRequest: true,
  supportsFunctionBreakpoints: true,
  supportsConditionalBreakpoints: true,
  supportsHitConditionalBreakpoints: true,
  supportsEvaluateForHovers: true,
  exceptionBreakpointFilters: [
    {
      filter: "all",
      label: "All Exceptions",
      default: false,
      supportsCondition: true,
      description: "Breaks on all throw errors, even if they're caught later.",
      conditionDescription: `error.name == "CustomError"`
    },
    {
      filter: "uncaught",
      label: "Uncaught Exceptions",
      default: false,
      supportsCondition: true,
      description: "Breaks only on errors or promise rejections that are not handled.",
      conditionDescription: `error.name == "CustomError"`
    },
    {
      filter: "debugger",
      label: "Debugger Statements",
      default: true,
      supportsCondition: false,
      description: "Breaks on `debugger` statements."
    },
    {
      filter: "assert",
      label: "Assertion Failures",
      default: false,
      supportsCondition: false,
      description: "Breaks on failed assertions."
    },
    {
      filter: "microtask",
      label: "Microtasks",
      default: false,
      supportsCondition: false,
      description: "Breaks on microtasks."
    }
  ],
  supportsStepBack: false,
  supportsSetVariable: true,
  supportsRestartFrame: false,
  supportsGotoTargetsRequest: true,
  supportsStepInTargetsRequest: false,
  supportsCompletionsRequest: true,
  completionTriggerCharacters: [".", "[", '"', "'"],
  supportsModulesRequest: false,
  additionalModuleColumns: [],
  supportedChecksumAlgorithms: [],
  supportsRestartRequest: false,
  // TODO
  supportsExceptionOptions: false,
  // TODO
  supportsValueFormattingOptions: false,
  supportsExceptionInfoRequest: true,
  supportTerminateDebuggee: true,
  supportSuspendDebuggee: false,
  supportsDelayedStackTraceLoading: true,
  supportsLoadedSourcesRequest: true,
  supportsLogPoints: true,
  supportsTerminateThreadsRequest: false,
  supportsSetExpression: true,
  supportsTerminateRequest: true,
  supportsDataBreakpoints: false,
  // TODO
  supportsReadMemoryRequest: false,
  supportsWriteMemoryRequest: false,
  supportsDisassembleRequest: false,
  supportsCancelRequest: false,
  supportsBreakpointLocationsRequest: true,
  supportsClipboardContext: false,
  supportsSteppingGranularity: false,
  supportsInstructionBreakpoints: false,
  supportsExceptionFilterOptions: false,
  supportsSingleThreadExecutionRequests: false
};
var isDebug2 = process.env.NODE_ENV === "development";
var debugSilentEvents = /* @__PURE__ */ new Set(["Adapter.event", "Inspector.event"]);
var threadId = 1;
function normalizeSourcePath(sourcePath, untitledDocPath, bunEvalPath) {
  if (!sourcePath)
    return sourcePath;
  if (sourcePath === bunEvalPath) {
    return bunEvalPath;
  }
  if (sourcePath === untitledDocPath) {
    return bunEvalPath;
  }
  return path.normalize(sourcePath);
}
var BaseDebugAdapter = class extends import_node_events4.EventEmitter {
  inspector;
  options;
  #threadId;
  #sourceId;
  #pendingSources;
  #sources;
  #stackFrames;
  #stopped;
  #exception;
  #breakpoints;
  #futureBreakpoints;
  #functionBreakpoints;
  #targets;
  #variableId;
  #variables;
  #untitledDocPath;
  #bunEvalPath;
  #initialized;
  constructor(inspector, untitledDocPath, bunEvalPath) {
    super();
    this.#untitledDocPath = untitledDocPath;
    this.#bunEvalPath = bunEvalPath;
    this.#threadId = threadId++;
    this.inspector = inspector;
    const emit = this.inspector.emit.bind(this.inspector);
    this.inspector.emit = (event, ...args) => {
      let sent = false;
      sent ||= emit(event, ...args);
      sent ||= this.emit(event, ...args);
      return sent;
    };
    this.#sourceId = 1;
    this.#pendingSources = /* @__PURE__ */ new Map();
    this.#sources = /* @__PURE__ */ new Map();
    this.#stackFrames = [];
    this.#stopped = void 0;
    this.#breakpoints = /* @__PURE__ */ new Map();
    this.#futureBreakpoints = /* @__PURE__ */ new Map();
    this.#functionBreakpoints = /* @__PURE__ */ new Map();
    this.#targets = /* @__PURE__ */ new Map();
    this.#variableId = 1;
    this.#variables = /* @__PURE__ */ new Map();
  }
  /**
   * Gets the inspector url. This is deprecated and exists for compat.
   * @deprecated You should get the inspector directly (with .getInspector()), and if it's a WebSocketInspector you can access `.url` direclty.
   */
  get url() {
    if (this.inspector instanceof WebSocketInspector) {
      return this.inspector.url;
    }
    throw new Error("Inspector does not offer a URL");
  }
  getInspector() {
    return this.inspector;
  }
  /**
   * Sends a request to the JavaScript inspector.
   * @param method the method name
   * @param params the method parameters
   * @returns the response
   * @example
   * const { result, wasThrown } = await adapter.send("Runtime.evaluate", {
   *   expression: "1 + 1",
   * });
   * console.log(result.value); // 2
   */
  async send(method, params) {
    return this.inspector.send(method, params);
  }
  /**
   * Emits an event. For the adapter to work, you must:
   * - emit `Adapter.request` when the client sends a request to the adapter.
   * - listen to `Adapter.response` to receive responses from the adapter.
   * - listen to `Adapter.event` to receive events from the adapter.
   * @param event the event name
   * @param args the event arguments
   * @returns if the event was sent to a listener
   */
  emit(event, ...args) {
    if (isDebug2 && !debugSilentEvents.has(event)) {
      console.log(this.#threadId, event, ...args);
    }
    let sent = super.emit(event, ...args);
    if (!(event in this)) {
      return sent;
    }
    let result;
    try {
      result = this[event](...args);
    } catch (cause) {
      sent ||= this.emit("Adapter.error", unknownToError4(cause));
      return sent;
    }
    if (result instanceof Promise) {
      result.catch((cause) => {
        this.emit("Adapter.error", unknownToError4(cause));
      });
    }
    return sent;
  }
  emitAdapterEvent(event, body) {
    this.emit("Adapter.event", {
      type: "event",
      seq: 0,
      event,
      body
    });
  }
  #emitAfterResponse(event, body) {
    this.once("Adapter.response", () => {
      process.nextTick(() => {
        this.emitAdapterEvent(event, body);
      });
    });
  }
  #reverseRequest(command, args) {
    this.emit("Adapter.reverseRequest", {
      type: "request",
      seq: 0,
      command,
      arguments: args
    });
  }
  async ["Adapter.request"](request) {
    const { command, arguments: args } = request;
    if (!(command in this)) {
      return;
    }
    let timerId;
    let result;
    try {
      result = await Promise.race([
        // @ts-ignore
        this[command](args),
        new Promise((_, reject) => {
          timerId = +setTimeout(() => reject(new Error(`Timed out: ${command}`)), 15e3);
        })
      ]);
    } catch (cause) {
      if (cause === Cancel) {
        this.emit("Adapter.response", {
          type: "response",
          command,
          success: false,
          message: "cancelled",
          request_seq: request.seq,
          seq: 0
        });
        return;
      }
      const error = unknownToError4(cause);
      this.emit("Adapter.error", error);
      const { message } = error;
      this.emit("Adapter.response", {
        type: "response",
        command,
        success: false,
        message,
        request_seq: request.seq,
        seq: 0
      });
      return;
    } finally {
      if (timerId) {
        clearTimeout(timerId);
      }
    }
    this.emit("Adapter.response", {
      type: "response",
      command,
      success: true,
      request_seq: request.seq,
      seq: 0,
      body: result
    });
  }
  ["Adapter.event"](event) {
    const { event: name, body } = event;
    this.emit(`Adapter.${name}`, body);
  }
  initialize(request) {
    this.#initialized = request;
    this.send("Inspector.enable");
    this.send("Runtime.enable");
    if (request.enableConsole ?? true) {
      this.send("Console.enable");
    }
    if (request.enableControlFlowProfiler) {
      this.send("Runtime.enableControlFlowProfiler");
    }
    if (request.enableLifecycleAgentReporter) {
      this.send("LifecycleReporter.enable");
      if (request.sendImmediatePreventExit) {
        this.send("LifecycleReporter.preventExit");
      }
    }
    if (request.enableTestReporter) {
      this.send("TestReporter.enable");
    }
    if (request.enableDebugger !== false) {
      this.send("Debugger.enable").catch((error) => {
        const { message } = unknownToError4(error);
        if (message !== "Debugger domain already enabled") {
          throw error;
        }
      });
      this.send("Debugger.setAsyncStackTraceDepth", { depth: 200 });
    }
    const { clientID, supportsConfigurationDoneRequest } = request;
    if (!supportsConfigurationDoneRequest && clientID !== "vscode") {
      this.configurationDone();
    }
    return capabilities;
  }
  configurationDone() {
    const active = !this.options?.noDebug;
    this.send("Debugger.setBreakpointsActive", { active });
    this.send("Inspector.initialized");
  }
  terminate() {
    this.exitJSProcess();
    this.emitAdapterEvent("terminated");
  }
  disconnect(request) {
    const { terminateDebuggee } = request;
    if (terminateDebuggee) {
      this.terminate();
    }
    this.close();
  }
  async source(request) {
    const { source } = request;
    const { scriptId } = await this.#getSource(sourceToId(source));
    const { scriptSource } = await this.send("Debugger.getScriptSource", { scriptId });
    return {
      content: scriptSource
    };
  }
  async threads() {
    return {
      threads: [
        {
          id: this.#threadId,
          name: "Main Thread"
        }
      ]
    };
  }
  async pause() {
    await this.send("Debugger.pause");
    this.#stopped = "pause";
  }
  async continue() {
    await this.send("Debugger.resume");
    this.#stopped = void 0;
  }
  async next() {
    await this.send("Debugger.stepNext");
    this.#stopped = "step";
  }
  async stepIn() {
    await this.send("Debugger.stepInto");
    this.#stopped = "step";
  }
  async stepOut() {
    await this.send("Debugger.stepOut");
    this.#stopped = "step";
  }
  async breakpointLocations(request) {
    const { line, endLine, column, endColumn, source: source0 } = request;
    if (process.platform === "win32") {
      source0.path = source0.path ? normalizeWindowsPath(source0.path) : source0.path;
    }
    const source = await this.#getSource(sourceToId(source0));
    const { locations } = await this.send("Debugger.getBreakpointLocations", {
      start: this.#generatedLocation(source, line, column),
      end: this.#generatedLocation(source, endLine ?? line + 1, endColumn)
    });
    return {
      breakpoints: locations.map((location) => this.#originalLocation(source, location))
    };
  }
  #generatedLocation(source, line, column) {
    const { sourceMap, scriptId, path: path4 } = source;
    const { line: gline, column: gcolumn } = sourceMap.generatedLocation({
      line: this.#lineTo0BasedLine(line),
      column: this.#columnTo0BasedColumn(column),
      url: path4
    });
    return {
      scriptId,
      lineNumber: gline,
      columnNumber: gcolumn
    };
  }
  #lineTo0BasedLine(line) {
    if (!numberIsValid2(line)) {
      return 0;
    }
    if (!this.#initialized?.linesStartAt1) {
      return line;
    }
    return line - 1;
  }
  #columnTo0BasedColumn(column) {
    if (!numberIsValid2(column)) {
      return 0;
    }
    if (!this.#initialized?.columnsStartAt1) {
      return column;
    }
    return column - 1;
  }
  #originalLocation(source, line, column) {
    if (typeof line === "object") {
      const { lineNumber, columnNumber } = line;
      line = lineNumber;
      column = columnNumber;
    }
    const { sourceMap } = source;
    const { line: oline, column: ocolumn } = sourceMap.originalLocation({ line, column });
    return {
      line: this.#lineFrom0BasedLine(oline),
      // For now, remove the column from locations because
      // it can be inaccurate and causes weird rendering issues in VSCode.
      column: this.#columnFrom0BasedColumn(0)
      // ocolumn
    };
  }
  #lineFrom0BasedLine(line) {
    if (!this.#initialized?.linesStartAt1) {
      return numberIsValid2(line) ? line : 0;
    }
    return numberIsValid2(line) ? line + 1 : 1;
  }
  #columnFrom0BasedColumn(column) {
    if (!this.#initialized?.columnsStartAt1) {
      return numberIsValid2(column) ? column : 0;
    }
    return numberIsValid2(column) ? column + 1 : 1;
  }
  async setBreakpoints(request) {
    const { source, breakpoints: requests = [] } = request;
    const { path: path4, sourceReference } = source;
    let breakpoints;
    if (path4) {
      breakpoints = await this.#setBreakpointsByUrl(path4, requests, true);
    } else if (sourceReference) {
      const source2 = this.#getSourceIfPresent(sourceReference);
      if (source2) {
        const { scriptId } = source2;
        breakpoints = await this.#setBreakpointsById(scriptId, requests, true);
      }
    }
    return {
      breakpoints: breakpoints ?? []
    };
  }
  async #setBreakpointsByUrl(url, requests, unsetOld) {
    if (process.platform === "win32") {
      url = url ? normalizeWindowsPath(url) : url;
    }
    const source = this.#getSourceIfPresent(url);
    if (!source) {
      let result;
      try {
        result = await this.send("Debugger.setBreakpointByUrl", {
          url,
          lineNumber: 0
        });
      } catch (error) {
        return requests.map(() => invalidBreakpoint(error));
      }
      const { breakpointId, locations } = result;
      if (locations.length) {
      }
      return requests.map(
        (request) => this.#addFutureBreakpoint({
          breakpointId,
          url,
          breakpoint: request
        })
      );
    }
    const oldBreakpoints = this.#getBreakpoints(sourceToId(source));
    const breakpoints = await Promise.all(
      requests.map(async (request) => {
        const oldBreakpoint = this.#getBreakpointByLocation(source, request);
        if (oldBreakpoint) {
          return oldBreakpoint;
        }
        const { line, column, ...options } = request;
        const location = this.#generatedLocation(source, line, column);
        let result;
        try {
          result = await this.send("Debugger.setBreakpointByUrl", {
            url,
            ...location,
            options: breakpointOptions(options)
          });
        } catch (error) {
          return invalidBreakpoint(error);
        }
        const { breakpointId, locations } = result;
        const breakpoints2 = locations.map(
          (location2, i) => this.#addBreakpoint({
            breakpointId,
            location: location2,
            source,
            request,
            // It is theoretically possible for a breakpoint to resolve to multiple locations.
            // In that case, send a separate `breakpoint` event for each one, excluding the first.
            notify: i > 0
          })
        );
        return breakpoints2[0];
      })
    );
    if (unsetOld) {
      await Promise.all(
        oldBreakpoints.map(({ breakpointId }) => {
          if (!breakpoints.some(({ breakpointId: id }) => breakpointId === id)) {
            return this.#unsetBreakpoint(breakpointId);
          }
        })
      );
    }
    return breakpoints;
  }
  async #setBreakpointsById(scriptId, requests, unsetOld) {
    const source = await this.#getSourceById(scriptId);
    if (!source) {
      return requests.map(() => invalidBreakpoint());
    }
    const oldBreakpoints = this.#getBreakpoints(sourceToId(source));
    const breakpoints = await Promise.all(
      requests.map(async (request) => {
        const oldBreakpoint = this.#getBreakpointByLocation(source, request);
        if (oldBreakpoint) {
          return oldBreakpoint;
        }
        const { line, column, ...options } = request;
        const location = this.#generatedLocation(source, line, column);
        let result;
        try {
          result = await this.send("Debugger.setBreakpoint", {
            location,
            options: breakpointOptions(options)
          });
        } catch (error) {
          return invalidBreakpoint(error);
        }
        const { breakpointId, actualLocation } = result;
        return this.#addBreakpoint({
          breakpointId,
          location: actualLocation,
          request,
          source
        });
      })
    );
    if (unsetOld) {
      await Promise.all(
        oldBreakpoints.map(({ breakpointId }) => {
          if (!breakpoints.some(({ breakpointId: id }) => breakpointId === id)) {
            return this.#unsetBreakpoint(breakpointId);
          }
        })
      );
    }
    return breakpoints;
  }
  async #unsetBreakpoint(breakpointId) {
    try {
      await this.send("Debugger.removeBreakpoint", { breakpointId });
    } catch {
    }
    this.#removeBreakpoint(breakpointId);
    this.#removeFutureBreakpoint(breakpointId);
  }
  #addBreakpoint(options) {
    const { breakpointId, location, source, request, notify } = options;
    let originalLocation;
    if (source) {
      originalLocation = this.#originalLocation(source, location);
    } else {
      originalLocation = {};
    }
    const breakpoints = this.#getBreakpointsById(breakpointId);
    const breakpoint = {
      id: nextId(),
      breakpointId,
      source,
      request,
      ...originalLocation,
      verified: !!source
    };
    breakpoints.push(breakpoint);
    return breakpoint;
  }
  #addFutureBreakpoint(options) {
    const { breakpointId, url, breakpoint } = options;
    const breakpoints = this.#getFutureBreakpoints(breakpointId);
    breakpoints.push({
      url,
      breakpoint
    });
    return this.#addBreakpoint({
      breakpointId,
      request: breakpoint
    });
  }
  #removeBreakpoint(breakpointId, notify) {
    const breakpoints = this.#breakpoints.get(breakpointId);
    if (!breakpoints || !this.#breakpoints.delete(breakpointId) || !notify) {
      return;
    }
    for (const breakpoint of breakpoints) {
      this.emitAdapterEvent("breakpoint", {
        reason: "removed",
        breakpoint
      });
    }
  }
  #removeFutureBreakpoint(breakpointId, notify) {
    const breakpoint = this.#futureBreakpoints.get(breakpointId);
    if (!breakpoint || !this.#futureBreakpoints.delete(breakpointId)) {
      return;
    }
    this.#removeBreakpoint(breakpointId, notify);
  }
  #getBreakpointsById(breakpointId) {
    let breakpoints = this.#breakpoints.get(breakpointId);
    if (!breakpoints) {
      this.#breakpoints.set(breakpointId, breakpoints = []);
    }
    return breakpoints;
  }
  #getBreakpointByLocation(source, location) {
    if (isDebug2) {
      console.log("getBreakpointByLocation", {
        source: sourceToId(source),
        location,
        ids: this.#getBreakpoints(sourceToId(source)).map(({ id }) => id),
        breakpointIds: this.#getBreakpoints(sourceToId(source)).map(({ breakpointId }) => breakpointId),
        lines: this.#getBreakpoints(sourceToId(source)).map(({ line }) => line),
        columns: this.#getBreakpoints(sourceToId(source)).map(({ column }) => column)
      });
    }
    let sourceId = sourceToId(source);
    const untitledDocPath = this.#untitledDocPath;
    if (sourceId === untitledDocPath && this.#bunEvalPath) {
      sourceId = this.#bunEvalPath;
    }
    const [breakpoint] = this.#getBreakpoints(sourceId).filter(
      ({ source: source2, request }) => source2 && sourceToId(source2) === sourceId && request?.line === location.line
    );
    return breakpoint;
  }
  #getBreakpoints(sourceId) {
    let output2 = [];
    let all = this.#breakpoints;
    for (const breakpoints of all.values()) {
      for (const breakpoint of breakpoints) {
        const source = breakpoint.source;
        if (source && sourceToId(source) === sourceId) {
          output2.push(breakpoint);
        }
      }
    }
    return output2;
  }
  #getFutureBreakpoints(breakpointId) {
    let breakpoints = this.#futureBreakpoints.get(breakpointId);
    if (!breakpoints) {
      this.#futureBreakpoints.set(breakpointId, breakpoints = []);
    }
    return breakpoints;
  }
  async setFunctionBreakpoints(request) {
    const { breakpoints: requests } = request;
    const oldBreakpoints = this.#getFunctionBreakpoints();
    const breakpoints = await Promise.all(
      requests.map(async ({ name, ...options }) => {
        const breakpoint = this.#getFunctionBreakpoint(name);
        if (breakpoint) {
          return breakpoint;
        }
        try {
          await this.send("Debugger.addSymbolicBreakpoint", {
            symbol: name,
            caseSensitive: true,
            isRegex: false,
            options: breakpointOptions(options)
          });
        } catch (error) {
          const { message } = unknownToError4(error);
          return this.#addFunctionBreakpoint({
            id: nextId(),
            name,
            verified: false,
            message
          });
        }
        return this.#addFunctionBreakpoint({
          id: nextId(),
          name,
          verified: true
        });
      })
    );
    await Promise.all(
      oldBreakpoints.map(async ({ name }) => {
        const isRemoved = !breakpoints.filter(({ name: n }) => name === n).length;
        if (isRemoved) {
          await this.send("Debugger.removeSymbolicBreakpoint", {
            symbol: name,
            caseSensitive: true,
            isRegex: false
          });
          this.#removeFunctionBreakpoint(name);
        }
      })
    );
    return {
      breakpoints
    };
  }
  #getFunctionBreakpoints() {
    return [...this.#functionBreakpoints.values()];
  }
  #getFunctionBreakpoint(name) {
    return this.#functionBreakpoints.get(name);
  }
  #addFunctionBreakpoint(breakpoint) {
    const { name } = breakpoint;
    this.#functionBreakpoints.set(name, breakpoint);
    return breakpoint;
  }
  #removeFunctionBreakpoint(name) {
    const breakpoint = this.#functionBreakpoints.get(name);
    if (!breakpoint || !this.#functionBreakpoints.delete(name)) {
      return;
    }
    this.#emitAfterResponse("breakpoint", {
      reason: "removed",
      breakpoint
    });
  }
  async setExceptionBreakpoints(request) {
    const { filters } = request;
    let state;
    if (filters.includes("all")) {
      state = "all";
    } else if (filters.includes("uncaught")) {
      state = "uncaught";
    } else {
      state = "none";
    }
    await Promise.all([
      this.send("Debugger.setPauseOnExceptions", { state }),
      this.send("Debugger.setPauseOnAssertions", {
        enabled: filters.includes("assert")
      }),
      this.send("Debugger.setPauseOnDebuggerStatements", {
        enabled: filters.includes("debugger")
      }),
      this.send("Debugger.setPauseOnMicrotasks", {
        enabled: filters.includes("microtask")
      })
    ]);
    return {
      breakpoints: []
    };
  }
  async gotoTargets(request) {
    const { source: source0 } = request;
    if (process.platform === "win32") {
      source0.path = source0.path ? normalizeWindowsPath(source0.path) : source0.path;
    }
    const source = await this.#getSource(sourceToId(source0));
    const { breakpoints } = await this.breakpointLocations(request);
    const targets = breakpoints.map(
      ({ line, column }) => this.#addTarget({
        id: this.#targets.size,
        label: `${line}:${column}`,
        source,
        line,
        column
      })
    );
    return {
      targets
    };
  }
  #addTarget(target) {
    const { id } = target;
    this.#targets.set(id, target);
    return target;
  }
  #getTarget(targetId) {
    return this.#targets.get(targetId);
  }
  async goto(request) {
    const { targetId } = request;
    const target = this.#getTarget(targetId);
    if (!target) {
      throw new Error("No target found.");
    }
    const { source, line, column } = target;
    const location = this.#generatedLocation(source, line, column);
    await this.send("Debugger.continueToLocation", {
      location
    });
  }
  async evaluate(request) {
    const { expression, frameId, context } = request;
    const callFrameId = this.#getCallFrameId(frameId);
    const objectGroup = callFrameId ? "debugger" : context;
    const { result, wasThrown } = await this.evaluateInternal({
      expression,
      objectGroup,
      callFrameId
    });
    if (wasThrown) {
      if (context === "hover" && isSyntaxError(result)) {
        throw Cancel;
      }
      throw new Error(remoteObjectToString(result));
    }
    const { name, value, ...variable } = this.#addObject(result, { objectGroup });
    return {
      ...variable,
      result: value
    };
  }
  async evaluateInternal(options) {
    const { expression, objectGroup, callFrameId } = options;
    const method = callFrameId ? "Debugger.evaluateOnCallFrame" : "Runtime.evaluate";
    return this.send(method, {
      callFrameId,
      objectGroup,
      expression: sanitizeExpression(expression),
      generatePreview: true,
      emulateUserGesture: true,
      doNotPauseOnExceptionsAndMuteConsole: true,
      includeCommandLineAPI: true
    });
  }
  async completions(request) {
    const { text, column, frameId } = request;
    const callFrameId = this.#getCallFrameId(frameId);
    const { expression, hint } = completionToExpression(text);
    const { result, wasThrown } = await this.evaluateInternal({
      expression: expression || "this",
      callFrameId,
      objectGroup: "repl"
    });
    if (wasThrown) {
      if (isSyntaxError(result)) {
        return {
          targets: []
        };
      }
      throw new Error(remoteObjectToString(result));
    }
    const variable = this.#addObject(result, {
      objectGroup: "repl",
      evaluateName: expression
    });
    const properties = await this.#getProperties(variable);
    const targets = properties.filter(({ name }) => isIdentifier(name) && (!hint || name.includes(hint))).sort(variablesSortBy).map(variableToCompletionItem);
    return {
      targets
    };
  }
  ["Inspector.connected"]() {
    this.emitAdapterEvent("output", {
      category: "debug console",
      output: "Debugger attached.\n"
    });
    this.emitAdapterEvent("initialized");
  }
  async ["Inspector.disconnected"](error) {
    this.emitAdapterEvent("output", {
      category: "debug console",
      output: "Debugger detached.\n"
    });
    if (error) {
      const { message } = error;
      this.emitAdapterEvent("output", {
        category: "stderr",
        output: `${message}
`
      });
    }
    this.resetInternal();
  }
  async ["Debugger.scriptParsed"](event) {
    const { url, scriptId, sourceMapURL } = event;
    if (!url) {
      return;
    }
    const isUserCode = path.isAbsolute(url);
    const sourceMap = SourceMap(sourceMapURL);
    const name = sourceName(url);
    const presentationHint = sourcePresentationHint(url);
    if (isUserCode) {
      this.#addSource({
        sourceId: url,
        scriptId,
        name,
        path: url,
        presentationHint,
        sourceMap
      });
      return;
    }
    const sourceReference = this.#sourceId++;
    this.#addSource({
      sourceId: sourceReference,
      scriptId,
      name,
      sourceReference,
      presentationHint,
      sourceMap
    });
  }
  ["Debugger.scriptFailedToParse"](event) {
    const { url, errorMessage, errorLine } = event;
    if (!url) {
      return;
    }
    this.emitAdapterEvent("output", {
      category: "stderr",
      output: errorMessage,
      line: this.#lineFrom0BasedLine(errorLine),
      source: {
        path: url || void 0
      }
    });
  }
  async ["Debugger.breakpointResolved"](event) {
    const { breakpointId, location } = event;
    const futureBreakpoints = this.#getFutureBreakpoints(breakpointId);
    if (futureBreakpoints?.length) {
      const [{ url }] = futureBreakpoints;
      const requests = futureBreakpoints.map(({ breakpoint }) => breakpoint);
      const oldBreakpoints = this.#getBreakpointsById(breakpointId);
      const breakpoints2 = await this.#setBreakpointsByUrl(url, requests);
      for (let i = 0; i < breakpoints2.length; i++) {
        const breakpoint = breakpoints2[i];
        const oldBreakpoint = oldBreakpoints[i];
        this.emitAdapterEvent("breakpoint", {
          reason: "changed",
          breakpoint: {
            ...breakpoint,
            id: oldBreakpoint.id
          }
        });
      }
      await this.#unsetBreakpoint(breakpointId);
      return;
    }
    const breakpoints = this.#getBreakpointsById(breakpointId);
    if (!breakpoints.length) {
      const { scriptId } = location;
      const [url] = breakpointId.split(":");
      const source = await this.#getSourceById(scriptId, url);
      this.#addBreakpoint({
        breakpointId,
        location,
        source,
        notify: true
      });
      return;
    }
  }
  ["Debugger.paused"](event) {
    const { reason, callFrames, asyncStackTrace, data } = event;
    this.#stackFrames.length = 0;
    this.#stopped ||= stoppedReason(reason);
    for (const callFrame of callFrames) {
      this.#addStackFrame(callFrame);
    }
    if (asyncStackTrace) {
      this.#addAsyncStackTrace(asyncStackTrace);
    }
    let hitBreakpointIds;
    if (data) {
      if (reason === "exception") {
        const remoteObject = data;
        this.#exception = this.#addObject(remoteObject, { objectGroup: "debugger" });
      }
      if (reason === "FunctionCall") {
        const { name } = data;
        const breakpoint = this.#getFunctionBreakpoint(name);
        if (breakpoint) {
          const { id } = breakpoint;
          hitBreakpointIds = [id];
        }
      }
      if (reason === "Breakpoint") {
        const { breakpointId } = data;
        const futureBreakpoints = this.#getFutureBreakpoints(breakpointId);
        if (futureBreakpoints.length) {
          this.send("Debugger.resume");
          return;
        }
        const breakpoints = this.#getBreakpointsById(breakpointId);
        if (breakpoints.length) {
          hitBreakpointIds = breakpoints.map(({ id }) => id);
        }
      }
    }
    this.emitAdapterEvent("stopped", {
      threadId: this.#threadId,
      reason: this.#stopped,
      hitBreakpointIds
    });
  }
  ["Debugger.resumed"]() {
    this.#stackFrames.length = 0;
    this.#stopped = void 0;
    this.#exception = void 0;
    for (const { variablesReference, objectGroup } of this.#variables.values()) {
      if (objectGroup === "debugger") {
        this.#variables.delete(variablesReference);
      }
    }
    this.emitAdapterEvent("continued", {
      threadId: this.#threadId
    });
  }
  ["Process.stdout"](output2) {
    this.emitAdapterEvent("output", {
      category: "debug console",
      output: output2
    });
  }
  ["Process.stderr"](output2) {
    this.emitAdapterEvent("output", {
      category: "debug console",
      output: output2
    });
  }
  ["Console.messageAdded"](event) {
  }
  #addSource(source) {
    let { sourceId, scriptId, path: path4 } = source;
    if (path4) {
      path4 = source.path = normalizeSourcePath(path4, this.#untitledDocPath, this.#bunEvalPath);
    }
    const oldSource = this.#getSourceIfPresent(sourceId);
    if (oldSource) {
      const { scriptId: scriptId2, path: oldPath } = oldSource;
      this.#sources.delete(scriptId2);
      if (path4 !== oldPath) {
        this.emitAdapterEvent("loadedSource", {
          reason: "removed",
          source: oldSource
        });
      }
    }
    this.#sources.set(sourceId, source);
    this.#sources.set(scriptId, source);
    this.emitAdapterEvent("loadedSource", {
      // If the reason is "changed", the source will be retrieved using
      // the `source` command, which is why it cannot be set when `path` is present.
      reason: oldSource && !path4 ? "changed" : "new",
      source
    });
    if (!path4) {
      return source;
    }
    const resolves = this.#pendingSources.get(path4);
    if (resolves) {
      this.#pendingSources.delete(path4);
      for (const resolve of resolves) {
        resolve(source);
      }
    }
    return source;
  }
  loadedSources() {
    const sources = /* @__PURE__ */ new Map();
    for (const source of this.#sources.values()) {
      const { sourceId } = source;
      sources.set(sourceId, source);
    }
    return {
      sources: [...sources.values()]
    };
  }
  #getSourceIfPresent(sourceId) {
    return this.#sources.get(sourceId);
  }
  async #getSource(sourceId) {
    const source = this.#getSourceIfPresent(sourceId);
    if (source) {
      return source;
    }
    if (typeof sourceId === "string") {
      sourceId = normalizeSourcePath(sourceId, this.#untitledDocPath, this.#bunEvalPath);
    }
    let resolves = this.#pendingSources.get(sourceId.toString());
    if (!resolves) {
      this.#pendingSources.set(sourceId.toString(), resolves = []);
    }
    return new Promise((resolve) => {
      resolves.push(resolve);
    });
  }
  async #getSourceById(scriptId, url) {
    const source = this.#getSourceIfPresent(scriptId);
    if (source) {
      return source;
    }
    let result;
    try {
      result = await this.send("Debugger.getScriptSource", { scriptId });
    } catch {
      return void 0;
    }
    const { scriptSource } = result;
    const sourceMap = SourceMap(scriptSource);
    const presentationHint = sourcePresentationHint(url);
    if (url) {
      return this.#addSource({
        scriptId,
        sourceId: url,
        name: sourceName(url),
        path: url,
        sourceMap,
        presentationHint
      });
    }
    const sourceReference = this.#sourceId++;
    return this.#addSource({
      scriptId,
      sourceId: sourceReference,
      sourceReference,
      sourceMap,
      presentationHint
    });
  }
  async stackTrace(request) {
    const { length } = this.#stackFrames;
    const { startFrame = 0, levels } = request;
    const endFrame = levels ? startFrame + levels : length;
    return {
      totalFrames: length,
      stackFrames: this.#stackFrames.slice(startFrame, endFrame)
    };
  }
  async scopes(request) {
    const { frameId } = request;
    for (const stackFrame of this.#stackFrames) {
      const { id, scopes } = stackFrame;
      if (id !== frameId || !scopes) {
        continue;
      }
      return {
        scopes
      };
    }
    return {
      scopes: []
    };
  }
  #getCallFrameId(frameId) {
    for (const { id, callFrameId } of this.#stackFrames) {
      if (id === frameId) {
        return callFrameId;
      }
    }
    return void 0;
  }
  #addStackFrame(callFrame) {
    const { callFrameId, functionName, location, scopeChain, this: thisObject } = callFrame;
    const { scriptId } = location;
    const source = this.#getSourceIfPresent(scriptId);
    let originalLocation;
    if (source) {
      originalLocation = this.#originalLocation(source, location);
    } else {
      const { lineNumber, columnNumber } = location;
      originalLocation = {
        line: this.#lineFrom0BasedLine(lineNumber),
        column: this.#columnFrom0BasedColumn(columnNumber)
      };
    }
    const { line, column } = originalLocation;
    const scopes = [];
    const stackFrame = {
      callFrameId,
      scriptId,
      id: this.#stackFrames.length,
      name: functionName || "<anonymous>",
      line,
      column,
      presentationHint: stackFramePresentationHint(source?.path),
      source,
      scopes
    };
    this.#stackFrames.push(stackFrame);
    for (const scope of scopeChain) {
      const { name, type, location: location2, object, empty } = scope;
      if (empty) {
        continue;
      }
      const { variablesReference } = this.#addObject(object, { objectGroup: "debugger" });
      const presentationHint = scopePresentationHint(type);
      const title = presentationHint ? titleize(presentationHint) : "Unknown";
      const displayName = name ? `${title}: ${name}` : title;
      let originalLocation2;
      if (location2) {
        const { scriptId: scriptId2 } = location2;
        const source2 = this.#getSourceIfPresent(scriptId2);
        if (source2) {
          originalLocation2 = this.#originalLocation(source2, location2);
        } else {
          const { lineNumber, columnNumber } = location2;
          originalLocation2 = {
            line: this.#lineFrom0BasedLine(lineNumber),
            column: this.#columnFrom0BasedColumn(columnNumber)
          };
        }
      }
      const { line: line2, column: column2 } = originalLocation2 ?? {};
      scopes.push({
        name: displayName,
        presentationHint,
        expensive: presentationHint === "globals",
        variablesReference,
        line: line2,
        column: column2,
        source
      });
    }
    return stackFrame;
  }
  #addAsyncStackTrace(stackTrace) {
    const { callFrames, parentStackTrace } = stackTrace;
    for (const callFrame of callFrames) {
      this.#addAsyncStackFrame(callFrame);
    }
    if (parentStackTrace) {
      this.#addAsyncStackTrace(parentStackTrace);
    }
  }
  #addAsyncStackFrame(callFrame) {
    const { scriptId, functionName } = callFrame;
    const callFrameId = callFrameToId(callFrame);
    const source = this.#getSourceIfPresent(scriptId);
    let originalLocation;
    if (source) {
      originalLocation = this.#originalLocation(source, callFrame);
    } else {
      const { lineNumber, columnNumber } = callFrame;
      originalLocation = {
        line: this.#lineFrom0BasedLine(lineNumber),
        column: this.#columnFrom0BasedColumn(columnNumber)
      };
    }
    const { line, column } = originalLocation;
    const stackFrame = {
      callFrameId,
      scriptId,
      id: this.#stackFrames.length,
      name: functionName || "<anonymous>",
      line,
      column,
      source,
      presentationHint: stackFramePresentationHint(source?.path),
      canRestart: false
    };
    this.#stackFrames.push(stackFrame);
    return stackFrame;
  }
  async variables(request) {
    const { variablesReference, start, count } = request;
    const variable = this.#getVariable(variablesReference);
    let variables;
    if (!variable) {
      variables = [];
    } else if (Array.isArray(variable)) {
      variables = variable;
    } else {
      variables = await this.#getProperties(variable, start, count);
    }
    return {
      variables: variables.sort(variablesSortBy)
    };
  }
  async setVariable(request) {
    const { variablesReference, name, value } = request;
    const variable = this.#getVariable(variablesReference);
    if (!variable) {
      throw new Error("Variable not found.");
    }
    const { objectId, objectGroup } = variable;
    if (!objectId) {
      throw new Error("Variable cannot be modified.");
    }
    const { result, wasThrown } = await this.send("Runtime.callFunctionOn", {
      objectId,
      functionDeclaration: `function (name) { this[name] = ${value}; return this[name]; }`,
      arguments: [{ value: name }],
      doNotPauseOnExceptionsAndMuteConsole: true
    });
    if (wasThrown) {
      throw new Error(remoteObjectToString(result));
    }
    return this.#addObject(result, { name, objectGroup });
  }
  async setExpression(request) {
    const { expression, value, frameId } = request;
    const callFrameId = this.#getCallFrameId(frameId);
    const objectGroup = callFrameId ? "debugger" : "repl";
    const { result, wasThrown } = await this.evaluateInternal({
      expression: `${expression} = (${value});`,
      objectGroup: "repl",
      callFrameId
    });
    if (wasThrown) {
      throw new Error(remoteObjectToString(result));
    }
    return this.#addObject(result, { objectGroup });
  }
  #getVariable(variablesReference) {
    if (!variablesReference) {
      return void 0;
    }
    return this.#variables.get(variablesReference);
  }
  #addObject(remoteObject, propertyDescriptor) {
    const { objectId, type, subtype, size } = remoteObject;
    const { objectGroup, evaluateName } = propertyDescriptor ?? {};
    const variablesReference = objectId ? this.#variableId++ : 0;
    const variable = {
      objectId,
      objectGroup,
      variablesReference,
      type: subtype || type,
      value: remoteObjectToString(remoteObject),
      name: propertyDescriptorToName(propertyDescriptor),
      evaluateName: propertyDescriptorToEvaluateName(propertyDescriptor, evaluateName),
      indexedVariables: isArrayLike(subtype) ? size : void 0,
      namedVariables: isMap(subtype) ? size : void 0,
      presentationHint: remoteObjectToVariablePresentationHint(remoteObject, propertyDescriptor)
    };
    if (variablesReference) {
      this.#variables.set(variablesReference, variable);
    }
    return variable;
  }
  async #getProperties(variable, offset, count) {
    const { objectId, objectGroup, type, evaluateName, indexedVariables, namedVariables } = variable;
    const variables = [];
    if (!objectId || type === "symbol") {
      return variables;
    }
    const { properties, internalProperties } = await this.send("Runtime.getDisplayableProperties", {
      objectId,
      generatePreview: true
    });
    for (const property of properties) {
      variables.push(...this.#addProperty(property, { objectGroup, evaluateName, parentType: type }));
    }
    if (internalProperties) {
      for (const property of internalProperties) {
        variables.push(
          ...this.#addProperty(property, { objectGroup, evaluateName, parentType: type, isSynthetic: true })
        );
      }
    }
    const hasEntries = type !== "array" && (indexedVariables || namedVariables);
    if (hasEntries) {
      const { entries } = await this.send("Runtime.getCollectionEntries", {
        objectId,
        fetchStart: offset,
        fetchCount: count
      });
      let i = 0;
      for (const { key, value } of entries) {
        let name = String(i++);
        if (key) {
          const { value: value2, description: description2 } = key;
          name = String(value2 ?? description2);
        }
        variables.push(
          ...this.#addProperty(
            { name, value },
            {
              objectGroup,
              evaluateName,
              parentType: type,
              isSynthetic: true
            }
          )
        );
      }
    }
    return variables;
  }
  #addProperty(propertyDescriptor, options) {
    const { value, get, set, symbol } = propertyDescriptor;
    const descriptor = { ...propertyDescriptor, ...options };
    const variables = [];
    if (value) {
      variables.push(this.#addObject(value, descriptor));
    }
    if (get) {
      const { type } = get;
      if (type !== "undefined") {
        variables.push(this.#addObject(get, descriptor));
      }
    }
    if (set) {
      const { type } = set;
      if (type !== "undefined") {
        variables.push(this.#addObject(set, descriptor));
      }
    }
    if (symbol) {
      variables.push(this.#addObject(symbol, descriptor));
    }
    return variables;
  }
  async exceptionInfo() {
    const exception = this.#exception;
    if (!exception) {
      throw new Error("No exception found.");
    }
    const { code, ...details } = await this.#getExceptionDetails(exception);
    return {
      exceptionId: code || "",
      breakMode: "always",
      details
    };
  }
  async #getExceptionDetails(variable) {
    const properties = await this.#getProperties(variable);
    let fullTypeName;
    let message;
    let code;
    let stackTrace;
    let innerException;
    for (const property of properties) {
      const { name, value, type } = property;
      if (name === "name") {
        fullTypeName = value;
      } else if (name === "message") {
        message = type === "string" ? JSON.parse(value) : value;
      } else if (name === "stack") {
        stackTrace = type === "string" ? JSON.parse(value) : value;
      } else if (name === "code") {
        code = type === "string" ? JSON.parse(value) : value;
      } else if (name === "cause") {
        const cause = await this.#getExceptionDetails(property);
        innerException = [cause];
      } else if (name === "errors") {
        const errors = await this.#getProperties(property);
        innerException = await Promise.all(errors.map((error) => this.#getExceptionDetails(error)));
      }
    }
    if (!stackTrace) {
      const { value } = variable;
      stackTrace ||= value;
    }
    return {
      fullTypeName,
      message,
      code,
      stackTrace: stripAnsi(stackTrace),
      innerException
    };
  }
  close() {
    this.inspector.close();
    this.resetInternal();
  }
  resetInternal() {
    this.#pendingSources.clear();
    this.#sources.clear();
    this.#stackFrames.length = 0;
    this.#stopped = void 0;
    this.#exception = void 0;
    this.#breakpoints.clear();
    this.#futureBreakpoints.clear();
    this.#functionBreakpoints.clear();
    this.#targets.clear();
    this.#variables.clear();
    this.options = void 0;
  }
};
var NodeSocketDebugAdapter = class extends BaseDebugAdapter {
  constructor(socket, untitledDocPath, bunEvalPath) {
    super(new NodeSocketInspector(socket), untitledDocPath, bunEvalPath);
    socket.once("close", () => {
      this.resetInternal();
    });
  }
  exitJSProcess() {
    this.evaluateInternal({
      expression: "process.exit(0)"
    });
  }
  async start() {
    const ok = await this.inspector.start();
    return ok;
  }
};
var WebSocketDebugAdapter = class extends BaseDebugAdapter {
  #process;
  constructor(url, untitledDocPath, bunEvalPath) {
    super(new WebSocketInspector(url), untitledDocPath, bunEvalPath);
  }
  async ["Inspector.disconnected"](error) {
    await super["Inspector.disconnected"](error);
    if (this.#process?.exitCode !== null) {
      this.emitAdapterEvent("terminated");
    }
  }
  exitJSProcess() {
    if (!this.#process?.kill()) {
      this.evaluateInternal({
        expression: "process.exit(0)"
      });
    }
  }
  /**
   * Starts the inspector.
   * @param url the inspector url, will default to the one provided in the constructor (if any). If none
   * @returns if the inspector was able to connect
   */
  start(url) {
    return this.#attach({ url });
  }
  close() {
    this.#process?.kill();
    super.close();
  }
  async launch(request) {
    this.options = { ...request, type: "launch" };
    try {
      await this.#launch(request);
    } catch (error) {
      const { message } = unknownToError4(error);
      this.emitAdapterEvent("output", {
        category: "stderr",
        output: `Failed to start debugger.
${message}`
      });
      this.terminate();
    }
  }
  async #launch(request) {
    const {
      runtime = "bun",
      runtimeArgs = [],
      program,
      args = [],
      cwd,
      env = {},
      strictEnv = false,
      watchMode = false,
      stopOnEntry = false,
      __skipValidation = false,
      stdin
    } = request;
    if (!__skipValidation && !program) {
      throw new Error("No program specified");
    }
    const processArgs = [...runtimeArgs];
    if (program === "-" && stdin) {
      processArgs.push("--eval", stdin);
    } else if (program) {
      processArgs.push(program);
    }
    processArgs.push(...args);
    if (program && isTestJavaScript(program) && !runtimeArgs.includes("test")) {
      processArgs.unshift("test");
    }
    if (watchMode && !runtimeArgs.includes("--watch") && !runtimeArgs.includes("--hot")) {
      processArgs.unshift(watchMode === "hot" ? "--hot" : "--watch");
    }
    const processEnv = strictEnv ? {
      ...env
    } : {
      ...process.env,
      ...env
    };
    if (process.platform !== "win32") {
      const url = `ws+unix://${randomUnixPath()}`;
      const signal = new UnixSignal();
      signal.on("Signal.received", () => {
        this.#attach({ url });
      });
      this.once("Adapter.terminated", () => {
        signal.close();
      });
      const query = stopOnEntry ? "break=1" : "wait=1";
      processEnv["BUN_INSPECT"] = `${url}?${query}`;
      processEnv["BUN_INSPECT_NOTIFY"] = signal.url;
      processEnv["FORCE_COLOR"] = "1";
      processEnv["BUN_QUIET_DEBUG_LOGS"] = "1";
      processEnv["BUN_DEBUG_QUIET_LOGS"] = "1";
      const started = await this.#spawn({
        command: runtime,
        args: processArgs,
        env: processEnv,
        cwd,
        isDebugee: true
      });
      if (!started) {
        throw new Error("Program could not be started.");
      }
    } else {
      const url = `ws://127.0.0.1:${await getAvailablePort()}/${getRandomId()}`;
      const signal = new TCPSocketSignal(await getAvailablePort());
      signal.on("Signal.received", async () => {
        this.#attach({ url });
      });
      this.once("Adapter.terminated", () => {
        signal.close();
      });
      const query = stopOnEntry ? "break=1" : "wait=1";
      processEnv["BUN_INSPECT"] = `${url}?${query}`;
      processEnv["BUN_INSPECT_NOTIFY"] = signal.url;
      processEnv["FORCE_COLOR"] = "1";
      processEnv["BUN_QUIET_DEBUG_LOGS"] = "1";
      processEnv["BUN_DEBUG_QUIET_LOGS"] = "1";
      const started = await this.#spawn({
        command: runtime,
        args: processArgs,
        env: processEnv,
        cwd,
        isDebugee: true
      });
      if (!started) {
        throw new Error("Program could not be started.");
      }
    }
  }
  async #spawn(options) {
    const { command, args = [], cwd, env, isDebugee } = options;
    const request = { command, args, cwd, env };
    this.emit("Process.requested", request);
    let subprocess;
    try {
      subprocess = (0, import_node_child_process.spawn)(command, args, {
        ...request,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (cause) {
      this.emit("Process.exited", new Error("Failed to spawn process", { cause }), null);
      return false;
    }
    subprocess.on("spawn", () => {
      this.emit("Process.spawned", subprocess);
      if (isDebugee) {
        this.#process = subprocess;
        this.emitAdapterEvent("process", {
          name: `${command} ${args.join(" ")}`,
          systemProcessId: subprocess.pid,
          isLocalProcess: true,
          startMethod: "launch"
        });
      }
    });
    subprocess.on("exit", (code, signal) => {
      this.emit("Process.exited", code, signal);
      if (isDebugee) {
        this.#process = void 0;
        this.emitAdapterEvent("exited", {
          exitCode: code ?? -1
        });
        this.emitAdapterEvent("terminated");
      }
    });
    subprocess.stdout?.on("data", (data) => {
      this.emit("Process.stdout", data.toString());
    });
    subprocess.stderr?.on("data", (data) => {
      this.emit("Process.stderr", data.toString());
    });
    return new Promise((resolve) => {
      subprocess.on("spawn", () => resolve(true));
      subprocess.on("exit", () => resolve(false));
      subprocess.on("error", () => resolve(false));
    });
  }
  async attach(request) {
    this.options = { ...request, type: "attach" };
    try {
      await this.#attach(request);
    } catch (error) {
      const { message } = unknownToError4(error);
      this.emitAdapterEvent("output", {
        category: "stderr",
        output: `Failed to start debugger.
${message}`
      });
      this.terminate();
    }
  }
  async #attach(request) {
    const { url } = request;
    for (let i = 0; i < 3; i++) {
      const ok = await this.inspector.start(url);
      if (ok) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * i));
    }
    return false;
  }
};
function stoppedReason(reason) {
  switch (reason) {
    case "Breakpoint":
      return "breakpoint";
    case "FunctionCall":
      return "function breakpoint";
    case "PauseOnNextStatement":
    case "DebuggerStatement":
      return "pause";
    case "exception":
    case "assert":
      return "exception";
    default:
      return "breakpoint";
  }
}
function titleize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
function sourcePresentationHint(url) {
  if (!url || !path.isAbsolute(url)) {
    return "deemphasize";
  }
  if (url.includes("/node_modules/") || url.includes("\\node_modules\\")) {
    return "normal";
  }
  return "emphasize";
}
function sourceName(url) {
  if (!url) {
    return "unknown.js";
  }
  if (isJavaScript(url)) {
    if (process.platform === "win32") {
      url = url.replaceAll("\\", "/");
    }
    return url.split("/").pop() || url;
  }
  return `${url}.js`;
}
function stackFramePresentationHint(path4) {
  if (!path4 || path4.includes("/node_modules/")) {
    return "subtle";
  }
  return "normal";
}
function scopePresentationHint(type) {
  switch (type) {
    case "closure":
    case "functionName":
    case "with":
    case "catch":
    case "nestedLexical":
      return "locals";
    case "global":
    case "globalLexicalEnvironment":
      return "globals";
    default:
      return void 0;
  }
}
function isSet(subtype) {
  return subtype === "set" || subtype === "weakset";
}
function isArrayLike(subtype) {
  return subtype === "array" || isSet(subtype);
}
function isMap(subtype) {
  return subtype === "map" || subtype === "weakmap";
}
function breakpointOptions(breakpoint) {
  const { condition, hitCondition, logMessage } = breakpoint;
  return {
    condition,
    ignoreCount: hitConditionToIgnoreCount(hitCondition),
    autoContinue: !!logMessage,
    actions: [
      {
        type: "evaluate",
        data: logMessageToExpression(logMessage),
        emulateUserGesture: true
      }
    ]
  };
}
function hitConditionToIgnoreCount(hitCondition) {
  if (!hitCondition) {
    return void 0;
  }
  if (hitCondition.includes("<")) {
    throw new Error("Hit condition with '<' is not supported, use '>' or '>=' instead.");
  }
  const count = parseInt(hitCondition.replace(/[^\d+]/g, ""));
  if (isNaN(count)) {
    throw new Error("Hit condition is not a number.");
  }
  if (hitCondition.includes(">") && !hitCondition.includes("=")) {
    return Math.max(0, count);
  }
  return Math.max(0, count - 1);
}
function logMessageToExpression(logMessage) {
  if (!logMessage) {
    return void 0;
  }
  return `console.log(\`${logMessage.replace(/\$?{/g, "${")}\`);`;
}
function completionToExpression(completion) {
  const lastDot = completion.lastIndexOf(".");
  const last = (s0, s1) => {
    const i0 = completion.lastIndexOf(s0);
    const i1 = completion.lastIndexOf(s1);
    return i1 > i0 ? i1 + 1 : i0;
  };
  const lastIdentifier = Math.max(lastDot, last("[", "]"), last("(", ")"), last("{", "}"));
  let expression;
  let remainder;
  if (lastIdentifier > 0) {
    expression = completion.slice(0, lastIdentifier);
    remainder = completion.slice(lastIdentifier);
  } else {
    expression = "";
    remainder = completion;
  }
  const [hint] = completion.slice(lastIdentifier).match(/[#$a-z_][0-9a-z_$]*/gi) ?? [];
  return {
    expression,
    hint
  };
}
function sourceToId(source) {
  const { path: path4, sourceReference } = source ?? {};
  if (path4) {
    return path4;
  }
  if (sourceReference) {
    return sourceReference;
  }
  throw new Error("No source found.");
}
function callFrameToId(callFrame) {
  const { url, lineNumber, columnNumber } = callFrame;
  return `${url}:${lineNumber}:${columnNumber}`;
}
function sanitizeExpression(expression) {
  expression = expression.trim();
  if (expression.startsWith("{")) {
    expression = `(${expression})`;
  }
  if (expression.startsWith("return ")) {
    expression = expression.slice(7);
  }
  if (expression.startsWith("await ")) {
    expression = expression.slice(6);
  }
  return expression;
}
function remoteObjectToVariablePresentationHint(remoteObject, propertyDescriptor) {
  const { type, subtype } = remoteObject;
  const { name, enumerable, writable, isPrivate, isSynthetic, symbol, get, set, wasThrown } = propertyDescriptor ?? {};
  const hasGetter = get?.type === "function";
  const hasSetter = set?.type === "function";
  const hasSymbol = symbol?.type === "symbol";
  let kind;
  let visibility;
  let lazy;
  let attributes = [];
  if (type === "function") {
    kind = "method";
  }
  if (subtype === "class") {
    kind = "class";
  }
  if (isSynthetic || isPrivate || hasSymbol) {
    visibility = "protected";
  }
  if (enumerable === false || name === "__proto__") {
    visibility = "internal";
  }
  if (type === "string") {
    attributes.push("rawString");
  }
  if (isSynthetic || writable === false || hasGetter && !hasSetter) {
    attributes.push("readOnly");
  }
  if (wasThrown || hasGetter) {
    lazy = true;
    attributes.push("hasSideEffects");
  }
  return {
    kind,
    visibility,
    lazy,
    attributes
  };
}
function propertyDescriptorToName(propertyDescriptor) {
  if (!propertyDescriptor) {
    return "";
  }
  const { name } = propertyDescriptor;
  if (name === "__proto__") {
    return "[[Prototype]]";
  }
  return name ?? "";
}
function propertyDescriptorToEvaluateName(propertyDescriptor, evaluateName) {
  if (!propertyDescriptor) {
    return evaluateName;
  }
  const { name: property, isSynthetic, parentType: type } = propertyDescriptor;
  if (!property) {
    return evaluateName;
  }
  if (!evaluateName) {
    return property;
  }
  if (isSynthetic) {
    if (isMap(type)) {
      if (isNumeric(property)) {
        return `${evaluateName}.get(${property})`;
      }
      return `${evaluateName}.get(${JSON.stringify(property)})`;
    }
    if (isSet(type)) {
      return `[...${evaluateName}.values()][${property}]`;
    }
  }
  if (isNumeric(property)) {
    return `${evaluateName}[${property}]`;
  }
  if (isIdentifier(property)) {
    return `${evaluateName}.${property}`;
  }
  return `${evaluateName}[${JSON.stringify(property)}]`;
}
function isNumeric(string) {
  return /^\d+$/.test(string);
}
function isIdentifier(string) {
  return /^[#$a-z_][0-9a-z_$]*$/i.test(string);
}
function unknownToError4(input) {
  if (input instanceof Error) {
    return input;
  }
  return new Error(String(input));
}
function isJavaScript(path4) {
  return /\.(c|m)?(j|t)sx?$/.test(path4);
}
function isTestJavaScript(path4) {
  return /\.(test|spec)\.(c|m)?(j|t)sx?$/.test(path4);
}
function isSyntaxError(remoteObject) {
  const { className } = remoteObject;
  switch (className) {
    case "SyntaxError":
    case "ReferenceError":
      return true;
  }
  return false;
}
function variableToCompletionItem(variable) {
  const { name, type } = variable;
  return {
    label: name,
    type: variableTypeToCompletionItemType(type)
  };
}
function variableTypeToCompletionItemType(type) {
  switch (type) {
    case "class":
      return "class";
    case "function":
      return "function";
  }
  return "property";
}
function variablesSortBy(a, b) {
  const visibility = (variable) => {
    const { presentationHint } = variable;
    switch (presentationHint?.visibility) {
      case "protected":
        return 1;
      case "private":
        return 2;
      case "internal":
        return 3;
    }
    return 0;
  };
  const index = (variable) => {
    const { name } = variable;
    switch (name) {
      case "[[Prototype]]":
      case "prototype":
      case "__proto__":
        return Number.MAX_VALUE;
    }
    const index2 = parseInt(name);
    if (isFinite(index2)) {
      return index2;
    }
    switch (name[0]) {
      case "_":
      case "$":
        return 1;
      case "#":
        return 2;
    }
    return 0;
  };
  const av = visibility(a);
  const bv = visibility(b);
  if (av > bv)
    return 1;
  if (av < bv)
    return -1;
  const ai = index(a);
  const bi = index(b);
  if (ai > bi)
    return 1;
  if (ai < bi)
    return -1;
  return 0;
}
function numberIsValid2(number) {
  return typeof number === "number" && isFinite(number) && number >= 0;
}
function stripAnsi(string) {
  return string.replace(/\u001b\[\d+m/g, "");
}
function invalidBreakpoint(error) {
  const { message } = error ? unknownToError4(error) : { message: void 0 };
  return {
    id: nextId(),
    breakpointId: "",
    verified: false,
    message
  };
}
var Cancel = Symbol("Cancel");
var sequence = 1;
function nextId() {
  return sequence++;
}
function getRandomId() {
  return Math.random().toString(36).slice(2);
}
function normalizeWindowsPath(winPath) {
  winPath = path.normalize(winPath);
  if (winPath[1] === ":" && (winPath[2] === "\\" || winPath[2] === "/")) {
    return (winPath.charAt(0).toUpperCase() + winPath.slice(1)).replaceAll("\\\\", "\\");
  }
  return winPath;
}

// src/features/debug.ts
var DEBUG_CONFIGURATION = {
  type: "bun",
  internalConsoleOptions: "neverOpen",
  request: "launch",
  name: "Debug File",
  program: "${file}",
  cwd: "${workspaceFolder}",
  stopOnEntry: false,
  watchMode: false
};
var RUN_CONFIGURATION = {
  type: "bun",
  internalConsoleOptions: "neverOpen",
  request: "launch",
  name: "Run File",
  program: "${file}",
  cwd: "${workspaceFolder}",
  noDebug: true,
  watchMode: false
};
var ATTACH_CONFIGURATION = {
  type: "bun",
  internalConsoleOptions: "neverOpen",
  request: "attach",
  name: "Attach Bun",
  url: "ws://localhost:6499/",
  stopOnEntry: false
};
var adapters = /* @__PURE__ */ new Map();
function registerDebugger(context, factory) {
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      ["javascript", "typescript", "javascriptreact", "typescriptreact"],
      new BunCodeLensProvider()
    ),
    vscode.commands.registerCommand("extension.bun.runFile", runFileCommand),
    vscode.commands.registerCommand("extension.bun.debugFile", debugFileCommand),
    vscode.debug.registerDebugConfigurationProvider(
      "bun",
      new DebugConfigurationProvider(),
      vscode.DebugConfigurationProviderTriggerKind.Initial
    ),
    vscode.debug.registerDebugConfigurationProvider(
      "bun",
      new DebugConfigurationProvider(),
      vscode.DebugConfigurationProviderTriggerKind.Dynamic
    ),
    vscode.debug.registerDebugAdapterDescriptorFactory("bun", factory ?? new InlineDebugAdapterFactory())
  );
  if (getConfig("debugTerminal.enabled")) {
    injectDebugTerminal2().then(context.subscriptions.push);
  }
}
function runFileCommand(resource) {
  const path4 = getActivePath(resource);
  if (path4) {
    vscode.debug.startDebugging(void 0, {
      ...RUN_CONFIGURATION,
      noDebug: true,
      program: path4,
      runtime: getRuntime(resource)
    });
  }
}
function debugCommand(command) {
  vscode.debug.startDebugging(void 0, {
    ...DEBUG_CONFIGURATION,
    program: command,
    runtime: getRuntime()
  });
}
function debugFileCommand(resource) {
  const path4 = getActivePath(resource);
  if (path4)
    debugCommand(path4);
}
async function injectDebugTerminal(terminal) {
  const { name, creationOptions } = terminal;
  if (name !== "JavaScript Debug Terminal") {
    return;
  }
  const { env } = creationOptions;
  if (env && env["BUN_INSPECT"]) {
    return;
  }
  const session = new TerminalDebugSession();
  await session.initialize();
  const { adapter, signal } = session;
  const stopOnEntry = getConfig("debugTerminal.stopOnEntry") === true;
  const query = stopOnEntry ? "break=1" : "wait=1";
  const debug5 = vscode.window.createTerminal({
    ...creationOptions,
    name: "JavaScript Debug Terminal",
    env: {
      ...env,
      "BUN_INSPECT": `${adapter.url}?${query}`,
      "BUN_INSPECT_NOTIFY": signal.url,
      BUN_INSPECT_CONNECT_TO: ""
    }
  });
  debug5.show();
  setTimeout(() => terminal.dispose(), 100);
}
async function injectDebugTerminal2() {
  const jsDebugExt = vscode.extensions.getExtension("ms-vscode.js-debug-nightly") || vscode.extensions.getExtension("ms-vscode.js-debug");
  if (!jsDebugExt) {
    return vscode.window.onDidOpenTerminal(injectDebugTerminal);
  }
  await jsDebugExt.activate();
  const jsDebug = jsDebugExt.exports;
  if (!jsDebug) {
    return vscode.window.onDidOpenTerminal(injectDebugTerminal);
  }
  return jsDebug.registerDebugTerminalOptionsProvider({
    async provideTerminalOptions(options) {
      const session = new TerminalDebugSession();
      await session.initialize();
      const { adapter, signal } = session;
      const stopOnEntry = getConfig("debugTerminal.stopOnEntry") === true;
      const query = stopOnEntry ? "break=1" : "wait=1";
      return {
        ...options,
        env: {
          ...options.env,
          "BUN_INSPECT": `${adapter.url}?${query}`,
          "BUN_INSPECT_NOTIFY": signal.url,
          BUN_INSPECT_CONNECT_TO: " "
        }
      };
    }
  });
}
var DebugConfigurationProvider = class {
  provideDebugConfigurations(folder) {
    return [DEBUG_CONFIGURATION, RUN_CONFIGURATION, ATTACH_CONFIGURATION];
  }
  resolveDebugConfiguration(folder, config, token) {
    let target;
    const { request } = config;
    if (request === "attach") {
      target = ATTACH_CONFIGURATION;
    } else {
      target = DEBUG_CONFIGURATION;
    }
    if (config.program === "-" && config.__code) {
      const code = config.__code;
      delete config.__code;
      config.stdin = code;
      config.program = "-";
      config.__skipValidation = true;
    }
    for (const [key, value] of Object.entries(target)) {
      if (config[key] === void 0) {
        config[key] = value;
      }
    }
    if (request === "launch" && !config["runtime"]) {
      config["runtime"] = getRuntime(folder);
    }
    return config;
  }
};
var InlineDebugAdapterFactory = class {
  async createDebugAdapterDescriptor(session) {
    const { configuration } = session;
    const { request, url, __untitledName, localRoot, remoteRoot } = configuration;
    if (request === "attach") {
      for (const [adapterUrl, adapter2] of adapters) {
        if (adapterUrl === url) {
          return new vscode.DebugAdapterInlineImplementation(adapter2);
        }
      }
    }
    const adapter = new FileDebugSession(session.id, __untitledName, {
      localRoot,
      remoteRoot
    });
    await adapter.initialize();
    return new vscode.DebugAdapterInlineImplementation(adapter);
  }
};
var FileDebugSession = class extends import_debugadapter.DebugSession {
  // If these classes are moved/published, we should make sure
  // we remove these non-null assertions so consumers of
  // this lib are not running into these hard
  adapter;
  sessionId;
  untitledDocPath;
  bunEvalPath;
  localRoot;
  remoteRoot;
  #isWindowsRemote = false;
  constructor(sessionId, untitledDocPath, mapping) {
    super();
    this.sessionId = sessionId;
    this.untitledDocPath = untitledDocPath;
    if (mapping) {
      this.localRoot = mapping.localRoot;
      this.remoteRoot = mapping.remoteRoot;
      if (typeof mapping.remoteRoot === "string") {
        this.#isWindowsRemote = mapping.remoteRoot.includes("\\");
      }
    }
    if (untitledDocPath) {
      const cwd = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath ?? process.cwd();
      this.bunEvalPath = (0, import_node_path2.join)(cwd, "[eval]");
    }
  }
  mapRemoteToLocal(p) {
    if (!p || !this.remoteRoot || !this.localRoot)
      return p;
    const remoteModule = this.#isWindowsRemote ? path2.win32 : path2.posix;
    let remoteRoot = remoteModule.normalize(this.remoteRoot);
    if (!remoteRoot.endsWith(remoteModule.sep))
      remoteRoot += remoteModule.sep;
    let target = remoteModule.normalize(p);
    const starts = this.#isWindowsRemote ? target.toLowerCase().startsWith(remoteRoot.toLowerCase()) : target.startsWith(remoteRoot);
    if (starts) {
      const rel = target.slice(remoteRoot.length);
      const localRel = rel.split(remoteModule.sep).join(path2.sep);
      return path2.join(this.localRoot, localRel);
    }
    return p;
  }
  mapLocalToRemote(p) {
    if (!p || !this.remoteRoot || !this.localRoot)
      return p;
    let localRoot = path2.normalize(this.localRoot);
    if (!localRoot.endsWith(path2.sep))
      localRoot += path2.sep;
    let localPath = path2.normalize(p);
    if (localPath.startsWith(localRoot)) {
      const rel = localPath.slice(localRoot.length);
      const remoteModule = this.#isWindowsRemote ? path2.win32 : path2.posix;
      const remoteRel = rel.split(path2.sep).join(remoteModule.sep);
      return remoteModule.join(this.remoteRoot, remoteRel);
    }
    return p;
  }
  async initialize() {
    const uniqueId = this.sessionId ?? Math.random().toString(36).slice(2);
    const url = process.platform === "win32" ? `ws://127.0.0.1:${await getAvailablePort()}/${getRandomId()}` : `ws+unix://${(0, import_node_os2.tmpdir)()}/${uniqueId}.sock`;
    const { untitledDocPath, bunEvalPath } = this;
    this.adapter = new WebSocketDebugAdapter(url, untitledDocPath, bunEvalPath);
    if (untitledDocPath) {
      this.adapter.on("Adapter.response", (response) => {
        if (response.body?.source?.path) {
          if (response.body.source.path === bunEvalPath) {
            response.body.source.path = untitledDocPath;
          } else {
            response.body.source.path = this.mapRemoteToLocal(response.body.source.path);
          }
        }
        if (Array.isArray(response.body?.breakpoints)) {
          for (const bp of response.body.breakpoints) {
            if (bp.source?.path === bunEvalPath) {
              bp.source.path = untitledDocPath;
              bp.verified = true;
            } else if (bp.source?.path) {
              bp.source.path = this.mapRemoteToLocal(bp.source.path);
            }
          }
        }
        this.sendResponse(response);
      });
      this.adapter.on("Adapter.event", (event) => {
        if (event.body?.source?.path) {
          if (event.body.source.path === bunEvalPath) {
            event.body.source.path = untitledDocPath;
          } else {
            event.body.source.path = this.mapRemoteToLocal(event.body.source.path);
          }
        }
        this.sendEvent(event);
      });
    } else {
      this.adapter.on("Adapter.response", (response) => {
        if (response.body?.source?.path) {
          response.body.source.path = this.mapRemoteToLocal(response.body.source.path);
        }
        if (Array.isArray(response.body?.breakpoints)) {
          for (const bp of response.body.breakpoints) {
            if (bp.source?.path) {
              bp.source.path = this.mapRemoteToLocal(bp.source.path);
            }
          }
        }
        this.sendResponse(response);
      });
      this.adapter.on("Adapter.event", (event) => {
        if (event.body?.source?.path) {
          event.body.source.path = this.mapRemoteToLocal(event.body.source.path);
        }
        this.sendEvent(event);
      });
    }
    this.adapter.on(
      "Adapter.reverseRequest",
      ({ command, arguments: args }) => this.sendRequest(command, args, 5e3, () => {
      })
    );
    adapters.set(url, this);
  }
  handleMessage(message) {
    const { type } = message;
    if (type === "request") {
      const { untitledDocPath, bunEvalPath } = this;
      const { command } = message;
      if (command === "setBreakpoints" || command === "breakpointLocations") {
        const args = message.arguments;
        if (untitledDocPath && args.source?.path === untitledDocPath) {
          args.source.path = bunEvalPath;
        } else if (args.source?.path) {
          args.source.path = this.mapLocalToRemote(args.source.path);
        }
      } else if (command === "source" && message.arguments?.source?.path) {
        message.arguments.source.path = this.mapLocalToRemote(message.arguments.source.path);
      }
      this.adapter.emit("Adapter.request", message);
    } else {
      throw new Error(`Not supported: ${type}`);
    }
  }
  dispose() {
    this.adapter.close();
  }
};
var TerminalDebugSession = class extends FileDebugSession {
  signal;
  constructor() {
    super(void 0, void 0);
  }
  async initialize() {
    await super.initialize();
    if (process.platform === "win32") {
      this.signal = new TCPSocketSignal(await getAvailablePort());
    } else {
      this.signal = new UnixSignal();
    }
    this.signal.on("Signal.received", () => {
      vscode.debug.startDebugging(void 0, {
        ...ATTACH_CONFIGURATION,
        url: this.adapter.url
      });
    });
  }
  get terminalProfile() {
    return new vscode.TerminalProfile({
      name: "Bun Terminal",
      env: {
        "BUN_INSPECT": `${this.adapter.url}?wait=1`,
        "BUN_INSPECT_NOTIFY": this.signal.url,
        BUN_INSPECT_CONNECT_TO: ""
      },
      isTransient: true,
      iconPath: new vscode.ThemeIcon("debug-console")
    });
  }
};
function getActivePath(target) {
  return target?.fsPath ?? vscode.window.activeTextEditor?.document?.uri.fsPath;
}
function getRuntime(scope) {
  const value = getConfig("runtime", scope);
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "bun";
}
var languageIds = ["javascript", "typescript", "javascriptreact", "typescriptreact"];
var BunCodeLensProvider = class {
  async provideCodeLenses(document) {
    if (!document.isUntitled || document.isClosed || document.lineCount === 0)
      return [];
    if (!languageIds.includes(document.languageId)) {
      return [];
    }
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
    return [
      new vscode.CodeLens(range, {
        title: "eval with bun",
        command: "extension.bun.runUnsavedCode",
        tooltip: "Run this unsaved, scratch file with Bun"
      })
    ];
  }
};

// src/features/diagnostics/diagnostics.ts
var fs = __toESM(require("node:fs/promises"));
var os = __toESM(require("node:os"));
var import_node_util = require("node:util");
var vscode2 = __toESM(require("vscode"));

// src/global-state.ts
function typedGlobalState(state) {
  return state;
}

// src/features/diagnostics/diagnostics.ts
var output = vscode2.window.createOutputChannel("Bun - Diagnostics");
var ansiRegex = (() => {
  const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
  const pattern = [
    `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
  ].join("|");
  return new RegExp(pattern, "g");
})();
function stripAnsi2(str) {
  return str.replace(ansiRegex, "");
}
var EditorStateManager = class {
  diagnosticCollection;
  disposables = [];
  constructor() {
    this.diagnosticCollection = vscode2.languages.createDiagnosticCollection("BunDiagnostics");
  }
  getVisibleEditorsWithErrors() {
    return vscode2.window.visibleTextEditors.filter((editor) => {
      const diagnostics = this.diagnosticCollection.get(editor.document.uri);
      return diagnostics && diagnostics.length > 0;
    });
  }
  clearInFile(uri) {
    if (this.diagnosticCollection.has(uri)) {
      output.appendLine(`Clearing diagnostics for ${uri.toString()}`);
      this.diagnosticCollection.delete(uri);
    }
  }
  clearAll(reason) {
    output.appendLine("Clearing all because: " + reason);
    this.diagnosticCollection.clear();
  }
  set(uri, diagnostic) {
    this.diagnosticCollection.set(uri, [diagnostic]);
  }
  dispose() {
    this.clearAll("Editor state was disposed");
    this.disposables.forEach((d) => d.dispose());
  }
};
var BunDiagnosticsManager = class _BunDiagnosticsManager {
  editorState;
  signal;
  context;
  get signalUrl() {
    return this.signal.url;
  }
  static async getOrRecreateSignal(context) {
    const globalState = typedGlobalState(context.globalState);
    const existing = globalState.get("BUN_INSPECT_CONNECT_TO");
    const isWin = os.platform() === "win32";
    if (existing) {
      if (existing.type === "unix") {
        output.appendLine(`Reusing existing unix socket: ${existing.url}`);
        if ("url" in existing) {
          await fs.unlink(existing.url).catch(() => {
          });
        }
        return new UnixSignal(existing.url);
      } else {
        output.appendLine(`Reusing existing tcp socket on: ${existing.port}`);
        return new TCPSocketSignal(existing.port);
      }
    }
    if (isWin) {
      const port = await getAvailablePort();
      await globalState.update("BUN_INSPECT_CONNECT_TO", {
        type: "tcp",
        port
      });
      output.appendLine(`Created new tcp socket on: ${port}`);
      return new TCPSocketSignal(port);
    } else {
      const signal = new UnixSignal();
      await globalState.update("BUN_INSPECT_CONNECT_TO", {
        type: "unix",
        url: signal.url
      });
      output.appendLine(`Created new unix socket: ${signal.url}`);
      return signal;
    }
  }
  // private static getOrCreateOldVersionInspectURL = createGlobalStateGenerationFn(
  //   "DIAGNOSTICS_BUN_INSPECT",
  //   async () => {
  //     const url =
  //       process.platform === "win32"
  //         ? `ws://127.0.0.1:${await getAvailablePort()}/${getRandomId()}`
  //         : `ws+unix://${os.tmpdir()}/${getRandomId()}.sock`;
  //     return url;
  //   },
  // );
  static async initialize(context) {
    const signal = await _BunDiagnosticsManager.getOrRecreateSignal(context);
    return new _BunDiagnosticsManager(context, signal);
  }
  /**
   * Called when Bun pings BUN_INSPECT_NOTIFY (indicating a program has started).
   */
  async handleSocketConnection(socket) {
    const debugAdapter = new NodeSocketDebugAdapter(socket);
    this.editorState.clearAll("A new socket connected");
    debugAdapter.on("LifecycleReporter.reload", async () => {
      this.editorState.clearAll("LifecycleReporter reported a reload event");
    });
    debugAdapter.on("Inspector.event", (e) => {
      output.appendLine(`Received inspector event: ${e.method}`);
    });
    debugAdapter.on("Inspector.error", (e) => {
      output.appendLine((0, import_node_util.inspect)(e, true, null));
    });
    debugAdapter.on("LifecycleReporter.error", (event) => this.handleLifecycleError(event));
    const ok = await debugAdapter.start();
    if (!ok) {
      await vscode2.window.showErrorMessage("Failed to start debug adapter");
      debugAdapter.removeAllListeners();
      return;
    }
    debugAdapter.initialize({
      adapterID: "bun-vsc-terminal-debug-adapter",
      enableControlFlowProfiler: false,
      enableLifecycleAgentReporter: true,
      sendImmediatePreventExit: false,
      enableDebugger: false
      // Performance overhead when debugger is enabled
    });
  }
  handleLifecycleError(event) {
    const message = stripAnsi2(event.message).trim() || event.name || "Error";
    output.appendLine(
      `Received error event: '{name:${event.name}} ${message.split("\n")[0].trim().substring(0, 100)}'`
    );
    const [url = null] = event.urls;
    const [line = null, col = null] = event.lineColumns;
    if (url === null || url.length === 0 || line === null || col === null) {
      output.appendLine("No valid url or line/column found in error event");
      output.appendLine(JSON.stringify(event));
      return;
    }
    const uri = vscode2.Uri.file(url);
    const range = new vscode2.Range(new vscode2.Position(line - 1, col - 1), new vscode2.Position(line - 1, col));
    const document = vscode2.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString());
    const rangeOfWord = document?.getWordRangeAtPosition(range.start) ?? range;
    const diagnostic = new vscode2.Diagnostic(rangeOfWord, message, vscode2.DiagnosticSeverity.Error);
    diagnostic.source = "Bun";
    const relatedInformation = event.urls.flatMap((url2, i) => {
      if (i === 0 || url2 === "") {
        return [];
      }
      const [line2 = null, col2 = null] = event.lineColumns.slice(i * 2, i * 2 + 2);
      if (line2 === null || col2 === null) {
        return [];
      }
      return [
        new vscode2.DiagnosticRelatedInformation(
          new vscode2.Location(vscode2.Uri.file(url2), new vscode2.Position(line2 - 1, col2 - 1)),
          message
        )
      ];
    });
    diagnostic.relatedInformation = relatedInformation;
    this.editorState.set(uri, diagnostic);
  }
  dispose() {
    return vscode2.Disposable.from(this.editorState, {
      dispose: () => {
        this.signal.close();
        this.signal.removeAllListeners();
      }
    });
  }
  constructor(context, signal) {
    this.editorState = new EditorStateManager();
    this.signal = signal;
    this.context = context;
    this.context.subscriptions.push(
      // on did type
      vscode2.workspace.onDidChangeTextDocument((e) => {
        this.editorState.clearInFile(e.document.uri);
      })
    );
    this.signal.on("Signal.Socket.connect", this.handleSocketConnection.bind(this));
  }
};
var description = new vscode2.MarkdownString(
  "Bun's VSCode extension communicates with Bun over a socket. We set the url in your terminal with the `BUN_INSPECT_NOTIFY` environment variable"
);
async function registerDiagnosticsSocket(context) {
  context.environmentVariableCollection.clear();
  context.environmentVariableCollection.description = description;
  if (!getConfig("diagnosticsSocket.enabled"))
    return;
  const manager = await BunDiagnosticsManager.initialize(context);
  context.environmentVariableCollection.replace("BUN_INSPECT_CONNECT_TO", manager.signalUrl);
  context.subscriptions.push(manager);
}

// src/features/lockfile/index.ts
var import_node_child_process2 = require("node:child_process");
var vscode3 = __toESM(require("vscode"));

// src/features/lockfile/lockfile.style.ts
function styleLockfile(preview) {
  const lines = preview.split(/\n(?!\s)/);
  return lines.map(styleSection).join("\n");
}
function styleSection(section) {
  const lines = section.split(/\n/);
  return lines.map(styleLine).join("\n");
}
function styleLine(line) {
  if (line.startsWith("#")) {
    return `<span class="mtk5">${line}</span>`;
  }
  const parts = line.trim().split(" ");
  if (line.startsWith("    ")) {
    return `<span><span class="mtk1">&nbsp;&nbsp;&nbsp;&nbsp;${parts[0]}&nbsp;</span><span class="mtk16">${parts[1]}</span></span>`;
  }
  if (line.startsWith("  ")) {
    const leftPart = `<span class="mtk6">&nbsp;&nbsp;${parts[0]}&nbsp;</span>`;
    if (parts.length === 1)
      return `<span>${leftPart}</span>`;
    if (parts[1].startsWith('"http://') || parts[1].startsWith('"https://'))
      return `<span>${leftPart}<span class="mtk12 detected-link">${parts[1]}</span></span>`;
    if (parts[1].startsWith('"'))
      return `<span>${leftPart}<span class="mtk16">${parts[1]}</span></span>`;
    return `<span>${leftPart}<span class="mtk6">${parts[1]}</span></span>`;
  }
  return `<span class="mtk1">${line}&nbsp;</span>`;
}

// src/features/lockfile/index.ts
var BunLockfileEditorProvider = class {
  constructor(context) {
    this.context = context;
  }
  async openCustomDocument(uri, openContext, token) {
    const preview = await previewLockfile(uri, token);
    return {
      uri,
      preview,
      dispose() {
      }
    };
  }
  async resolveCustomEditor(document, webviewPanel, token) {
    const { preview } = document;
    webviewPanel.webview.options = {
      localResourceRoots: [this.context.extensionUri]
    };
    renderLockfile(webviewPanel, preview, this.context.extensionUri);
  }
};
function renderLockfile({ webview }, preview, extensionUri) {
  if (!getConfig("bunlockb.enabled")) {
    webview.html = "<code>bun.bunlockb</code> config option is disabled.";
    return;
  }
  const styleVSCodeUri = webview.asWebviewUri(vscode3.Uri.joinPath(extensionUri, "assets", "vscode.css"));
  const lockfileContent = styleLockfile(preview);
  const lineNumbers = [];
  for (let i = 0; i < lockfileContent.split("\n").length; i++) {
    lineNumbers.push(`<span class="line-number">${i + 1}</span>`);
  }
  webview.html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleVSCodeUri}" rel="stylesheet" />
  </head>
  <body>
    <div class="bunlock">
      <div class="lines">
        ${lineNumbers.join("\n")}
      </div>
      <code>${lockfileContent}</code>
    </div>
  </body>
</html>`;
}
function previewLockfile(uri, token) {
  return new Promise((resolve, reject) => {
    const process2 = (0, import_node_child_process2.spawn)("bun", [uri.fsPath], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    token?.onCancellationRequested(() => {
      process2.kill();
    });
    let stdout = "";
    process2.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    let stderr = "";
    process2.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    process2.on("error", (error) => {
      reject(error);
    });
    process2.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Bun exited with code: ${code}
${stderr}`));
      }
    });
  });
}
function registerBunlockEditor(context) {
  const viewType = "bun.lockb";
  const provider = new BunLockfileEditorProvider(context);
  context.subscriptions.push(
    vscode3.window.registerCustomEditorProvider(viewType, provider, {
      supportsMultipleEditorsPerDocument: true,
      webviewOptions: {
        enableFindWidget: true,
        retainContextWhenHidden: true
      }
    })
  );
}

// src/features/tasks/package.json.ts
var vscode5 = __toESM(require("vscode"));

// src/features/tasks/tasks.ts
var vscode4 = __toESM(require("vscode"));
var BunTask = class extends vscode4.Task {
  constructor({
    script,
    name,
    detail,
    execution,
    scope = vscode4.TaskScope.Workspace
  }) {
    super({ type: "bun", script }, scope, name, "bun", execution);
    this.detail = detail;
  }
};
function registerTaskProvider(context) {
  const taskProvider = {
    provideTasks: async () => await providePackageJsonTasks(),
    resolveTask: (task) => resolveTask(task)
  };
  context.subscriptions.push(vscode4.tasks.registerTaskProvider("bun", taskProvider));
}
function resolveTask(task) {
  const definition = task.definition;
  if (!definition.script)
    return task;
  const shellCommand = definition.script.startsWith("bun ") ? definition.script : `bun ${definition.script}`;
  const newTask = new vscode4.Task(
    definition,
    task.scope ?? vscode4.TaskScope.Workspace,
    task.name,
    "bun",
    new vscode4.ShellExecution(shellCommand)
  );
  newTask.detail = `${shellCommand} - tasks.json`;
  return newTask;
}

// src/features/tasks/package.json.ts
async function providePackageJsonTasks() {
  const scripts = await (async () => {
    try {
      const file = vscode5.Uri.file(vscode5.workspace.workspaceFolders[0]?.uri.fsPath + "/package.json");
      const contents = await vscode5.workspace.fs.readFile(file);
      return JSON.parse(contents.toString()).scripts;
    } catch {
      return null;
    }
  })();
  if (!scripts)
    return [];
  return Object.entries(scripts).map(([name, script]) => {
    const shellCommand = script.startsWith("bun run ") ? script : `bun run ${script}`;
    const task = new BunTask({
      script,
      name,
      detail: `${shellCommand} - package.json`,
      execution: new vscode5.ShellExecution(shellCommand)
    });
    return task;
  });
}
function registerPackageJsonProviders(context) {
  registerCodeLensProvider(context);
  registerHoverProvider(context);
}
function extractScriptsFromPackageJson(document) {
  const content = document.getText();
  const matches = content.match(/"scripts"\s*:\s*{([\s\S]*?)}/);
  if (!matches || matches.length < 2)
    return null;
  const startIndex = content.indexOf(matches[0]);
  const endIndex = startIndex + matches[0].length;
  const range = new vscode5.Range(document.positionAt(startIndex), document.positionAt(endIndex));
  const scripts = matches[1].split(/,\s*/).map((script) => {
    const elements = script.match(/"([^"\\]|\\.|\\\n)*"/g);
    if (elements?.length != 2)
      return null;
    const [name, command] = elements;
    return {
      name: name.replace('"', "").trim(),
      command: command.replace(/(?<!\\)"/g, "").trim(),
      range: new vscode5.Range(
        document.positionAt(startIndex + matches[0].indexOf(name)),
        document.positionAt(startIndex + matches[0].indexOf(name) + name.length + command.length)
      )
    };
  });
  return {
    range,
    scripts
  };
}
function registerCodeLensProvider(context) {
  context.subscriptions.push(
    // Register CodeLens provider for package.json files
    vscode5.languages.registerCodeLensProvider(
      {
        language: "json",
        scheme: "file",
        pattern: "**/package.json"
      },
      {
        provideCodeLenses(document) {
          const { range } = extractScriptsFromPackageJson(document);
          const codeLenses = [];
          codeLenses.push(
            new vscode5.CodeLens(range, {
              title: "$(breakpoints-view-icon) Bun: Debug",
              tooltip: "Debug a script using bun",
              command: "extension.bun.codelens.run",
              arguments: [{ type: "debug" }]
            }),
            new vscode5.CodeLens(range, {
              title: "$(debug-start) Bun: Run",
              tooltip: "Run a script using bun",
              command: "extension.bun.codelens.run",
              arguments: [{ type: "run" }]
            })
          );
          return codeLenses;
        },
        resolveCodeLens(codeLens) {
          return codeLens;
        }
      }
    ),
    // Register the commands that are executed when clicking the CodeLens buttons
    vscode5.commands.registerCommand("extension.bun.codelens.run", async ({ type }) => {
      const tasks3 = await vscode5.tasks.fetchTasks({ type: "bun" });
      if (tasks3.length === 0)
        return;
      const pick = await vscode5.window.showQuickPick(
        tasks3.filter((task2) => task2.detail.endsWith("package.json")).map((task2) => ({
          label: task2.name,
          detail: task2.detail
        }))
      );
      if (!pick)
        return;
      const task = tasks3.find((task2) => task2.name === pick.label);
      if (!task)
        return;
      const command = type === "debug" ? "extension.bun.codelens.debug.task" : "extension.bun.codelens.run.task";
      vscode5.commands.executeCommand(command, {
        script: task.definition.script,
        name: task.name
      });
    })
  );
}
function getActiveTerminal(name) {
  return vscode5.window.terminals.filter((terminal) => terminal.name === name);
}
function registerHoverProvider(context) {
  context.subscriptions.push(
    vscode5.languages.registerHoverProvider("json", {
      provideHover(document, position) {
        const { scripts } = extractScriptsFromPackageJson(document);
        return {
          contents: scripts.map((script) => {
            if (!script.range.contains(position))
              return null;
            const command = encodeURI(JSON.stringify({ script: script.command, name: script.name }));
            const markdownString = new vscode5.MarkdownString(
              `[Debug](command:extension.bun.codelens.debug.task?${command}) | [Run](command:extension.bun.codelens.run.task?${command})`
            );
            markdownString.isTrusted = true;
            return markdownString;
          })
        };
      }
    }),
    vscode5.commands.registerCommand("extension.bun.codelens.debug.task", async ({ script, name }) => {
      if (script.startsWith("bun run "))
        script = script.slice(8);
      if (script.startsWith("bun "))
        script = script.slice(4);
      debugCommand(script);
    }),
    vscode5.commands.registerCommand("extension.bun.codelens.run.task", async ({ script, name }) => {
      if (script.startsWith("bun run "))
        script = script.slice(8);
      name = `Bun Task: ${name}`;
      const terminals = getActiveTerminal(name);
      if (terminals.length > 0) {
        terminals[0].show();
        terminals[0].sendText(`bun run ${script}`);
        return;
      }
      const terminal = vscode5.window.createTerminal({ name });
      terminal.show();
      terminal.sendText(`bun run ${script}`);
    })
  );
}

// src/features/tests/index.ts
var vscode7 = __toESM(require("vscode"));

// src/features/tests/bun-test-controller.ts
var import_node_child_process3 = require("node:child_process");
var fs2 = __toESM(require("node:fs/promises"));
var path3 = __toESM(require("node:path"));
var vscode6 = __toESM(require("vscode"));
var DEFAULT_TEST_PATTERN = "**/*{.test.,.spec.,_test_,_spec_}{js,ts,tsx,jsx,mts,cts,cjs,mjs}";
var debug3 = vscode6.window.createOutputChannel("Bun - Test Runner");
var BunTestController = class {
  constructor(testController, workspaceFolder, isTest = false) {
    this.testController = testController;
    this.workspaceFolder = workspaceFolder;
    this.isTest = isTest;
    if (isTest)
      return;
    this.setupTestController();
    this.setupWatchers();
    this.setupOpenDocumentListener();
    this.discoverInitialTests();
    this.initializeSignal();
  }
  disposables = [];
  activeProcesses = /* @__PURE__ */ new Set();
  debugAdapter = null;
  signal = null;
  inspectorToVSCode = /* @__PURE__ */ new Map();
  vscodeToInspector = /* @__PURE__ */ new Map();
  testErrors = /* @__PURE__ */ new Map();
  lastStartedTestId = null;
  currentRun = null;
  testResultHistory = /* @__PURE__ */ new Map();
  currentRunType = "file";
  requestedTestIds = /* @__PURE__ */ new Set();
  discoveredTestIds = /* @__PURE__ */ new Set();
  executedTestCount = 0;
  totalTestsStarted = 0;
  async initializeSignal() {
    try {
      this.signal = await this.createSignal();
      await this.signal.ready;
      this.signal.on("Signal.Socket.connect", (socket) => {
        this.handleSocketConnection(socket, this.currentRun);
      });
      this.signal.on("Signal.error", (error) => {
        debug3.appendLine(`Signal error: ${error.message}`);
      });
    } catch (error) {
      debug3.appendLine(`Failed to initialize signal: ${error}`);
    }
  }
  setupTestController() {
    this.testController.resolveHandler = async (testItem) => {
      if (!testItem)
        return;
      return this.discoverTests(testItem);
    };
    this.testController.refreshHandler = async (token) => {
      const files = await this.discoverInitialTests(token, false);
      if (!files?.length)
        return;
      if (token.isCancellationRequested)
        return;
      const filePaths = new Set(files.map((f) => f.fsPath));
      for (const [, testItem] of this.testController.items) {
        if (testItem.uri && !filePaths.has(testItem.uri.fsPath)) {
          this.testController.items.delete(testItem.id);
        }
      }
    };
    this.testController.createRunProfile(
      "Run Test",
      vscode6.TestRunProfileKind.Run,
      (request, token) => this.runHandler(request, token, false),
      true
    );
    this.testController.createRunProfile(
      "Debug",
      vscode6.TestRunProfileKind.Debug,
      (request, token) => this.runHandler(request, token, true),
      true
    );
  }
  setupOpenDocumentListener() {
    vscode6.window.visibleTextEditors.forEach((editor) => {
      this.handleOpenDocument(editor.document);
    });
    vscode6.workspace.textDocuments.forEach((doc) => {
      this.handleOpenDocument(doc);
    });
    vscode6.workspace.onDidOpenTextDocument(this.handleOpenDocument.bind(this), null, this.disposables);
  }
  handleOpenDocument(document) {
    if (this.isTestFile(document) && !this.testController.items.get(windowsVscodeUri(document.uri.fsPath))) {
      this.discoverTests(false, windowsVscodeUri(document.uri.fsPath));
    }
  }
  isTestFile(document) {
    return document?.uri?.scheme === "file" && /\.(test|spec)\.(js|jsx|ts|tsx|cjs|mjs|mts|cts)$/.test(document.uri.fsPath);
  }
  async discoverInitialTests(cancellationToken, reset = true) {
    try {
      const tests2 = await this.findTestFiles(cancellationToken);
      this.createFileTestItems(tests2, reset);
      return tests2;
    } catch (error) {
      debug3.appendLine(`Error in discoverInitialTests: ${error}`);
      return void 0;
    }
  }
  customFilePattern() {
    return vscode6.workspace.getConfiguration("bun.test").get("filePattern", DEFAULT_TEST_PATTERN);
  }
  async findTestFiles(cancellationToken) {
    const ignoreGlobs = await this.buildIgnoreGlobs(cancellationToken);
    const tests2 = await vscode6.workspace.findFiles(
      this.customFilePattern(),
      "**/node_modules/**",
      // 5k tests is more than enough for most projects.
      // If they need more, they can manually open the files themself and it should be added to the test explorer.
      // This is needed because otherwise with too many tests, vscode OOMs.
      5e3,
      cancellationToken
    );
    return tests2.filter((test) => {
      const normalizedTestPath = test.fsPath.replace(/\\/g, "/");
      return !ignoreGlobs.some((glob) => {
        const normalizedGlob = glob.replace(/\\/g, "/").replace(/^\.\//, "");
        return normalizedTestPath.includes(normalizedGlob);
      });
    });
  }
  async buildIgnoreGlobs(cancellationToken) {
    const ignores = await vscode6.workspace.findFiles(
      "**/.gitignore",
      "**/node_modules/**",
      void 0,
      cancellationToken
    );
    const ignoreGlobs = /* @__PURE__ */ new Set(["**/node_modules/**"]);
    for (const ignore of ignores) {
      if (cancellationToken?.isCancellationRequested)
        return [];
      try {
        const content = await fs2.readFile(ignore.fsPath, { encoding: "utf8" });
        const lines = content.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
        const cwd = path3.relative(this.workspaceFolder.uri.fsPath, path3.dirname(ignore.fsPath));
        for (const line of lines) {
          if (!cwd || cwd === "" || cwd === ".") {
            ignoreGlobs.add(line.trim());
          } else {
            ignoreGlobs.add(path3.join(cwd.trim(), line.trim()));
          }
        }
      } catch {
        debug3.appendLine(`Error in buildIgnoreGlobs: ${ignore.fsPath}`);
      }
    }
    return [...ignoreGlobs.values()];
  }
  createFileTestItems(files, reset = true) {
    if (files.length === 0) {
      return;
    }
    for (const file of files) {
      let fileTestItem = this.testController.items.get(windowsVscodeUri(file.fsPath));
      if (!fileTestItem) {
        fileTestItem = this.testController.createTestItem(
          file.toString(),
          path3.relative(this.workspaceFolder.uri.fsPath, file.fsPath) || file.fsPath,
          file
        );
        if (reset) {
          fileTestItem.children.replace([]);
        }
        fileTestItem.canResolveChildren = true;
        this.testController.items.add(fileTestItem);
      }
    }
  }
  async setupWatchers() {
    const fileWatcher = vscode6.workspace.createFileSystemWatcher(
      new vscode6.RelativePattern(this.workspaceFolder, this.customFilePattern())
    );
    const refreshTestsForFile = (uri) => {
      if (uri.toString().includes("node_modules"))
        return;
      const existing = this.testController.items.get(windowsVscodeUri(uri.fsPath));
      if (existing) {
        existing.children.replace([]);
        this.discoverTests(existing);
      } else {
        this.discoverTests(false, uri.fsPath);
      }
    };
    fileWatcher.onDidChange(refreshTestsForFile);
    fileWatcher.onDidCreate(refreshTestsForFile);
    fileWatcher.onDidDelete((uri) => {
      const existing = this.testController.items.get(windowsVscodeUri(uri.fsPath));
      if (existing) {
        existing.children.replace([]);
        this.testController.items.delete(existing.id);
      }
    });
    this.disposables.push(fileWatcher);
  }
  getBunExecutionConfig() {
    const customFlag = vscode6.workspace.getConfiguration("bun.test").get("customFlag", "").trim();
    const customScriptSetting = vscode6.workspace.getConfiguration("bun.test").get("customScript", "bun test").trim();
    const customScript = customScriptSetting.length ? customScriptSetting : "bun test";
    const [cmd, ...args] = customScript.split(/\s+/);
    let bunCommand = "bun";
    if (cmd === "bun") {
      const bunRuntime = vscode6.workspace.getConfiguration("bun").get("runtime", "bun");
      bunCommand = bunRuntime || "bun";
    } else {
      bunCommand = cmd;
    }
    const testArgs = args.length ? args : ["test"];
    if (customFlag) {
      testArgs.push(customFlag);
    }
    return { bunCommand, testArgs };
  }
  async discoverTests(testItem, filePath, cancellationToken) {
    if (cancellationToken?.isCancellationRequested)
      return;
    let targetPath = filePath;
    if (!targetPath && testItem) {
      targetPath = testItem?.uri?.fsPath || this.workspaceFolder.uri.fsPath;
    }
    if (!targetPath) {
      return;
    }
    try {
      const fileContent = await fs2.readFile(targetPath, "utf8");
      const testNodes = this.parseTestBlocks(fileContent);
      const fileUri = vscode6.Uri.file(windowsVscodeUri(targetPath));
      let fileTestItem = testItem || this.testController.items.get(windowsVscodeUri(targetPath));
      if (!fileTestItem) {
        fileTestItem = this.testController.createTestItem(
          fileUri.toString(),
          path3.relative(this.workspaceFolder.uri.fsPath, targetPath),
          fileUri
        );
        this.testController.items.add(fileTestItem);
      }
      if (!this.currentRun) {
        fileTestItem.children.replace([]);
      }
      fileTestItem.canResolveChildren = false;
      this.addTestNodes(testNodes, fileTestItem, targetPath);
    } catch {
      debug3.appendLine(`Error in discoverTests: ${targetPath}`);
    }
  }
  parseTestBlocks(fileContent) {
    const cleanContent = fileContent.replace(/\/\*[\s\S]*?\*\//g, (match2) => match2.replace(/[^\n\r]/g, " ")).replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\/\/.*$/gm, (match2, str) => {
      if (str)
        return str;
      return " ".repeat(match2.length);
    });
    const testRegex = /\b(describe|test|it)(?:\.(?:skip|todo|failing|only|concurrent|serial))*(?:\.(?:if|todoIf|skipIf|failingIf|concurrentIf|serialIf)\s*\([^)]*\))?(?:\.each\s*\([^)]*\))?\s*\(\s*(['"`])((?:\\\2|.)*?)\2\s*(?:,|\))/g;
    const stack = [];
    const root = [];
    let match;
    match = testRegex.exec(cleanContent);
    while (match !== null) {
      const [full, type, , name] = match;
      const _type = type === "it" ? "test" : type;
      const line = cleanContent.slice(0, match.index).split("\n").length - 1;
      while (stack.length > 0 && match.index > stack[stack.length - 1].startIdx && this.getBraceDepth(cleanContent, stack[stack.length - 1].startIdx, match.index) <= 0) {
        stack.pop();
      }
      const expandedNodes = this.expandEachTests(
        full,
        name,
        cleanContent,
        match.index,
        _type,
        line
      );
      for (const node of expandedNodes) {
        if (stack.length === 0) {
          root.push(node);
        } else {
          stack[stack.length - 1].children.push(node);
        }
        if (type === "describe") {
          stack.push(node);
        }
      }
      match = testRegex.exec(cleanContent);
    }
    return root;
  }
  getBraceDepth(content, start, end) {
    const section = content.slice(start, end);
    let depth = 0;
    let inString = false;
    let inTemplate = false;
    let stringChar = "";
    let escaped = false;
    for (let i = 0; i < section.length; i++) {
      const char = section[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (!inTemplate && (char === '"' || char === "'")) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }
      if (char === "`") {
        inTemplate = !inTemplate;
        continue;
      }
      if (!inString && !inTemplate) {
        if (char === "{")
          depth++;
        else if (char === "}")
          depth--;
      }
    }
    return depth;
  }
  expandEachTests(fullMatch, name, content, index, type, line) {
    if (!fullMatch.includes(".each")) {
      return [
        {
          name: name.replace(/\\/g, ""),
          type,
          line,
          children: [],
          startIdx: index
        }
      ];
    }
    const eachMatch = content.slice(index).match(/\.each\s*\(\s*(\[[\s\S]*?\])\s*\)/);
    if (!eachMatch) {
      return [
        {
          name: name.replace(/\\/g, ""),
          type,
          line,
          children: [],
          startIdx: index
        }
      ];
    }
    const arrayString = eachMatch[1].replace(/,\s*(?=[\]\}])/g, "");
    try {
      const eachValues = JSON.parse(arrayString);
      if (!Array.isArray(eachValues)) {
        throw new Error("Not an array");
      }
      return eachValues.map((val, testIndex) => {
        let testName = name.replace(/%%/g, "%").replace(/%#/g, (testIndex + 1).toString());
        if (Array.isArray(val)) {
          let idx = 0;
          testName = testName.replace(/%[isfdojp#%]/g, () => {
            const v = val[idx++];
            return typeof v === "object" ? JSON.stringify(v) : String(v);
          });
        } else {
          testName = testName.replace(/%[isfdojp#%]/g, () => {
            return typeof val === "object" ? JSON.stringify(val) : String(val);
          });
        }
        return {
          name: testName,
          type,
          line,
          children: [],
          startIdx: index
        };
      });
    } catch {
      return [
        {
          name: name.replace(/\\/g, ""),
          type,
          line,
          children: [],
          startIdx: index
        }
      ];
    }
  }
  addTestNodes(nodes, parent, filePath, parentPath = "") {
    for (const node of nodes) {
      const nodePath = parentPath ? `${parentPath} > ${this.escapeTestName(node.name)}` : this.escapeTestName(node.name);
      const testId = `${filePath}#${nodePath}`;
      let testItem = parent.children.get(testId);
      if (!testItem) {
        testItem = this.testController.createTestItem(testId, this.stripAnsi(node.name), vscode6.Uri.file(filePath));
        if (node.type)
          testItem.tags = [new vscode6.TestTag(node.type)];
        if (typeof node.line === "number") {
          testItem.range = new vscode6.Range(
            new vscode6.Position(node.line, 0),
            new vscode6.Position(node.line, node.name.length)
          );
        }
        parent.children.add(testItem);
      }
      if (node.children.length > 0) {
        this.addTestNodes(node.children, testItem, filePath, nodePath);
      }
      testItem.canResolveChildren = false;
    }
  }
  stripAnsi(source) {
    return source.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g, "");
  }
  escapeTestName(source) {
    return source.replace(/[^\w \-\u0080-\uFFFF]/g, "\\$&");
  }
  async createSignal() {
    if (process.platform === "win32") {
      const port = await getAvailablePort();
      return new TCPSocketSignal(port);
    } else {
      return new UnixSignal();
    }
  }
  async runHandler(request, token, isDebug3) {
    if (this.currentRun) {
      this.closeAllActiveProcesses();
      this.disconnectInspector();
      if (this.currentRun) {
        this.currentRun.appendOutput("\n\x1B[33mCancelled: Starting new test run\x1B[0m\n");
        this.currentRun.end();
        this.currentRun = null;
      }
    }
    this.totalTestsStarted++;
    if (this.totalTestsStarted > 15) {
      this.closeAllActiveProcesses();
      this.disconnectInspector();
      this.signal?.close();
      this.signal = null;
    }
    const run = this.testController.createTestRun(request);
    token.onCancellationRequested(() => {
      run.end();
      this.closeAllActiveProcesses();
      this.disconnectInspector();
    });
    if ("onDidDispose" in run) {
      run.onDidDispose(() => {
        run?.end?.();
        this.closeAllActiveProcesses();
        this.disconnectInspector();
      });
    }
    const queue = [];
    if (request.include) {
      for (const test of request.include) {
        queue.push(test);
      }
    } else {
      for (const [, test] of this.testController.items) {
        queue.push(test);
      }
    }
    if (isDebug3) {
      await this.debugTests(queue, request, run);
      run.end();
      return;
    }
    try {
      await this.runTestsWithInspector(queue, run, token);
    } catch (error) {
      for (const test of queue) {
        const msg = new vscode6.TestMessage(`Error: ${error}`);
        msg.location = new vscode6.Location(test.uri, test.range || new vscode6.Range(0, 0, 0, 0));
        run.errored(test, msg);
      }
    } finally {
      run.end();
    }
  }
  async runTestsWithInspector(tests2, run, token) {
    const time = performance.now();
    if (token.isCancellationRequested)
      return;
    this.disconnectInspector();
    const allFiles = /* @__PURE__ */ new Set();
    for (const test of tests2) {
      if (!test.uri)
        continue;
      const filePath = windowsVscodeUri(test.uri.fsPath);
      allFiles.add(filePath);
    }
    if (allFiles.size === 0) {
      const errorMsg = "No test files found to run.";
      run.appendOutput(`\x1B[31mError: ${errorMsg}\x1B[0m
`);
      for (const test of tests2) {
        const msg = new vscode6.TestMessage(errorMsg);
        msg.location = new vscode6.Location(test.uri, test.range || new vscode6.Range(0, 0, 0, 0));
        run.errored(test, msg);
      }
      throw new Error(errorMsg);
    }
    for (const test of tests2) {
      if (token.isCancellationRequested)
        return;
      if (test.uri && test.canResolveChildren) {
        await this.discoverTests(test, void 0, token);
      }
    }
    const isIndividualTestRun = this.shouldUseTestNamePattern(tests2);
    this.currentRunType = isIndividualTestRun ? "individual" : "file";
    this.requestedTestIds.clear();
    this.discoveredTestIds.clear();
    this.executedTestCount = 0;
    for (const test of tests2) {
      this.requestedTestIds.add(test.id);
    }
    if (!this.signal) {
      await this.initializeSignal();
      if (!this.signal) {
        throw new Error("Failed to initialize signal");
      }
    }
    this.currentRun = run;
    const socketPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for Bun to connect"));
      }, 1e4);
      const handleConnect = () => {
        clearTimeout(timeout);
        resolve();
      };
      const handleCancel = () => {
        clearTimeout(timeout);
        this.signal.off("Signal.Socket.connect", handleConnect);
        reject(new Error("Test run cancelled"));
      };
      token.onCancellationRequested(handleCancel);
      this.signal.once("Signal.Socket.connect", handleConnect);
    });
    const { bunCommand, testArgs } = this.getBunExecutionConfig();
    let args = [...testArgs, ...allFiles];
    let printedArgs = `\x1B[34;1m>\x1B[0m \x1B[34;1m${bunCommand} ${testArgs.join(" ")}\x1B[2m`;
    for (const file of allFiles) {
      const f = path3.relative(this.workspaceFolder.uri.fsPath, file) || file;
      if (f.includes(" ")) {
        printedArgs += ` ".${path3.sep}${f}"`;
      } else {
        printedArgs += ` .${path3.sep}${f}`;
      }
    }
    if (isIndividualTestRun) {
      const pattern = this.buildTestNamePattern(tests2);
      if (pattern) {
        args.push("--test-name-pattern", pattern);
        printedArgs += `\x1B[0m\x1B[2m --test-name-pattern "${pattern}"\x1B[0m`;
      }
    }
    run.appendOutput(printedArgs + "\x1B[0m\r\n\r\n");
    for (const test of tests2) {
      if (isIndividualTestRun || tests2.length === 1) {
        run.started(test);
      } else {
        run.enqueued(test);
      }
    }
    let inspectorUrl = this.signal.url.startsWith("ws") || this.signal.url.startsWith("tcp") ? `${this.signal.url}?wait=1` : `${this.signal.url}`;
    if (!inspectorUrl?.includes("?wait=1")) {
      args.push(`--inspect-wait=${this.signal.url}`);
      inspectorUrl = void 0;
    }
    const proc = (0, import_node_child_process3.spawn)(bunCommand, args, {
      cwd: this.workspaceFolder.uri.fsPath,
      env: {
        BUN_DEBUG_QUIET_LOGS: "1",
        FORCE_COLOR: "1",
        BUN_INSPECT: inspectorUrl,
        ...process.env
      }
    });
    this.activeProcesses.add(proc);
    let stdout = "";
    proc.on("exit", (code, signal) => {
      if (code !== 0 && code !== 1) {
        debug3.appendLine(`Test process failed: exit ${code}, signal ${signal}`);
      }
    });
    proc.on("error", (error) => {
      stdout += `Process error: ${error.message}
`;
      debug3.appendLine(`Process error: ${error.message}`);
    });
    proc.stdout?.on("data", (data) => {
      const dataStr = data.toString();
      stdout += dataStr;
      const formattedOutput = dataStr.replace(/\n/g, "\r\n");
      run.appendOutput(formattedOutput);
    });
    proc.stderr?.on("data", (data) => {
      const dataStr = data.toString();
      stdout += dataStr;
      const formattedOutput = dataStr.replace(/\n/g, "\r\n");
      run.appendOutput(formattedOutput);
    });
    try {
      await socketPromise;
    } catch (error) {
      debug3.appendLine(`Connection failed: ${error} (URL: ${this.signal.url})`);
      throw error;
    }
    await new Promise((resolve, reject) => {
      const handleClose = (code) => {
        this.activeProcesses.delete(proc);
        if (code === 0 || code === 1) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}. Please check the console for more details.`));
        }
      };
      const handleError = (error) => {
        this.activeProcesses.delete(proc);
        reject(error);
      };
      const handleCancel = () => {
        proc.kill("SIGTERM");
        this.activeProcesses.delete(proc);
        reject(new Error("Test run cancelled"));
      };
      proc.on("close", handleClose);
      proc.on("error", handleError);
      token.onCancellationRequested(handleCancel);
    }).finally(() => {
      if (this.discoveredTestIds.size === 0) {
        const errorMsg = "No tests were executed. This could mean:\r\n- All tests were filtered out\r\n- The test runner crashed before running tests\r\n- No tests match the pattern";
        run.appendOutput(`
\x1B[31m\x1B[1mError:\x1B[0m\x1B[31m ${errorMsg}\x1B[0m
`);
        for (const test of tests2) {
          if (!this.testResultHistory.has(test.id)) {
            const msg = new vscode6.TestMessage(errorMsg + "\n\n----------\n" + stdout + "\n----------\n");
            msg.location = new vscode6.Location(test.uri, test.range || new vscode6.Range(0, 0, 0, 0));
            run.errored(test, msg);
          }
        }
      }
      if (this.discoveredTestIds.size > 0 && this.executedTestCount > 0) {
        if (isIndividualTestRun) {
          this.applyPreviousResults(tests2, run);
          this.cleanupUndiscoveredTests(tests2);
        } else {
          this.cleanupStaleTests(tests2);
        }
      }
      if (this.activeProcesses.has(proc)) {
        proc.kill("SIGKILL");
        this.activeProcesses.delete(proc);
      }
      this.disconnectInspector();
      this.currentRun = null;
      debug3.appendLine(`Test run completed in ${performance.now() - time}ms`);
    });
  }
  applyPreviousResults(requestedTests, run) {
    for (const file of new Set(requestedTests.map((t) => t.uri?.toString()).filter(Boolean))) {
      const fileItem = this.testController.items.get(file);
      if (fileItem) {
        this.applyPreviousResultsToItem(fileItem, run, this.requestedTestIds);
      }
    }
  }
  applyPreviousResultsToItem(item, run, requestedTestIds) {
    if (!requestedTestIds.has(item.id)) {
      const previousResult = this.testResultHistory.get(item.id);
      if (previousResult) {
        switch (previousResult.status) {
          case "passed":
            run.passed(item, previousResult.duration);
            break;
          case "failed":
            run.failed(item, [], previousResult.duration);
            break;
          case "skipped":
            run.skipped(item);
            break;
        }
      }
    }
    for (const [, child] of item.children) {
      this.applyPreviousResultsToItem(child, run, requestedTestIds);
    }
  }
  async handleSocketConnection(socket, run) {
    if (this.debugAdapter) {
      this.debugAdapter.close();
      this.debugAdapter = null;
    }
    this.debugAdapter = new NodeSocketDebugAdapter(socket);
    this.debugAdapter.on("TestReporter.found", (event) => {
      this.handleTestFound(event, run);
    });
    this.debugAdapter.on("TestReporter.start", (event) => {
      this.handleTestStart(event, run);
    });
    this.debugAdapter.on("TestReporter.end", (event) => {
      this.handleTestEnd(event, run);
    });
    this.debugAdapter.on("LifecycleReporter.error", (event) => {
      this.handleLifecycleError(event, run);
    });
    this.debugAdapter.on("Inspector.error", (e) => {
      debug3.appendLine(`Inspector error: ${e}`);
    });
    socket.on("close", () => {
      this.debugAdapter = null;
    });
    const ok = await this.debugAdapter.start();
    if (!ok) {
      throw new Error("Failed to start debug adapter");
    }
    this.debugAdapter.initialize({
      adapterID: "bun-vsc-test-runner",
      pathFormat: "path",
      linesStartAt1: true,
      columnsStartAt1: true,
      supportsConfigurationDoneRequest: false,
      enableDebugger: false,
      enableLifecycleAgentReporter: true,
      enableTestReporter: true,
      enableConsole: false,
      sendImmediatePreventExit: false
    });
  }
  handleTestFound(params, _run) {
    const { id: inspectorTestId, url: sourceURL, name, type, parentId, line } = params;
    if (!sourceURL) {
      return;
    }
    const filePath = windowsVscodeUri(sourceURL);
    let testItem = this.findTestByPath(name, filePath, parentId);
    if (!testItem && type) {
      testItem = this.createTestItem(name, filePath, type, parentId, line);
    }
    if (testItem) {
      this.inspectorToVSCode.set(inspectorTestId, testItem);
      this.vscodeToInspector.set(testItem.id, inspectorTestId);
      this.discoveredTestIds.add(testItem.id);
    }
  }
  findTestByPath(testName, filePath, parentId) {
    const fileUri = vscode6.Uri.file(filePath);
    const fileTestItem = this.testController.items.get(fileUri.toString());
    if (!fileTestItem) {
      return void 0;
    }
    let searchRoot = fileTestItem;
    if (parentId !== void 0) {
      const parentItem = this.inspectorToVSCode.get(parentId);
      if (parentItem) {
        searchRoot = parentItem;
      }
    }
    return this.findTestByName(searchRoot, testName);
  }
  findTestByName(parent, name) {
    const strippedName = this.stripAnsi(name);
    for (const [, child] of parent.children) {
      if (child.label === strippedName) {
        return child;
      }
    }
    const escapedName = this.escapeTestName(strippedName);
    for (const [, child] of parent.children) {
      if (child.label === escapedName || this.escapeTestName(child.label) === escapedName) {
        return child;
      }
    }
    for (const [, child] of parent.children) {
      const found = this.findTestByName(child, name);
      if (found) {
        return found;
      }
    }
    return void 0;
  }
  createTestItem(name, filePath, type, parentId, line) {
    const fileUri = vscode6.Uri.file(filePath);
    let fileTestItem = this.testController.items.get(fileUri.toString());
    if (!fileTestItem) {
      fileTestItem = this.testController.createTestItem(
        fileUri.toString(),
        path3.relative(this.workspaceFolder.uri.fsPath, filePath) || filePath,
        fileUri
      );
      this.testController.items.add(fileTestItem);
    }
    let parentItem = fileTestItem;
    if (parentId !== void 0) {
      const parent = this.inspectorToVSCode.get(parentId);
      if (parent) {
        parentItem = parent;
      }
    }
    const parentPath = parentItem === fileTestItem ? "" : parentItem.id.split("#")[1] || "";
    const testPath = parentPath ? `${parentPath} > ${this.escapeTestName(name)}` : this.escapeTestName(name);
    const testId = `${filePath}#${testPath}`;
    const existing = this.findTestByName(parentItem, name);
    if (existing) {
      return existing;
    }
    const testItem = this.testController.createTestItem(testId, this.stripAnsi(name), fileUri);
    testItem.tags = [new vscode6.TestTag(type)];
    testItem.canResolveChildren = false;
    if (typeof line === "number" && line > 0) {
      testItem.range = new vscode6.Range(new vscode6.Position(line - 1, 0), new vscode6.Position(line - 1, name.length));
    }
    parentItem.children.add(testItem);
    return testItem;
  }
  handleTestStart(params, run) {
    const { id: testId } = params;
    const testItem = this.inspectorToVSCode.get(testId);
    this.lastStartedTestId = testId;
    if (testItem) {
      run.started(testItem);
    }
  }
  handleTestEnd(params, run) {
    const { id, status, elapsed } = params;
    const testItem = this.inspectorToVSCode.get(id);
    if (!testItem)
      return;
    const duration = elapsed / 1e6;
    this.executedTestCount++;
    if (this.currentRunType === "individual" && status === "skipped_because_label" && !this.requestedTestIds.has(testItem.id)) {
      return;
    }
    switch (status) {
      case "pass":
        run.passed(testItem, duration);
        this.testResultHistory.set(testItem.id, { status: "passed", duration });
        break;
      case "fail":
        const errorInfo = this.testErrors.get(id);
        if (errorInfo) {
          const errorMessage = this.createErrorMessage(errorInfo, testItem);
          run.failed(testItem, errorMessage, duration);
          this.testResultHistory.set(testItem.id, { status: "failed", message: errorMessage, duration });
        } else {
          const message = new vscode6.TestMessage(`Test "${testItem.label}" failed - check output for details`);
          run.failed(testItem, message, duration);
          this.testResultHistory.set(testItem.id, { status: "failed", message, duration });
        }
        break;
      case "skip":
      case "todo":
        run.skipped(testItem);
        this.testResultHistory.set(testItem.id, { status: "skipped" });
        break;
      case "timeout":
        const timeoutMsg = new vscode6.TestMessage(
          duration > 0 ? `Test timed out after ${duration.toFixed(0)}ms` : "Test timed out"
        );
        run.failed(testItem, timeoutMsg, duration);
        this.testResultHistory.set(testItem.id, { status: "failed", message: timeoutMsg, duration });
        break;
      case "skipped_because_label":
        break;
    }
  }
  handleLifecycleError(params, _run) {
    const { message, urls, lineColumns } = params;
    if (!urls || urls.length === 0 || !urls[0]) {
      return;
    }
    const filePath = windowsVscodeUri(urls[0]);
    const line = lineColumns && lineColumns.length > 0 ? lineColumns[0] : 1;
    const column = lineColumns && lineColumns.length > 1 ? lineColumns[1] : 1;
    const errorInfo = {
      message,
      file: filePath,
      line,
      column
    };
    if (this.lastStartedTestId !== null) {
      this.testErrors.set(this.lastStartedTestId, errorInfo);
    }
  }
  cleanupUndiscoveredTests(requestedTests) {
    if (this.currentRunType !== "individual" || this.discoveredTestIds.size === 0) {
      return;
    }
    const filesToCheck = /* @__PURE__ */ new Set();
    for (const test of requestedTests) {
      if (test.uri) {
        filesToCheck.add(test.uri.toString());
      }
    }
    for (const fileUri of filesToCheck) {
      const fileItem = this.testController.items.get(fileUri);
      if (fileItem) {
        this.cleanupTestItem(fileItem);
      }
    }
  }
  cleanupTestItem(item) {
    const childrenToRemove = [];
    for (const [, child] of item.children) {
      if (!this.discoveredTestIds.has(child.id)) {
        childrenToRemove.push(child);
      } else {
        this.cleanupTestItem(child);
      }
    }
    for (const child of childrenToRemove) {
      item.children.delete(child.id);
    }
  }
  cleanupStaleTests(requestedTests) {
    if (this.discoveredTestIds.size === 0) {
      return;
    }
    const filesToCheck = /* @__PURE__ */ new Set();
    for (const test of requestedTests) {
      if (test.uri) {
        filesToCheck.add(test.uri.toString());
      }
    }
    for (const fileUri of filesToCheck) {
      const fileItem = this.testController.items.get(fileUri);
      if (fileItem) {
        const hasTestsInThisFile = Array.from(this.discoveredTestIds).some(
          (id) => id.startsWith(fileItem.uri?.fsPath || "")
        );
        if (hasTestsInThisFile) {
          this.cleanupTestItem(fileItem);
        }
      }
    }
  }
  createErrorMessage(errorInfo, _testItem) {
    const cleanMessage = errorInfo.message.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRFZcf-nqry=><]/g,
      ""
    );
    const errorMessage = this.processErrorData(
      cleanMessage,
      new vscode6.Location(
        vscode6.Uri.file(errorInfo.file),
        new vscode6.Position(errorInfo.line - 1, errorInfo.column - 1)
      )
    );
    return errorMessage;
  }
  processErrorData(message, location) {
    const messageLinesRaw = message.split("\n");
    const lines = messageLinesRaw;
    const errorLine = lines[0].trim();
    const messageLines = lines.slice(1).filter((line) => line.trim()).join("\n");
    const errorType = errorLine.replace(/^(E|e)rror: /, "").trim();
    switch (errorType) {
      case "expect(received).toMatchInlineSnapshot(expected)":
      case "expect(received).toMatchSnapshot(expected)":
      case "expect(received).toEqual(expected)":
      case "expect(received).toBe(expected)": {
        const regex = /^Expected:\s*([\s\S]*?)\nReceived:\s*([\s\S]*?)$/;
        let testMessage2 = vscode6.TestMessage.diff(
          errorLine,
          messageLines.trim().match(regex)?.[1].trim() || "",
          messageLines.trim().match(regex)?.[2].trim() || ""
        );
        if (!messageLines.match(regex)) {
          const code = messageLines.replace(/(?:\r?\n)+(- Expected\s+- \d+|\+ Received\s+\+ \d+)\s*$/g, "").replace(/(?:\r?\n)+(- Expected\s+- \d+|\+ Received\s+\+ \d+)\s*$/g, "").trim();
          testMessage2 = new vscode6.TestMessage(
            new vscode6.MarkdownString("Values did not match:\n").appendCodeblock(code, "diff")
          );
        }
        testMessage2.location = location;
        return testMessage2;
      }
      case "expect(received).toBeInstanceOf(expected)": {
        const regex = /^Expected constructor:\s*([\s\S]*?)\nReceived value:\s*([\s\S]*?)$/;
        let testMessage2 = vscode6.TestMessage.diff(
          errorLine,
          messageLines.match(regex)?.[1].trim() || "",
          messageLines.match(regex)?.[2].trim() || ""
        );
        if (!messageLines.match(regex)) {
          testMessage2 = new vscode6.TestMessage(messageLines);
        }
        testMessage2.location = location;
        return testMessage2;
      }
      case "expect(received).not.toBe(expected)":
      case "expect(received).not.toEqual(expected)": {
        const testMessage2 = new vscode6.TestMessage(messageLines);
        testMessage2.location = location;
        return testMessage2;
      }
      case "expect(received).toBeNull()": {
        const actualValue = messageLines.replace("Received:", "").trim();
        const testMessage2 = vscode6.TestMessage.diff(errorLine, "null", actualValue);
        testMessage2.location = location;
        return testMessage2;
      }
      case "expect(received).toMatchObject(expected)": {
        const line = messageLines.replace(/(?:\r?\n)+(- Expected\s+- \d+|\+ Received\s+\+ \d+)\s*$/g, "").replace(/(?:\r?\n)+(- Expected\s+- \d+|\+ Received\s+\+ \d+)\s*$/g, "");
        const formatted = new vscode6.MarkdownString("Values did not match:");
        formatted.appendCodeblock(line, "diff");
        const testMessage2 = new vscode6.TestMessage(formatted);
        testMessage2.location = location;
        return testMessage2;
      }
    }
    let lastEffortMsg = messageLines.split("\n");
    const lastLine = lastEffortMsg?.at(-1);
    if (lastLine?.startsWith("Received ") || lastLine?.startsWith("Received: ")) {
      lastEffortMsg = lastEffortMsg.reverse();
    }
    const msg = errorType.startsWith("expect") ? `${lastEffortMsg.join("\n")}
${errorLine.trim()}`.trim() : `${errorLine.trim()}
${messageLines}`.trim();
    const testMessage = new vscode6.TestMessage(msg);
    testMessage.location = location;
    return testMessage;
  }
  shouldUseTestNamePattern(tests2) {
    const testUriString = tests2[0]?.uri?.toString();
    const testIdEndsWithFileName = tests2[0]?.uri && tests2[0].label === tests2[0].uri.fsPath.split("/").pop();
    const isFileOnly = tests2.length === 1 && tests2[0].uri && (testIdEndsWithFileName || !tests2[0].id.includes("#") || tests2[0].id === testUriString);
    function hasManyTests() {
      if (tests2.length === 0)
        return false;
      let current = tests2[0];
      while (current.parent) {
        if (current.parent.children.size > 1) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }
    return !isFileOnly && hasManyTests();
  }
  buildTestNamePattern(tests2) {
    const testNames = [];
    for (const test of tests2) {
      if (!test.id.includes("#")) {
        continue;
      }
      let t = test.id.slice(test.id.indexOf("#") + 1).split(" > ").join(" ");
      t = t.replaceAll(/\$\{[^}]+\}/g, ".*?");
      t = t.replaceAll(/\\\$\\\{[^}]+\\\}/g, ".*?");
      t = t.replaceAll(/\\%[isfdojp#%]|(\\%)|(\\#)/g, ".*?");
      t = t.replaceAll(/\$[\w\.\[\]]+/g, ".*?");
      if (test?.tags?.some((tag) => tag.id === "test" || tag.id === "it")) {
        testNames.push(`^ ?${t}$`);
      } else if (test?.tags?.some((tag) => tag.id === "describe")) {
        testNames.push(`^ ?${t} `);
      } else {
        testNames.push(t);
      }
    }
    if (testNames.length === 0) {
      return null;
    }
    return testNames.map((e) => `(${e})`).join("|");
  }
  disconnectInspector() {
    if (this.debugAdapter) {
      this.debugAdapter.close();
      this.debugAdapter = null;
    }
    this.inspectorToVSCode.clear();
    this.vscodeToInspector.clear();
    this.requestedTestIds.clear();
  }
  async debugTests(tests2, _request, run) {
    const testFiles = /* @__PURE__ */ new Set();
    for (const test of tests2) {
      if (test.uri) {
        testFiles.add(test.uri.fsPath);
      }
    }
    const isIndividualTestRun = this.shouldUseTestNamePattern(tests2);
    if (testFiles.size === 0) {
      const errorMsg = "No test files found to debug.";
      run.appendOutput(`\x1B[31mError: ${errorMsg}\x1B[0m
`);
      for (const test of tests2) {
        const msg = new vscode6.TestMessage(errorMsg);
        msg.location = new vscode6.Location(test.uri, test.range || new vscode6.Range(0, 0, 0, 0));
        run.errored(test, msg);
      }
      run.end();
      return;
    }
    const { bunCommand, testArgs } = this.getBunExecutionConfig();
    const args = [bunCommand, ...testArgs, ...testFiles];
    if (!isIndividualTestRun) {
      args.push("--inspect-brk");
    } else {
      const breakpoints = [];
      for (const test of tests2) {
        if (test.uri) {
          breakpoints.push(
            new vscode6.SourceBreakpoint(
              new vscode6.Location(test.uri, new vscode6.Position((test.range?.end.line ?? 0) + 1, 0)),
              true
            )
          );
        }
      }
      vscode6.debug.addBreakpoints(breakpoints);
      const pattern = this.buildTestNamePattern(tests2);
      if (pattern) {
        args.push("--test-name-pattern", pattern);
      }
    }
    const debugConfiguration = {
      args: args.slice(2),
      console: "integratedTerminal",
      cwd: "${workspaceFolder}",
      internalConsoleOptions: "neverOpen",
      name: "Bun Test Debug",
      program: args.at(1),
      request: "launch",
      runtime: args.at(0),
      type: "bun"
    };
    try {
      const res = await vscode6.debug.startDebugging(this.workspaceFolder, debugConfiguration);
      if (!res)
        throw new Error("Failed to start debugging session");
    } catch (error) {
      for (const test of tests2) {
        const msg = new vscode6.TestMessage(`Error starting debugger: ${error}`);
        msg.location = new vscode6.Location(test.uri, test.range || new vscode6.Range(0, 0, 0, 0));
        run.errored(test, msg);
      }
    }
    run.appendOutput("\n\x1B[33mDebug session started. Please open the debug console to see its output.\x1B[0m\r\n");
    run.end();
  }
  closeAllActiveProcesses() {
    for (const p of this.activeProcesses) {
      p.kill();
    }
    this.activeProcesses.clear();
  }
  dispose() {
    this.closeAllActiveProcesses();
    if (this.signal) {
      this.signal.close();
      this.signal.removeAllListeners();
      this.signal = null;
    }
    if (this.debugAdapter) {
      this.debugAdapter.close();
      this.debugAdapter = null;
    }
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
  // a sus way to expose internal functions to the test suite
  get _internal() {
    return {
      expandEachTests: this.expandEachTests.bind(this),
      parseTestBlocks: this.parseTestBlocks.bind(this),
      getBraceDepth: this.getBraceDepth.bind(this),
      buildTestNamePattern: this.buildTestNamePattern.bind(this),
      stripAnsi: this.stripAnsi.bind(this),
      processErrorData: this.processErrorData.bind(this),
      escapeTestName: this.escapeTestName.bind(this),
      shouldUseTestNamePattern: this.shouldUseTestNamePattern.bind(this),
      isTestFile: this.isTestFile.bind(this),
      customFilePattern: this.customFilePattern.bind(this),
      getBunExecutionConfig: this.getBunExecutionConfig.bind(this),
      findTestByPath: this.findTestByPath.bind(this),
      findTestByName: this.findTestByName.bind(this),
      createTestItem: this.createTestItem.bind(this),
      createErrorMessage: this.createErrorMessage.bind(this),
      cleanupTestItem: this.cleanupTestItem.bind(this)
    };
  }
};
function windowsVscodeUri(uri) {
  return process.platform === "win32" ? uri.replace("c:\\", "C:\\") : uri;
}

// src/features/tests/index.ts
async function registerTests(context) {
  const workspaceFolder = (vscode7.workspace.workspaceFolders || [])[0];
  if (!workspaceFolder) {
    return;
  }
  const config = vscode7.workspace.getConfiguration("bun.test");
  const enable = config.get("enable", true);
  if (!enable) {
    return;
  }
  try {
    const controller = vscode7.tests.createTestController("bun", "Bun Tests");
    context.subscriptions.push(controller);
    const bunTestController = new BunTestController(controller, workspaceFolder);
    context.subscriptions.push(bunTestController);
  } catch (error) {
    debug3.appendLine(`Error initializing Bun Test Controller: ${error}`);
    vscode7.window.showErrorMessage(
      "Failed to initialize Bun Test Explorer. You may need to update VS Code to version 1.59 or later."
    );
  }
}

// src/extension.ts
async function runUnsavedCode() {
  const editor = vscode8.window.activeTextEditor;
  if (!editor || !editor.document.isUntitled) {
    return;
  }
  const document = editor.document;
  if (!["javascript", "typescript", "javascriptreact", "typescriptreact"].includes(document.languageId)) {
    return;
  }
  const code = document.getText();
  const cwd = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
  const untitledName = `untitled:${document.uri.path}`;
  await vscode8.debug.startDebugging(
    void 0,
    {
      type: "bun",
      name: "Run Unsaved Code",
      request: "launch",
      program: "-",
      // Special flag to indicate stdin input
      __code: code,
      // Pass the code through configuration
      __untitledName: untitledName,
      // Pass the untitled document name
      cwd
      // Pass the current working directory
    },
    {
      suppressSaveBeforeStart: true
      // This prevents the save dialog
    }
  );
}
function activate(context) {
  registerBunlockEditor(context);
  registerDebugger(context);
  registerTaskProvider(context);
  registerPackageJsonProviders(context);
  registerDiagnosticsSocket(context);
  registerTests(context);
  context.subscriptions.push(vscode8.commands.registerTextEditorCommand("extension.bun.runUnsavedCode", runUnsavedCode));
}
function getConfig(path4, scope) {
  return vscode8.workspace.getConfiguration("bun", scope).get(path4);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  getConfig
});
//# sourceMappingURL=extension.js.map
