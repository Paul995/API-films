const jwt = require("jsonwebtoken");
const db = require("../config/db");

const auth = async (req, res, next) => {
  // si req et sres est bon, next
  //si le jeton est valide
  try {
    //1. estce quil y a kkchonse dans lentete
    if (req.headers.authorization) {
      //recuperer le token. bearer() obl. //transform en en array a[res]
      const jetonAValider = req.headers.authorization.split(" ")[1]; //recupere 2e elem du array
      //esapce entre Bearer et Token
      //                                 jeton,  var secrete   ce qui est dans .env est secret
      const jetonDecode = jwt.verify(jetonAValider, process.env.JWT_SECRET);

      //                      requete                                   verifie le id
      const utilisateurVerifie = await db
        .collection("utilisateurs")
        .doc(jetonDecode.id)
        .get();

      //juste verfifier si exist
      if (utilisateurVerifie.exists) {
        // recupere le user
        const utilisateurRecupere = utilisateurVerifie.data();
        req.utilisateur = utilisateurRecupere;

        //appelle la suite de la req initial
        next();
      } else {
        /// si lutilisateur nexiste pas, return error
        // res.statusCode = 401;
        // res.json({ message : "Non autorise"});
        throw new Error("non autorise");
      }
    } else {
      // res.statusCode = 401;
      // res.json({"message": "Non Autorisee"});
      throw new Error("non autorise");
    }
  } catch (erreur) {
    console.log(erreur);
    res.statusCode = 401;
    res.json({ message: erreur.message });
  }
};

module.exports = auth; //permet dexporter la variable
