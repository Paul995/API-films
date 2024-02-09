// connexion a la db

var admin = require("firebase-admin");
var {getFirestore} = require("firebase-admin/firestore");

var serviceAccount = require("../db-config.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// objet contenant des fonctions (get add delete etc)
const db = getFirestore();

module.exports = db;
