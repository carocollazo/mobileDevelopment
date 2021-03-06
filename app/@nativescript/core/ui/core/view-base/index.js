import { Property, InheritedProperty, clearInheritedProperties, propagateInheritableProperties, propagateInheritableCssProperties, initNativeView } from '../properties';
import { CSSUtils } from '../../../css/system-classes';
import { Source } from '../../../utils/debug';
import { Binding } from '../bindable';
import { Trace } from '../../../trace';
import { Observable, WrappedValue } from '../../../data/observable';
import { Style } from '../../styling/style';
import { paddingTopProperty, paddingRightProperty, paddingBottomProperty, paddingLeftProperty } from '../../styling/style-properties';
// TODO: Remove this import!
import { getClass } from '../../../utils/types';
import { profile } from '../../../profiling';
import * as ssm from '../../styling/style-scope';
let domNodeModule;
function ensuredomNodeModule() {
    if (!domNodeModule) {
        domNodeModule = require('../../../debugger/dom-node');
    }
}
let styleScopeModule;
function ensureStyleScopeModule() {
    if (!styleScopeModule) {
        styleScopeModule = require('../../styling/style-scope');
    }
}
const defaultBindingSource = {};
export function getAncestor(view, criterion) {
    let matcher = null;
    if (typeof criterion === 'string') {
        matcher = (view) => view.typeName === criterion;
    }
    else {
        matcher = (view) => view instanceof criterion;
    }
    for (let parent = view.parent; parent != null; parent = parent.parent) {
        if (matcher(parent)) {
            return parent;
        }
    }
    return null;
}
export function getViewById(view, id) {
    if (!view) {
        return undefined;
    }
    if (view.id === id) {
        return view;
    }
    let retVal;
    const descendantsCallback = function (child) {
        if (child.id === id) {
            retVal = child;
            // break the iteration by returning false
            return false;
        }
        return true;
    };
    eachDescendant(view, descendantsCallback);
    return retVal;
}
export function getViewByDomId(view, domId) {
    if (!view) {
        return undefined;
    }
    if (view._domId === domId) {
        return view;
    }
    let retVal;
    const descendantsCallback = function (child) {
        if (view._domId === domId) {
            retVal = child;
            // break the iteration by returning false
            return false;
        }
        return true;
    };
    eachDescendant(view, descendantsCallback);
    return retVal;
}
export function eachDescendant(view, callback) {
    if (!callback || !view) {
        return;
    }
    let continueIteration;
    const localCallback = function (child) {
        continueIteration = callback(child);
        if (continueIteration) {
            child.eachChild(localCallback);
        }
        return continueIteration;
    };
    view.eachChild(localCallback);
}
let viewIdCounter = 1;
// const contextMap = new WeakMap<Object, Map<string, WeakRef<Object>[]>>();
// function getNativeView(context: Object, typeName: string): Object {
//     let typeMap = contextMap.get(context);
//     if (!typeMap) {
//         typeMap = new Map<string, WeakRef<Object>[]>();
//         contextMap.set(context, typeMap);
//         return undefined;
//     }
//     const array = typeMap.get(typeName);
//     if (array) {
//         let nativeView;
//         while (array.length > 0) {
//             const weakRef = array.pop();
//             nativeView = weakRef.get();
//             if (nativeView) {
//                 return nativeView;
//             }
//         }
//     }
//     return undefined;
// }
// function putNativeView(context: Object, view: ViewBase): void {
//     const typeMap = contextMap.get(context);
//     const typeName = view.typeName;
//     let list = typeMap.get(typeName);
//     if (!list) {
//         list = [];
//         typeMap.set(typeName, list);
//     }
//     list.push(new WeakRef(view.nativeViewProtected));
// }
var Flags;
(function (Flags) {
    Flags["superOnLoadedCalled"] = "Loaded";
    Flags["superOnUnloadedCalled"] = "Unloaded";
})(Flags || (Flags = {}));
var SuspendType;
(function (SuspendType) {
    SuspendType[SuspendType["Incremental"] = 0] = "Incremental";
    SuspendType[SuspendType["Loaded"] = 1048576] = "Loaded";
    SuspendType[SuspendType["NativeView"] = 2097152] = "NativeView";
    SuspendType[SuspendType["UISetup"] = 4194304] = "UISetup";
    SuspendType[SuspendType["IncrementalCountMask"] = -7340033] = "IncrementalCountMask";
})(SuspendType || (SuspendType = {}));
(function (SuspendType) {
    function toString(type) {
        return (type ? 'suspended' : 'resumed') + '(' + 'Incremental: ' + (type & SuspendType.IncrementalCountMask) + ', ' + 'Loaded: ' + !(type & SuspendType.Loaded) + ', ' + 'NativeView: ' + !(type & SuspendType.NativeView) + ', ' + 'UISetup: ' + !(type & SuspendType.UISetup) + ')';
    }
    SuspendType.toString = toString;
})(SuspendType || (SuspendType = {}));
export class ViewBase extends Observable {
    constructor() {
        super();
        this._onLoadedCalled = false;
        this._onUnloadedCalled = false;
        this._cssState = new ssm.CssState(new WeakRef(this));
        this.pseudoClassAliases = {
            highlighted: ['active', 'pressed'],
        };
        this.cssClasses = new Set();
        this.cssPseudoClasses = new Set();
        this._domId = viewIdCounter++;
        this._style = new Style(new WeakRef(this));
        this.notify({ eventName: ViewBase.createdEvent, type: this.constructor.name, object: this });
    }
    // Used in Angular.
    get parentNode() {
        return this._templateParent || this.parent;
    }
    set parentNode(node) {
        this._templateParent = node;
    }
    get nativeView() {
        // this._disableNativeViewRecycling = true;
        return this.nativeViewProtected;
    }
    set nativeView(value) {
        this.setNativeView(value);
    }
    // TODO: Use Type.prototype.typeName instead.
    get typeName() {
        return getClass(this);
    }
    get style() {
        return this._style;
    }
    set style(inlineStyle /* | string */) {
        if (typeof inlineStyle === 'string') {
            this.setInlineStyle(inlineStyle);
        }
        else {
            throw new Error('View.style property is read-only.');
        }
    }
    get android() {
        // this._disableNativeViewRecycling = true;
        return this._androidView;
    }
    get ios() {
        // this._disableNativeViewRecycling = true;
        return this._iosView;
    }
    get isLoaded() {
        return this._isLoaded;
    }
    get ['class']() {
        return this.className;
    }
    set ['class'](v) {
        this.className = v;
    }
    getViewById(id) {
        return getViewById(this, id);
    }
    getViewByDomId(domId) {
        return getViewByDomId(this, domId);
    }
    get page() {
        if (this.parent) {
            return this.parent.page;
        }
        return null;
    }
    ensureDomNode() {
        if (!this.domNode) {
            ensuredomNodeModule();
            this.domNode = new domNodeModule.DOMNode(this);
        }
    }
    // Overridden so we don't raise `propertyChange`
    // The property will raise its own event.
    set(name, value) {
        this[name] = WrappedValue.unwrap(value);
    }
    onLoaded() {
        this.setFlag(Flags.superOnLoadedCalled, true);
        if (this._isLoaded) {
            return;
        }
        this._isLoaded = true;
        this._cssState.onLoaded();
        this._resumeNativeUpdates(SuspendType.Loaded);
        this.eachChild((child) => {
            this.loadView(child);
            return true;
        });
        this._emit('loaded');
    }
    onUnloaded() {
        this.setFlag(Flags.superOnUnloadedCalled, true);
        if (!this._isLoaded) {
            return;
        }
        this._suspendNativeUpdates(SuspendType.Loaded);
        this.eachChild((child) => {
            this.unloadView(child);
            return true;
        });
        this._isLoaded = false;
        this._cssState.onUnloaded();
        this._emit('unloaded');
    }
    _layoutParent() {
        if (this.parent) {
            this.parent._layoutParent();
        }
    }
    _suspendNativeUpdates(type) {
        if (type) {
            this._suspendNativeUpdatesCount = this._suspendNativeUpdatesCount | type;
        }
        else {
            this._suspendNativeUpdatesCount++;
        }
    }
    _resumeNativeUpdates(type) {
        if (type) {
            this._suspendNativeUpdatesCount = this._suspendNativeUpdatesCount & ~type;
        }
        else {
            if ((this._suspendNativeUpdatesCount & SuspendType.IncrementalCountMask) === 0) {
                throw new Error(`Invalid call to ${this}._resumeNativeUpdates`);
            }
            this._suspendNativeUpdatesCount--;
        }
        if (!this._suspendNativeUpdatesCount) {
            this.onResumeNativeUpdates();
        }
    }
    _batchUpdate(callback) {
        try {
            this._suspendNativeUpdates(SuspendType.Incremental);
            return callback();
        }
        finally {
            this._resumeNativeUpdates(SuspendType.Incremental);
        }
    }
    setFlag(flag, value) {
        switch (flag) {
            case Flags.superOnLoadedCalled:
                this._onLoadedCalled = value;
                break;
            case Flags.superOnUnloadedCalled:
                this._onUnloadedCalled = value;
                break;
        }
    }
    isFlagSet(flag) {
        switch (flag) {
            case Flags.superOnLoadedCalled:
                return this._onLoadedCalled;
            case Flags.superOnUnloadedCalled:
                return this._onUnloadedCalled;
        }
    }
    callFunctionWithSuper(flag, func) {
        this.setFlag(flag, false);
        func();
        if (!this.isFlagSet(flag)) {
            throw new Error(`super.${flag} not called in ${this}`);
        }
    }
    callLoaded() {
        this.callFunctionWithSuper(Flags.superOnLoadedCalled, () => this.onLoaded());
    }
    callUnloaded() {
        this.callFunctionWithSuper(Flags.superOnUnloadedCalled, () => this.onUnloaded());
    }
    notifyPseudoClassChanged(pseudoClass) {
        this.notify({ eventName: ':' + pseudoClass, object: this });
    }
    getAllAliasedStates(name) {
        const allStates = [];
        allStates.push(name);
        if (name in this.pseudoClassAliases) {
            for (let i = 0; i < this.pseudoClassAliases[name].length; i++) {
                allStates.push(this.pseudoClassAliases[name][i]);
            }
        }
        return allStates;
    }
    addPseudoClass(name) {
        const allStates = this.getAllAliasedStates(name);
        for (let i = 0; i < allStates.length; i++) {
            if (!this.cssPseudoClasses.has(allStates[i])) {
                this.cssPseudoClasses.add(allStates[i]);
                this.notifyPseudoClassChanged(allStates[i]);
            }
        }
    }
    deletePseudoClass(name) {
        const allStates = this.getAllAliasedStates(name);
        for (let i = 0; i < allStates.length; i++) {
            if (this.cssPseudoClasses.has(allStates[i])) {
                this.cssPseudoClasses.delete(allStates[i]);
                this.notifyPseudoClassChanged(allStates[i]);
            }
        }
    }
    bindingContextChanged(data) {
        this.bindings.get('bindingContext').bind(data.value);
    }
    bind(options, source = defaultBindingSource) {
        const targetProperty = options.targetProperty;
        this.unbind(targetProperty);
        if (!this.bindings) {
            this.bindings = new Map();
        }
        const binding = new Binding(this, options);
        this.bindings.set(targetProperty, binding);
        let bindingSource = source;
        if (bindingSource === defaultBindingSource) {
            bindingSource = this.bindingContext;
            binding.sourceIsBindingContext = true;
            if (targetProperty === 'bindingContext') {
                this.bindingContextBoundToParentBindingContextChanged = true;
                const parent = this.parent;
                if (parent) {
                    parent.on('bindingContextChange', this.bindingContextChanged, this);
                }
                else {
                    this.shouldAddHandlerToParentBindingContextChanged = true;
                }
            }
        }
        binding.bind(bindingSource);
    }
    unbind(property) {
        const bindings = this.bindings;
        if (!bindings) {
            return;
        }
        const binding = bindings.get(property);
        if (binding) {
            binding.unbind();
            bindings.delete(property);
            if (binding.sourceIsBindingContext) {
                if (property === 'bindingContext') {
                    this.shouldAddHandlerToParentBindingContextChanged = false;
                    this.bindingContextBoundToParentBindingContextChanged = false;
                    const parent = this.parent;
                    if (parent) {
                        parent.off('bindingContextChange', this.bindingContextChanged, this);
                    }
                }
            }
        }
    }
    performLayout(currentRun = 0) {
        // if there's an animation in progress we need to delay the layout
        // we've added a guard of 5000 milliseconds execution
        // to make sure that the layout will happen even if the animation haven't finished in 5 seconds
        if (this._shouldDelayLayout() && currentRun < 100) {
            setTimeout(() => this.performLayout(currentRun), currentRun);
            currentRun++;
        }
        else {
            this.parent.requestLayout();
        }
    }
    requestLayout() {
        // Default implementation for non View instances (like TabViewItem).
        const parent = this.parent;
        if (parent) {
            this.performLayout();
        }
    }
    eachChild(callback) {
        //
    }
    _addView(view, atIndex) {
        if (Trace.isEnabled()) {
            Trace.write(`${this}._addView(${view}, ${atIndex})`, Trace.categories.ViewHierarchy);
        }
        if (!view) {
            throw new Error('Expecting a valid View instance.');
        }
        if (!(view instanceof ViewBase)) {
            throw new Error(view + ' is not a valid View instance.');
        }
        if (view.parent) {
            throw new Error('View already has a parent. View: ' + view + ' Parent: ' + view.parent);
        }
        view.parent = this;
        this._addViewCore(view, atIndex);
        view._parentChanged(null);
        if (this.domNode) {
            this.domNode.onChildAdded(view);
        }
    }
    _addViewCore(view, atIndex) {
        propagateInheritableProperties(this, view);
        view._inheritStyleScope(this._styleScope);
        propagateInheritableCssProperties(this.style, view.style);
        if (this._context) {
            view._setupUI(this._context, atIndex);
        }
        if (this._isLoaded) {
            this.loadView(view);
        }
    }
    loadView(view) {
        if (view && !view.isLoaded) {
            view.callLoaded();
        }
    }
    _shouldDelayLayout() {
        return false;
    }
    unloadView(view) {
        if (view && view.isLoaded) {
            view.callUnloaded();
        }
    }
    /**
     * Core logic for removing a child view from this instance. Used by the framework to handle lifecycle events more centralized. Do not use outside the UI Stack implementation.
     */
    _removeView(view) {
        if (Trace.isEnabled()) {
            Trace.write(`${this}._removeView(${view})`, Trace.categories.ViewHierarchy);
        }
        if (view.parent !== this) {
            throw new Error('View not added to this instance. View: ' + view + ' CurrentParent: ' + view.parent + ' ExpectedParent: ' + this);
        }
        if (this.domNode) {
            this.domNode.onChildRemoved(view);
        }
        this._removeViewCore(view);
        view.parent = undefined;
        view._parentChanged(this);
    }
    /**
     * Method is intended to be overridden by inheritors and used as "protected"
     */
    _removeViewCore(view) {
        this.unloadView(view);
        if (view._context) {
            view._tearDownUI();
        }
    }
    createNativeView() {
        return undefined;
    }
    disposeNativeView() {
        this.notify({
            eventName: ViewBase.disposeNativeViewEvent,
            object: this,
        });
    }
    initNativeView() {
        //
    }
    resetNativeView() {
        //
    }
    resetNativeViewInternal() {
        // const nativeView = this.nativeViewProtected;
        // if (nativeView && global.isAndroid) {
        //     const recycle = this.recycleNativeView;
        //     if (recycle === "always" || (recycle === "auto" && !this._disableNativeViewRecycling)) {
        //         resetNativeView(this);
        //         if (this._isPaddingRelative) {
        //             nativeView.setPaddingRelative(this._defaultPaddingLeft, this._defaultPaddingTop, this._defaultPaddingRight, this._defaultPaddingBottom);
        //         } else {
        //             nativeView.setPadding(this._defaultPaddingLeft, this._defaultPaddingTop, this._defaultPaddingRight, this._defaultPaddingBottom);
        //         }
        //         this.resetNativeView();
        //     }
        // }
        // if (this._cssState) {
        //     this._cancelAllAnimations();
        // }
    }
    _setupAsRootView(context) {
        this._setupUI(context);
    }
    _setupUI(context, atIndex, parentIsLoaded) {
        if (this._context === context) {
            // this check is unnecessary as this function should never be called when this._context === context as it means the view was somehow detached,
            // which is only possible by setting reusable = true. Adding it either way for feature flag safety
            if (this.reusable) {
                if (this.parent && !this._isAddedToNativeVisualTree) {
                    const nativeIndex = this.parent._childIndexToNativeChildIndex(atIndex);
                    this._isAddedToNativeVisualTree = this.parent._addViewToNativeVisualTree(this, nativeIndex);
                }
            }
            return;
        }
        else if (this._context) {
            this._tearDownUI(true);
        }
        this._context = context;
        // This will account for nativeView that is created in createNativeView, recycled
        // or for backward compatibility - set before _setupUI in iOS constructor.
        let nativeView = this.nativeViewProtected;
        // if (global.isAndroid) {
        //     const recycle = this.recycleNativeView;
        //     if (recycle === "always" || (recycle === "auto" && !this._disableNativeViewRecycling)) {
        //         nativeView = <android.view.View>getNativeView(context, this.typeName);
        //     }
        // }
        if (!nativeView) {
            nativeView = this.createNativeView();
        }
        if (global.isAndroid) {
            // this check is also unecessary as this code should never be reached with _androidView != null unless reusable = true
            // also adding this check for feature flag safety
            if (this._androidView !== nativeView || !this.reusable) {
                this._androidView = nativeView;
                if (nativeView) {
                    if (this._isPaddingRelative === undefined) {
                        this._isPaddingRelative = nativeView.isPaddingRelative();
                    }
                    let result = nativeView.defaultPaddings;
                    if (result === undefined) {
                        result = org.nativescript.widgets.ViewHelper.getPadding(nativeView);
                        nativeView.defaultPaddings = result;
                    }
                    this._defaultPaddingTop = result.top;
                    this._defaultPaddingRight = result.right;
                    this._defaultPaddingBottom = result.bottom;
                    this._defaultPaddingLeft = result.left;
                    const style = this.style;
                    if (!paddingTopProperty.isSet(style)) {
                        this.effectivePaddingTop = this._defaultPaddingTop;
                    }
                    if (!paddingRightProperty.isSet(style)) {
                        this.effectivePaddingRight = this._defaultPaddingRight;
                    }
                    if (!paddingBottomProperty.isSet(style)) {
                        this.effectivePaddingBottom = this._defaultPaddingBottom;
                    }
                    if (!paddingLeftProperty.isSet(style)) {
                        this.effectivePaddingLeft = this._defaultPaddingLeft;
                    }
                }
            }
        }
        else {
            this._iosView = nativeView;
        }
        this.setNativeView(nativeView);
        if (this.parent) {
            const nativeIndex = this.parent._childIndexToNativeChildIndex(atIndex);
            this._isAddedToNativeVisualTree = this.parent._addViewToNativeVisualTree(this, nativeIndex);
        }
        this._resumeNativeUpdates(SuspendType.UISetup);
        this.eachChild((child) => {
            child._setupUI(context);
            return true;
        });
    }
    setNativeView(value) {
        if (this.__nativeView === value) {
            return;
        }
        if (this.__nativeView) {
            this._suspendNativeUpdates(SuspendType.NativeView);
            // We may do a `this.resetNativeView()` here?
        }
        this.__nativeView = this.nativeViewProtected = value;
        if (this.__nativeView) {
            this._suspendedUpdates = undefined;
            this.initNativeView();
            this._resumeNativeUpdates(SuspendType.NativeView);
        }
    }
    destroyNode(forceDestroyChildren) {
        this.reusable = false;
        this._tearDownUI(forceDestroyChildren);
    }
    _tearDownUI(force) {
        // No context means we are already teared down.
        if (!this._context) {
            return;
        }
        const preserveNativeView = this.reusable && !force;
        this.resetNativeViewInternal();
        if (!preserveNativeView) {
            this.eachChild((child) => {
                child._tearDownUI(force);
                return true;
            });
        }
        if (this.parent) {
            this.parent._removeViewFromNativeVisualTree(this);
        }
        // const nativeView = this.nativeViewProtected;
        // if (nativeView && global.isAndroid) {
        //     const recycle = this.recycleNativeView;
        //     let shouldRecycle = false;
        //     if (recycle === "always") {
        //         shouldRecycle = true;
        //     } else if (recycle === "auto" && !this._disableNativeViewRecycling) {
        //         const propertiesSet = Object.getOwnPropertySymbols(this).length + Object.getOwnPropertySymbols(this.style).length / 2;
        //         shouldRecycle = propertiesSet <= this.recyclePropertyCounter;
        //     }
        //     // const nativeParent = global.isAndroid ? (<android.view.View>nativeView).getParent() : (<UIView>nativeView).superview;
        //     const nativeParent = (<android.view.View>nativeView).getParent();
        //     const animation = (<android.view.View>nativeView).getAnimation();
        //     if (shouldRecycle && !nativeParent && !animation) {
        //         putNativeView(this._context, this);
        //     }
        // }
        if (!preserveNativeView) {
            this.disposeNativeView();
            this._suspendNativeUpdates(SuspendType.UISetup);
            if (global.isAndroid) {
                this.setNativeView(null);
                this._androidView = null;
            }
            // this._iosView = null;
            this._context = null;
        }
        if (this.domNode) {
            this.domNode.dispose();
            this.domNode = undefined;
        }
    }
    _childIndexToNativeChildIndex(index) {
        return index;
    }
    /**
     * Method is intended to be overridden by inheritors and used as "protected".
     */
    _addViewToNativeVisualTree(view, atIndex) {
        if (view._isAddedToNativeVisualTree) {
            throw new Error('Child already added to the native visual tree.');
        }
        return true;
    }
    /**
     * Method is intended to be overridden by inheritors and used as "protected"
     */
    _removeViewFromNativeVisualTree(view) {
        view._isAddedToNativeVisualTree = false;
    }
    _goToVisualState(state) {
        if (Trace.isEnabled()) {
            Trace.write(this + ' going to state: ' + state, Trace.categories.Style);
        }
        if (state === this._visualState) {
            return;
        }
        this.deletePseudoClass(this._visualState);
        this._visualState = state;
        this.addPseudoClass(state);
    }
    /**
     * @deprecated
     *
     * This used to be the way to set attribute values in early {N} versions.
     * Now attributes are expected to be set as plain properties on the view instances.
     */
    _applyXmlAttribute(attribute, value) {
        console.log('ViewBase._applyXmlAttribute(...) is deprecated; set attributes as plain properties instead');
        if (attribute === 'style' || attribute === 'rows' || attribute === 'columns' || attribute === 'fontAttributes') {
            this[attribute] = value;
            return true;
        }
        return false;
    }
    setInlineStyle(style) {
        if (typeof style !== 'string') {
            throw new Error('Parameter should be valid CSS string!');
        }
        ensureStyleScopeModule();
        styleScopeModule.applyInlineStyle(this, style, undefined);
    }
    _parentChanged(oldParent) {
        const newParent = this.parent;
        //Overridden
        if (oldParent) {
            clearInheritedProperties(this);
            if (this.bindingContextBoundToParentBindingContextChanged) {
                oldParent.off('bindingContextChange', this.bindingContextChanged, this);
            }
        }
        else if (this.shouldAddHandlerToParentBindingContextChanged) {
            newParent.on('bindingContextChange', this.bindingContextChanged, this);
            this.bindings.get('bindingContext').bind(newParent.bindingContext);
        }
    }
    onResumeNativeUpdates() {
        // Apply native setters...
        initNativeView(this, undefined, undefined);
    }
    toString() {
        let str = this.typeName;
        if (this.id) {
            str += `<${this.id}>`;
        }
        else {
            str += `(${this._domId})`;
        }
        const source = Source.get(this);
        if (source) {
            str += `@${source};`;
        }
        return str;
    }
    _onCssStateChange() {
        this._cssState.onChange();
        eachDescendant(this, (child) => {
            child._cssState.onChange();
            return true;
        });
    }
    _inheritStyleScope(styleScope) {
        // If we are styleScope don't inherit parent stylescope.
        // TODO: Consider adding parent scope and merge selectors.
        if (this._isStyleScopeHost) {
            return;
        }
        if (this._styleScope !== styleScope) {
            this._styleScope = styleScope;
            this._onCssStateChange();
            this.eachChild((child) => {
                child._inheritStyleScope(styleScope);
                return true;
            });
        }
    }
    showModal(...args) {
        const parent = this.parent;
        return parent && parent.showModal(...args);
    }
    closeModal(...args) {
        const parent = this.parent;
        if (parent) {
            parent.closeModal(...args);
        }
    }
    _dialogClosed() {
        eachDescendant(this, (child) => {
            child._dialogClosed();
            return true;
        });
    }
    _onRootViewReset() {
        eachDescendant(this, (child) => {
            child._onRootViewReset();
            return true;
        });
    }
}
ViewBase.loadedEvent = 'loaded';
ViewBase.unloadedEvent = 'unloaded';
ViewBase.createdEvent = 'created';
ViewBase.disposeNativeViewEvent = 'disposeNativeView';
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ViewBase.prototype, "onLoaded", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ViewBase.prototype, "onUnloaded", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ViewBase.prototype, "addPseudoClass", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ViewBase.prototype, "deletePseudoClass", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ViewBase.prototype, "requestLayout", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ViewBase, Number]),
    __metadata("design:returntype", void 0)
], ViewBase.prototype, "_addView", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Boolean]),
    __metadata("design:returntype", void 0)
], ViewBase.prototype, "_setupUI", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", void 0)
], ViewBase.prototype, "_tearDownUI", null);
ViewBase.prototype.isCollapsed = false;
ViewBase.prototype._oldLeft = 0;
ViewBase.prototype._oldTop = 0;
ViewBase.prototype._oldRight = 0;
ViewBase.prototype._oldBottom = 0;
ViewBase.prototype.effectiveMinWidth = 0;
ViewBase.prototype.effectiveMinHeight = 0;
ViewBase.prototype.effectiveWidth = 0;
ViewBase.prototype.effectiveHeight = 0;
ViewBase.prototype.effectiveMarginTop = 0;
ViewBase.prototype.effectiveMarginRight = 0;
ViewBase.prototype.effectiveMarginBottom = 0;
ViewBase.prototype.effectiveMarginLeft = 0;
ViewBase.prototype.effectivePaddingTop = 0;
ViewBase.prototype.effectivePaddingRight = 0;
ViewBase.prototype.effectivePaddingBottom = 0;
ViewBase.prototype.effectivePaddingLeft = 0;
ViewBase.prototype.effectiveBorderTopWidth = 0;
ViewBase.prototype.effectiveBorderRightWidth = 0;
ViewBase.prototype.effectiveBorderBottomWidth = 0;
ViewBase.prototype.effectiveBorderLeftWidth = 0;
ViewBase.prototype._defaultPaddingTop = 0;
ViewBase.prototype._defaultPaddingRight = 0;
ViewBase.prototype._defaultPaddingBottom = 0;
ViewBase.prototype._defaultPaddingLeft = 0;
ViewBase.prototype._isViewBase = true;
ViewBase.prototype.recycleNativeView = 'never';
ViewBase.prototype.reusable = false;
ViewBase.prototype._suspendNativeUpdatesCount = SuspendType.Loaded | SuspendType.NativeView | SuspendType.UISetup;
export const bindingContextProperty = new InheritedProperty({
    name: 'bindingContext',
});
bindingContextProperty.register(ViewBase);
export const hiddenProperty = new Property({
    name: 'hidden',
    defaultValue: false,
    affectsLayout: global.isIOS,
    valueConverter: booleanConverter,
    valueChanged: (target, oldValue, newValue) => {
        if (target) {
            target.isCollapsed = !!newValue;
        }
    },
});
hiddenProperty.register(ViewBase);
export const classNameProperty = new Property({
    name: 'className',
    valueChanged(view, oldValue, newValue) {
        const cssClasses = view.cssClasses;
        const rootViewsCssClasses = CSSUtils.getSystemCssClasses();
        const shouldAddModalRootViewCssClasses = cssClasses.has(CSSUtils.MODAL_ROOT_VIEW_CSS_CLASS);
        const shouldAddRootViewCssClasses = cssClasses.has(CSSUtils.ROOT_VIEW_CSS_CLASS);
        cssClasses.clear();
        if (shouldAddModalRootViewCssClasses) {
            cssClasses.add(CSSUtils.MODAL_ROOT_VIEW_CSS_CLASS);
        }
        else if (shouldAddRootViewCssClasses) {
            cssClasses.add(CSSUtils.ROOT_VIEW_CSS_CLASS);
        }
        rootViewsCssClasses.forEach((c) => cssClasses.add(c));
        if (typeof newValue === 'string' && newValue !== '') {
            newValue.split(' ').forEach((c) => cssClasses.add(c));
        }
        view._onCssStateChange();
    },
});
classNameProperty.register(ViewBase);
export const idProperty = new Property({
    name: 'id',
    valueChanged: (view, oldValue, newValue) => view._onCssStateChange(),
});
idProperty.register(ViewBase);
export function booleanConverter(v) {
    const lowercase = (v + '').toLowerCase();
    if (lowercase === 'true') {
        return true;
    }
    else if (lowercase === 'false') {
        return false;
    }
    throw new Error(`Invalid boolean: ${v}`);
}
//# sourceMappingURL=index.js.map