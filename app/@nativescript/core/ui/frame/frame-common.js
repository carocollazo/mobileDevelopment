var FrameBase_1;
import { NavigationType } from './frame-interfaces';
import { Page } from '../page';
import { CustomLayoutView, CSSType } from '../core/view';
import { Property } from '../core/properties';
import { Trace } from '../../trace';
import { frameStack, topmost as frameStackTopmost, _pushInFrameStack, _popFromFrameStack, _removeFromFrameStack } from './frame-stack';
import { viewMatchesModuleContext } from '../core/view/view-common';
import { getAncestor } from '../core/view-base';
import { Builder } from '../builder';
import { sanitizeModuleName } from '../builder/module-name-sanitizer';
import { profile } from '../../profiling';
import { FRAME_SYMBOL } from './frame-helpers';
export { NavigationType } from './frame-interfaces';
function buildEntryFromArgs(arg) {
    let entry;
    if (typeof arg === 'string') {
        entry = {
            moduleName: arg,
        };
    }
    else if (typeof arg === 'function') {
        entry = {
            create: arg,
        };
    }
    else {
        entry = arg;
    }
    return entry;
}
let FrameBase = FrameBase_1 = class FrameBase extends CustomLayoutView {
    constructor() {
        super(...arguments);
        this._backStack = new Array();
        this._navigationQueue = new Array();
        this._animationInProgress = false;
        this._isInFrameStack = false;
    }
    static getFrameById(id) {
        return frameStack.find((frame) => frame.id && frame.id === id);
    }
    static topmost() {
        return frameStackTopmost();
    }
    static goBack() {
        const top = FrameBase_1.topmost();
        if (top && top.canGoBack()) {
            top.goBack();
            return true;
        }
        else if (top) {
            let parentFrameCanGoBack = false;
            let parentFrame = getAncestor(top, 'Frame');
            while (parentFrame && !parentFrameCanGoBack) {
                if (parentFrame && parentFrame.canGoBack()) {
                    parentFrameCanGoBack = true;
                }
                else {
                    parentFrame = getAncestor(parentFrame, 'Frame');
                }
            }
            if (parentFrame && parentFrameCanGoBack) {
                parentFrame.goBack();
                return true;
            }
        }
        if (frameStack.length > 1) {
            top._popFromFrameStack();
        }
        return false;
    }
    /**
     * @private
     */
    static reloadPage() {
        // Implemented in plat-specific file - only for android.
    }
    /**
     * @private
     */
    static _stack() {
        return frameStack;
    }
    // TODO: Currently our navigation will not be synchronized in case users directly call native navigation methods like Activity.startActivity.
    _addChildFromBuilder(name, value) {
        throw new Error(`Frame should not have a view. Use 'defaultPage' property instead.`);
    }
    onLoaded() {
        super.onLoaded();
        this._processNextNavigationEntry();
    }
    canGoBack() {
        let backstack = this._backStack.length;
        let previousForwardNotInBackstack = false;
        this._navigationQueue.forEach((item) => {
            const entry = item.entry;
            const isBackNavigation = item.navigationType === NavigationType.back;
            if (isBackNavigation) {
                previousForwardNotInBackstack = false;
                if (!entry) {
                    backstack--;
                }
                else {
                    const backstackIndex = this._backStack.indexOf(entry);
                    if (backstackIndex !== -1) {
                        backstack = backstackIndex;
                    }
                    else {
                        // NOTE: We don't search for entries in navigationQueue because there is no way for
                        // developer to get reference to BackstackEntry unless transition is completed.
                        // At that point the entry is put in the backstack array.
                        // If we start to return Backstack entry from navigate method then
                        // here we should check also navigationQueue as well.
                        backstack--;
                    }
                }
            }
            else if (entry.entry.clearHistory) {
                previousForwardNotInBackstack = false;
                backstack = 0;
            }
            else {
                backstack++;
                if (previousForwardNotInBackstack) {
                    backstack--;
                }
                previousForwardNotInBackstack = entry.entry.backstackVisible === false;
            }
        });
        // this is our first navigation which is not completed yet.
        if (this._navigationQueue.length > 0 && !this._currentEntry) {
            backstack--;
        }
        return backstack > 0;
    }
    /**
     * Navigates to the previous entry (if any) in the back stack.
     * @param to The backstack entry to navigate back to.
     */
    goBack(backstackEntry) {
        if (Trace.isEnabled()) {
            Trace.write(`GO BACK`, Trace.categories.Navigation);
        }
        if (!this.canGoBack()) {
            return;
        }
        if (backstackEntry) {
            const index = this._backStack.indexOf(backstackEntry);
            if (index < 0) {
                return;
            }
        }
        const navigationContext = {
            entry: backstackEntry,
            isBackNavigation: true,
            navigationType: NavigationType.back,
        };
        this._navigationQueue.push(navigationContext);
        this._processNextNavigationEntry();
    }
    _removeEntry(removed) {
        const page = removed.resolvedPage;
        const frame = page.frame;
        page._frame = null;
        if (frame) {
            frame._removeView(page);
        }
        else {
            page._tearDownUI(true);
        }
        removed.resolvedPage = null;
    }
    navigate(param) {
        if (Trace.isEnabled()) {
            Trace.write(`NAVIGATE`, Trace.categories.Navigation);
        }
        this._pushInFrameStack();
        const entry = buildEntryFromArgs(param);
        const page = Builder.createViewFromEntry(entry);
        const backstackEntry = {
            entry: entry,
            resolvedPage: page,
            navDepth: undefined,
            fragmentTag: undefined,
        };
        const navigationContext = {
            entry: backstackEntry,
            isBackNavigation: false,
            navigationType: NavigationType.forward,
        };
        this._navigationQueue.push(navigationContext);
        this._processNextNavigationEntry();
    }
    isCurrent(entry) {
        return this._currentEntry === entry;
    }
    setCurrent(entry, navigationType) {
        const newPage = entry.resolvedPage;
        // In case we navigated forward to a page that was in the backstack
        // with clearHistory: true
        if (!newPage.frame) {
            this._addView(newPage);
            newPage._frame = this;
        }
        this._currentEntry = entry;
        const isBack = navigationType === NavigationType.back;
        if (isBack) {
            this._pushInFrameStack();
        }
        newPage.onNavigatedTo(isBack);
        this.notify({
            eventName: Page.navigatedToEvent,
            object: this,
            isBack,
            entry,
        });
        // Reset executing context after NavigatedTo is raised;
        // we do not want to execute two navigations in parallel in case
        // additional navigation is triggered from the NavigatedTo handler.
        this._executingContext = null;
    }
    _updateBackstack(entry, navigationType) {
        const isBack = navigationType === NavigationType.back;
        const isReplace = navigationType === NavigationType.replace;
        this.raiseCurrentPageNavigatedEvents(isBack);
        const current = this._currentEntry;
        // Do nothing for Hot Module Replacement
        if (isBack) {
            const index = this._backStack.indexOf(entry);
            this._backStack.splice(index + 1).forEach((e) => this._removeEntry(e));
            this._backStack.pop();
        }
        else if (!isReplace) {
            if (entry.entry.clearHistory) {
                this._backStack.forEach((e) => this._removeEntry(e));
                this._backStack.length = 0;
            }
            else if (FrameBase_1._isEntryBackstackVisible(current)) {
                this._backStack.push(current);
            }
        }
        if (current && this._backStack.indexOf(current) < 0) {
            this._removeEntry(current);
        }
    }
    isNestedWithin(parentFrameCandidate) {
        let frameAncestor = this;
        while (frameAncestor) {
            frameAncestor = getAncestor(frameAncestor, FrameBase_1);
            if (frameAncestor === parentFrameCandidate) {
                return true;
            }
        }
        return false;
    }
    raiseCurrentPageNavigatedEvents(isBack) {
        const page = this.currentPage;
        if (page) {
            if (page.isLoaded) {
                // Forward navigation does not remove page from frame so we raise unloaded manually.
                page.callUnloaded();
            }
            page.onNavigatedFrom(isBack);
        }
    }
    _processNavigationQueue(page) {
        if (this._navigationQueue.length === 0) {
            // This could happen when showing recreated page after activity has been destroyed.
            return;
        }
        const entry = this._navigationQueue[0].entry;
        const currentNavigationPage = entry.resolvedPage;
        if (page !== currentNavigationPage) {
            // If the page is not the one that requested navigation - skip it.
            return;
        }
        // remove completed operation.
        this._navigationQueue.shift();
        this._processNextNavigationEntry();
        this._updateActionBar();
    }
    _findEntryForTag(fragmentTag) {
        let entry;
        if (this._currentEntry && this._currentEntry.fragmentTag === fragmentTag) {
            entry = this._currentEntry;
        }
        else {
            entry = this._backStack.find((value) => value.fragmentTag === fragmentTag);
            // on API 26 fragments are recreated lazily after activity is destroyed.
            if (!entry) {
                const navigationItem = this._navigationQueue.find((value) => value.entry.fragmentTag === fragmentTag);
                entry = navigationItem ? navigationItem.entry : undefined;
            }
        }
        return entry;
    }
    navigationQueueIsEmpty() {
        return this._navigationQueue.length === 0;
    }
    static _isEntryBackstackVisible(entry) {
        if (!entry) {
            return false;
        }
        const backstackVisibleValue = entry.entry.backstackVisible;
        const backstackHidden = backstackVisibleValue !== undefined && !backstackVisibleValue;
        return !backstackHidden;
    }
    _updateActionBar(page, disableNavBarAnimation) {
        //Trace.write("calling _updateActionBar on Frame", Trace.categories.Navigation);
    }
    _processNextNavigationEntry() {
        if (!this.isLoaded || this._executingContext) {
            return;
        }
        if (this._navigationQueue.length > 0) {
            const navigationContext = this._navigationQueue[0];
            const isBackNavigation = navigationContext.navigationType === NavigationType.back;
            if (isBackNavigation) {
                this.performGoBack(navigationContext);
            }
            else {
                this.performNavigation(navigationContext);
            }
        }
    }
    performNavigation(navigationContext) {
        this._executingContext = navigationContext;
        const backstackEntry = navigationContext.entry;
        const isBackNavigation = navigationContext.navigationType === NavigationType.back;
        this._onNavigatingTo(backstackEntry, isBackNavigation);
        this._navigateCore(backstackEntry);
    }
    performGoBack(navigationContext) {
        let backstackEntry = navigationContext.entry;
        const backstack = this._backStack;
        if (!backstackEntry) {
            backstackEntry = backstack[backstack.length - 1];
            navigationContext.entry = backstackEntry;
        }
        this._executingContext = navigationContext;
        this._onNavigatingTo(backstackEntry, true);
        this._goBackCore(backstackEntry);
    }
    _goBackCore(backstackEntry) {
        if (Trace.isEnabled()) {
            Trace.write(`GO BACK CORE(${this._backstackEntryTrace(backstackEntry)}); currentPage: ${this.currentPage}`, Trace.categories.Navigation);
        }
    }
    _navigateCore(backstackEntry) {
        if (Trace.isEnabled()) {
            Trace.write(`NAVIGATE CORE(${this._backstackEntryTrace(backstackEntry)}); currentPage: ${this.currentPage}`, Trace.categories.Navigation);
        }
    }
    _onNavigatingTo(backstackEntry, isBack) {
        if (this.currentPage) {
            this.currentPage.onNavigatingFrom(isBack);
        }
        backstackEntry.resolvedPage.onNavigatingTo(backstackEntry.entry.context, isBack, backstackEntry.entry.bindingContext);
        this.notify({
            eventName: Page.navigatingToEvent,
            object: this,
            isBack,
            entry: backstackEntry.entry,
            fromEntry: this.currentEntry,
        });
    }
    get animated() {
        return this._animated;
    }
    set animated(value) {
        this._animated = value;
    }
    get transition() {
        return this._transition;
    }
    set transition(value) {
        this._transition = value;
    }
    get backStack() {
        return this._backStack.slice();
    }
    get currentPage() {
        if (this._currentEntry) {
            return this._currentEntry.resolvedPage;
        }
        return null;
    }
    get currentEntry() {
        if (this._currentEntry) {
            return this._currentEntry.entry;
        }
        return null;
    }
    _pushInFrameStackRecursive() {
        this._pushInFrameStack();
        // make sure nested frames order is kept intact i.e. the nested one should always be on top;
        // see https://github.com/NativeScript/nativescript-angular/issues/1596 for more information
        const framesToPush = [];
        for (const frame of frameStack) {
            if (frame.isNestedWithin(this)) {
                framesToPush.push(frame);
            }
        }
        for (const frame of framesToPush) {
            frame._pushInFrameStack();
        }
    }
    _pushInFrameStack() {
        _pushInFrameStack(this);
    }
    _popFromFrameStack() {
        _popFromFrameStack(this);
    }
    _removeFromFrameStack() {
        _removeFromFrameStack(this);
    }
    _dialogClosed() {
        // No super call as we do not support nested frames to clean up
        this._removeFromFrameStack();
    }
    _onRootViewReset() {
        super._onRootViewReset();
        this._removeFromFrameStack();
    }
    get _childrenCount() {
        if (this.currentPage) {
            return 1;
        }
        return 0;
    }
    eachChildView(callback) {
        const page = this.currentPage;
        if (page) {
            callback(page);
        }
    }
    _getIsAnimatedNavigation(entry) {
        if (entry && entry.animated !== undefined) {
            return entry.animated;
        }
        if (this.animated !== undefined) {
            return this.animated;
        }
        return FrameBase_1.defaultAnimatedNavigation;
    }
    _getNavigationTransition(entry) {
        if (entry) {
            if (global.isIOS && entry.transitioniOS !== undefined) {
                return entry.transitioniOS;
            }
            if (global.isAndroid && entry.transitionAndroid !== undefined) {
                return entry.transitionAndroid;
            }
            if (entry.transition !== undefined) {
                return entry.transition;
            }
        }
        if (this.transition !== undefined) {
            return this.transition;
        }
        return FrameBase_1.defaultTransition;
    }
    get navigationBarHeight() {
        return 0;
    }
    _getNavBarVisible(page) {
        throw new Error();
    }
    // We don't need to put Page as visual child. Don't call super.
    _addViewToNativeVisualTree(child) {
        return true;
    }
    // We don't need to put Page as visual child. Don't call super.
    _removeViewFromNativeVisualTree(child) {
        child._isAddedToNativeVisualTree = false;
    }
    _printFrameBackStack() {
        const length = this.backStack.length;
        let i = length - 1;
        console.log(`Frame Back Stack: `);
        while (i >= 0) {
            const backstackEntry = this.backStack[i--];
            console.log(`\t${backstackEntry.resolvedPage}`);
        }
    }
    _backstackEntryTrace(b) {
        let result = `${b.resolvedPage}`;
        const backstackVisible = FrameBase_1._isEntryBackstackVisible(b);
        if (!backstackVisible) {
            result += ` | INVISIBLE`;
        }
        if (b.entry.clearHistory) {
            result += ` | CLEAR HISTORY`;
        }
        const animated = this._getIsAnimatedNavigation(b.entry);
        if (!animated) {
            result += ` | NOT ANIMATED`;
        }
        const t = this._getNavigationTransition(b.entry);
        if (t) {
            result += ` | Transition[${JSON.stringify(t)}]`;
        }
        return result;
    }
    _onLivesync(context) {
        if (super._onLivesync(context)) {
            return true;
        }
        // Fallback
        if (!context) {
            return this.legacyLivesync();
        }
        return false;
    }
    _handleLivesync(context) {
        if (super._handleLivesync(context)) {
            return true;
        }
        // Handle markup/script changes in currentPage
        if (this.currentPage && viewMatchesModuleContext(this.currentPage, context, ['markup', 'script'])) {
            Trace.write(`Change Handled: Replacing page ${context.path}`, Trace.categories.Livesync);
            // replace current page with a default fade transition
            this.replacePage({
                moduleName: context.path,
                transition: {
                    name: 'fade',
                    duration: 100,
                },
            });
            return true;
        }
        return false;
    }
    legacyLivesync() {
        // Reset activity/window content when:
        // + Changes are not handled on View
        // + There is no ModuleContext
        if (Trace.isEnabled()) {
            Trace.write(`${this}._onLivesync()`, Trace.categories.Livesync);
        }
        if (!this._currentEntry || !this._currentEntry.entry) {
            return false;
        }
        const currentEntry = this._currentEntry.entry;
        const newEntry = {
            animated: false,
            clearHistory: true,
            context: currentEntry.context,
            create: currentEntry.create,
            moduleName: currentEntry.moduleName,
            backstackVisible: currentEntry.backstackVisible,
        };
        // If create returns the same page instance we can't recreate it.
        // Instead of navigation set activity content.
        // This could happen if current page was set in XML as a Page instance.
        if (newEntry.create) {
            const page = newEntry.create();
            if (page === this.currentPage) {
                return false;
            }
        }
        this.navigate(newEntry);
        return true;
    }
    replacePage(entry) {
        const currentBackstackEntry = this._currentEntry;
        if (typeof entry === 'string') {
            const contextModuleName = sanitizeModuleName(entry);
            entry = { moduleName: contextModuleName };
        }
        const newPage = Builder.createViewFromEntry(entry);
        const newBackstackEntry = {
            entry: Object.assign({}, currentBackstackEntry.entry, entry),
            resolvedPage: newPage,
            navDepth: currentBackstackEntry.navDepth,
            fragmentTag: currentBackstackEntry.fragmentTag,
            frameId: currentBackstackEntry.frameId,
        };
        const navigationContext = {
            entry: newBackstackEntry,
            isBackNavigation: false,
            navigationType: NavigationType.replace,
        };
        this._navigationQueue.push(navigationContext);
        this._processNextNavigationEntry();
    }
};
FrameBase.androidOptionSelectedEvent = 'optionSelected';
FrameBase.defaultAnimatedNavigation = true;
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FrameBase.prototype, "onLoaded", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FrameBase.prototype, "performNavigation", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FrameBase.prototype, "performGoBack", null);
FrameBase = FrameBase_1 = __decorate([
    CSSType('Frame')
], FrameBase);
export { FrameBase };
// Mark as a Frame with an unique Symbol
FrameBase.prototype[FRAME_SYMBOL] = true;
export function getFrameById(id) {
    console.log('getFrameById() is deprecated. Use Frame.getFrameById() instead.');
    return FrameBase.getFrameById(id);
}
export function topmost() {
    console.log('topmost() is deprecated. Use Frame.topmost() instead.');
    return FrameBase.topmost();
}
export function goBack() {
    console.log('goBack() is deprecated. Use Frame.goBack() instead.');
    return FrameBase.goBack();
}
export function _stack() {
    console.log('_stack() is deprecated. Use Frame._stack() instead.');
    return FrameBase._stack();
}
export const defaultPage = new Property({
    name: 'defaultPage',
    valueChanged: (frame, oldValue, newValue) => {
        frame.navigate({ moduleName: newValue });
    },
});
defaultPage.register(FrameBase);
export const actionBarVisibilityProperty = new Property({ name: 'actionBarVisibility', defaultValue: 'auto', affectsLayout: global.isIOS });
actionBarVisibilityProperty.register(FrameBase);
//# sourceMappingURL=frame-common.js.map