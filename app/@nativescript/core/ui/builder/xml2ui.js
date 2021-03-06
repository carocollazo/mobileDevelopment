import { ScopeError, SourceError, Source } from '../../utils/debug';
import * as xml from '../../xml';
import { isString, isObject } from '../../utils/types';
import { getComponentModule } from './component-builder';
import { Device } from '../../platform';
import { profile } from '../../profiling';
import { android, ios, loadCustomComponent, defaultNameSpaceMatcher, getExports, Builder } from './index';
export var xml2ui;
(function (xml2ui) {
    class XmlProducerBase {
        pipe(next) {
            this._next = next;
            return next;
        }
        next(args) {
            this._next.parse(args);
        }
    }
    xml2ui.XmlProducerBase = XmlProducerBase;
    class XmlStringParser extends XmlProducerBase {
        constructor(error) {
            super();
            this.error = error || PositionErrorFormat;
        }
        parse(value) {
            if (__UI_USE_XML_PARSER__) {
                const xmlParser = new xml.XmlParser((args) => {
                    try {
                        this.next(args);
                    }
                    catch (e) {
                        throw this.error(e, args.position);
                    }
                }, (e, p) => {
                    throw this.error(e, p);
                }, true);
                if (isString(value)) {
                    xmlParser.parse(value);
                }
                else if (isObject(value) && isString(value.default)) {
                    xmlParser.parse(value.default);
                }
            }
        }
    }
    xml2ui.XmlStringParser = XmlStringParser;
    function PositionErrorFormat(e, p) {
        return new ScopeError(e, 'Parsing XML at ' + p.line + ':' + p.column);
    }
    xml2ui.PositionErrorFormat = PositionErrorFormat;
    function SourceErrorFormat(uri) {
        return (e, p) => {
            const source = p ? new Source(uri, p.line, p.column) : new Source(uri, -1, -1);
            e = new SourceError(e, source, 'Building UI from XML.');
            return e;
        };
    }
    xml2ui.SourceErrorFormat = SourceErrorFormat;
    function ComponentSourceTracker(uri) {
        return (component, p) => {
            if (!Source.get(component)) {
                const source = p ? new Source(uri, p.line, p.column) : new Source(uri, -1, -1);
                Source.set(component, source);
            }
        };
    }
    xml2ui.ComponentSourceTracker = ComponentSourceTracker;
    class PlatformFilter extends XmlProducerBase {
        parse(args) {
            if (args.eventType === xml.ParserEventType.StartElement) {
                if (PlatformFilter.isPlatform(args.elementName)) {
                    if (this.currentPlatformContext) {
                        throw new Error("Already in '" + this.currentPlatformContext + "' platform context and cannot switch to '" + args.elementName + "' platform! Platform tags cannot be nested.");
                    }
                    this.currentPlatformContext = args.elementName;
                    return;
                }
            }
            if (args.eventType === xml.ParserEventType.EndElement) {
                if (PlatformFilter.isPlatform(args.elementName)) {
                    this.currentPlatformContext = undefined;
                    return;
                }
            }
            if (this.currentPlatformContext && !PlatformFilter.isCurentPlatform(this.currentPlatformContext)) {
                return;
            }
            this.next(args);
        }
        static isPlatform(value) {
            if (value) {
                const toLower = value.toLowerCase();
                return toLower === android || toLower === ios;
            }
            return false;
        }
        static isCurentPlatform(value) {
            return value && value.toLowerCase() === Device.os.toLowerCase();
        }
    }
    xml2ui.PlatformFilter = PlatformFilter;
    class XmlArgsReplay extends XmlProducerBase {
        constructor(args, errorFormat) {
            super();
            this.args = args;
            this.error = errorFormat;
        }
        replay() {
            this.args.forEach((args) => {
                try {
                    this.next(args);
                }
                catch (e) {
                    throw this.error(e, args.position);
                }
            });
        }
    }
    xml2ui.XmlArgsReplay = XmlArgsReplay;
    /**
     * It is a state pattern
     * https://en.wikipedia.org/wiki/State_pattern
     */
    class XmlStateParser {
        constructor(state) {
            this.state = state;
        }
        parse(args) {
            this.state = this.state.parse(args);
        }
    }
    xml2ui.XmlStateParser = XmlStateParser;
    class TemplateParser {
        constructor(parent, templateProperty, setTemplateProperty = true) {
            this.parent = parent;
            this._context = templateProperty.context;
            this._recordedXmlStream = new Array();
            this._templateProperty = templateProperty;
            this._nestingLevel = 0;
            this._state = 0 /* EXPECTING_START */;
            this._setTemplateProperty = setTemplateProperty;
        }
        parse(args) {
            if (args.eventType === xml.ParserEventType.StartElement) {
                this.parseStartElement(args.prefix, args.namespace, args.elementName, args.attributes);
            }
            else if (args.eventType === xml.ParserEventType.EndElement) {
                this.parseEndElement(args.prefix, args.elementName);
            }
            this._recordedXmlStream.push(args);
            return this._state === 2 /* FINISHED */ ? this.parent : this;
        }
        get elementName() {
            return this._templateProperty.elementName;
        }
        parseStartElement(prefix, namespace, elementName, attributes) {
            if (this._state === 0 /* EXPECTING_START */) {
                this._state = 1 /* PARSING */;
            }
            else if (this._state === 2 /* FINISHED */) {
                throw new Error('Template must have exactly one root element but multiple elements were found.');
            }
            this._nestingLevel++;
        }
        parseEndElement(prefix, elementName) {
            if (this._state === 0 /* EXPECTING_START */) {
                throw new Error('Template must have exactly one root element but none was found.');
            }
            else if (this._state === 2 /* FINISHED */) {
                throw new Error('No more closing elements expected for this template.');
            }
            this._nestingLevel--;
            if (this._nestingLevel === 0) {
                this._state = 2 /* FINISHED */;
                if (this._setTemplateProperty && this._templateProperty.name in this._templateProperty.parent.component) {
                    const template = this.buildTemplate();
                    this._templateProperty.parent.component[this._templateProperty.name] = template;
                }
            }
        }
        buildTemplate() {
            if (__UI_USE_XML_PARSER__) {
                const context = this._context;
                const errorFormat = this._templateProperty.errorFormat;
                const sourceTracker = this._templateProperty.sourceTracker;
                const template = profile('Template()', () => {
                    let start;
                    let ui;
                    (start = new xml2ui.XmlArgsReplay(this._recordedXmlStream, errorFormat))
                        // No platform filter, it has been filtered already
                        .pipe(new XmlStateParser((ui = new ComponentParser(context, errorFormat, sourceTracker))));
                    start.replay();
                    return ui.rootComponentModule.component;
                });
                return template;
            }
            else {
                return null;
            }
        }
    }
    xml2ui.TemplateParser = TemplateParser;
    class MultiTemplateParser {
        constructor(parent, templateProperty) {
            this.parent = parent;
            this.templateProperty = templateProperty;
            this._childParsers = new Array();
        }
        get value() {
            return this._value;
        }
        parse(args) {
            if (args.eventType === xml.ParserEventType.StartElement && args.elementName === 'template') {
                const childParser = new TemplateParser(this, this.templateProperty, false);
                childParser['key'] = args.attributes['key'];
                this._childParsers.push(childParser);
                return childParser;
            }
            if (args.eventType === xml.ParserEventType.EndElement) {
                const name = ComponentParser.getComplexPropertyName(args.elementName);
                if (name === this.templateProperty.name) {
                    const templates = new Array();
                    for (let i = 0; i < this._childParsers.length; i++) {
                        templates.push({
                            key: this._childParsers[i]['key'],
                            createView: this._childParsers[i].buildTemplate(),
                        });
                    }
                    this._value = templates;
                    return this.parent.parse(args);
                }
            }
            return this;
        }
    }
    xml2ui.MultiTemplateParser = MultiTemplateParser;
    class ComponentParser {
        constructor(context, errorFormat, sourceTracker, moduleName) {
            this.moduleName = moduleName;
            this.parents = new Array();
            this.complexProperties = new Array();
            this.context = context;
            this.error = errorFormat;
            this.sourceTracker = sourceTracker;
        }
        buildComponent(args) {
            if (args.prefix && args.namespace) {
                // Custom components
                return loadCustomComponent(args.namespace, args.elementName, args.attributes, this.context, this.currentRootView, !this.currentRootView, this.moduleName);
            }
            else {
                // Default components
                let namespace = args.namespace;
                if (defaultNameSpaceMatcher.test(namespace || '')) {
                    //Ignore the default ...tns.xsd namespace URL
                    namespace = undefined;
                }
                return getComponentModule(args.elementName, namespace, args.attributes, this.context, this.moduleName, !this.currentRootView);
            }
        }
        parse(args) {
            // Get the current parent.
            const parent = this.parents[this.parents.length - 1];
            const complexProperty = this.complexProperties[this.complexProperties.length - 1];
            // Create component instance from every element declaration.
            if (args.eventType === xml.ParserEventType.StartElement) {
                if (ComponentParser.isComplexProperty(args.elementName)) {
                    const name = ComponentParser.getComplexPropertyName(args.elementName);
                    const complexProperty = {
                        parent: parent,
                        name: name,
                        items: [],
                    };
                    this.complexProperties.push(complexProperty);
                    if (ComponentParser.isKnownTemplate(name, parent.exports)) {
                        return new TemplateParser(this, {
                            context: (parent ? getExports(parent.component) : null) || this.context,
                            parent: parent,
                            name: name,
                            elementName: args.elementName,
                            templateItems: [],
                            errorFormat: this.error,
                            sourceTracker: this.sourceTracker,
                        });
                    }
                    if (ComponentParser.isKnownMultiTemplate(name, parent.exports)) {
                        const parser = new MultiTemplateParser(this, {
                            context: (parent ? getExports(parent.component) : null) || this.context,
                            parent: parent,
                            name: name,
                            elementName: args.elementName,
                            templateItems: [],
                            errorFormat: this.error,
                            sourceTracker: this.sourceTracker,
                        });
                        complexProperty.parser = parser;
                        return parser;
                    }
                }
                else {
                    const componentModule = this.buildComponent(args);
                    if (componentModule) {
                        this.sourceTracker(componentModule.component, args.position);
                        if (parent) {
                            if (complexProperty) {
                                // Add component to complex property of parent component.
                                ComponentParser.addToComplexProperty(parent, complexProperty, componentModule);
                            }
                            else if (parent.component._addChildFromBuilder) {
                                parent.component._addChildFromBuilder(args.elementName, componentModule.component);
                            }
                        }
                        else if (this.parents.length === 0) {
                            // Set root component.
                            this.rootComponentModule = componentModule;
                            if (this.rootComponentModule) {
                                this.currentRootView = this.rootComponentModule.component;
                                if (this.currentRootView.exports) {
                                    this.context = this.currentRootView.exports;
                                }
                            }
                        }
                        // Add the component instance to the parents scope collection.
                        this.parents.push(componentModule);
                    }
                }
            }
            else if (args.eventType === xml.ParserEventType.EndElement) {
                if (ComponentParser.isComplexProperty(args.elementName)) {
                    if (complexProperty) {
                        if (complexProperty.parser) {
                            parent.component[complexProperty.name] = complexProperty.parser.value;
                        }
                        else if (parent && parent.component._addArrayFromBuilder) {
                            // If parent is AddArrayFromBuilder call the interface method to populate the array property.
                            parent.component._addArrayFromBuilder(complexProperty.name, complexProperty.items);
                            complexProperty.items = [];
                        }
                    }
                    // Remove the last complexProperty from the complexProperties collection (move to the previous complexProperty scope).
                    this.complexProperties.pop();
                }
                else {
                    // Remove the last parent from the parents collection (move to the previous parent scope).
                    this.parents.pop();
                }
            }
            return this;
        }
        static isComplexProperty(name) {
            return isString(name) && name.indexOf('.') !== -1;
        }
        static getComplexPropertyName(fullName) {
            let name;
            if (isString(fullName)) {
                const names = fullName.split('.');
                name = names[names.length - 1];
            }
            return name;
        }
        static isKnownTemplate(name, exports) {
            return Builder.knownTemplates.has(name);
        }
        static isKnownMultiTemplate(name, exports) {
            return Builder.knownMultiTemplates.has(name);
        }
        static addToComplexProperty(parent, complexProperty, elementModule) {
            // If property name is known collection we populate array with elements.
            const parentComponent = parent.component;
            if (ComponentParser.isKnownCollection(complexProperty.name, parent.exports)) {
                complexProperty.items.push(elementModule.component);
            }
            else if (parentComponent._addChildFromBuilder) {
                parentComponent._addChildFromBuilder(complexProperty.name, elementModule.component);
            }
            else {
                // Or simply assign the value;
                parentComponent[complexProperty.name] = elementModule.component;
            }
        }
        static isKnownCollection(name, context) {
            return Builder.knownCollections.has(name);
        }
    }
    ComponentParser.KNOWNCOLLECTIONS = 'knownCollections';
    ComponentParser.KNOWNTEMPLATES = 'knownTemplates';
    ComponentParser.KNOWNMULTITEMPLATES = 'knownMultiTemplates';
    __decorate([
        profile,
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [xml.ParserEvent]),
        __metadata("design:returntype", Object)
    ], ComponentParser.prototype, "buildComponent", null);
    xml2ui.ComponentParser = ComponentParser;
})(xml2ui || (xml2ui = {}));
//# sourceMappingURL=xml2ui.js.map