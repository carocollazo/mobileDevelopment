import * as textModule from '../text';
import { getNativeApplication } from '../application';
let applicationContext;
function getApplicationContext() {
    if (!applicationContext) {
        applicationContext = getNativeApplication().getApplicationContext();
    }
    return applicationContext;
}
function getOrSetHelper(path) {
    return org.nativescript.widgets.FileHelper.fromString(applicationContext, path);
}
function isContentUri(path) {
    if (typeof path === 'string' && path.startsWith('content:')) {
        return true;
    }
    return false;
}
export class FileSystemAccess {
    constructor() {
        this._pathSeparator = '/';
        this.read = this.readSync.bind(this);
        this.write = this.writeSync.bind(this);
        this.readText = this.readTextSync.bind(this);
        this.writeText = this.writeTextSync.bind(this);
    }
    getLastModified(path) {
        const javaFile = new java.io.File(path);
        return new Date(javaFile.lastModified());
    }
    getFileSize(path) {
        const javaFile = new java.io.File(path);
        return javaFile.length();
    }
    getParent(path, onError) {
        try {
            const javaFile = new java.io.File(path);
            const parent = javaFile.getParentFile();
            return { path: parent.getAbsolutePath(), name: parent.getName() };
        }
        catch (exception) {
            // TODO: unified approach for error messages
            if (onError) {
                onError(exception);
            }
            return undefined;
        }
    }
    getFile(path, onError) {
        return this.ensureFile(new java.io.File(path), false, onError);
    }
    getFolder(path, onError) {
        const javaFile = new java.io.File(path);
        const dirInfo = this.ensureFile(javaFile, true, onError);
        if (!dirInfo) {
            return undefined;
        }
        return { path: dirInfo.path, name: dirInfo.name };
    }
    eachEntity(path, onEntity, onError) {
        if (!onEntity) {
            return;
        }
        this.enumEntities(path, onEntity, onError);
    }
    getEntities(path, onError) {
        const fileInfos = new Array();
        const onEntity = function (entity) {
            fileInfos.push(entity);
            return true;
        };
        let errorOccurred;
        const localError = function (error) {
            if (onError) {
                onError(error);
            }
            errorOccurred = true;
        };
        this.enumEntities(path, onEntity, localError);
        if (!errorOccurred) {
            return fileInfos;
        }
        return null;
    }
    fileExists(path) {
        const file = new java.io.File(path);
        return file.exists();
    }
    folderExists(path) {
        const file = new java.io.File(path);
        return file.exists() && file.isDirectory();
    }
    deleteFile(path, onError) {
        try {
            const javaFile = new java.io.File(path);
            if (!javaFile.isFile()) {
                if (onError) {
                    onError({
                        message: 'The specified parameter is not a File entity.',
                    });
                }
                return;
            }
            if (!javaFile.delete()) {
                if (onError) {
                    onError({ message: 'File deletion failed' });
                }
            }
        }
        catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    }
    deleteFolder(path, onError) {
        try {
            const javaFile = new java.io.File(path);
            if (!javaFile.getCanonicalFile().isDirectory()) {
                if (onError) {
                    onError({
                        message: 'The specified parameter is not a Folder entity.',
                    });
                }
                return;
            }
            // TODO: Asynchronous
            this.deleteFolderContent(javaFile);
            if (!javaFile.delete()) {
                if (onError) {
                    onError({ message: 'Folder deletion failed.' });
                }
            }
        }
        catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    }
    emptyFolder(path, onError) {
        try {
            const javaFile = new java.io.File(path);
            if (!javaFile.getCanonicalFile().isDirectory()) {
                if (onError) {
                    onError({
                        message: 'The specified parameter is not a Folder entity.',
                    });
                }
                return;
            }
            // TODO: Asynchronous
            this.deleteFolderContent(javaFile);
        }
        catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    }
    rename(path, newPath, onError) {
        const javaFile = new java.io.File(path);
        if (!javaFile.exists()) {
            if (onError) {
                onError(new Error('The file to rename does not exist'));
            }
            return;
        }
        const newFile = new java.io.File(newPath);
        if (newFile.exists()) {
            if (onError) {
                onError(new Error('A file with the same name already exists.'));
            }
            return;
        }
        if (!javaFile.renameTo(newFile)) {
            if (onError) {
                onError(new Error("Failed to rename file '" + path + "' to '" + newPath + "'"));
            }
        }
    }
    getDocumentsFolderPath() {
        const dir = getApplicationContext().getFilesDir();
        return dir.getAbsolutePath();
    }
    getLogicalRootPath() {
        const dir = getApplicationContext().getFilesDir();
        return dir.getCanonicalPath();
    }
    getTempFolderPath() {
        const dir = getApplicationContext().getCacheDir();
        return dir.getAbsolutePath();
    }
    getCurrentAppPath() {
        return this.getLogicalRootPath() + '/app';
    }
    readAsync(path) {
        return new Promise((resolve, reject) => {
            try {
                org.nativescript.widgets.Async.File.read(path, new org.nativescript.widgets.Async.CompleteCallback({
                    onComplete: (result) => {
                        resolve(result);
                    },
                    onError: (err) => {
                        reject(new Error(err));
                    },
                }), null);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    readSync(path, onError) {
        try {
            const javaFile = new java.io.File(path);
            const stream = new java.io.FileInputStream(javaFile);
            const bytes = Array.create('byte', javaFile.length());
            const dataInputStream = new java.io.DataInputStream(stream);
            dataInputStream.readFully(bytes);
            return bytes;
        }
        catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    }
    writeAsync(path, bytes) {
        return new Promise((resolve, reject) => {
            try {
                org.nativescript.widgets.Async.File.write(path, bytes, new org.nativescript.widgets.Async.CompleteCallback({
                    onComplete: () => {
                        resolve();
                    },
                    onError: (err) => {
                        reject(new Error(err));
                    },
                }), null);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    writeSync(path, bytes, onError) {
        try {
            const javaFile = new java.io.File(path);
            const stream = new java.io.FileOutputStream(javaFile);
            stream.write(bytes, 0, bytes.length);
            stream.close();
        }
        catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    }
    readTextAsync(path, encoding) {
        let actualEncoding = encoding;
        if (!actualEncoding) {
            actualEncoding = textModule.encoding.UTF_8;
        }
        return new Promise((resolve, reject) => {
            try {
                org.nativescript.widgets.Async.File.readText(path, actualEncoding, new org.nativescript.widgets.Async.CompleteCallback({
                    onComplete: (result) => {
                        if (actualEncoding === textModule.encoding.UTF_8) {
                            // Remove UTF8 BOM if present. http://www.rgagnon.com/javadetails/java-handle-utf8-file-with-bom.html
                            result = FileSystemAccess._removeUtf8Bom(result);
                        }
                        resolve(result);
                    },
                    onError: (err) => {
                        reject(new Error(err));
                    },
                }), null);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    readTextSync(path, onError, encoding) {
        try {
            const javaFile = new java.io.File(path);
            const stream = new java.io.FileInputStream(javaFile);
            let actualEncoding = encoding;
            if (!actualEncoding) {
                actualEncoding = textModule.encoding.UTF_8;
            }
            const reader = new java.io.InputStreamReader(stream, actualEncoding);
            const bufferedReader = new java.io.BufferedReader(reader);
            // TODO: We will need to read the entire file to a CharBuffer instead of reading it line by line
            // TODO: bufferedReader.read(CharBuffer) does not currently work
            let line = undefined;
            let result = '';
            while (true) {
                line = bufferedReader.readLine();
                if (line === null) {
                    break;
                }
                if (result.length > 0) {
                    // add the new line manually to the result
                    // TODO: Try with CharBuffer at a later stage, when the Bridge allows it
                    result += '\n';
                }
                result += line;
            }
            if (actualEncoding === textModule.encoding.UTF_8) {
                // Remove UTF8 BOM if present. http://www.rgagnon.com/javadetails/java-handle-utf8-file-with-bom.html
                result = FileSystemAccess._removeUtf8Bom(result);
            }
            bufferedReader.close();
            return result;
        }
        catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    }
    static _removeUtf8Bom(s) {
        if (s.charCodeAt(0) === 0xfeff) {
            s = s.slice(1);
            //console.log("Removed UTF8 BOM.");
        }
        return s;
    }
    writeTextAsync(path, content, encoding) {
        let actualEncoding = encoding;
        if (!actualEncoding) {
            actualEncoding = textModule.encoding.UTF_8;
        }
        return new Promise((resolve, reject) => {
            try {
                org.nativescript.widgets.Async.File.writeText(path, content, actualEncoding, new org.nativescript.widgets.Async.CompleteCallback({
                    onComplete: () => {
                        resolve();
                    },
                    onError: (err) => {
                        reject(new Error(err));
                    },
                }), null);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    writeTextSync(path, content, onError, encoding) {
        try {
            const javaFile = new java.io.File(path);
            const stream = new java.io.FileOutputStream(javaFile);
            let actualEncoding = encoding;
            if (!actualEncoding) {
                actualEncoding = textModule.encoding.UTF_8;
            }
            const writer = new java.io.OutputStreamWriter(stream, actualEncoding);
            writer.write(content);
            writer.close();
        }
        catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    }
    deleteFolderContent(file) {
        const filesList = file.listFiles();
        if (filesList.length === 0) {
            return true; // Nothing to delete, so success!
        }
        let childFile;
        let success = false;
        for (let i = 0; i < filesList.length; i++) {
            childFile = filesList[i];
            if (childFile.getCanonicalFile().isDirectory()) {
                success = this.deleteFolderContent(childFile);
                if (!success) {
                    break;
                }
            }
            success = childFile.delete();
        }
        return success;
    }
    ensureFile(javaFile, isFolder, onError) {
        try {
            if (!javaFile.exists()) {
                let created;
                if (isFolder) {
                    created = javaFile.mkdirs();
                }
                else {
                    javaFile.getParentFile().mkdirs();
                    created = javaFile.createNewFile();
                }
                if (!created) {
                    // TODO: unified approach for error messages
                    if (onError) {
                        onError('Failed to create new java File for path ' + javaFile.getAbsolutePath());
                    }
                    return undefined;
                }
                else {
                    javaFile.setReadable(true);
                    javaFile.setWritable(true);
                }
            }
            const path = javaFile.getAbsolutePath();
            return {
                path: path,
                name: javaFile.getName(),
                extension: this.getFileExtension(path),
            };
        }
        catch (exception) {
            // TODO: unified approach for error messages
            if (onError) {
                onError(exception);
            }
            return undefined;
        }
    }
    // TODO: This method is the same as in the iOS implementation.
    // Make it in a separate file / module so it can be reused from both implementations.
    getFileExtension(path) {
        const dotIndex = path.lastIndexOf('.');
        if (dotIndex && dotIndex >= 0 && dotIndex < path.length) {
            return path.substring(dotIndex);
        }
        return '';
    }
    enumEntities(path, callback, onError) {
        try {
            let javaFile = new java.io.File(path);
            if (!javaFile.getCanonicalFile().isDirectory()) {
                if (onError) {
                    onError('There is no folder existing at path ' + path);
                }
                return;
            }
            const filesList = javaFile.listFiles();
            const length = filesList.length;
            let info;
            let retVal;
            for (let i = 0; i < length; i++) {
                javaFile = filesList[i];
                info = {
                    path: javaFile.getAbsolutePath(),
                    name: javaFile.getName(),
                };
                if (javaFile.isFile()) {
                    info.extension = this.getFileExtension(info.path);
                }
                retVal = callback(info);
                if (retVal === false) {
                    break;
                }
            }
        }
        catch (exception) {
            if (onError) {
                onError(exception);
            }
        }
    }
    getPathSeparator() {
        return this._pathSeparator;
    }
    normalizePath(path) {
        const file = new java.io.File(path);
        return file.getAbsolutePath();
    }
    joinPath(left, right) {
        const file1 = new java.io.File(left);
        const file2 = new java.io.File(file1, right);
        return file2.getPath();
    }
    joinPaths(paths) {
        if (!paths || paths.length === 0) {
            return '';
        }
        if (paths.length === 1) {
            return paths[0];
        }
        let result = paths[0];
        for (let i = 1; i < paths.length; i++) {
            result = this.joinPath(result, paths[i]);
        }
        return result;
    }
}
export class FileSystemAccess29 extends FileSystemAccess {
    constructor() {
        super(...arguments);
        this.readText = this.readTextSync.bind(this);
        this.read = this.readSync.bind(this);
        this.writeText = this.writeTextSync.bind(this);
        this.write = this.writeSync.bind(this);
    }
    getLastModified(path) {
        if (isContentUri(path)) {
            return new Date(getOrSetHelper(path).getLastModified() * 1000);
        }
        return super.getLastModified(path);
    }
    getFileSize(path) {
        if (isContentUri(path)) {
            return getOrSetHelper(path).getSize();
        }
        return super.getFileSize(path);
    }
    getParent(path, onError) {
        if (isContentUri(path)) {
            return null;
        }
        return super.getParent(path, onError);
    }
    getFile(path, onError) {
        if (isContentUri(path)) {
            try {
                const file = getOrSetHelper(path);
                return {
                    path,
                    name: file.getName(),
                    extension: file.getExtension(),
                };
            }
            catch (e) {
                if (typeof onError === 'function') {
                    onError(e);
                }
                return;
            }
        }
        return super.getFile(path, onError);
    }
    getFolder(path, onError) {
        if (isContentUri(path)) {
            return null;
        }
        return super.getFolder(path, onError);
    }
    getEntities(path, onError) {
        if (isContentUri(path)) {
            return null;
        }
        return super.getEntities(path, onError);
    }
    eachEntity(path, onEntity, onError) {
        if (isContentUri(path)) {
            return null;
        }
        super.eachEntity(path, onEntity);
    }
    fileExists(path) {
        if (isContentUri(path)) {
            return org.nativescript.widgets.FileHelper.exists(applicationContext, path);
        }
        return super.fileExists(path);
    }
    folderExists(path) {
        if (isContentUri(path)) {
            return null;
        }
        return super.folderExists(path);
    }
    deleteFile(path, onError) {
        if (isContentUri(path)) {
            try {
                getOrSetHelper(path).delete(applicationContext);
            }
            catch (e) {
                onError === null || onError === void 0 ? void 0 : onError(e);
            }
        }
        else {
            super.deleteFile(path, onError);
        }
    }
    deleteFolder(path, onError) {
        if (!isContentUri(path)) {
            super.deleteFolder(path, onError);
        }
    }
    emptyFolder(path, onError) {
        if (!isContentUri(path)) {
            super.emptyFolder(path, onError);
        }
    }
    rename(path, newPath, onError) {
        if (isContentUri(path)) {
            let callback = null;
            if (typeof onError === 'function') {
                callback = new org.nativescript.widgets.FileHelper.Callback({
                    onSuccess(result) { },
                    onError(error) {
                        onError(error);
                    },
                });
            }
            getOrSetHelper(path).renameSync(applicationContext, newPath, callback);
        }
        else {
            super.rename(path, newPath, onError);
        }
    }
    renameAsync(path, newPath) {
        return new Promise((resolve, reject) => {
            getOrSetHelper(path).renameSync(applicationContext, newPath, new org.nativescript.widgets.FileHelper.Callback({
                onSuccess(result) {
                    resolve();
                },
                onError(error) {
                    reject(error);
                },
            }));
        });
    }
    getDocumentsFolderPath() {
        return super.getDocumentsFolderPath();
    }
    getTempFolderPath() {
        return super.getTempFolderPath();
    }
    getLogicalRootPath() {
        return super.getLogicalRootPath();
    }
    getCurrentAppPath() {
        return super.getCurrentAppPath();
    }
    readTextAsync(path, encoding) {
        if (isContentUri(path)) {
            return new Promise((resolve, reject) => {
                getOrSetHelper(path).readText(applicationContext, encoding !== null && encoding !== void 0 ? encoding : null, new org.nativescript.widgets.FileHelper.Callback({
                    onSuccess(result) {
                        resolve(result);
                    },
                    onError(error) {
                        reject(error);
                    },
                }));
            });
        }
        return super.readTextAsync(path, encoding);
    }
    readTextSync(path, onError, encoding) {
        if (isContentUri(path)) {
            let callback = null;
            if (typeof onError === 'function') {
                callback = new org.nativescript.widgets.FileHelper.Callback({
                    onSuccess(result) { },
                    onError(error) {
                        onError(error);
                    },
                });
            }
            return getOrSetHelper(path).readTextSync(applicationContext, encoding !== null && encoding !== void 0 ? encoding : null, callback);
        }
        else {
            return super.readTextSync(path, onError, encoding);
        }
    }
    readAsync(path) {
        if (isContentUri(path)) {
            return new Promise((resolve, reject) => {
                getOrSetHelper(path).read(applicationContext, new org.nativescript.widgets.FileHelper.Callback({
                    onSuccess(result) {
                        resolve(result);
                    },
                    onError(error) {
                        reject(error);
                    },
                }));
            });
        }
        return super.readAsync(path);
    }
    readSync(path, onError) {
        if (isContentUri(path)) {
            let callback = null;
            if (typeof onError === 'function') {
                callback = new org.nativescript.widgets.FileHelper.Callback({
                    onSuccess(result) { },
                    onError(error) {
                        onError(error);
                    },
                });
            }
            return getOrSetHelper(path).readSync(applicationContext, callback);
        }
        return super.readSync(path, onError);
    }
    writeTextAsync(path, content, encoding) {
        if (isContentUri(path)) {
            return new Promise((resolve, reject) => {
                getOrSetHelper(path).writeText(applicationContext, content, encoding !== null && encoding !== void 0 ? encoding : null, new org.nativescript.widgets.FileHelper.Callback({
                    onSuccess(result) {
                        resolve();
                    },
                    onError(error) {
                        reject(error);
                    },
                }));
            });
        }
        return super.writeTextAsync(path, content, encoding);
    }
    writeTextSync(path, content, onError, encoding) {
        if (isContentUri(path)) {
            let callback = null;
            if (typeof onError === 'function') {
                callback = new org.nativescript.widgets.FileHelper.Callback({
                    onSuccess(result) { },
                    onError(error) {
                        onError(error);
                    },
                });
            }
            getOrSetHelper(path).writeTextSync(applicationContext, content, encoding !== null && encoding !== void 0 ? encoding : null, callback);
        }
        else {
            super.writeTextSync(path, content, onError);
        }
    }
    writeAsync(path, content) {
        if (isContentUri(path)) {
            return new Promise((resolve, reject) => {
                getOrSetHelper(path).write(applicationContext, content, new org.nativescript.widgets.FileHelper.Callback({
                    onSuccess(result) {
                        resolve();
                    },
                    onError(error) {
                        reject(error);
                    },
                }));
            });
        }
        return super.writeAsync(path, content);
    }
    writeSync(path, content, onError) {
        if (isContentUri(path)) {
            let callback = null;
            if (typeof onError === 'function') {
                callback = new org.nativescript.widgets.FileHelper.Callback({
                    onSuccess(result) { },
                    onError(error) {
                        onError(error);
                    },
                });
            }
            getOrSetHelper(path).writeSync(applicationContext, content, callback);
        }
        else {
            super.writeSync(path, content, onError);
        }
    }
    getFileExtension(path) {
        if (isContentUri(path)) {
            return getOrSetHelper(path).getExtension();
        }
        return super.getFileExtension(path);
    }
    getPathSeparator() {
        return super.getPathSeparator();
    }
    normalizePath(path) {
        return super.normalizePath(path);
    }
    joinPath(left, right) {
        return super.joinPath(left, right);
    }
    joinPaths(paths) {
        return super.joinPaths(paths);
    }
}
//# sourceMappingURL=file-system-access.android.js.map