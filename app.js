var firebaseConfig = {
  apiKey: "AIzaSyCTWb-vdr_UK31Vrr5u5uxEKjAChEq1-A0",
  authDomain: "imp-dev-c39ee.firebaseapp.com",
  projectId: "imp-dev-c39ee",
  storageBucket: "imp-dev-c39ee.appspot.com",
  messagingSenderId: "374394824095",
  appId: "1:374394824095:web:bb7d2ffbd847ee816c89aa",
  measurementId: "G-EJ4VMW1QXC"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

