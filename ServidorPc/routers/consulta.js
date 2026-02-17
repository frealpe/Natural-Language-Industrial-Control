const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos, validarJWT } = require('../middlewares');
const { publicarMensaje, suscribirseTopic, obtenerTopics, leerMensajes,publicarMensajeIA } = require('../controllers/mqttallcomp');
const { consultaIA, getAllData, deleteDatalogger, deleteCaracterizacion, deleteComparacion, updateDatalogger, updateCaracterizacion, updateComparacion } = require('../controllers/consulta');

const router = Router();

//////////////////////////////////////////////////
// Publicar un mensaje MQTT
// POST /api/mqtt
//////////////////////////////////////////////////
router.post('/',
    [
        validarCampos
    ],
    consultaIA
);

//////////////////////////////////////////////////
// Obtener todos los registros (carga inicial)
// GET /api/consulta/all
//////////////////////////////////////////////////
router.get('/all', getAllData);

//////////////////////////////////////////////////
// Eliminar un registro
// DELETE /api/consulta/datalogger/:id
// DELETE /api/consulta/caracterizacion/:id
//////////////////////////////////////////////////
router.delete('/datalogger/:id', deleteDatalogger);
router.delete('/caracterizacion/:id', deleteCaracterizacion);
router.delete('/comparacion/:id', deleteComparacion);

//////////////////////////////////////////////////
// Actualizar un registro (inline edit)
// PUT /api/consulta/datalogger/:id
// PUT /api/consulta/caracterizacion/:id
// PUT /api/consulta/comparacion/:id
//////////////////////////////////////////////////
router.put('/datalogger/:id', updateDatalogger);
router.put('/caracterizacion/:id', updateCaracterizacion);
router.put('/comparacion/:id', updateComparacion);


//////////////////////////////////////////////////

module.exports = router;
