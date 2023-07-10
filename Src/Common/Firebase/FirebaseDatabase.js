// MUST FirebaseInit() first

import { getDatabase, ref, onValue, set, get, remove } from 'firebase/database';

var db = null;

function CheckAndInit() {    
    if (!db)
        db = getDatabase();
}

// Usage: FirebaseDatabase_SetValue('hichic/hoho', valueObject, () => { console.log('done!'); });
export function FirebaseDatabase_SetValue(relativePath, valueObject, callback) {
    CheckAndInit();
    const reference = ref(db, relativePath);    
    
    set(reference, valueObject).then(function() {
            if (callback)
                callback();
        });
}

/**
 * @returns null if SUCCESS, error if error.
 */
export async function FirebaseDatabase_SetValueAsync(relativePath, valueObject) {
    CheckAndInit();
    
    try
    {
        const reference = ref(db, relativePath);        
        await set(reference, valueObject);
        return null;
    }
    catch (err)
    {
        return err;
    }
}

/**
 * @returns Unsubribe method. (Usage: Unsubribe())
 */
export function FirebaseDatabase_OnValue(relativePath, callback) {
    CheckAndInit();
    const reference = ref(db, relativePath);

    return onValue(reference, (snapshot) => {
        if (callback)
            callback(snapshot.val());
    });
}

/**
 * @returns Object {
 *      value: value or null if has no data,
 *      error: error or null if success }
 */
export async function FirebaseDatabase_GetValueAsync(relativePath) {
    CheckAndInit();

    try
    {
        const reference = ref(db, relativePath);
        var snapshot = await get(reference);
        return {
            value: snapshot.val(),
            error: null
        }
    }
    catch (err)
    {
        return {
            value: null,
            error: err
        }
    }
}

/**
 * @returns Object {
 *      value: value or null if has no data,
 *      error: error or null if success }
 */
export async function FirebaseDatabase_IncreaseNumberAsync(relativePath) {
    CheckAndInit();

    try
    {
        // get

        const reference = ref(db, relativePath);
        var snapshot = await get(reference);        
        let value = snapshot.val();
        
        if (value == null)
        {
            value = -1;
        }

        // set
        
        value++;        
        let error = await FirebaseDatabase_SetValueAsync(relativePath, value);

        if (error)
        {
            return {
                value: null,
                error:  error
            }
        }

        // return

        return {
            value: value,
            error: null
        }
    }
    catch (err)
    {
        return {
            value: null,
            error: err
        }
    }
}

/**
 * @returns null if SUCCESS, otherwise error.
 */
 export async function FirebaseDatabase_RemoveAsync(relativePath) {
    CheckAndInit();
    
    try
    {
        const reference = ref(db, relativePath);        
        await remove(reference);
        return null;
    }
    catch (err)
    {
        return err;
    }
}