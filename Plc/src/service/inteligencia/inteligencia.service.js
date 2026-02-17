import { iotApi } from "../../api/iotApi";

class InteligenciaService {
  static enviarMensajeIA = async (mensaje) => {
    try {
        
        // Crear objeto con la propiedad que espera el backend
        // Enviar a la API
        const resp = await iotApi.post('/mqttallcomp/ia', mensaje); // <-- propiedad correcta
        const datos = resp.data;
        // console.log("Respuesta del servicio",datos);
      return {
        ok: true,
        datos,
      };
    } catch (error) {
      console.error(error);
      const errorMessage = "Las estaciones no se pudieron cargar";  
      return {
        ok: false,
        errorMessage,
      };
    }
  };
}

export default InteligenciaService;
