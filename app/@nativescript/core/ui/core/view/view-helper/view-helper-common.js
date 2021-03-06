// Requires
import { layout } from '../../../../utils';
import { Trace } from '../../../../trace';
export class ViewHelper {
    static measureChild(parent, child, widthMeasureSpec, heightMeasureSpec) {
        let measureWidth = 0;
        let measureHeight = 0;
        if (child && !child.isCollapsed) {
            const widthSpec = parent ? parent._currentWidthMeasureSpec : widthMeasureSpec;
            const heightSpec = parent ? parent._currentHeightMeasureSpec : heightMeasureSpec;
            const width = layout.getMeasureSpecSize(widthSpec);
            const widthMode = layout.getMeasureSpecMode(widthSpec);
            const height = layout.getMeasureSpecSize(heightSpec);
            const heightMode = layout.getMeasureSpecMode(heightSpec);
            child._updateEffectiveLayoutValues(width, widthMode, height, heightMode);
            const style = child.style;
            const horizontalMargins = child.effectiveMarginLeft + child.effectiveMarginRight;
            const verticalMargins = child.effectiveMarginTop + child.effectiveMarginBottom;
            const childWidthMeasureSpec = ViewHelper.getMeasureSpec(widthMeasureSpec, horizontalMargins, child.effectiveWidth, style.horizontalAlignment === 'stretch');
            const childHeightMeasureSpec = ViewHelper.getMeasureSpec(heightMeasureSpec, verticalMargins, child.effectiveHeight, style.verticalAlignment === 'stretch');
            if (Trace.isEnabled()) {
                Trace.write(`${child.parent} :measureChild: ${child} ${layout.measureSpecToString(childWidthMeasureSpec)}, ${layout.measureSpecToString(childHeightMeasureSpec)}}`, Trace.categories.Layout);
            }
            child.measure(childWidthMeasureSpec, childHeightMeasureSpec);
            measureWidth = Math.round(child.getMeasuredWidth() + horizontalMargins);
            measureHeight = Math.round(child.getMeasuredHeight() + verticalMargins);
        }
        return { measuredWidth: measureWidth, measuredHeight: measureHeight };
    }
    static layoutChild(parent, child, left, top, right, bottom, setFrame = true) {
        if (!child || child.isCollapsed) {
            return;
        }
        const childStyle = child.style;
        let childTop;
        let childLeft;
        let childWidth = child.getMeasuredWidth();
        let childHeight = child.getMeasuredHeight();
        const effectiveMarginTop = child.effectiveMarginTop;
        const effectiveMarginBottom = child.effectiveMarginBottom;
        let vAlignment;
        if (child.effectiveHeight >= 0 && childStyle.verticalAlignment === 'stretch') {
            vAlignment = 'middle';
        }
        else {
            vAlignment = childStyle.verticalAlignment;
        }
        switch (vAlignment) {
            case 'top':
                childTop = top + effectiveMarginTop;
                break;
            case 'middle':
                childTop = top + (bottom - top - childHeight + (effectiveMarginTop - effectiveMarginBottom)) / 2;
                break;
            case 'bottom':
                childTop = bottom - childHeight - effectiveMarginBottom;
                break;
            case 'stretch':
            default:
                childTop = top + effectiveMarginTop;
                childHeight = bottom - top - (effectiveMarginTop + effectiveMarginBottom);
                break;
        }
        const effectiveMarginLeft = child.effectiveMarginLeft;
        const effectiveMarginRight = child.effectiveMarginRight;
        let hAlignment;
        if (child.effectiveWidth >= 0 && childStyle.horizontalAlignment === 'stretch') {
            hAlignment = 'center';
        }
        else {
            hAlignment = childStyle.horizontalAlignment;
        }
        switch (hAlignment) {
            case 'left':
                childLeft = left + effectiveMarginLeft;
                break;
            case 'center':
                childLeft = left + (right - left - childWidth + (effectiveMarginLeft - effectiveMarginRight)) / 2;
                break;
            case 'right':
                childLeft = right - childWidth - effectiveMarginRight;
                break;
            case 'stretch':
            default:
                childLeft = left + effectiveMarginLeft;
                childWidth = right - left - (effectiveMarginLeft + effectiveMarginRight);
                break;
        }
        const childRight = Math.round(childLeft + childWidth);
        const childBottom = Math.round(childTop + childHeight);
        childLeft = Math.round(childLeft);
        childTop = Math.round(childTop);
        if (Trace.isEnabled()) {
            Trace.write(child.parent + ' :layoutChild: ' + child + ' ' + childLeft + ', ' + childTop + ', ' + childRight + ', ' + childBottom, Trace.categories.Layout);
        }
        child.layout(childLeft, childTop, childRight, childBottom, setFrame);
    }
    static resolveSizeAndState(size, specSize, specMode, childMeasuredState) {
        let result = size;
        switch (specMode) {
            case layout.UNSPECIFIED:
                result = Math.ceil(size);
                break;
            case layout.AT_MOST:
                if (specSize < size) {
                    result = Math.ceil(specSize) | layout.MEASURED_STATE_TOO_SMALL;
                }
                break;
            case layout.EXACTLY:
                result = Math.ceil(specSize);
                break;
        }
        return result | (childMeasuredState & layout.MEASURED_STATE_MASK);
    }
    static combineMeasuredStates(curState, newState) {
        return curState | newState;
    }
    static getMeasureSpec(parentSpec, margins, childLength, stretched) {
        const parentLength = layout.getMeasureSpecSize(parentSpec);
        const parentSpecMode = layout.getMeasureSpecMode(parentSpec);
        let resultSize;
        let resultMode;
        // We want a specific size... let be it.
        if (childLength >= 0) {
            // If mode !== UNSPECIFIED we take the smaller of parentLength and childLength
            // Otherwise we will need to clip the view but this is not possible in all Android API levels.
            // TODO: remove Math.min(parentLength, childLength)
            resultSize = parentSpecMode === layout.UNSPECIFIED ? childLength : Math.min(parentLength, childLength);
            resultMode = layout.EXACTLY;
        }
        else {
            switch (parentSpecMode) {
                // Parent has imposed an exact size on us
                case layout.EXACTLY:
                    resultSize = Math.max(0, parentLength - margins);
                    // if stretched - nativeView wants to be our size. So be it.
                    // else - nativeView wants to determine its own size. It can't be bigger than us.
                    resultMode = stretched ? layout.EXACTLY : layout.AT_MOST;
                    break;
                // Parent has imposed a maximum size on us
                case layout.AT_MOST:
                    resultSize = Math.max(0, parentLength - margins);
                    resultMode = layout.AT_MOST;
                    break;
                // Equivalent to measure with Infinity.
                case layout.UNSPECIFIED:
                    resultSize = 0;
                    resultMode = layout.UNSPECIFIED;
                    break;
            }
        }
        return layout.makeMeasureSpec(resultSize, resultMode);
    }
}
//# sourceMappingURL=view-helper-common.js.map