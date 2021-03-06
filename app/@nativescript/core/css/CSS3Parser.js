const commentRegEx = /(\/\*(?:[^\*]|\*[^\/])*\*\/)/gmy;
// eslint-disable-next-line no-control-regex
const nameRegEx = /-?(?:(?:[a-zA-Z_]|[^\x00-\x7F]|\\(?:\$|\n|[0-9a-fA-F]{1,6}\s?))(?:[a-zA-Z_0-9\-]*|\\(?:\$|\n|[0-9a-fA-F]{1,6}\s?))*)/gmy;
const numberRegEx = /[\+\-]?(?:\d+\.\d+|\d+|\.\d+)(?:[eE][\+\-]?\d+)?/gmy;
const doubleQuoteStringRegEx = /"((?:[^\n\r\f\"]|\\(?:\$|\n|[0-9a-fA-F]{1,6}\s?))*)(:?"|$)/gmy; // Besides $n, parse escape
const whitespaceRegEx = /[\s\t\n\r\f]*/gmy;
const singleQuoteStringRegEx = /'((?:[^\n\r\f\']|\\(?:\$|\n|[0-9a-fA-F]{1,6}\s?))*)(:?'|$)/gmy; // Besides $n, parse escape
/**
 * CSS parser following relatively close:
 * CSS Syntax Module Level 3
 * https://www.w3.org/TR/css-syntax-3/
 */
export class CSS3Parser {
    constructor(text) {
        this.text = text;
        this.nextInputCodePointIndex = 0;
    }
    /**
     * For testing purposes.
     * This method allows us to run and assert the proper working of the tokenizer.
     */
    tokenize() {
        const tokens = [];
        let inputToken;
        do {
            inputToken = this.consumeAToken();
            tokens.push(inputToken);
        } while (inputToken);
        return tokens;
    }
    /**
     * 4.3.1. Consume a token
     * https://www.w3.org/TR/css-syntax-3/#consume-a-token
     */
    consumeAToken() {
        if (this.reconsumedInputToken) {
            const result = this.reconsumedInputToken;
            this.reconsumedInputToken = null;
            return result;
        }
        const char = this.text[this.nextInputCodePointIndex];
        switch (char) {
            case '"':
                return this.consumeAStringToken();
            case "'":
                return this.consumeAStringToken();
            case '(':
            case ')':
            case ',':
            case ':':
            case ';':
            case '[':
            case ']':
            case '{':
            case '}':
                this.nextInputCodePointIndex++;
                return char;
            case '#':
                return this.consumeAHashToken() || this.consumeADelimToken();
            case ' ':
            case '\t':
            case '\n':
            case '\r':
            case '\f':
                return this.consumeAWhitespace();
            case '@':
                return this.consumeAtKeyword() || this.consumeADelimToken();
            // TODO: Only if this is valid escape, otherwise it is a parse error
            case '\\':
                return this.consumeAnIdentLikeToken() || this.consumeADelimToken();
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                return this.consumeANumericToken();
            case 'u':
            case 'U':
                if (this.text[this.nextInputCodePointIndex + 1] === '+') {
                    const thirdChar = this.text[this.nextInputCodePointIndex + 2];
                    if ((thirdChar >= '0' && thirdChar <= '9') || thirdChar === '?') {
                        // TODO: Handle unicode stuff such as U+002B
                        throw new Error('Unicode tokens not supported!');
                    }
                }
                return this.consumeAnIdentLikeToken() || this.consumeADelimToken();
            case '$':
            case '*':
            case '^':
            case '|':
            case '~':
                return this.consumeAMatchToken() || this.consumeADelimToken();
            case '-':
                return this.consumeANumericToken() || this.consumeAnIdentLikeToken() || this.consumeCDC() || this.consumeADelimToken();
            case '+':
            case '.':
                return this.consumeANumericToken() || this.consumeADelimToken();
            case '/':
                return this.consumeAComment() || this.consumeADelimToken();
            case '<':
                return this.consumeCDO() || this.consumeADelimToken();
            case undefined:
                return undefined;
            default:
                return this.consumeAnIdentLikeToken() || this.consumeADelimToken();
        }
    }
    consumeADelimToken() {
        return {
            type: 2 /* delim */,
            text: this.text[this.nextInputCodePointIndex++],
        };
    }
    consumeAWhitespace() {
        whitespaceRegEx.lastIndex = this.nextInputCodePointIndex;
        whitespaceRegEx.exec(this.text);
        this.nextInputCodePointIndex = whitespaceRegEx.lastIndex;
        return ' ';
    }
    consumeAHashToken() {
        this.nextInputCodePointIndex++;
        const hashName = this.consumeAName();
        if (hashName) {
            return { type: 12 /* hash */, text: '#' + hashName.text };
        }
        this.nextInputCodePointIndex--;
        return null;
    }
    consumeCDO() {
        if (this.text.substr(this.nextInputCodePointIndex, 4) === '<!--') {
            this.nextInputCodePointIndex += 4;
            return '<!--';
        }
        return null;
    }
    consumeCDC() {
        if (this.text.substr(this.nextInputCodePointIndex, 3) === '-->') {
            this.nextInputCodePointIndex += 3;
            return '-->';
        }
        return null;
    }
    consumeAMatchToken() {
        if (this.text[this.nextInputCodePointIndex + 1] === '=') {
            const token = this.text.substr(this.nextInputCodePointIndex, 2);
            this.nextInputCodePointIndex += 2;
            return token;
        }
        return null;
    }
    /**
     * 4.3.2. Consume a numeric token
     * https://www.w3.org/TR/css-syntax-3/#consume-a-numeric-token
     */
    consumeANumericToken() {
        numberRegEx.lastIndex = this.nextInputCodePointIndex;
        const result = numberRegEx.exec(this.text);
        if (!result) {
            return null;
        }
        this.nextInputCodePointIndex = numberRegEx.lastIndex;
        if (this.text[this.nextInputCodePointIndex] === '%') {
            return { type: 4 /* percentage */, text: result[0] }; // TODO: Push the actual number and unit here...
        }
        const name = this.consumeAName();
        if (name) {
            return {
                type: 5 /* dimension */,
                text: result[0] + name.text,
            };
        }
        return { type: 3 /* number */, text: result[0] };
    }
    /**
     * 4.3.3. Consume an ident-like token
     * https://www.w3.org/TR/css-syntax-3/#consume-an-ident-like-token
     */
    consumeAnIdentLikeToken() {
        const name = this.consumeAName();
        if (!name) {
            return null;
        }
        if (this.text[this.nextInputCodePointIndex] === '(') {
            this.nextInputCodePointIndex++;
            if (name.text.toLowerCase() === 'url') {
                return this.consumeAURLToken();
            }
            return {
                type: 8 /* functionToken */,
                name: name.text,
                text: name.text + '(',
            };
        }
        return name;
    }
    /**
     * 4.3.4. Consume a string token
     * https://www.w3.org/TR/css-syntax-3/#consume-a-string-token
     */
    consumeAStringToken() {
        const char = this.text[this.nextInputCodePointIndex];
        let result;
        if (char === "'") {
            singleQuoteStringRegEx.lastIndex = this.nextInputCodePointIndex;
            result = singleQuoteStringRegEx.exec(this.text);
            if (!result) {
                return null;
            }
            this.nextInputCodePointIndex = singleQuoteStringRegEx.lastIndex;
        }
        else if (char === '"') {
            doubleQuoteStringRegEx.lastIndex = this.nextInputCodePointIndex;
            result = doubleQuoteStringRegEx.exec(this.text);
            if (!result) {
                return null;
            }
            this.nextInputCodePointIndex = doubleQuoteStringRegEx.lastIndex;
        }
        // TODO: Handle bad-string.
        // TODO: Perform string escaping.
        return { type: 1 /* string */, text: result[0] };
    }
    /**
     * 4.3.5. Consume a url token
     * https://www.w3.org/TR/css-syntax-3/#consume-a-url-token
     */
    consumeAURLToken() {
        const start = this.nextInputCodePointIndex - 3 /* url */ - 1; /* ( */
        const urlToken = {
            type: 7 /* url */,
            text: undefined,
        };
        this.consumeAWhitespace();
        if (this.nextInputCodePointIndex >= this.text.length) {
            return urlToken;
        }
        const nextInputCodePoint = this.text[this.nextInputCodePointIndex];
        if (nextInputCodePoint === '"' || nextInputCodePoint === "'") {
            const stringToken = this.consumeAStringToken();
            // TODO: Handle bad-string.
            // TODO: Set value instead.
            urlToken.text = stringToken.text;
            this.consumeAWhitespace();
            if (this.text[this.nextInputCodePointIndex] === ')' || this.nextInputCodePointIndex >= this.text.length) {
                this.nextInputCodePointIndex++;
                const end = this.nextInputCodePointIndex;
                urlToken.text = this.text.substring(start, end);
                return urlToken;
            }
            else {
                // TODO: Handle bad-url.
                return null;
            }
        }
        while (this.nextInputCodePointIndex < this.text.length) {
            const char = this.text[this.nextInputCodePointIndex++];
            switch (char) {
                case ')':
                    return urlToken;
                case ' ':
                case '\t':
                case '\n':
                case '\r':
                case '\f':
                    this.consumeAWhitespace();
                    if (this.text[this.nextInputCodePointIndex] === ')') {
                        this.nextInputCodePointIndex++;
                        return urlToken;
                    }
                    else {
                        // TODO: Bar url! Consume remnants.
                        return null;
                    }
                case '"':
                case "'":
                    // TODO: Parse error! Bar url! Consume remnants.
                    return null;
                case '\\':
                    // TODO: Escape!
                    throw new Error('Escaping not yet supported!');
                default:
                    // TODO: Non-printable chars - error.
                    urlToken.text += char;
            }
        }
        return urlToken;
    }
    /**
     * 4.3.11. Consume a name
     * https://www.w3.org/TR/css-syntax-3/#consume-a-name
     */
    consumeAName() {
        nameRegEx.lastIndex = this.nextInputCodePointIndex;
        const result = nameRegEx.exec(this.text);
        if (!result) {
            return null;
        }
        this.nextInputCodePointIndex = nameRegEx.lastIndex;
        // TODO: Perform string escaping.
        return { type: 6 /* ident */, text: result[0] };
    }
    consumeAtKeyword() {
        this.nextInputCodePointIndex++;
        const name = this.consumeAName();
        if (name) {
            return { type: 11 /* atKeyword */, text: name.text };
        }
        this.nextInputCodePointIndex--;
        return null;
    }
    consumeAComment() {
        if (this.text[this.nextInputCodePointIndex + 1] === '*') {
            commentRegEx.lastIndex = this.nextInputCodePointIndex;
            const result = commentRegEx.exec(this.text);
            if (!result) {
                return null; // TODO: Handle <bad-comment>
            }
            this.nextInputCodePointIndex = commentRegEx.lastIndex;
            // The CSS spec tokenizer does not emmit comment tokens
            return this.consumeAToken();
        }
        return null;
    }
    reconsumeTheCurrentInputToken(currentInputToken) {
        this.reconsumedInputToken = currentInputToken;
    }
    /**
     * 5.3.1. Parse a stylesheet
     * https://www.w3.org/TR/css-syntax-3/#parse-a-stylesheet
     */
    parseAStylesheet() {
        this.topLevelFlag = true;
        return {
            rules: this.consumeAListOfRules(),
        };
    }
    /**
     * 5.4.1. Consume a list of rules
     * https://www.w3.org/TR/css-syntax-3/#consume-a-list-of-rules
     */
    consumeAListOfRules() {
        const rules = [];
        let inputToken;
        while ((inputToken = this.consumeAToken())) {
            switch (inputToken) {
                case ' ':
                    continue;
                case '<!--':
                case '-->': {
                    if (this.topLevelFlag) {
                        continue;
                    }
                    this.reconsumeTheCurrentInputToken(inputToken);
                    const atRule = this.consumeAnAtRule();
                    if (atRule) {
                        rules.push(atRule);
                    }
                    continue;
                }
            }
            if (inputToken.type === 11 /* atKeyword */) {
                this.reconsumeTheCurrentInputToken(inputToken);
                const atRule = this.consumeAnAtRule();
                if (atRule) {
                    rules.push(atRule);
                }
                continue;
            }
            this.reconsumeTheCurrentInputToken(inputToken);
            const qualifiedRule = this.consumeAQualifiedRule();
            if (qualifiedRule) {
                rules.push(qualifiedRule);
            }
        }
        return rules;
    }
    /**
     * 5.4.2. Consume an at-rule
     * https://www.w3.org/TR/css-syntax-3/#consume-an-at-rule
     */
    consumeAnAtRule() {
        let inputToken = this.consumeAToken();
        const atRule = {
            type: 'at-rule',
            name: inputToken.text,
            prelude: [],
            block: undefined,
        };
        while ((inputToken = this.consumeAToken())) {
            if (inputToken === ';') {
                return atRule;
            }
            else if (inputToken === '{') {
                atRule.block = this.consumeASimpleBlock(inputToken);
                return atRule;
            }
            else if (inputToken.type === 9 /* simpleBlock */ && inputToken.associatedToken === '{') {
                atRule.block = inputToken;
                return atRule;
            }
            this.reconsumeTheCurrentInputToken(inputToken);
            const component = this.consumeAComponentValue();
            if (component) {
                atRule.prelude.push(component);
            }
        }
        return atRule;
    }
    /**
     * 5.4.3. Consume a qualified rule
     * https://www.w3.org/TR/css-syntax-3/#consume-a-qualified-rule
     */
    consumeAQualifiedRule() {
        const qualifiedRule = {
            type: 'qualified-rule',
            prelude: [],
            block: undefined,
        };
        let inputToken;
        while ((inputToken = this.consumeAToken())) {
            if (inputToken === '{') {
                qualifiedRule.block = this.consumeASimpleBlock(inputToken);
                return qualifiedRule;
            }
            else if (inputToken.type === 9 /* simpleBlock */) {
                const simpleBlock = inputToken;
                if (simpleBlock.associatedToken === '{') {
                    qualifiedRule.block = simpleBlock;
                    return qualifiedRule;
                }
            }
            this.reconsumeTheCurrentInputToken(inputToken);
            const componentValue = this.consumeAComponentValue();
            if (componentValue) {
                qualifiedRule.prelude.push(componentValue);
            }
        }
        // TODO: This is a parse error, log parse errors!
        return null;
    }
    /**
     * 5.4.6. Consume a component value
     * https://www.w3.org/TR/css-syntax-3/#consume-a-component-value
     */
    consumeAComponentValue() {
        // const inputToken = this.consumeAToken();
        const inputToken = this.consumeAToken();
        switch (inputToken) {
            case '{':
            case '[':
            case '(':
                this.nextInputCodePointIndex++;
                return this.consumeASimpleBlock(inputToken);
        }
        if (typeof inputToken === 'object' && inputToken.type === 8 /* functionToken */) {
            return this.consumeAFunction(inputToken.name);
        }
        return inputToken;
    }
    /**
     * 5.4.7. Consume a simple block
     * https://www.w3.org/TR/css-syntax-3/#consume-a-simple-block
     */
    consumeASimpleBlock(associatedToken) {
        const endianToken = {
            '[': ']',
            '{': '}',
            '(': ')',
        }[associatedToken];
        const start = this.nextInputCodePointIndex - 1;
        const block = {
            type: 9 /* simpleBlock */,
            text: undefined,
            associatedToken,
            values: [],
        };
        let nextInputToken;
        while ((nextInputToken = this.text[this.nextInputCodePointIndex])) {
            if (nextInputToken === endianToken) {
                this.nextInputCodePointIndex++;
                const end = this.nextInputCodePointIndex;
                block.text = this.text.substring(start, end);
                return block;
            }
            const value = this.consumeAComponentValue();
            if (value) {
                block.values.push(value);
            }
        }
        block.text = this.text.substring(start);
        return block;
    }
    /**
     * 5.4.8. Consume a function
     * https://www.w3.org/TR/css-syntax-3/#consume-a-function
     */
    consumeAFunction(name) {
        const start = this.nextInputCodePointIndex;
        const funcToken = {
            type: 14 /* function */,
            name,
            text: undefined,
            components: [],
        };
        do {
            if (this.nextInputCodePointIndex >= this.text.length) {
                funcToken.text = name + '(' + this.text.substring(start);
                return funcToken;
            }
            const nextInputToken = this.text[this.nextInputCodePointIndex];
            switch (nextInputToken) {
                case ')': {
                    this.nextInputCodePointIndex++;
                    const end = this.nextInputCodePointIndex;
                    funcToken.text = name + '(' + this.text.substring(start, end);
                    return funcToken;
                }
                default: {
                    const component = this.consumeAComponentValue();
                    if (component) {
                        funcToken.components.push(component);
                    }
                }
                // TODO: Else we won't advance
            }
        } while (true);
    }
}
//# sourceMappingURL=CSS3Parser.js.map