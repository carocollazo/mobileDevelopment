/**
 * iOS specific dialogs functions implementation.
 */
import { Trace } from '../../trace';
import { getLabelColor, getButtonColors, getTextFieldColor, isDialogOptions, inputType, capitalizationType, DialogStrings, parseLoginOptions } from './dialogs-common';
import { isString, isDefined, isFunction } from '../../utils/types';
import { ios } from '../../application';
export * from './dialogs-common';
function addButtonsToAlertController(alertController, options, callback) {
    if (!options) {
        return;
    }
    if (isString(options.cancelButtonText)) {
        alertController.addAction(UIAlertAction.actionWithTitleStyleHandler(options.cancelButtonText, 0 /* Default */, () => {
            raiseCallback(callback, false);
        }));
    }
    if (isString(options.neutralButtonText)) {
        alertController.addAction(UIAlertAction.actionWithTitleStyleHandler(options.neutralButtonText, 0 /* Default */, () => {
            raiseCallback(callback, undefined);
        }));
    }
    if (isString(options.okButtonText)) {
        alertController.addAction(UIAlertAction.actionWithTitleStyleHandler(options.okButtonText, 0 /* Default */, () => {
            raiseCallback(callback, true);
        }));
    }
}
function raiseCallback(callback, result) {
    if (isFunction(callback)) {
        callback(result);
    }
}
function showUIAlertController(alertController) {
    let viewController = ios.rootController;
    while (viewController && viewController.presentedViewController) {
        viewController = viewController.presentedViewController;
    }
    if (!viewController) {
        Trace.write(`No root controller found to open dialog.`, Trace.categories.Error, Trace.messageType.warn);
        return;
    }
    if (alertController.popoverPresentationController) {
        alertController.popoverPresentationController.sourceView = viewController.view;
        alertController.popoverPresentationController.sourceRect = CGRectMake(viewController.view.bounds.size.width / 2.0, viewController.view.bounds.size.height / 2.0, 1.0, 1.0);
        alertController.popoverPresentationController.permittedArrowDirections = 0;
    }
    const color = getButtonColors().color;
    if (color) {
        alertController.view.tintColor = color.ios;
    }
    const lblColor = getLabelColor();
    if (lblColor) {
        if (alertController.title) {
            const title = NSAttributedString.alloc().initWithStringAttributes(alertController.title, { [NSForegroundColorAttributeName]: lblColor.ios });
            alertController.setValueForKey(title, 'attributedTitle');
        }
        if (alertController.message) {
            const message = NSAttributedString.alloc().initWithStringAttributes(alertController.message, { [NSForegroundColorAttributeName]: lblColor.ios });
            alertController.setValueForKey(message, 'attributedMessage');
        }
    }
    viewController.presentModalViewControllerAnimated(alertController, true);
}
export function alert(arg) {
    return new Promise((resolve, reject) => {
        try {
            const options = !isDialogOptions(arg) ? { title: DialogStrings.ALERT, okButtonText: DialogStrings.OK, message: arg + '' } : arg;
            const alertController = UIAlertController.alertControllerWithTitleMessagePreferredStyle(options.title, options.message, 1 /* Alert */);
            addButtonsToAlertController(alertController, options, () => {
                resolve();
            });
            showUIAlertController(alertController);
        }
        catch (ex) {
            reject(ex);
        }
    });
}
export function confirm(arg) {
    return new Promise((resolve, reject) => {
        try {
            const options = !isDialogOptions(arg)
                ? {
                    title: DialogStrings.CONFIRM,
                    okButtonText: DialogStrings.OK,
                    cancelButtonText: DialogStrings.CANCEL,
                    message: arg + '',
                }
                : arg;
            const alertController = UIAlertController.alertControllerWithTitleMessagePreferredStyle(options.title, options.message, 1 /* Alert */);
            addButtonsToAlertController(alertController, options, (r) => {
                resolve(r);
            });
            showUIAlertController(alertController);
        }
        catch (ex) {
            reject(ex);
        }
    });
}
export function prompt(...args) {
    let options;
    const defaultOptions = {
        title: DialogStrings.PROMPT,
        okButtonText: DialogStrings.OK,
        cancelButtonText: DialogStrings.CANCEL,
        inputType: inputType.text,
    };
    const arg = args[0];
    if (args.length === 1) {
        if (isString(arg)) {
            options = defaultOptions;
            options.message = arg;
        }
        else {
            options = arg;
        }
    }
    else if (args.length === 2) {
        if (isString(arg) && isString(args[1])) {
            options = defaultOptions;
            options.message = arg;
            options.defaultText = args[1];
        }
    }
    return new Promise((resolve, reject) => {
        try {
            const alertController = UIAlertController.alertControllerWithTitleMessagePreferredStyle(options.title, options.message, 1 /* Alert */);
            alertController.addTextFieldWithConfigurationHandler((arg) => {
                arg.text = isString(options.defaultText) ? options.defaultText : '';
                arg.secureTextEntry = options && options.inputType === inputType.password;
                if (options && options.inputType === inputType.email) {
                    arg.keyboardType = 7 /* EmailAddress */;
                }
                else if (options && options.inputType === inputType.number) {
                    arg.keyboardType = 4 /* NumberPad */;
                }
                else if (options && options.inputType === inputType.decimal) {
                    arg.keyboardType = 8 /* DecimalPad */;
                }
                else if (options && options.inputType === inputType.phone) {
                    arg.keyboardType = 5 /* PhonePad */;
                }
                const color = getTextFieldColor();
                if (color) {
                    arg.textColor = arg.tintColor = color.ios;
                }
            });
            const textField = alertController.textFields.firstObject;
            if (options) {
                switch (options.capitalizationType) {
                    case capitalizationType.all: {
                        textField.autocapitalizationType = 3 /* AllCharacters */;
                        break;
                    }
                    case capitalizationType.sentences: {
                        textField.autocapitalizationType = 2 /* Sentences */;
                        break;
                    }
                    case capitalizationType.words: {
                        textField.autocapitalizationType = 1 /* Words */;
                        break;
                    }
                    default: {
                        textField.autocapitalizationType = 0 /* None */;
                    }
                }
            }
            addButtonsToAlertController(alertController, options, (r) => {
                resolve({ result: r, text: textField.text });
            });
            showUIAlertController(alertController);
        }
        catch (ex) {
            reject(ex);
        }
    });
}
export function login(...args) {
    const options = parseLoginOptions(args);
    return new Promise((resolve, reject) => {
        try {
            const alertController = UIAlertController.alertControllerWithTitleMessagePreferredStyle(options.title, options.message, 1 /* Alert */);
            const textFieldColor = getTextFieldColor();
            alertController.addTextFieldWithConfigurationHandler((arg) => {
                arg.placeholder = 'Login';
                arg.placeholder = options.userNameHint ? options.userNameHint : '';
                arg.text = isString(options.userName) ? options.userName : '';
                if (textFieldColor) {
                    arg.textColor = arg.tintColor = textFieldColor.ios;
                }
            });
            alertController.addTextFieldWithConfigurationHandler((arg) => {
                arg.placeholder = 'Password';
                arg.secureTextEntry = true;
                arg.placeholder = options.passwordHint ? options.passwordHint : '';
                arg.text = isString(options.password) ? options.password : '';
                if (textFieldColor) {
                    arg.textColor = arg.tintColor = textFieldColor.ios;
                }
            });
            const userNameTextField = alertController.textFields.firstObject;
            const passwordTextField = alertController.textFields.lastObject;
            addButtonsToAlertController(alertController, options, (r) => {
                resolve({
                    result: r,
                    userName: userNameTextField.text,
                    password: passwordTextField.text,
                });
            });
            showUIAlertController(alertController);
        }
        catch (ex) {
            reject(ex);
        }
    });
}
export function action(...args) {
    let options;
    const defaultOptions = { title: null, cancelButtonText: DialogStrings.CANCEL };
    if (args.length === 1) {
        if (isString(args[0])) {
            options = defaultOptions;
            options.message = args[0];
        }
        else {
            options = args[0];
        }
    }
    else if (args.length === 2) {
        if (isString(args[0]) && isString(args[1])) {
            options = defaultOptions;
            options.message = args[0];
            options.cancelButtonText = args[1];
        }
    }
    else if (args.length === 3) {
        if (isString(args[0]) && isString(args[1]) && isDefined(args[2])) {
            options = defaultOptions;
            options.message = args[0];
            options.cancelButtonText = args[1];
            options.actions = args[2];
        }
    }
    return new Promise((resolve, reject) => {
        try {
            let i;
            let action;
            const alertController = UIAlertController.alertControllerWithTitleMessagePreferredStyle(options.title, options.message, 0 /* ActionSheet */);
            if (options.actions) {
                for (i = 0; i < options.actions.length; i++) {
                    action = options.actions[i];
                    if (isString(action)) {
                        const thisActionIsDestructive = options.destructiveActionsIndexes && options.destructiveActionsIndexes.indexOf(i) !== -1;
                        const dialogType = thisActionIsDestructive ? 2 /* Destructive */ : 0 /* Default */;
                        alertController.addAction(UIAlertAction.actionWithTitleStyleHandler(action, dialogType, (arg) => {
                            resolve(arg.title);
                        }));
                    }
                }
            }
            if (isString(options.cancelButtonText)) {
                alertController.addAction(UIAlertAction.actionWithTitleStyleHandler(options.cancelButtonText, 1 /* Cancel */, (arg) => {
                    resolve(arg.title);
                }));
            }
            showUIAlertController(alertController);
        }
        catch (ex) {
            reject(ex);
        }
    });
}
/**
 * Singular rollup for convenience of all dialog methods
 */
export const Dialogs = {
    alert,
    confirm,
    prompt,
    login,
    action,
};
//# sourceMappingURL=index.ios.js.map