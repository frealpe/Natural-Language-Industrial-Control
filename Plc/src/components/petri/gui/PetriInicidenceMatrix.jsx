import React from "react";

const PetriIncidenceMatrix = ({ json, onElementClick, selectedElement }) => {
  const { place = [], transition = [], arc = [] } = json?.pnml?.net || {};

  return (
    <div>
      <h5>Matriz de Incidencia</h5>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th></th>
            {transition.map((t) => (
              <th
                key={t.id}
                onClick={() => onElementClick && onElementClick(t)}
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    selectedElement?.id === t.id ? "#d0ebff" : "transparent",
                  border: "1px solid #ccc",
                  padding: "4px",
                }}
              >
                {t.id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {place.map((p) => (
            <tr key={p.id}>
              <td
                onClick={() => onElementClick && onElementClick(p)}
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    selectedElement?.id === p.id ? "#ffe5d0" : "transparent",
                  border: "1px solid #ccc",
                  padding: "4px",
                }}
              >
                {p.id}
              </td>
              {transition.map((t) => {
                const arcST = arc.find((a) => a.source === p.id && a.target === t.id);
                const arcTS = arc.find((a) => a.source === t.id && a.target === p.id);
                const val = (arcST?.weight || 0) - (arcTS?.weight || 0);
                return (
                  <td
                    key={`${p.id}-${t.id}`}
                    onClick={() =>
                      onElementClick &&
                      onElementClick(arcST || arcTS || { id: `${p.id}-${t.id}` })
                    }
                    style={{
                      textAlign: "center",
                      border: "1px solid #ccc",
                      padding: "4px",
                      cursor: "pointer",
                      backgroundColor:
                        selectedElement?.id === (arcST?.id || arcTS?.id)
                          ? "#e6ffe6"
                          : "transparent",
                    }}
                  >
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PetriIncidenceMatrix;
