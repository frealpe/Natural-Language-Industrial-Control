import React, { useEffect, useState, useRef } from 'react';
import { VegaLite } from 'react-vega';
import * as vl from 'vega-lite-api';

const CATEGORY10 = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

const Historicos = ({ registros = [], selectedIds = [], width = 470, height = 220 }) => {
  const [spec, setSpec] = useState(null);

  // ✅ Normalizar registros a array
  const registrosArray = Array.isArray(registros) ? registros : (registros ? [registros] : []);
  const registrosRef = useRef(registrosArray);

  // Actualizar el ref cuando registros cambie
  useEffect(() => {
    const normalized = Array.isArray(registros) ? registros : (registros ? [registros] : []);
    registrosRef.current = normalized;
  }, [registros]);

  useEffect(() => {
    const currentRegistros = registrosRef.current; // Siempre es array

    const datosSeleccionados = currentRegistros
      .filter(reg => selectedIds.includes(reg.id))
      .flatMap(reg =>
        (reg.resultado || []).flatMap(punto => {
          const t = parseFloat(punto.tiempo);
          // Caso específico: voltaje0 y voltaje1 (Comparación)
          if (punto.voltaje0 !== undefined && punto.voltaje1 !== undefined) {
            return [
              { tiempo: t, valor: parseFloat(punto.voltaje0), id: `${reg.id} (V0)` },
              { tiempo: t, valor: parseFloat(punto.voltaje1), id: `${reg.id} (V1)` }
            ];
          }
          // Caso genérico (Datalogger / Caracterización)
          return [{
            tiempo: t,
            valor: parseFloat(punto.voltaje ?? punto.salida ?? punto.y ?? punto.referencia ?? 0),
            id: reg.id,
          }];
        })
      );

    if (datosSeleccionados.length === 0) {
      setSpec(null);
      return;
    }

    const uniqueIds = [...new Set(datosSeleccionados.map(d => d.id))];
    const colorMap = {};
    uniqueIds.forEach((id, i) => {
      colorMap[id] = CATEGORY10[i % CATEGORY10.length];
    });

    const baseSpec = vl
      .markLine({ point: true, interpolate: 'linear' })
      .encode(
        vl.x().fieldQ('tiempo').title('Tiempo (s)'),
        vl.y().fieldQ('valor').title('Voltaje (V)').scale({ domain: [0, 10] }),
        vl
          .color()
          .fieldN('id')
          .title('Registro ID')
          .scale({
            domain: uniqueIds,
            range: uniqueIds.map(id => colorMap[id])
          })
          .legend({ orient: 'bottom' })
      )
      .width(width)
      .height(height)
      .autosize({ type: 'fit', contains: 'padding' })
      .data(datosSeleccionados)
      .config({
        view: { stroke: 'transparent' },
        axis: { labelFontSize: 11, titleFontSize: 13 },
        legend: { titleFontSize: 12, labelFontSize: 11 }
      })
      .toSpec();

    baseSpec.selection = {
      zoom: { type: 'interval', encodings: ['x'], bind: 'scales' },
    };

    setSpec(baseSpec);
  }, [selectedIds, width, height, registros]); // Incluimos registros para detectar cambios

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {spec ? (
        <VegaLite spec={spec} actions={false} />
      ) : (
        <div
          style={{
            color: '#888',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selectedIds.length === 0
            ? 'Selecciona registros para graficar'
            : 'Cargando gráfico...'}
        </div>
      )}
    </div>
  );
};

export default Historicos;