const { validationResult } = require('express-validator');


const validarCampos = (req,res,next)=>{

    //Validación de errores    
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json(errors);

    };

    next();             //Si pasa este punto pasa al siguiente middlewares

}

module.exports={

    validarCampos

}