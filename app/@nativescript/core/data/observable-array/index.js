/* eslint-disable prefer-rest-params */
import { Observable } from '../observable';
import * as types from '../../utils/types';
export class ChangeType {
}
ChangeType.Add = 'add';
ChangeType.Delete = 'delete';
ChangeType.Update = 'update';
ChangeType.Splice = 'splice';
ChangeType.Change = 'change';
const CHANGE = 'change';
/**
 * Advanced array like class used when you want to be notified when a change occurs.
 */
export class ObservableArray extends Observable {
    /**
     * Create ObservableArray<T> from source Array<T>.
     */
    constructor(args) {
        super();
        if (arguments.length === 1 && Array.isArray(arguments[0])) {
            this._array = arguments[0].slice();
        }
        else {
            // eslint-disable-next-line prefer-spread
            this._array = Array.apply(null, arguments);
        }
        this._addArgs = {
            eventName: CHANGE,
            object: this,
            action: ChangeType.Add,
            index: null,
            removed: [],
            addedCount: 1,
        };
        this._deleteArgs = {
            eventName: CHANGE,
            object: this,
            action: ChangeType.Delete,
            index: null,
            removed: null,
            addedCount: 0,
        };
    }
    /**
     * Returns item at specified index.
     */
    getItem(index) {
        return this._array[index];
    }
    /**
     * Sets item at specified index.
     */
    setItem(index, value) {
        const oldValue = this._array[index];
        this._array[index] = value;
        this.notify({
            eventName: CHANGE,
            object: this,
            action: ChangeType.Update,
            index: index,
            removed: [oldValue],
            addedCount: 1,
        });
    }
    /**
     * Gets or sets the length of the array. This is a number one higher than the highest element defined in an array.
     */
    get length() {
        return this._array.length;
    }
    set length(value) {
        if (types.isNumber(value) && this._array && this._array.length !== value) {
            const added = [];
            for (let i = this._array.length; i < value; ++i) {
                added.push(undefined);
            }
            this.splice(value, this._array.length - value, ...added);
        }
    }
    /**
     * Returns a string representation of an array.
     */
    toString() {
        return this._array.toString();
    }
    toLocaleString() {
        return this._array.toLocaleString();
    }
    /**
     * Combines two or more arrays.
     * @param items Additional items to add to the end of array1.
     */
    concat(...args) {
        this._addArgs.index = this._array.length;
        const result = this._array.concat(...args);
        return result;
    }
    /**
     * Adds all the elements of an array separated by the specified separator string.
     * @param separator A string used to separate one element of an array from the next in the resulting String. If omitted, the array elements are separated with a comma.
     */
    join(separator) {
        return this._array.join(separator);
    }
    /**
     * Removes the last element from an array and returns it.
     */
    pop() {
        this._deleteArgs.index = this._array.length - 1;
        const result = this._array.pop();
        this._deleteArgs.removed = [result];
        this.notify(this._deleteArgs);
        this._notifyLengthChange();
        return result;
    }
    /**
     * Appends new elements to an array, and returns the new length of the array.
     * @param item New element of the Array.
     */
    push(...args) {
        this._addArgs.index = this._array.length;
        if (arguments.length === 1 && Array.isArray(arguments[0])) {
            const source = arguments[0];
            for (let i = 0, l = source.length; i < l; i++) {
                this._array.push(source[i]);
            }
        }
        else {
            this._array.push(...args);
        }
        this._addArgs.addedCount = this._array.length - this._addArgs.index;
        this.notify(this._addArgs);
        this._notifyLengthChange();
        return this._array.length;
    }
    _notifyLengthChange() {
        const lengthChangedData = this._createPropertyChangeData('length', this._array.length);
        this.notify(lengthChangedData);
    }
    /**
     * Reverses the elements in an Array.
     */
    reverse() {
        return this._array.reverse();
    }
    /**
     * Removes the first element from an array and returns it.
     */
    shift() {
        const result = this._array.shift();
        this._deleteArgs.index = 0;
        this._deleteArgs.removed = [result];
        this.notify(this._deleteArgs);
        this._notifyLengthChange();
        return result;
    }
    /**
     * Returns a section of an array.
     * @param start The beginning of the specified portion of the array.
     * @param end The end of the specified portion of the array.
     */
    slice(start, end) {
        return this._array.slice(start, end);
    }
    /**
     * Sorts an array.
     * @param compareFn The name of the function used to determine the order of the elements. If omitted, the elements are sorted in ascending, ASCII character order.
     */
    sort(compareFn) {
        return this._array.sort(compareFn);
    }
    /**
     * Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.
     * @param start The zero-based location in the array from which to start removing elements.
     * @param deleteCount The number of elements to remove.
     * @param items Elements to insert into the array in place of the deleted elements.
     */
    splice(start, deleteCount, ...items) {
        const length = this._array.length;
        const result = arguments.length === 1 ? this._array.splice(start) : this._array.splice(start, deleteCount, ...items);
        this.notify({
            eventName: CHANGE,
            object: this,
            action: ChangeType.Splice,
            // The logic here is a bit weird; so lets explain why it is written this way
            // First of all, if you ADD any items to the array, we want the index to point to
            //   the first value of the index, so this fixes it when you put a value to high in
            // If you remove items from the array, then the index needs to point to the INDEX
            //   where you removed the item.
            // If you add and remove items, the index will point to the remove location as that
            //   is the index you passed in.
            index: Math.max(Math.min(start, length - (result.length > 0 ? 1 : 0)), 0),
            removed: result,
            addedCount: this._array.length + result.length - length,
        });
        if (this._array.length !== length) {
            this._notifyLengthChange();
        }
        return result;
    }
    /**
     * Inserts new elements at the start of an array.
     * @param items  Elements to insert at the start of the Array.
     */
    unshift(...args) {
        const length = this._array.length;
        const result = this._array.unshift(...args);
        this._addArgs.index = 0;
        this._addArgs.addedCount = result - length;
        this.notify(this._addArgs);
        this._notifyLengthChange();
        return result;
    }
    /**
     * Returns the index of the first element in the array where predicate is true, and -1 otherwise.
     * @param predicate
     * @param thisArg If provided, it will be used as the this value for each invocation of predicate. If it is not provided, undefined is used instead.
     */
    findIndex(predicate, thisArg) {
        return this._array.findIndex(predicate, thisArg);
    }
    /**
     * Returns the index of the first occurrence of a value in an array.
     * @param searchElement The value to locate in the array.
     * @param fromIndex The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0.
     */
    indexOf(searchElement, fromIndex) {
        const index = fromIndex ? fromIndex : 0;
        for (let i = index, l = this._array.length; i < l; i++) {
            if (this._array[i] === searchElement) {
                return i;
            }
        }
        return -1;
    }
    /**
     * Returns the index of the last occurrence of a specified value in an array.
     * @param searchElement The value to locate in the array.
     * @param fromIndex The array index at which to begin the search. If fromIndex is omitted, the search starts at the last index in the array.
     */
    lastIndexOf(searchElement, fromIndex) {
        const index = fromIndex ? fromIndex : this._array.length - 1;
        for (let i = index; i >= 0; i--) {
            if (this._array[i] === searchElement) {
                return i;
            }
        }
        return -1;
    }
    /**
     * Determines whether all the members of an array satisfy the specified test.
     * @param callbackfn A function that accepts up to three arguments. The every method calls the callbackfn function for each element in array1 until the callbackfn returns false, or until the end of the array.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    every(callbackfn, thisArg) {
        return this._array.every(callbackfn, thisArg);
    }
    /**
     * Determines whether the specified callback function returns true for any element of an array.
     * @param callbackfn A function that accepts up to three arguments. The some method calls the callbackfn function for each element in array1 until the callbackfn returns true, or until the end of the array.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    some(callbackfn, thisArg) {
        return this._array.some(callbackfn, thisArg);
    }
    /**
     * Performs the specified action for each element in an array.
     * @param callbackfn  A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the array.
     * @param thisArg  An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    forEach(callbackfn, thisArg) {
        this._array.forEach(callbackfn, thisArg);
    }
    /**
     * Calls a defined callback function on each element of an array, and returns an array that contains the results.
     * @param callbackfn A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    map(callbackfn, thisArg) {
        return this._array.map(callbackfn, thisArg);
    }
    /**
     * Returns the elements of an array that meet the condition specified in a callback function.
     * @param callbackfn A function that accepts up to three arguments. The filter method calls the callbackfn function one time for each element in the array.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    filter(callbackfn, thisArg) {
        return this._array.filter(callbackfn, thisArg);
    }
    /**
     * Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
     * @param callbackfn A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.
     * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
     */
    reduce(callbackfn, initialValue) {
        return initialValue !== undefined ? this._array.reduce(callbackfn, initialValue) : this._array.reduce(callbackfn);
    }
    /**
     * Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
     * @param callbackfn A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array.
     * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
     */
    reduceRight(callbackfn, initialValue) {
        return initialValue !== undefined ? this._array.reduceRight(callbackfn, initialValue) : this._array.reduceRight(callbackfn);
    }
}
/**
 * String value used when hooking to change event.
 */
ObservableArray.changeEvent = CHANGE;
//# sourceMappingURL=index.js.map