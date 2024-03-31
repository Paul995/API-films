const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const auth = require("./middlewares/auth.js");
const cors = require("cors");
const { log } = require("console");

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

server.use(cors());

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

//////////////////////////////////////////////////////////////////

//----GET **********************
//points dacces      // ceci rajoute la possibilite de async
server.get(
  "/api/films", // pour mettre dans le url localhost
  [
    //  selection / conv unicode(protction xss) / espaces / pour eviter de creer champs vide des autres values / impossible de creer champ vide
    check("tri").escape().trim().notEmpty(),
  ],
  async (req, res) => {
    //    const test = {email: "sdjkfh@srjfghdg.com"};
    try {
      console.trace(req.query); //ne fait rien mais permet de filtrer db pour voir/test avec lurl
      // on peut rajouer dans lurl ex: films/?limit=2&direction = asc

      const tri = req.query.tri || "titre";

      const direction = req.query["order-direction"] || "asc";
      const limit = +req.query["limit"] || 100; // OU nouveau shit :  +req.query("limit");
      // references firestore (car nest pas encore json)

      if (tri == "titre" || tri == "annee" || tri == "realisation") {
        const donneesRef = await db
          .collection("films")
          .orderBy(tri, direction)
          .limit(limit)
          .get();

        //2 premiers els

        const donneesFinale = [];

        donneesRef.forEach((doc) => {
          donneesFinale.push({ id: doc.id, ...doc.data() });
        });

        res.statusCode = 200; //comme if
        res.json(donneesFinale);
      }
    } catch (e) {
      res.statusCode = 500;

      res.json({ message: "erreur type 500" });
    }
  }
);

//autre route    param dynamique!(:id)   params = tout les shits avec /:...
server.get(
  "/api/films/:id",
  [
    //  selection / conv unicode(protction xss) / espaces / pour eviter de creer champs vide des autres values / impossible de creer champ vide
    check("id").escape().trim().notEmpty(),
  ],
  async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const donneesRef = await db.collection("films").doc(id).get();
    const film = await donneesRef.data();
    console.log(film);
    res.statusCode = 200;
    res.json(film);
  }
);

//UPDATE  (PUT)
server.put(
  "/api/films/:id",
  [
    //  selection / conv unicode(protction xss) / espaces / pour eviter de creer champs vide des autres values / impossible de creer champ vide
    check("annee").escape().trim().optional().notEmpty(),
    check("description").escape().trim().optional().notEmpty(),
    check("genres").escape().trim().optional().notEmpty().isArray(),
    check("realisation").escape().trim().optional().notEmpty(),
    check("titre").escape().trim().optional().notEmpty(),
    check("titreVignette").escape().trim().optional().notEmpty(),
  ],
  async (req, res) => {
    const id = req.params.id;
    const filmsModifies = req.body; //le corps de la nouvelle requete envoye (obj)
    //validation ici
    console.log(filmsModifies);

    await db.collection("films").doc(id).update(filmsModifies);

    res.statusCode = 200;
    res.json({ message: "le film a ete modifie" });
  }
);

// POST   *********************
server.post(
  "/api/films",
  [
    check("annee").escape().trim().optional().notEmpty(),
    check("description").escape().trim().optional().notEmpty(),
    check("genres").escape().trim().optional().notEmpty().isArray(),
    check("realisation").escape().trim().optional().notEmpty(),
    check("titre").escape().trim().optional().notEmpty(),
    check("titreVignette").escape().trim().optional().notEmpty(),
  ],
  async (req, res) => {
    try {
      const test = req.body;

      // validation des donnees
      // if (test.films == undefined) {
      //   res.statusCode = 400;
      //   //retrun fait sortir de la fctn. sinon erreur
      //   return res.json({ message: "vous devez fournir un film" });
      // }
      // add() fct firestore pour ajouter de la donnee
      await db.collection("films").add(test);

      res.statusCode = 201;
      res.json({ message: "la donne a ete ajoute", donnees: test });
    } catch {
      res.statusCode = 500;
      res.json({ message: "erreur 500" });
    }
  }
);

// DELETE ******************
//delete film
server.delete(
  "/api/films/:id",
  auth,
  [
    //  selection / conv unicode(protction xss) / espaces / pour eviter de creer champs vide des autres values / impossible de creer champ vide
    check("id").escape().trim().notEmpty(),
  ],

  async (req, res) => {
    const id = req.params.id;
    try {
      const deleteResult = await db.collection("films").doc(id).delete();
      // Optionally check deleteResult for specifics if needed
      res.status(200).json({ message: "Film deleted" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Error deleting film" });
    }
  }
);

//////////////////////////   USERS   //////////////////

//validation!!
//valide couriel (syntaxe express-validator)
server.post(
  "/utilisateurs/inscription",
  [
    check("courriel").escape().trim().notEmpty().isEmail().normalizeEmail(),
    check("mdp")
      .escape()
      .trim()
      .notEmpty()
      .isLength({ min: 8, max: 20 })
      .isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minNumbers: 1,
        minUppercase: 1,
        minSymbols: 1,
      }),

    //      req deja netoyee
  ],
  async (req, res) => {
    //validator  si erreur de validation
    const validation = validationResult(req);
    if (validation.errors.length > 0) {
      res.statusCode = 400;
      return res.json({ message: "Données non-conformes" });
    }

    // On récupère les infos du body
    const { courriel, mdp } = req.body; //destructuration// je vais dans body et je sort courreil et mdp. = const courriel = req.body.courriel etc

    // On vérifie si le courriel existe
    const docRef = await db
      .collection("utilisateurs")
      .where("courriel", "==", courriel)
      .get();
    const utilisateurs = [];

    docRef.forEach((doc) => {
      utilisateurs.push(doc.data());
    });
    console.log(utilisateurs);
    // Si oui, erreur
    if (utilisateurs.length > 0) {
      res.statusCode = 400;
      res.json({ message: "le courriel existe deja" });
    }

    // On valide/nettoie la donnée
    // On encrypte le mot de passe
    // On enregistre (objet)
    const nouvelUtilisateur = {
      // quand key et value dans objet sont pareils (et value est var), on peut juste ecrire le  value
      courriel: courriel,
      mdp: mdp,
    };
    await db.collection("utilisateurs").add(nouvelUtilisateur); // on peut enlever le mdp de l"objet (juste pour le retour), pour pas montrer le mdp, meme si il est enregistre dans la db
    delete nouvelUtilisateur.mdp;

    // On renvoie true;
    res.json(nouvelUtilisateur);
  }
);

server.post("/utilisateurs/connexion", async (req, res) => {
  // On récupère les infos du body
  const { mdp, courriel } = req.body;

  // On vérifie si le courriel existe
  const docRef = await db
    .collection("utilisateurs")
    .where("courriel", "==", courriel)
    .get();
  const utilisateurs = [];
  docRef.forEach((utilisateur) => {
    utilisateurs.push({ id: utilisateur.id, ...utilisateur.data() });
  });
  // Si non, erreur
  if (utilisateurs.length == 0) {
    res.statusCode = 400;
    return res.json({ message: "courriel invalide" });
  }
  const utilisateurAValider = utilisateurs[0];
  // TODO: On encrypte le mot de passe

  // On compare
  // si pas pareil, erreur
  if (utilisateurAValider.mdp !== mdp) {
    res.statusCode = 400;
    return res.json({ message: "Mot de passe invalide" });
  }

  //genrer JETONS
  const donneesJeton = {
    courriel: utilisateurs.courriel,
    id: utilisateurs.id,
  };

  
  const options = {
    expiresIn: "1d",
  };
  const jeton = jwt.sign(
    // sign = fctn avec 3 params
    donneesJeton,
    process.env.JWT_SECRET, ///dans le fichier .env !!
    options
  );
  

  // On retourne les infos de l'utilisateur sans le mot de passe
  delete utilisateurAValider.mdp;
  res.status = 200;
  return res.json(jeton); // passer le jeton!
  //res.json(utilisateurAValider);
});

// DOIT etre la derniere!! comme catch
// gestion de la page 404 (requetes non trouvees)
server.use((req, res) => {
  res.status(404).render("404", { url: req.url });
});

server.listen(process.env.PORT, () => {
  console.log("Server started");
});
