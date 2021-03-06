// Requires
import { ViewCommon, isEnabledProperty, originXProperty, originYProperty, isUserInteractionEnabledProperty, testIDProperty } from './view-common';
import { hiddenProperty } from '../view-base';
import { Trace } from '../../../trace';
import { layout, iOSNativeHelper } from '../../../utils';
import { IOSHelper } from './view-helper';
import { ios as iosBackground } from '../../styling/background';
import { perspectiveProperty, visibilityProperty, opacityProperty, rotateProperty, rotateXProperty, rotateYProperty, scaleXProperty, scaleYProperty, translateXProperty, translateYProperty, zIndexProperty, backgroundInternalProperty, clipPathProperty } from '../../styling/style-properties';
import { profile } from '../../../profiling';
import { accessibilityEnabledProperty, accessibilityHiddenProperty, accessibilityHintProperty, accessibilityIdentifierProperty, accessibilityLabelProperty, accessibilityLanguageProperty, accessibilityLiveRegionProperty, accessibilityMediaSessionProperty, accessibilityRoleProperty, accessibilityStateProperty, accessibilityValueProperty, accessibilityIgnoresInvertColorsProperty } from '../../../accessibility/accessibility-properties';
import { setupAccessibleView, IOSPostAccessibilityNotificationType, isAccessibilityServiceEnabled, updateAccessibilityProperties } from '../../../accessibility';
import { CoreTypes } from '../../../core-types';
export * from './view-common';
// helpers (these are okay re-exported here)
export * from './view-helper';
// This one can eventually be cleaned up but causes issues with a lot of ui-suite plugins in particular if not exported here
export * from '../properties';
const PFLAG_FORCE_LAYOUT = 1;
const PFLAG_MEASURED_DIMENSION_SET = 1 << 1;
const PFLAG_LAYOUT_REQUIRED = 1 << 2;
const majorVersion = iOSNativeHelper.MajorVersion;
export class View extends ViewCommon {
    constructor() {
        super();
        this._isLaidOut = false;
        this._hasTransfrom = false;
        this._privateFlags = PFLAG_LAYOUT_REQUIRED | PFLAG_FORCE_LAYOUT;
        this._suspendCATransaction = false;
        this.once(View.loadedEvent, () => setupAccessibleView(this));
    }
    get isLayoutRequired() {
        return (this._privateFlags & PFLAG_LAYOUT_REQUIRED) === PFLAG_LAYOUT_REQUIRED;
    }
    get isLayoutRequested() {
        return (this._privateFlags & PFLAG_FORCE_LAYOUT) === PFLAG_FORCE_LAYOUT;
    }
    requestLayout() {
        super.requestLayout();
        this._privateFlags |= PFLAG_FORCE_LAYOUT;
        const nativeView = this.nativeViewProtected;
        if (nativeView && nativeView.setNeedsLayout) {
            nativeView.setNeedsLayout();
        }
        if (this.viewController && this.viewController.view !== nativeView) {
            this.viewController.view.setNeedsLayout();
        }
    }
    measure(widthMeasureSpec, heightMeasureSpec) {
        const measureSpecsChanged = this._setCurrentMeasureSpecs(widthMeasureSpec, heightMeasureSpec);
        const forceLayout = (this._privateFlags & PFLAG_FORCE_LAYOUT) === PFLAG_FORCE_LAYOUT;
        if (this.nativeViewProtected && (forceLayout || measureSpecsChanged)) {
            // first clears the measured dimension flag
            this._privateFlags &= ~PFLAG_MEASURED_DIMENSION_SET;
            // measure ourselves, this should set the measured dimension flag back
            this.onMeasure(widthMeasureSpec, heightMeasureSpec);
            this._privateFlags |= PFLAG_LAYOUT_REQUIRED;
            // flag not set, setMeasuredDimension() was not invoked, we trace
            // the exception to warn the developer
            if ((this._privateFlags & PFLAG_MEASURED_DIMENSION_SET) !== PFLAG_MEASURED_DIMENSION_SET) {
                if (Trace.isEnabled()) {
                    Trace.write('onMeasure() did not set the measured dimension by calling setMeasuredDimension() ' + this, Trace.categories.Layout, Trace.messageType.error);
                }
            }
        }
    }
    layout(left, top, right, bottom, setFrame = true) {
        const { boundsChanged, sizeChanged } = this._setCurrentLayoutBounds(left, top, right, bottom);
        if (setFrame) {
            this.layoutNativeView(left, top, right, bottom);
        }
        if (boundsChanged || (this._privateFlags & PFLAG_LAYOUT_REQUIRED) === PFLAG_LAYOUT_REQUIRED) {
            let position = { left, top, right, bottom };
            if (this.nativeViewProtected && majorVersion > 10) {
                // on iOS 11+ it is possible to have a changed layout frame due to safe area insets
                // get the frame and adjust the position, so that onLayout works correctly
                const frame = this.nativeViewProtected.frame;
                position = IOSHelper.getPositionFromFrame(frame);
            }
            this.onLayout(position.left, position.top, position.right, position.bottom);
            this._privateFlags &= ~PFLAG_LAYOUT_REQUIRED;
        }
        this.updateBackground(sizeChanged);
        this._privateFlags &= ~PFLAG_FORCE_LAYOUT;
    }
    updateBackground(sizeChanged) {
        if (sizeChanged) {
            this._onSizeChanged();
        }
        else if (this._nativeBackgroundState === 'invalid') {
            const background = this.style.backgroundInternal;
            this._redrawNativeBackground(background);
        }
    }
    setMeasuredDimension(measuredWidth, measuredHeight) {
        super.setMeasuredDimension(measuredWidth, measuredHeight);
        this._privateFlags |= PFLAG_MEASURED_DIMENSION_SET;
    }
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        const view = this.nativeViewProtected;
        const width = layout.getMeasureSpecSize(widthMeasureSpec);
        const widthMode = layout.getMeasureSpecMode(widthMeasureSpec);
        const height = layout.getMeasureSpecSize(heightMeasureSpec);
        const heightMode = layout.getMeasureSpecMode(heightMeasureSpec);
        let nativeWidth = 0;
        let nativeHeight = 0;
        if (view) {
            const nativeSize = layout.measureNativeView(view, width, widthMode, height, heightMode);
            nativeWidth = nativeSize.width;
            nativeHeight = nativeSize.height;
        }
        const measureWidth = Math.max(nativeWidth, this.effectiveMinWidth);
        const measureHeight = Math.max(nativeHeight, this.effectiveMinHeight);
        const widthAndState = View.resolveSizeAndState(measureWidth, width, widthMode, 0);
        const heightAndState = View.resolveSizeAndState(measureHeight, height, heightMode, 0);
        this.setMeasuredDimension(widthAndState, heightAndState);
    }
    onLayout(left, top, right, bottom) {
        //
    }
    _setNativeViewFrame(nativeView, frame) {
        const oldFrame = this._cachedFrame || nativeView.frame;
        if (!CGRectEqualToRect(oldFrame, frame)) {
            if (Trace.isEnabled()) {
                Trace.write(this + ' :_setNativeViewFrame: ' + JSON.stringify(IOSHelper.getPositionFromFrame(frame)), Trace.categories.Layout);
            }
            this._cachedFrame = frame;
            let adjustedFrame = null;
            let transform = null;
            if (this._hasTransfrom) {
                // Always set identity transform before setting frame;
                transform = nativeView.layer.transform;
                nativeView.layer.transform = CATransform3DIdentity;
                nativeView.frame = frame;
            }
            else {
                nativeView.frame = frame;
            }
            adjustedFrame = this.applySafeAreaInsets(frame);
            if (adjustedFrame) {
                nativeView.frame = adjustedFrame;
            }
            if (this._hasTransfrom) {
                // re-apply the transform after the frame is adjusted
                nativeView.layer.transform = transform;
            }
            const boundsOrigin = nativeView.bounds.origin;
            const boundsFrame = adjustedFrame || frame;
            nativeView.bounds = CGRectMake(boundsOrigin.x, boundsOrigin.y, boundsFrame.size.width, boundsFrame.size.height);
            nativeView.layoutIfNeeded();
            this._raiseLayoutChangedEvent();
            this._isLaidOut = true;
        }
        else if (!this._isLaidOut) {
            // Rects could be equal on the first layout and an event should be raised.
            this._raiseLayoutChangedEvent();
            // But make sure event is raised only once if rects are equal on the first layout as
            // this method is called twice with equal rects in landscape mode (vs only once in portrait)
            this._isLaidOut = true;
        }
    }
    get isLayoutValid() {
        if (this.nativeViewProtected) {
            return this._isLayoutValid;
        }
        return false;
    }
    layoutNativeView(left, top, right, bottom) {
        if (!this.nativeViewProtected) {
            return;
        }
        const nativeView = this.nativeViewProtected;
        const frame = IOSHelper.getFrameFromPosition({
            left,
            top,
            right,
            bottom,
        });
        this._setNativeViewFrame(nativeView, frame);
    }
    _layoutParent() {
        if (this.nativeViewProtected) {
            const frame = this.nativeViewProtected.frame;
            const origin = frame.origin;
            const size = frame.size;
            const left = layout.toDevicePixels(origin.x);
            const top = layout.toDevicePixels(origin.y);
            const width = layout.toDevicePixels(size.width);
            const height = layout.toDevicePixels(size.height);
            this._setLayoutFlags(left, top, width + left, height + top);
        }
        super._layoutParent();
    }
    _setLayoutFlags(left, top, right, bottom) {
        const width = right - left;
        const height = bottom - top;
        const widthSpec = layout.makeMeasureSpec(width, layout.EXACTLY);
        const heightSpec = layout.makeMeasureSpec(height, layout.EXACTLY);
        this._setCurrentMeasureSpecs(widthSpec, heightSpec);
        this._privateFlags &= ~PFLAG_FORCE_LAYOUT;
        this.setMeasuredDimension(width, height);
        const { sizeChanged } = this._setCurrentLayoutBounds(left, top, right, bottom);
        this.updateBackground(sizeChanged);
        this._privateFlags &= ~PFLAG_LAYOUT_REQUIRED;
    }
    focus() {
        if (this.ios) {
            return this.ios.becomeFirstResponder();
        }
        return false;
    }
    applySafeAreaInsets(frame) {
        if (majorVersion <= 10) {
            return null;
        }
        if (this.iosIgnoreSafeArea) {
            return frame;
        }
        if (!this.iosOverflowSafeArea || !this.iosOverflowSafeAreaEnabled) {
            return IOSHelper.shrinkToSafeArea(this, frame);
        }
        else if (this.nativeViewProtected && this.nativeViewProtected.window) {
            return IOSHelper.expandBeyondSafeArea(this, frame);
        }
        return null;
    }
    getSafeAreaInsets() {
        const safeAreaInsets = this.nativeViewProtected && this.nativeViewProtected.safeAreaInsets;
        const insets = { left: 0, top: 0, right: 0, bottom: 0 };
        if (this.iosIgnoreSafeArea) {
            return insets;
        }
        if (safeAreaInsets) {
            insets.left = layout.round(layout.toDevicePixels(safeAreaInsets.left));
            insets.top = layout.round(layout.toDevicePixels(safeAreaInsets.top));
            insets.right = layout.round(layout.toDevicePixels(safeAreaInsets.right));
            insets.bottom = layout.round(layout.toDevicePixels(safeAreaInsets.bottom));
        }
        return insets;
    }
    getLocationInWindow() {
        if (!this.nativeViewProtected || !this.nativeViewProtected.window) {
            return undefined;
        }
        const pointInWindow = this.nativeViewProtected.convertPointToView(this.nativeViewProtected.bounds.origin, null);
        return {
            x: pointInWindow.x,
            y: pointInWindow.y,
        };
    }
    getLocationOnScreen() {
        if (!this.nativeViewProtected || !this.nativeViewProtected.window) {
            return undefined;
        }
        const pointInWindow = this.nativeViewProtected.convertPointToView(this.nativeViewProtected.bounds.origin, null);
        const pointOnScreen = this.nativeViewProtected.window.convertPointToWindow(pointInWindow, null);
        return {
            x: pointOnScreen.x,
            y: pointOnScreen.y,
        };
    }
    getLocationRelativeTo(otherView) {
        if (!this.nativeViewProtected || !this.nativeViewProtected.window || !otherView.nativeViewProtected || !otherView.nativeViewProtected.window || this.nativeViewProtected.window !== otherView.nativeViewProtected.window) {
            return undefined;
        }
        const myPointInWindow = this.nativeViewProtected.convertPointToView(this.nativeViewProtected.bounds.origin, null);
        const otherPointInWindow = otherView.nativeViewProtected.convertPointToView(otherView.nativeViewProtected.bounds.origin, null);
        return {
            x: myPointInWindow.x - otherPointInWindow.x,
            y: myPointInWindow.y - otherPointInWindow.y,
        };
    }
    _onSizeChanged() {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }
        const background = this.style.backgroundInternal;
        const backgroundDependsOnSize = (background.image && background.image !== 'none') || !background.hasUniformBorder() || background.hasBorderRadius();
        if (this._nativeBackgroundState === 'invalid' || (this._nativeBackgroundState === 'drawn' && backgroundDependsOnSize)) {
            this._redrawNativeBackground(background);
        }
        const clipPath = this.style.clipPath;
        if (clipPath !== '' && this[clipPathProperty.setNative]) {
            this[clipPathProperty.setNative](clipPath);
        }
    }
    updateNativeTransform() {
        const scaleX = this.scaleX || 1e-6;
        const scaleY = this.scaleY || 1e-6;
        const perspective = this.perspective || 300;
        let transform = new CATransform3D(CATransform3DIdentity);
        // Only set perspective if there is 3D rotation
        if (this.rotateX || this.rotateY) {
            transform.m34 = -1 / perspective;
        }
        transform = CATransform3DTranslate(transform, this.translateX, this.translateY, 0);
        transform = iOSNativeHelper.applyRotateTransform(transform, this.rotateX, this.rotateY, this.rotate);
        transform = CATransform3DScale(transform, scaleX, scaleY, 1);
        if (!CATransform3DEqualToTransform(this.nativeViewProtected.layer.transform, transform)) {
            const updateSuspended = this._isPresentationLayerUpdateSuspeneded();
            if (!updateSuspended) {
                CATransaction.begin();
            }
            this.nativeViewProtected.layer.transform = transform;
            this._hasTransfrom = this.nativeViewProtected && !CATransform3DEqualToTransform(this.nativeViewProtected.transform3D, CATransform3DIdentity);
            if (!updateSuspended) {
                CATransaction.commit();
            }
        }
    }
    updateOriginPoint(originX, originY) {
        const newPoint = CGPointMake(originX, originY);
        this.nativeViewProtected.layer.anchorPoint = newPoint;
        if (this._cachedFrame) {
            this._setNativeViewFrame(this.nativeViewProtected, this._cachedFrame);
        }
    }
    // By default we update the view's presentation layer when setting backgroundColor and opacity properties.
    // This is done by calling CATransaction begin and commit methods.
    // This action should be disabled when updating those properties during an animation.
    _suspendPresentationLayerUpdates() {
        this._suspendCATransaction = true;
    }
    _resumePresentationLayerUpdates() {
        this._suspendCATransaction = false;
    }
    _isPresentationLayerUpdateSuspeneded() {
        return this._suspendCATransaction || this._suspendNativeUpdatesCount > 0;
    }
    _showNativeModalView(parent, options) {
        const parentWithController = IOSHelper.getParentWithViewController(parent);
        if (!parentWithController) {
            Trace.write(`Could not find parent with viewController for ${parent} while showing modal view.`, Trace.categories.ViewHierarchy, Trace.messageType.error);
            return;
        }
        const parentController = parentWithController.viewController;
        if (parentController.presentedViewController) {
            Trace.write('Parent is already presenting view controller. Close the current modal page before showing another one!', Trace.categories.ViewHierarchy, Trace.messageType.error);
            return;
        }
        if (!parentController.view || !parentController.view.window) {
            Trace.write('Parent page is not part of the window hierarchy.', Trace.categories.ViewHierarchy, Trace.messageType.error);
            return;
        }
        this._setupAsRootView({});
        super._showNativeModalView(parentWithController, options);
        let controller = this.viewController;
        if (!controller) {
            const nativeView = this.ios || this.nativeViewProtected;
            controller = IOSHelper.UILayoutViewController.initWithOwner(new WeakRef(this));
            if (nativeView instanceof UIView) {
                controller.view.addSubview(nativeView);
            }
            this.viewController = controller;
        }
        if (options.fullscreen) {
            controller.modalPresentationStyle = 0 /* FullScreen */;
        }
        else {
            controller.modalPresentationStyle = 2 /* FormSheet */;
            //check whether both height and width is provided and are positive numbers
            // set it has prefered content size to the controller presenting the dialog
            if (options.ios && options.ios.width > 0 && options.ios.height > 0) {
                controller.preferredContentSize = CGSizeMake(options.ios.width, options.ios.height);
            }
            else {
                //use CSS & attribute width & height if option is not provided
                const handler = () => {
                    const w = (this.width || this.style.width);
                    const h = (this.height || this.style.height);
                    //TODO: only numeric value is supported, percentage value is not supported like Android
                    if (w > 0 && h > 0) {
                        controller.preferredContentSize = CGSizeMake(w, h);
                    }
                    this.off(View.loadedEvent, handler);
                };
                this.on(View.loadedEvent, handler);
            }
        }
        if (options.ios && options.ios.presentationStyle) {
            const presentationStyle = options.ios.presentationStyle;
            controller.modalPresentationStyle = presentationStyle;
            if (presentationStyle === 7 /* Popover */) {
                this._setupPopoverControllerDelegate(controller, parent);
            }
        }
        const cancelable = options.cancelable !== undefined ? !!options.cancelable : true;
        if (majorVersion >= 13) {
            if (cancelable) {
                // Listen for dismiss modal callback.
                this._setupAdaptiveControllerDelegate(controller);
            }
            else {
                // Prevent users from dismissing the modal.
                controller.modalInPresentation = true;
            }
        }
        this.horizontalAlignment = 'stretch';
        this.verticalAlignment = 'stretch';
        this._raiseShowingModallyEvent();
        const animated = options.animated === undefined ? true : !!options.animated;
        if (!this._modalAnimatedOptions) {
            // track the user's animated options to use upon close as well
            this._modalAnimatedOptions = [];
        }
        this._modalAnimatedOptions.push(animated);
        // TODO: a11y
        // controller.accessibilityViewIsModal = true;
        // controller.accessibilityPerformEscape = () => {
        //   console.log('accessibilityPerformEscape!!')
        //   return true;
        // }
        parentController.presentViewControllerAnimatedCompletion(controller, animated, null);
        const transitionCoordinator = parentController.transitionCoordinator;
        if (transitionCoordinator) {
            transitionCoordinator.animateAlongsideTransitionCompletion(null, () => this._raiseShownModallyEvent());
        }
        else {
            // Apparently iOS 9+ stops all transitions and animations upon application suspend and transitionCoordinator becomes null here in this case.
            // Since we are not waiting for any transition to complete, i.e. transitionCoordinator is null, we can directly raise our shownModally event.
            // Take a look at https://github.com/NativeScript/NativeScript/issues/2173 for more info and a sample project.
            this._raiseShownModallyEvent();
        }
    }
    _hideNativeModalView(parent, whenClosedCallback) {
        if (!parent || !parent.viewController) {
            Trace.error('Trying to hide modal view but no parent with viewController specified.');
            return;
        }
        // modal view has already been closed by UI, probably as a popover
        if (!parent.viewController.presentedViewController) {
            whenClosedCallback();
            return;
        }
        const parentController = parent.viewController;
        const animated = this._modalAnimatedOptions ? !!this._modalAnimatedOptions.pop() : true;
        parentController.dismissViewControllerAnimatedCompletion(animated, whenClosedCallback);
    }
    [isEnabledProperty.getDefault]() {
        const nativeView = this.nativeViewProtected;
        return nativeView instanceof UIControl ? nativeView.enabled : true;
    }
    [isEnabledProperty.setNative](value) {
        const nativeView = this.nativeViewProtected;
        if (nativeView instanceof UIControl) {
            nativeView.enabled = value;
        }
    }
    [originXProperty.getDefault]() {
        return this.nativeViewProtected.layer.anchorPoint.x;
    }
    [originXProperty.setNative](value) {
        this.updateOriginPoint(value, this.originY);
    }
    [originYProperty.getDefault]() {
        return this.nativeViewProtected.layer.anchorPoint.y;
    }
    [originYProperty.setNative](value) {
        this.updateOriginPoint(this.originX, value);
    }
    [testIDProperty.setNative](value) {
        this.setTestID(this.nativeViewProtected, value);
    }
    setTestID(view, value) {
        if (typeof __USE_TEST_ID__ !== 'undefined' && __USE_TEST_ID__) {
            view.accessibilityIdentifier = value;
        }
    }
    [accessibilityEnabledProperty.setNative](value) {
        this.nativeViewProtected.isAccessibilityElement = !!value;
        updateAccessibilityProperties(this);
    }
    [accessibilityIdentifierProperty.getDefault]() {
        return this.nativeViewProtected.accessibilityLabel;
    }
    [accessibilityIdentifierProperty.setNative](value) {
        if (typeof __USE_TEST_ID__ !== 'undefined' && __USE_TEST_ID__ && this.testID) {
            // ignore when using testID
        }
        else {
            this.nativeViewProtected.accessibilityIdentifier = value;
        }
    }
    [accessibilityRoleProperty.setNative](value) {
        this.accessibilityRole = value;
        updateAccessibilityProperties(this);
    }
    [accessibilityValueProperty.setNative](value) {
        value = value == null ? null : `${value}`;
        this.nativeViewProtected.accessibilityValue = value;
    }
    [accessibilityLabelProperty.setNative](value) {
        value = value == null ? null : `${value}`;
        // not sure if needed for Label:
        // if ((<any>this).nativeTextViewProtected) {
        //   (<any>this).nativeTextViewProtected.accessibilityLabel = value;
        // } else {
        this.nativeViewProtected.accessibilityLabel = value;
        // }
    }
    [accessibilityHintProperty.setNative](value) {
        value = value == null ? null : `${value}`;
        this.nativeViewProtected.accessibilityHint = value;
    }
    [accessibilityIgnoresInvertColorsProperty.setNative](value) {
        console.log('accessibilityIgnoresInvertColorsProperty:', !!value);
        this.nativeViewProtected.accessibilityIgnoresInvertColors = !!value;
    }
    [accessibilityLanguageProperty.setNative](value) {
        value = value == null ? null : `${value}`;
        this.nativeViewProtected.accessibilityLanguage = value;
    }
    [accessibilityHiddenProperty.setNative](value) {
        this.nativeViewProtected.accessibilityElementsHidden = !!value;
        updateAccessibilityProperties(this);
    }
    [accessibilityLiveRegionProperty.setNative]() {
        updateAccessibilityProperties(this);
    }
    [accessibilityStateProperty.setNative](value) {
        this.accessibilityState = value;
        updateAccessibilityProperties(this);
    }
    [accessibilityMediaSessionProperty.setNative]() {
        updateAccessibilityProperties(this);
    }
    [isUserInteractionEnabledProperty.getDefault]() {
        return this.nativeViewProtected.userInteractionEnabled;
    }
    [isUserInteractionEnabledProperty.setNative](value) {
        this.nativeViewProtected.userInteractionEnabled = value;
    }
    [hiddenProperty.getDefault]() {
        return this.nativeViewProtected.hidden;
    }
    [hiddenProperty.setNative](value) {
        this.nativeViewProtected.hidden = value;
    }
    [visibilityProperty.getDefault]() {
        return this.nativeViewProtected.hidden ? CoreTypes.Visibility.collapse : CoreTypes.Visibility.visible;
    }
    [visibilityProperty.setNative](value) {
        switch (value) {
            case CoreTypes.Visibility.visible:
                this.nativeViewProtected.hidden = false;
                break;
            case CoreTypes.Visibility.hidden:
            case CoreTypes.Visibility.collapse:
                this.nativeViewProtected.hidden = true;
                break;
            default:
                throw new Error(`Invalid visibility value: ${value}. Valid values are: "${CoreTypes.Visibility.visible}", "${CoreTypes.Visibility.hidden}", "${CoreTypes.Visibility.collapse}".`);
        }
    }
    [opacityProperty.getDefault]() {
        return this.nativeViewProtected.alpha;
    }
    [opacityProperty.setNative](value) {
        const nativeView = this.nativeViewProtected;
        const updateSuspended = this._isPresentationLayerUpdateSuspeneded();
        if (!updateSuspended) {
            CATransaction.begin();
        }
        nativeView.alpha = value;
        if (!updateSuspended) {
            CATransaction.commit();
        }
    }
    [rotateProperty.getDefault]() {
        return 0;
    }
    [rotateProperty.setNative](value) {
        this.updateNativeTransform();
    }
    [rotateXProperty.getDefault]() {
        return 0;
    }
    [rotateXProperty.setNative](value) {
        this.updateNativeTransform();
    }
    [rotateYProperty.getDefault]() {
        return 0;
    }
    [rotateYProperty.setNative](value) {
        this.updateNativeTransform();
    }
    [perspectiveProperty.getDefault]() {
        return 300;
    }
    [perspectiveProperty.setNative](value) {
        this.updateNativeTransform();
    }
    [scaleXProperty.getDefault]() {
        return 1;
    }
    [scaleXProperty.setNative](value) {
        this.updateNativeTransform();
    }
    [scaleYProperty.getDefault]() {
        return 1;
    }
    [scaleYProperty.setNative](value) {
        this.updateNativeTransform();
    }
    [translateXProperty.getDefault]() {
        return 0;
    }
    [translateXProperty.setNative](value) {
        this.updateNativeTransform();
    }
    [translateYProperty.getDefault]() {
        return 0;
    }
    [translateYProperty.setNative](value) {
        this.updateNativeTransform();
    }
    [zIndexProperty.getDefault]() {
        return 0;
    }
    [zIndexProperty.setNative](value) {
        this.nativeViewProtected.layer.zPosition = value;
    }
    [backgroundInternalProperty.getDefault]() {
        return this.nativeViewProtected.backgroundColor;
    }
    [backgroundInternalProperty.setNative](value) {
        this._nativeBackgroundState = 'invalid';
        if (this.isLayoutValid) {
            this._redrawNativeBackground(value);
        }
    }
    sendAccessibilityEvent(options) {
        if (!isAccessibilityServiceEnabled()) {
            return;
        }
        if (!options.iosNotificationType) {
            return;
        }
        let notification;
        let args = this.nativeViewProtected;
        if (typeof msg === 'string' && msg) {
            args = msg;
        }
        switch (options.iosNotificationType) {
            case IOSPostAccessibilityNotificationType.Announcement: {
                notification = UIAccessibilityAnnouncementNotification;
                break;
            }
            case IOSPostAccessibilityNotificationType.Layout: {
                notification = UIAccessibilityLayoutChangedNotification;
                break;
            }
            case IOSPostAccessibilityNotificationType.Screen: {
                notification = UIAccessibilityScreenChangedNotification;
                break;
            }
            default: {
                return;
            }
        }
        UIAccessibilityPostNotification(notification, args !== null && args !== void 0 ? args : null);
    }
    accessibilityAnnouncement(msg = this.accessibilityLabel) {
        this.sendAccessibilityEvent({
            iosNotificationType: IOSPostAccessibilityNotificationType.Announcement,
            message: msg,
        });
    }
    accessibilityScreenChanged() {
        this.sendAccessibilityEvent({
            iosNotificationType: IOSPostAccessibilityNotificationType.Screen,
        });
    }
    _getCurrentLayoutBounds() {
        const nativeView = this.nativeViewProtected;
        if (nativeView && !this.isCollapsed) {
            const frame = nativeView.frame;
            const origin = frame.origin;
            const size = frame.size;
            return {
                left: Math.round(layout.toDevicePixels(origin.x)),
                top: Math.round(layout.toDevicePixels(origin.y)),
                right: Math.round(layout.toDevicePixels(origin.x + size.width)),
                bottom: Math.round(layout.toDevicePixels(origin.y + size.height)),
            };
        }
        else {
            return { left: 0, top: 0, right: 0, bottom: 0 };
        }
    }
    _redrawNativeBackground(value) {
        const updateSuspended = this._isPresentationLayerUpdateSuspeneded();
        if (!updateSuspended) {
            CATransaction.begin();
        }
        if (value instanceof UIColor) {
            this.nativeViewProtected.backgroundColor = value;
        }
        else {
            iosBackground.createBackgroundUIColor(this, (color) => {
                this.nativeViewProtected.backgroundColor = color;
            });
            this._setNativeClipToBounds();
        }
        if (!updateSuspended) {
            CATransaction.commit();
        }
        this._nativeBackgroundState = 'drawn';
    }
    _setNativeClipToBounds() {
        const backgroundInternal = this.style.backgroundInternal;
        this.nativeViewProtected.clipsToBounds = (this.nativeViewProtected instanceof UIScrollView || backgroundInternal.hasBorderWidth() || backgroundInternal.hasBorderRadius()) && !backgroundInternal.hasBoxShadow();
    }
    _setupPopoverControllerDelegate(controller, parent) {
        const popoverPresentationController = controller.popoverPresentationController;
        this._popoverPresentationDelegate = IOSHelper.UIPopoverPresentationControllerDelegateImp.initWithOwnerAndCallback(new WeakRef(this), this._closeModalCallback);
        popoverPresentationController.delegate = this._popoverPresentationDelegate;
        const view = parent.nativeViewProtected;
        // Note: sourceView and sourceRect are needed to specify the anchor location for the popover.
        // Note: sourceView should be the button triggering the modal. If it the Page the popover might appear "behind" the page content
        popoverPresentationController.sourceView = view;
        popoverPresentationController.sourceRect = CGRectMake(0, 0, view.frame.size.width, view.frame.size.height);
    }
    _setupAdaptiveControllerDelegate(controller) {
        this._adaptivePresentationDelegate = IOSHelper.UIAdaptivePresentationControllerDelegateImp.initWithOwnerAndCallback(new WeakRef(this), this._closeModalCallback);
        controller.presentationController.delegate = this._adaptivePresentationDelegate;
    }
}
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, Number, Object]),
    __metadata("design:returntype", void 0)
], View.prototype, "layout", null);
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], View.prototype, "onMeasure", null);
View.prototype._nativeBackgroundState = 'unset';
export class ContainerView extends View {
    constructor() {
        super();
        this.iosOverflowSafeArea = true;
    }
}
export class CustomLayoutView extends ContainerView {
    createNativeView() {
        return UIView.alloc().initWithFrame(UIScreen.mainScreen.bounds);
    }
    get ios() {
        return this.nativeViewProtected;
    }
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        // Don't call super because it will set MeasureDimension. This method must be overriden and calculate its measuredDimensions.
    }
    _addViewToNativeVisualTree(child, atIndex) {
        super._addViewToNativeVisualTree(child, atIndex);
        const parentNativeView = this.nativeViewProtected;
        const childNativeView = child.nativeViewProtected;
        if (parentNativeView && childNativeView) {
            if (typeof atIndex !== 'number' || atIndex >= parentNativeView.subviews.count) {
                parentNativeView.addSubview(childNativeView);
            }
            else {
                parentNativeView.insertSubviewAtIndex(childNativeView, atIndex);
            }
            return true;
        }
        return false;
    }
    _removeViewFromNativeVisualTree(child) {
        super._removeViewFromNativeVisualTree(child);
        if (child.nativeViewProtected) {
            child.nativeViewProtected.removeFromSuperview();
        }
    }
}
//# sourceMappingURL=index.ios.js.map