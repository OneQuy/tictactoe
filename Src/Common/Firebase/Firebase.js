// (doc: https://firebase.google.com/docs)

// SETTUP: Get firebaseConfig from firebase console:
// - Go to Console
// - Go to Project Settings
// - Add app > Web
// - Copy firebaseConfig and place below.

import { initializeApp } from 'firebase/app';

const firebaseConfig = null; // add config here!

// Examble config:

// const firebaseConfig = {
//     apiKey: "AIzaSyAKOAaryHgVZ-ImHz8Z2iFdz8Ex57LY",
//     authDomain: "tictactoe-d1111.firebaseapp.com",
//     databaseURL: "https://tictactoe-d3339-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "tictactoe-d4112",
//     storageBucket: "tictactoe-d4333.appspot.com",
//     messagingSenderId: "424601343292",
//     appId: "1:424601817692:web:491c78d23fd2df4c2abcc99"
// };

var FirebaseApp = null;

export function GetFirebaseApp() {
    FirebaseInit();
    return FirebaseApp;
}

export function FirebaseInit() {
    if (FirebaseApp)
        return;

    if (firebaseConfig === null)
        throw 'You should update the firebaseConfig to the file: Src\\Common\\Firebase\\Firebase.js first!';

    FirebaseApp = initializeApp(firebaseConfig);
}