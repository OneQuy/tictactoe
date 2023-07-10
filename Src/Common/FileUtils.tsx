// https://github.com/itinance/react-native-fs

import RNFS from "react-native-fs";
import { DownloadProgressCallbackResult } from "react-native-fs";

/**
 * @returns null if success, otherwise error
 */
async function CheckAndMkDirOfFilepathAsync(fullFilepath: string): Promise<null | NonNullable<any>> {
  try {
    var idx = fullFilepath.lastIndexOf('/');
    var dirFullPath = fullFilepath.substring(0, idx);
    var dirIsExist = await RNFS.exists(dirFullPath);

    if (!dirIsExist)
      await RNFS.mkdir(dirFullPath);

    return null;
  } catch (e) {
    return e;
  }
}

/**
 * usage: const res = await WriteTextAsync('dataDir/file.txt', 'losemp text losemp text');
 * @returns null if success, otherwise error
 */
export async function WriteTextAsync(path: string, text: string | null, isRLP: boolean = true): Promise<null | any> {
  try {
    if (!path) {
      throw 'url or saveLocalPath is invalid to WriteTextAsync';
    }

    path = isRLP ? RNFS.DocumentDirectoryPath + '/' + path : path;

    // check & create dir first

    var res = await CheckAndMkDirOfFilepathAsync(path);
    
    if (res)
      throw 'can not write file, error when CheckAndMkDirOfFilepathAsync: ' + res;

    // write

    await RNFS.writeFile(path, text ? text : '');
    return null;
  }
  catch (e) {
    return e;
  }
}

/**
 * usage: const res = await ReadTextAsync('dataDir/file.txt');
 * @success return {text: text, error: null}
 * @error return {text: null, error: error}
 */
export async function ReadTextAsync(path: string, isRLP: boolean = true): Promise<{ text: string | null, error: null | any }> {
  try {
    if (!path) {
      throw 'path is invalid to ReadTextAsync';
    }

    path = isRLP ? RNFS.DocumentDirectoryPath + '/' + path : path;

    if (!await RNFS.exists(path)) {
      return {
        text: null,
        error: 'file not found'
      }
    }

    var text = await RNFS.readFile(path);

    return {
      text,
      error: null
    }
  }
  catch (e) {
    return {
      text: null,
      error: e
    }
  }
}

/**
 * usage: const res = await DeleteAsync('dataDir/file.txt');
 * @work both dir & file
 * @returns null if not existed or deleted success, otherwise error
 * @note: recursively deletes directories
 */
export async function DeleteFileAsync(path: string, isRLP: boolean = true): Promise<null | any> {
  try {
    if (path) {
      throw 'path is invalid to DeleteFileAsync';
    }

    path = isRLP ? RNFS.DocumentDirectoryPath + '/' + path : path;
    var isExist = await RNFS.exists(path);

    if (isExist)
      await RNFS.unlink(path);

    return null;
  }
  catch (e) {
    return e;
  }
}

/**
 * usage: const res = await DownloadFileAsync('fileurl', 'dataDir/file.txt');
 * @returns null if success, otherwise error
 */
export async function DownloadFileAsync(
  url: string,
  saveLocalPath: string,
  isRLP: boolean = true,
  process?: (p: DownloadProgressCallbackResult) => void): Promise<null | NonNullable<any>> {
  try {
    if (!url || !saveLocalPath) {
      throw 'url or saveLocalPath is invalid to download';
    }

    saveLocalPath = isRLP ? RNFS.DocumentDirectoryPath + '/' + saveLocalPath : saveLocalPath;
    
    // check & create dir first

    var res = await CheckAndMkDirOfFilepathAsync(saveLocalPath);

    if (res)
      throw 'can not download file, error when CheckAndMkDirOfFilepathAsync: ' + res;

    // download

    res = await RNFS.downloadFile({
      fromUrl: url,
      toFile: saveLocalPath,
      progress: process
    }).promise;

    if (res.statusCode !== 200) {
      throw '[' + url + ']' + ' downloaded failed, code: ' + res.statusCode;
    }
    console.log(saveLocalPath);
    return null;
  }
  catch (e) {
    return e;
  }
}