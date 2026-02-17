
const Router = require('express');
const { check } = require('express-validator');

const{
    validarCampos,
    validarJWT,
    tieneRole,
    esAdminRole
}=require('../middlewares');

const { esRoleVaido, emailExiste, existeUsuarioPorId } = require('../helpers/db-validators');
const { ususariosGet,
    usuariosPut,
    usuariosPost,
    usuariosDelete } = require('../controllers/usuarios');

const router = Router();

router.get('/', ususariosGet);
//////////////////////////////////////////////////
router.put('/:id', [

    check('id', 'No es un ID valido').isMongoId(),
    check('id').custom(existeUsuarioPorId),
    check('rol').custom(esRoleVaido),
    validarCampos

], usuariosPut);
//////////////////////////////////////////////////
router.post('/',
    [//Se envia en [] la validación del correo
        check('nombre', 'El nombre es obligatorio').not().isEmpty(),
        check('correo').custom(emailExiste),        
        check('correo', 'El correo no es valido').isEmail(),
        check('password', 'El password debe ser de más 6 letras').isLength({ min: 6 }),
        check('rol','No es un rol válido').isIn(['ADMIN_ROLE','USER_ROLE']),  
        check('rol').custom(esRoleVaido),
        validarCampos                           //Revisa los checks
    ],                                      //Si pasa pude seguir al Post
    usuariosPost);
//////////////////////////////////////////////////
router.delete('/:id',
[
    validarJWT,
//    esAdminRole, Solo si el admin quiere borrar
    tieneRole('ADMIN_ROLE','USER_ROLE'),
    check('id', 'No es un ID valido').isMongoId(),
    check('id').custom(existeUsuarioPorId),
    validarCampos 
],usuariosDelete);


//////////////////////////////////////////////////

module.exports = router;