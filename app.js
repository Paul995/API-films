const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");
const { check, validationResult } = require("express-validator");

//au debut du fichier
dotenv.config(); //pour utiliser .env

// express cree un serveur plus simple
const server = express();
server.set("views", path.join(__dirname, "views")); //template. si on aa des vues, on les met dans le dossier views
server.set("view engine", "mustache");
server.engine("mustache", mustacheExpress()); // exception. peut aller dans views en plus de public

//// middlewares    // static = tout ce qui est accessible genre polices etc
// on peut acceder TOUT ce qui est dans public avec l<url

server.use(express.static(path.join(__dirname, "public"))); //ceci va dans le dossier public et on peut acceder directement dans lurl une page ex: localhost:3301/contact.html // SEULEMENT les trucs dans public sont accessible dans le navigateur

server.use(express.json()); //permet de passer des body en json
/// ex ceci permet dutiliser le lien css dans la page



//-----------------------------------------------///

// INIT films
// pour ajouter en boucle les films de filmstest.js
server.post("/films/initialiser", (req, res) => {
  const donneesTest = require("./data/filmsTest.js");

  donneesTest.forEach(async (element) => {
    await db.collection("films").add(element);
  });

  res.statusCode = 200;
  res.json({ message: "films initialisees" });
});


// INIT utilisateurs
server.post("/utilisateurs/initialiser", (req, res) => {
  const donneesTest = require("./data/utilisateurTest.js");

  donneesTest.forEach(async (element) => {
    await db.collection("utilisateurs").add(element);
  });

  res.statusCode = 200;
  res.json({ message: "users initialisees" });
});



//----GET **********************
//points dacces      // ceci rajoute la possibilite de async
server.get("/films", async (req, res) => {
  //    const test = {email: "sdjkfh@srjfghdg.com"};
  try {
    console.log(req.query); //ne fait rien mais permet de filtrer db pour voir/test avec lurl
    // on peut rajouer dans lurl ex: films/?limit=2&direction = asc

    const direction = req.query["order-direction"] || "asc";
    const limit = +req.query["limit"] || 5; // OU nouveau shit :  +req.query("limit");
    // references firestore (car nest pas encore json)

    //2 premiers els
    const donneesRef = await db
      .collection("films")
      .orderBy("titre", direction)
      .limit(limit)
      .get();
    const donneesFinale = [];

    donneesRef.forEach((doc) => {
      donneesFinale.push(doc.data());
    });

    res.statusCode = 200; //comme if
    res.json(donneesFinale); 
  } catch (e) {
    res.statusCode = 500;

    res.json({ message: "erreur type 500" });
  }
});


//autre route    param dynamique!(:id)   params = tout les shits avec /:...
server.get("/films/:id", async (req, res) => {
    const id = req.params.id;
    const donneesRef = await db.collection("films").doc(id).get();
    const film = donneesRef.data()
    res.statusCode = 200;
    res.json(film);
});

server.get("/utilisateurs/:id", async (req, res) => {
    const id = req.params.id;
    const donneesRef = await db.collection("utilisateurs").doc(id).get();
    const user = donneesRef.data()
    res.statusCode = 200;
    res.json(user);
});
  
  


// DELETE ******************
//delete film
server.delete("/films/:id", async (req, res) => {
    const id = req.params.id;
    const resultat = await db.collection("films").doc(id).delete();
  
    res.statusCode = 200;
    res.json({message: "film deleted"})
  
  })
//delete user
server.delete("/utilisateurs/:id", async (req, res) => {
    const id = req.params.id;
    const resultat = await db.collection("utilisateurs").doc(id).delete();
  
    res.statusCode = 200;
    res.json({message: "user deleted"})

  })





// DOIT etre la derniere!! comme catch
// gestion de la page 404 (requetes non trouvees)
server.use((req, res) => {
  res.status(404).render("404", { url: req.url });
});

server.listen(process.env.PORT, () => {
  console.log("Server started");
});
