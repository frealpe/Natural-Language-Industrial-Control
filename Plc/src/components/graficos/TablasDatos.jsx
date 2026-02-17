import React, { useState, useEffect } from "react";
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CCard,
  CCardBody,
} from "@coreui/react-pro";
import CIcon from "@coreui/icons-react";
import { cilPencil, cilTrash, cilCheck, cilX, cilCloudDownload } from "@coreui/icons";
import { CFormInput } from "@coreui/react-pro";
import "./Tabla.scss";

const TablasDatos = ({ registro, onSelectionChange = () => { }, onDelete = () => { }, onUpdate = () => { }, onDownload = () => { } }) => {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [tempData, setTempData] = useState([]);  // Almacena el array 'resultado' en edición
  const [expandedRow, setExpandedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set()); // 👈 Nuevo estado
  const itemsPerPage = 4;

  useEffect(() => {
    if (!registro) {
      setItems([]);
      setSelectedIds(new Set());
      return;
    }

    const registrosArray = Array.isArray(registro) ? registro : [registro];
    const datosNormalizados = registrosArray.map((r) => ({
      id: r.id,
      prueba: r.prueba,
      //prueba: new Date(r.prueba).toLocaleString("es-CO"),
      resultado: r.resultado || [],
    }));

    setItems(datosNormalizados);
    setCurrentPage(1);
    // No reiniciamos selectedIds aquí para mantener selección al cambiar datos
  }, [registro]);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = items.slice(startIndex, startIndex + itemsPerPage);

  const handleRowClick = (item) => {
    // 🆕 Cambio solicitado: Click en fila = Seleccionar para gráfica (Toggle)
    // No expandir, solo seleccionar.
    const newSelected = new Set(selectedIds);
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      newSelected.add(item.id);
    }
    setSelectedIds(newSelected);
    onSelectionChange(Array.from(newSelected));
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setExpandedRow(null);
    }
  };

  if (items.length === 0) {
    return <p className="text-center">No hay datos disponibles</p>;
  }

  return (
    <div className="tabla-contenedor-scroll">
      <CTable striped bordered hover responsive size="sm" className="text-center align-middle">
        <CTableHead>
          <CTableRow>
            {/* Checkbox header */}
            <CTableHeaderCell style={{ width: "40px" }}>
              <input
                type="checkbox"
                checked={currentItems.length > 0 && currentItems.every(item => selectedIds.has(item.id))}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const newSelected = new Set(selectedIds);
                  if (checked) {
                    currentItems.forEach(item => newSelected.add(item.id));
                  } else {
                    currentItems.forEach(item => newSelected.delete(item.id));
                  }
                  setSelectedIds(newSelected);
                  onSelectionChange(Array.from(newSelected));
                }}
              />
            </CTableHeaderCell>
            <CTableHeaderCell style={{ width: "60px" }}>ID</CTableHeaderCell>
            <CTableHeaderCell>Fecha de medición Pruebas</CTableHeaderCell>
            <CTableHeaderCell style={{ width: "160px" }}>Acciones</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {currentItems.map((item) => (
            <React.Fragment key={item.id}>
              <CTableRow onClick={() => handleRowClick(item)} style={{ cursor: "pointer" }}>
                {/* Checkbox por fila */}
                <CTableDataCell style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleRowClick(item); // Reutilizar logica
                    }}
                  />
                </CTableDataCell>
                <CTableDataCell>{item.id}</CTableDataCell>
                <CTableDataCell
                  onClick={() => handleRowClick(item)}
                  style={{ cursor: "pointer", fontWeight: 'bold' }}
                  title="Click para ver en gráfica"
                >
                  {item.prueba}
                </CTableDataCell>
                <CTableDataCell onClick={(e) => e.stopPropagation()}>
                  {editingId === item.id ? (
                    <>
                      <button
                        className="btn btn-sm btn-ghost-success me-1"
                        title="Guardar"
                        onClick={() => {
                          onUpdate(item.id, { resultado: tempData });
                          setEditingId(null);
                          setExpandedRow(null); // Colapsar al guardar
                        }}>
                        <CIcon icon={cilCheck} />
                      </button>
                      <button
                        className="btn btn-sm btn-ghost-secondary"
                        title="Cancelar"
                        onClick={() => {
                          setEditingId(null);
                          setExpandedRow(null); // Colapsar al cancelar
                        }}>
                        <CIcon icon={cilX} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-sm btn-ghost-primary me-1"
                        title="Editar"
                        onClick={() => {
                          setEditingId(item.id);
                          setTempData([...item.resultado]); // Clonar datos actuales
                          setExpandedRow(item.id); // Expandir fila automáticamente
                        }}>
                        <CIcon icon={cilPencil} />
                      </button>
                      <button
                        className="btn btn-sm btn-ghost-danger"
                        title="Eliminar"
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de eliminar el registro ID ${item.id}?`)) {
                            onDelete(item.id);
                          }
                        }}
                      >
                        <CIcon icon={cilTrash} />
                      </button>
                      <button
                        className="btn btn-sm btn-ghost-info"
                        title="Descargar CSV"
                        onClick={() => onDownload(item.id)}
                      >
                        <CIcon icon={cilCloudDownload} />
                      </button>
                    </>
                  )}
                </CTableDataCell>
              </CTableRow>

              {expandedRow === item.id && (
                <CTableRow>
                  <CTableDataCell colSpan={4} style={{ padding: 0 }}>
                    <CCard className="tabla-detalle-card m-0">
                      <CCardBody>
                        {item.resultado.length > 0 ? (
                          <div className="tabla-detalle-scroll">
                            <CTable striped bordered hover responsive size="sm" className="text-center align-middle">
                              <CTableHead>
                                <CTableRow>
                                  <CTableHeaderCell>#</CTableHeaderCell>
                                  <CTableHeaderCell>Tiempo (s)</CTableHeaderCell>
                                  <CTableHeaderCell>Voltaje (V)</CTableHeaderCell>
                                  {/* <CTableHeaderCell>Error</CTableHeaderCell> */}
                                </CTableRow>
                              </CTableHead>
                              <CTableBody>
                                {(editingId === item.id ? tempData : item.resultado).map((r, i) => (
                                  <CTableRow key={i}>
                                    <CTableDataCell>{i + 1}</CTableDataCell>
                                    <CTableDataCell>
                                      {editingId === item.id ? (
                                        <CFormInput
                                          size="sm"
                                          type="number"
                                          value={r.tiempo}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTempData(prev => {
                                              const copy = [...prev];
                                              copy[i] = { ...copy[i], tiempo: isNaN(val) ? e.target.value : val };
                                              return copy;
                                            });
                                          }}
                                        />
                                      ) : r.tiempo}
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {editingId === item.id ? (
                                        <CFormInput
                                          size="sm"
                                          type="number"
                                          value={r.voltaje}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTempData(prev => {
                                              const copy = [...prev];
                                              copy[i] = { ...copy[i], voltaje: isNaN(val) ? e.target.value : val };
                                              return copy;
                                            });
                                          }}
                                        />
                                      ) : r.voltaje}
                                    </CTableDataCell>
                                  </CTableRow>
                                ))}
                              </CTableBody>
                            </CTable>
                          </div>
                        ) : (
                          <p className="text-center m-0">No hay datos en el resultado.</p>
                        )}
                      </CCardBody>
                    </CCard>
                  </CTableDataCell>
                </CTableRow>
              )}
            </React.Fragment>
          ))}
        </CTableBody>
      </CTable>

      {/* Controles de paginación compactos */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-2">
          <button
            className="btn btn-sm btn-outline-secondary me-1 py-0 px-2"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            title="Página anterior"
          >
            {'<<'}
          </button>
          <span className="align-self-center mx-2" style={{ fontSize: '0.875rem' }}>
            {currentPage}/{totalPages}
          </span>
          <button
            className="btn btn-sm btn-outline-secondary ms-1 py-0 px-2"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Página siguiente"
          >
            {'>>'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TablasDatos;