
import React, { useState, useEffect } from "react";
import {
    CTable,
    CTableHead,
    CTableRow,
    CTableHeaderCell,
    CTableBody,
    CTableDataCell,
    CPagination,
    CPaginationItem,
    CButton,
    CCollapse,
    CCard,
    CCardBody,
} from "@coreui/react-pro";
import CIcon from "@coreui/icons-react";
import { cilPencil, cilTrash, cilCheck, cilX, cilCloudDownload } from "@coreui/icons";
import { CFormInput } from "@coreui/react-pro";
import "./Tabla.scss";

const TablasComparacion = ({ registro, onSelectionChange = () => { }, onDelete = () => { }, onUpdate = () => { }, onDownload = () => { } }) => {
    const [items, setItems] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [tempData, setTempData] = useState([]);
    const [expandedRow, setExpandedRow] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const itemsPerPage = 4;

    useEffect(() => {
        if (registro) {
            setItems(registro);
        }
    }, [registro]);

    // Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(items.length / itemsPerPage);

    // Manejo de checkboxes
    const handleCheckboxChange = (id) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
        } else {
            newSelectedIds.add(id);
        }
        setSelectedIds(newSelectedIds);
        onSelectionChange(Array.from(newSelectedIds));
    };

    const toggleRow = (id) => {
        // 🆕 Cambio solicitado: Click en fila = Seleccionar para gráfica (Toggle)
        // No expandir, solo seleccionar.
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
        } else {
            newSelectedIds.add(id);
        }
        setSelectedIds(newSelectedIds);
        onSelectionChange(Array.from(newSelectedIds));
    };

    return (
        <div className="tabla-container">
            <div className="table-responsive">
                <CTable striped hover responsive className="align-middle shadow-sm tabla-bonita">
                    <CTableHead color="dark">
                        <CTableRow>
                            <CTableHeaderCell className="text-center" style={{ width: "50px" }}>
                                <input
                                    type="checkbox"
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            const allIds = new Set(currentItems.map(i => i.id));
                                            setSelectedIds(allIds);
                                            onSelectionChange(Array.from(allIds));
                                        } else {
                                            setSelectedIds(new Set());
                                            onSelectionChange([]);
                                        }
                                    }}
                                    checked={currentItems.length > 0 && currentItems.every(i => selectedIds.has(i.id))}
                                />
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ width: "60px" }}>ID</CTableHeaderCell>
                            <CTableHeaderCell>Prueba</CTableHeaderCell>
                            <CTableHeaderCell className="text-end" style={{ width: "160px" }}>Acciones</CTableHeaderCell>
                        </CTableRow>
                    </CTableHead>
                    <CTableBody>
                        {currentItems.map((item) => (
                            <React.Fragment key={item.id}>
                                <CTableRow
                                    onClick={() => toggleRow(item.id)}
                                    style={{ cursor: "pointer" }}
                                    active={expandedRow === item.id}
                                >
                                    <CTableDataCell className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                toggleRow(item.id); // Reutilizar logica
                                            }}
                                        />
                                    </CTableDataCell>
                                    <CTableDataCell>{item.id}</CTableDataCell>
                                    <CTableDataCell
                                        onClick={() => toggleRow(item.id)}
                                        style={{ cursor: "pointer", fontWeight: 'bold' }}
                                        title="Click para ver en gráfica"
                                    >
                                        {item.prueba}
                                    </CTableDataCell>
                                    <CTableDataCell onClick={(e) => e.stopPropagation()} className="text-end">
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
                                                        // Asegurarnos de clonar la estructura
                                                        setTempData(item.resultado.map(r => ({ ...r })));
                                                        setExpandedRow(item.id);
                                                    }}>
                                                    <CIcon icon={cilPencil} />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-ghost-danger"
                                                    title="Eliminar"
                                                    onClick={() => {
                                                        if (window.confirm(`¿Estás seguro de eliminar la comparación ID ${item.id}?`)) {
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

                                {/* Subtabla con datos del resultado */}
                                {expandedRow === item.id && (
                                    <CTableRow>
                                        <CTableDataCell colSpan={4} style={{ padding: 0 }}>
                                            <CCard className="tabla-detalle-card m-0">
                                                <CCardBody>
                                                    {item.resultado && item.resultado.length > 0 ? (
                                                        <div className="tabla-detalle-scroll">
                                                            <CTable striped bordered hover responsive size="sm" className="text-center align-middle">
                                                                <CTableHead>
                                                                    <CTableRow>
                                                                        <CTableHeaderCell>#</CTableHeaderCell>
                                                                        {Object.keys(item.resultado[0]).map((key) => (
                                                                            <CTableHeaderCell key={key}>{key}</CTableHeaderCell>
                                                                        ))}
                                                                    </CTableRow>
                                                                </CTableHead>
                                                                <CTableBody>
                                                                    {(editingId === item.id ? tempData : item.resultado).map((r, i) => (
                                                                        <CTableRow key={`${item.id}-${i}`}>
                                                                            <CTableDataCell>{i + 1}</CTableDataCell>
                                                                            {Object.keys(item.resultado[0]).map((key) => (
                                                                                <CTableDataCell key={key}>
                                                                                    {editingId === item.id ? (
                                                                                        <CFormInput
                                                                                            size="sm"
                                                                                            type="number"
                                                                                            value={r[key]}
                                                                                            onChange={(e) => {
                                                                                                const val = parseFloat(e.target.value);
                                                                                                setTempData(prev => {
                                                                                                    const copy = [...prev];
                                                                                                    copy[i] = { ...copy[i], [key]: isNaN(val) ? e.target.value : val };
                                                                                                    return copy;
                                                                                                });
                                                                                            }}
                                                                                        />
                                                                                    ) : (r[key] ?? "-")}
                                                                                </CTableDataCell>
                                                                            ))}
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
            </div>

            <CPagination align="center" aria-label="Page navigation" className="mt-3">
                <CPaginationItem disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                    Anterior
                </CPaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                    <CPaginationItem key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
                        {i + 1}
                    </CPaginationItem>
                ))}
                <CPaginationItem disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                    Siguiente
                </CPaginationItem>
            </CPagination>
        </div>
    );
};

export default TablasComparacion;
