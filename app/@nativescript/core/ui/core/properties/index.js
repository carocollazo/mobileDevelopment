// Types.
import { WrappedValue } from '../../../data/observable';
import { Trace } from '../../../trace';
import { profile } from '../../../profiling';
/**
 * Value specifying that Property should be set to its initial value.
 */
export const unsetValue = new Object();
const cssPropertyNames = [];
const symbolPropertyMap = {};
const cssSymbolPropertyMap = {};
const inheritableProperties = new Array();
const inheritableCssProperties = new Array();
function print(map) {
    const symbols = Object.getOwnPropertySymbols(map);
    for (const symbol of symbols) {
        const prop = map[symbol];
        if (!prop.registered) {
            console.log(`Property ${prop.name} not Registered!!!!!`);
        }
    }
}
export function _printUnregisteredProperties() {
    print(symbolPropertyMap);
    print(cssSymbolPropertyMap);
}
export function _getProperties() {
    return getPropertiesFromMap(symbolPropertyMap);
}
export function _getStyleProperties() {
    return getPropertiesFromMap(cssSymbolPropertyMap);
}
export function isCssVariable(property) {
    return /^--[^,\s]+?$/.test(property);
}
export function isCssCalcExpression(value) {
    return value.includes('calc(');
}
export function isCssVariableExpression(value) {
    return value.includes('var(--');
}
export function _evaluateCssVariableExpression(view, cssName, value) {
    if (typeof value !== 'string') {
        return value;
    }
    if (!isCssVariableExpression(value)) {
        // Value is not using css-variable(s)
        return value;
    }
    let output = value.trim();
    // Evaluate every (and nested) css-variables in the value.
    let lastValue;
    while (lastValue !== output) {
        lastValue = output;
        const idx = output.lastIndexOf('var(');
        if (idx === -1) {
            continue;
        }
        const endIdx = output.indexOf(')', idx);
        if (endIdx === -1) {
            continue;
        }
        const matched = output
            .substring(idx + 4, endIdx)
            .split(',')
            .map((v) => v.trim())
            .filter((v) => !!v);
        const cssVariableName = matched.shift();
        let cssVariableValue = view.style.getCssVariable(cssVariableName);
        if (cssVariableValue === null && matched.length) {
            cssVariableValue = _evaluateCssVariableExpression(view, cssName, matched.join(', ')).split(',')[0];
        }
        if (!cssVariableValue) {
            cssVariableValue = 'unset';
        }
        output = `${output.substring(0, idx)}${cssVariableValue}${output.substring(endIdx + 1)}`;
    }
    return output;
}
export function _evaluateCssCalcExpression(value) {
    if (typeof value !== 'string') {
        return value;
    }
    if (isCssCalcExpression(value)) {
        // WORKAROUND: reduce-css-calc can't handle the dip-unit.
        return require('reduce-css-calc')(value.replace(/([0-9]+(\.[0-9]+)?)dip\b/g, '$1'));
    }
    else {
        return value;
    }
}
function getPropertiesFromMap(map) {
    const props = [];
    Object.getOwnPropertySymbols(map).forEach((symbol) => props.push(map[symbol]));
    return props;
}
export class Property {
    constructor(options) {
        this.enumerable = true;
        this.configurable = true;
        const propertyName = options.name;
        this.name = propertyName;
        const key = Symbol(propertyName + ':propertyKey');
        this.key = key;
        const getDefault = Symbol(propertyName + ':getDefault');
        this.getDefault = getDefault;
        const setNative = Symbol(propertyName + ':setNative');
        this.setNative = setNative;
        const defaultValueKey = Symbol(propertyName + ':nativeDefaultValue');
        this.defaultValueKey = defaultValueKey;
        const defaultValue = options.defaultValue;
        this.defaultValue = defaultValue;
        const eventName = propertyName + 'Change';
        let equalityComparer = options.equalityComparer;
        let affectsLayout = options.affectsLayout;
        let valueChanged = options.valueChanged;
        let valueConverter = options.valueConverter;
        this.overrideHandlers = function (options) {
            if (typeof options.equalityComparer !== 'undefined') {
                equalityComparer = options.equalityComparer;
            }
            if (typeof options.affectsLayout !== 'undefined') {
                affectsLayout = options.affectsLayout;
            }
            if (typeof options.valueChanged !== 'undefined') {
                valueChanged = options.valueChanged;
            }
            if (typeof options.valueConverter !== 'undefined') {
                valueConverter = options.valueConverter;
            }
        };
        const property = this;
        this.set = function (boxedValue) {
            const reset = boxedValue === unsetValue;
            let value;
            let wrapped;
            if (reset) {
                value = defaultValue;
            }
            else {
                wrapped = boxedValue && boxedValue.wrapped;
                value = wrapped ? WrappedValue.unwrap(boxedValue) : boxedValue;
                if (valueConverter && typeof value === 'string') {
                    value = valueConverter(value);
                }
            }
            const oldValue = key in this ? this[key] : defaultValue;
            const changed = equalityComparer ? !equalityComparer(oldValue, value) : oldValue !== value;
            if (wrapped || changed) {
                if (affectsLayout) {
                    this.requestLayout();
                }
                if (reset) {
                    delete this[key];
                    if (valueChanged) {
                        valueChanged(this, oldValue, value);
                    }
                    if (this[setNative]) {
                        if (this._suspendNativeUpdatesCount) {
                            if (this._suspendedUpdates) {
                                this._suspendedUpdates[propertyName] = property;
                            }
                        }
                        else {
                            if (defaultValueKey in this) {
                                this[setNative](this[defaultValueKey]);
                                delete this[defaultValueKey];
                            }
                            else {
                                this[setNative](defaultValue);
                            }
                        }
                    }
                }
                else {
                    this[key] = value;
                    if (valueChanged) {
                        valueChanged(this, oldValue, value);
                    }
                    if (this[setNative]) {
                        if (this._suspendNativeUpdatesCount) {
                            if (this._suspendedUpdates) {
                                this._suspendedUpdates[propertyName] = property;
                            }
                        }
                        else {
                            if (!(defaultValueKey in this)) {
                                this[defaultValueKey] = this[getDefault] ? this[getDefault]() : defaultValue;
                            }
                            this[setNative](value);
                        }
                    }
                }
                if (this.hasListeners(eventName)) {
                    this.notify({
                        object: this,
                        eventName,
                        propertyName,
                        value,
                        oldValue,
                    });
                }
                if (this.domNode) {
                    if (reset) {
                        this.domNode.attributeRemoved(propertyName);
                    }
                    else {
                        this.domNode.attributeModified(propertyName, value);
                    }
                }
            }
        };
        this.get = function () {
            return key in this ? this[key] : defaultValue;
        };
        this.nativeValueChange = function (owner, value) {
            const oldValue = key in owner ? owner[key] : defaultValue;
            const changed = equalityComparer ? !equalityComparer(oldValue, value) : oldValue !== value;
            if (changed) {
                owner[key] = value;
                if (valueChanged) {
                    valueChanged(owner, oldValue, value);
                }
                if (owner.nativeViewProtected && !(defaultValueKey in owner)) {
                    owner[defaultValueKey] = owner[getDefault] ? owner[getDefault]() : defaultValue;
                }
                if (owner.hasListeners(eventName)) {
                    owner.notify({
                        object: owner,
                        eventName,
                        propertyName,
                        value,
                        oldValue,
                    });
                }
                if (affectsLayout) {
                    owner.requestLayout();
                }
                if (owner.domNode) {
                    owner.domNode.attributeModified(propertyName, value);
                }
            }
        };
        symbolPropertyMap[key] = this;
    }
    register(cls) {
        if (this.registered) {
            throw new Error(`Property ${this.name} already registered.`);
        }
        this.registered = true;
        Object.defineProperty(cls.prototype, this.name, this);
    }
    isSet(instance) {
        return this.key in instance;
    }
}
Property.prototype.isStyleProperty = false;
export class CoercibleProperty extends Property {
    constructor(options) {
        super(options);
        const propertyName = options.name;
        const key = this.key;
        const getDefault = this.getDefault;
        const setNative = this.setNative;
        const defaultValueKey = this.defaultValueKey;
        const defaultValue = this.defaultValue;
        const coerceKey = Symbol(propertyName + ':coerceKey');
        const eventName = propertyName + 'Change';
        let affectsLayout = options.affectsLayout;
        let equalityComparer = options.equalityComparer;
        let valueChanged = options.valueChanged;
        let valueConverter = options.valueConverter;
        let coerceCallback = options.coerceValue;
        const property = this;
        this.overrideHandlers = function (options) {
            if (typeof options.equalityComparer !== 'undefined') {
                equalityComparer = options.equalityComparer;
            }
            if (typeof options.affectsLayout !== 'undefined') {
                affectsLayout = options.affectsLayout;
            }
            if (typeof options.valueChanged !== 'undefined') {
                valueChanged = options.valueChanged;
            }
            if (typeof options.valueConverter !== 'undefined') {
                valueConverter = options.valueConverter;
            }
            if (typeof options.coerceValue !== 'undefined') {
                coerceCallback = options.coerceValue;
            }
        };
        this.coerce = function (target) {
            const originalValue = coerceKey in target ? target[coerceKey] : defaultValue;
            // need that to make coercing but also fire change events
            target[propertyName] = originalValue;
        };
        this.set = function (boxedValue) {
            const reset = boxedValue === unsetValue;
            let value;
            let wrapped;
            if (reset) {
                value = defaultValue;
                delete this[coerceKey];
            }
            else {
                wrapped = boxedValue && boxedValue.wrapped;
                value = wrapped ? WrappedValue.unwrap(boxedValue) : boxedValue;
                if (valueConverter && typeof value === 'string') {
                    value = valueConverter(value);
                }
                this[coerceKey] = value;
                value = coerceCallback(this, value);
            }
            const oldValue = key in this ? this[key] : defaultValue;
            const changed = equalityComparer ? !equalityComparer(oldValue, value) : oldValue !== value;
            if (wrapped || changed) {
                if (reset) {
                    delete this[key];
                    if (valueChanged) {
                        valueChanged(this, oldValue, value);
                    }
                    if (this[setNative]) {
                        if (this._suspendNativeUpdatesCount) {
                            if (this._suspendedUpdates) {
                                this._suspendedUpdates[propertyName] = property;
                            }
                        }
                        else {
                            if (defaultValueKey in this) {
                                this[setNative](this[defaultValueKey]);
                                delete this[defaultValueKey];
                            }
                            else {
                                this[setNative](defaultValue);
                            }
                        }
                    }
                }
                else {
                    this[key] = value;
                    if (valueChanged) {
                        valueChanged(this, oldValue, value);
                    }
                    if (this[setNative]) {
                        if (this._suspendNativeUpdatesCount) {
                            if (this._suspendedUpdates) {
                                this._suspendedUpdates[propertyName] = property;
                            }
                        }
                        else {
                            if (!(defaultValueKey in this)) {
                                this[defaultValueKey] = this[getDefault] ? this[getDefault]() : defaultValue;
                            }
                            this[setNative](value);
                        }
                    }
                }
                if (this.hasListeners(eventName)) {
                    this.notify({
                        object: this,
                        eventName,
                        propertyName,
                        value,
                        oldValue,
                    });
                }
                if (affectsLayout) {
                    this.requestLayout();
                }
                if (this.domNode) {
                    if (reset) {
                        this.domNode.attributeRemoved(propertyName);
                    }
                    else {
                        this.domNode.attributeModified(propertyName, value);
                    }
                }
            }
        };
    }
}
export class InheritedProperty extends Property {
    constructor(options) {
        super(options);
        const name = options.name;
        const key = this.key;
        const defaultValue = options.defaultValue;
        const sourceKey = Symbol(name + ':valueSourceKey');
        this.sourceKey = sourceKey;
        const setBase = this.set;
        const setFunc = (valueSource) => function (value) {
            const that = this;
            let unboxedValue;
            let newValueSource;
            if (value === unsetValue) {
                // If unsetValue - we want to reset the property.
                const parent = that.parent;
                // If we have parent and it has non-default value we use as our inherited value.
                if (parent && parent[sourceKey] !== 0 /* Default */) {
                    unboxedValue = parent[name];
                    newValueSource = 1 /* Inherited */;
                }
                else {
                    unboxedValue = defaultValue;
                    newValueSource = 0 /* Default */;
                }
            }
            else {
                // else we are set through property set.
                unboxedValue = value;
                newValueSource = valueSource;
            }
            // take currentValue before calling base - base may change it.
            const currentValue = that[key];
            setBase.call(that, unboxedValue);
            const newValue = that[key];
            that[sourceKey] = newValueSource;
            if (currentValue !== newValue) {
                const reset = newValueSource === 0 /* Default */;
                that.eachChild((child) => {
                    const childValueSource = child[sourceKey] || 0 /* Default */;
                    if (reset) {
                        if (childValueSource === 1 /* Inherited */) {
                            setFunc.call(child, unsetValue);
                        }
                    }
                    else {
                        if (childValueSource <= 1 /* Inherited */) {
                            setInheritedValue.call(child, newValue);
                        }
                    }
                    return true;
                });
            }
        };
        const setInheritedValue = setFunc(1 /* Inherited */);
        this.setInheritedValue = setInheritedValue;
        this.set = setFunc(3 /* Local */);
        inheritableProperties.push(this);
    }
}
export class CssProperty {
    constructor(options) {
        const propertyName = options.name;
        this.name = propertyName;
        cssPropertyNames.push(options.cssName);
        this.cssName = `css:${options.cssName}`;
        this.cssLocalName = options.cssName;
        const key = Symbol(propertyName + ':propertyKey');
        this.key = key;
        const sourceKey = Symbol(propertyName + ':valueSourceKey');
        this.sourceKey = sourceKey;
        const getDefault = Symbol(propertyName + ':getDefault');
        this.getDefault = getDefault;
        const setNative = Symbol(propertyName + ':setNative');
        this.setNative = setNative;
        const defaultValueKey = Symbol(propertyName + ':nativeDefaultValue');
        this.defaultValueKey = defaultValueKey;
        const defaultValue = options.defaultValue;
        this.defaultValue = defaultValue;
        const eventName = propertyName + 'Change';
        let affectsLayout = options.affectsLayout;
        let equalityComparer = options.equalityComparer;
        let valueChanged = options.valueChanged;
        let valueConverter = options.valueConverter;
        this.overrideHandlers = function (options) {
            if (typeof options.equalityComparer !== 'undefined') {
                equalityComparer = options.equalityComparer;
            }
            if (typeof options.affectsLayout !== 'undefined') {
                affectsLayout = options.affectsLayout;
            }
            if (typeof options.valueChanged !== 'undefined') {
                valueChanged = options.valueChanged;
            }
            if (typeof options.valueConverter !== 'undefined') {
                valueConverter = options.valueConverter;
            }
        };
        const property = this;
        function setLocalValue(newValue) {
            const view = this.viewRef.get();
            if (!view) {
                Trace.write(`${newValue} not set to view because ".viewRef" is cleared`, Trace.categories.Style, Trace.messageType.warn);
                return;
            }
            const reset = newValue === unsetValue || newValue === '';
            let value;
            if (reset) {
                value = defaultValue;
                delete this[sourceKey];
            }
            else {
                this[sourceKey] = 3 /* Local */;
                value = valueConverter && typeof newValue === 'string' ? valueConverter(newValue) : newValue;
            }
            const oldValue = key in this ? this[key] : defaultValue;
            const changed = equalityComparer ? !equalityComparer(oldValue, value) : oldValue !== value;
            if (changed) {
                if (reset) {
                    delete this[key];
                    if (valueChanged) {
                        valueChanged(this, oldValue, value);
                    }
                    if (view[setNative]) {
                        if (view._suspendNativeUpdatesCount) {
                            if (view._suspendedUpdates) {
                                view._suspendedUpdates[propertyName] = property;
                            }
                        }
                        else {
                            if (defaultValueKey in this) {
                                view[setNative](this[defaultValueKey]);
                                delete this[defaultValueKey];
                            }
                            else {
                                view[setNative](defaultValue);
                            }
                        }
                    }
                }
                else {
                    this[key] = value;
                    if (valueChanged) {
                        valueChanged(this, oldValue, value);
                    }
                    if (view[setNative]) {
                        if (view._suspendNativeUpdatesCount) {
                            if (view._suspendedUpdates) {
                                view._suspendedUpdates[propertyName] = property;
                            }
                        }
                        else {
                            if (!(defaultValueKey in this)) {
                                this[defaultValueKey] = view[getDefault] ? view[getDefault]() : defaultValue;
                            }
                            view[setNative](value);
                        }
                    }
                }
                if (this.hasListeners(eventName)) {
                    this.notify({
                        object: this,
                        eventName,
                        propertyName,
                        value,
                        oldValue,
                    });
                }
                if (affectsLayout) {
                    view.requestLayout();
                }
            }
        }
        function setCssValue(newValue) {
            const view = this.viewRef.get();
            if (!view) {
                Trace.write(`${newValue} not set to view because ".viewRef" is cleared`, Trace.categories.Style, Trace.messageType.warn);
                return;
            }
            const currentValueSource = this[sourceKey] || 0 /* Default */;
            // We have localValueSource - NOOP.
            if (currentValueSource === 3 /* Local */) {
                return;
            }
            const reset = newValue === unsetValue || newValue === '';
            let value;
            if (reset) {
                value = defaultValue;
                delete this[sourceKey];
            }
            else {
                value = valueConverter && typeof newValue === 'string' ? valueConverter(newValue) : newValue;
                this[sourceKey] = 2 /* Css */;
            }
            const oldValue = key in this ? this[key] : defaultValue;
            const changed = equalityComparer ? !equalityComparer(oldValue, value) : oldValue !== value;
            if (changed) {
                if (reset) {
                    delete this[key];
                    if (valueChanged) {
                        valueChanged(this, oldValue, value);
                    }
                    if (view[setNative]) {
                        if (view._suspendNativeUpdatesCount) {
                            if (view._suspendedUpdates) {
                                view._suspendedUpdates[propertyName] = property;
                            }
                        }
                        else {
                            if (defaultValueKey in this) {
                                view[setNative](this[defaultValueKey]);
                                delete this[defaultValueKey];
                            }
                            else {
                                view[setNative](defaultValue);
                            }
                        }
                    }
                }
                else {
                    this[key] = value;
                    if (valueChanged) {
                        valueChanged(this, oldValue, value);
                    }
                    if (view[setNative]) {
                        if (view._suspendNativeUpdatesCount) {
                            if (view._suspendedUpdates) {
                                view._suspendedUpdates[propertyName] = property;
                            }
                        }
                        else {
                            if (!(defaultValueKey in this)) {
                                this[defaultValueKey] = view[getDefault] ? view[getDefault]() : defaultValue;
                            }
                            view[setNative](value);
                        }
                    }
                }
                if (this.hasListeners(eventName)) {
                    this.notify({
                        object: this,
                        eventName,
                        propertyName,
                        value,
                        oldValue,
                    });
                }
                if (affectsLayout) {
                    view.requestLayout();
                }
            }
        }
        function get() {
            return key in this ? this[key] : defaultValue;
        }
        this.cssValueDescriptor = {
            enumerable: true,
            configurable: true,
            get: get,
            set: setCssValue,
        };
        this.localValueDescriptor = {
            enumerable: true,
            configurable: true,
            get: get,
            set: setLocalValue,
        };
        cssSymbolPropertyMap[key] = this;
    }
    register(cls) {
        if (this.registered) {
            throw new Error(`Property ${this.name} already registered.`);
        }
        this.registered = true;
        Object.defineProperty(cls.prototype, this.name, this.localValueDescriptor);
        Object.defineProperty(cls.prototype, this.cssName, this.cssValueDescriptor);
        if (this.cssLocalName !== this.cssName) {
            Object.defineProperty(cls.prototype, this.cssLocalName, this.localValueDescriptor);
        }
    }
    isSet(instance) {
        return this.key in instance;
    }
}
CssProperty.prototype.isStyleProperty = true;
export class CssAnimationProperty {
    constructor(options) {
        const propertyName = options.name;
        this.name = propertyName;
        cssPropertyNames.push(options.cssName);
        CssAnimationProperty.properties[propertyName] = this;
        if (options.cssName && options.cssName !== propertyName) {
            CssAnimationProperty.properties[options.cssName] = this;
        }
        this._valueConverter = options.valueConverter;
        const cssLocalName = options.cssName || propertyName;
        this.cssLocalName = cssLocalName;
        const cssName = 'css:' + cssLocalName;
        this.cssName = cssName;
        const keyframeName = 'keyframe:' + propertyName;
        this.keyframe = keyframeName;
        const defaultName = 'default:' + propertyName;
        const defaultValueKey = Symbol(defaultName);
        this.defaultValueKey = defaultValueKey;
        this.defaultValue = options.defaultValue;
        const cssValue = Symbol(cssName);
        const styleValue = Symbol(`local:${propertyName}`);
        const keyframeValue = Symbol(keyframeName);
        const computedValue = Symbol('computed-value:' + propertyName);
        this.key = computedValue;
        const computedSource = Symbol('computed-source:' + propertyName);
        this.source = computedSource;
        this.getDefault = Symbol(propertyName + ':getDefault');
        const getDefault = this.getDefault;
        const setNative = (this.setNative = Symbol(propertyName + ':setNative'));
        const eventName = propertyName + 'Change';
        const property = this;
        function descriptor(symbol, propertySource, enumerable, configurable, getsComputed) {
            return {
                enumerable,
                configurable,
                get: getsComputed
                    ? function () {
                        return this[computedValue];
                    }
                    : function () {
                        return this[symbol];
                    },
                set(boxedValue) {
                    const view = this.viewRef.get();
                    if (!view) {
                        Trace.write(`${boxedValue} not set to view because ".viewRef" is cleared`, Trace.categories.Animation, Trace.messageType.warn);
                        return;
                    }
                    const oldValue = this[computedValue];
                    const oldSource = this[computedSource];
                    const wasSet = oldSource !== 0 /* Default */;
                    const reset = boxedValue === unsetValue || boxedValue === '';
                    if (reset) {
                        this[symbol] = unsetValue;
                        if (this[computedSource] === propertySource) {
                            // Fallback to lower value source.
                            if (this[styleValue] !== unsetValue) {
                                this[computedSource] = 3 /* Local */;
                                this[computedValue] = this[styleValue];
                            }
                            else if (this[cssValue] !== unsetValue) {
                                this[computedSource] = 2 /* Css */;
                                this[computedValue] = this[cssValue];
                            }
                            else {
                                delete this[computedSource];
                                delete this[computedValue];
                            }
                        }
                    }
                    else {
                        if (options.valueConverter && typeof boxedValue === 'string') {
                            boxedValue = options.valueConverter(boxedValue);
                        }
                        this[symbol] = boxedValue;
                        if (this[computedSource] <= propertySource) {
                            this[computedSource] = propertySource;
                            this[computedValue] = boxedValue;
                        }
                    }
                    const value = this[computedValue];
                    const source = this[computedSource];
                    const isSet = source !== 0 /* Default */;
                    const computedValueChanged = oldValue !== value && (!options.equalityComparer || !options.equalityComparer(oldValue, value));
                    if (computedValueChanged && options.valueChanged) {
                        options.valueChanged(this, oldValue, value);
                    }
                    if (view[setNative] && (computedValueChanged || isSet !== wasSet)) {
                        if (view._suspendNativeUpdatesCount) {
                            if (view._suspendedUpdates) {
                                view._suspendedUpdates[propertyName] = property;
                            }
                        }
                        else {
                            if (isSet) {
                                if (!wasSet && !(defaultValueKey in this)) {
                                    this[defaultValueKey] = view[getDefault] ? view[getDefault]() : options.defaultValue;
                                }
                                view[setNative](value);
                            }
                            else if (wasSet) {
                                if (defaultValueKey in this) {
                                    view[setNative](this[defaultValueKey]);
                                }
                                else {
                                    view[setNative](options.defaultValue);
                                }
                            }
                        }
                    }
                    if (computedValueChanged && this.hasListeners(eventName)) {
                        this.notify({
                            object: this,
                            eventName,
                            propertyName,
                            value,
                            oldValue,
                        });
                    }
                },
            };
        }
        const defaultPropertyDescriptor = descriptor(defaultValueKey, 0 /* Default */, false, false, false);
        const cssPropertyDescriptor = descriptor(cssValue, 2 /* Css */, false, false, false);
        const stylePropertyDescriptor = descriptor(styleValue, 3 /* Local */, true, true, true);
        const keyframePropertyDescriptor = descriptor(keyframeValue, 4 /* Keyframe */, false, false, false);
        symbolPropertyMap[computedValue] = this;
        cssSymbolPropertyMap[computedValue] = this;
        this.register = (cls) => {
            cls.prototype[computedValue] = options.defaultValue;
            cls.prototype[computedSource] = 0 /* Default */;
            cls.prototype[cssValue] = unsetValue;
            cls.prototype[styleValue] = unsetValue;
            cls.prototype[keyframeValue] = unsetValue;
            Object.defineProperty(cls.prototype, defaultName, defaultPropertyDescriptor);
            Object.defineProperty(cls.prototype, cssName, cssPropertyDescriptor);
            Object.defineProperty(cls.prototype, propertyName, stylePropertyDescriptor);
            if (options.cssName && options.cssName !== options.name) {
                Object.defineProperty(cls.prototype, options.cssName, stylePropertyDescriptor);
            }
            Object.defineProperty(cls.prototype, keyframeName, keyframePropertyDescriptor);
        };
    }
    _initDefaultNativeValue(target) {
        const view = target.viewRef.get();
        if (!view) {
            Trace.write(`_initDefaultNativeValue not executed to view because ".viewRef" is cleared`, Trace.categories.Animation, Trace.messageType.warn);
            return;
        }
        const defaultValueKey = this.defaultValueKey;
        if (!(defaultValueKey in target)) {
            const getDefault = this.getDefault;
            target[defaultValueKey] = view[getDefault] ? view[getDefault]() : this.defaultValue;
        }
    }
    static _getByCssName(name) {
        return this.properties[name];
    }
    static _getPropertyNames() {
        return Object.keys(CssAnimationProperty.properties);
    }
    isSet(instance) {
        return instance[this.source] !== 0 /* Default */;
    }
}
CssAnimationProperty.properties = {};
CssAnimationProperty.prototype.isStyleProperty = true;
export class InheritedCssProperty extends CssProperty {
    constructor(options) {
        super(options);
        const propertyName = options.name;
        const key = this.key;
        const sourceKey = this.sourceKey;
        const getDefault = this.getDefault;
        const setNative = this.setNative;
        const defaultValueKey = this.defaultValueKey;
        const eventName = propertyName + 'Change';
        let defaultValue = options.defaultValue;
        let affectsLayout = options.affectsLayout;
        let equalityComparer = options.equalityComparer;
        let valueChanged = options.valueChanged;
        let valueConverter = options.valueConverter;
        const property = this;
        this.overrideHandlers = function (options) {
            if (typeof options.equalityComparer !== 'undefined') {
                equalityComparer = options.equalityComparer;
            }
            if (typeof options.affectsLayout !== 'undefined') {
                affectsLayout = options.affectsLayout;
            }
            if (typeof options.valueChanged !== 'undefined') {
                valueChanged = options.valueChanged;
            }
            if (typeof options.valueConverter !== 'undefined') {
                valueConverter = options.valueConverter;
            }
        };
        const setFunc = (valueSource) => function (boxedValue) {
            const view = this.viewRef.get();
            if (!view) {
                Trace.write(`${boxedValue} not set to view's property because ".viewRef" is cleared`, Trace.categories.Style, Trace.messageType.warn);
                return;
            }
            const reset = boxedValue === unsetValue || boxedValue === '';
            const currentValueSource = this[sourceKey] || 0 /* Default */;
            if (reset) {
                // If we want to reset cssValue and we have localValue - return;
                if (valueSource === 2 /* Css */ && currentValueSource === 3 /* Local */) {
                    return;
                }
            }
            else {
                if (currentValueSource > valueSource) {
                    return;
                }
            }
            const oldValue = key in this ? this[key] : defaultValue;
            let value;
            let unsetNativeValue = false;
            if (reset) {
                // If unsetValue - we want to reset this property.
                const parent = view.parent;
                const style = parent ? parent.style : null;
                // If we have parent and it has non-default value we use as our inherited value.
                if (style && style[sourceKey] > 0 /* Default */) {
                    value = style[propertyName];
                    this[sourceKey] = 1 /* Inherited */;
                    this[key] = value;
                }
                else {
                    value = defaultValue;
                    delete this[sourceKey];
                    delete this[key];
                    unsetNativeValue = true;
                }
            }
            else {
                this[sourceKey] = valueSource;
                if (valueConverter && typeof boxedValue === 'string') {
                    value = valueConverter(boxedValue);
                }
                else {
                    value = boxedValue;
                }
                this[key] = value;
            }
            const changed = equalityComparer ? !equalityComparer(oldValue, value) : oldValue !== value;
            if (changed) {
                if (valueChanged) {
                    valueChanged(this, oldValue, value);
                }
                if (view[setNative]) {
                    if (view._suspendNativeUpdatesCount) {
                        if (view._suspendedUpdates) {
                            view._suspendedUpdates[propertyName] = property;
                        }
                    }
                    else {
                        if (unsetNativeValue) {
                            if (defaultValueKey in this) {
                                view[setNative](this[defaultValueKey]);
                                delete this[defaultValueKey];
                            }
                            else {
                                view[setNative](defaultValue);
                            }
                        }
                        else {
                            if (!(defaultValueKey in this)) {
                                this[defaultValueKey] = view[getDefault] ? view[getDefault]() : defaultValue;
                            }
                            view[setNative](value);
                        }
                    }
                }
                if (this.hasListeners(eventName)) {
                    this.notify({
                        object: this,
                        eventName,
                        propertyName,
                        value,
                        oldValue,
                    });
                }
                if (affectsLayout) {
                    view.requestLayout();
                }
                view.eachChild((child) => {
                    const childStyle = child.style;
                    const childValueSource = childStyle[sourceKey] || 0 /* Default */;
                    if (reset) {
                        if (childValueSource === 1 /* Inherited */) {
                            setDefaultFunc.call(childStyle, unsetValue);
                        }
                    }
                    else {
                        if (childValueSource <= 1 /* Inherited */) {
                            setInheritedFunc.call(childStyle, value);
                        }
                    }
                    return true;
                });
            }
        };
        const setDefaultFunc = setFunc(0 /* Default */);
        const setInheritedFunc = setFunc(1 /* Inherited */);
        this.setInheritedValue = setInheritedFunc;
        this.cssValueDescriptor.set = setFunc(2 /* Css */);
        this.localValueDescriptor.set = setFunc(3 /* Local */);
        inheritableCssProperties.push(this);
    }
}
export class ShorthandProperty {
    constructor(options) {
        this.name = options.name;
        const key = Symbol(this.name + ':propertyKey');
        this.key = key;
        this.cssName = `css:${options.cssName}`;
        this.cssLocalName = `${options.cssName}`;
        const converter = options.converter;
        function setLocalValue(value) {
            const view = this.viewRef.get();
            if (!view) {
                Trace.write(`setLocalValue not executed to view because ".viewRef" is cleared`, Trace.categories.Animation, Trace.messageType.warn);
                return;
            }
            view._batchUpdate(() => {
                for (const [p, v] of converter(value)) {
                    this[p.name] = v;
                }
            });
        }
        function setCssValue(value) {
            const view = this.viewRef.get();
            if (!view) {
                Trace.write(`setCssValue not executed to view because ".viewRef" is cleared`, Trace.categories.Animation, Trace.messageType.warn);
                return;
            }
            view._batchUpdate(() => {
                for (const [p, v] of converter(value)) {
                    this[p.cssName] = v;
                }
            });
        }
        this.cssValueDescriptor = {
            enumerable: true,
            configurable: true,
            get: options.getter,
            set: setCssValue,
        };
        this.localValueDescriptor = {
            enumerable: true,
            configurable: true,
            get: options.getter,
            set: setLocalValue,
        };
        this.propertyBagDescriptor = {
            enumerable: false,
            configurable: true,
            set(value) {
                converter(value).forEach(([property, value]) => {
                    this[property.cssLocalName] = value;
                });
            },
        };
        cssSymbolPropertyMap[key] = this;
    }
    register(cls) {
        if (this.registered) {
            throw new Error(`Property ${this.name} already registered.`);
        }
        this.registered = true;
        Object.defineProperty(cls.prototype, this.name, this.localValueDescriptor);
        Object.defineProperty(cls.prototype, this.cssName, this.cssValueDescriptor);
        if (this.cssLocalName !== this.cssName) {
            Object.defineProperty(cls.prototype, this.cssLocalName, this.localValueDescriptor);
        }
        Object.defineProperty(cls.prototype.PropertyBag, this.cssLocalName, this.propertyBagDescriptor);
    }
}
function inheritablePropertyValuesOn(view) {
    const array = new Array();
    for (const prop of inheritableProperties) {
        const sourceKey = prop.sourceKey;
        const valueSource = view[sourceKey] || 0 /* Default */;
        if (valueSource !== 0 /* Default */) {
            // use prop.name as it will return value or default value.
            // prop.key will return undefined if property is set the same value as default one.
            array.push({ property: prop, value: view[prop.name] });
        }
    }
    return array;
}
function inheritableCssPropertyValuesOn(style) {
    const array = new Array();
    for (const prop of inheritableCssProperties) {
        const sourceKey = prop.sourceKey;
        const valueSource = style[sourceKey] || 0 /* Default */;
        if (valueSource !== 0 /* Default */) {
            // use prop.name as it will return value or default value.
            // prop.key will return undefined if property is set the same value as default one.
            array.push({ property: prop, value: style[prop.name] });
        }
    }
    return array;
}
export const initNativeView = profile('"properties".initNativeView', function initNativeView(view) {
    if (view._suspendedUpdates) {
        applyPendingNativeSetters(view);
    }
    else {
        applyAllNativeSetters(view);
    }
    // Would it be faster to delete all members of the old object?
    view._suspendedUpdates = {};
});
export function applyPendingNativeSetters(view) {
    // TODO: Check what happens if a view was suspended and its value was reset, or set back to default!
    const suspendedUpdates = view._suspendedUpdates;
    for (const propertyName in suspendedUpdates) {
        const property = suspendedUpdates[propertyName];
        const setNative = property.setNative;
        if (view[setNative]) {
            const { getDefault, isStyleProperty, defaultValueKey, defaultValue } = property;
            let value;
            if (isStyleProperty) {
                const style = view.style;
                if (property.isSet(view.style)) {
                    if (!(defaultValueKey in style)) {
                        style[defaultValueKey] = view[getDefault] ? view[getDefault]() : defaultValue;
                    }
                    value = view.style[propertyName];
                }
                else {
                    value = style[defaultValueKey];
                }
            }
            else {
                if (property.isSet(view)) {
                    if (!(defaultValueKey in view)) {
                        view[defaultValueKey] = view[getDefault] ? view[getDefault]() : defaultValue;
                    }
                    value = view[propertyName];
                }
                else {
                    value = view[defaultValueKey];
                }
            }
            // TODO: Only if value is different from the value before the scope was created.
            view[setNative](value);
        }
    }
}
export function applyAllNativeSetters(view) {
    let symbols = Object.getOwnPropertySymbols(view);
    for (const symbol of symbols) {
        const property = symbolPropertyMap[symbol];
        if (!property) {
            continue;
        }
        const setNative = property.setNative;
        const getDefault = property.getDefault;
        if (setNative in view) {
            const defaultValueKey = property.defaultValueKey;
            if (!(defaultValueKey in view)) {
                view[defaultValueKey] = view[getDefault] ? view[getDefault]() : property.defaultValue;
            }
            const value = view[symbol];
            view[setNative](value);
        }
    }
    const style = view.style;
    symbols = Object.getOwnPropertySymbols(style);
    for (const symbol of symbols) {
        const property = cssSymbolPropertyMap[symbol];
        if (!property) {
            continue;
        }
        if (view[property.setNative]) {
            const defaultValueKey = property.defaultValueKey;
            if (!(defaultValueKey in style)) {
                style[defaultValueKey] = view[property.getDefault] ? view[property.getDefault]() : property.defaultValue;
            }
            const value = style[symbol];
            view[property.setNative](value);
        }
    }
}
export function resetNativeView(view) {
    let symbols = Object.getOwnPropertySymbols(view);
    for (const symbol of symbols) {
        const property = symbolPropertyMap[symbol];
        if (!property) {
            continue;
        }
        if (view[property.setNative]) {
            if (property.defaultValueKey in view) {
                view[property.setNative](view[property.defaultValueKey]);
                delete view[property.defaultValueKey];
            }
            else {
                view[property.setNative](property.defaultValue);
            }
        }
    }
    const style = view.style;
    symbols = Object.getOwnPropertySymbols(style);
    for (const symbol of symbols) {
        const property = cssSymbolPropertyMap[symbol];
        if (!property) {
            continue;
        }
        if (view[property.setNative]) {
            if (property.defaultValueKey in style) {
                view[property.setNative](style[property.defaultValueKey]);
                delete style[property.defaultValueKey];
            }
            else {
                view[property.setNative](property.defaultValue);
            }
        }
    }
}
export function clearInheritedProperties(view) {
    for (const prop of inheritableProperties) {
        const sourceKey = prop.sourceKey;
        if (view[sourceKey] === 1 /* Inherited */) {
            prop.set.call(view, unsetValue);
        }
    }
    const style = view.style;
    for (const prop of inheritableCssProperties) {
        const sourceKey = prop.sourceKey;
        if (style[sourceKey] === 1 /* Inherited */) {
            prop.setInheritedValue.call(style, unsetValue);
        }
    }
}
export function resetCSSProperties(style) {
    const symbols = Object.getOwnPropertySymbols(style);
    for (const symbol of symbols) {
        let cssProperty;
        if ((cssProperty = cssSymbolPropertyMap[symbol])) {
            style[cssProperty.cssName] = unsetValue;
            if (cssProperty instanceof CssAnimationProperty) {
                style[cssProperty.keyframe] = unsetValue;
            }
        }
    }
}
export function propagateInheritableProperties(view, child) {
    const inheritablePropertyValues = inheritablePropertyValuesOn(view);
    for (const pair of inheritablePropertyValues) {
        const prop = pair.property;
        const sourceKey = prop.sourceKey;
        const currentValueSource = child[sourceKey] || 0 /* Default */;
        if (currentValueSource <= 1 /* Inherited */) {
            prop.setInheritedValue.call(child, pair.value);
        }
    }
}
export function propagateInheritableCssProperties(parentStyle, childStyle) {
    const inheritableCssPropertyValues = inheritableCssPropertyValuesOn(parentStyle);
    for (const pair of inheritableCssPropertyValues) {
        const prop = pair.property;
        const sourceKey = prop.sourceKey;
        const currentValueSource = childStyle[sourceKey] || 0 /* Default */;
        if (currentValueSource <= 1 /* Inherited */) {
            prop.setInheritedValue.call(childStyle, pair.value, 1 /* Inherited */);
        }
    }
}
export function makeValidator(...values) {
    const set = new Set(values);
    return (value) => set.has(value);
}
export function makeParser(isValid, allowNumbers = false) {
    return (value) => {
        const lower = value && value.toLowerCase();
        if (isValid(lower)) {
            return lower;
        }
        else {
            if (allowNumbers) {
                const convNumber = +value;
                if (!isNaN(convNumber)) {
                    return value;
                }
            }
            throw new Error('Invalid value: ' + value);
        }
    };
}
export function getSetProperties(view) {
    const result = [];
    Object.getOwnPropertyNames(view).forEach((prop) => {
        result.push([prop, view[prop]]);
    });
    const symbols = Object.getOwnPropertySymbols(view);
    for (const symbol of symbols) {
        const property = symbolPropertyMap[symbol];
        if (!property) {
            continue;
        }
        const value = view[property.key];
        result.push([property.name, value]);
    }
    return result;
}
export function getComputedCssValues(view) {
    const result = [];
    const style = view.style;
    for (const prop of cssPropertyNames) {
        result.push([prop, style[prop]]);
    }
    // Add these to enable box model in chrome-devtools styles tab
    result.push(['top', 'auto']);
    result.push(['left', 'auto']);
    result.push(['bottom', 'auto']);
    result.push(['right', 'auto']);
    return result;
}
//# sourceMappingURL=index.js.map