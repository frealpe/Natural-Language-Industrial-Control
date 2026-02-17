/**
 * Agente IA para evaluación y selección de estructuras de modelo
 */
class AgenteIA {
  constructor() {
    this.historial = [];
  }

  /**
   * Evalúa la calidad del modelo basándose en métricas estadísticas
   * y decide qué estructura de modelo es más apropiada
   * @param {Object} metricas - {errores, varianza, autocorr}
   * @returns {string} Tipo de modelo recomendado
   */
  evaluar({ errores, varianza, autocorr }) {
    const score = {
      ARX: 0,
      ARMAX: 0,
      BJ: 0,
    };

    // Heurísticas basadas en análisis de residuos
    
    // Si autocorrelación es baja → modelo ARX es suficiente
    if (Math.abs(autocorr) < 0.15) {
      score.ARX += 2;
    } else {
      // Autocorrelación alta → podría necesitar ARMAX
      score.ARMAX += 2;
    }

    // Si varianza es muy baja → sistema simple (ARX)
    if (varianza < 1e-4) {
      score.ARX += 1;
    } else {
      score.ARMAX += 1;
    }

    // Autocorrelación muy alta → considerar Box-Jenkins
    if (Math.abs(autocorr) > 0.35) {
      score.BJ += 3;
    }

    // Seleccionar el modelo con mayor puntuación
    const modelo = Object.entries(score)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Guardar en historial para análisis posterior
    this.historial.push({ modelo, varianza, autocorr });

    return modelo;
  }
}

module.exports = { AgenteIA };
