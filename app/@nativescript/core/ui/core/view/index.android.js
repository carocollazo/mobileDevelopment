// Types.
import { ViewCommon, isEnabledProperty, originXProperty, originYProperty, isUserInteractionEnabledProperty, testIDProperty } from './view-common';
import { paddingLeftProperty, paddingTopProperty, paddingRightProperty, paddingBottomProperty, Length } from '../../styling/style-properties';
import { layout } from '../../../utils';
import { Trace } from '../../../trace';
import { hiddenProperty } from '../view-base';
import { perspectiveProperty, visibilityProperty, opacityProperty, horizontalAlignmentProperty, verticalAlignmentProperty, minWidthProperty, minHeightProperty, widthProperty, heightProperty, marginLeftProperty, marginTopProperty, marginRightProperty, marginBottomProperty, rotateProperty, rotateXProperty, rotateYProperty, scaleXProperty, scaleYProperty, translateXProperty, translateYProperty, zIndexProperty, backgroundInternalProperty, androidElevationProperty, androidDynamicElevationOffsetProperty } from '../../styling/style-properties';
import { Background, refreshBorderDrawable } from '../../styling/background';
import { profile } from '../../../profiling';
import { topmost } from '../../frame/frame-stack';
import { Screen } from '../../../platform';
import { android as androidApp } from '../../../application';
import { Device } from '../../../platform';
import lazy from '../../../utils/lazy';
import { accessibilityEnabledProperty, accessibilityHiddenProperty, accessibilityHintProperty, accessibilityIdentifierProperty, accessibilityLabelProperty, accessibilityLiveRegionProperty, accessibilityMediaSessionProperty, accessibilityRoleProperty, accessibilityStateProperty, accessibilityValueProperty } from '../../../accessibility/accessibility-properties';
import { AccessibilityLiveRegion, AccessibilityRole, AndroidAccessibilityEvent, setupAccessibleView, updateAccessibilityProperties, updateContentDescription } from '../../../accessibility';
import * as Utils from '../../../utils';
export * from './view-common';
// helpers (these are okay re-exported here)
export * from './view-helper';
// This one can eventually be cleaned up but causes issues with a lot of ui-suite plugins in particular if not exported here
export * from '../properties';
const DOMID = '_domId';
const androidBackPressedEvent = 'androidBackPressed';
const shortAnimTime = 17694720; // android.R.integer.config_shortAnimTime
const statePressed = 16842919; // android.R.attr.state_pressed
const stateEnabled = 16842910; // android.R.attr.state_enabled
const styleAnimationDialog = 16973826; // android.R.style.Animation_Dialog
const VERTICAL_GRAVITY_MASK = 112; // android.view.Gravity.VERTICAL_GRAVITY_MASK
const HORIZONTAL_GRAVITY_MASK = 7; // android.view.Gravity.HORIZONTAL_GRAVITY_MASK
const GRAVITY_LEFT = 3; // android.view.Gravity.LEFT
const GRAVITY_RIGHT = 5; // android.view.Gravity.RIGHT
const GRAVITY_TOP = 48; // android.view.Gravity.TOP
const GRAVITY_BOTTOM = 80; // android.view.Gravity.BOTTOM
const GRAVITY_CENTER_HORIZONTAL = 1; // android.view.Gravity.CENTER_HORIZONTAL
const GRAVITY_FILL_HORIZONTAL = 7; // android.view.Gravity.FILL_HORIZONTAL
const GRAVITY_CENTER_VERTICAL = 16; // android.view.Gravity.CENTER_VERTICAL
const GRAVITY_FILL_VERTICAL = 112; // android.view.Gravity.FILL_VERTICAL
const sdkVersion = lazy(() => parseInt(Device.sdkVersion));
const modalMap = new Map();
let TouchListener;
let DialogFragment;
function initializeTouchListener() {
    if (TouchListener) {
        return;
    }
    var TouchListenerImpl = /** @class */ (function (_super) {
    __extends(TouchListenerImpl, _super);
    function TouchListenerImpl(owner) {
        var _this = _super.call(this) || this;
        _this.owner = new WeakRef(owner);
        return global.__native(_this);
    }
    TouchListenerImpl.prototype.onTouch = function (view, event) {
        var owner = this.owner.get();
        if (!owner) {
            return;
        }
        owner.handleGestureTouch(event);
        var nativeView = owner.nativeViewProtected;
        if (!nativeView || !nativeView.onTouchEvent) {
            return false;
        }
        return nativeView.onTouchEvent(event);
    };
    TouchListenerImpl = __decorate([
        Interfaces([android.view.View.OnTouchListener])
    ], TouchListenerImpl);
    return TouchListenerImpl;
}(java.lang.Object));
    TouchListener = TouchListenerImpl;
}
function initializeDialogFragment() {
    if (DialogFragment) {
        return;
    }
    var DialogImpl = /** @class */ (function (_super) {
    __extends(DialogImpl, _super);
    function DialogImpl(fragment, context, themeResId) {
        var _this = _super.call(this, context, themeResId) || this;
        _this.fragment = fragment;
        return global.__native(_this);
    }
    DialogImpl.prototype.onDetachedFromWindow = function () {
        _super.prototype.onDetachedFromWindow.call(this);
        this.fragment = null;
    };
    DialogImpl.prototype.onBackPressed = function () {
        var view = this.fragment.owner;
        var args = {
            eventName: 'activityBackPressed',
            object: view,
            activity: view._context,
            cancel: false,
        };
        // Fist fire application.android global event
        androidApp.notify(args);
        if (args.cancel) {
            return;
        }
        view.notify(args);
        if (!args.cancel && !view.onBackPressed()) {
            _super.prototype.onBackPressed.call(this);
        }
    };
    return DialogImpl;
}(android.app.Dialog));
    var DialogFragmentImpl = /** @class */ (function (_super) {
    __extends(DialogFragmentImpl, _super);
    function DialogFragmentImpl() {
        var _this = _super.call(this) || this;
        return global.__native(_this);
    }
    DialogFragmentImpl.prototype.onCreateDialog = function (savedInstanceState) {
        var ownerId = this.getArguments().getInt(DOMID);
        var options = getModalOptions(ownerId);
        this.owner = options.owner;
        // Set owner._dialogFragment to this in case the DialogFragment was recreated after app suspend
        this.owner._dialogFragment = this;
        this._fullscreen = options.fullscreen;
        this._animated = options.animated;
        this._cancelable = options.cancelable;
        this._stretched = options.stretched;
        this._dismissCallback = options.dismissCallback;
        this._shownCallback = options.shownCallback;
        this._windowSoftInputMode = options.windowSoftInputMode;
        this.setStyle(androidx.fragment.app.DialogFragment.STYLE_NO_TITLE, 0);
        var theme = this.getTheme();
        if (this._fullscreen) {
            // In fullscreen mode, get the application's theme.
            theme = this.getActivity().getApplicationInfo().theme;
        }
        var dialog = new DialogImpl(this, this.getActivity(), theme);
        // do not override alignment unless fullscreen modal will be shown;
        // otherwise we might break component-level layout:
        // https://github.com/NativeScript/NativeScript/issues/5392
        if (!this._fullscreen && !this._stretched) {
            this.owner.horizontalAlignment = 'center';
            this.owner.verticalAlignment = 'middle';
        }
        else {
            this.owner.horizontalAlignment = 'stretch';
            this.owner.verticalAlignment = 'stretch';
        }
        // set the modal window animation
        // https://github.com/NativeScript/NativeScript/issues/5989
        if (this._animated) {
            dialog.getWindow().setWindowAnimations(styleAnimationDialog);
        }
        dialog.setCanceledOnTouchOutside(this._cancelable);
        return dialog;
    };
    DialogFragmentImpl.prototype.onCreateView = function (inflater, container, savedInstanceState) {
        var owner = this.owner;
        this.activity = new WeakRef(this.getActivity());
        owner._setupAsRootView(this.getActivity());
        owner._isAddedToNativeVisualTree = true;
        // we need to set the window SoftInputMode here.
        // it wont work is set in onStart
        var window = this.getDialog().getWindow();
        if (this._windowSoftInputMode !== undefined) {
            window.setSoftInputMode(this._windowSoftInputMode);
        }
        else {
            // the dialog seems to not follow the default activity softInputMode,
            // thus set we set it here.
            window.setSoftInputMode(owner._context.getWindow().getAttributes().softInputMode);
        }
        return owner.nativeViewProtected;
    };
    DialogFragmentImpl.prototype.onStart = function () {
        _super.prototype.onStart.call(this);
        if (this._fullscreen) {
            var window = this.getDialog().getWindow();
            var length = android.view.ViewGroup.LayoutParams.MATCH_PARENT;
            window.setLayout(length, length);
            // This removes the default backgroundDrawable so there are no margins.
            window.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.WHITE));
        }
        var owner = this.owner;
        if (owner && !owner.isLoaded) {
            owner.callLoaded();
        }
        this._shownCallback();
    };
    DialogFragmentImpl.prototype.onDismiss = function (dialog) {
        var _a;
        _super.prototype.onDismiss.call(this, dialog);
        var manager = this.getFragmentManager();
        var activity = (_a = this.activity) === null || _a === void 0 ? void 0 : _a.get();
        if (manager && !(activity === null || activity === void 0 ? void 0 : activity.isChangingConfigurations())) {
            removeModal(this.owner._domId);
            this._dismissCallback();
        }
        var owner = this.owner;
        if (owner && owner.isLoaded) {
            owner.callUnloaded();
        }
    };
    DialogFragmentImpl.prototype.onDestroy = function () {
        var _a;
        _super.prototype.onDestroy.call(this);
        var owner = this.owner;
        var activity = (_a = this.activity) === null || _a === void 0 ? void 0 : _a.get();
        if (!(activity === null || activity === void 0 ? void 0 : activity.isChangingConfigurations())) {
            this.activity = null;
        }
        if (owner) {
            // Android calls onDestroy before onDismiss.
            // Make sure we unload first and then call _tearDownUI.
            if (owner.isLoaded) {
                owner.callUnloaded();
            }
            owner._isAddedToNativeVisualTree = false;
            owner._tearDownUI(true);
        }
    };
    return DialogFragmentImpl;
}(androidx.fragment.app.DialogFragment));
    DialogFragment = DialogFragmentImpl;
}
function saveModal(options) {
    modalMap.set(options.owner._domId, options);
}
function removeModal(domId) {
    modalMap.delete(domId);
}
function getModalOptions(domId) {
    return modalMap.get(domId);
}
export class View extends ViewCommon {
    constructor() {
        super();
        this.on(View.loadedEvent, () => setupAccessibleView(this));
    }
    // TODO: Implement unobserve that detach the touchListener.
    _observe(type, callback, thisArg) {
        super._observe(type, callback, thisArg);
        if (this.isLoaded && !this.touchListenerIsSet) {
            this.setOnTouchListener();
        }
    }
    on(eventNames, callback, thisArg) {
        super.on(eventNames, callback, thisArg);
        const isLayoutEvent = typeof eventNames === 'string' ? eventNames.indexOf(ViewCommon.layoutChangedEvent) !== -1 : false;
        if (this.isLoaded && !this.layoutChangeListenerIsSet && isLayoutEvent) {
            this.setOnLayoutChangeListener();
        }
    }
    off(eventNames, callback, thisArg) {
        super.off(eventNames, callback, thisArg);
        const isLayoutEvent = typeof eventNames === 'string' ? eventNames.indexOf(ViewCommon.layoutChangedEvent) !== -1 : false;
        // Remove native listener only if there are no more user listeners for LayoutChanged event
        if (this.isLoaded && this.layoutChangeListenerIsSet && isLayoutEvent && !this.hasListeners(ViewCommon.layoutChangedEvent)) {
            this.nativeViewProtected.removeOnLayoutChangeListener(this.layoutChangeListener);
            this.layoutChangeListenerIsSet = false;
        }
    }
    _getChildFragmentManager() {
        return null;
    }
    _getRootFragmentManager() {
        if (!this._rootManager && this._context) {
            this._rootManager = this._context.getSupportFragmentManager();
        }
        return this._rootManager;
    }
    _getFragmentManager() {
        let manager = this._manager;
        if (!manager) {
            let view = this;
            let frameOrTabViewItemFound = false;
            while (view) {
                // when interacting with nested fragments instead of using getSupportFragmentManager
                // we must always use getChildFragmentManager instead;
                // we have three sources of fragments -- Frame fragments, TabViewItem fragments, and
                // modal dialog fragments
                // modal -> frame / tabview (frame / tabview use modal CHILD fm)
                const dialogFragment = view._dialogFragment;
                if (dialogFragment) {
                    manager = dialogFragment.getChildFragmentManager();
                    break;
                }
                // - frame1 -> frame2 (frame2 uses frame1 CHILD fm)
                // - tabview -> frame1 (frame1 uses tabview item CHILD fm)
                // - frame1 -> tabview (tabview uses frame1 CHILD fm)
                // - frame1 -> tabview -> frame2 (tabview uses frame1 CHILD fm; frame2 uses tabview item CHILD fm)
                if (view._hasFragments) {
                    if (frameOrTabViewItemFound) {
                        manager = view._getChildFragmentManager();
                        break;
                    }
                    frameOrTabViewItemFound = true;
                }
                // the case is needed because _dialogFragment is on View
                // but parent may be ViewBase.
                view = view.parent;
            }
            if (!manager) {
                manager = this._getRootFragmentManager();
            }
            this._manager = manager;
        }
        return manager;
    }
    onLoaded() {
        this._manager = null;
        this._rootManager = null;
        super.onLoaded();
        this.setOnTouchListener();
    }
    onUnloaded() {
        if (this.touchListenerIsSet) {
            this.touchListenerIsSet = false;
            if (this.nativeViewProtected) {
                this.nativeViewProtected.setOnTouchListener(null);
                this.nativeViewProtected.setClickable(this._isClickable);
            }
        }
        this._manager = null;
        this._rootManager = null;
        super.onUnloaded();
    }
    onBackPressed() {
        const topmostFrame = topmost();
        // Delegate back navigation handling to the topmost Frame
        // when it's a child of the current View.
        if (topmostFrame && topmostFrame._hasAncestorView(this)) {
            return topmostFrame.onBackPressed();
        }
        return false;
    }
    handleGestureTouch(event) {
        for (const type in this._gestureObservers) {
            const list = this._gestureObservers[type];
            list.forEach((element) => {
                element.androidOnTouchEvent(event);
            });
        }
        if (this.parent instanceof View) {
            this.parent.handleGestureTouch(event);
        }
    }
    hasGestureObservers() {
        return this._gestureObservers && Object.keys(this._gestureObservers).length > 0;
    }
    initNativeView() {
        super.initNativeView();
        this._isClickable = this.nativeViewProtected.isClickable();
        if (this.hasListeners(ViewCommon.layoutChangedEvent)) {
            this.setOnLayoutChangeListener();
        }
    }
    disposeNativeView() {
        super.disposeNativeView();
        if (this.layoutChangeListenerIsSet) {
            this.layoutChangeListenerIsSet = false;
            this.nativeViewProtected.removeOnLayoutChangeListener(this.layoutChangeListener);
        }
    }
    setOnTouchListener() {
        if (!this.nativeViewProtected || !this.hasGestureObservers()) {
            return;
        }
        // do not set noop listener that handles the event (disabled listener) if IsUserInteractionEnabled is
        // false as we might need the ability for the event to pass through to a parent view
        initializeTouchListener();
        this.touchListener = this.touchListener || new TouchListener(this);
        this.nativeViewProtected.setOnTouchListener(this.touchListener);
        this.touchListenerIsSet = true;
        if (this.nativeViewProtected.setClickable) {
            this.nativeViewProtected.setClickable(this.isUserInteractionEnabled);
        }
    }
    setOnLayoutChangeListener() {
        if (this.nativeViewProtected) {
            const owner = this;
            this.layoutChangeListenerIsSet = true;
            this.layoutChangeListener =
                this.layoutChangeListener ||
                    new android.view.View.OnLayoutChangeListener({
                        onLayoutChange(v, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) {
                            if (left !== oldLeft || top !== oldTop || right !== oldRight || bottom !== oldBottom) {
                                owner._raiseLayoutChangedEvent();
                            }
                        },
                    });
            this.nativeViewProtected.addOnLayoutChangeListener(this.layoutChangeListener);
        }
    }
    get isLayoutRequired() {
        return !this.isLayoutValid;
    }
    get isLayoutValid() {
        if (this.nativeViewProtected) {
            return !this.nativeViewProtected.isLayoutRequested();
        }
        return false;
    }
    get _hasFragments() {
        return false;
    }
    layoutNativeView(left, top, right, bottom) {
        if (this.nativeViewProtected) {
            this.nativeViewProtected.layout(left, top, right, bottom);
        }
    }
    requestLayout() {
        super.requestLayout();
        if (this.nativeViewProtected) {
            this.nativeViewProtected.requestLayout();
        }
    }
    measure(widthMeasureSpec, heightMeasureSpec) {
        super.measure(widthMeasureSpec, heightMeasureSpec);
        this.onMeasure(widthMeasureSpec, heightMeasureSpec);
    }
    layout(left, top, right, bottom) {
        super.layout(left, top, right, bottom);
        this.onLayout(left, top, right, bottom);
    }
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        const view = this.nativeViewProtected;
        if (view) {
            view.measure(widthMeasureSpec, heightMeasureSpec);
            this.setMeasuredDimension(view.getMeasuredWidth(), view.getMeasuredHeight());
        }
    }
    onLayout(left, top, right, bottom) {
        const view = this.nativeViewProtected;
        if (view) {
            this.layoutNativeView(left, top, right, bottom);
        }
    }
    _getCurrentLayoutBounds() {
        if (this.nativeViewProtected && !this.isCollapsed) {
            return {
                left: this.nativeViewProtected.getLeft(),
                top: this.nativeViewProtected.getTop(),
                right: this.nativeViewProtected.getRight(),
                bottom: this.nativeViewProtected.getBottom(),
            };
        }
        else {
            return { left: 0, top: 0, right: 0, bottom: 0 };
        }
    }
    getMeasuredWidth() {
        if (this.nativeViewProtected) {
            return this.nativeViewProtected.getMeasuredWidth();
        }
        return super.getMeasuredWidth();
    }
    getMeasuredHeight() {
        if (this.nativeViewProtected) {
            return this.nativeViewProtected.getMeasuredHeight();
        }
        return super.getMeasuredHeight();
    }
    focus() {
        if (this.nativeViewProtected) {
            return this.nativeViewProtected.requestFocus();
        }
        return false;
    }
    getLocationInWindow() {
        if (!this.nativeViewProtected || !this.nativeViewProtected.getWindowToken()) {
            return undefined;
        }
        const nativeArray = Array.create('int', 2);
        this.nativeViewProtected.getLocationInWindow(nativeArray);
        return {
            x: layout.toDeviceIndependentPixels(nativeArray[0]),
            y: layout.toDeviceIndependentPixels(nativeArray[1]),
        };
    }
    getLocationOnScreen() {
        if (!this.nativeViewProtected || !this.nativeViewProtected.getWindowToken()) {
            return undefined;
        }
        const nativeArray = Array.create('int', 2);
        this.nativeViewProtected.getLocationOnScreen(nativeArray);
        return {
            x: layout.toDeviceIndependentPixels(nativeArray[0]),
            y: layout.toDeviceIndependentPixels(nativeArray[1]),
        };
    }
    getLocationRelativeTo(otherView) {
        if (!this.nativeViewProtected || !this.nativeViewProtected.getWindowToken() || !otherView || !otherView.nativeViewProtected || !otherView.nativeViewProtected.getWindowToken() || this.nativeViewProtected.getWindowToken() !== otherView.nativeViewProtected.getWindowToken()) {
            return undefined;
        }
        const myArray = Array.create('int', 2);
        this.nativeViewProtected.getLocationOnScreen(myArray);
        const otherArray = Array.create('int', 2);
        otherView.nativeViewProtected.getLocationOnScreen(otherArray);
        return {
            x: layout.toDeviceIndependentPixels(myArray[0] - otherArray[0]),
            y: layout.toDeviceIndependentPixels(myArray[1] - otherArray[1]),
        };
    }
    static resolveSizeAndState(size, specSize, specMode, childMeasuredState) {
        let result = size;
        switch (specMode) {
            case layout.UNSPECIFIED:
                result = size;
                break;
            case layout.AT_MOST:
                if (specSize < size) {
                    result = specSize | layout.MEASURED_STATE_TOO_SMALL;
                }
                break;
            case layout.EXACTLY:
                result = specSize;
                break;
        }
        return result | (childMeasuredState & layout.MEASURED_STATE_MASK);
    }
    _showNativeModalView(parent, options) {
        super._showNativeModalView(parent, options);
        initializeDialogFragment();
        const df = new DialogFragment();
        const args = new android.os.Bundle();
        args.putInt(DOMID, this._domId);
        df.setArguments(args);
        let cancelable = true;
        let windowSoftInputMode;
        if (options.android) {
            if (options.android.cancelable !== undefined) {
                cancelable = !!options.android.cancelable;
                console.log('ShowModalOptions.android.cancelable is deprecated. Use ShowModalOptions.cancelable instead.');
            }
            windowSoftInputMode = options.android.windowSoftInputMode;
        }
        cancelable = options.cancelable !== undefined ? !!options.cancelable : cancelable;
        const dialogOptions = {
            owner: this,
            fullscreen: !!options.fullscreen,
            animated: !!options.animated,
            stretched: !!options.stretched,
            cancelable: cancelable,
            windowSoftInputMode: windowSoftInputMode,
            shownCallback: () => this._raiseShownModallyEvent(),
            dismissCallback: () => this.closeModal(),
        };
        saveModal(dialogOptions);
        this._dialogFragment = df;
        this._raiseShowingModallyEvent();
        this._dialogFragment.show(parent._getRootFragmentManager(), this._domId.toString());
    }
    _hideNativeModalView(parent, whenClosedCallback) {
        const manager = this._dialogFragment.getFragmentManager();
        if (manager) {
            this._dialogFragment.dismissAllowingStateLoss();
        }
        this._dialogFragment = null;
        whenClosedCallback();
    }
    [isEnabledProperty.setNative](value) {
        this.nativeViewProtected.setEnabled(value);
    }
    [originXProperty.getDefault]() {
        return this.nativeViewProtected.getPivotX();
    }
    [originXProperty.setNative](value) {
        org.nativescript.widgets.OriginPoint.setX(this.nativeViewProtected, value);
    }
    [originYProperty.getDefault]() {
        return this.nativeViewProtected.getPivotY();
    }
    [originYProperty.setNative](value) {
        org.nativescript.widgets.OriginPoint.setY(this.nativeViewProtected, value);
    }
    [isUserInteractionEnabledProperty.setNative](value) {
        this.nativeViewProtected.setClickable(value);
        this.nativeViewProtected.setFocusable(value);
    }
    [hiddenProperty.getDefault]() {
        return this.nativeViewProtected.getVisibility() === android.view.View.GONE;
    }
    [hiddenProperty.setNative](value) {
        this.nativeViewProtected.setVisibility(value ? android.view.View.GONE : android.view.View.VISIBLE);
    }
    [visibilityProperty.getDefault]() {
        const nativeVisibility = this.nativeViewProtected.getVisibility();
        switch (nativeVisibility) {
            case android.view.View.VISIBLE:
                return 'visible';
            case android.view.View.INVISIBLE:
                return 'hidden';
            case android.view.View.GONE:
                return 'collapse';
            default:
                throw new Error(`Unsupported android.view.View visibility: ${nativeVisibility}. Currently supported values are android.view.View.VISIBLE, android.view.View.INVISIBLE, android.view.View.GONE.`);
        }
    }
    [visibilityProperty.setNative](value) {
        switch (value) {
            case 'visible':
                this.nativeViewProtected.setVisibility(android.view.View.VISIBLE);
                break;
            case 'hidden':
                this.nativeViewProtected.setVisibility(android.view.View.INVISIBLE);
                break;
            case 'collapse':
                this.nativeViewProtected.setVisibility(android.view.View.GONE);
                break;
            default:
                throw new Error(`Invalid visibility value: ${value}. Valid values are: visible, hidden, collapse.`);
        }
    }
    [opacityProperty.getDefault]() {
        return this.nativeViewProtected.getAlpha();
    }
    [opacityProperty.setNative](value) {
        this.nativeViewProtected.setAlpha(float(value));
    }
    [testIDProperty.setNative](value) {
        this.setTestID(this.nativeViewProtected, value);
    }
    setTestID(view, value) {
        if (typeof __USE_TEST_ID__ !== 'undefined' && __USE_TEST_ID__) {
            const id = Utils.ad.resources.getId(':id/nativescript_accessibility_id');
            if (id) {
                view.setTag(id, value);
                view.setTag(value);
            }
            view.setContentDescription(value);
        }
    }
    [accessibilityEnabledProperty.setNative](value) {
        this.nativeViewProtected.setFocusable(!!value);
        updateAccessibilityProperties(this);
    }
    [accessibilityIdentifierProperty.setNative](value) {
        if (typeof __USE_TEST_ID__ !== 'undefined' && __USE_TEST_ID__ && this.testID) {
            // ignore when using testID;
        }
        else {
            const id = Utils.ad.resources.getId(':id/nativescript_accessibility_id');
            if (id) {
                this.nativeViewProtected.setTag(id, value);
                this.nativeViewProtected.setTag(value);
            }
        }
    }
    [accessibilityRoleProperty.setNative](value) {
        var _a;
        this.accessibilityRole = value;
        updateAccessibilityProperties(this);
        if (android.os.Build.VERSION.SDK_INT >= 28) {
            (_a = this.nativeViewProtected) === null || _a === void 0 ? void 0 : _a.setAccessibilityHeading(value === AccessibilityRole.Header);
        }
    }
    [accessibilityValueProperty.setNative]() {
        this._androidContentDescriptionUpdated = true;
        updateContentDescription(this);
    }
    [accessibilityLabelProperty.setNative]() {
        this._androidContentDescriptionUpdated = true;
        updateContentDescription(this);
    }
    [accessibilityHintProperty.setNative]() {
        this._androidContentDescriptionUpdated = true;
        updateContentDescription(this);
    }
    [accessibilityHiddenProperty.setNative](value) {
        if (value) {
            this.nativeViewProtected.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        }
        else {
            this.nativeViewProtected.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_YES);
        }
    }
    [accessibilityLiveRegionProperty.setNative](value) {
        switch (value) {
            case AccessibilityLiveRegion.Assertive: {
                this.nativeViewProtected.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_ASSERTIVE);
                break;
            }
            case AccessibilityLiveRegion.Polite: {
                this.nativeViewProtected.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);
                break;
            }
            default: {
                this.nativeViewProtected.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_NONE);
                break;
            }
        }
    }
    [accessibilityStateProperty.setNative](value) {
        this.accessibilityState = value;
        updateAccessibilityProperties(this);
    }
    [accessibilityMediaSessionProperty.setNative]() {
        updateAccessibilityProperties(this);
    }
    [androidElevationProperty.getDefault]() {
        return this.getDefaultElevation();
    }
    [androidElevationProperty.setNative](value) {
        if (sdkVersion() < 21) {
            return;
        }
        this.refreshStateListAnimator();
    }
    [androidDynamicElevationOffsetProperty.getDefault]() {
        return this.getDefaultDynamicElevationOffset();
    }
    [androidDynamicElevationOffsetProperty.setNative](value) {
        if (sdkVersion() < 21) {
            return;
        }
        this.refreshStateListAnimator();
    }
    getDefaultElevation() {
        if (sdkVersion() < 21) {
            return 0;
        }
        // NOTE: overriden in Button implementation as for widgets with StateListAnimator (Button)
        // nativeView.getElevation() returns 0 at the time of the getDefault() query
        return layout.toDeviceIndependentPixels(this.nativeViewProtected.getElevation());
    }
    getDefaultDynamicElevationOffset() {
        // NOTE: overriden in Button implementation
        return 0;
    }
    refreshStateListAnimator() {
        const nativeView = this.nativeViewProtected;
        const ObjectAnimator = android.animation.ObjectAnimator;
        const AnimatorSet = android.animation.AnimatorSet;
        const duration = nativeView.getContext().getResources().getInteger(shortAnimTime) / 2;
        let elevation = this.androidElevation;
        if (typeof elevation === 'undefined' || elevation === null) {
            elevation = this.getDefaultElevation();
        }
        elevation = layout.toDevicePixels(elevation);
        const z = layout.toDevicePixels(0);
        let pressedZ = this.androidDynamicElevationOffset;
        if (typeof pressedZ === 'undefined' || pressedZ === null) {
            pressedZ = this.getDefaultDynamicElevationOffset();
        }
        pressedZ = layout.toDevicePixels(pressedZ);
        const pressedSet = new AnimatorSet();
        pressedSet.playTogether(java.util.Arrays.asList([ObjectAnimator.ofFloat(nativeView, 'translationZ', [pressedZ]).setDuration(duration), ObjectAnimator.ofFloat(nativeView, 'elevation', [elevation]).setDuration(0)]));
        const notPressedSet = new AnimatorSet();
        notPressedSet.playTogether(java.util.Arrays.asList([ObjectAnimator.ofFloat(nativeView, 'translationZ', [z]).setDuration(duration), ObjectAnimator.ofFloat(nativeView, 'elevation', [elevation]).setDuration(0)]));
        const defaultSet = new AnimatorSet();
        defaultSet.playTogether(java.util.Arrays.asList([ObjectAnimator.ofFloat(nativeView, 'translationZ', [0]).setDuration(0), ObjectAnimator.ofFloat(nativeView, 'elevation', [0]).setDuration(0)]));
        const stateListAnimator = new android.animation.StateListAnimator();
        stateListAnimator.addState([statePressed, stateEnabled], pressedSet);
        stateListAnimator.addState([stateEnabled], notPressedSet);
        stateListAnimator.addState([], defaultSet);
        const currentAnimator = nativeView.getStateListAnimator();
        if (currentAnimator) {
            currentAnimator.jumpToCurrentState();
        }
        nativeView.setStateListAnimator(stateListAnimator);
    }
    [horizontalAlignmentProperty.getDefault]() {
        return org.nativescript.widgets.ViewHelper.getHorizontalAlignment(this.nativeViewProtected);
    }
    [horizontalAlignmentProperty.setNative](value) {
        const nativeView = this.nativeViewProtected;
        const lp = nativeView.getLayoutParams() || new org.nativescript.widgets.CommonLayoutParams();
        const gravity = lp.gravity;
        const weight = lp.weight;
        // Set only if params gravity exists.
        if (gravity !== undefined) {
            switch (value) {
                case 'left':
                    lp.gravity = GRAVITY_LEFT | (gravity & VERTICAL_GRAVITY_MASK);
                    if (weight < 0) {
                        lp.weight = -2;
                    }
                    break;
                case 'center':
                    lp.gravity = GRAVITY_CENTER_HORIZONTAL | (gravity & VERTICAL_GRAVITY_MASK);
                    if (weight < 0) {
                        lp.weight = -2;
                    }
                    break;
                case 'right':
                    lp.gravity = GRAVITY_RIGHT | (gravity & VERTICAL_GRAVITY_MASK);
                    if (weight < 0) {
                        lp.weight = -2;
                    }
                    break;
                case 'stretch':
                    lp.gravity = GRAVITY_FILL_HORIZONTAL | (gravity & VERTICAL_GRAVITY_MASK);
                    if (weight < 0) {
                        lp.weight = -1;
                    }
                    break;
            }
            nativeView.setLayoutParams(lp);
        }
    }
    [verticalAlignmentProperty.getDefault]() {
        return org.nativescript.widgets.ViewHelper.getVerticalAlignment(this.nativeViewProtected);
    }
    [verticalAlignmentProperty.setNative](value) {
        const nativeView = this.nativeViewProtected;
        const lp = nativeView.getLayoutParams() || new org.nativescript.widgets.CommonLayoutParams();
        const gravity = lp.gravity;
        const height = lp.height;
        // Set only if params gravity exists.
        if (gravity !== undefined) {
            switch (value) {
                case 'top':
                    lp.gravity = GRAVITY_TOP | (gravity & HORIZONTAL_GRAVITY_MASK);
                    if (height < 0) {
                        lp.height = -2;
                    }
                    break;
                case 'middle':
                    lp.gravity = GRAVITY_CENTER_VERTICAL | (gravity & HORIZONTAL_GRAVITY_MASK);
                    if (height < 0) {
                        lp.height = -2;
                    }
                    break;
                case 'bottom':
                    lp.gravity = GRAVITY_BOTTOM | (gravity & HORIZONTAL_GRAVITY_MASK);
                    if (height < 0) {
                        lp.height = -2;
                    }
                    break;
                case 'stretch':
                    lp.gravity = GRAVITY_FILL_VERTICAL | (gravity & HORIZONTAL_GRAVITY_MASK);
                    if (height < 0) {
                        lp.height = -1;
                    }
                    break;
            }
            nativeView.setLayoutParams(lp);
        }
    }
    [rotateProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setRotate(this.nativeViewProtected, float(value));
    }
    [rotateXProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setRotateX(this.nativeViewProtected, float(value));
    }
    [rotateYProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setRotateY(this.nativeViewProtected, float(value));
    }
    [perspectiveProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setPerspective(this.nativeViewProtected, float(value * Screen.mainScreen.scale));
    }
    [scaleXProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setScaleX(this.nativeViewProtected, float(value));
    }
    [scaleYProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setScaleY(this.nativeViewProtected, float(value));
    }
    [translateXProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setTranslateX(this.nativeViewProtected, layout.toDevicePixels(value));
    }
    [translateYProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setTranslateY(this.nativeViewProtected, layout.toDevicePixels(value));
    }
    [zIndexProperty.getDefault]() {
        return 0;
    }
    [zIndexProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setZIndex(this.nativeViewProtected, value);
    }
    [backgroundInternalProperty.getDefault]() {
        const nativeView = this.nativeViewProtected;
        const drawable = nativeView.getBackground();
        if (drawable) {
            const constantState = drawable.getConstantState();
            if (constantState) {
                try {
                    return constantState.newDrawable(nativeView.getResources());
                }
                catch (e) {
                    return drawable;
                }
            }
            else {
                return drawable;
            }
        }
        return null;
    }
    [backgroundInternalProperty.setNative](value) {
        this._redrawNativeBackground(value);
    }
    [minWidthProperty.setNative](value) {
        if (this.parent instanceof CustomLayoutView && this.parent.nativeViewProtected) {
            this.parent._setChildMinWidthNative(this, value);
        }
        else {
            this._setMinWidthNative(value);
        }
    }
    [minHeightProperty.setNative](value) {
        if (this.parent instanceof CustomLayoutView && this.parent.nativeViewProtected) {
            this.parent._setChildMinHeightNative(this, value);
        }
        else {
            this._setMinHeightNative(value);
        }
    }
    _applyBackground(background, isBorderDrawable, onlyColor, backgroundDrawable) {
        const nativeView = this.nativeViewProtected;
        if (!isBorderDrawable && onlyColor) {
            if (backgroundDrawable && backgroundDrawable.setColor) {
                // android.graphics.drawable.ColorDrawable
                backgroundDrawable.setColor(background.color.android);
                backgroundDrawable.invalidateSelf();
            }
            else {
                nativeView.setBackgroundColor(background.color.android);
            }
        }
        else if (!background.isEmpty()) {
            if (isBorderDrawable) {
                // org.nativescript.widgets.BorderDrawable
                refreshBorderDrawable(this, backgroundDrawable);
            }
            else {
                backgroundDrawable = new org.nativescript.widgets.BorderDrawable(layout.getDisplayDensity(), this.toString());
                refreshBorderDrawable(this, backgroundDrawable);
                nativeView.setBackground(backgroundDrawable);
            }
        }
        else {
            //empty background let's reset
            const cachedDrawable = nativeView._cachedDrawable;
            nativeView.setBackground(cachedDrawable);
        }
    }
    _drawBoxShadow(boxShadow) {
        const nativeView = this.nativeViewProtected;
        const config = {
            shadowColor: boxShadow.color.android,
            cornerRadius: Length.toDevicePixels(this.borderRadius, 0.0),
            spreadRadius: Length.toDevicePixels(boxShadow.spreadRadius, 0.0),
            blurRadius: Length.toDevicePixels(boxShadow.blurRadius, 0.0),
            offsetX: Length.toDevicePixels(boxShadow.offsetX, 0.0),
            offsetY: Length.toDevicePixels(boxShadow.offsetY, 0.0),
        };
        org.nativescript.widgets.Utils.drawBoxShadow(nativeView, JSON.stringify(config));
    }
    _redrawNativeBackground(value) {
        if (value instanceof Background) {
            this.onBackgroundOrBorderPropertyChanged();
        }
        else {
            const nativeView = this.nativeViewProtected;
            nativeView.setBackground(value);
            const style = this.style;
            const paddingTop = paddingTopProperty.isSet(style) ? this.effectivePaddingTop : this._defaultPaddingTop;
            const paddingRight = paddingRightProperty.isSet(style) ? this.effectivePaddingRight : this._defaultPaddingRight;
            const paddingBottom = paddingBottomProperty.isSet(style) ? this.effectivePaddingBottom : this._defaultPaddingBottom;
            const paddingLeft = paddingLeftProperty.isSet(style) ? this.effectivePaddingLeft : this._defaultPaddingLeft;
            if (this._isPaddingRelative) {
                nativeView.setPaddingRelative(paddingLeft, paddingTop, paddingRight, paddingBottom);
            }
            else {
                nativeView.setPadding(paddingLeft, paddingTop, paddingRight, paddingBottom);
            }
        }
    }
    onBackgroundOrBorderPropertyChanged() {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }
        const background = this.style.backgroundInternal;
        if (background.clearFlags & 2 /* CLEAR_BOX_SHADOW */ || background.clearFlags & 1 /* CLEAR_BACKGROUND_COLOR */) {
            // clear background if we're clearing the box shadow
            // or the background has been removed
            nativeView.setBackground(null);
        }
        const drawable = nativeView.getBackground();
        const androidView = this;
        // use undefined as not set. getBackground will never return undefined only Drawable or null;
        if (androidView._cachedDrawable === undefined && drawable) {
            const constantState = drawable.getConstantState();
            androidView._cachedDrawable = constantState || drawable;
        }
        const isBorderDrawable = drawable instanceof org.nativescript.widgets.BorderDrawable;
        // prettier-ignore
        const onlyColor = !background.hasBorderWidth()
            && !background.hasBorderRadius()
            && !background.hasBoxShadow()
            && !background.clipPath
            && !background.image
            && !!background.color;
        this._applyBackground(background, isBorderDrawable, onlyColor, drawable);
        if (background.hasBoxShadow()) {
            this._drawBoxShadow(background.getBoxShadow());
        }
        // TODO: Can we move BorderWidths as separate native setter?
        // This way we could skip setPadding if borderWidth is not changed.
        const leftPadding = Math.ceil(this.effectiveBorderLeftWidth + this.effectivePaddingLeft);
        const topPadding = Math.ceil(this.effectiveBorderTopWidth + this.effectivePaddingTop);
        const rightPadding = Math.ceil(this.effectiveBorderRightWidth + this.effectivePaddingRight);
        const bottomPadding = Math.ceil(this.effectiveBorderBottomWidth + this.effectivePaddingBottom);
        if (this._isPaddingRelative) {
            nativeView.setPaddingRelative(leftPadding, topPadding, rightPadding, bottomPadding);
        }
        else {
            nativeView.setPadding(leftPadding, topPadding, rightPadding, bottomPadding);
        }
        // reset clear flags
        background.clearFlags = 0 /* NONE */;
    }
    accessibilityAnnouncement(message = this.accessibilityLabel) {
        this.sendAccessibilityEvent({
            androidAccessibilityEvent: AndroidAccessibilityEvent.ANNOUNCEMENT,
            message,
        });
    }
    accessibilityScreenChanged() {
        this.sendAccessibilityEvent({
            androidAccessibilityEvent: AndroidAccessibilityEvent.WINDOW_STATE_CHANGED,
        });
    }
}
View.androidBackPressedEvent = androidBackPressedEvent;
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], View.prototype, "onLoaded", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], View.prototype, "onUnloaded", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], View.prototype, "requestLayout", null);
export class ContainerView extends View {
}
export class CustomLayoutView extends ContainerView {
    createNativeView() {
        return new org.nativescript.widgets.ContentLayout(this._context);
    }
    _addViewToNativeVisualTree(child, atIndex = Number.MAX_SAFE_INTEGER) {
        super._addViewToNativeVisualTree(child);
        if (this.nativeViewProtected && child.nativeViewProtected) {
            if (Trace.isEnabled()) {
                Trace.write(`${this}.nativeView.addView(${child}.nativeView, ${atIndex})`, Trace.categories.VisualTreeEvents);
            }
            this.nativeViewProtected.addView(child.nativeViewProtected, atIndex);
            if (child instanceof View) {
                this._updateNativeLayoutParams(child);
            }
            return true;
        }
        return false;
    }
    _updateNativeLayoutParams(child) {
        // noop
    }
    _setChildMinWidthNative(child, value) {
        child._setMinWidthNative(value);
    }
    _setChildMinHeightNative(child, value) {
        child._setMinHeightNative(value);
    }
    _removeViewFromNativeVisualTree(child) {
        super._removeViewFromNativeVisualTree(child);
        const nativeView = this.nativeViewProtected;
        const childView = child.nativeViewProtected;
        if (nativeView && childView) {
            nativeView.removeView(childView);
            if (Trace.isEnabled()) {
                Trace.write(`${nativeView}.removeView(${childView})`, Trace.categories.VisualTreeEvents);
                Trace.notifyEvent(child, 'childInLayoutRemovedFromNativeVisualTree');
            }
        }
    }
}
const percentNotSupported = (view, value) => {
    throw new Error('PercentLength is not supported.');
};
function createNativePercentLengthProperty(options) {
    const { getter, setter, auto = 0 } = options;
    let setPixels, getPixels, setPercent;
    if (getter) {
        View.prototype[getter] = function () {
            if (options) {
                setPixels = options.setPixels;
                getPixels = options.getPixels;
                setPercent = options.setPercent || percentNotSupported;
                options = null;
            }
            const value = getPixels(this.nativeViewProtected);
            if (value == auto) {
                // tslint:disable-line
                return 'auto';
            }
            else {
                return { value, unit: 'px' };
            }
        };
    }
    if (setter) {
        View.prototype[setter] = function (length) {
            if (options) {
                setPixels = options.setPixels;
                getPixels = options.getPixels;
                setPercent = options.setPercent || percentNotSupported;
                options = null;
            }
            if (length == 'auto' || length == null) {
                // tslint:disable-line
                setPixels(this.nativeViewProtected, auto);
            }
            else if (typeof length === 'number') {
                setPixels(this.nativeViewProtected, layout.round(layout.toDevicePixels(length)));
            }
            else if (length.unit == 'dip') {
                // tslint:disable-line
                setPixels(this.nativeViewProtected, layout.round(layout.toDevicePixels(length.value)));
            }
            else if (length.unit == 'px') {
                // tslint:disable-line
                setPixels(this.nativeViewProtected, layout.round(length.value));
            }
            else if (length.unit == '%') {
                // tslint:disable-line
                setPercent(this.nativeViewProtected, length.value);
            }
            else {
                throw new Error(`Unsupported PercentLength ${length}`);
            }
        };
    }
}
createNativePercentLengthProperty({
    setter: marginTopProperty.setNative,
    get setPixels() {
        return org.nativescript.widgets.ViewHelper.setMarginTop;
    },
    get setPercent() {
        return org.nativescript.widgets.ViewHelper.setMarginTopPercent;
    },
});
createNativePercentLengthProperty({
    setter: marginRightProperty.setNative,
    get setPixels() {
        return org.nativescript.widgets.ViewHelper.setMarginRight;
    },
    get setPercent() {
        return org.nativescript.widgets.ViewHelper.setMarginRightPercent;
    },
});
createNativePercentLengthProperty({
    setter: marginBottomProperty.setNative,
    get setPixels() {
        return org.nativescript.widgets.ViewHelper.setMarginBottom;
    },
    get setPercent() {
        return org.nativescript.widgets.ViewHelper.setMarginBottomPercent;
    },
});
createNativePercentLengthProperty({
    setter: marginLeftProperty.setNative,
    get setPixels() {
        return org.nativescript.widgets.ViewHelper.setMarginLeft;
    },
    get setPercent() {
        return org.nativescript.widgets.ViewHelper.setMarginLeftPercent;
    },
});
createNativePercentLengthProperty({
    setter: widthProperty.setNative,
    auto: -1,
    get setPixels() {
        return org.nativescript.widgets.ViewHelper.setWidth;
    },
    get setPercent() {
        return org.nativescript.widgets.ViewHelper.setWidthPercent;
    },
});
createNativePercentLengthProperty({
    setter: heightProperty.setNative,
    auto: -1,
    get setPixels() {
        return org.nativescript.widgets.ViewHelper.setHeight;
    },
    get setPercent() {
        return org.nativescript.widgets.ViewHelper.setHeightPercent;
    },
});
createNativePercentLengthProperty({
    setter: '_setMinWidthNative',
    get setPixels() {
        return org.nativescript.widgets.ViewHelper.setMinWidth;
    },
});
createNativePercentLengthProperty({
    setter: '_setMinHeightNative',
    get setPixels() {
        return org.nativescript.widgets.ViewHelper.setMinHeight;
    },
});
//# sourceMappingURL=index.android.js.map