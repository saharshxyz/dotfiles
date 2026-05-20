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
exports.QuoteFixer = void 0;
exports.fixQuotes = fixQuotes;
const vscode = __importStar(require("vscode"));
const utils_1 = require("../utils/utils");
/**
 * Regular expression that captures straight double-quoted substrings for replacement.
 */
const QUOTE_PATTERN = /"([^"]*)"/g;
/**
 * Transform straight double quotes into LaTeX-style quotes
 */
class QuoteFixer {
    /**
     * Generate a list of TextEdits to replace straight quotes with LaTeX-style quotes,
     * supporting both standard ("...") and German („...“) quotes.
     *
     * @param text The content to process.
     * @returns An array of TextEdits.
     */
    getEdits(text) {
        // 1. Strip comments and verbatim content
        const stripped = (0, utils_1.stripCommentsAndVerbatim)(text);
        const strippedLines = stripped.split('\n');
        const edits = [];
        for (let i = 0; i < strippedLines.length; i++) {
            const sLine = strippedLines[i];
            if (!sLine || sLine.trim() === '') {
                continue;
            }
            let match;
            // Handle German quotes „...“
            // Regex for German quotes: „ followed by anything until “
            const germanQuotePattern = /„([^“]*)“/g;
            while ((match = germanQuotePattern.exec(sLine)) !== null) {
                const index = match.index;
                const fullMatch = match[0];
                const content = match[1];
                // Replace opening quote „
                const startRange = new vscode.Range(i, index, i, index + 1);
                edits.push(vscode.TextEdit.replace(startRange, '``'));
                // Replace closing quote “
                const endRange = new vscode.Range(i, index + 1 + content.length, i, index + fullMatch.length);
                edits.push(vscode.TextEdit.replace(endRange, "''"));
            }
            // Handle standard quotes "..."
            QUOTE_PATTERN.lastIndex = 0;
            while ((match = QUOTE_PATTERN.exec(sLine)) !== null) {
                const index = match.index;
                const fullMatch = match[0];
                const content = match[1];
                // Replace opening quote "
                const startRange = new vscode.Range(i, index, i, index + 1);
                edits.push(vscode.TextEdit.replace(startRange, '``'));
                // Replace closing quote "
                const endRange = new vscode.Range(i, index + 1 + content.length, i, index + fullMatch.length);
                edits.push(vscode.TextEdit.replace(endRange, "''"));
            }
        }
        return edits;
    }
}
exports.QuoteFixer = QuoteFixer;
/**
 * Apply LaTeX quote normalization based on the user configuration.
 *
 * @param document The document being edited.
 * @param range The range covered by the edit, or `undefined` to process the entire document.
 * @returns A list of TextEdits.
 */
function fixQuotes(document, range) {
    const config = vscode.workspace.getConfiguration('latex-workshop', document.uri);
    const enabled = config.get('format.fixQuotes.enabled', false);
    if (!enabled) {
        return [];
    }
    const quoteFixer = new QuoteFixer();
    const targetRange = range ?? new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE);
    const text = document.getText(); // Get full text to ensure correct line numbers
    return quoteFixer.getEdits(text).filter(e => targetRange.contains(e.range));
}
//# sourceMappingURL=quote-fixer.js.map