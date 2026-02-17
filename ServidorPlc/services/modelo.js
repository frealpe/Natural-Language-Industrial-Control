
// Modelo ARX Generado 2026-01-17T15:10:20.427Z (IA)
// Orden: 1 | Ts: 0.100000 s | Var: 1.000e-4

let y_1;
let u_1;

y_1 = 0;
u_1 = 0;

function modeloPlanta(u) {
  const y = (0.945000 * y_1) + (0.000000 * u) + (0.100000 * u_1);

  
  y_1 = y;

  
  u_1 = u;

  return y;
}

const coeficientes = {
  "a1": 0.945,
  "b0": 0,
  "b1": 0.1
};

module.exports = { modeloPlanta, coeficientes };
