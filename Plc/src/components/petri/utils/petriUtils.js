// utils/petriUtils.js
export const fireTransition = (transitionId, nodes, edges, setNodes) => {
  // Encontrar arcos conectados a la transición
  const incomingEdges = edges.filter(e => e.target === transitionId);
  const outgoingEdges = edges.filter(e => e.source === transitionId);

  // Encontrar lugares conectados
  const inputPlaces = incomingEdges.map(e => ({
    node: nodes.find(n => n.id === e.source),
    weight: e.data?.weight || 1,
  }));

  const outputPlaces = outgoingEdges.map(e => ({
    node: nodes.find(n => n.id === e.target),
    weight: e.data?.weight || 1,
  }));

  // Verificar tokens suficientes según el peso
  const canFire = inputPlaces.every(
    p => p.node?.data.tokens >= p.weight
  );

  if (!canFire) {
    alert("❌ No hay tokens suficientes para disparar esta transición");
    return;
  }

  // Actualizar tokens respetando los pesos
  setNodes(nds =>
    nds.map(n => {
      const input = inputPlaces.find(p => p.node?.id === n.id);
      const output = outputPlaces.find(p => p.node?.id === n.id);

      if (input) {
        return {
          ...n,
          data: { ...n.data, tokens: n.data.tokens - input.weight },
        };
      }
      if (output) {
        return {
          ...n,
          data: { ...n.data, tokens: n.data.tokens + output.weight },
        };
      }
      return n;
    })
  );
};
