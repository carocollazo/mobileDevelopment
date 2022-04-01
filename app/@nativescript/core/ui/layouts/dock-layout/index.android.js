import { DockLayoutBase, dockProperty, stretchLastChildProperty } from './dock-layout-common';
import { View } from '../../core/view';
export * from './dock-layout-common';
View.prototype[dockProperty.setNative] = function (value) {
    const nativeView = this.nativeViewProtected;
    const lp = nativeView.getLayoutParams() || new org.nativescript.widgets.CommonLayoutParams();
    if (lp instanceof org.nativescript.widgets.CommonLayoutParams) {
        switch (value) {
            case 'left':
                lp.dock = org.nativescript.widgets.Dock.left;
                break;
            case 'top':
                lp.dock = org.nativescript.widgets.Dock.top;
                break;
            case 'right':
                lp.dock = org.nativescript.widgets.Dock.right;
                break;
            case 'bottom':
                lp.dock = org.nativescript.widgets.Dock.bottom;
                break;
            default:
                throw new Error(`Invalid value for dock property: ${value}`);
        }
        nativeView.setLayoutParams(lp);
    }
};
export class DockLayout extends DockLayoutBase {
    createNativeView() {
        return new org.nativescript.widgets.DockLayout(this._context);
    }
    [stretchLastChildProperty.getDefault]() {
        return true;
    }
    [stretchLastChildProperty.setNative](value) {
        this.nativeViewProtected.setStretchLastChild(value);
    }
}
//# sourceMappingURL=index.android.js.map