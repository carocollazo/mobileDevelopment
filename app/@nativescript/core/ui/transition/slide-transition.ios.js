import { Transition } from '.';
import { Screen } from '../../platform';
const leftEdge = CGAffineTransformMakeTranslation(-Screen.mainScreen.widthDIPs, 0);
const rightEdge = CGAffineTransformMakeTranslation(Screen.mainScreen.widthDIPs, 0);
const topEdge = CGAffineTransformMakeTranslation(0, -Screen.mainScreen.heightDIPs);
const bottomEdge = CGAffineTransformMakeTranslation(0, Screen.mainScreen.heightDIPs);
export class SlideTransition extends Transition {
    constructor(direction, duration, curve) {
        super(duration, curve);
        this._direction = direction;
    }
    animateIOSTransition(containerView, fromView, toView, operation, completion) {
        const originalToViewTransform = toView.transform;
        const originalFromViewTransform = fromView.transform;
        let fromViewEndTransform;
        let toViewBeginTransform;
        const push = operation === 1 /* Push */;
        switch (this._direction) {
            case 'left':
                toViewBeginTransform = push ? rightEdge : leftEdge;
                fromViewEndTransform = push ? leftEdge : rightEdge;
                break;
            case 'right':
                toViewBeginTransform = push ? leftEdge : rightEdge;
                fromViewEndTransform = push ? rightEdge : leftEdge;
                break;
            case 'top':
                toViewBeginTransform = push ? bottomEdge : topEdge;
                fromViewEndTransform = push ? topEdge : bottomEdge;
                break;
            case 'bottom':
                toViewBeginTransform = push ? topEdge : bottomEdge;
                fromViewEndTransform = push ? bottomEdge : topEdge;
                break;
        }
        toView.transform = toViewBeginTransform;
        fromView.transform = CGAffineTransformIdentity;
        switch (operation) {
            case 1 /* Push */:
                containerView.insertSubviewAboveSubview(toView, fromView);
                break;
            case 2 /* Pop */:
                containerView.insertSubviewBelowSubview(toView, fromView);
                break;
        }
        const duration = this.getDuration();
        const curve = this.getCurve();
        UIView.animateWithDurationAnimationsCompletion(duration, () => {
            UIView.setAnimationCurve(curve);
            toView.transform = CGAffineTransformIdentity;
            fromView.transform = fromViewEndTransform;
        }, (finished) => {
            toView.transform = originalToViewTransform;
            fromView.transform = originalFromViewTransform;
            completion(finished);
        });
    }
}
//# sourceMappingURL=slide-transition.ios.js.map