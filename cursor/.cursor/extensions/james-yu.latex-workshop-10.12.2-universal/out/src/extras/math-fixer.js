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
exports.MathFixer = void 0;
exports.fixMath = fixMath;
const vscode = __importStar(require("vscode"));
const utils_1 = require("../utils/utils");
/**
 * Represent the type of math environment we are currently in.
 */
var MathMode;
(function (MathMode) {
    MathMode[MathMode["Inline"] = 0] = "Inline";
    MathMode[MathMode["Display"] = 1] = "Display";
})(MathMode || (MathMode = {}));
/**
 * Transform inline math delimiters $ ... $ into \( ... \) and
 * display math delimiters $$ ... $$ into \[ ... \].
 */
class MathFixer {
    constructor() {
        // Regex to find tokens: escaped char, display math, or inline math.
        // Group 1: Escaped char (e.g. \$)
        // Group 2: Display math ($$)
        // Group 3: Inline math ($)
        this.tokenPattern = /(\\.)|(\$\$)|(\$)/g;
    }
    /**
     * Generate a list of TextEdits to transform math delimiters.
     *
     * @param text - The content to process.
     * @returns An array of TextEdits.
     */
    getEdits(text) {
        const stripped = (0, utils_1.stripCommentsAndVerbatim)(text);
        const strippedLines = stripped.split('\n');
        const mathStack = [];
        const edits = [];
        for (let i = 0; i < strippedLines.length; i++) {
            const sLine = strippedLines[i];
            if (!sLine || sLine.trim() === '') {
                continue;
            }
            let match;
            this.tokenPattern.lastIndex = 0;
            while ((match = this.tokenPattern.exec(sLine)) !== null) {
                const index = match.index;
                const fullMatch = match[0];
                const escaped = match[1];
                const displayMath = match[2];
                const inlineMath = match[3];
                if (escaped) {
                    // Ignore escaped character
                    continue;
                }
                else if (displayMath) {
                    // Special case: consecutive $$ with no content between should be treated as
                    // two inline math delimiters (empty inline math expression)
                    // Check if this is opening display math and there's no closing $$ on this line
                    const isOpening = mathStack.length === 0 || mathStack[mathStack.length - 1] !== MathMode.Display;
                    if (isOpening) {
                        // Look for closing $$ on the same line
                        const restOfLine = sLine.substring(index + 2);
                        const closingIndex = restOfLine.indexOf('$$');
                        // If no closing $$ or closing is immediate (empty content), treat as two inline $
                        if (closingIndex === -1 || closingIndex === 0) {
                            // Treat as two separate inline math delimiters
                            // First $: opening
                            const range1 = new vscode.Range(i, index, i, index + 1);
                            mathStack.push(MathMode.Inline);
                            edits.push(vscode.TextEdit.replace(range1, '\\('));
                            // Second $: closing
                            const range2 = new vscode.Range(i, index + 1, i, index + 2);
                            mathStack.pop();
                            edits.push(vscode.TextEdit.replace(range2, '\\)'));
                            continue;
                        }
                    }
                    // Normal display math handling
                    const range = new vscode.Range(i, index, i, index + fullMatch.length);
                    if (mathStack.length > 0 && mathStack[mathStack.length - 1] === MathMode.Display) {
                        mathStack.pop();
                        edits.push(vscode.TextEdit.replace(range, '\\]'));
                    }
                    else {
                        mathStack.push(MathMode.Display);
                        edits.push(vscode.TextEdit.replace(range, '\\['));
                    }
                }
                else if (inlineMath) {
                    const range = new vscode.Range(i, index, i, index + fullMatch.length);
                    if (mathStack.length > 0 && mathStack[mathStack.length - 1] === MathMode.Inline) {
                        mathStack.pop();
                        edits.push(vscode.TextEdit.replace(range, '\\)'));
                    }
                    else {
                        mathStack.push(MathMode.Inline);
                        edits.push(vscode.TextEdit.replace(range, '\\('));
                    }
                }
            }
        }
        return edits;
    }
}
exports.MathFixer = MathFixer;
/**
 * Apply maths normalization based on the user configuration.
 *
 * @param document The document being edited.
 * @param range The range covered by the edit, or `undefined` to process the entire document.
 * @returns A list of TextEdit.
 */
function fixMath(document, range) {
    const config = vscode.workspace.getConfiguration('latex-workshop', document.uri);
    const enabled = config.get('format.fixMath.enabled', false);
    if (!enabled) {
        return [];
    }
    const mathFixer = new MathFixer();
    const targetRange = range ?? new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE);
    const text = document.getText(); // Get full text to ensure correct line numbers
    return mathFixer.getEdits(text).filter(e => targetRange.contains(e.range));
}
//# sourceMappingURL=math-fixer.js.map