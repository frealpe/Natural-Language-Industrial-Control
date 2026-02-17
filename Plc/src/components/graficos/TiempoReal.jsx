import React, { useEffect, useState } from 'react';
import { VegaLite } from 'react-vega';
import * as vl from 'vega-lite-api';

const TiempoReal = ({ datosrt, width, height, reset }) => {
  const [data, setData] = useState([]); // Iniciar vacío para evitar líneas fantasma (Canal 0)
  const [spec, setSpec] = useState(null);

  // Resetear datos si reset es true
  useEffect(() => {
    if (reset) {
      setData([]); // limpiar datos
    }
  }, [reset]);

  useEffect(() => {
    if (!datosrt) return;

    // CASO 1: Comparación (Real vs Modelo) - Graficar dos líneas
    if ((datosrt.canal === "Comparacion" || datosrt.canal === "Identificado") && datosrt.voltaje0 !== undefined && datosrt.voltaje1 !== undefined) {
      const p1 = { tiempo: datosrt.tiempo, valor: datosrt.voltaje0, canal: "Planta Real" };
      const p2 = { tiempo: datosrt.tiempo, valor: datosrt.voltaje1, canal: "Modelo Identificado" };
      setData(prev => [...prev, p1, p2]);
      return;
    }

    // CASO 2: Datos normales (ADC / Caracterización)
    if (datosrt.conversion !== undefined || datosrt.voltaje !== undefined) {
      // Si el backend envía 'voltaje' ya calculado (ej. Caracterización), usarlo.
      // Si no, calcularlo asumiendo 8.8V max y 12 bits.
      let voltaje;
      if (datosrt.voltaje !== undefined) {
        voltaje = datosrt.voltaje;
      } else {
        voltaje = (datosrt.conversion / 4095) * 8.8;
      }

      const nuevo = {
        tiempo: parseFloat(datosrt.tiempo?.toFixed(3) || 0),
        valor: parseFloat(voltaje?.toFixed(3) || 0),
        canal: `C ${datosrt.canal ?? 0}`,
      };

      setData((prev) => [...prev, nuevo]);
    }
  }, [datosrt]);

  useEffect(() => {
    if (!data || width === 0 || height === 0) return;

    const baseSpec = vl
      .markLine({ point: true })
      .encode(
        vl.x().fieldQ('tiempo').title('Tiempo (s)').scale({ domainMin: 0 }),
        vl.y().fieldQ('valor').title('Voltaje (V)').scale({ domain: [0, 10] }),
        vl.color().fieldN('canal').title('Canal').legend({ orient: 'bottom' })
      )
      .width(width)
      .height(height)
      .autosize({ type: 'fit', contains: 'padding' })
      .data(data)
      .config({
        view: { stroke: 'transparent' },
        axis: { labelFontSize: 11, titleFontSize: 13 },
      })
      .toSpec();

    baseSpec.selection = {
      zoom: { type: 'interval', encodings: ['x'], bind: 'scales' },
    };

    setSpec(baseSpec);
  }, [data, width, height]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {spec ? (
        <VegaLite spec={spec} actions={false} />
      ) : (
        <div style={{ color: '#888', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Esperando datos...
        </div>
      )}
    </div>
  );
};


export default TiempoReal;
