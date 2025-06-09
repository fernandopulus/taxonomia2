import { initializeApp } from "firebase/app";
// Solo importa Analytics si lo usarás realmente
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDYmpdChFKqpGsTY2BRfvX5OuqyIE6oEgY",
  authDomain: "taxonomia-916be.firebaseapp.com",
  projectId: "taxonomia-916be",
  storageBucket: "taxonomia-916be.appspot.com", // ojo, .appspot.com
  messagingSenderId: "640289413497",
  appId: "1:640289413497:web:198a595f56644963c2f7a8",
  measurementId: "G-87QBN1T8FJ"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export { app /*, analytics */ };
