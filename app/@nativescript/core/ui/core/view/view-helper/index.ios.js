// Requires
import { ViewHelper } from './view-helper-common';
import { iOSNativeHelper, layout } from '../../../../utils';
import { Trace } from '../../../../trace';
export * from './view-helper-common';
const majorVersion = iOSNativeHelper.MajorVersion;
var UILayoutViewController = /** @class */ (function (_super) {
    __extends(UILayoutViewController, _super);
    function UILayoutViewController() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UILayoutViewController.initWithOwner = function (owner) {
        var controller = UILayoutViewController.new();
        controller.owner = owner;
        return controller;
    };
    UILayoutViewController.prototype.viewDidLoad = function () {
        _super.prototype.viewDidLoad.call(this);
        // Unify translucent and opaque bars layout
        // this.edgesForExtendedLayout = UIRectEdgeBottom;
        this.extendedLayoutIncludesOpaqueBars = true;
    };
    UILayoutViewController.prototype.viewWillLayoutSubviews = function () {
        _super.prototype.viewWillLayoutSubviews.call(this);
        var owner = this.owner.get();
        if (owner) {
            IOSHelper.updateConstraints(this, owner);
        }
    };
    UILayoutViewController.prototype.viewDidLayoutSubviews = function () {
        _super.prototype.viewDidLayoutSubviews.call(this);
        var owner = this.owner.get();
        if (owner) {
            if (majorVersion >= 11) {
                // Handle nested UILayoutViewController safe area application.
                // Currently, UILayoutViewController can be nested only in a TabView.
                // The TabView itself is handled by the OS, so we check the TabView's parent (usually a Page, but can be a Layout).
                var tabViewItem = owner.parent;
                var tabView = tabViewItem && tabViewItem.parent;
                var parent = tabView && tabView.parent;
                // Handle Angular scenario where TabView is in a ProxyViewContainer
                // It is possible to wrap components in ProxyViewContainers indefinitely
                // Not using instanceof ProxyViewContainer to avoid circular dependency
                // TODO: Try moving UILayoutViewController out of view module
                while (parent && !parent.nativeViewProtected) {
                    parent = parent.parent;
                }
                if (parent) {
                    var parentPageInsetsTop = parent.nativeViewProtected.safeAreaInsets.top;
                    var currentInsetsTop = this.view.safeAreaInsets.top;
                    var additionalInsetsTop = Math.max(parentPageInsetsTop - currentInsetsTop, 0);
                    var parentPageInsetsBottom = parent.nativeViewProtected.safeAreaInsets.bottom;
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
    UILayoutViewController.prototype.viewWillAppear = function (animated) {
        _super.prototype.viewWillAppear.call(this, animated);
        var owner = this.owner.get();
        if (!owner) {
            return;
        }
        IOSHelper.updateAutoAdjustScrollInsets(this, owner);
        if (!owner.parent) {
            owner.callLoaded();
        }
    };
    UILayoutViewController.prototype.viewDidDisappear = function (animated) {
        _super.prototype.viewDidDisappear.call(this, animated);
        var owner = this.owner.get();
        if (owner && !owner.parent) {
            owner.callUnloaded();
        }
    };
    // Mind implementation for other controllers
    UILayoutViewController.prototype.traitCollectionDidChange = function (previousTraitCollection) {
        _super.prototype.traitCollectionDidChange.call(this, previousTraitCollection);
        if (majorVersion >= 13) {
            var owner = this.owner.get();
            if (owner && this.traitCollection.hasDifferentColorAppearanceComparedToTraitCollection && this.traitCollection.hasDifferentColorAppearanceComparedToTraitCollection(previousTraitCollection)) {
                owner.notify({
                    eventName: IOSHelper.traitCollectionColorAppearanceChangedEvent,
                    object: owner,
                });
            }
        }
    };
    return UILayoutViewController;
}(UIViewController));
var UIAdaptivePresentationControllerDelegateImp = /** @class */ (function (_super) {
    __extends(UIAdaptivePresentationControllerDelegateImp, _super);
    function UIAdaptivePresentationControllerDelegateImp() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UIAdaptivePresentationControllerDelegateImp.initWithOwnerAndCallback = function (owner, whenClosedCallback) {
        var instance = _super.new.call(this);
        instance.owner = owner;
        instance.closedCallback = whenClosedCallback;
        return instance;
    };
    UIAdaptivePresentationControllerDelegateImp.prototype.presentationControllerDidDismiss = function (presentationController) {
        var owner = this.owner.get();
        if (owner && typeof this.closedCallback === 'function') {
            this.closedCallback();
        }
    };
    UIAdaptivePresentationControllerDelegateImp.ObjCProtocols = [UIAdaptivePresentationControllerDelegate];
    return UIAdaptivePresentationControllerDelegateImp;
}(NSObject));
var UIPopoverPresentationControllerDelegateImp = /** @class */ (function (_super) {
    __extends(UIPopoverPresentationControllerDelegateImp, _super);
    function UIPopoverPresentationControllerDelegateImp() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UIPopoverPresentationControllerDelegateImp.initWithOwnerAndCallback = function (owner, whenClosedCallback) {
        var instance = _super.new.call(this);
        instance.owner = owner;
        instance.closedCallback = whenClosedCallback;
        return instance;
    };
    UIPopoverPresentationControllerDelegateImp.prototype.popoverPresentationControllerDidDismissPopover = function (popoverPresentationController) {
        var owner = this.owner.get();
        if (owner && typeof this.closedCallback === 'function') {
            this.closedCallback();
        }
    };
    UIPopoverPresentationControllerDelegateImp.ObjCProtocols = [UIPopoverPresentationControllerDelegate];
    return UIPopoverPresentationControllerDelegateImp;
}(NSObject));
export class IOSHelper {
    static getParentWithViewController(view) {
        while (view && !view.viewController) {
            view = view.parent;
        }
        // Note: Might return undefined if no parent with viewController is found
        return view;
    }
    static updateAutoAdjustScrollInsets(controller, owner) {
        if (majorVersion <= 10) {
            owner._automaticallyAdjustsScrollViewInsets = false;
            // This API is deprecated, but has no alternative for <= iOS 10
            // Defaults to true and results to appliyng the insets twice together with our logic
            // for iOS 11+ we use the contentInsetAdjustmentBehavior property in scrollview
            // https://developer.apple.com/documentation/uikit/uiviewcontroller/1621372-automaticallyadjustsscrollviewin
            controller.automaticallyAdjustsScrollViewInsets = false;
        }
    }
    static updateConstraints(controller, owner) {
        if (majorVersion <= 10) {
            const layoutGuide = IOSHelper.initLayoutGuide(controller);
            controller.view.safeAreaLayoutGuide = layoutGuide;
        }
    }
    static initLayoutGuide(controller) {
        const rootView = controller.view;
        const layoutGuide = UILayoutGuide.new();
        rootView.addLayoutGuide(layoutGuide);
        NSLayoutConstraint.activateConstraints([layoutGuide.topAnchor.constraintEqualToAnchor(controller.topLayoutGuide.bottomAnchor), layoutGuide.bottomAnchor.constraintEqualToAnchor(controller.bottomLayoutGuide.topAnchor), layoutGuide.leadingAnchor.constraintEqualToAnchor(rootView.leadingAnchor), layoutGuide.trailingAnchor.constraintEqualToAnchor(rootView.trailingAnchor)]);
        return layoutGuide;
    }
    static layoutView(controller, owner) {
        let layoutGuide = controller.view.safeAreaLayoutGuide;
        if (!layoutGuide) {
            Trace.write(`safeAreaLayoutGuide during layout of ${owner}. Creating fallback constraints, but layout might be wrong.`, Trace.categories.Layout, Trace.messageType.error);
            layoutGuide = IOSHelper.initLayoutGuide(controller);
        }
        const safeArea = layoutGuide.layoutFrame;
        let position = IOSHelper.getPositionFromFrame(safeArea);
        const safeAreaSize = safeArea.size;
        const hasChildViewControllers = controller.childViewControllers.count > 0;
        if (hasChildViewControllers) {
            const fullscreen = controller.view.frame;
            position = IOSHelper.getPositionFromFrame(fullscreen);
        }
        const safeAreaWidth = layout.round(layout.toDevicePixels(safeAreaSize.width));
        const safeAreaHeight = layout.round(layout.toDevicePixels(safeAreaSize.height));
        const widthSpec = layout.makeMeasureSpec(safeAreaWidth, layout.EXACTLY);
        const heightSpec = layout.makeMeasureSpec(safeAreaHeight, layout.EXACTLY);
        ViewHelper.measureChild(null, owner, widthSpec, heightSpec);
        ViewHelper.layoutChild(null, owner, position.left, position.top, position.right, position.bottom);
        if (owner.parent) {
            owner.parent._layoutParent();
        }
    }
    static getPositionFromFrame(frame) {
        const left = layout.round(layout.toDevicePixels(frame.origin.x));
        const top = layout.round(layout.toDevicePixels(frame.origin.y));
        const right = layout.round(layout.toDevicePixels(frame.origin.x + frame.size.width));
        const bottom = layout.round(layout.toDevicePixels(frame.origin.y + frame.size.height));
        return { left, right, top, bottom };
    }
    static getFrameFromPosition(position, insets) {
        insets = insets || { left: 0, top: 0, right: 0, bottom: 0 };
        const left = layout.toDeviceIndependentPixels(position.left + insets.left);
        const top = layout.toDeviceIndependentPixels(position.top + insets.top);
        const width = layout.toDeviceIndependentPixels(position.right - position.left - insets.left - insets.right);
        const height = layout.toDeviceIndependentPixels(position.bottom - position.top - insets.top - insets.bottom);
        return CGRectMake(left, top, width, height);
    }
    static shrinkToSafeArea(view, frame) {
        const insets = view.getSafeAreaInsets();
        if (insets.left || insets.top) {
            const position = IOSHelper.getPositionFromFrame(frame);
            const adjustedFrame = IOSHelper.getFrameFromPosition(position, insets);
            if (Trace.isEnabled()) {
                Trace.write(this + ' :shrinkToSafeArea: ' + JSON.stringify(IOSHelper.getPositionFromFrame(adjustedFrame)), Trace.categories.Layout);
            }
            return adjustedFrame;
        }
        return null;
    }
    static expandBeyondSafeArea(view, frame) {
        const availableSpace = IOSHelper.getAvailableSpaceFromParent(view, frame);
        const safeArea = availableSpace.safeArea;
        const fullscreen = availableSpace.fullscreen;
        const inWindow = availableSpace.inWindow;
        const position = IOSHelper.getPositionFromFrame(frame);
        const safeAreaPosition = IOSHelper.getPositionFromFrame(safeArea);
        const fullscreenPosition = IOSHelper.getPositionFromFrame(fullscreen);
        const inWindowPosition = IOSHelper.getPositionFromFrame(inWindow);
        const adjustedPosition = position;
        if (position.left && inWindowPosition.left <= safeAreaPosition.left) {
            adjustedPosition.left = fullscreenPosition.left;
        }
        if (position.top && inWindowPosition.top <= safeAreaPosition.top) {
            adjustedPosition.top = fullscreenPosition.top;
        }
        if (inWindowPosition.right < fullscreenPosition.right && inWindowPosition.right >= safeAreaPosition.right + fullscreenPosition.left) {
            adjustedPosition.right += fullscreenPosition.right - inWindowPosition.right;
        }
        if (inWindowPosition.bottom < fullscreenPosition.bottom && inWindowPosition.bottom >= safeAreaPosition.bottom + fullscreenPosition.top) {
            adjustedPosition.bottom += fullscreenPosition.bottom - inWindowPosition.bottom;
        }
        const adjustedFrame = CGRectMake(layout.toDeviceIndependentPixels(adjustedPosition.left), layout.toDeviceIndependentPixels(adjustedPosition.top), layout.toDeviceIndependentPixels(adjustedPosition.right - adjustedPosition.left), layout.toDeviceIndependentPixels(adjustedPosition.bottom - adjustedPosition.top));
        if (Trace.isEnabled()) {
            Trace.write(view + ' :expandBeyondSafeArea: ' + JSON.stringify(IOSHelper.getPositionFromFrame(adjustedFrame)), Trace.categories.Layout);
        }
        return adjustedFrame;
    }
    static getAvailableSpaceFromParent(view, frame) {
        if (!view) {
            return;
        }
        let scrollView = null;
        let viewControllerView = null;
        if (view.viewController) {
            viewControllerView = view.viewController.view;
        }
        else {
            let parent = view.parent;
            while (parent && !parent.viewController && !(parent.nativeViewProtected instanceof UIScrollView)) {
                parent = parent.parent;
            }
            if (parent.nativeViewProtected instanceof UIScrollView) {
                scrollView = parent.nativeViewProtected;
            }
            else if (parent.viewController) {
                viewControllerView = parent.viewController.view;
            }
        }
        let fullscreen = null;
        let safeArea = null;
        let controllerInWindow = { x: 0, y: 0 };
        if (viewControllerView) {
            safeArea = viewControllerView.safeAreaLayoutGuide.layoutFrame;
            fullscreen = viewControllerView.frame;
            controllerInWindow = viewControllerView.convertPointToView(viewControllerView.bounds.origin, null);
        }
        else if (scrollView) {
            const insets = scrollView.safeAreaInsets;
            safeArea = CGRectMake(insets.left, insets.top, scrollView.contentSize.width - insets.left - insets.right, scrollView.contentSize.height - insets.top - insets.bottom);
            fullscreen = CGRectMake(0, 0, scrollView.contentSize.width, scrollView.contentSize.height);
        }
        // We take into account the controller position inside the window.
        // for example with a bottomsheet the controller will be "offset"
        const locationInWindow = view.getLocationInWindow();
        let inWindowLeft = locationInWindow.x - controllerInWindow.x;
        let inWindowTop = locationInWindow.y - controllerInWindow.y;
        if (scrollView) {
            inWindowLeft += scrollView.contentOffset.x;
            inWindowTop += scrollView.contentOffset.y;
        }
        const inWindow = CGRectMake(inWindowLeft, inWindowTop, frame.size.width, frame.size.height);
        return {
            safeArea: safeArea,
            fullscreen: fullscreen,
            inWindow: inWindow,
        };
    }
}
IOSHelper.traitCollectionColorAppearanceChangedEvent = 'traitCollectionColorAppearanceChanged';
IOSHelper.UILayoutViewController = UILayoutViewController;
IOSHelper.UIAdaptivePresentationControllerDelegateImp = UIAdaptivePresentationControllerDelegateImp;
IOSHelper.UIPopoverPresentationControllerDelegateImp = UIPopoverPresentationControllerDelegateImp;
//# sourceMappingURL=index.ios.js.map