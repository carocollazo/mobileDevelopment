export const frameStack = [];
export function topmost() {
    if (frameStack.length > 0) {
        return frameStack[frameStack.length - 1];
    }
    return undefined;
}
export function _pushInFrameStack(frame) {
    if (frame._isInFrameStack && frameStack[frameStack.length - 1] === frame) {
        return;
    }
    if (frame._isInFrameStack) {
        const indexOfFrame = frameStack.indexOf(frame);
        frameStack.splice(indexOfFrame, 1);
    }
    frameStack.push(frame);
    frame._isInFrameStack = true;
}
export function _popFromFrameStack(frame) {
    if (!frame._isInFrameStack) {
        return;
    }
    const top = topmost();
    if (top !== frame) {
        throw new Error('Cannot pop a Frame which is not at the top of the navigation stack.');
    }
    frameStack.pop();
    frame._isInFrameStack = false;
}
export function _removeFromFrameStack(frame) {
    if (!frame._isInFrameStack) {
        return;
    }
    const index = frameStack.indexOf(frame);
    frameStack.splice(index, 1);
    frame._isInFrameStack = false;
}
//# sourceMappingURL=frame-stack.js.map