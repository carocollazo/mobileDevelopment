import type { BackstackEntry, NavigationContext, NavigationEntry, NavigationTransition } from './frame-interfaces';
import { NavigationType } from './frame-interfaces';
import { Page } from '../page';
import { View, CustomLayoutView } from '../core/view';
import { Property } from '../core/properties';
export { NavigationType } from './frame-interfaces';
export type { AndroidActivityCallbacks, AndroidFragmentCallbacks, AndroidFrame, BackstackEntry, NavigationContext, NavigationEntry, NavigationTransition, TransitionState, ViewEntry, iOSFrame } from './frame-interfaces';
export declare class FrameBase extends CustomLayoutView {
    static androidOptionSelectedEvent: string;
    private _animated;
    private _transition;
    private _backStack;
    private _navigationQueue;
    actionBarVisibility: 'auto' | 'never' | 'always';
    _currentEntry: BackstackEntry;
    _animationInProgress: boolean;
    _executingContext: NavigationContext;
    _isInFrameStack: boolean;
    static defaultAnimatedNavigation: boolean;
    static defaultTransition: NavigationTransition;
    static getFrameById(id: string): FrameBase;
    static topmost(): FrameBase;
    static goBack(): boolean;
    /**
     * @private
     */
    static reloadPage(): void;
    /**
     * @private
     */
    static _stack(): Array<FrameBase>;
    _addChildFromBuilder(name: string, value: any): void;
    onLoaded(): void;
    canGoBack(): boolean;
    /**
     * Navigates to the previous entry (if any) in the back stack.
     * @param to The backstack entry to navigate back to.
     */
    goBack(backstackEntry?: BackstackEntry): void;
    _removeEntry(removed: BackstackEntry): void;
    navigate(param: any): void;
    isCurrent(entry: BackstackEntry): boolean;
    setCurrent(entry: BackstackEntry, navigationType: NavigationType): void;
    _updateBackstack(entry: BackstackEntry, navigationType: NavigationType): void;
    private isNestedWithin;
    private raiseCurrentPageNavigatedEvents;
    _processNavigationQueue(page: Page): void;
    _findEntryForTag(fragmentTag: string): BackstackEntry;
    navigationQueueIsEmpty(): boolean;
    static _isEntryBackstackVisible(entry: BackstackEntry): boolean;
    _updateActionBar(page?: Page, disableNavBarAnimation?: boolean): void;
    protected _processNextNavigationEntry(): void;
    performNavigation(navigationContext: NavigationContext): void;
    private performGoBack;
    _goBackCore(backstackEntry: BackstackEntry): void;
    _navigateCore(backstackEntry: BackstackEntry): void;
    _onNavigatingTo(backstackEntry: BackstackEntry, isBack: boolean): void;
    get animated(): boolean;
    set animated(value: boolean);
    get transition(): NavigationTransition;
    set transition(value: NavigationTransition);
    get backStack(): Array<BackstackEntry>;
    get currentPage(): Page;
    get currentEntry(): NavigationEntry;
    _pushInFrameStackRecursive(): void;
    _pushInFrameStack(): void;
    _popFromFrameStack(): void;
    _removeFromFrameStack(): void;
    _dialogClosed(): void;
    _onRootViewReset(): void;
    get _childrenCount(): number;
    eachChildView(callback: (child: View) => boolean): void;
    _getIsAnimatedNavigation(entry: NavigationEntry): boolean;
    _getNavigationTransition(entry: NavigationEntry): NavigationTransition;
    get navigationBarHeight(): number;
    _getNavBarVisible(page: Page): boolean;
    _addViewToNativeVisualTree(child: View): boolean;
    _removeViewFromNativeVisualTree(child: View): void;
    _printFrameBackStack(): void;
    _backstackEntryTrace(b: BackstackEntry): string;
    _onLivesync(context?: ModuleContext): boolean;
    _handleLivesync(context?: ModuleContext): boolean;
    private legacyLivesync;
    replacePage(entry: string | NavigationEntry): void;
}
export declare function getFrameById(id: string): FrameBase;
export declare function topmost(): FrameBase;
export declare function goBack(): boolean;
export declare function _stack(): Array<FrameBase>;
export declare const defaultPage: Property<FrameBase, string>;
export declare const actionBarVisibilityProperty: Property<FrameBase, "auto" | "never" | "always">;
