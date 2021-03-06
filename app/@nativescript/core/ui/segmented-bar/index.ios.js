import { SegmentedBarItemBase, SegmentedBarBase, selectedIndexProperty, itemsProperty, selectedBackgroundColorProperty } from './segmented-bar-common';
import { colorProperty, fontInternalProperty } from '../styling/style-properties';
import { Color } from '../../color';
import { iOSNativeHelper } from '../../utils';
export * from './segmented-bar-common';
export class SegmentedBarItem extends SegmentedBarItemBase {
    _update() {
        const parent = this.parent;
        if (parent) {
            const tabIndex = parent.items.indexOf(this);
            let title = this.title;
            title = title === null || title === undefined ? '' : title;
            parent.ios.setTitleForSegmentAtIndex(title, tabIndex);
        }
    }
}
export class SegmentedBar extends SegmentedBarBase {
    createNativeView() {
        return UISegmentedControl.new();
    }
    initNativeView() {
        super.initNativeView();
        this._selectionHandler = SelectionHandlerImpl.initWithOwner(new WeakRef(this));
        this.nativeViewProtected.addTargetActionForControlEvents(this._selectionHandler, 'selected', 4096 /* ValueChanged */);
    }
    disposeNativeView() {
        this._selectionHandler = null;
        super.disposeNativeView();
    }
    // @ts-ignore
    get ios() {
        return this.nativeViewProtected;
    }
    [selectedIndexProperty.getDefault]() {
        return -1;
    }
    [selectedIndexProperty.setNative](value) {
        this.ios.selectedSegmentIndex = value;
    }
    [itemsProperty.getDefault]() {
        return null;
    }
    [itemsProperty.setNative](value) {
        const segmentedControl = this.ios;
        segmentedControl.removeAllSegments();
        const newItems = value;
        if (newItems && newItems.length) {
            newItems.forEach((item, index, arr) => {
                let title = item.title;
                title = title === null || title === undefined ? '' : title;
                segmentedControl.insertSegmentWithTitleAtIndexAnimated(title, index, false);
            });
        }
        selectedIndexProperty.coerce(this);
    }
    [selectedBackgroundColorProperty.getDefault]() {
        const currentOsVersion = iOSNativeHelper.MajorVersion;
        return currentOsVersion < 13 ? this.ios.tintColor : this.ios.selectedSegmentTintColor;
    }
    [selectedBackgroundColorProperty.setNative](value) {
        const currentOsVersion = iOSNativeHelper.MajorVersion;
        const color = value instanceof Color ? value.ios : value;
        if (currentOsVersion < 13) {
            this.ios.tintColor = color;
        }
        else {
            this.ios.selectedSegmentTintColor = color;
        }
    }
    [colorProperty.getDefault]() {
        return null;
    }
    [colorProperty.setNative](value) {
        const color = value instanceof Color ? value.ios : value;
        const bar = this.ios;
        const currentAttrs = bar.titleTextAttributesForState(0 /* Normal */);
        const attrs = currentAttrs ? currentAttrs.mutableCopy() : NSMutableDictionary.new();
        attrs.setValueForKey(color, NSForegroundColorAttributeName);
        bar.setTitleTextAttributesForState(attrs, 0 /* Normal */);
    }
    [fontInternalProperty.getDefault]() {
        return null;
    }
    [fontInternalProperty.setNative](value) {
        const font = value ? value.getUIFont(UIFont.systemFontOfSize(UIFont.labelFontSize)) : null;
        const bar = this.ios;
        const currentAttrs = bar.titleTextAttributesForState(0 /* Normal */);
        const attrs = currentAttrs ? currentAttrs.mutableCopy() : NSMutableDictionary.new();
        attrs.setValueForKey(font, NSFontAttributeName);
        bar.setTitleTextAttributesForState(attrs, 0 /* Normal */);
    }
}
var SelectionHandlerImpl = /** @class */ (function (_super) {
    __extends(SelectionHandlerImpl, _super);
    function SelectionHandlerImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SelectionHandlerImpl.initWithOwner = function (owner) {
        var handler = SelectionHandlerImpl.new();
        handler._owner = owner;
        return handler;
    };
    SelectionHandlerImpl.prototype.selected = function (sender) {
        var owner = this._owner.get();
        if (owner) {
            owner.selectedIndex = sender.selectedSegmentIndex;
        }
    };
    SelectionHandlerImpl.ObjCExposedMethods = {
        selected: { returns: interop.types.void, params: [UISegmentedControl] },
    };
    return SelectionHandlerImpl;
}(NSObject));
//# sourceMappingURL=index.ios.js.map