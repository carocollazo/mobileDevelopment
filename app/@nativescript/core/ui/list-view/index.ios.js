import { ListViewBase, separatorColorProperty, itemTemplatesProperty, iosEstimatedRowHeightProperty } from './list-view-common';
import { View } from '../core/view';
import { Length } from '../styling/style-properties';
import { Observable } from '../../data/observable';
import { Color } from '../../color';
import { layout } from '../../utils';
import { StackLayout } from '../layouts/stack-layout';
import { ProxyViewContainer } from '../proxy-view-container';
import { profile } from '../../profiling';
import { Trace } from '../../trace';
export * from './list-view-common';
const ITEMLOADING = ListViewBase.itemLoadingEvent;
const LOADMOREITEMS = ListViewBase.loadMoreItemsEvent;
const ITEMTAP = ListViewBase.itemTapEvent;
const DEFAULT_HEIGHT = 44;
const infinity = layout.makeMeasureSpec(0, layout.UNSPECIFIED);
var ListViewCell = /** @class */ (function (_super) {
    __extends(ListViewCell, _super);
    function ListViewCell() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ListViewCell.initWithEmptyBackground = function () {
        var cell = ListViewCell.new();
        // Clear background by default - this will make cells transparent
        cell.backgroundColor = UIColor.clearColor;
        return cell;
    };
    ListViewCell.prototype.initWithStyleReuseIdentifier = function (style, reuseIdentifier) {
        var cell = _super.prototype.initWithStyleReuseIdentifier.call(this, style, reuseIdentifier);
        // Clear background by default - this will make cells transparent
        cell.backgroundColor = UIColor.clearColor;
        return cell;
    };
    ListViewCell.prototype.willMoveToSuperview = function (newSuperview) {
        var parent = (this.view ? this.view.parent : null);
        // When inside ListView and there is no newSuperview this cell is
        // removed from native visual tree so we remove it from our tree too.
        if (parent && !newSuperview) {
            parent._removeContainer(this);
        }
    };
    Object.defineProperty(ListViewCell.prototype, "view", {
        get: function () {
            return this.owner ? this.owner.get() : null;
        },
        enumerable: true,
        configurable: true
    });
    return ListViewCell;
}(UITableViewCell));
function notifyForItemAtIndex(listView, cell, view, eventName, indexPath) {
    const args = {
        eventName: eventName,
        object: listView,
        index: indexPath.row,
        view: view,
        ios: cell,
        android: undefined,
    };
    listView.notify(args);
    return args;
}
var DataSource = /** @class */ (function (_super) {
    __extends(DataSource, _super);
    function DataSource() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DataSource.initWithOwner = function (owner) {
        var dataSource = DataSource.new();
        dataSource._owner = owner;
        return dataSource;
    };
    DataSource.prototype.tableViewNumberOfRowsInSection = function (tableView, section) {
        var owner = this._owner.get();
        return owner && owner.items ? owner.items.length : 0;
    };
    DataSource.prototype.tableViewCellForRowAtIndexPath = function (tableView, indexPath) {
        // We call this method because ...ForIndexPath calls tableViewHeightForRowAtIndexPath immediately (before we can prepare and measure it).
        var owner = this._owner.get();
        var cell;
        if (owner) {
            var template = owner._getItemTemplate(indexPath.row);
            cell = (tableView.dequeueReusableCellWithIdentifier(template.key) || ListViewCell.initWithEmptyBackground());
            owner._prepareCell(cell, indexPath);
            var cellView = cell.view;
            if (cellView && cellView.isLayoutRequired) {
                // Arrange cell views. We do it here instead of _layoutCell because _layoutCell is called
                // from 'tableViewHeightForRowAtIndexPath' method too (in iOS 7.1) and we don't want to arrange the fake cell.
                var width = layout.getMeasureSpecSize(owner.widthMeasureSpec);
                var rowHeight = owner._effectiveRowHeight;
                var cellHeight = rowHeight > 0 ? rowHeight : owner.getHeight(indexPath.row);
                cellView.iosOverflowSafeAreaEnabled = false;
                View.layoutChild(owner, cellView, 0, 0, width, cellHeight);
            }
        }
        else {
            cell = ListViewCell.initWithEmptyBackground();
        }
        return cell;
    };
    DataSource.ObjCProtocols = [UITableViewDataSource];
    return DataSource;
}(NSObject));
var UITableViewDelegateImpl = /** @class */ (function (_super) {
    __extends(UITableViewDelegateImpl, _super);
    function UITableViewDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UITableViewDelegateImpl.initWithOwner = function (owner) {
        var delegate = UITableViewDelegateImpl.new();
        delegate._owner = owner;
        delegate._measureCellMap = new Map();
        return delegate;
    };
    UITableViewDelegateImpl.prototype.tableViewWillDisplayCellForRowAtIndexPath = function (tableView, cell, indexPath) {
        var owner = this._owner.get();
        if (owner && indexPath.row === owner.items.length - 1) {
            owner.notify({
                eventName: LOADMOREITEMS,
                object: owner,
            });
        }
    };
    UITableViewDelegateImpl.prototype.tableViewWillSelectRowAtIndexPath = function (tableView, indexPath) {
        var cell = tableView.cellForRowAtIndexPath(indexPath);
        var owner = this._owner.get();
        if (owner) {
            notifyForItemAtIndex(owner, cell, cell.view, ITEMTAP, indexPath);
        }
        return indexPath;
    };
    UITableViewDelegateImpl.prototype.tableViewDidSelectRowAtIndexPath = function (tableView, indexPath) {
        tableView.deselectRowAtIndexPathAnimated(indexPath, true);
        return indexPath;
    };
    UITableViewDelegateImpl.prototype.tableViewHeightForRowAtIndexPath = function (tableView, indexPath) {
        var owner = this._owner.get();
        if (!owner) {
            return tableView.estimatedRowHeight;
        }
        var height = owner.getHeight(indexPath.row);
        if (height === undefined) {
            // in iOS8+ after call to scrollToRowAtIndexPath:atScrollPosition:animated: this method is called before tableViewCellForRowAtIndexPath so we need fake cell to measure its content.
            var template = owner._getItemTemplate(indexPath.row);
            var cell = this._measureCellMap.get(template.key);
            if (!cell) {
                cell = tableView.dequeueReusableCellWithIdentifier(template.key) || ListViewCell.initWithEmptyBackground();
                this._measureCellMap.set(template.key, cell);
            }
            height = owner._prepareCell(cell, indexPath);
        }
        return layout.toDeviceIndependentPixels(height);
    };
    UITableViewDelegateImpl.ObjCProtocols = [UITableViewDelegate];
    return UITableViewDelegateImpl;
}(NSObject));
var UITableViewRowHeightDelegateImpl = /** @class */ (function (_super) {
    __extends(UITableViewRowHeightDelegateImpl, _super);
    function UITableViewRowHeightDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UITableViewRowHeightDelegateImpl.initWithOwner = function (owner) {
        var delegate = UITableViewRowHeightDelegateImpl.new();
        delegate._owner = owner;
        return delegate;
    };
    UITableViewRowHeightDelegateImpl.prototype.tableViewWillDisplayCellForRowAtIndexPath = function (tableView, cell, indexPath) {
        var owner = this._owner.get();
        if (owner && indexPath.row === owner.items.length - 1) {
            owner.notify({
                eventName: LOADMOREITEMS,
                object: owner,
            });
        }
    };
    UITableViewRowHeightDelegateImpl.prototype.tableViewWillSelectRowAtIndexPath = function (tableView, indexPath) {
        var cell = tableView.cellForRowAtIndexPath(indexPath);
        var owner = this._owner.get();
        if (owner) {
            notifyForItemAtIndex(owner, cell, cell.view, ITEMTAP, indexPath);
        }
        return indexPath;
    };
    UITableViewRowHeightDelegateImpl.prototype.tableViewDidSelectRowAtIndexPath = function (tableView, indexPath) {
        tableView.deselectRowAtIndexPathAnimated(indexPath, true);
        return indexPath;
    };
    UITableViewRowHeightDelegateImpl.prototype.tableViewHeightForRowAtIndexPath = function (tableView, indexPath) {
        var owner = this._owner.get();
        if (!owner) {
            return tableView.estimatedRowHeight;
        }
        return layout.toDeviceIndependentPixels(owner._effectiveRowHeight);
    };
    UITableViewRowHeightDelegateImpl.ObjCProtocols = [UITableViewDelegate];
    return UITableViewRowHeightDelegateImpl;
}(NSObject));
export class ListView extends ListViewBase {
    constructor() {
        super();
        this.widthMeasureSpec = 0;
        this._map = new Map();
        this._heights = new Array();
    }
    createNativeView() {
        return UITableView.new();
    }
    initNativeView() {
        super.initNativeView();
        const nativeView = this.nativeViewProtected;
        nativeView.registerClassForCellReuseIdentifier(ListViewCell.class(), this._defaultTemplate.key);
        nativeView.estimatedRowHeight = DEFAULT_HEIGHT;
        nativeView.rowHeight = UITableViewAutomaticDimension;
        nativeView.dataSource = this._dataSource = DataSource.initWithOwner(new WeakRef(this));
        this._delegate = UITableViewDelegateImpl.initWithOwner(new WeakRef(this));
        this._setNativeClipToBounds();
    }
    disposeNativeView() {
        this._delegate = null;
        this._dataSource = null;
        super.disposeNativeView();
    }
    _setNativeClipToBounds() {
        // Always set clipsToBounds for list-view
        this.ios.clipsToBounds = true;
    }
    onLoaded() {
        super.onLoaded();
        if (this._isDataDirty) {
            this.refresh();
        }
        this.ios.delegate = this._delegate;
    }
    onUnloaded() {
        this.ios.delegate = null;
        super.onUnloaded();
    }
    // @ts-ignore
    get ios() {
        return this.nativeViewProtected;
    }
    get _childrenCount() {
        return this._map.size;
    }
    eachChildView(callback) {
        this._map.forEach((view, key) => {
            callback(view);
        });
    }
    scrollToIndex(index) {
        this._scrollToIndex(index, false);
    }
    scrollToIndexAnimated(index) {
        this._scrollToIndex(index);
    }
    _scrollToIndex(index, animated = true) {
        if (!this.ios) {
            return;
        }
        const itemsLength = this.items ? this.items.length : 0;
        // mimic Android behavior that silently coerces index values within [0, itemsLength - 1] range
        if (itemsLength > 0) {
            if (index < 0) {
                index = 0;
            }
            else if (index >= itemsLength) {
                index = itemsLength - 1;
            }
            this.ios.scrollToRowAtIndexPathAtScrollPositionAnimated(NSIndexPath.indexPathForItemInSection(index, 0), 1 /* Top */, animated);
        }
        else if (Trace.isEnabled()) {
            Trace.write(`Cannot scroll listview to index ${index} when listview items not set`, Trace.categories.Binding);
        }
    }
    refresh() {
        // clear bindingContext when it is not observable because otherwise bindings to items won't reevaluate
        this._map.forEach((view, nativeView, map) => {
            if (!(view.bindingContext instanceof Observable)) {
                view.bindingContext = null;
            }
        });
        if (this.isLoaded) {
            this.ios.reloadData();
            this.requestLayout();
            this._isDataDirty = false;
        }
        else {
            this._isDataDirty = true;
        }
    }
    isItemAtIndexVisible(itemIndex) {
        const indexes = Array.from(this.ios.indexPathsForVisibleRows);
        return indexes.some((visIndex) => visIndex.row === itemIndex);
    }
    getHeight(index) {
        return this._heights[index];
    }
    setHeight(index, value) {
        this._heights[index] = value;
    }
    _onRowHeightPropertyChanged(oldValue, newValue) {
        const value = layout.toDeviceIndependentPixels(this._effectiveRowHeight);
        const nativeView = this.ios;
        if (value < 0) {
            nativeView.rowHeight = UITableViewAutomaticDimension;
            nativeView.estimatedRowHeight = DEFAULT_HEIGHT;
            this._delegate = UITableViewDelegateImpl.initWithOwner(new WeakRef(this));
        }
        else {
            nativeView.rowHeight = value;
            nativeView.estimatedRowHeight = value;
            this._delegate = UITableViewRowHeightDelegateImpl.initWithOwner(new WeakRef(this));
        }
        if (this.isLoaded) {
            nativeView.delegate = this._delegate;
        }
        super._onRowHeightPropertyChanged(oldValue, newValue);
    }
    requestLayout() {
        // When preparing cell don't call super - no need to invalidate our measure when cell desiredSize is changed.
        if (!this._preparingCell) {
            super.requestLayout();
        }
    }
    measure(widthMeasureSpec, heightMeasureSpec) {
        this.widthMeasureSpec = widthMeasureSpec;
        const changed = this._setCurrentMeasureSpecs(widthMeasureSpec, heightMeasureSpec);
        super.measure(widthMeasureSpec, heightMeasureSpec);
        if (changed) {
            this.ios.reloadData();
        }
    }
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
        this._map.forEach((childView, listViewCell) => {
            View.measureChild(this, childView, childView._currentWidthMeasureSpec, childView._currentHeightMeasureSpec);
        });
    }
    onLayout(left, top, right, bottom) {
        super.onLayout(left, top, right, bottom);
        this._map.forEach((childView, listViewCell) => {
            const rowHeight = this._effectiveRowHeight;
            const cellHeight = rowHeight > 0 ? rowHeight : this.getHeight(childView._listViewItemIndex);
            if (cellHeight) {
                const width = layout.getMeasureSpecSize(this.widthMeasureSpec);
                childView.iosOverflowSafeAreaEnabled = false;
                View.layoutChild(this, childView, 0, 0, width, cellHeight);
            }
        });
    }
    _layoutCell(cellView, indexPath) {
        if (cellView) {
            const rowHeight = this._effectiveRowHeight;
            const heightMeasureSpec = rowHeight >= 0 ? layout.makeMeasureSpec(rowHeight, layout.EXACTLY) : infinity;
            const measuredSize = View.measureChild(this, cellView, this.widthMeasureSpec, heightMeasureSpec);
            const height = measuredSize.measuredHeight;
            this.setHeight(indexPath.row, height);
            return height;
        }
        return this.ios.estimatedRowHeight;
    }
    _prepareCell(cell, indexPath) {
        let cellHeight;
        try {
            this._preparingCell = true;
            let view = cell.view;
            if (!view) {
                view = this._getItemTemplate(indexPath.row).createView();
            }
            const args = notifyForItemAtIndex(this, cell, view, ITEMLOADING, indexPath);
            view = args.view || this._getDefaultItemContent(indexPath.row);
            // Proxy containers should not get treated as layouts.
            // Wrap them in a real layout as well.
            if (view instanceof ProxyViewContainer) {
                const sp = new StackLayout();
                sp.addChild(view);
                view = sp;
            }
            // If cell is reused it have old content - remove it first.
            if (!cell.view) {
                cell.owner = new WeakRef(view);
            }
            else if (cell.view !== view) {
                this._removeContainer(cell);
                cell.view.nativeViewProtected.removeFromSuperview();
                cell.owner = new WeakRef(view);
            }
            this._prepareItem(view, indexPath.row);
            view._listViewItemIndex = indexPath.row;
            this._map.set(cell, view);
            // We expect that views returned from itemLoading are new (e.g. not reused).
            if (view && !view.parent) {
                this._addView(view);
                cell.contentView.addSubview(view.nativeViewProtected);
            }
            cellHeight = this._layoutCell(view, indexPath);
        }
        finally {
            this._preparingCell = false;
        }
        return cellHeight;
    }
    _removeContainer(cell) {
        const view = cell.view;
        // This is to clear the StackLayout that is used to wrap ProxyViewContainer instances.
        if (!(view.parent instanceof ListView)) {
            this._removeView(view.parent);
        }
        // No need to request layout when we are removing cells.
        const preparing = this._preparingCell;
        this._preparingCell = true;
        view.parent._removeView(view);
        view._listViewItemIndex = undefined;
        this._preparingCell = preparing;
        this._map.delete(cell);
    }
    [separatorColorProperty.getDefault]() {
        return this.ios.separatorColor;
    }
    [separatorColorProperty.setNative](value) {
        this.ios.separatorColor = value instanceof Color ? value.ios : value;
    }
    [itemTemplatesProperty.getDefault]() {
        return null;
    }
    [itemTemplatesProperty.setNative](value) {
        this._itemTemplatesInternal = new Array(this._defaultTemplate);
        if (value) {
            for (let i = 0, length = value.length; i < length; i++) {
                this.ios.registerClassForCellReuseIdentifier(ListViewCell.class(), value[i].key);
            }
            this._itemTemplatesInternal = this._itemTemplatesInternal.concat(value);
        }
        this.refresh();
    }
    [iosEstimatedRowHeightProperty.getDefault]() {
        return DEFAULT_HEIGHT;
    }
    [iosEstimatedRowHeightProperty.setNative](value) {
        const nativeView = this.ios;
        const estimatedHeight = Length.toDevicePixels(value, 0);
        nativeView.estimatedRowHeight = estimatedHeight < 0 ? DEFAULT_HEIGHT : estimatedHeight;
    }
}
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ListView.prototype, "onLoaded", null);
//# sourceMappingURL=index.ios.js.map