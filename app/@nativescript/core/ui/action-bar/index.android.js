import { ActionItemBase, ActionBarBase, isVisible, flatProperty, traceMissingIcon, androidContentInsetLeftProperty, androidContentInsetRightProperty } from './action-bar-common';
import { View } from '../core/view';
import { Color } from '../../color';
import { layout, RESOURCE_PREFIX, isFontIconURI } from '../../utils';
import { colorProperty } from '../styling/style-properties';
import { ImageSource } from '../../image-source';
import * as application from '../../application';
import { isAccessibilityServiceEnabled, updateContentDescription } from '../../accessibility';
import { Device } from '../../platform';
import lazy from '../../utils/lazy';
export * from './action-bar-common';
const R_ID_HOME = 0x0102002c;
const ACTION_ITEM_ID_OFFSET = 10000;
const DEFAULT_ELEVATION = 4;
const sdkVersion = lazy(() => parseInt(Device.sdkVersion));
let AppCompatTextView;
let actionItemIdGenerator = ACTION_ITEM_ID_OFFSET;
function generateItemId() {
    actionItemIdGenerator++;
    return actionItemIdGenerator;
}
function loadActionIconDrawableOrResourceId(item) {
    const itemIcon = item.icon;
    const itemStyle = item.style;
    let drawableOrId = null;
    if (isFontIconURI(itemIcon)) {
        const fontIconCode = itemIcon.split('//')[1];
        const font = itemStyle.fontInternal;
        const color = itemStyle.color;
        const is = ImageSource.fromFontIconCodeSync(fontIconCode, font, color);
        if (is && is.android) {
            drawableOrId = new android.graphics.drawable.BitmapDrawable(appResources, is.android);
        }
    }
    else {
        drawableOrId = getDrawableOrResourceId(itemIcon, appResources);
    }
    if (!drawableOrId) {
        traceMissingIcon(itemIcon);
    }
    return drawableOrId;
}
let appResources;
let MenuItemClickListener;
function initializeMenuItemClickListener() {
    if (MenuItemClickListener) {
        return;
    }
    apiLevel = sdkVersion();
    AppCompatTextView = androidx.appcompat.widget.AppCompatTextView;
    var MenuItemClickListenerImpl = /** @class */ (function (_super) {
    __extends(MenuItemClickListenerImpl, _super);
    function MenuItemClickListenerImpl(owner) {
        var _this = _super.call(this) || this;
        _this.owner = owner;
        return global.__native(_this);
    }
    MenuItemClickListenerImpl.prototype.onMenuItemClick = function (item) {
        var itemId = item.getItemId();
        return this.owner._onAndroidItemSelected(itemId);
    };
    MenuItemClickListenerImpl = __decorate([
        Interfaces([androidx.appcompat.widget.Toolbar.OnMenuItemClickListener])
    ], MenuItemClickListenerImpl);
    return MenuItemClickListenerImpl;
}(java.lang.Object));
    MenuItemClickListener = MenuItemClickListenerImpl;
    appResources = application.android.context.getResources();
}
let apiLevel;
export class ActionItem extends ActionItemBase {
    constructor() {
        super();
        this._androidPosition = {
            position: 'actionBar',
            systemIcon: undefined,
        };
        this._itemId = generateItemId();
    }
    // @ts-ignore
    get android() {
        return this._androidPosition;
    }
    set android(value) {
        throw new Error('ActionItem.android is read-only');
    }
    _getItemId() {
        return this._itemId;
    }
}
export class AndroidActionBarSettings {
    constructor(actionBar) {
        this._iconVisibility = 'auto';
        this._actionBar = actionBar;
    }
    get icon() {
        return this._icon;
    }
    set icon(value) {
        if (value !== this._icon) {
            this._icon = value;
            this._actionBar._onIconPropertyChanged();
        }
    }
    get iconVisibility() {
        return this._iconVisibility;
    }
    set iconVisibility(value) {
        if (value !== this._iconVisibility) {
            this._iconVisibility = value;
            this._actionBar._onIconPropertyChanged();
        }
    }
}
export class NavigationButton extends ActionItem {
}
export class ActionBar extends ActionBarBase {
    constructor() {
        super();
        this._android = new AndroidActionBarSettings(this);
    }
    get android() {
        return this._android;
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
    createNativeView() {
        return new androidx.appcompat.widget.Toolbar(this._context);
    }
    initNativeView() {
        super.initNativeView();
        const nativeView = this.nativeViewProtected;
        initializeMenuItemClickListener();
        const menuItemClickListener = new MenuItemClickListener(this);
        nativeView.setOnMenuItemClickListener(menuItemClickListener);
        nativeView.menuItemClickListener = menuItemClickListener;
    }
    disposeNativeView() {
        this.nativeViewProtected.menuItemClickListener.owner = null;
        super.disposeNativeView();
    }
    onLoaded() {
        super.onLoaded();
        this.update();
    }
    update() {
        if (!this.nativeViewProtected) {
            return;
        }
        const page = this.page;
        if (!page.frame || !page.frame._getNavBarVisible(page)) {
            this.nativeViewProtected.setVisibility(android.view.View.GONE);
            // If action bar is hidden - no need to fill it with items.
            return;
        }
        this.nativeViewProtected.setVisibility(android.view.View.VISIBLE);
        // Add menu items
        this._addActionItems();
        // Set title
        this._updateTitleAndTitleView();
        // Set home icon
        this._updateIcon();
        // Set navigation button
        this._updateNavigationButton();
    }
    _applyBackground(background, isBorderDrawable, onlyColor, backgroundDrawable) {
        const nativeView = this.nativeViewProtected;
        if (backgroundDrawable && onlyColor && sdkVersion() >= 21) {
            if (isBorderDrawable && nativeView._cachedDrawable) {
                backgroundDrawable = nativeView._cachedDrawable;
                // we need to duplicate the drawable or we lose the "default" cached drawable
                const constantState = backgroundDrawable.getConstantState();
                if (constantState) {
                    try {
                        backgroundDrawable = constantState.newDrawable(nativeView.getResources());
                        // eslint-disable-next-line no-empty
                    }
                    catch (_a) { }
                }
                nativeView.setBackground(backgroundDrawable);
            }
            const backgroundColor = (backgroundDrawable.backgroundColor = background.color.android);
            backgroundDrawable.mutate();
            backgroundDrawable.setColorFilter(backgroundColor, android.graphics.PorterDuff.Mode.SRC_IN);
            backgroundDrawable.invalidateSelf(); // Make sure the drawable is invalidated. Android forgets to invalidate it in some cases: toolbar
            backgroundDrawable.backgroundColor = backgroundColor;
        }
        else {
            super._applyBackground(background, isBorderDrawable, onlyColor, backgroundDrawable);
        }
    }
    _onAndroidItemSelected(itemId) {
        // Handle home button
        if (this.navigationButton && itemId === R_ID_HOME) {
            this.navigationButton._raiseTap();
            return true;
        }
        // Find item with the right ID;
        let menuItem = undefined;
        const items = this.actionItems.getItems();
        for (let i = 0; i < items.length; i++) {
            if (items[i]._getItemId() === itemId) {
                menuItem = items[i];
                break;
            }
        }
        if (menuItem) {
            menuItem._raiseTap();
            return true;
        }
        return false;
    }
    _updateNavigationButton() {
        const navButton = this.navigationButton;
        if (navButton && isVisible(navButton)) {
            const systemIcon = navButton.android.systemIcon;
            if (systemIcon !== undefined) {
                // Try to look in the system resources.
                const systemResourceId = getSystemResourceId(systemIcon);
                if (systemResourceId) {
                    this.nativeViewProtected.setNavigationIcon(systemResourceId);
                }
            }
            else if (navButton.icon) {
                const drawableOrId = loadActionIconDrawableOrResourceId(navButton);
                if (drawableOrId) {
                    this.nativeViewProtected.setNavigationIcon(drawableOrId);
                }
            }
            // Set navigation content description, used by screen readers for the vision-impaired users
            this.nativeViewProtected.setNavigationContentDescription(navButton.text || null);
            const navBtn = new WeakRef(navButton);
            this.nativeViewProtected.setNavigationOnClickListener(new android.view.View.OnClickListener({
                onClick: function (v) {
                    const owner = navBtn.get();
                    if (owner) {
                        owner._raiseTap();
                    }
                },
            }));
        }
        else {
            this.nativeViewProtected.setNavigationIcon(null);
        }
    }
    _updateIcon() {
        const visibility = getIconVisibility(this.android.iconVisibility);
        if (visibility) {
            const icon = this.android.icon;
            if (icon !== undefined) {
                const drawableOrId = getDrawableOrResourceId(icon, appResources);
                if (drawableOrId) {
                    this.nativeViewProtected.setLogo(drawableOrId);
                }
                else {
                    traceMissingIcon(icon);
                }
            }
            else {
                const defaultIcon = application.android.nativeApp.getApplicationInfo().icon;
                this.nativeViewProtected.setLogo(defaultIcon);
            }
        }
        else {
            this.nativeViewProtected.setLogo(null);
        }
    }
    _updateTitleAndTitleView() {
        if (!this.titleView) {
            // No title view - show the title
            const title = this.title;
            if (title !== undefined) {
                this.nativeViewProtected.setTitle(title);
            }
            else {
                const appContext = application.android.context;
                const appInfo = appContext.getApplicationInfo();
                const appLabel = appContext.getPackageManager().getApplicationLabel(appInfo);
                if (appLabel) {
                    this.nativeViewProtected.setTitle(appLabel);
                }
            }
        }
        // Update content description for the screen reader.
        updateContentDescription(this, true);
    }
    _addActionItems() {
        const menu = this.nativeViewProtected.getMenu();
        const items = this.actionItems.getVisibleItems();
        menu.clear();
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const menuItem = menu.add(android.view.Menu.NONE, item._getItemId(), android.view.Menu.NONE, item.text + '');
            if (item.actionView && item.actionView.android) {
                // With custom action view, the menuitem cannot be displayed in a popup menu.
                item.android.position = 'actionBar';
                menuItem.setActionView(item.actionView.android);
                ActionBar._setOnClickListener(item);
            }
            else if (item.android.systemIcon) {
                // Try to look in the system resources.
                const systemResourceId = getSystemResourceId(item.android.systemIcon);
                if (systemResourceId) {
                    menuItem.setIcon(systemResourceId);
                }
            }
            else if (item.icon) {
                const drawableOrId = loadActionIconDrawableOrResourceId(item);
                if (drawableOrId) {
                    menuItem.setIcon(drawableOrId);
                }
            }
            const showAsAction = getShowAsAction(item);
            menuItem.setShowAsAction(showAsAction);
        }
    }
    static _setOnClickListener(item) {
        const weakRef = new WeakRef(item);
        item.actionView.android.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function (v) {
                const owner = weakRef.get();
                if (owner) {
                    owner._raiseTap();
                }
            },
        }));
    }
    _onTitlePropertyChanged() {
        if (this.nativeViewProtected) {
            this._updateTitleAndTitleView();
        }
    }
    _onIconPropertyChanged() {
        if (this.nativeViewProtected) {
            this._updateIcon();
        }
    }
    _addViewToNativeVisualTree(child, atIndex = Number.MAX_VALUE) {
        super._addViewToNativeVisualTree(child);
        if (this.nativeViewProtected && child.nativeViewProtected) {
            if (atIndex >= this.nativeViewProtected.getChildCount()) {
                this.nativeViewProtected.addView(child.nativeViewProtected);
            }
            else {
                this.nativeViewProtected.addView(child.nativeViewProtected, atIndex);
            }
            return true;
        }
        return false;
    }
    _removeViewFromNativeVisualTree(child) {
        super._removeViewFromNativeVisualTree(child);
        if (this.nativeViewProtected && child.nativeViewProtected) {
            this.nativeViewProtected.removeView(child.nativeViewProtected);
        }
    }
    [colorProperty.getDefault]() {
        const nativeView = this.nativeViewProtected;
        if (!defaultTitleTextColor) {
            let tv = getAppCompatTextView(nativeView);
            if (!tv) {
                const title = nativeView.getTitle();
                // setTitle will create AppCompatTextView internally;
                nativeView.setTitle('');
                tv = getAppCompatTextView(nativeView);
                if (title) {
                    // restore title.
                    nativeView.setTitle(title);
                }
            }
            // Fallback to hardcoded falue if we don't find TextView instance...
            // using new TextView().getTextColors().getDefaultColor() returns different value: -1979711488
            defaultTitleTextColor = tv ? tv.getTextColors().getDefaultColor() : -570425344;
        }
        return defaultTitleTextColor;
    }
    [colorProperty.setNative](value) {
        const color = value instanceof Color ? value.android : value;
        this.nativeViewProtected.setTitleTextColor(color);
    }
    [flatProperty.setNative](value) {
        const compat = androidx.core.view.ViewCompat;
        if (compat.setElevation) {
            if (value) {
                compat.setElevation(this.nativeViewProtected, 0);
            }
            else {
                const val = DEFAULT_ELEVATION * layout.getDisplayDensity();
                compat.setElevation(this.nativeViewProtected, val);
            }
        }
    }
    [androidContentInsetLeftProperty.setNative]() {
        if (apiLevel >= 21) {
            this.nativeViewProtected.setContentInsetsAbsolute(this.effectiveContentInsetLeft, this.effectiveContentInsetRight);
        }
    }
    [androidContentInsetRightProperty.setNative]() {
        if (apiLevel >= 21) {
            this.nativeViewProtected.setContentInsetsAbsolute(this.effectiveContentInsetLeft, this.effectiveContentInsetRight);
        }
    }
    accessibilityScreenChanged() {
        if (!isAccessibilityServiceEnabled()) {
            return;
        }
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }
        const originalFocusableState = android.os.Build.VERSION.SDK_INT >= 26 && nativeView.getFocusable();
        const originalImportantForAccessibility = nativeView.getImportantForAccessibility();
        const originalIsAccessibilityHeading = android.os.Build.VERSION.SDK_INT >= 28 && nativeView.isAccessibilityHeading();
        try {
            nativeView.setFocusable(false);
            nativeView.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO);
            let announceView = null;
            const numChildren = nativeView.getChildCount();
            for (let i = 0; i < numChildren; i += 1) {
                const childView = nativeView.getChildAt(i);
                if (!childView) {
                    continue;
                }
                childView.setFocusable(true);
                if (childView instanceof androidx.appcompat.widget.AppCompatTextView) {
                    announceView = childView;
                    if (android.os.Build.VERSION.SDK_INT >= 28) {
                        announceView.setAccessibilityHeading(true);
                    }
                }
            }
            if (!announceView) {
                announceView = nativeView;
            }
            announceView.setFocusable(true);
            announceView.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_YES);
            announceView.sendAccessibilityEvent(android.view.accessibility.AccessibilityEvent.TYPE_VIEW_FOCUSED);
            announceView.sendAccessibilityEvent(android.view.accessibility.AccessibilityEvent.TYPE_VIEW_ACCESSIBILITY_FOCUSED);
        }
        catch (_a) {
            // ignore
        }
        finally {
            setTimeout(() => {
                // Reset status after the focus have been reset.
                const localNativeView = this.nativeViewProtected;
                if (!localNativeView) {
                    return;
                }
                if (android.os.Build.VERSION.SDK_INT >= 28) {
                    nativeView.setAccessibilityHeading(originalIsAccessibilityHeading);
                }
                if (android.os.Build.VERSION.SDK_INT >= 26) {
                    localNativeView.setFocusable(originalFocusableState);
                }
                localNativeView.setImportantForAccessibility(originalImportantForAccessibility);
            });
        }
    }
}
function getAppCompatTextView(toolbar) {
    for (let i = 0, count = toolbar.getChildCount(); i < count; i++) {
        const child = toolbar.getChildAt(i);
        if (child instanceof AppCompatTextView) {
            return child;
        }
    }
    return null;
}
ActionBar.prototype.recycleNativeView = 'auto';
let defaultTitleTextColor;
function getDrawableOrResourceId(icon, resources) {
    if (typeof icon !== 'string') {
        return null;
    }
    let result = null;
    if (icon.indexOf(RESOURCE_PREFIX) === 0) {
        const resourceId = resources.getIdentifier(icon.substr(RESOURCE_PREFIX.length), 'drawable', application.android.packageName);
        if (resourceId > 0) {
            result = resourceId;
        }
    }
    else {
        let drawable;
        const is = ImageSource.fromFileOrResourceSync(icon);
        if (is) {
            drawable = new android.graphics.drawable.BitmapDrawable(appResources, is.android);
        }
        result = drawable;
    }
    return result;
}
function getShowAsAction(menuItem) {
    switch (menuItem.android.position) {
        case 'actionBarIfRoom':
            return android.view.MenuItem.SHOW_AS_ACTION_IF_ROOM;
        case 'popup':
            return android.view.MenuItem.SHOW_AS_ACTION_NEVER;
        case 'actionBar':
        default:
            return android.view.MenuItem.SHOW_AS_ACTION_ALWAYS;
    }
}
function getIconVisibility(iconVisibility) {
    switch (iconVisibility) {
        case 'always':
            return true;
        case 'auto':
        case 'never':
        default:
            return false;
    }
}
function getSystemResourceId(systemIcon) {
    return android.content.res.Resources.getSystem().getIdentifier(systemIcon, 'drawable', 'android');
}
//# sourceMappingURL=index.android.js.map