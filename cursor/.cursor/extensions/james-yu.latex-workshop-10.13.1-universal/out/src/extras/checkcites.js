"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCitations = checkCitations;
const vscode = __importStar(require("vscode"));
const os_1 = require("os");
const lw_1 = require("../lw");
const path = __importStar(require("path"));
const logger = lw_1.lw.log('Citations', 'Linter');
function checkCitations() {
    logger.log('Checking citations.');
    const rootPath = lw_1.lw.root.file.path;
    const scope = rootPath ? lw_1.lw.file.toUri(rootPath) : undefined;
    const configuration = vscode.workspace.getConfiguration('latex-workshop', scope);
    const aux = lw_1.lw.root.file.path?.replace(/\.tex$/, '.aux');
    const auxDir = path.join(path.dirname(aux || ''), path.normalize(configuration.get('latex.outDir')));
    const auxBaseName = aux ? path.basename(aux) : '';
    const auxFile = aux ? path.join(auxDir, auxBaseName) : undefined;
    if (!auxFile) {
        logger.log('No aux file found.');
        return [];
    }
    const { stdout, error } = lw_1.lw.external.sync('checkcites', ['-u', auxFile], {
        cwd: lw_1.lw.root.dir.path,
    });
    if (error) {
        logger.logError('Error checking citations.', error);
        return [];
    }
    const result = stdout
        .toString()
        .split(os_1.EOL)
        .filter(l => l.startsWith('=>'))
        .map(l => l.slice(2).trim());
    logger.log(`Found ${result.length} unused citation(s).`);
    return result;
}
//# sourceMappingURL=checkcites.js.map