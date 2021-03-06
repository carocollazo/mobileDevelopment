// Definitions.
import { NavigationType } from '../frame';
// Types.
import { View, IOSHelper } from '../core/view';
import { PageBase, actionBarHiddenProperty, statusBarStyleProperty } from './page-common';
import { profile } from '../../profiling';
import { iOSNativeHelper, layout } from '../../utils';
import { getLastFocusedViewOnPage, isAccessibilityServiceEnabled } from '../../accessibility';
export * from './page-common';
const ENTRY = '_entry';
const DELEGATE = '_delegate';
const TRANSITION = '_transition';
const NON_ANIMATED_TRANSITION = 'non-animated';
const majorVersion = iOSNativeHelper.MajorVersion;
function isBackNavigationTo(page, entry) {
    const frame = page.frame;
    if (!frame) {
        return false;
    }
    // if executing context is null here this most probably means back navigation through iOS back button
    const navigationContext = frame._executingContext || {
        navigationType: NavigationType.back,
    };
    const isReplace = navigationContext.navigationType === NavigationType.replace;
    if (isReplace) {
        return false;
    }
    if (frame.navigationQueueIsEmpty()) {
        return true;
    }
    const navigationQueue = frame._navigationQueue;
    for (let i = 0; i < navigationQueue.length; i++) {
        if (navigationQueue[i].entry === entry) {
            return navigationQueue[i].navigationType === NavigationType.back;
        }
    }
    return false;
}
function isBackNavigationFrom(controller, page) {
    if (!page.frame) {
        return false;
    }
    // Controller is cleared or backstack skipped
    if (controller.isBackstackCleared || controller.isBackstackSkipped) {
        return false;
    }
    if (controller.navigationController && controller.navigationController.viewControllers.containsObject(controller)) {
        return false;
    }
    return true;
}
var UIViewControllerImpl = /** @class */ (function (_super) {
    __extends(UIViewControllerImpl, _super);
    function UIViewControllerImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UIViewControllerImpl.initWithOwner = function (owner) {
        var controller = UIViewControllerImpl.new();
        controller._owner = owner;
        return controller;
    };
    UIViewControllerImpl.prototype.viewDidLoad = function () {
        _super.prototype.viewDidLoad.call(this);
        // Unify translucent and opaque bars layout
        // this.edgesForExtendedLayout = UIRectEdgeBottom;
        this.extendedLayoutIncludesOpaqueBars = true;
    };
    UIViewControllerImpl.prototype.viewWillAppear = function (animated) {
        _super.prototype.viewWillAppear.call(this, animated);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var frame = this.navigationController ? this.navigationController.owner : null;
        var newEntry = this[ENTRY];
        // Don't raise event if currentPage was showing modal page.
        if (!owner._presentedViewController && newEntry && (!frame || frame.currentPage !== owner)) {
            var isBack = isBackNavigationTo(owner, newEntry);
            owner.onNavigatingTo(newEntry.entry.context, isBack, newEntry.entry.bindingContext);
        }
        if (frame) {
            if (!owner.parent) {
                owner._frame = frame;
                if (!frame._styleScope) {
                    // Make sure page will have styleScope even if frame don't.
                    owner._updateStyleScope();
                }
                frame._addView(owner);
            }
            else if (owner.parent !== frame) {
                throw new Error('Page is already shown on another frame.');
            }
            frame._updateActionBar(owner);
        }
        // Set autoAdjustScrollInsets in will appear - as early as possible
        IOSHelper.updateAutoAdjustScrollInsets(this, owner);
        // Pages in backstack are unloaded so raise loaded here.
        if (!owner.isLoaded) {
            owner.callLoaded();
        }
        else {
            // Note: Handle the case of canceled backstack navigation. (https://github.com/NativeScript/NativeScript/issues/7430)
            // In this case viewWillAppear will be executed for the previous page and it will change the ActionBar
            // because changes happen in an interactive transition - IOS will animate between the the states.
            // If canceled - viewWillAppear will be called for the current page(which is already loaded) and we need to
            // update the action bar explicitly, so that it is not left styles as the previous page.
            owner.updateWithWillAppear(animated);
        }
    };
    UIViewControllerImpl.prototype.viewDidAppear = function (animated) {
        var _a;
        _super.prototype.viewDidAppear.call(this, animated);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var navigationController = this.navigationController;
        var frame = navigationController ? navigationController.owner : null;
        // Skip navigation events if modal page is shown.
        if (!owner._presentedViewController && frame) {
            var newEntry = this[ENTRY];
            // frame.setCurrent(...) will reset executing context so retrieve it here
            // if executing context is null here this most probably means back navigation through iOS back button
            var navigationContext = frame._executingContext || {
                navigationType: NavigationType.back,
            };
            var isReplace = navigationContext.navigationType === NavigationType.replace;
            frame.setCurrent(newEntry, navigationContext.navigationType);
            if (isReplace) {
                var controller = newEntry.resolvedPage.ios;
                if (controller) {
                    var animated_1 = frame._getIsAnimatedNavigation(newEntry.entry);
                    if (animated_1) {
                        controller[TRANSITION] = frame._getNavigationTransition(newEntry.entry);
                    }
                    else {
                        controller[TRANSITION] = {
                            name: NON_ANIMATED_TRANSITION,
                        };
                    }
                }
            }
            // If page was shown with custom animation - we need to set the navigationController.delegate to the animatedDelegate.
            if ((_a = frame.ios) === null || _a === void 0 ? void 0 : _a.controller) {
                frame.ios.controller.delegate = this[DELEGATE];
            }
            frame._processNavigationQueue(owner);
            // _processNavigationQueue will shift navigationQueue. Check canGoBack after that.
            // Workaround for disabled backswipe on second custom native transition
            if (frame.canGoBack()) {
                navigationController.interactivePopGestureRecognizer.delegate = navigationController;
                navigationController.interactivePopGestureRecognizer.enabled = owner.enableSwipeBackNavigation;
            }
            else {
                navigationController.interactivePopGestureRecognizer.enabled = false;
            }
        }
        if (!this.presentedViewController) {
            // clear presented viewController here only if no presented controller.
            // this is needed because in iOS9 the order of events could be - willAppear, willDisappear, didAppear.
            // If we clean it when we have viewController then once presented VC is dismissed then
            owner._presentedViewController = null;
        }
    };
    UIViewControllerImpl.prototype.viewWillDisappear = function (animated) {
        _super.prototype.viewWillDisappear.call(this, animated);
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        // Cache presentedViewController if any. We don't want to raise
        // navigation events in case of presenting view controller.
        if (!owner._presentedViewController) {
            owner._presentedViewController = this.presentedViewController;
        }
        var frame = owner.frame;
        // Skip navigation events if we are hiding because we are about to show a modal page,
        // or because we are closing a modal page,
        // or because we are in tab and another controller is selected.
        var tab = this.tabBarController;
        if (owner.onNavigatingFrom && !owner._presentedViewController && frame && (!this.presentingViewController || frame.backStack.length > 0) && frame.currentPage === owner) {
            var willSelectViewController = tab && tab._willSelectViewController;
            if (!willSelectViewController || willSelectViewController === tab.selectedViewController) {
                var isBack = isBackNavigationFrom(this, owner);
                owner.onNavigatingFrom(isBack);
            }
        }
        owner.updateWithWillDisappear(animated);
    };
    UIViewControllerImpl.prototype.viewDidDisappear = function (animated) {
        _super.prototype.viewDidDisappear.call(this, animated);
        var page = this._owner.get();
        // Exit if no page or page is hiding because it shows another page modally.
        if (!page || page.modal || page._presentedViewController) {
            return;
        }
        // Forward navigation does not remove page from frame so we raise unloaded manually.
        if (page.isLoaded) {
            page.callUnloaded();
        }
    };
    UIViewControllerImpl.prototype.viewWillLayoutSubviews = function () {
        _super.prototype.viewWillLayoutSubviews.call(this);
        var owner = this._owner.get();
        if (owner) {
            IOSHelper.updateConstraints(this, owner);
        }
    };
    UIViewControllerImpl.prototype.viewDidLayoutSubviews = function () {
        _super.prototype.viewDidLayoutSubviews.call(this);
        var owner = this._owner.get();
        if (owner) {
            // layout(owner.actionBar)
            // layout(owner.content)
            if (majorVersion >= 11) {
                // Handle nested Page safe area insets application.
                // A Page is nested if its Frame has a parent.
                // If the Page is nested, cross check safe area insets on top and bottom with Frame parent.
                var frame = owner.parent;
                // There is a legacy scenario where Page is not in a Frame - the root of a Modal View, so it has no parent.
                var frameParent = frame && frame.parent;
                // Handle Angular scenario where TabView is in a ProxyViewContainer
                // It is possible to wrap components in ProxyViewContainers indefinitely
                // Not using instanceof ProxyViewContainer to avoid circular dependency
                // TODO: Try moving UIViewControllerImpl out of page module
                while (frameParent && !frameParent.nativeViewProtected) {
                    frameParent = frameParent.parent;
                }
                if (frameParent) {
                    var parentPageInsetsTop = frameParent.nativeViewProtected.safeAreaInsets.top;
                    var currentInsetsTop = this.view.safeAreaInsets.top;
                    var additionalInsetsTop = Math.max(parentPageInsetsTop - currentInsetsTop, 0);
                    var parentPageInsetsBottom = frameParent.nativeViewProtected.safeAreaInsets.bottom;
                    var currentInsetsBottom = this.view.safeAreaInsets.bottom;
                    var additionalInsetsBottom = Math.max(parentPageInsetsBottom - currentInsetsBottom, 0);
                    if (additionalInsetsTop > 0 || additionalInsetsBottom > 0) {
                        var additionalInsets = new UIEdgeInsets({
                            top: additionalInsetsTop,
                            left: 0,
                            bottom: additionalInsetsBottom,
                            right: 0,
                        });
                        this.additionalSafeAreaInsets = additionalInsets;
                    }
                }
            }
            IOSHelper.layoutView(this, owner);
        }
    };
    // Mind implementation for other controllerss
    UIViewControllerImpl.prototype.traitCollectionDidChange = function (previousTraitCollection) {
        _super.prototype.traitCollectionDidChange.call(this, previousTraitCollection);
        if (majorVersion >= 13) {
            var owner = this._owner.get();
            if (owner && this.traitCollection.hasDifferentColorAppearanceComparedToTraitCollection && this.traitCollection.hasDifferentColorAppearanceComparedToTraitCollection(previousTraitCollection)) {
                owner.notify({
                    eventName: IOSHelper.traitCollectionColorAppearanceChangedEvent,
                    object: owner,
                });
            }
        }
    };
    Object.defineProperty(UIViewControllerImpl.prototype, "preferredStatusBarStyle", {
        // TODO: a11y
        // public accessibilityPerformEscape() {
        // 	const owner = this._owner.get();
        // 	if (!owner) {
        // 		return false;
        // 	}
        // 	console.log('page accessibilityPerformEscape');
        // 	if (owner.onAccessibilityPerformEscape) {
        // 		const result = owner.onAccessibilityPerformEscape();
        // 		return result;
        // 	} else {
        // 		return false;
        // 	}
        // }
        // @ts-ignore
        get: function () {
            var owner = this._owner.get();
            if (owner) {
                return owner.statusBarStyle === 'dark' ? UIStatusBarStyle.LightContent : UIStatusBarStyle.Default;
            }
            else {
                return UIStatusBarStyle.Default;
            }
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        profile
    ], UIViewControllerImpl.prototype, "viewDidAppear", null);
    __decorate([
        profile
    ], UIViewControllerImpl.prototype, "viewWillDisappear", null);
    __decorate([
        profile
    ], UIViewControllerImpl.prototype, "viewDidDisappear", null);
    return UIViewControllerImpl;
}(UIViewController));
export class Page extends PageBase {
    constructor() {
        super();
        this._backgroundColor = majorVersion <= 12 && !UIColor.systemBackgroundColor ? UIColor.whiteColor : UIColor.systemBackgroundColor;
        const controller = UIViewControllerImpl.initWithOwner(new WeakRef(this));
        this.viewController = this._ios = controller;
        // Make transitions look good
        controller.view.backgroundColor = this._backgroundColor;
    }
    createNativeView() {
        return this.viewController.view;
    }
    // @ts-ignore
    get ios() {
        return this._ios;
    }
    get frame() {
        return this._frame;
    }
    layoutNativeView(left, top, right, bottom) {
        //
    }
    _setNativeViewFrame(nativeView, frame) {
        //
    }
    _shouldDelayLayout() {
        return this._frame && this._frame._animationInProgress;
    }
    onLoaded() {
        super.onLoaded();
        if (this.hasActionBar) {
            this.actionBar.update();
        }
    }
    updateWithWillAppear(animated) {
        // this method is important because it allows plugins to react to modal page close
        // for example allowing updating status bar background color
        this.actionBar.update();
        this.updateStatusBar();
    }
    updateWithWillDisappear(animated) {
        // this method is important because it allows plugins to react to modal page close
        // for example allowing updating status bar background color
    }
    updateStatusBar() {
        this._updateStatusBarStyle(this.statusBarStyle);
    }
    _updateStatusBarStyle(value) {
        const frame = this.frame;
        if (this.frame && value) {
            const navigationController = frame.ios.controller;
            const navigationBar = navigationController.navigationBar;
            navigationBar.barStyle = value === 'dark' ? 1 /* Black */ : 0 /* Default */;
        }
    }
    _updateEnableSwipeBackNavigation(enabled) {
        const navController = this._ios.navigationController;
        if (this.frame && navController && navController.interactivePopGestureRecognizer) {
            // Make sure we don't set true if cannot go back
            enabled = enabled && this.frame.canGoBack();
            navController.interactivePopGestureRecognizer.enabled = enabled;
        }
    }
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        const width = layout.getMeasureSpecSize(widthMeasureSpec);
        const widthMode = layout.getMeasureSpecMode(widthMeasureSpec);
        const height = layout.getMeasureSpecSize(heightMeasureSpec);
        const heightMode = layout.getMeasureSpecMode(heightMeasureSpec);
        if (this.frame && this.frame._getNavBarVisible(this)) {
            const { width, height } = this.actionBar._getActualSize;
            const widthSpec = layout.makeMeasureSpec(width, layout.EXACTLY);
            const heightSpec = layout.makeMeasureSpec(height, layout.EXACTLY);
            View.measureChild(this, this.actionBar, widthSpec, heightSpec);
        }
        const result = View.measureChild(this, this.layoutView, widthMeasureSpec, heightMeasureSpec);
        const measureWidth = Math.max(result.measuredWidth, this.effectiveMinWidth);
        const measureHeight = Math.max(result.measuredHeight, this.effectiveMinHeight);
        const widthAndState = View.resolveSizeAndState(measureWidth, width, widthMode, 0);
        const heightAndState = View.resolveSizeAndState(measureHeight, height, heightMode, 0);
        this.setMeasuredDimension(widthAndState, heightAndState);
    }
    onLayout(left, top, right, bottom) {
        const { width: actionBarWidth, height: actionBarHeight } = this.actionBar._getActualSize;
        View.layoutChild(this, this.actionBar, 0, 0, actionBarWidth, actionBarHeight);
        const insets = this.getSafeAreaInsets();
        if (majorVersion <= 10) {
            // iOS 10 and below don't have safe area insets API,
            // there we need only the top inset on the Page
            insets.top = layout.round(layout.toDevicePixels(this.viewController.view.safeAreaLayoutGuide.layoutFrame.origin.y));
        }
        const childLeft = 0 + insets.left;
        const childTop = 0 + insets.top;
        const childRight = right - insets.right;
        const childBottom = bottom - insets.bottom;
        View.layoutChild(this, this.layoutView, childLeft, childTop, childRight, childBottom);
    }
    _addViewToNativeVisualTree(child, atIndex) {
        // ActionBar is handled by the UINavigationController
        if (child === this.actionBar) {
            return true;
        }
        const nativeParent = this.nativeViewProtected;
        const nativeChild = child.nativeViewProtected;
        const viewController = child.ios instanceof UIViewController ? child.ios : child.viewController;
        if (viewController) {
            // Adding modal controllers to as child will make app freeze.
            if (this.viewController.presentedViewController === viewController) {
                return true;
            }
            this.viewController.addChildViewController(viewController);
        }
        if (nativeParent && nativeChild) {
            if (typeof atIndex !== 'number' || atIndex >= nativeParent.subviews.count) {
                nativeParent.addSubview(nativeChild);
            }
            else {
                nativeParent.insertSubviewAtIndex(nativeChild, atIndex);
            }
            return true;
        }
        return false;
    }
    _removeViewFromNativeVisualTree(child) {
        // ActionBar is handled by the UINavigationController
        if (child === this.actionBar) {
            return;
        }
        const viewController = child.ios instanceof UIViewController ? child.ios : child.viewController;
        if (viewController) {
            viewController.removeFromParentViewController();
        }
        super._removeViewFromNativeVisualTree(child);
    }
    [actionBarHiddenProperty.setNative](value) {
        this._updateEnableSwipeBackNavigation(value);
        // Invalidate all inner controller.
        invalidateTopmostController(this.viewController);
        const frame = this.frame;
        if (frame) {
            // Update nav-bar visibility with disabled animations
            frame._updateActionBar(this, true);
        }
    }
    [statusBarStyleProperty.getDefault]() {
        return 0 /* Default */;
    }
    [statusBarStyleProperty.setNative](value) {
        const frame = this.frame;
        if (frame) {
            const navigationBar = frame.ios.controller.navigationBar;
            if (typeof value === 'string') {
                navigationBar.barStyle = value === 'dark' ? 1 /* Black */ : 0 /* Default */;
            }
            else {
                navigationBar.barStyle = value;
            }
        }
    }
    accessibilityScreenChanged(refocus = false) {
        if (!isAccessibilityServiceEnabled()) {
            return;
        }
        if (refocus) {
            const lastFocusedView = getLastFocusedViewOnPage(this);
            if (lastFocusedView) {
                const uiView = lastFocusedView.nativeViewProtected;
                if (uiView) {
                    UIAccessibilityPostNotification(UIAccessibilityScreenChangedNotification, uiView);
                    return;
                }
            }
        }
        if (this.actionBarHidden) {
            UIAccessibilityPostNotification(UIAccessibilityScreenChangedNotification, this.nativeViewProtected);
            return;
        }
        if (this.accessibilityLabel) {
            UIAccessibilityPostNotification(UIAccessibilityScreenChangedNotification, this.nativeViewProtected);
            return;
        }
        if (this.actionBar.accessibilityLabel || this.actionBar.title) {
            UIAccessibilityPostNotification(UIAccessibilityScreenChangedNotification, this.actionBar.nativeView);
            return;
        }
        UIAccessibilityPostNotification(UIAccessibilityScreenChangedNotification, this.nativeViewProtected);
    }
}
function invalidateTopmostController(controller) {
    if (!controller) {
        return;
    }
    controller.view.setNeedsLayout();
    const presentedViewController = controller.presentedViewController;
    if (presentedViewController) {
        return invalidateTopmostController(presentedViewController);
    }
    const childControllers = controller.childViewControllers;
    let size = controller.childViewControllers.count;
    while (size > 0) {
        const childController = childControllers[--size];
        if (childController instanceof UITabBarController) {
            invalidateTopmostController(childController.selectedViewController);
        }
        else if (childController instanceof UINavigationController) {
            invalidateTopmostController(childController.topViewController);
        }
        else if (childController instanceof UISplitViewController) {
            invalidateTopmostController(childController.viewControllers.lastObject);
        }
        else {
            invalidateTopmostController(childController);
        }
    }
}
//# sourceMappingURL=index.ios.js.map