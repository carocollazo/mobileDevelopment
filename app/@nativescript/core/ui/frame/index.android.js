// Types.
import * as application from '../../application';
import { _stack, FrameBase, NavigationType } from './frame-common';
import { Color } from '../../color';
import { Trace } from '../../trace';
import { Observable } from '../../data/observable';
import { _setAndroidFragmentTransitions, _getAnimatedEntries, _updateTransitions, _reverseTransitions, _clearEntry, _clearFragment, addNativeTransitionListener } from './fragment.transitions';
// TODO: Remove this and get it from global to decouple builder for angular
import { Builder } from '../builder';
import { CSSUtils } from '../../css/system-classes';
import { Device } from '../../platform';
import { profile } from '../../profiling';
import { android as androidApplication } from '../../application';
export * from './frame-common';
const ANDROID_PLATFORM = 'android';
const INTENT_EXTRA = 'com.tns.activity';
const ROOT_VIEW_ID_EXTRA = 'com.tns.activity.rootViewId';
const FRAMEID = '_frameId';
const CALLBACKS = '_callbacks';
const ownerSymbol = Symbol('_owner');
const activityRootViewsMap = new Map();
let navDepth = -1;
let fragmentId = -1;
export let moduleLoaded;
if (global && global.__inspector) {
    const devtools = require('../../debugger/devtools-elements');
    devtools.attachDOMInspectorEventCallbacks(global.__inspector);
    devtools.attachDOMInspectorCommandCallbacks(global.__inspector);
}
export let attachStateChangeListener;
function getAttachListener() {
    if (!attachStateChangeListener) {
        /**
         * NOTE: We cannot use NativeClass here because this is used in appComponents in webpack.config
         * Whereby it bypasses the decorator transformation, hence pure es5 style written here
         */
        const AttachListener = java.lang.Object.extend({
            interfaces: [android.view.View.OnAttachStateChangeListener],
            init() {
                // init must be defined at least
            },
            onViewAttachedToWindow(view) {
                const owner = view[ownerSymbol];
                if (owner) {
                    owner._onAttachedToWindow();
                }
            },
            onViewDetachedFromWindow(view) {
                const owner = view[ownerSymbol];
                if (owner) {
                    owner._onDetachedFromWindow();
                }
            },
        });
        attachStateChangeListener = new AttachListener();
    }
    return attachStateChangeListener;
}
export class Frame extends FrameBase {
    constructor() {
        super();
        this._containerViewId = -1;
        this._tearDownPending = false;
        this._attachedToWindow = false;
        this._android = new AndroidFrame(this);
    }
    static reloadPage(context) {
        const activity = application.android.foregroundActivity;
        const callbacks = activity[CALLBACKS];
        if (callbacks) {
            const rootView = callbacks.getRootView();
            // Handle application root module
            const isAppRootModuleChanged = context && context.path && context.path.includes(application.getMainEntry().moduleName) && context.type !== 'style';
            // Reset activity content when:
            // + Application root module is changed
            // + View did not handle the change
            // Note:
            // The case when neither app root module is changed, neighter livesync is handled on View,
            // then changes will not apply until navigate forward to the module.
            if (isAppRootModuleChanged || !rootView || !rootView._onLivesync(context)) {
                callbacks.resetActivityContent(activity);
            }
        }
        else {
            Trace.error(`${activity}[CALLBACKS] is null or undefined`);
        }
    }
    static get defaultAnimatedNavigation() {
        return FrameBase.defaultAnimatedNavigation;
    }
    static set defaultAnimatedNavigation(value) {
        FrameBase.defaultAnimatedNavigation = value;
    }
    static get defaultTransition() {
        return FrameBase.defaultTransition;
    }
    static set defaultTransition(value) {
        FrameBase.defaultTransition = value;
    }
    get containerViewId() {
        return this._containerViewId;
    }
    // @ts-ignore
    get android() {
        return this._android;
    }
    get _hasFragments() {
        return true;
    }
    _onAttachedToWindow() {
        var _a, _b, _c, _d, _e;
        super._onAttachedToWindow();
        // _onAttachedToWindow called from OS again after it was detach
        // still happens with androidx.fragment:1.3.2
        const lifecycleState = ((_e = (((_b = (_a = androidApplication.foregroundActivity) === null || _a === void 0 ? void 0 : _a.getLifecycle) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_d = (_c = androidApplication.startActivity) === null || _c === void 0 ? void 0 : _c.getLifecycle) === null || _d === void 0 ? void 0 : _d.call(_c)))) === null || _e === void 0 ? void 0 : _e.getCurrentState()) || androidx.lifecycle.Lifecycle.State.CREATED;
        if ((this._manager && this._manager.isDestroyed()) || !lifecycleState.isAtLeast(androidx.lifecycle.Lifecycle.State.CREATED)) {
            return;
        }
        this._attachedToWindow = true;
        this._processNextNavigationEntry();
    }
    _onDetachedFromWindow() {
        super._onDetachedFromWindow();
        this._attachedToWindow = false;
    }
    _processNextNavigationEntry() {
        // In case activity was destroyed because of back button pressed (e.g. app exit)
        // and application is restored from recent apps, current fragment isn't recreated.
        // In this case call _navigateCore in order to recreate the current fragment.
        // Don't call navigate because it will fire navigation events.
        // As JS instances are alive it is already done for the current page.
        if (!this.isLoaded || this._executingContext || !this._attachedToWindow) {
            return;
        }
        const animatedEntries = _getAnimatedEntries(this._android.frameId);
        if (animatedEntries) {
            // Wait until animations are completed.
            if (animatedEntries.size > 0) {
                return;
            }
        }
        const manager = this._getFragmentManager();
        const entry = this._currentEntry;
        const isNewEntry = !this._cachedTransitionState || entry !== this._cachedTransitionState.entry;
        if (isNewEntry && entry && manager && !manager.findFragmentByTag(entry.fragmentTag)) {
            // Simulate first navigation (e.g. no animations or transitions)
            // we need to cache the original animation settings so we can restore them later; otherwise as the
            // simulated first navigation is not animated (it is actually a zero duration animator) the "popExit" animation
            // is broken when transaction.setCustomAnimations(...) is used in a scenario with:
            // 1) forward navigation
            // 2) suspend / resume app
            // 3) back navigation -- the exiting fragment is erroneously animated with the exit animator from the
            // simulated navigation (NoTransition, zero duration animator) and thus the fragment immediately disappears;
            // the user only sees the animation of the entering fragment as per its specific enter animation settings.
            // NOTE: we are restoring the animation settings in Frame.setCurrent(...) as navigation completes asynchronously
            const cachedTransitionState = getTransitionState(this._currentEntry);
            if (cachedTransitionState) {
                this._cachedTransitionState = cachedTransitionState;
                this._currentEntry = null;
                // NavigateCore will eventually call _processNextNavigationEntry again.
                this._navigateCore(entry);
                this._currentEntry = entry;
            }
            else {
                super._processNextNavigationEntry();
            }
        }
        else {
            super._processNextNavigationEntry();
        }
    }
    _getChildFragmentManager() {
        let backstackEntry;
        if (this._executingContext && this._executingContext.entry) {
            backstackEntry = this._executingContext.entry;
        }
        else {
            backstackEntry = this._currentEntry;
        }
        if (backstackEntry && backstackEntry.fragment && backstackEntry.fragment.isAdded()) {
            return backstackEntry.fragment.getChildFragmentManager();
        }
        return null;
    }
    _onRootViewReset() {
        super._onRootViewReset();
        // call this AFTER the super call to ensure descendants apply their rootview-reset logic first
        // i.e. in a scenario with nested frames / frame with tabview let the descendandt cleanup the inner
        // fragments first, and then cleanup the parent fragments
        this.disposeCurrentFragment();
    }
    onLoaded() {
        if (this._originalBackground) {
            this.backgroundColor = null;
            this.backgroundColor = this._originalBackground;
            this._originalBackground = null;
        }
        this._frameCreateTimeout = setTimeout(() => {
            var _a;
            // there's a bug with nested frames where sometimes the nested fragment is not recreated at all
            // so we manually check on loaded event if the fragment is not recreated and recreate it
            const currentEntry = this._currentEntry || ((_a = this._executingContext) === null || _a === void 0 ? void 0 : _a.entry);
            if (currentEntry) {
                if (!currentEntry.fragment) {
                    const manager = this._getFragmentManager();
                    const transaction = manager.beginTransaction();
                    currentEntry.fragment = this.createFragment(currentEntry, currentEntry.fragmentTag);
                    _updateTransitions(currentEntry);
                    transaction.replace(this.containerViewId, currentEntry.fragment, currentEntry.fragmentTag);
                    transaction.commitAllowingStateLoss();
                }
            }
        }, 0);
        super.onLoaded();
    }
    onUnloaded() {
        super.onUnloaded();
        if (typeof this._frameCreateTimeout === 'number') {
            clearTimeout(this._frameCreateTimeout);
            this._frameCreateTimeout = null;
        }
    }
    disposeCurrentFragment() {
        if (!this._currentEntry || !this._currentEntry.fragment || !this._currentEntry.fragment.isAdded()) {
            return;
        }
        const fragment = this._currentEntry.fragment;
        const fragmentManager = fragment.getFragmentManager();
        const transaction = fragmentManager.beginTransaction();
        const fragmentExitTransition = fragment.getExitTransition();
        // Reset animation to its initial state to prevent mirrored effect when restore current fragment transitions
        if (fragmentExitTransition && fragmentExitTransition instanceof org.nativescript.widgets.CustomTransition) {
            fragmentExitTransition.setResetOnTransitionEnd(true);
        }
        transaction.remove(fragment);
        transaction.commitNowAllowingStateLoss();
    }
    createFragment(backstackEntry, fragmentTag) {
        ensureFragmentClass();
        const newFragment = new fragmentClass();
        const args = new android.os.Bundle();
        args.putInt(FRAMEID, this._android.frameId);
        newFragment.setArguments(args);
        setFragmentCallbacks(newFragment);
        const callbacks = newFragment[CALLBACKS];
        callbacks.frame = this;
        callbacks.entry = backstackEntry;
        // backstackEntry
        backstackEntry.fragment = newFragment;
        backstackEntry.fragmentTag = fragmentTag;
        backstackEntry.navDepth = navDepth;
        return newFragment;
    }
    setCurrent(entry, navigationType) {
        const current = this._currentEntry;
        const currentEntryChanged = current !== entry;
        if (currentEntryChanged) {
            this._updateBackstack(entry, navigationType);
            // If activity was destroyed we need to destroy fragment and UI
            // of current and new entries.
            if (this._tearDownPending) {
                this._tearDownPending = false;
                if (!entry.recreated) {
                    clearEntry(entry);
                }
                if (current && !current.recreated) {
                    clearEntry(current);
                }
                // If we have context activity was recreated. Create new fragment
                // and UI for the new current page.
                const context = this._context;
                if (context && !entry.recreated) {
                    entry.fragment = this.createFragment(entry, entry.fragmentTag);
                    entry.resolvedPage._setupUI(context);
                }
                entry.recreated = false;
                if (current) {
                    current.recreated = false;
                }
            }
            super.setCurrent(entry, navigationType);
            // If we had real navigation process queue.
            this._processNavigationQueue(entry.resolvedPage);
        }
        else {
            // Otherwise currentPage was recreated so this wasn't real navigation.
            // Continue with next item in the queue.
            this._processNextNavigationEntry();
        }
        // restore cached animation settings if we just completed simulated first navigation (no animation)
        if (this._cachedTransitionState) {
            restoreTransitionState(this._currentEntry, this._cachedTransitionState);
            this._cachedTransitionState = null;
        }
        // restore original fragment transitions if we just completed replace navigation (hmr)
        if (navigationType === NavigationType.replace) {
            _clearEntry(entry);
            const animated = this._getIsAnimatedNavigation(entry.entry);
            const navigationTransition = this._getNavigationTransition(entry.entry);
            const currentEntry = null;
            const newEntry = entry;
            const transaction = null;
            _setAndroidFragmentTransitions(animated, navigationTransition, currentEntry, newEntry, this._android.frameId, transaction);
        }
    }
    onBackPressed() {
        if (this.canGoBack()) {
            this.goBack();
            return true;
        }
        if (!this.navigationQueueIsEmpty()) {
            const manager = this._getFragmentManager();
            if (manager) {
                manager.executePendingTransactions();
                return true;
            }
        }
        return false;
    }
    // HACK: This @profile decorator creates a circular dependency
    // HACK: because the function parameter type is evaluated with 'typeof'
    _navigateCore(newEntry) {
        // should be (newEntry: BackstackEntry)
        super._navigateCore(newEntry);
        // set frameId here so that we could use it in fragment.transitions
        newEntry.frameId = this._android.frameId;
        const activity = this._android.activity;
        if (!activity) {
            // Activity not associated. In this case we have two execution paths:
            // 1. This is the main frame for the application
            // 2. This is an inner frame which requires a new Activity
            const currentActivity = this._android.currentActivity;
            if (currentActivity) {
                startActivity(currentActivity, this._android.frameId);
            }
            return;
        }
        const manager = this._getFragmentManager();
        const clearHistory = newEntry.entry.clearHistory;
        const currentEntry = this._currentEntry;
        // New Fragment
        if (clearHistory) {
            navDepth = -1;
        }
        const isReplace = this._executingContext && this._executingContext.navigationType === NavigationType.replace;
        if (!isReplace) {
            navDepth++;
        }
        fragmentId++;
        const newFragmentTag = `fragment${fragmentId}[${navDepth}]`;
        const newFragment = this.createFragment(newEntry, newFragmentTag);
        const transaction = manager.beginTransaction();
        let animated = currentEntry ? this._getIsAnimatedNavigation(newEntry.entry) : false;
        // NOTE: Don't use transition for the initial navigation (same as on iOS)
        // On API 21+ transition won't be triggered unless there was at least one
        // layout pass so we will wait forever for transitionCompleted handler...
        // https://github.com/NativeScript/NativeScript/issues/4895
        let navigationTransition;
        if (this._currentEntry) {
            navigationTransition = this._getNavigationTransition(newEntry.entry);
        }
        else {
            navigationTransition = null;
        }
        const isNestedDefaultTransition = !currentEntry;
        _setAndroidFragmentTransitions(animated, navigationTransition, currentEntry, newEntry, this._android.frameId, transaction, isNestedDefaultTransition);
        if (currentEntry && animated && !navigationTransition) {
            //TODO: Check whether or not this is still necessary. For Modal views?
            //transaction.setTransition(androidx.fragment.app.FragmentTransaction.TRANSIT_FRAGMENT_OPEN);
        }
        transaction.replace(this.containerViewId, newFragment, newFragmentTag);
        transaction.commitAllowingStateLoss();
    }
    _goBackCore(backstackEntry) {
        super._goBackCore(backstackEntry);
        navDepth = backstackEntry.navDepth;
        const manager = this._getFragmentManager();
        const transaction = manager.beginTransaction();
        if (!backstackEntry.fragment) {
            // Happens on newer API levels. On older all fragments
            // are recreated once activity is created.
            // This entry fragment was destroyed by app suspend.
            // We need to recreate its animations and then reverse it.
            backstackEntry.fragment = this.createFragment(backstackEntry, backstackEntry.fragmentTag);
            _updateTransitions(backstackEntry);
        }
        _reverseTransitions(backstackEntry, this._currentEntry);
        transaction.replace(this.containerViewId, backstackEntry.fragment, backstackEntry.fragmentTag);
        transaction.commitAllowingStateLoss();
    }
    _removeEntry(removed) {
        super._removeEntry(removed);
        if (removed.fragment) {
            _clearEntry(removed);
        }
        removed.fragment = null;
        removed.viewSavedState = null;
    }
    createNativeView() {
        // Create native view with available _currentEntry occur in Don't Keep Activities
        // scenario when Activity is recreated on app suspend/resume. Push frame back in frame stack
        // since it was removed in disposeNativeView() method.
        if (this._currentEntry) {
            this._pushInFrameStack();
        }
        return new org.nativescript.widgets.ContentLayout(this._context);
    }
    initNativeView() {
        super.initNativeView();
        const listener = getAttachListener();
        this.nativeViewProtected.addOnAttachStateChangeListener(listener);
        this.nativeViewProtected[ownerSymbol] = this;
        this._android.rootViewGroup = this.nativeViewProtected;
        if (this._containerViewId < 0) {
            this._containerViewId = android.view.View.generateViewId();
        }
        this._android.rootViewGroup.setId(this._containerViewId);
    }
    disposeNativeView() {
        const listener = getAttachListener();
        this.nativeViewProtected.removeOnAttachStateChangeListener(listener);
        this.nativeViewProtected[ownerSymbol] = null;
        this._tearDownPending = !!this._executingContext;
        const current = this._currentEntry;
        const executingEntry = this._executingContext ? this._executingContext.entry : null;
        this.backStack.forEach((entry) => {
            // Don't destroy current and executing entries or UI will look blank.
            // We will do it in setCurrent.
            if (entry !== executingEntry) {
                clearEntry(entry);
            }
        });
        if (current && !executingEntry) {
            clearEntry(current);
        }
        this._android.rootViewGroup = null;
        this._removeFromFrameStack();
        super.disposeNativeView();
    }
    _popFromFrameStack() {
        if (!this._isInFrameStack) {
            return;
        }
        super._popFromFrameStack();
    }
    _getNavBarVisible(page) {
        switch (this.actionBarVisibility) {
            case 'never':
                return false;
            case 'always':
                return true;
            default:
                if (page.actionBarHidden !== undefined) {
                    return !page.actionBarHidden;
                }
                if (this._android && this._android.showActionBar !== undefined) {
                    return this._android.showActionBar;
                }
                return true;
        }
    }
    _saveFragmentsState() {
        // We save only fragments in backstack.
        // Current fragment is saved by FragmentManager.
        this.backStack.forEach((entry) => {
            const view = entry.resolvedPage.nativeViewProtected;
            if (!entry.viewSavedState && view) {
                const viewState = new android.util.SparseArray();
                view.saveHierarchyState(viewState);
                entry.viewSavedState = viewState;
            }
        });
    }
}
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Frame.prototype, "_navigateCore", null);
export function reloadPage(context) {
    console.log('reloadPage() is deprecated. Use Frame.reloadPage() instead.');
    return Frame.reloadPage(context);
}
// attach on global, so it can be overwritten in NativeScript Angular
global.__onLiveSyncCore = Frame.reloadPage;
function cloneExpandedTransitionListener(expandedTransitionListener) {
    if (!expandedTransitionListener) {
        return null;
    }
    const cloneTransition = expandedTransitionListener.transition.clone();
    return addNativeTransitionListener(expandedTransitionListener.entry, cloneTransition);
}
function getTransitionState(entry) {
    const expandedEntry = entry;
    const transitionState = {};
    if (expandedEntry.enterTransitionListener && expandedEntry.exitTransitionListener) {
        transitionState.enterTransitionListener = cloneExpandedTransitionListener(expandedEntry.enterTransitionListener);
        transitionState.exitTransitionListener = cloneExpandedTransitionListener(expandedEntry.exitTransitionListener);
        transitionState.reenterTransitionListener = cloneExpandedTransitionListener(expandedEntry.reenterTransitionListener);
        transitionState.returnTransitionListener = cloneExpandedTransitionListener(expandedEntry.returnTransitionListener);
        transitionState.transitionName = expandedEntry.transitionName;
        transitionState.entry = entry;
    }
    else {
        return null;
    }
    return transitionState;
}
function restoreTransitionState(entry, snapshot) {
    const expandedEntry = entry;
    if (snapshot.enterTransitionListener) {
        expandedEntry.enterTransitionListener = snapshot.enterTransitionListener;
    }
    if (snapshot.exitTransitionListener) {
        expandedEntry.exitTransitionListener = snapshot.exitTransitionListener;
    }
    if (snapshot.reenterTransitionListener) {
        expandedEntry.reenterTransitionListener = snapshot.reenterTransitionListener;
    }
    if (snapshot.returnTransitionListener) {
        expandedEntry.returnTransitionListener = snapshot.returnTransitionListener;
    }
    expandedEntry.transitionName = snapshot.transitionName;
}
function clearEntry(entry) {
    if (entry.fragment) {
        _clearFragment(entry);
    }
    entry.recreated = false;
    entry.fragment = null;
    const page = entry.resolvedPage;
    if (page && page._context) {
        entry.resolvedPage._tearDownUI(true);
    }
}
let framesCounter = 0;
const framesCache = new Array();
class AndroidFrame extends Observable {
    constructor(owner) {
        super();
        this._showActionBar = true;
        this._owner = owner;
        this.frameId = framesCounter++;
        framesCache.push(new WeakRef(this));
    }
    get showActionBar() {
        return this._showActionBar;
    }
    set showActionBar(value) {
        if (this._showActionBar !== value) {
            this._showActionBar = value;
            if (this.owner.currentPage) {
                this.owner.currentPage.actionBar.update();
            }
        }
    }
    get activity() {
        const activity = this.owner._context;
        if (activity) {
            return activity;
        }
        // traverse the parent chain for an ancestor Frame
        let currView = this._owner.parent;
        while (currView) {
            if (currView instanceof Frame) {
                return currView.android.activity;
            }
            currView = currView.parent;
        }
        return undefined;
    }
    get actionBar() {
        const activity = this.currentActivity;
        if (!activity) {
            return undefined;
        }
        const bar = activity.getActionBar();
        if (!bar) {
            return undefined;
        }
        return bar;
    }
    get currentActivity() {
        let activity = this.activity;
        if (activity) {
            return activity;
        }
        const frames = _stack();
        for (let length = frames.length, i = length - 1; i >= 0; i--) {
            activity = frames[i].android.activity;
            if (activity) {
                return activity;
            }
        }
        return undefined;
    }
    get owner() {
        return this._owner;
    }
    canGoBack() {
        if (!this.activity) {
            return false;
        }
        // can go back only if it is not the main one.
        return this.activity.getIntent().getAction() !== android.content.Intent.ACTION_MAIN;
    }
    fragmentForPage(entry) {
        const tag = entry && entry.fragmentTag;
        if (tag) {
            return this.owner._getFragmentManager().findFragmentByTag(tag);
        }
        return undefined;
    }
}
function findPageForFragment(fragment, frame) {
    const fragmentTag = fragment.getTag();
    if (Trace.isEnabled()) {
        Trace.write(`Finding page for ${fragmentTag}.`, Trace.categories.NativeLifecycle);
    }
    let entry;
    const current = frame._currentEntry;
    const executingContext = frame._executingContext;
    if (current && current.fragmentTag === fragmentTag) {
        entry = current;
    }
    else if (executingContext && executingContext.entry && executingContext.entry.fragmentTag === fragmentTag) {
        entry = executingContext.entry;
    }
    let page;
    if (entry) {
        entry.recreated = true;
        page = entry.resolvedPage;
    }
    if (page) {
        const callbacks = fragment[CALLBACKS];
        callbacks.frame = frame;
        callbacks.entry = entry;
        entry.fragment = fragment;
        _updateTransitions(entry);
    }
    else {
        throw new Error(`Could not find a page for ${fragmentTag}.`);
    }
}
function startActivity(activity, frameId) {
    // TODO: Implicitly, we will open the same activity type as the current one
    const intent = new android.content.Intent(activity, activity.getClass());
    intent.setAction(android.content.Intent.ACTION_DEFAULT);
    intent.putExtra(INTENT_EXTRA, frameId);
    // TODO: Put the navigation context (if any) in the intent
    activity.startActivity(intent);
}
function getFrameByNumberId(frameId) {
    // Find the frame for this activity.
    for (let i = 0; i < framesCache.length; i++) {
        const aliveFrame = framesCache[i].get();
        if (aliveFrame && aliveFrame.frameId === frameId) {
            return aliveFrame.owner;
        }
    }
    return null;
}
function ensureFragmentClass() {
    if (fragmentClass) {
        return;
    }
    // this require will apply the FragmentClass implementation
    require('./fragment');
    if (!fragmentClass) {
        throw new Error('Failed to initialize the extended androidx.fragment.app.Fragment class');
    }
}
let fragmentClass;
export function setFragmentClass(clazz) {
    if (fragmentClass) {
        throw new Error('Fragment class already initialized');
    }
    fragmentClass = clazz;
}
class FragmentCallbacksImplementation {
    constructor() {
        this.backgroundBitmap = null;
    }
    onHiddenChanged(fragment, hidden, superFunc) {
        if (Trace.isEnabled()) {
            Trace.write(`${fragment}.onHiddenChanged(${hidden})`, Trace.categories.NativeLifecycle);
        }
        superFunc.call(fragment, hidden);
    }
    onCreateAnimator(fragment, transit, enter, nextAnim, superFunc) {
        let animator = null;
        const entry = this.entry;
        // Return enterAnimator only when new (no current entry) nested transition.
        if (enter && entry.isNestedDefaultTransition) {
            animator = entry.enterAnimator;
            entry.isNestedDefaultTransition = false;
        }
        return animator || superFunc.call(fragment, transit, enter, nextAnim);
    }
    onCreate(fragment, savedInstanceState, superFunc) {
        if (Trace.isEnabled()) {
            Trace.write(`${fragment}.onCreate(${savedInstanceState})`, Trace.categories.NativeLifecycle);
        }
        superFunc.call(fragment, savedInstanceState);
        // There is no entry set to the fragment, so this must be destroyed fragment that was recreated by Android.
        // We should find its corresponding page in our backstack and set it manually.
        if (!this.entry) {
            const args = fragment.getArguments();
            const frameId = args.getInt(FRAMEID);
            const frame = getFrameByNumberId(frameId);
            if (!frame) {
                throw new Error(`Cannot find Frame for ${fragment}`);
            }
            findPageForFragment(fragment, frame);
        }
    }
    onCreateView(fragment, inflater, container, savedInstanceState, superFunc) {
        if (Trace.isEnabled()) {
            Trace.write(`${fragment}.onCreateView(inflater, container, ${savedInstanceState})`, Trace.categories.NativeLifecycle);
        }
        const entry = this.entry;
        if (!entry) {
            Trace.error(`${fragment}.onCreateView: entry is null or undefined`);
            return null;
        }
        const page = entry.resolvedPage;
        if (!page) {
            Trace.error(`${fragment}.onCreateView: entry has no resolvedPage`);
            return null;
        }
        const frame = this.frame;
        if (!frame) {
            Trace.error(`${fragment}.onCreateView: this.frame is null or undefined`);
            return null;
        }
        if (page.parent === frame) {
            // If we are navigating to a page that was destroyed
            // reinitialize its UI.
            if (!page._context) {
                const context = (container && container.getContext()) || (inflater && inflater.getContext());
                page._setupUI(context);
            }
        }
        else {
            if (!frame._styleScope) {
                // Make sure page will have styleScope even if parents don't.
                page._updateStyleScope();
            }
            frame._addView(page);
        }
        if (frame.isLoaded && !page.isLoaded) {
            page.callLoaded();
        }
        const savedState = entry.viewSavedState;
        if (savedState) {
            page.nativeViewProtected.restoreHierarchyState(savedState);
            entry.viewSavedState = null;
        }
        // fixes 'java.lang.IllegalStateException: The specified child already has a parent. You must call removeView() on the child's parent first'.
        // on app resume in nested frame scenarios with support library version greater than 26.0.0
        // HACK: this whole code block shouldn't be necessary as the native view is supposedly removed from its parent
        // right after onDestroyView(...) is called but for some reason the fragment view (page) still thinks it has a
        // parent while its supposed parent believes it properly removed its children; in order to "force" the child to
        // lose its parent we temporarily add it to the parent, and then remove it (addViewInLayout doesn't trigger layout pass)
        const nativeView = page.nativeViewProtected;
        if (nativeView != null) {
            const parentView = nativeView.getParent();
            if (parentView instanceof android.view.ViewGroup) {
                if (parentView.getChildCount() === 0) {
                    parentView.addViewInLayout(nativeView, -1, new org.nativescript.widgets.CommonLayoutParams());
                }
                parentView.removeAllViews();
            }
        }
        return page.nativeViewProtected;
    }
    onSaveInstanceState(fragment, outState, superFunc) {
        if (Trace.isEnabled()) {
            Trace.write(`${fragment}.onSaveInstanceState(${outState})`, Trace.categories.NativeLifecycle);
        }
        superFunc.call(fragment, outState);
    }
    onDestroyView(fragment, superFunc) {
        try {
            if (Trace.isEnabled()) {
                Trace.write(`${fragment}.onDestroyView()`, Trace.categories.NativeLifecycle);
            }
            const hasRemovingParent = fragment.getRemovingParentFragment();
            if (hasRemovingParent) {
                const nativeFrameView = this.frame.nativeViewProtected;
                if (nativeFrameView) {
                    const bitmapDrawable = new android.graphics.drawable.BitmapDrawable(application.android.context.getResources(), this.backgroundBitmap);
                    this.frame._originalBackground = this.frame.backgroundColor || new Color('White');
                    nativeFrameView.setBackgroundDrawable(bitmapDrawable);
                    this.backgroundBitmap = null;
                }
            }
        }
        finally {
            superFunc.call(fragment);
        }
    }
    onDestroy(fragment, superFunc) {
        if (Trace.isEnabled()) {
            Trace.write(`${fragment}.onDestroy()`, Trace.categories.NativeLifecycle);
        }
        superFunc.call(fragment);
        const entry = this.entry;
        if (!entry) {
            Trace.error(`${fragment}.onDestroy: entry is null or undefined`);
            return null;
        }
        // [nested frames / fragments] see https://github.com/NativeScript/NativeScript/issues/6629
        // retaining reference to a destroyed fragment here somehow causes a cryptic
        // "IllegalStateException: Failure saving state: active fragment has cleared index: -1"
        // in a specific mixed parent / nested frame navigation scenario
        entry.fragment = null;
        const page = entry.resolvedPage;
        if (!page) {
            Trace.error(`${fragment}.onDestroy: entry has no resolvedPage`);
            return null;
        }
    }
    onPause(fragment, superFunc) {
        try {
            // Get view as bitmap and set it as background. This is workaround for the disapearing nested fragments.
            // TODO: Consider removing it when update to androidx.fragment:1.2.0
            const hasRemovingParent = fragment.getRemovingParentFragment();
            if (hasRemovingParent) {
                this.backgroundBitmap = this.loadBitmapFromView(this.frame.nativeViewProtected);
            }
        }
        finally {
            superFunc.call(fragment);
        }
    }
    onResume(fragment, superFunc) {
        const frame = this.entry.resolvedPage.frame;
        // on some cases during the first navigation on nested frames the animation doesn't trigger
        // we depend on the animation (even None animation) to set the entry as the current entry
        // animation should start between start and resume, so if we have an executing navigation here it probably means the animation was skipped
        // so we manually set the entry
        // also, to be compatible with fragments 1.2.x we need this setTimeout as animations haven't run on onResume yet
        setTimeout(() => {
            if (frame._executingContext && !this.entry.isAnimationRunning) {
                frame.setCurrent(this.entry, frame._executingContext.navigationType);
            }
        }, 0);
        superFunc.call(fragment);
    }
    onStop(fragment, superFunc) {
        superFunc.call(fragment);
    }
    toStringOverride(fragment, superFunc) {
        const entry = this.entry;
        if (entry) {
            return `${entry.fragmentTag}<${entry.resolvedPage}>`;
        }
        else {
            return 'NO ENTRY, ' + superFunc.call(fragment);
        }
    }
    loadBitmapFromView(view) {
        // Don't try to creat bitmaps with no dimensions as this causes a crash
        // This might happen when showing and closing dialogs fast.
        if (!(view && view.getWidth() > 0 && view.getHeight() > 0)) {
            return undefined;
        }
        // Another way to get view bitmap. Test performance vs setDrawingCacheEnabled
        // const width = view.getWidth();
        // const height = view.getHeight();
        // const bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888);
        // const canvas = new android.graphics.Canvas(bitmap);
        // view.layout(0, 0, width, height);
        // view.draw(canvas);
        // view.setDrawingCacheEnabled(true);
        // const drawCache = view.getDrawingCache();
        // const bitmap = android.graphics.Bitmap.createBitmap(drawCache);
        // view.setDrawingCacheEnabled(false);
        return org.nativescript.widgets.Utils.getBitmapFromView(view);
    }
}
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.fragment.app.Fragment, Boolean, Function]),
    __metadata("design:returntype", void 0)
], FragmentCallbacksImplementation.prototype, "onHiddenChanged", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.fragment.app.Fragment, Number, Boolean, Number, Function]),
    __metadata("design:returntype", android.animation.Animator)
], FragmentCallbacksImplementation.prototype, "onCreateAnimator", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.fragment.app.Fragment, android.os.Bundle, Function]),
    __metadata("design:returntype", void 0)
], FragmentCallbacksImplementation.prototype, "onCreate", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.fragment.app.Fragment, android.view.LayoutInflater, android.view.ViewGroup, android.os.Bundle, Function]),
    __metadata("design:returntype", android.view.View)
], FragmentCallbacksImplementation.prototype, "onCreateView", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.fragment.app.Fragment, android.os.Bundle, Function]),
    __metadata("design:returntype", void 0)
], FragmentCallbacksImplementation.prototype, "onSaveInstanceState", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [org.nativescript.widgets.FragmentBase, Function]),
    __metadata("design:returntype", void 0)
], FragmentCallbacksImplementation.prototype, "onDestroyView", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.fragment.app.Fragment, Function]),
    __metadata("design:returntype", void 0)
], FragmentCallbacksImplementation.prototype, "onDestroy", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [org.nativescript.widgets.FragmentBase, Function]),
    __metadata("design:returntype", void 0)
], FragmentCallbacksImplementation.prototype, "onPause", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [org.nativescript.widgets.FragmentBase, Function]),
    __metadata("design:returntype", void 0)
], FragmentCallbacksImplementation.prototype, "onResume", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.fragment.app.Fragment, Function]),
    __metadata("design:returntype", void 0)
], FragmentCallbacksImplementation.prototype, "onStop", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.fragment.app.Fragment, Function]),
    __metadata("design:returntype", String)
], FragmentCallbacksImplementation.prototype, "toStringOverride", null);
class ActivityCallbacksImplementation {
    getRootView() {
        return this._rootView;
    }
    onCreate(activity, savedInstanceState, intentOrSuperFunc, superFunc) {
        if (Trace.isEnabled()) {
            Trace.write(`Activity.onCreate(${savedInstanceState})`, Trace.categories.NativeLifecycle);
        }
        const intent = superFunc ? intentOrSuperFunc : undefined;
        if (!superFunc) {
            console.log('AndroidActivityCallbacks.onCreate(activity: any, savedInstanceState: any, superFunc: Function) ' + 'is deprecated. Use AndroidActivityCallbacks.onCreate(activity: any, savedInstanceState: any, intent: any, superFunc: Function) instead.');
            superFunc = intentOrSuperFunc;
        }
        // If there is savedInstanceState this call will recreate all fragments that were previously in the navigation.
        // We take care of associating them with a Page from our backstack in the onAttachFragment callback.
        // If there is savedInstanceState and moduleLoaded is false we are restarted but process was killed.
        // For now we treat it like first run (e.g. we are not passing savedInstanceState so no fragments are being restored).
        // When we add support for application save/load state - revise this logic.
        const isRestart = !!savedInstanceState && moduleLoaded;
        superFunc.call(activity, isRestart ? savedInstanceState : null);
        // Try to get the rootViewId form the saved state in case the activity
        // was destroyed and we are now recreating it.
        if (savedInstanceState) {
            const rootViewId = savedInstanceState.getInt(ROOT_VIEW_ID_EXTRA, -1);
            if (rootViewId !== -1 && activityRootViewsMap.has(rootViewId)) {
                this._rootView = activityRootViewsMap.get(rootViewId).get();
            }
        }
        if (intent && intent.getAction()) {
            application.android.notify({
                eventName: application.AndroidApplication.activityNewIntentEvent,
                object: application.android,
                activity,
                intent,
            });
        }
        this.setActivityContent(activity, savedInstanceState, true);
        moduleLoaded = true;
    }
    onSaveInstanceState(activity, outState, superFunc) {
        superFunc.call(activity, outState);
        const rootView = this._rootView;
        if (rootView instanceof Frame) {
            outState.putInt(INTENT_EXTRA, rootView.android.frameId);
            rootView._saveFragmentsState();
        }
        if (rootView) {
            outState.putInt(ROOT_VIEW_ID_EXTRA, rootView._domId);
        }
    }
    onNewIntent(activity, intent, superSetIntentFunc, superFunc) {
        superFunc.call(activity, intent);
        superSetIntentFunc.call(activity, intent);
        application.android.notify({
            eventName: application.AndroidApplication.activityNewIntentEvent,
            object: application.android,
            activity,
            intent,
        });
    }
    onStart(activity, superFunc) {
        superFunc.call(activity);
        if (Trace.isEnabled()) {
            Trace.write('NativeScriptActivity.onStart();', Trace.categories.NativeLifecycle);
        }
        const rootView = this._rootView;
        if (rootView && !rootView.isLoaded) {
            rootView.callLoaded();
        }
    }
    onStop(activity, superFunc) {
        superFunc.call(activity);
        if (Trace.isEnabled()) {
            Trace.write('NativeScriptActivity.onStop();', Trace.categories.NativeLifecycle);
        }
        const rootView = this._rootView;
        if (rootView && rootView.isLoaded) {
            rootView.callUnloaded();
        }
    }
    onPostResume(activity, superFunc) {
        superFunc.call(activity);
        if (Trace.isEnabled()) {
            Trace.write('NativeScriptActivity.onPostResume();', Trace.categories.NativeLifecycle);
        }
        // NOTE: activity.onPostResume() is called when activity resume is complete and we can
        // safely raise the application resume event;
        // onActivityResumed(...) lifecycle callback registered in application is called too early
        // and raising the application resume event there causes issues like
        // https://github.com/NativeScript/NativeScript/issues/6708
        if (activity.isNativeScriptActivity) {
            const args = {
                eventName: application.resumeEvent,
                object: application.android,
                android: activity,
            };
            application.notify(args);
            application.android.paused = false;
        }
    }
    onDestroy(activity, superFunc) {
        try {
            if (Trace.isEnabled()) {
                Trace.write('NativeScriptActivity.onDestroy();', Trace.categories.NativeLifecycle);
            }
            const rootView = this._rootView;
            if (rootView) {
                rootView._tearDownUI(true);
            }
            // this may happen when the user changes the system theme
            // In such case, isFinishing() is false (and isChangingConfigurations is true), and the app will start again (onCreate) with a savedInstanceState
            // as a result, launchEvent will never be called
            // possible alternative: always fire launchEvent and exitEvent, but pass extra flags to make it clear what kind of launch/destroy is happening
            if (activity.isFinishing()) {
                const exitArgs = {
                    eventName: application.exitEvent,
                    object: application.android,
                    android: activity,
                };
                application.notify(exitArgs);
            }
        }
        finally {
            superFunc.call(activity);
        }
    }
    onBackPressed(activity, superFunc) {
        if (Trace.isEnabled()) {
            Trace.write('NativeScriptActivity.onBackPressed;', Trace.categories.NativeLifecycle);
        }
        const args = {
            eventName: 'activityBackPressed',
            object: application.android,
            activity: activity,
            cancel: false,
        };
        application.android.notify(args);
        if (args.cancel) {
            return;
        }
        const view = this._rootView;
        let callSuper = false;
        const viewArgs = {
            eventName: 'activityBackPressed',
            object: view,
            activity: activity,
            cancel: false,
        };
        view.notify(viewArgs);
        // In the case of Frame, use this callback only if it was overridden, since the original will cause navigation issues
        if (!viewArgs.cancel && (view.onBackPressed === Frame.prototype.onBackPressed || !view.onBackPressed())) {
            callSuper = view instanceof Frame ? !FrameBase.goBack() : true;
        }
        if (callSuper) {
            superFunc.call(activity);
        }
    }
    onRequestPermissionsResult(activity, requestCode, permissions, grantResults, superFunc) {
        if (Trace.isEnabled()) {
            Trace.write('NativeScriptActivity.onRequestPermissionsResult;', Trace.categories.NativeLifecycle);
        }
        application.android.notify({
            eventName: 'activityRequestPermissions',
            object: application.android,
            activity: activity,
            requestCode: requestCode,
            permissions: permissions,
            grantResults: grantResults,
        });
    }
    onActivityResult(activity, requestCode, resultCode, data, superFunc) {
        superFunc.call(activity, requestCode, resultCode, data);
        if (Trace.isEnabled()) {
            Trace.write(`NativeScriptActivity.onActivityResult(${requestCode}, ${resultCode}, ${data})`, Trace.categories.NativeLifecycle);
        }
        application.android.notify({
            eventName: 'activityResult',
            object: application.android,
            activity: activity,
            requestCode: requestCode,
            resultCode: resultCode,
            intent: data,
        });
    }
    resetActivityContent(activity) {
        if (this._rootView) {
            const manager = this._rootView._getFragmentManager();
            manager.executePendingTransactions();
            this._rootView._onRootViewReset();
        }
        // Delete previously cached root view in order to recreate it.
        this._rootView = null;
        this.setActivityContent(activity, null, false);
        this._rootView.callLoaded();
    }
    // Paths that go trough this method:
    // 1. Application initial start - there is no rootView in callbacks.
    // 2. Application revived after Activity is destroyed. this._rootView should have been restored by id in onCreate.
    // 3. Livesync if rootView has no custom _onLivesync. this._rootView should have been cleared upfront. Launch event should not fired
    // 4. _resetRootView method. this._rootView should have been cleared upfront. Launch event should not fired
    setActivityContent(activity, savedInstanceState, fireLaunchEvent) {
        let rootView = this._rootView;
        if (Trace.isEnabled()) {
            Trace.write(`Frame.setActivityContent rootView: ${rootView} shouldCreateRootFrame: false fireLaunchEvent: ${fireLaunchEvent}`, Trace.categories.NativeLifecycle);
        }
        if (!rootView) {
            const mainEntry = application.getMainEntry();
            const intent = activity.getIntent();
            // useful for integrations that would like to set rootView asynchronously after app launch
            let shouldRootViewBeEmpty = false;
            if (fireLaunchEvent) {
                // entry point for Angular and Vue frameworks
                rootView = notifyLaunch(intent, savedInstanceState, null);
                shouldRootViewBeEmpty = rootView === null;
            }
            if (!rootView) {
                if (shouldRootViewBeEmpty) {
                    return;
                }
                // entry point for NS Core
                if (!mainEntry) {
                    // Also handles scenarios with Angular and Vue where the notifyLaunch didn't return a root view.
                    throw new Error('Main entry is missing. App cannot be started. Verify app bootstrap.');
                }
                rootView = Builder.createViewFromEntry(mainEntry);
            }
            this._rootView = rootView;
            activityRootViewsMap.set(rootView._domId, new WeakRef(rootView));
            const deviceType = Device.deviceType.toLowerCase();
            CSSUtils.pushToSystemCssClasses(`${CSSUtils.CLASS_PREFIX}${ANDROID_PLATFORM}`);
            CSSUtils.pushToSystemCssClasses(`${CSSUtils.CLASS_PREFIX}${deviceType}`);
            CSSUtils.pushToSystemCssClasses(`${CSSUtils.CLASS_PREFIX}${application.android.orientation}`);
            CSSUtils.pushToSystemCssClasses(`${CSSUtils.CLASS_PREFIX}${application.android.systemAppearance}`);
            this._rootView.cssClasses.add(CSSUtils.ROOT_VIEW_CSS_CLASS);
            const rootViewCssClasses = CSSUtils.getSystemCssClasses();
            rootViewCssClasses.forEach((c) => this._rootView.cssClasses.add(c));
        }
        // setup view as styleScopeHost
        rootView._setupAsRootView(activity);
        activity.setContentView(rootView.nativeViewProtected, new org.nativescript.widgets.CommonLayoutParams());
    }
}
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.appcompat.app.AppCompatActivity, android.os.Bundle, Object, Function]),
    __metadata("design:returntype", void 0)
], ActivityCallbacksImplementation.prototype, "onCreate", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.appcompat.app.AppCompatActivity, android.os.Bundle, Function]),
    __metadata("design:returntype", void 0)
], ActivityCallbacksImplementation.prototype, "onSaveInstanceState", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [androidx.appcompat.app.AppCompatActivity, android.content.Intent, Function, Function]),
    __metadata("design:returntype", void 0)
], ActivityCallbacksImplementation.prototype, "onNewIntent", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Function]),
    __metadata("design:returntype", void 0)
], ActivityCallbacksImplementation.prototype, "onStart", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Function]),
    __metadata("design:returntype", void 0)
], ActivityCallbacksImplementation.prototype, "onStop", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Function]),
    __metadata("design:returntype", void 0)
], ActivityCallbacksImplementation.prototype, "onPostResume", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Function]),
    __metadata("design:returntype", void 0)
], ActivityCallbacksImplementation.prototype, "onDestroy", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Function]),
    __metadata("design:returntype", void 0)
], ActivityCallbacksImplementation.prototype, "onBackPressed", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Array, Array, Function]),
    __metadata("design:returntype", void 0)
], ActivityCallbacksImplementation.prototype, "onRequestPermissionsResult", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, android.content.Intent, Function]),
    __metadata("design:returntype", void 0)
], ActivityCallbacksImplementation.prototype, "onActivityResult", null);
const notifyLaunch = profile('notifyLaunch', function notifyLaunch(intent, savedInstanceState) {
    const launchArgs = {
        eventName: application.launchEvent,
        object: application.android,
        android: intent,
        savedInstanceState,
    };
    application.notify(launchArgs);
    application.notify({
        eventName: 'loadAppCss',
        object: this,
        cssFile: application.getCssFileName(),
    });
    return launchArgs.root;
});
export function setActivityCallbacks(activity) {
    activity[CALLBACKS] = new ActivityCallbacksImplementation();
}
export function setFragmentCallbacks(fragment) {
    fragment[CALLBACKS] = new FragmentCallbacksImplementation();
}
//# sourceMappingURL=index.android.js.map