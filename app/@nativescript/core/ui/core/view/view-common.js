import { booleanConverter, ViewBase } from '../view-base';
import { getEventOrGestureName } from '../bindable';
import { layout } from '../../../utils';
import { isObject } from '../../../utils/types';
import { Property, InheritedProperty } from '../properties';
import { Trace } from '../../../trace';
import { ViewHelper } from './view-helper';
import { PercentLength } from '../../styling/style-properties';
import { observe as gestureObserve, GestureTypes, fromString as gestureFromString, TouchManager } from '../../gestures';
import { CSSUtils } from '../../../css/system-classes';
import { Builder } from '../../builder';
import { sanitizeModuleName } from '../../builder/module-name-sanitizer';
import { StyleScope } from '../../styling/style-scope';
import { accessibilityHintProperty, accessibilityIdentifierProperty, accessibilityLabelProperty, accessibilityValueProperty, accessibilityIgnoresInvertColorsProperty } from '../../../accessibility/accessibility-properties';
import { accessibilityBlurEvent, accessibilityFocusChangedEvent, accessibilityFocusEvent, accessibilityPerformEscapeEvent, getCurrentFontScale } from '../../../accessibility';
// helpers (these are okay re-exported here)
export * from './view-helper';
let animationModule;
function ensureAnimationModule() {
    if (!animationModule) {
        animationModule = require('../../animation');
    }
}
export function CSSType(type) {
    return (cls) => {
        cls.prototype.cssType = type;
    };
}
export function viewMatchesModuleContext(view, context, types) {
    return context && view._moduleName && context.type && types.some((type) => type === context.type) && context.path && context.path.includes(view._moduleName);
}
export function PseudoClassHandler(...pseudoClasses) {
    const stateEventNames = pseudoClasses.map((s) => ':' + s);
    const listeners = Symbol('listeners');
    return (target, propertyKey, descriptor) => {
        function update(change) {
            const prev = this[listeners] || 0;
            const next = prev + change;
            if (prev <= 0 && next > 0) {
                this[propertyKey](true);
            }
            else if (prev > 0 && next <= 0) {
                this[propertyKey](false);
            }
        }
        stateEventNames.forEach((s) => (target[s] = update));
    };
}
export const _rootModalViews = new Array();
export class ViewCommon extends ViewBase {
    constructor() {
        super(...arguments);
        this._gestureObservers = {};
    }
    get css() {
        const scope = this._styleScope;
        return scope && scope.css;
    }
    set css(value) {
        this._updateStyleScope(undefined, undefined, value);
    }
    addCss(cssString) {
        this._updateStyleScope(undefined, cssString);
    }
    addCssFile(cssFileName) {
        this._updateStyleScope(cssFileName);
    }
    changeCssFile(cssFileName) {
        const scope = this._styleScope;
        if (scope && cssFileName) {
            scope.changeCssFile(cssFileName);
            this._onCssStateChange();
        }
    }
    _updateStyleScope(cssFileName, cssString, css) {
        let scope = this._styleScope;
        if (!scope) {
            scope = new StyleScope();
            this.setScopeProperty(scope, cssFileName, cssString, css);
            this._inheritStyleScope(scope);
            this._isStyleScopeHost = true;
        }
        else {
            this.setScopeProperty(scope, cssFileName, cssString, css);
            this._onCssStateChange();
        }
    }
    setScopeProperty(scope, cssFileName, cssString, css) {
        if (cssFileName !== undefined) {
            scope.addCssFile(cssFileName);
        }
        else if (cssString !== undefined) {
            scope.addCss(cssString);
        }
        else if (css !== undefined) {
            scope.css = css;
        }
    }
    onLoaded() {
        if (!this.isLoaded) {
            const enableTapAnimations = TouchManager.enableGlobalTapAnimations && (this.hasListeners('tap') || this.hasListeners('tapChange') || this.getGestureObservers(GestureTypes.tap));
            if (!this.ignoreTouchAnimation && (this.touchAnimation || enableTapAnimations)) {
                // console.log('view:', Object.keys((<any>this)._observers));
                TouchManager.addAnimations(this);
            }
        }
        super.onLoaded();
    }
    _closeAllModalViewsInternal() {
        if (_rootModalViews && _rootModalViews.length > 0) {
            _rootModalViews.forEach((v) => {
                v.closeModal();
            });
            return true;
        }
        return false;
    }
    _getRootModalViews() {
        return _rootModalViews;
    }
    _onLivesync(context) {
        if (Trace.isEnabled()) {
            Trace.write(`${this}._onLivesync(${JSON.stringify(context)})`, Trace.categories.Livesync);
        }
        if (this._closeAllModalViewsInternal()) {
            return true;
        }
        if (this._handleLivesync(context)) {
            return true;
        }
        let handled = false;
        this.eachChildView((child) => {
            if (child._onLivesync(context)) {
                handled = true;
                return false;
            }
        });
        return handled;
    }
    _handleLivesync(context) {
        if (Trace.isEnabled()) {
            Trace.write(`${this}._handleLivesync(${JSON.stringify(context)})`, Trace.categories.Livesync);
        }
        // Handle local CSS
        if (viewMatchesModuleContext(this, context, ['style'])) {
            if (Trace.isEnabled()) {
                Trace.write(`Change Handled: Changing CSS for ${this}`, Trace.categories.Livesync);
            }
            // Always load styles with ".css" extension. Even when changes are in ".scss" ot ".less" files
            const cssModuleName = `${sanitizeModuleName(context.path)}.css`;
            this.changeCssFile(cssModuleName);
            return true;
        }
        // Handle script/markup changes in custom components by falling back to page refresh
        if (viewMatchesModuleContext(this, context, ['markup', 'script']) && this.page && this.page.frame) {
            if (Trace.isEnabled()) {
                Trace.write(`Change Handled: Changing ${context.type} for ${this} inside ${this.page}`, Trace.categories.Livesync);
            }
            return this.page.frame._handleLivesync({
                type: context.type,
                path: this.page._moduleName,
            });
        }
        return false;
    }
    _setupAsRootView(context) {
        super._setupAsRootView(context);
        if (!this._styleScope) {
            this._updateStyleScope();
        }
    }
    _observe(type, callback, thisArg) {
        if (!this._gestureObservers[type]) {
            this._gestureObservers[type] = [];
        }
        this._gestureObservers[type].push(gestureObserve(this, type, callback, thisArg));
    }
    getGestureObservers(type) {
        return this._gestureObservers[type];
    }
    addEventListener(arg, callback, thisArg) {
        if (typeof arg === 'string') {
            arg = getEventOrGestureName(arg);
            const gesture = gestureFromString(arg);
            if (gesture && !this._isEvent(arg)) {
                this._observe(gesture, callback, thisArg);
            }
            else {
                const events = arg.split(',');
                if (events.length > 0) {
                    for (let i = 0; i < events.length; i++) {
                        const evt = events[i].trim();
                        const gst = gestureFromString(evt);
                        if (gst && !this._isEvent(arg)) {
                            this._observe(gst, callback, thisArg);
                        }
                        else {
                            super.addEventListener(evt, callback, thisArg);
                        }
                    }
                }
                else {
                    super.addEventListener(arg, callback, thisArg);
                }
            }
        }
        else if (typeof arg === 'number') {
            this._observe(arg, callback, thisArg);
        }
    }
    removeEventListener(arg, callback, thisArg) {
        if (typeof arg === 'string') {
            const gesture = gestureFromString(arg);
            if (gesture && !this._isEvent(arg)) {
                this._disconnectGestureObservers(gesture);
            }
            else {
                const events = arg.split(',');
                if (events.length > 0) {
                    for (let i = 0; i < events.length; i++) {
                        const evt = events[i].trim();
                        const gst = gestureFromString(evt);
                        if (gst && !this._isEvent(arg)) {
                            this._disconnectGestureObservers(gst);
                        }
                        else {
                            super.removeEventListener(evt, callback, thisArg);
                        }
                    }
                }
                else {
                    super.removeEventListener(arg, callback, thisArg);
                }
            }
        }
        else if (typeof arg === 'number') {
            this._disconnectGestureObservers(arg);
        }
    }
    onBackPressed() {
        return false;
    }
    _getFragmentManager() {
        return undefined;
    }
    getModalOptions(args) {
        if (args.length === 0) {
            throw new Error('showModal without parameters is deprecated. Please call showModal on a view instance instead.');
        }
        else {
            let options = null;
            if (args.length === 2) {
                options = args[1];
            }
            else {
                if (args[0] instanceof ViewCommon) {
                    console.log('showModal(view: ViewBase, context: any, closeCallback: Function, fullscreen?: boolean, animated?: boolean, stretched?: boolean) ' + 'is deprecated. Use showModal(view: ViewBase, modalOptions: ShowModalOptions) instead.');
                }
                else {
                    console.log('showModal(moduleName: string, context: any, closeCallback: Function, fullscreen?: boolean, animated?: boolean, stretched?: boolean) ' + 'is deprecated. Use showModal(moduleName: string, modalOptions: ShowModalOptions) instead.');
                }
                options = {
                    context: args[1],
                    closeCallback: args[2],
                    fullscreen: args[3],
                    animated: args[4],
                    stretched: args[5],
                };
            }
            const firstArgument = args[0];
            const view = firstArgument instanceof ViewCommon ? firstArgument : Builder.createViewFromEntry({
                moduleName: firstArgument,
            });
            return { view, options };
        }
    }
    showModal(...args) {
        const { view, options } = this.getModalOptions(args);
        view._showNativeModalView(this, options);
        return view;
    }
    closeModal(...args) {
        const closeCallback = this._closeModalCallback;
        if (closeCallback) {
            closeCallback(...args);
        }
        else {
            const parent = this.parent;
            if (parent) {
                parent.closeModal(...args);
            }
        }
    }
    get modal() {
        return this._modal;
    }
    _showNativeModalView(parent, options) {
        _rootModalViews.push(this);
        this.cssClasses.add(CSSUtils.MODAL_ROOT_VIEW_CSS_CLASS);
        const modalRootViewCssClasses = CSSUtils.getSystemCssClasses();
        modalRootViewCssClasses.forEach((c) => this.cssClasses.add(c));
        parent._modal = this;
        this.style._fontScale = getCurrentFontScale();
        this._modalParent = parent;
        this._modalContext = options.context;
        const that = this;
        this._closeModalCallback = function (...originalArgs) {
            if (that._closeModalCallback) {
                const modalIndex = _rootModalViews.indexOf(that);
                _rootModalViews.splice(modalIndex);
                that._modalParent = null;
                that._modalContext = null;
                that._closeModalCallback = null;
                that._dialogClosed();
                parent._modal = null;
                const whenClosedCallback = () => {
                    if (typeof options.closeCallback === 'function') {
                        options.closeCallback.apply(undefined, originalArgs);
                    }
                    that._tearDownUI(true);
                };
                that._hideNativeModalView(parent, whenClosedCallback);
            }
        };
    }
    _hideNativeModalView(parent, whenClosedCallback) { }
    _raiseLayoutChangedEvent() {
        const args = {
            eventName: ViewCommon.layoutChangedEvent,
            object: this,
        };
        this.notify(args);
    }
    _raiseShownModallyEvent() {
        const args = {
            eventName: ViewCommon.shownModallyEvent,
            object: this,
            context: this._modalContext,
            closeCallback: this._closeModalCallback,
        };
        this.notify(args);
    }
    _raiseShowingModallyEvent() {
        const args = {
            eventName: ViewCommon.showingModallyEvent,
            object: this,
            context: this._modalContext,
            closeCallback: this._closeModalCallback,
        };
        this.notify(args);
    }
    _isEvent(name) {
        return this.constructor && `${name}Event` in this.constructor;
    }
    _disconnectGestureObservers(type) {
        const observers = this.getGestureObservers(type);
        if (observers) {
            for (let i = 0; i < observers.length; i++) {
                observers[i].disconnect();
            }
        }
    }
    // START Style property shortcuts
    get borderColor() {
        return this.style.borderColor;
    }
    set borderColor(value) {
        this.style.borderColor = value;
    }
    get borderTopColor() {
        return this.style.borderTopColor;
    }
    set borderTopColor(value) {
        this.style.borderTopColor = value;
    }
    get borderRightColor() {
        return this.style.borderRightColor;
    }
    set borderRightColor(value) {
        this.style.borderRightColor = value;
    }
    get borderBottomColor() {
        return this.style.borderBottomColor;
    }
    set borderBottomColor(value) {
        this.style.borderBottomColor = value;
    }
    get borderLeftColor() {
        return this.style.borderLeftColor;
    }
    set borderLeftColor(value) {
        this.style.borderLeftColor = value;
    }
    get borderWidth() {
        return this.style.borderWidth;
    }
    set borderWidth(value) {
        this.style.borderWidth = value;
    }
    get borderTopWidth() {
        return this.style.borderTopWidth;
    }
    set borderTopWidth(value) {
        this.style.borderTopWidth = value;
    }
    get borderRightWidth() {
        return this.style.borderRightWidth;
    }
    set borderRightWidth(value) {
        this.style.borderRightWidth = value;
    }
    get borderBottomWidth() {
        return this.style.borderBottomWidth;
    }
    set borderBottomWidth(value) {
        this.style.borderBottomWidth = value;
    }
    get borderLeftWidth() {
        return this.style.borderLeftWidth;
    }
    set borderLeftWidth(value) {
        this.style.borderLeftWidth = value;
    }
    get borderRadius() {
        return this.style.borderRadius;
    }
    set borderRadius(value) {
        this.style.borderRadius = value;
    }
    get borderTopLeftRadius() {
        return this.style.borderTopLeftRadius;
    }
    set borderTopLeftRadius(value) {
        this.style.borderTopLeftRadius = value;
    }
    get borderTopRightRadius() {
        return this.style.borderTopRightRadius;
    }
    set borderTopRightRadius(value) {
        this.style.borderTopRightRadius = value;
    }
    get borderBottomRightRadius() {
        return this.style.borderBottomRightRadius;
    }
    set borderBottomRightRadius(value) {
        this.style.borderBottomRightRadius = value;
    }
    get borderBottomLeftRadius() {
        return this.style.borderBottomLeftRadius;
    }
    set borderBottomLeftRadius(value) {
        this.style.borderBottomLeftRadius = value;
    }
    get color() {
        return this.style.color;
    }
    set color(value) {
        this.style.color = value;
    }
    get background() {
        return this.style.background;
    }
    set background(value) {
        this.style.background = value;
    }
    get backgroundColor() {
        return this.style.backgroundColor;
    }
    set backgroundColor(value) {
        this.style.backgroundColor = value;
    }
    get backgroundImage() {
        return this.style.backgroundImage;
    }
    set backgroundImage(value) {
        this.style.backgroundImage = value;
    }
    get backgroundSize() {
        return this.style.backgroundSize;
    }
    set backgroundSize(value) {
        this.style.backgroundSize = value;
    }
    get backgroundPosition() {
        return this.style.backgroundPosition;
    }
    set backgroundPosition(value) {
        this.style.backgroundPosition = value;
    }
    get backgroundRepeat() {
        return this.style.backgroundRepeat;
    }
    set backgroundRepeat(value) {
        this.style.backgroundRepeat = value;
    }
    get boxShadow() {
        return this.style.boxShadow;
    }
    set boxShadow(value) {
        this.style.boxShadow = value;
    }
    get minWidth() {
        return this.style.minWidth;
    }
    set minWidth(value) {
        this.style.minWidth = value;
    }
    get minHeight() {
        return this.style.minHeight;
    }
    set minHeight(value) {
        this.style.minHeight = value;
    }
    get width() {
        return this.style.width;
    }
    set width(value) {
        this.style.width = value;
    }
    get height() {
        return this.style.height;
    }
    set height(value) {
        this.style.height = value;
    }
    get margin() {
        return this.style.margin;
    }
    set margin(value) {
        this.style.margin = value;
    }
    get marginLeft() {
        return this.style.marginLeft;
    }
    set marginLeft(value) {
        this.style.marginLeft = value;
    }
    get marginTop() {
        return this.style.marginTop;
    }
    set marginTop(value) {
        this.style.marginTop = value;
    }
    get marginRight() {
        return this.style.marginRight;
    }
    set marginRight(value) {
        this.style.marginRight = value;
    }
    get marginBottom() {
        return this.style.marginBottom;
    }
    set marginBottom(value) {
        this.style.marginBottom = value;
    }
    get horizontalAlignment() {
        return this.style.horizontalAlignment;
    }
    set horizontalAlignment(value) {
        this.style.horizontalAlignment = value;
    }
    get verticalAlignment() {
        return this.style.verticalAlignment;
    }
    set verticalAlignment(value) {
        this.style.verticalAlignment = value;
    }
    get visibility() {
        return this.style.visibility;
    }
    set visibility(value) {
        this.style.visibility = value;
    }
    get opacity() {
        return this.style.opacity;
    }
    set opacity(value) {
        this.style.opacity = value;
    }
    get rotate() {
        return this.style.rotate;
    }
    set rotate(value) {
        this.style.rotate = value;
    }
    get rotateX() {
        return this.style.rotateX;
    }
    set rotateX(value) {
        this.style.rotateX = value;
    }
    get rotateY() {
        return this.style.rotateY;
    }
    set rotateY(value) {
        this.style.rotateY = value;
    }
    get perspective() {
        return this.style.perspective;
    }
    set perspective(value) {
        this.style.perspective = value;
    }
    get textTransform() {
        return this.style.textTransform;
    }
    set textTransform(value) {
        this.style.textTransform = value;
    }
    get translateX() {
        return this.style.translateX;
    }
    set translateX(value) {
        this.style.translateX = value;
    }
    get translateY() {
        return this.style.translateY;
    }
    set translateY(value) {
        this.style.translateY = value;
    }
    get scaleX() {
        return this.style.scaleX;
    }
    set scaleX(value) {
        this.style.scaleX = value;
    }
    get scaleY() {
        return this.style.scaleY;
    }
    set scaleY(value) {
        this.style.scaleY = value;
    }
    get accessible() {
        return this.style.accessible;
        // return this._accessible;
    }
    set accessible(value) {
        this.style.accessible = value;
        // this._accessible = value;
    }
    get accessibilityHidden() {
        return this.style.accessibilityHidden;
    }
    set accessibilityHidden(value) {
        this.style.accessibilityHidden = value;
    }
    get accessibilityRole() {
        return this.style.accessibilityRole;
    }
    set accessibilityRole(value) {
        this.style.accessibilityRole = value;
    }
    get accessibilityState() {
        return this.style.accessibilityState;
    }
    set accessibilityState(value) {
        this.style.accessibilityState = value;
    }
    get accessibilityLiveRegion() {
        return this.style.accessibilityLiveRegion;
    }
    set accessibilityLiveRegion(value) {
        this.style.accessibilityLiveRegion = value;
    }
    get accessibilityLanguage() {
        return this.style.accessibilityLanguage;
    }
    set accessibilityLanguage(value) {
        this.style.accessibilityLanguage = value;
    }
    get accessibilityMediaSession() {
        return this.style.accessibilityMediaSession;
    }
    set accessibilityMediaSession(value) {
        this.style.accessibilityMediaSession = value;
    }
    get automationText() {
        return this.accessibilityIdentifier;
    }
    set automationText(value) {
        this.accessibilityIdentifier = value;
    }
    get androidElevation() {
        return this.style.androidElevation;
    }
    set androidElevation(value) {
        this.style.androidElevation = value;
    }
    get androidDynamicElevationOffset() {
        return this.style.androidDynamicElevationOffset;
    }
    set androidDynamicElevationOffset(value) {
        this.style.androidDynamicElevationOffset = value;
    }
    get isLayoutValid() {
        return this._isLayoutValid;
    }
    get cssType() {
        if (!this._cssType) {
            this._cssType = this.typeName.toLowerCase();
        }
        return this._cssType;
    }
    set cssType(type) {
        this._cssType = type.toLowerCase();
    }
    get isLayoutRequired() {
        return true;
    }
    measure(widthMeasureSpec, heightMeasureSpec) {
        this._setCurrentMeasureSpecs(widthMeasureSpec, heightMeasureSpec);
    }
    layout(left, top, right, bottom) {
        this._setCurrentLayoutBounds(left, top, right, bottom);
    }
    getMeasuredWidth() {
        return this._measuredWidth & layout.MEASURED_SIZE_MASK || 0;
    }
    getMeasuredHeight() {
        return this._measuredHeight & layout.MEASURED_SIZE_MASK || 0;
    }
    getMeasuredState() {
        return (this._measuredWidth & layout.MEASURED_STATE_MASK) | ((this._measuredHeight >> layout.MEASURED_HEIGHT_STATE_SHIFT) & (layout.MEASURED_STATE_MASK >> layout.MEASURED_HEIGHT_STATE_SHIFT));
    }
    setMeasuredDimension(measuredWidth, measuredHeight) {
        this._measuredWidth = measuredWidth;
        this._measuredHeight = measuredHeight;
        if (Trace.isEnabled()) {
            Trace.write(this + ' :setMeasuredDimension: ' + measuredWidth + ', ' + measuredHeight, Trace.categories.Layout);
        }
    }
    requestLayout() {
        this._isLayoutValid = false;
        super.requestLayout();
    }
    static resolveSizeAndState(size, specSize, specMode, childMeasuredState) {
        return ViewHelper.resolveSizeAndState(size, specSize, specMode, childMeasuredState);
    }
    static combineMeasuredStates(curState, newState) {
        return ViewHelper.combineMeasuredStates(curState, newState);
    }
    static layoutChild(parent, child, left, top, right, bottom, setFrame = true) {
        ViewHelper.layoutChild(parent, child, left, top, right, bottom);
    }
    static measureChild(parent, child, widthMeasureSpec, heightMeasureSpec) {
        return ViewHelper.measureChild(parent, child, widthMeasureSpec, heightMeasureSpec);
    }
    _setCurrentMeasureSpecs(widthMeasureSpec, heightMeasureSpec) {
        const changed = this._currentWidthMeasureSpec !== widthMeasureSpec || this._currentHeightMeasureSpec !== heightMeasureSpec;
        this._currentWidthMeasureSpec = widthMeasureSpec;
        this._currentHeightMeasureSpec = heightMeasureSpec;
        return changed;
    }
    _getCurrentLayoutBounds() {
        return { left: 0, top: 0, right: 0, bottom: 0 };
    }
    /**
     * Returns two booleans - the first if "boundsChanged" the second is "sizeChanged".
     */
    _setCurrentLayoutBounds(left, top, right, bottom) {
        this._isLayoutValid = true;
        const boundsChanged = this._oldLeft !== left || this._oldTop !== top || this._oldRight !== right || this._oldBottom !== bottom;
        const sizeChanged = this._oldRight - this._oldLeft !== right - left || this._oldBottom - this._oldTop !== bottom - top;
        this._oldLeft = left;
        this._oldTop = top;
        this._oldRight = right;
        this._oldBottom = bottom;
        return { boundsChanged, sizeChanged };
    }
    eachChild(callback) {
        this.eachChildView(callback);
    }
    eachChildView(callback) {
        //
    }
    _getNativeViewsCount() {
        return this._isAddedToNativeVisualTree ? 1 : 0;
    }
    _eachLayoutView(callback) {
        return callback(this);
    }
    focus() {
        return undefined;
    }
    getSafeAreaInsets() {
        return { left: 0, top: 0, right: 0, bottom: 0 };
    }
    getLocationInWindow() {
        return undefined;
    }
    getLocationOnScreen() {
        return undefined;
    }
    getLocationRelativeTo(otherView) {
        return undefined;
    }
    getActualSize() {
        const currentBounds = this._getCurrentLayoutBounds();
        if (!currentBounds) {
            return undefined;
        }
        return {
            width: layout.toDeviceIndependentPixels(currentBounds.right - currentBounds.left),
            height: layout.toDeviceIndependentPixels(currentBounds.bottom - currentBounds.top),
        };
    }
    animate(animation) {
        return this.createAnimation(animation).play();
    }
    createAnimation(animation) {
        ensureAnimationModule();
        if (!this._localAnimations) {
            this._localAnimations = new Set();
        }
        animation.target = this;
        const anim = new animationModule.Animation([animation]);
        this._localAnimations.add(anim);
        return anim;
    }
    _removeAnimation(animation) {
        const localAnimations = this._localAnimations;
        if (localAnimations && localAnimations.has(animation)) {
            localAnimations.delete(animation);
            if (animation.isPlaying) {
                animation.cancel();
            }
            return true;
        }
        return false;
    }
    resetNativeView() {
        if (this._localAnimations) {
            this._localAnimations.forEach((a) => this._removeAnimation(a));
        }
        super.resetNativeView();
    }
    _setNativeViewFrame(nativeView, frame) {
        //
    }
    _getValue() {
        throw new Error('The View._getValue is obsolete. There is a new property system.');
    }
    _setValue() {
        throw new Error('The View._setValue is obsolete. There is a new property system.');
    }
    _updateEffectiveLayoutValues(parentWidthMeasureSize, parentWidthMeasureMode, parentHeightMeasureSize, parentHeightMeasureMode) {
        const style = this.style;
        const availableWidth = parentWidthMeasureMode === layout.UNSPECIFIED ? -1 : parentWidthMeasureSize;
        this.effectiveWidth = PercentLength.toDevicePixels(style.width, -2, availableWidth);
        this.effectiveMarginLeft = PercentLength.toDevicePixels(style.marginLeft, 0, availableWidth);
        this.effectiveMarginRight = PercentLength.toDevicePixels(style.marginRight, 0, availableWidth);
        const availableHeight = parentHeightMeasureMode === layout.UNSPECIFIED ? -1 : parentHeightMeasureSize;
        this.effectiveHeight = PercentLength.toDevicePixels(style.height, -2, availableHeight);
        this.effectiveMarginTop = PercentLength.toDevicePixels(style.marginTop, 0, availableHeight);
        this.effectiveMarginBottom = PercentLength.toDevicePixels(style.marginBottom, 0, availableHeight);
    }
    _setNativeClipToBounds() {
        //
    }
    _redrawNativeBackground(value) {
        //
    }
    _applyBackground(background, isBorderDrawable, onlyColor, backgroundDrawable) {
        //
    }
    _onAttachedToWindow() {
        //
    }
    _onDetachedFromWindow() {
        //
    }
    _hasAncestorView(ancestorView) {
        const matcher = (view) => view === ancestorView;
        for (let parent = this.parent; parent != null; parent = parent.parent) {
            if (matcher(parent)) {
                return true;
            }
        }
        return false;
    }
    sendAccessibilityEvent(options) {
        return;
    }
    accessibilityAnnouncement(msg) {
        return;
    }
    accessibilityScreenChanged() {
        return;
    }
    setTestID(view, value) {
        return;
    }
}
ViewCommon.layoutChangedEvent = 'layoutChanged';
ViewCommon.shownModallyEvent = 'shownModally';
ViewCommon.showingModallyEvent = 'showingModally';
ViewCommon.accessibilityBlurEvent = accessibilityBlurEvent;
ViewCommon.accessibilityFocusEvent = accessibilityFocusEvent;
ViewCommon.accessibilityFocusChangedEvent = accessibilityFocusChangedEvent;
ViewCommon.accessibilityPerformEscapeEvent = accessibilityPerformEscapeEvent;
export const originXProperty = new Property({
    name: 'originX',
    defaultValue: 0.5,
    valueConverter: (v) => parseFloat(v),
});
originXProperty.register(ViewCommon);
export const originYProperty = new Property({
    name: 'originY',
    defaultValue: 0.5,
    valueConverter: (v) => parseFloat(v),
});
originYProperty.register(ViewCommon);
export const isEnabledProperty = new Property({
    name: 'isEnabled',
    defaultValue: true,
    valueConverter: booleanConverter,
    valueChanged(target, oldValue, newValue) {
        target._goToVisualState(newValue ? 'normal' : 'disabled');
    },
});
isEnabledProperty.register(ViewCommon);
export const isUserInteractionEnabledProperty = new Property({
    name: 'isUserInteractionEnabled',
    defaultValue: true,
    valueConverter: booleanConverter,
});
isUserInteractionEnabledProperty.register(ViewCommon);
export const iosOverflowSafeAreaProperty = new Property({
    name: 'iosOverflowSafeArea',
    defaultValue: false,
    valueConverter: booleanConverter,
});
iosOverflowSafeAreaProperty.register(ViewCommon);
export const iosOverflowSafeAreaEnabledProperty = new InheritedProperty({
    name: 'iosOverflowSafeAreaEnabled',
    defaultValue: true,
    valueConverter: booleanConverter,
});
iosOverflowSafeAreaEnabledProperty.register(ViewCommon);
export const iosIgnoreSafeAreaProperty = new InheritedProperty({
    name: 'iosIgnoreSafeArea',
    defaultValue: false,
    valueConverter: booleanConverter,
});
iosIgnoreSafeAreaProperty.register(ViewCommon);
const touchAnimationProperty = new Property({
    name: 'touchAnimation',
    valueChanged(view, oldValue, newValue) {
        view.touchAnimation = newValue;
    },
    valueConverter(value) {
        if (isObject(value)) {
            return value;
        }
        else {
            return booleanConverter(value);
        }
    },
});
touchAnimationProperty.register(ViewCommon);
const ignoreTouchAnimationProperty = new Property({
    name: 'ignoreTouchAnimation',
    valueChanged(view, oldValue, newValue) {
        view.ignoreTouchAnimation = newValue;
    },
    valueConverter: booleanConverter,
});
ignoreTouchAnimationProperty.register(ViewCommon);
export const testIDProperty = new Property({
    name: 'testID',
});
testIDProperty.register(ViewCommon);
accessibilityIdentifierProperty.register(ViewCommon);
accessibilityLabelProperty.register(ViewCommon);
accessibilityValueProperty.register(ViewCommon);
accessibilityHintProperty.register(ViewCommon);
accessibilityIgnoresInvertColorsProperty.register(ViewCommon);
//# sourceMappingURL=view-common.js.map