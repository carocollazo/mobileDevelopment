import '../../../globals';
import { isCssVariable } from '../../core/properties';
import { isNullOrUndefined } from '../../../utils/types';
import { parseSelector } from '../../../css/parser';
var Match;
(function (Match) {
    /**
     * Depends on attributes or pseudoclasses state;
     */
    Match.Dynamic = true;
    /**
     * Depends only on the tree structure.
     */
    Match.Static = false;
})(Match || (Match = {}));
function getNodeDirectSibling(node) {
    if (!node.parent || !node.parent.getChildIndex || !node.parent.getChildAt) {
        return null;
    }
    const nodeIndex = node.parent.getChildIndex(node);
    if (nodeIndex === 0) {
        return null;
    }
    return node.parent.getChildAt(nodeIndex - 1);
}
function SelectorProperties(specificity, rarity, dynamic = false) {
    return (cls) => {
        cls.prototype.specificity = specificity;
        cls.prototype.rarity = rarity;
        cls.prototype.combinator = undefined;
        cls.prototype.dynamic = dynamic;
        return cls;
    };
}
let SelectorCore = class SelectorCore {
    lookupSort(sorter, base) {
        sorter.sortAsUniversal(base || this);
    }
};
SelectorCore = __decorate([
    SelectorProperties(0 /* Universal */, 0 /* Universal */, Match.Static)
], SelectorCore);
export { SelectorCore };
export class SimpleSelector extends SelectorCore {
    accumulateChanges(node, map) {
        if (!this.dynamic) {
            return this.match(node);
        }
        else if (this.mayMatch(node)) {
            this.trackChanges(node, map);
            return true;
        }
        return false;
    }
    mayMatch(node) {
        return this.match(node);
    }
    trackChanges(node, map) {
        // No-op, silence the tslint 'block is empty'.
        // Some derived classes (dynamic) will actually fill the map with stuff here, some (static) won't do anything.
    }
}
function wrap(text) {
    return text ? ` ${text} ` : '';
}
let InvalidSelector = class InvalidSelector extends SimpleSelector {
    constructor(e) {
        super();
        this.e = e;
    }
    toString() {
        return `<error: ${this.e}>`;
    }
    match(node) {
        return false;
    }
    lookupSort(sorter, base) {
        // No-op, silence the tslint 'block is empty'.
        // It feels like tslint has problems with simple polymorphism...
        // This selector is invalid and will never match so we won't bother sorting it to further appear in queries.
    }
};
InvalidSelector = __decorate([
    SelectorProperties(0 /* Invalid */, 4 /* Invalid */, Match.Static),
    __metadata("design:paramtypes", [Error])
], InvalidSelector);
export { InvalidSelector };
let UniversalSelector = class UniversalSelector extends SimpleSelector {
    toString() {
        return `*${wrap(this.combinator)}`;
    }
    match(node) {
        return true;
    }
};
UniversalSelector = __decorate([
    SelectorProperties(0 /* Universal */, 0 /* Universal */, Match.Static)
], UniversalSelector);
export { UniversalSelector };
let IdSelector = class IdSelector extends SimpleSelector {
    constructor(id) {
        super();
        this.id = id;
    }
    toString() {
        return `#${this.id}${wrap(this.combinator)}`;
    }
    match(node) {
        return node.id === this.id;
    }
    lookupSort(sorter, base) {
        sorter.sortById(this.id, base || this);
    }
};
IdSelector = __decorate([
    SelectorProperties(100 /* Id */, 3 /* Id */, Match.Static),
    __metadata("design:paramtypes", [String])
], IdSelector);
export { IdSelector };
let TypeSelector = class TypeSelector extends SimpleSelector {
    constructor(cssType) {
        super();
        this.cssType = cssType;
    }
    toString() {
        return `${this.cssType}${wrap(this.combinator)}`;
    }
    match(node) {
        return node.cssType === this.cssType;
    }
    lookupSort(sorter, base) {
        sorter.sortByType(this.cssType, base || this);
    }
};
TypeSelector = __decorate([
    SelectorProperties(1 /* Type */, 1 /* Type */, Match.Static),
    __metadata("design:paramtypes", [String])
], TypeSelector);
export { TypeSelector };
let ClassSelector = class ClassSelector extends SimpleSelector {
    constructor(cssClass) {
        super();
        this.cssClass = cssClass;
    }
    toString() {
        return `.${this.cssClass}${wrap(this.combinator)}`;
    }
    match(node) {
        return node.cssClasses && node.cssClasses.has(this.cssClass);
    }
    lookupSort(sorter, base) {
        sorter.sortByClass(this.cssClass, base || this);
    }
};
ClassSelector = __decorate([
    SelectorProperties(10 /* Class */, 2 /* Class */, Match.Static),
    __metadata("design:paramtypes", [String])
], ClassSelector);
export { ClassSelector };
let AttributeSelector = class AttributeSelector extends SimpleSelector {
    constructor(attribute, test, value) {
        super();
        this.attribute = attribute;
        this.test = test;
        this.value = value;
        if (!test) {
            // HasAttribute
            this.match = (node) => !isNullOrUndefined(node[attribute]);
            return;
        }
        if (!value) {
            this.match = (node) => false;
        }
        this.match = (node) => {
            const attr = node[attribute] + '';
            if (test === '=') {
                // Equals
                return attr === value;
            }
            if (test === '^=') {
                // PrefixMatch
                return attr.startsWith(value);
            }
            if (test === '$=') {
                // SuffixMatch
                return attr.endsWith(value);
            }
            if (test === '*=') {
                // SubstringMatch
                return attr.indexOf(value) !== -1;
            }
            if (test === '~=') {
                // Includes
                const words = attr.split(' ');
                return words && words.indexOf(value) !== -1;
            }
            if (test === '|=') {
                // DashMatch
                return attr === value || attr.startsWith(value + '-');
            }
        };
    }
    toString() {
        return `[${this.attribute}${wrap(this.test)}${(this.test && this.value) || ''}]${wrap(this.combinator)}`;
    }
    match(node) {
        return false;
    }
    mayMatch(node) {
        return true;
    }
    trackChanges(node, map) {
        map.addAttribute(node, this.attribute);
    }
};
AttributeSelector = __decorate([
    SelectorProperties(10 /* Attribute */, 0 /* Attribute */, Match.Dynamic),
    __metadata("design:paramtypes", [String, String, String])
], AttributeSelector);
export { AttributeSelector };
let PseudoClassSelector = class PseudoClassSelector extends SimpleSelector {
    constructor(cssPseudoClass) {
        super();
        this.cssPseudoClass = cssPseudoClass;
    }
    toString() {
        return `:${this.cssPseudoClass}${wrap(this.combinator)}`;
    }
    match(node) {
        return node.cssPseudoClasses && node.cssPseudoClasses.has(this.cssPseudoClass);
    }
    mayMatch(node) {
        return true;
    }
    trackChanges(node, map) {
        map.addPseudoClass(node, this.cssPseudoClass);
    }
};
PseudoClassSelector = __decorate([
    SelectorProperties(10 /* PseudoClass */, 0 /* PseudoClass */, Match.Dynamic),
    __metadata("design:paramtypes", [String])
], PseudoClassSelector);
export { PseudoClassSelector };
export class SimpleSelectorSequence extends SimpleSelector {
    constructor(selectors) {
        super();
        this.selectors = selectors;
        this.specificity = selectors.reduce((sum, sel) => sel.specificity + sum, 0);
        this.head = this.selectors.reduce((prev, curr) => (!prev || curr.rarity > prev.rarity ? curr : prev), null);
        this.dynamic = selectors.some((sel) => sel.dynamic);
    }
    toString() {
        return `${this.selectors.join('')}${wrap(this.combinator)}`;
    }
    match(node) {
        return this.selectors.every((sel) => sel.match(node));
    }
    mayMatch(node) {
        return this.selectors.every((sel) => sel.mayMatch(node));
    }
    trackChanges(node, map) {
        this.selectors.forEach((sel) => sel.trackChanges(node, map));
    }
    lookupSort(sorter, base) {
        this.head.lookupSort(sorter, base || this);
    }
}
export class Selector extends SelectorCore {
    constructor(selectors) {
        super();
        this.selectors = selectors;
        const supportedCombinator = [undefined, ' ', '>', '+'];
        let siblingGroup;
        let lastGroup;
        const groups = [];
        this.specificity = 0;
        this.dynamic = false;
        for (let i = selectors.length - 1; i > -1; i--) {
            const sel = selectors[i];
            if (supportedCombinator.indexOf(sel.combinator) === -1) {
                throw new Error(`Unsupported combinator "${sel.combinator}".`);
            }
            if (sel.combinator === undefined || sel.combinator === ' ') {
                groups.push((lastGroup = [(siblingGroup = [])]));
            }
            if (sel.combinator === '>') {
                lastGroup.push((siblingGroup = []));
            }
            this.specificity += sel.specificity;
            if (sel.dynamic) {
                this.dynamic = true;
            }
            siblingGroup.push(sel);
        }
        this.groups = groups.map((g) => new Selector.ChildGroup(g.map((sg) => new Selector.SiblingGroup(sg))));
        this.last = selectors[selectors.length - 1];
    }
    toString() {
        return this.selectors.join('');
    }
    match(node) {
        return this.groups.every((group, i) => {
            if (i === 0) {
                node = group.match(node);
                return !!node;
            }
            else {
                let ancestor = node;
                while ((ancestor = ancestor.parent)) {
                    if ((node = group.match(ancestor))) {
                        return true;
                    }
                }
                return false;
            }
        });
    }
    lookupSort(sorter, base) {
        this.last.lookupSort(sorter, this);
    }
    accumulateChanges(node, map) {
        if (!this.dynamic) {
            return this.match(node);
        }
        const bounds = [];
        const mayMatch = this.groups.every((group, i) => {
            if (i === 0) {
                const nextNode = group.mayMatch(node);
                bounds.push({ left: node, right: node });
                node = nextNode;
                return !!node;
            }
            else {
                let ancestor = node;
                while ((ancestor = ancestor.parent)) {
                    const nextNode = group.mayMatch(ancestor);
                    if (nextNode) {
                        bounds.push({ left: ancestor, right: null });
                        node = nextNode;
                        return true;
                    }
                }
                return false;
            }
        });
        // Calculating the right bounds for each selectors won't save much
        if (!mayMatch) {
            return false;
        }
        if (!map) {
            return mayMatch;
        }
        for (let i = 0; i < this.groups.length; i++) {
            const group = this.groups[i];
            if (!group.dynamic) {
                continue;
            }
            const bound = bounds[i];
            let node = bound.left;
            do {
                if (group.mayMatch(node)) {
                    group.trackChanges(node, map);
                }
            } while (node !== bound.right && (node = node.parent));
        }
        return mayMatch;
    }
}
(function (Selector) {
    // Non-spec. Selector sequences are grouped by ancestor then by child combinators for easier backtracking.
    class ChildGroup {
        constructor(selectors) {
            this.selectors = selectors;
            this.dynamic = selectors.some((sel) => sel.dynamic);
        }
        match(node) {
            return this.selectors.every((sel, i) => (node = i === 0 ? node : node.parent) && sel.match(node)) ? node : null;
        }
        mayMatch(node) {
            return this.selectors.every((sel, i) => (node = i === 0 ? node : node.parent) && sel.mayMatch(node)) ? node : null;
        }
        trackChanges(node, map) {
            this.selectors.forEach((sel, i) => (node = i === 0 ? node : node.parent) && sel.trackChanges(node, map));
        }
    }
    Selector.ChildGroup = ChildGroup;
    class SiblingGroup {
        constructor(selectors) {
            this.selectors = selectors;
            this.dynamic = selectors.some((sel) => sel.dynamic);
        }
        match(node) {
            return this.selectors.every((sel, i) => (node = i === 0 ? node : getNodeDirectSibling(node)) && sel.match(node)) ? node : null;
        }
        mayMatch(node) {
            return this.selectors.every((sel, i) => (node = i === 0 ? node : getNodeDirectSibling(node)) && sel.mayMatch(node)) ? node : null;
        }
        trackChanges(node, map) {
            this.selectors.forEach((sel, i) => (node = i === 0 ? node : getNodeDirectSibling(node)) && sel.trackChanges(node, map));
        }
    }
    Selector.SiblingGroup = SiblingGroup;
})(Selector || (Selector = {}));
export class RuleSet {
    constructor(selectors, declarations) {
        this.selectors = selectors;
        this.declarations = declarations;
        this.selectors.forEach((sel) => (sel.ruleset = this));
    }
    toString() {
        return `${this.selectors.join(', ')} {${this.declarations.map((d, i) => `${i === 0 ? ' ' : ''}${d.property}: ${d.value}`).join('; ')} }`;
    }
    lookupSort(sorter) {
        this.selectors.forEach((sel) => sel.lookupSort(sorter));
    }
}
export function fromAstNodes(astRules) {
    return astRules.filter(isRule).map((rule) => {
        const declarations = rule.declarations.filter(isDeclaration).map(createDeclaration);
        const selectors = rule.selectors.map(createSelector);
        return new RuleSet(selectors, declarations);
    });
}
function createDeclaration(decl) {
    return { property: isCssVariable(decl.property) ? decl.property : decl.property.toLowerCase(), value: decl.value };
}
function createSimpleSelectorFromAst(ast) {
    if (ast.type === '.') {
        return new ClassSelector(ast.identifier);
    }
    if (ast.type === '') {
        return new TypeSelector(ast.identifier.replace('-', '').toLowerCase());
    }
    if (ast.type === '#') {
        return new IdSelector(ast.identifier);
    }
    if (ast.type === '[]') {
        return new AttributeSelector(ast.property, ast.test, ast.test && ast.value);
    }
    if (ast.type === ':') {
        return new PseudoClassSelector(ast.identifier);
    }
    if (ast.type === '*') {
        return new UniversalSelector();
    }
}
function createSimpleSelectorSequenceFromAst(ast) {
    if (ast.length === 0) {
        return new InvalidSelector(new Error('Empty simple selector sequence.'));
    }
    else if (ast.length === 1) {
        return createSimpleSelectorFromAst(ast[0]);
    }
    else {
        return new SimpleSelectorSequence(ast.map(createSimpleSelectorFromAst));
    }
}
function createSelectorFromAst(ast) {
    if (ast.length === 0) {
        return new InvalidSelector(new Error('Empty selector.'));
    }
    else if (ast.length === 1) {
        return createSimpleSelectorSequenceFromAst(ast[0][0]);
    }
    else {
        const simpleSelectorSequences = [];
        let simpleSelectorSequence;
        let combinator;
        for (let i = 0; i < ast.length; i++) {
            simpleSelectorSequence = createSimpleSelectorSequenceFromAst(ast[i][0]);
            combinator = ast[i][1];
            if (combinator) {
                simpleSelectorSequence.combinator = combinator;
            }
            simpleSelectorSequences.push(simpleSelectorSequence);
        }
        return new Selector(simpleSelectorSequences);
    }
}
export function createSelector(sel) {
    try {
        const parsedSelector = parseSelector(sel);
        if (!parsedSelector) {
            return new InvalidSelector(new Error('Empty selector'));
        }
        return createSelectorFromAst(parsedSelector.value);
    }
    catch (e) {
        return new InvalidSelector(e);
    }
}
function isRule(node) {
    return node.type === 'rule';
}
function isDeclaration(node) {
    return node.type === 'declaration';
}
export class SelectorsMap {
    constructor(rulesets) {
        this.id = {};
        this.class = {};
        this.type = {};
        this.universal = [];
        this.position = 0;
        rulesets.forEach((rule) => rule.lookupSort(this));
    }
    query(node) {
        const selectorsMatch = new SelectorsMatch();
        const { cssClasses, id, cssType } = node;
        const selectorClasses = [this.universal, this.id[id], this.type[cssType]];
        if (cssClasses && cssClasses.size) {
            cssClasses.forEach((c) => selectorClasses.push(this.class[c]));
        }
        const selectors = selectorClasses.reduce((cur, next) => cur.concat(next || []), []);
        selectorsMatch.selectors = selectors.filter((sel) => sel.accumulateChanges(node, selectorsMatch)).sort((a, b) => a.specificity - b.specificity || a.pos - b.pos);
        return selectorsMatch;
    }
    sortById(id, sel) {
        this.addToMap(this.id, id, sel);
    }
    sortByClass(cssClass, sel) {
        this.addToMap(this.class, cssClass, sel);
    }
    sortByType(cssType, sel) {
        this.addToMap(this.type, cssType, sel);
    }
    sortAsUniversal(sel) {
        this.universal.push(this.makeDocSelector(sel));
    }
    addToMap(map, head, sel) {
        if (!map[head]) {
            map[head] = [];
        }
        map[head].push(this.makeDocSelector(sel));
    }
    makeDocSelector(sel) {
        sel.pos = this.position++;
        return sel;
    }
}
export class SelectorsMatch {
    constructor() {
        this.changeMap = new Map();
    }
    addAttribute(node, attribute) {
        const deps = this.properties(node);
        if (!deps.attributes) {
            deps.attributes = new Set();
        }
        deps.attributes.add(attribute);
    }
    addPseudoClass(node, pseudoClass) {
        const deps = this.properties(node);
        if (!deps.pseudoClasses) {
            deps.pseudoClasses = new Set();
        }
        deps.pseudoClasses.add(pseudoClass);
    }
    properties(node) {
        let set = this.changeMap.get(node);
        if (!set) {
            this.changeMap.set(node, (set = {}));
        }
        return set;
    }
}
export const CSSHelper = {
    createSelector,
    SelectorCore,
    SimpleSelector,
    InvalidSelector,
    UniversalSelector,
    TypeSelector,
    ClassSelector,
    AttributeSelector,
    PseudoClassSelector,
    SimpleSelectorSequence,
    Selector,
    RuleSet,
    SelectorsMap,
    fromAstNodes,
    SelectorsMatch,
};
//# sourceMappingURL=index.js.map