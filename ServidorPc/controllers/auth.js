const { request, response } = require("express");
const bcryptjs = require("bcryptjs");
const Usuario = require("../models/usuario");
const { generarJWT } = require("../helpers/generar-jwt");
const { googleVerify } = require("../helpers/google-verify");
const { json } = require("body-parser");

const login = async (req = request, res = response) => {
  const { correo, password } = req.body;
  try {
    //Verificar el email existe
    const usuario = await Usuario.findOne({ correo }); 
    //console.log(usuario);
    if (!usuario) {
      return res.status(400).json({
        msg: "Usuario / Password no son correctos - correo",
      });
    }

    //Verficar si el usuaerio está activo
    if (!usuario.estado) {
      return res.status(400).json({
        msg: "Usuario / Password no son correctos - estado:false",
      });
    }
    //Verificar la contraseña
    const validPassword = bcryptjs.compareSync(password, usuario.password);
    if (!validPassword) {
      return res.status(400).json({
        msg: "Usuario / Password no son correctos - password",
      });
    }   

    //Gnerar el JWT
    const token = await generarJWT(usuario.id);

    res.json({
      usuario,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
    });
  }
};

////////////////////////////////////////////////////////////////////
const googleSignIn = async (req, res = response) => {
  const { id_token } = req.body;
  //console.log(id_token);
  try {
    const { nombre, img, correo } = await googleVerify(id_token);

    //Verficar si el correo existe en la abse de datos

    let usuario = await Usuario.findOne({ correo });

    if (!usuario) {
      //Debe crearlo
      const data = {
        nombre,
        correo,
        password: ":P",
        img,
        rol: "USER_ROLE",
        google: true,
      };
      usuario = new Usuario(data);
      await usuario.save();
    }

    //Si el ususario en DB esta borrado

    if (!usuario.estado) {
      return res.status(401).json({
        msg: "Hable con el administrador, usuario bloqueado",
      });
    }

    //Generar el JWT
    console.log(usuario.id);
    const token = await generarJWT(usuario.id);

    res.json({
      usuario,
      token,
    });
  } catch (error) {
    json.status(400).json({
      ok: false,
      msg: "El token no se pudo verificar",
    });
  }
};

const revalidarToken = async (req = request, res = response) => {
  const { nombre, id, correo } = req.usuario;

  const token = await generarJWT((uid = id), nombre);
  res.json({
    ok: true,
    uid,
    nombre,
    correo,
    token,
  });
};

module.exports = {
  login,
  googleSignIn,
  revalidarToken,
};
