// Definitions.
import { NavigationType } from './frame-common';
// Types.
import { Transition } from '../transition';
import { FlipTransition } from '../transition/flip-transition';
import { _resolveAnimationCurve } from '../animation';
import lazy from '../../utils/lazy';
import { Trace } from '../../trace';
const defaultInterpolator = lazy(() => new android.view.animation.AccelerateDecelerateInterpolator());
const animFadeIn = 17432576; // android.R.anim.fade_in
const animFadeOut = 17432577; // android.R.anim.fade_out
export const waitingQueue = new Map();
export const completedEntries = new Map();
let TransitionListener;
let AnimationListener;
export function _setAndroidFragmentTransitions(animated, navigationTransition, currentEntry, newEntry, frameId, fragmentTransaction, isNestedDefaultTransition) {
    const currentFragment = currentEntry ? currentEntry.fragment : null;
    const newFragment = newEntry.fragment;
    const entries = waitingQueue.get(frameId);
    if (entries && entries.size > 0) {
        throw new Error('Calling navigation before previous navigation finish.');
    }
    newEntry.isAnimationRunning = false;
    allowTransitionOverlap(currentFragment);
    allowTransitionOverlap(newFragment);
    let name = '';
    let transition;
    if (navigationTransition) {
        transition = navigationTransition.instance;
        name = navigationTransition.name ? navigationTransition.name.toLowerCase() : '';
    }
    if (!animated) {
        name = 'none';
    }
    else if (transition) {
        name = 'custom';
    }
    else if (name.indexOf('slide') !== 0 && name !== 'fade' && name.indexOf('flip') !== 0 && name.indexOf('explode') !== 0) {
        // If we are given name that doesn't match any of ours - fallback to default.
        name = 'default';
    }
    let currentFragmentNeedsDifferentAnimation = false;
    if (currentEntry) {
        _updateTransitions(currentEntry);
        if (currentEntry.transitionName !== name || currentEntry.transition !== transition || isNestedDefaultTransition) {
            clearExitAndReenterTransitions(currentEntry, true);
            currentFragmentNeedsDifferentAnimation = true;
        }
    }
    if (name === 'none') {
        const noTransition = new NoTransition(0, null);
        // Setup empty/immediate animator when transitioning to nested frame for first time.
        // Also setup empty/immediate transition to be executed when navigating back to this page.
        // TODO: Consider removing empty/immediate animator when migrating to official androidx.fragment.app.Fragment:1.2.
        if (isNestedDefaultTransition) {
            fragmentTransaction.setCustomAnimations(animFadeIn, animFadeOut);
            setupAllAnimation(newEntry, noTransition);
            setupNewFragmentCustomTransition({ duration: 0, curve: null }, newEntry, noTransition);
        }
        else {
            setupNewFragmentCustomTransition({ duration: 0, curve: null }, newEntry, noTransition);
        }
        newEntry.isNestedDefaultTransition = isNestedDefaultTransition;
        if (currentFragmentNeedsDifferentAnimation) {
            setupCurrentFragmentCustomTransition({ duration: 0, curve: null }, currentEntry, noTransition);
        }
    }
    else if (name === 'custom') {
        setupNewFragmentCustomTransition({
            duration: transition.getDuration(),
            curve: transition.getCurve(),
        }, newEntry, transition);
        if (currentFragmentNeedsDifferentAnimation) {
            setupCurrentFragmentCustomTransition({
                duration: transition.getDuration(),
                curve: transition.getCurve(),
            }, currentEntry, transition);
        }
    }
    else if (name === 'default') {
        setupNewFragmentFadeTransition({ duration: 150, curve: null }, newEntry);
        if (currentFragmentNeedsDifferentAnimation) {
            setupCurrentFragmentFadeTransition({ duration: 150, curve: null }, currentEntry);
        }
    }
    else if (name.indexOf('slide') === 0) {
        setupNewFragmentSlideTransition(navigationTransition, newEntry, name);
        if (currentFragmentNeedsDifferentAnimation) {
            setupCurrentFragmentSlideTransition(navigationTransition, currentEntry, name);
        }
    }
    else if (name === 'fade') {
        setupNewFragmentFadeTransition(navigationTransition, newEntry);
        if (currentFragmentNeedsDifferentAnimation) {
            setupCurrentFragmentFadeTransition(navigationTransition, currentEntry);
        }
    }
    else if (name === 'explode') {
        setupNewFragmentExplodeTransition(navigationTransition, newEntry);
        if (currentFragmentNeedsDifferentAnimation) {
            setupCurrentFragmentExplodeTransition(navigationTransition, currentEntry);
        }
    }
    else if (name.indexOf('flip') === 0) {
        const direction = name.substr('flip'.length) || 'right'; //Extract the direction from the string
        const flipTransition = new FlipTransition(direction, navigationTransition.duration, navigationTransition.curve);
        setupNewFragmentCustomTransition(navigationTransition, newEntry, flipTransition);
        if (currentFragmentNeedsDifferentAnimation) {
            setupCurrentFragmentCustomTransition(navigationTransition, currentEntry, flipTransition);
        }
    }
    newEntry.transitionName = name;
    if (currentEntry) {
        currentEntry.transitionName = name;
        if (name === 'custom') {
            currentEntry.transition = transition;
        }
    }
    printTransitions(currentEntry);
    printTransitions(newEntry);
}
function setupAllAnimation(entry, transition) {
    setupExitAndPopEnterAnimation(entry, transition);
    const listener = getAnimationListener();
    // setupAllAnimation is called only for new fragments so we don't
    // need to clearAnimationListener for enter & popExit animators.
    const enterAnimator = transition.createAndroidAnimator(Transition.AndroidTransitionType.enter);
    enterAnimator.transitionType = Transition.AndroidTransitionType.enter;
    enterAnimator.entry = entry;
    enterAnimator.addListener(listener);
    entry.enterAnimator = enterAnimator;
    const popExitAnimator = transition.createAndroidAnimator(Transition.AndroidTransitionType.popExit);
    popExitAnimator.transitionType = Transition.AndroidTransitionType.popExit;
    popExitAnimator.entry = entry;
    popExitAnimator.addListener(listener);
    entry.popExitAnimator = popExitAnimator;
}
function setupExitAndPopEnterAnimation(entry, transition) {
    const listener = getAnimationListener();
    // remove previous listener if we are changing the animator.
    clearAnimationListener(entry.exitAnimator, listener);
    clearAnimationListener(entry.popEnterAnimator, listener);
    const exitAnimator = transition.createAndroidAnimator(Transition.AndroidTransitionType.exit);
    exitAnimator.transitionType = Transition.AndroidTransitionType.exit;
    exitAnimator.entry = entry;
    exitAnimator.addListener(listener);
    entry.exitAnimator = exitAnimator;
    const popEnterAnimator = transition.createAndroidAnimator(Transition.AndroidTransitionType.popEnter);
    popEnterAnimator.transitionType = Transition.AndroidTransitionType.popEnter;
    popEnterAnimator.entry = entry;
    popEnterAnimator.addListener(listener);
    entry.popEnterAnimator = popEnterAnimator;
}
function getAnimationListener() {
    if (!AnimationListener) {
        var AnimationListenerImpl = /** @class */ (function (_super) {
    __extends(AnimationListenerImpl, _super);
    function AnimationListenerImpl() {
        var _this = _super.call(this) || this;
        return global.__native(_this);
    }
    AnimationListenerImpl.prototype.onAnimationStart = function (animator) {
        var entry = animator.entry;
        addToWaitingQueue(entry);
        if (Trace.isEnabled()) {
            Trace.write("START ".concat(animator.transitionType, " for ").concat(entry.fragmentTag), Trace.categories.Transition);
        }
        entry.isAnimationRunning = true;
    };
    AnimationListenerImpl.prototype.onAnimationRepeat = function (animator) {
        if (Trace.isEnabled()) {
            Trace.write("REPEAT ".concat(animator.transitionType, " for ").concat(animator.entry.fragmentTag), Trace.categories.Transition);
        }
    };
    AnimationListenerImpl.prototype.onAnimationEnd = function (animator) {
        if (Trace.isEnabled()) {
            Trace.write("END ".concat(animator.transitionType, " for ").concat(animator.entry.fragmentTag), Trace.categories.Transition);
        }
        animator.entry.isAnimationRunning = false;
        transitionOrAnimationCompleted(animator.entry, animator.backEntry);
    };
    AnimationListenerImpl.prototype.onAnimationCancel = function (animator) {
        if (Trace.isEnabled()) {
            Trace.write("CANCEL ".concat(animator.transitionType, " for ").concat(animator.entry.fragmentTag), Trace.categories.Transition);
        }
        animator.entry.isAnimationRunning = false;
    };
    AnimationListenerImpl = __decorate([
        Interfaces([android.animation.Animator.AnimatorListener])
    ], AnimationListenerImpl);
    return AnimationListenerImpl;
}(java.lang.Object));
        AnimationListener = new AnimationListenerImpl();
    }
    return AnimationListener;
}
function clearAnimationListener(animator, listener) {
    if (!animator) {
        return;
    }
    animator.removeListener(listener);
    if (animator.entry && Trace.isEnabled()) {
        const entry = animator.entry;
        Trace.write(`Clear ${animator.transitionType} - ${entry.transition} for ${entry.fragmentTag}`, Trace.categories.Transition);
    }
    animator.entry = null;
}
export function _getAnimatedEntries(frameId) {
    return waitingQueue.get(frameId);
}
export function _updateTransitions(entry) {
    const fragment = entry.fragment;
    const enterTransitionListener = entry.enterTransitionListener;
    if (enterTransitionListener && fragment) {
        fragment.setEnterTransition(enterTransitionListener.transition);
    }
    const exitTransitionListener = entry.exitTransitionListener;
    if (exitTransitionListener && fragment) {
        fragment.setExitTransition(exitTransitionListener.transition);
    }
    const reenterTransitionListener = entry.reenterTransitionListener;
    if (reenterTransitionListener && fragment) {
        fragment.setReenterTransition(reenterTransitionListener.transition);
    }
    const returnTransitionListener = entry.returnTransitionListener;
    if (returnTransitionListener && fragment) {
        fragment.setReturnTransition(returnTransitionListener.transition);
    }
}
export function _reverseTransitions(previousEntry, currentEntry) {
    const previousFragment = previousEntry.fragment;
    const currentFragment = currentEntry.fragment;
    let transitionUsed = false;
    const returnTransitionListener = currentEntry.returnTransitionListener;
    if (returnTransitionListener) {
        transitionUsed = true;
        currentFragment.setExitTransition(returnTransitionListener.transition);
    }
    else {
        currentFragment.setExitTransition(null);
    }
    const reenterTransitionListener = previousEntry.reenterTransitionListener;
    if (reenterTransitionListener) {
        transitionUsed = true;
        previousFragment.setEnterTransition(reenterTransitionListener.transition);
    }
    else {
        previousFragment.setEnterTransition(null);
    }
    return transitionUsed;
}
// Transition listener can't be static because
// android is cloning transitions and we can't expand them :(
function getTransitionListener(entry, transition) {
    if (!TransitionListener) {
        var TransitionListenerImpl = /** @class */ (function (_super) {
    __extends(TransitionListenerImpl, _super);
    function TransitionListenerImpl(entry, transition) {
        var _this = _super.call(this) || this;
        _this.entry = entry;
        _this.transition = transition;
        return global.__native(_this);
    }
    TransitionListenerImpl.prototype.onTransitionStart = function (transition) {
        var entry = this.entry;
        entry.isAnimationRunning = true;
        addToWaitingQueue(entry);
        if (Trace.isEnabled()) {
            Trace.write("START ".concat(toShortString(transition), " transition for ").concat(entry.fragmentTag), Trace.categories.Transition);
        }
    };
    TransitionListenerImpl.prototype.onTransitionEnd = function (transition) {
        var entry = this.entry;
        if (Trace.isEnabled()) {
            Trace.write("END ".concat(toShortString(transition), " transition for ").concat(entry.fragmentTag), Trace.categories.Transition);
        }
        entry.isAnimationRunning = false;
        transitionOrAnimationCompleted(entry, this.backEntry);
    };
    TransitionListenerImpl.prototype.onTransitionResume = function (transition) {
        if (Trace.isEnabled()) {
            var fragment = this.entry.fragmentTag;
            Trace.write("RESUME ".concat(toShortString(transition), " transition for ").concat(fragment), Trace.categories.Transition);
        }
    };
    TransitionListenerImpl.prototype.onTransitionPause = function (transition) {
        if (Trace.isEnabled()) {
            Trace.write("PAUSE ".concat(toShortString(transition), " transition for ").concat(this.entry.fragmentTag), Trace.categories.Transition);
        }
    };
    TransitionListenerImpl.prototype.onTransitionCancel = function (transition) {
        var entry = this.entry;
        entry.isAnimationRunning = false;
        if (Trace.isEnabled()) {
            Trace.write("CANCEL ".concat(toShortString(transition), " transition for ").concat(this.entry.fragmentTag), Trace.categories.Transition);
        }
    };
    TransitionListenerImpl = __decorate([
        Interfaces([androidx.transition.Transition.TransitionListener])
    ], TransitionListenerImpl);
    return TransitionListenerImpl;
}(java.lang.Object));
        TransitionListener = TransitionListenerImpl;
    }
    return new TransitionListener(entry, transition);
}
function addToWaitingQueue(entry) {
    const frameId = entry.frameId;
    let entries = waitingQueue.get(frameId);
    if (!entries) {
        entries = new Set();
        waitingQueue.set(frameId, entries);
    }
    entries.add(entry);
}
function clearExitAndReenterTransitions(entry, removeListener) {
    const fragment = entry.fragment;
    const exitListener = entry.exitTransitionListener;
    if (exitListener) {
        const exitTransition = fragment.getExitTransition();
        if (exitTransition) {
            if (removeListener) {
                exitTransition.removeListener(exitListener);
            }
            fragment.setExitTransition(null);
            if (Trace.isEnabled()) {
                Trace.write(`Cleared Exit ${exitTransition.getClass().getSimpleName()} transition for ${fragment}`, Trace.categories.Transition);
            }
        }
        if (removeListener) {
            entry.exitTransitionListener = null;
        }
    }
    const reenterListener = entry.reenterTransitionListener;
    if (reenterListener) {
        const reenterTransition = fragment.getReenterTransition();
        if (reenterTransition) {
            if (removeListener) {
                reenterTransition.removeListener(reenterListener);
            }
            fragment.setReenterTransition(null);
            if (Trace.isEnabled()) {
                Trace.write(`Cleared Reenter ${reenterTransition.getClass().getSimpleName()} transition for ${fragment}`, Trace.categories.Transition);
            }
        }
        if (removeListener) {
            entry.reenterTransitionListener = null;
        }
    }
}
export function _clearFragment(entry) {
    clearEntry(entry, false);
}
export function _clearEntry(entry) {
    clearEntry(entry, true);
}
function clearEntry(entry, removeListener) {
    clearExitAndReenterTransitions(entry, removeListener);
    const fragment = entry.fragment;
    const enterListener = entry.enterTransitionListener;
    if (enterListener) {
        const enterTransition = fragment.getEnterTransition();
        if (enterTransition) {
            if (removeListener) {
                enterTransition.removeListener(enterListener);
            }
            fragment.setEnterTransition(null);
            if (Trace.isEnabled()) {
                Trace.write(`Cleared Enter ${enterTransition.getClass().getSimpleName()} transition for ${fragment}`, Trace.categories.Transition);
            }
        }
        if (removeListener) {
            entry.enterTransitionListener = null;
        }
    }
    const returnListener = entry.returnTransitionListener;
    if (returnListener) {
        const returnTransition = fragment.getReturnTransition();
        if (returnTransition) {
            if (removeListener) {
                returnTransition.removeListener(returnListener);
            }
            fragment.setReturnTransition(null);
            if (Trace.isEnabled()) {
                Trace.write(`Cleared Return ${returnTransition.getClass().getSimpleName()} transition for ${fragment}`, Trace.categories.Transition);
            }
        }
        if (removeListener) {
            entry.returnTransitionListener = null;
        }
    }
}
function allowTransitionOverlap(fragment) {
    if (fragment) {
        fragment.setAllowEnterTransitionOverlap(true);
        fragment.setAllowReturnTransitionOverlap(true);
    }
}
function setEnterTransition(navigationTransition, entry, transition) {
    setUpNativeTransition(navigationTransition, transition);
    const listener = addNativeTransitionListener(entry, transition);
    // attach listener to JS object so that it will be alive as long as entry.
    entry.enterTransitionListener = listener;
    const fragment = entry.fragment;
    fragment.setEnterTransition(transition);
}
function setExitTransition(navigationTransition, entry, transition) {
    setUpNativeTransition(navigationTransition, transition);
    const listener = addNativeTransitionListener(entry, transition);
    // attach listener to JS object so that it will be alive as long as entry.
    entry.exitTransitionListener = listener;
    const fragment = entry.fragment;
    fragment.setExitTransition(transition);
}
function setReenterTransition(navigationTransition, entry, transition) {
    setUpNativeTransition(navigationTransition, transition);
    const listener = addNativeTransitionListener(entry, transition);
    // attach listener to JS object so that it will be alive as long as entry.
    entry.reenterTransitionListener = listener;
    const fragment = entry.fragment;
    fragment.setReenterTransition(transition);
}
function setReturnTransition(navigationTransition, entry, transition) {
    setUpNativeTransition(navigationTransition, transition);
    const listener = addNativeTransitionListener(entry, transition);
    // attach listener to JS object so that it will be alive as long as entry.
    entry.returnTransitionListener = listener;
    const fragment = entry.fragment;
    fragment.setReturnTransition(transition);
}
function setupNewFragmentSlideTransition(navTransition, entry, name) {
    setupCurrentFragmentSlideTransition(navTransition, entry, name);
    const direction = name.substr('slide'.length) || 'left'; //Extract the direction from the string
    switch (direction) {
        case 'left':
            setEnterTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.RIGHT));
            setReturnTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.RIGHT));
            break;
        case 'right':
            setEnterTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.LEFT));
            setReturnTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.LEFT));
            break;
        case 'top':
            setEnterTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.BOTTOM));
            setReturnTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.BOTTOM));
            break;
        case 'bottom':
            setEnterTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.TOP));
            setReturnTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.TOP));
            break;
    }
}
function setupCurrentFragmentSlideTransition(navTransition, entry, name) {
    const direction = name.substr('slide'.length) || 'left'; //Extract the direction from the string
    switch (direction) {
        case 'left':
            setExitTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.LEFT));
            setReenterTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.LEFT));
            break;
        case 'right':
            setExitTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.RIGHT));
            setReenterTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.RIGHT));
            break;
        case 'top':
            setExitTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.TOP));
            setReenterTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.TOP));
            break;
        case 'bottom':
            setExitTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.BOTTOM));
            setReenterTransition(navTransition, entry, new androidx.transition.Slide(android.view.Gravity.BOTTOM));
            break;
    }
}
function setupCurrentFragmentCustomTransition(navTransition, entry, transition) {
    const exitAnimator = transition.createAndroidAnimator(Transition.AndroidTransitionType.exit);
    const exitTransition = new org.nativescript.widgets.CustomTransition(exitAnimator, transition.constructor.name + Transition.AndroidTransitionType.exit.toString());
    setExitTransition(navTransition, entry, exitTransition);
    const reenterAnimator = transition.createAndroidAnimator(Transition.AndroidTransitionType.popEnter);
    const reenterTransition = new org.nativescript.widgets.CustomTransition(reenterAnimator, transition.constructor.name + Transition.AndroidTransitionType.popEnter.toString());
    setReenterTransition(navTransition, entry, reenterTransition);
}
function setupNewFragmentCustomTransition(navTransition, entry, transition) {
    setupCurrentFragmentCustomTransition(navTransition, entry, transition);
    const enterAnimator = transition.createAndroidAnimator(Transition.AndroidTransitionType.enter);
    const enterTransition = new org.nativescript.widgets.CustomTransition(enterAnimator, transition.constructor.name + Transition.AndroidTransitionType.enter.toString());
    setEnterTransition(navTransition, entry, enterTransition);
    const returnAnimator = transition.createAndroidAnimator(Transition.AndroidTransitionType.popExit);
    const returnTransition = new org.nativescript.widgets.CustomTransition(returnAnimator, transition.constructor.name + Transition.AndroidTransitionType.popExit.toString());
    setReturnTransition(navTransition, entry, returnTransition);
}
function setupNewFragmentFadeTransition(navTransition, entry) {
    setupCurrentFragmentFadeTransition(navTransition, entry);
    const fadeInEnter = new androidx.transition.Fade(androidx.transition.Fade.IN);
    setEnterTransition(navTransition, entry, fadeInEnter);
    const fadeOutReturn = new androidx.transition.Fade(androidx.transition.Fade.OUT);
    setReturnTransition(navTransition, entry, fadeOutReturn);
}
function setupCurrentFragmentFadeTransition(navTransition, entry) {
    const fadeOutExit = new androidx.transition.Fade(androidx.transition.Fade.OUT);
    setExitTransition(navTransition, entry, fadeOutExit);
    // NOTE: There is a bug in Fade transition so we need to set all 4
    // otherwise back navigation will complete immediately (won't run the reverse transition).
    const fadeInReenter = new androidx.transition.Fade(androidx.transition.Fade.IN);
    setReenterTransition(navTransition, entry, fadeInReenter);
}
function setupCurrentFragmentExplodeTransition(navTransition, entry) {
    setExitTransition(navTransition, entry, new androidx.transition.Explode());
    setReenterTransition(navTransition, entry, new androidx.transition.Explode());
}
function setupNewFragmentExplodeTransition(navTransition, entry) {
    setupCurrentFragmentExplodeTransition(navTransition, entry);
    setEnterTransition(navTransition, entry, new androidx.transition.Explode());
    setReturnTransition(navTransition, entry, new androidx.transition.Explode());
}
function setUpNativeTransition(navigationTransition, nativeTransition) {
    if (navigationTransition.duration) {
        nativeTransition.setDuration(navigationTransition.duration);
    }
    const interpolator = navigationTransition.curve ? _resolveAnimationCurve(navigationTransition.curve) : defaultInterpolator();
    nativeTransition.setInterpolator(interpolator);
}
export function addNativeTransitionListener(entry, nativeTransition) {
    const listener = getTransitionListener(entry, nativeTransition);
    nativeTransition.addListener(listener);
    return listener;
}
function transitionOrAnimationCompleted(entry, backEntry) {
    const frameId = entry.frameId;
    const entries = waitingQueue.get(frameId);
    // https://github.com/NativeScript/NativeScript/issues/5759
    // https://github.com/NativeScript/NativeScript/issues/5780
    // transitionOrAnimationCompleted fires again (probably bug in android)
    // NOTE: we cannot reproduce this issue so this is a blind fix
    if (!entries) {
        return;
    }
    entries.delete(entry);
    if (entries.size === 0) {
        const frame = entry.resolvedPage.frame;
        // We have 0 or 1 entry per frameId in completedEntries
        // So there is no need to make it to Set like waitingQueue
        const previousCompletedAnimationEntry = completedEntries.get(frameId);
        completedEntries.delete(frameId);
        waitingQueue.delete(frameId);
        const navigationContext = frame._executingContext || {
            navigationType: NavigationType.back,
        };
        let current = frame.isCurrent(entry) ? previousCompletedAnimationEntry : entry;
        current = current || entry;
        // Will be null if Frame is shown modally...
        // transitionOrAnimationCompleted fires again (probably bug in android).
        if (current) {
            setTimeout(() => frame.setCurrent(backEntry || current, navigationContext.navigationType));
        }
    }
    else {
        completedEntries.set(frameId, entry);
    }
}
function toShortString(nativeTransition) {
    return `${nativeTransition.getClass().getSimpleName()}@${nativeTransition.hashCode().toString(16)}`;
}
function printTransitions(entry) {
    if (entry && Trace.isEnabled()) {
        let result = `${entry.fragmentTag} Transitions:`;
        if (entry.transitionName) {
            result += `transitionName=${entry.transitionName}, `;
        }
        const fragment = entry.fragment;
        result += `${fragment.getEnterTransition() ? ' enter=' + toShortString(fragment.getEnterTransition()) : ''}`;
        result += `${fragment.getExitTransition() ? ' exit=' + toShortString(fragment.getExitTransition()) : ''}`;
        result += `${fragment.getReenterTransition() ? ' popEnter=' + toShortString(fragment.getReenterTransition()) : ''}`;
        result += `${fragment.getReturnTransition() ? ' popExit=' + toShortString(fragment.getReturnTransition()) : ''}`;
        Trace.write(result, Trace.categories.Transition);
    }
}
function javaObjectArray(...params) {
    const nativeArray = Array.create(java.lang.Object, params.length);
    params.forEach((value, i) => (nativeArray[i] = value));
    return nativeArray;
}
function createDummyZeroDurationAnimator(duration) {
    const animatorSet = new android.animation.AnimatorSet();
    const objectAnimators = Array.create(android.animation.Animator, 1);
    const values = Array.create('float', 2);
    values[0] = 0.0;
    values[1] = 1.0;
    const animator = android.animation.ObjectAnimator.ofFloat(null, 'alpha', values);
    animator.setDuration(duration);
    objectAnimators[0] = animator;
    animatorSet.playTogether(objectAnimators);
    return animatorSet;
}
class NoTransition extends Transition {
    createAndroidAnimator(transitionType) {
        return createDummyZeroDurationAnimator(this.getDuration());
    }
}
//# sourceMappingURL=fragment.transitions.android.js.map