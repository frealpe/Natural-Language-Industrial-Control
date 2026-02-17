/**
 * RLS - Recursive Least Squares para identificación ARX
 * Implementa el algoritmo de mínimos cuadrados recursivos
 */
class RLS {
  constructor(orden, lambda = 0.98) {
    this.orden = orden;
    this.lambda = lambda; // Factor de olvido (reducido para más adaptabilidad)

    // Dimensión del vector de parámetros: [a1...an, b0...bn]
    const dim = 2 * orden + 1;

    // Vector de parámetros θ (inicializado en 0)
    this.theta = Array(dim).fill(0);

    // Matriz de covarianza P (inicializada con menor incertidumbre para estabilidad)
    this.P = Array(dim)
      .fill(0)
      .map((_, i) =>
        Array(dim)
          .fill(0)
          .map((_, j) => (i === j ? 10 : 0))  // Reducido de 1000 a 10
      );

    // Buffers de memoria para y[k-1], y[k-2], ..., u[k], u[k-1], ...
    this.y_mem = Array(orden).fill(0);
    this.u_mem = Array(orden).fill(0);
    
    // Contador de pasos (para descartar transitorio)
    this.paso = 0;
  }

  /**
   * Actualiza los parámetros con una nueva medición
   * @param {number} u - Entrada normalizada [0,1]
   * @param {number} y_real - Salida real normalizada [0,1]
   * @returns {number} error de predicción
   */
  step(u, y_real) {
    this.paso++;
    
    // Validación de entradas
    if (!isFinite(u) || !isFinite(y_real)) {
      console.warn("⚠️ RLS: Entrada no finita, saltando actualización");
      return 0;
    }

    // Vector de regresores: φ = [y[k-1], ..., y[k-n], u[k], u[k-1], ..., u[k-n]]
    const phi = [...this.y_mem, u, ...this.u_mem];

    // Predicción: ŷ = φᵀθ
    const y_pred = phi.reduce((sum, val, i) => sum + val * this.theta[i], 0);

    // Error de predicción
    const error = y_real - y_pred;
    
    // Validación de error
    if (!isFinite(error)) {
      console.warn("⚠️ RLS: Error no finito");
      return 0;
    }

    // P·φ
    const P_phi = this.P.map((fila) =>
      fila.reduce((sum, val, i) => sum + val * phi[i], 0)
    );

    // Denominador: λ + φᵀ·P·φ
    let denom = this.lambda + phi.reduce((sum, val, i) => sum + val * P_phi[i], 0);
    
    // Protección contra división por cero
    if (Math.abs(denom) < 1e-10) {
      denom = 1e-10;
    }

    // Ganancia de Kalman: K = P·φ / (λ + φᵀ·P·φ)
    const K = P_phi.map((val) => val / denom);

    // Actualización de parámetros: θ = θ + K·error
    this.theta = this.theta.map((val, i) => {
      const nuevo = val + K[i] * error;
      // Saturación para evitar divergencia
      return isFinite(nuevo) ? Math.max(-100, Math.min(100, nuevo)) : val;
    });

    // Actualización de matriz P: P = (P - K·φᵀ·P) / λ
    for (let i = 0; i < this.P.length; i++) {
      for (let j = 0; j < this.P.length; j++) {
        let nuevo = (this.P[i][j] - K[i] * phi[j] * P_phi[j]) / this.lambda;
        // Protección numérica
        this.P[i][j] = isFinite(nuevo) ? nuevo : (i === j ? 10 : 0);
      }
    }

    // Actualizar memoria (shift)
    this.y_mem.pop();
    this.y_mem.unshift(y_real);
    this.u_mem.pop();
    this.u_mem.unshift(u);

    return error;
  }

  /**
   * Obtiene los coeficientes identificados en formato {a1, a2, ..., b0, b1, ...}
   */
  getCoeficientes() {
    const coef = {};
    for (let i = 0; i < this.orden; i++) {
      coef[`a${i + 1}`] = this.theta[i];
    }
    for (let i = 0; i <= this.orden; i++) {
      coef[`b${i}`] = this.theta[this.orden + i];
    }
    return coef;
  }
}

module.exports = { RLS };
