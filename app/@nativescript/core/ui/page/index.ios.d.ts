import { Frame } from '../frame';
import { View } from '../core/view';
import { PageBase } from './page-common';
export * from './page-common';
declare class UIViewControllerImpl extends UIViewController {
    private _owner;
    isBackstackSkipped: boolean;
    isBackstackCleared: boolean;
    static initWithOwner(owner: WeakRef<Page>): UIViewControllerImpl;
    viewDidLoad(): void;
    viewWillAppear(animated: boolean): void;
    viewDidAppear(animated: boolean): void;
    viewWillDisappear(animated: boolean): void;
    viewDidDisappear(animated: boolean): void;
    viewWillLayoutSubviews(): void;
    viewDidLayoutSubviews(): void;
    traitCollectionDidChange(previousTraitCollection: UITraitCollection): void;
    get preferredStatusBarStyle(): UIStatusBarStyle;
}
export declare class Page extends PageBase {
    nativeViewProtected: UIView;
    viewController: UIViewControllerImpl;
    onAccessibilityPerformEscape: () => boolean;
    private _backgroundColor;
    private _ios;
    _presentedViewController: UIViewController;
    constructor();
    createNativeView(): UIView;
    get ios(): UIViewController;
    get frame(): Frame;
    layoutNativeView(left: number, top: number, right: number, bottom: number): void;
    _setNativeViewFrame(nativeView: UIView, frame: CGRect): void;
    _shouldDelayLayout(): boolean;
    onLoaded(): void;
    updateWithWillAppear(animated: boolean): void;
    updateWithWillDisappear(animated: boolean): void;
    updateStatusBar(): void;
    _updateStatusBarStyle(value?: string): void;
    _updateEnableSwipeBackNavigation(enabled: boolean): void;
    onMeasure(widthMeasureSpec: number, heightMeasureSpec: number): void;
    onLayout(left: number, top: number, right: number, bottom: number): void;
    _addViewToNativeVisualTree(child: View, atIndex: number): boolean;
    _removeViewFromNativeVisualTree(child: View): void;
    accessibilityScreenChanged(refocus?: boolean): void;
}
