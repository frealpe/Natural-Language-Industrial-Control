const { response, request } = require('express');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');

const validarJWT = async (req=request,res=response,next)=>{
    //Params en la gestión debe ser x-token
    const token = req.header('x-token');
    // console.log(token);

    if(!token){

        return res.status(401).json({
            msg:'No hay token'
        });
    }
    try {
        const {uid} = jwt.verify(token,process.env.SECRETORPRIVATEKEY);

        req.uid = uid;

        //console.log(req.uid)
        const usuario=await Usuario.findById(uid);       
        
        if(!usuario)
        {
            return res.status(401).json({
                msg:'Token no valido-usuario borrado'
            })
        }

        //Verificar si el ususario no esta estado=false o borrado
        if(!usuario.estado){

            return res.status(401).json({
                msg:'Token no valido-usuario estado=false'
            })
        }
        req.usuario=usuario;  
        //console.log(usuario);
        
        next();    
    } catch (error) {
        console.log(error);
        res.status(401).json({
            msg:'Token no válido'
        })
        
    }

    
}

module.exports={
    validarJWT
}