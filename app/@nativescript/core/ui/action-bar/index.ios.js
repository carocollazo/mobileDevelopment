import { ActionItemBase, ActionBarBase, isVisible, flatProperty, iosIconRenderingModeProperty, traceMissingIcon } from './action-bar-common';
import { View } from '../core/view';
import { Color } from '../../color';
import { colorProperty, backgroundColorProperty, backgroundInternalProperty } from '../styling/style-properties';
import { ImageSource } from '../../image-source';
import { layout, iOSNativeHelper, isFontIconURI } from '../../utils';
import { accessibilityHintProperty, accessibilityLabelProperty, accessibilityLanguageProperty, accessibilityValueProperty } from '../../accessibility/accessibility-properties';
export * from './action-bar-common';
const majorVersion = iOSNativeHelper.MajorVersion;
const UNSPECIFIED = layout.makeMeasureSpec(0, layout.UNSPECIFIED);
function loadActionIcon(item) {
    let is = null;
    let img = null;
    const itemIcon = item.icon;
    const itemStyle = item.style;
    if (isFontIconURI(itemIcon)) {
        const fontIconCode = itemIcon.split('//')[1];
        const font = itemStyle.fontInternal;
        const color = itemStyle.color;
        is = ImageSource.fromFontIconCodeSync(fontIconCode, font, color);
    }
    else {
        is = ImageSource.fromFileOrResourceSync(itemIcon);
    }
    if (is && is.ios) {
        img = is.ios;
    }
    else {
        traceMissingIcon(itemIcon);
    }
    return img;
}
var TapBarItemHandlerImpl = /** @class */ (function (_super) {
    __extends(TapBarItemHandlerImpl, _super);
    function TapBarItemHandlerImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TapBarItemHandlerImpl.initWithOwner = function (owner) {
        var handler = TapBarItemHandlerImpl.new();
        handler._owner = owner;
        return handler;
    };
    TapBarItemHandlerImpl.prototype.tap = function (args) {
        var owner = this._owner.get();
        if (owner) {
            owner._raiseTap();
        }
    };
    TapBarItemHandlerImpl.ObjCExposedMethods = {
        tap: { returns: interop.types.void, params: [interop.types.id] },
    };
    return TapBarItemHandlerImpl;
}(NSObject));
export class ActionItem extends ActionItemBase {
    constructor() {
        super(...arguments);
        this._ios = {
            position: 'left',
            systemIcon: undefined,
        };
    }
    // @ts-ignore
    get ios() {
        return this._ios;
    }
    set ios(value) {
        throw new Error('ActionItem.ios is read-only');
    }
}
export class NavigationButton extends ActionItem {
    _onVisibilityChanged(visibility) {
        if (this._navigationItem) {
            const visible = visibility === 'visible';
            this._navigationItem.setHidesBackButtonAnimated(!visible, true);
        }
    }
}
export class ActionBar extends ActionBarBase {
    get ios() {
        const page = this.page;
        if (!page || !page.parent) {
            return;
        }
        const viewController = page.ios;
        if (viewController.navigationController !== null) {
            return viewController.navigationController.navigationBar;
        }
        return null;
    }
    [accessibilityValueProperty.setNative](value) {
        value = value == null ? null : `${value}`;
        this.nativeViewProtected.accessibilityValue = value;
        const navigationItem = this._getNavigationItem();
        if (navigationItem) {
            navigationItem.accessibilityValue = value;
        }
    }
    [accessibilityLabelProperty.setNative](value) {
        value = value == null ? null : `${value}`;
        this.nativeViewProtected.accessibilityLabel = value;
        const navigationItem = this._getNavigationItem();
        if (navigationItem) {
            navigationItem.accessibilityLabel = value;
        }
    }
    [accessibilityHintProperty.setNative](value) {
        value = value == null ? null : `${value}`;
        this.nativeViewProtected.accessibilityHint = value;
        const navigationItem = this._getNavigationItem();
        if (navigationItem) {
            navigationItem.accessibilityHint = value;
        }
    }
    [accessibilityLanguageProperty.setNative](value) {
        value = value == null ? null : `${value}`;
        this.nativeViewProtected.accessibilityLanguage = value;
        const navigationItem = this._getNavigationItem();
        if (navigationItem) {
            navigationItem.accessibilityLanguage = value;
        }
    }
    createNativeView() {
        return this.ios;
    }
    _addChildFromBuilder(name, value) {
        if (value instanceof NavigationButton) {
            this.navigationButton = value;
        }
        else if (value instanceof ActionItem) {
            this.actionItems.addItem(value);
        }
        else if (value instanceof View) {
            this.titleView = value;
        }
    }
    get _getActualSize() {
        const navBar = this.ios;
        if (!navBar) {
            return { width: 0, height: 0 };
        }
        const frame = navBar.frame;
        const size = frame.size;
        const width = layout.toDevicePixels(size.width);
        const height = layout.toDevicePixels(size.height);
        return { width, height };
    }
    layoutInternal() {
        const { width, height } = this._getActualSize;
        const widthSpec = layout.makeMeasureSpec(width, layout.EXACTLY);
        const heightSpec = layout.makeMeasureSpec(height, layout.EXACTLY);
        this.measure(widthSpec, heightSpec);
        this.layout(0, 0, width, height, false);
    }
    _getIconRenderingMode() {
        switch (this.iosIconRenderingMode) {
            case 'alwaysOriginal':
                return 1 /* AlwaysOriginal */;
            case 'alwaysTemplate':
                return 2 /* AlwaysTemplate */;
            case 'automatic':
            default:
                return 1 /* AlwaysOriginal */;
        }
    }
    _getNavigationItem() {
        const page = this.page;
        // Page should be attached to frame to update the action bar.
        if (!page || !page.frame) {
            return null;
        }
        const viewController = page.ios;
        return viewController.navigationItem;
    }
    update() {
        const page = this.page;
        // Page should be attached to frame to update the action bar.
        if (!page || !page.frame) {
            return;
        }
        const viewController = page.ios;
        const navigationItem = viewController.navigationItem;
        const navController = viewController.navigationController;
        if (!navController) {
            return;
        }
        const navigationBar = navController.navigationBar;
        let previousController;
        // Set Title
        navigationItem.title = this.title;
        const titleView = this.titleView;
        if (titleView && titleView.ios) {
            navigationItem.titleView = titleView.ios;
        }
        else {
            navigationItem.titleView = null;
        }
        // Find previous ViewController in the navigation stack
        const indexOfViewController = navController.viewControllers.indexOfObject(viewController);
        if (indexOfViewController > 0 && indexOfViewController < navController.viewControllers.count) {
            previousController = navController.viewControllers[indexOfViewController - 1];
        }
        // Set back button text
        if (previousController) {
            if (this.navigationButton) {
                const tapHandler = TapBarItemHandlerImpl.initWithOwner(new WeakRef(this.navigationButton));
                const barButtonItem = UIBarButtonItem.alloc().initWithTitleStyleTargetAction(this.navigationButton.text + '', 0 /* Plain */, tapHandler, 'tap');
                previousController.navigationItem.backBarButtonItem = barButtonItem;
            }
            else {
                previousController.navigationItem.backBarButtonItem = null;
            }
        }
        // Set back button image
        let img;
        if (this.navigationButton && isVisible(this.navigationButton) && this.navigationButton.icon) {
            img = loadActionIcon(this.navigationButton);
        }
        // TODO: This could cause issue when canceling BackEdge gesture - we will change the backIndicator to
        // show the one from the old page but the new page will still be visible (because we canceled EdgeBackSwipe gesutre)
        // Consider moving this to new method and call it from - navigationControllerDidShowViewControllerAnimated.
        if (img) {
            const image = img.imageWithRenderingMode(1 /* AlwaysOriginal */);
            navigationBar.backIndicatorImage = image;
            navigationBar.backIndicatorTransitionMaskImage = image;
        }
        else {
            navigationBar.backIndicatorImage = null;
            navigationBar.backIndicatorTransitionMaskImage = null;
        }
        // Set back button visibility
        if (this.navigationButton) {
            this.navigationButton._navigationItem = navigationItem;
            navigationItem.setHidesBackButtonAnimated(!isVisible(this.navigationButton), false);
        }
        // Populate action items
        this.populateMenuItems(navigationItem);
        // update colors explicitly - they may have to be cleared form a previous page
        this.updateColors(navigationBar);
        // the 'flat' property may have changed in between pages
        this.updateFlatness(navigationBar);
        if (!this.isLayoutValid) {
            this.layoutInternal();
        }
        // Make sure accessibility values are up-to-date on the navigationItem
        navigationItem.accessibilityValue = this.accessibilityValue;
        navigationItem.accessibilityLabel = this.accessibilityLabel;
        navigationItem.accessibilityLanguage = this.accessibilityLanguage;
        navigationItem.accessibilityHint = this.accessibilityHint;
    }
    populateMenuItems(navigationItem) {
        const items = this.actionItems.getVisibleItems();
        const leftBarItems = NSMutableArray.new();
        const rightBarItems = NSMutableArray.new();
        for (let i = 0; i < items.length; i++) {
            const barButtonItem = this.createBarButtonItem(items[i]);
            if (items[i].ios.position === 'left') {
                leftBarItems.addObject(barButtonItem);
            }
            else {
                rightBarItems.insertObjectAtIndex(barButtonItem, 0);
            }
        }
        navigationItem.setLeftBarButtonItemsAnimated(leftBarItems, false);
        navigationItem.setRightBarButtonItemsAnimated(rightBarItems, false);
        if (leftBarItems.count > 0) {
            navigationItem.leftItemsSupplementBackButton = true;
        }
    }
    createBarButtonItem(item) {
        const tapHandler = TapBarItemHandlerImpl.initWithOwner(new WeakRef(item));
        // associate handler with menuItem or it will get collected by JSC.
        item.handler = tapHandler;
        let barButtonItem;
        if (item.actionView && item.actionView.ios) {
            const recognizer = UITapGestureRecognizer.alloc().initWithTargetAction(tapHandler, 'tap');
            item.actionView.ios.addGestureRecognizer(recognizer);
            barButtonItem = UIBarButtonItem.alloc().initWithCustomView(item.actionView.ios);
        }
        else if (item.ios.systemIcon !== undefined) {
            let id = item.ios.systemIcon;
            if (typeof id === 'string') {
                id = parseInt(id);
            }
            barButtonItem = UIBarButtonItem.alloc().initWithBarButtonSystemItemTargetAction(id, tapHandler, 'tap');
        }
        else if (item.icon) {
            const img = loadActionIcon(item);
            if (img) {
                const image = img.imageWithRenderingMode(this._getIconRenderingMode());
                barButtonItem = UIBarButtonItem.alloc().initWithImageStyleTargetAction(image, 0 /* Plain */, tapHandler, 'tap');
            }
        }
        else {
            barButtonItem = UIBarButtonItem.alloc().initWithTitleStyleTargetAction(item.text + '', 0 /* Plain */, tapHandler, 'tap');
        }
        if (item.text) {
            barButtonItem.isAccessibilityElement = true;
            barButtonItem.accessibilityLabel = item.text;
            barButtonItem.accessibilityTraits = UIAccessibilityTraitButton;
        }
        return barButtonItem;
    }
    updateColors(navBar) {
        const color = this.color;
        this.setColor(navBar, color);
        const bgColor = this.backgroundColor;
        this.setBackgroundColor(navBar, bgColor);
    }
    setColor(navBar, color) {
        if (!navBar) {
            return;
        }
        if (color) {
            const titleTextColor = NSDictionary.dictionaryWithObjectForKey(color.ios, NSForegroundColorAttributeName);
            if (majorVersion >= 15) {
                const appearance = this._getAppearance(navBar);
                appearance.titleTextAttributes = titleTextColor;
            }
            navBar.titleTextAttributes = titleTextColor;
            navBar.largeTitleTextAttributes = titleTextColor;
            navBar.tintColor = color.ios;
        }
        else {
            navBar.titleTextAttributes = null;
            navBar.largeTitleTextAttributes = null;
            navBar.tintColor = null;
        }
    }
    setBackgroundColor(navBar, color) {
        if (!navBar) {
            return;
        }
        const color_ = color instanceof Color ? color.ios : color;
        if (majorVersion >= 15) {
            const appearance = this._getAppearance(navBar);
            // appearance.configureWithOpaqueBackground();
            appearance.backgroundColor = color_;
            this._updateAppearance(navBar, appearance);
        }
        else {
            // legacy styling
            navBar.barTintColor = color_;
        }
    }
    _onTitlePropertyChanged() {
        const page = this.page;
        if (!page) {
            return;
        }
        if (page.frame) {
            page.frame._updateActionBar();
        }
        const navigationItem = page.ios.navigationItem;
        navigationItem.title = this.title;
    }
    updateFlatness(navBar) {
        if (this.flat) {
            if (majorVersion >= 15) {
                const appearance = this._getAppearance(navBar);
                appearance.shadowColor = UIColor.clearColor;
                this._updateAppearance(navBar, appearance);
            }
            else {
                navBar.setBackgroundImageForBarMetrics(UIImage.new(), 0 /* Default */);
                navBar.shadowImage = UIImage.new();
                navBar.translucent = false;
            }
        }
        else {
            if (majorVersion >= 15) {
                if (navBar.standardAppearance) {
                    // Not flat and never been set do nothing.
                    const appearance = navBar.standardAppearance;
                    appearance.shadowColor = UINavigationBarAppearance.new().shadowColor;
                    this._updateAppearance(navBar, appearance);
                }
            }
            else {
                navBar.setBackgroundImageForBarMetrics(null, null);
                navBar.shadowImage = null;
                navBar.translucent = true;
            }
        }
    }
    _getAppearance(navBar) {
        var _a;
        return (_a = navBar.standardAppearance) !== null && _a !== void 0 ? _a : UINavigationBarAppearance.new();
    }
    _updateAppearance(navBar, appearance) {
        navBar.standardAppearance = appearance;
        navBar.compactAppearance = appearance;
        navBar.scrollEdgeAppearance = appearance;
    }
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        const width = layout.getMeasureSpecSize(widthMeasureSpec);
        const height = layout.getMeasureSpecSize(heightMeasureSpec);
        if (this.titleView) {
            View.measureChild(this, this.titleView, UNSPECIFIED, UNSPECIFIED);
        }
        this.actionItems.getItems().forEach((actionItem) => {
            const actionView = actionItem.actionView;
            if (actionView) {
                View.measureChild(this, actionView, UNSPECIFIED, UNSPECIFIED);
            }
        });
        // We ignore our width/height, minWidth/minHeight dimensions because it is against Apple policy to change height of NavigationBar.
        this.setMeasuredDimension(width, height);
    }
    onLayout(left, top, right, bottom) {
        const titleView = this.titleView;
        if (titleView) {
            if (majorVersion > 10) {
                // On iOS 11 titleView is wrapped in another view that is centered with constraints.
                View.layoutChild(this, titleView, 0, 0, titleView.getMeasuredWidth(), titleView.getMeasuredHeight());
            }
            else {
                // On iOS <11 titleView is direct child of UINavigationBar so we give it full width and leave
                // the layout to center it.
                View.layoutChild(this, titleView, 0, 0, right - left, bottom - top);
            }
        }
        this.actionItems.getItems().forEach((actionItem) => {
            const actionView = actionItem.actionView;
            if (actionView && actionView.ios) {
                const measuredWidth = actionView.getMeasuredWidth();
                const measuredHeight = actionView.getMeasuredHeight();
                View.layoutChild(this, actionView, 0, 0, measuredWidth, measuredHeight);
            }
        });
        super.onLayout(left, top, right, bottom);
    }
    layoutNativeView(left, top, right, bottom) {
        return;
    }
    get navBar() {
        var _a, _b, _c;
        // Page should be attached to frame to update the action bar.
        if ((_c = (_b = (_a = this.page) === null || _a === void 0 ? void 0 : _a.frame) === null || _b === void 0 ? void 0 : _b.ios) === null || _c === void 0 ? void 0 : _c.controller) {
            return this.page.frame.ios.controller.navigationBar;
        }
        else {
            return undefined;
        }
    }
    [colorProperty.getDefault]() {
        return null;
    }
    [colorProperty.setNative](color) {
        const navBar = this.navBar;
        this.setColor(navBar, color);
    }
    [backgroundColorProperty.getDefault]() {
        // This getter is never called.
        // CssAnimationProperty use default value form their constructor.
        return null;
    }
    [backgroundColorProperty.setNative](color) {
        const navBar = this.navBar;
        this.setBackgroundColor(navBar, color);
    }
    [backgroundInternalProperty.getDefault]() {
        return null;
    }
    [backgroundInternalProperty.setNative](value) {
        // tslint:disable-line
    }
    [flatProperty.setNative](value) {
        // tslint:disable-line
        const navBar = this.navBar;
        if (navBar) {
            this.updateFlatness(navBar);
        }
    }
    [iosIconRenderingModeProperty.getDefault]() {
        return 'alwaysOriginal';
    }
    [iosIconRenderingModeProperty.setNative](value) {
        this.update();
    }
}
//# sourceMappingURL=index.ios.js.map