// (doc: https://firebase.google.com/docs)

// SETTUP: Get firebaseConfig from firebase console:
// - Go to Console
// - Go to Project Settings
// - Add app > Web
// - Copy firebaseConfig and place below.

import { initializeApp } from 'firebase/app';

const firebaseConfig = null; // add config here!

var FirebaseApp = null;

export function GetFirebaseApp() {
    FirebaseInit();
    return FirebaseApp;
}

export function FirebaseInit() {    
    if (FirebaseApp)
        return;

    if (firebaseConfig === null)
        throw 'You should update the firebaseConfig to the file: Src\Common\Firebase\Firebase.js first!';

    FirebaseApp = initializeApp(firebaseConfig);
}