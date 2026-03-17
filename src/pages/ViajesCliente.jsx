import { useState, useEffect, useRef } from 'react';
import { dashboardService } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import XLSX from 'xlsx-js-style';
import './ViajesCliente.css';

const ViajesCliente = () => {
  const [clientes, setClientes] = useState([]);
  const [placas, setPlacas] = useState([]);
  const [meses, setMeses] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedPlaca, setSelectedPlaca] = useState('');
  const [selectedMes, setSelectedMes] = useState('');
  const [diasViajes, setDiasViajes] = useState([]);
  const [viajesPorPlaca, setViajesPorPlaca] = useState([]);
  const [resumen, setResumen] = useState({ viajes: 0, traslados: 0 });
  const [loading, setLoading] = useState(true);
  const contentRef = useRef(null);
  const graficPlacaRef = useRef(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPlacaPdf, setExportingPlacaPdf] = useState(false);

  // Paleta de colores equilibrada
  const COLORS = [
    '#1B7430', '#4A86B8', '#C4883A', '#8E6BAD', '#3A9E9E',
    '#C06050', '#5D8A5D', '#6882A8', '#B87840', '#9E6575'
  ];

  // Cargar filtros iniciales y cuando cambian los filtros seleccionados
  useEffect(() => {
    loadFiltros();
  }, [selectedCliente, selectedPlaca, selectedMes]);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    loadData();
  }, [selectedCliente, selectedPlaca, selectedMes]);

  const loadFiltros = async () => {
    try {
      const filters = {};
      if (selectedCliente) filters.cliente = selectedCliente;
      if (selectedPlaca) filters.unidad = selectedPlaca;
      if (selectedMes) filters.mes = selectedMes;
      const segmentadores = await dashboardService.getSegmentadoresFiltrados(filters);
      setClientes(segmentadores.clientes || []);
      setPlacas(segmentadores.unidades || []);
      setMeses(segmentadores.meses || []);
    } catch (error) {
      console.error('Error cargando filtros:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (selectedCliente) filters.cliente = selectedCliente;
      if (selectedPlaca) filters.unidad = selectedPlaca;
      if (selectedMes) filters.mes = selectedMes;

      console.log('[ViajesCliente] Cargando datos con filtros:', filters);

      const [diasRes, placasRes, resumenRes] = await Promise.all([
        dashboardService.getDiasConViajes(filters),
        dashboardService.getViajesPorPlaca(filters),
        dashboardService.getResumenViajesCliente(filters),
      ]);

      console.log('[ViajesCliente] getDiasConViajes — total filas:', diasRes?.length);
      if (diasRes?.length > 0) {
        console.log('[ViajesCliente] Primeras 3 filas:', diasRes.slice(0, 3));
        console.log('[ViajesCliente] Tipos fila[0]:', {
          fecha: typeof diasRes[0].fecha, fechaVal: diasRes[0].fecha,
          traslados: typeof diasRes[0].traslados, trasladosVal: diasRes[0].traslados,
          tonelaje_recibido: typeof diasRes[0].tonelaje_recibido, tonelajeVal: diasRes[0].tonelaje_recibido,
        });
      }
      console.log('[ViajesCliente] getViajesPorPlaca — total filas:', placasRes?.length);
      console.log('[ViajesCliente] getResumenViajesCliente:', resumenRes);

      setDiasViajes(diasRes || []);
      setViajesPorPlaca((placasRes || []).map(item => ({ ...item, viajes: parseInt(item.viajes) || 0 })));
      setResumen(resumenRes || { viajes: 0, traslados: 0 });
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    // Parsear solo la parte YYYY-MM-DD para evitar el desfase de timezone UTC-5.
    // Si hacemos new Date("2026-01-01T00:00:00.000Z") en Peru, da 31/12/2025.
    const dateStr = typeof fecha === 'string' ? fecha.substring(0, 10) : new Date(fecha).toISOString().substring(0, 10);
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // fecha local, sin UTC
    return date.toLocaleDateString('es-PE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const limpiarFiltros = () => {
    setSelectedCliente('');
    setSelectedPlaca('');
    setSelectedMes('');
  };

  const capitalizeText = (text) => {
    if (!text) return '';
    return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const descargarPDF = async () => {
    if (!contentRef.current) return;
    setExportingPdf(true);
    try {
      const filterParts = [];
      if (selectedMes) filterParts.push(capitalizeText(selectedMes));
      if (selectedCliente) filterParts.push(capitalizeText(selectedCliente));
      if (selectedPlaca) filterParts.push(`Placa: ${selectedPlaca.toUpperCase()}`);
      const subtitle = filterParts.length > 0 ? filterParts.join(' \u2014 ') : 'General';

      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = 'text-align:center;padding:20px 0 14px;border-bottom:3px solid #1B7430;margin-bottom:14px;';
      titleDiv.innerHTML = `<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:800;color:#1B7430;letter-spacing:0.5px;">Viajes por Cliente</div><div style="font-family:'Segoe UI',Arial,sans-serif;font-size:18px;color:#333;margin-top:8px;font-weight:500;letter-spacing:0.3px;">${subtitle}</div>`;
      contentRef.current.insertBefore(titleDiv, contentRef.current.firstChild);

      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#f5f5f5' });
      contentRef.current.removeChild(titleDiv);

      const imgData = canvas.toDataURL('image/png');
      const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('Viajes_por_Cliente.pdf');
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const descargarDiasExcel = () => {
    if (diasViajes.length === 0) return;
    const wb = XLSX.utils.book_new();
    const colCount = 3;
    const titleStyle = { font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1B7430' } }, alignment: { horizontal: 'center', vertical: 'center' } };
    const filterStyle = { font: { bold: false, sz: 11, color: { rgb: '333333' } }, fill: { fgColor: { rgb: 'E8F5E9' } }, alignment: { horizontal: 'center', vertical: 'center' } };
    const filterParts = [];
    if (selectedMes) filterParts.push(capitalizeText(selectedMes));
    if (selectedCliente) filterParts.push(capitalizeText(selectedCliente));
    if (selectedPlaca) filterParts.push(`Placa: ${selectedPlaca.toUpperCase()}`);
    const filterText = filterParts.length > 0 ? filterParts.join(' \u2014 ') : 'Sin filtros';

    const titleRow = Array(colCount).fill({ v: '', s: titleStyle });
    titleRow[0] = { v: 'D\u00edas con Viajes', s: titleStyle };
    const filterRow = Array(colCount).fill({ v: '', s: filterStyle });
    filterRow[0] = { v: filterText, s: filterStyle };
    const emptyRow = Array(colCount).fill({ v: '' });

    const hStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1B7430' } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'medium', color: { rgb: '145A25' } } } };
    const cellL = { font: { sz: 10 }, alignment: { horizontal: 'left' }, border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const cellR = { font: { sz: 10 }, alignment: { horizontal: 'right' }, numFmt: '#,##0.00', border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const cellN = { font: { sz: 10 }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };

    const rows = [
      titleRow, filterRow, emptyRow,
      [{ v: 'Fecha', s: hStyle }, { v: 'Traslados', s: hStyle }, { v: 'Tonelaje Recibido (TN)', s: hStyle }],
      ...diasViajes.map(dia => [
        { v: formatFecha(dia.fecha), s: cellL },
        { v: parseInt(dia.traslados) || 0, t: 'n', s: cellN },
        { v: Math.round((Number(dia.tonelaje_recibido) || 0) * 100) / 100, t: 'n', s: cellR },
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 22 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'D\u00edas con Viajes');
    XLSX.writeFile(wb, 'Dias_con_Viajes.xlsx');
  };

  const descargarPlacaPDF = async () => {
    if (!graficPlacaRef.current) return;
    setExportingPlacaPdf(true);
    try {
      const filterParts = [];
      if (selectedMes) filterParts.push(capitalizeText(selectedMes));
      if (selectedCliente) filterParts.push(capitalizeText(selectedCliente));
      if (selectedPlaca) filterParts.push(`Placa: ${selectedPlaca.toUpperCase()}`);
      const subtitle = filterParts.length > 0 ? filterParts.join(' \u2014 ') : 'General';

      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = 'text-align:center;padding:20px 0 14px;border-bottom:3px solid #1B7430;margin-bottom:14px;';
      titleDiv.innerHTML = `<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:800;color:#1B7430;letter-spacing:0.5px;">Traslados por Placa</div><div style="font-family:'Segoe UI',Arial,sans-serif;font-size:18px;color:#333;margin-top:8px;font-weight:500;letter-spacing:0.3px;">${subtitle}</div>`;
      graficPlacaRef.current.insertBefore(titleDiv, graficPlacaRef.current.firstChild);

      const canvas = await html2canvas(graficPlacaRef.current, { scale: 2, useCORS: true, backgroundColor: '#f5f5f5' });
      graficPlacaRef.current.removeChild(titleDiv);

      const imgData = canvas.toDataURL('image/png');
      const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('Traslados_por_Placa.pdf');
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setExportingPlacaPdf(false);
    }
  };

  return (
    <div className="viajes-cliente-container">
      <h1>Viajes por Cliente</h1>

      {/* Filtros */}
      <div className="filtros-viajes">
        <div className="filtro-group">
          <label>Mes</label>
          <select
            value={selectedMes}
            onChange={(e) => setSelectedMes(e.target.value)}
          >
            <option value="">-- Todos --</option>
            {meses.map((mes, idx) => (
              <option key={idx} value={mes}>{mes}</option>
            ))}
          </select>
        </div>

        <div className="filtro-group">
          <label>Cliente</label>
          <select
            value={selectedCliente}
            onChange={(e) => setSelectedCliente(e.target.value)}
          >
            <option value="">-- Todos --</option>
            {clientes.map((cliente, idx) => (
              <option key={idx} value={cliente}>{cliente}</option>
            ))}
          </select>
        </div>

        <div className="filtro-group">
          <label>Placa (Unidad)</label>
          <select
            value={selectedPlaca}
            onChange={(e) => setSelectedPlaca(e.target.value)}
          >
            <option value="">-- Todas --</option>
            {placas.map((placa, idx) => (
              <option key={idx} value={placa}>{placa}</option>
            ))}
          </select>
        </div>

        <button className="btn-limpiar" onClick={limpiarFiltros}>
          Limpiar Filtros
        </button>

        <button
          className="btn-limpiar"
          onClick={descargarPDF}
          disabled={exportingPdf}
          style={{ marginLeft: 'auto', background: '#1B7430', color: '#fff', border: 'none' }}
        >
          {exportingPdf ? 'Generando...' : '\uD83D\uDCE5 Descargar PDF'}
        </button>
      </div>

      {loading ? (
        <div className="loading-section"><div className="spinner"></div></div>
      ) : (
        <div ref={contentRef}>
          {/* Indicadores */}
          <div className="indicadores-viajes">
            <div className="indicador-card">
              <div className="indicador-icon">🚛</div>
              <div className="indicador-content">
                <h3>Viajes</h3>
                <p className="indicador-value">{resumen.viajes}</p>
                <span className="indicador-label">Por fecha y cliente</span>
              </div>
            </div>

            <div className="indicador-card">
              <div className="indicador-icon">🚛</div>
              <div className="indicador-content">
                <h3>Traslados</h3>
                <p className="indicador-value">{resumen.traslados}</p>
                <span className="indicador-label">Total documentos</span>
              </div>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="contenido-viajes">
            {/* Lista de días */}
            <div className="seccion-dias">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Días con Viajes</h2>
                <button
                  className="btn-limpiar"
                  onClick={descargarDiasExcel}
                  disabled={diasViajes.length === 0}
                  style={{ background: '#1B7430', color: '#fff', border: 'none', fontSize: 13, padding: '6px 14px' }}
                >
                  📥 Descargar Excel
                </button>
              </div>
              {diasViajes.length === 0 ? (
                <p className="empty-message">No hay viajes registrados</p>
              ) : (
                <div className="tabla-dias">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Traslados</th>
                        <th>Tonelaje Recibido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diasViajes.map((dia, idx) => (
                        <tr key={idx}>
                          <td>{formatFecha(dia.fecha)}</td>
                          <td>{dia.traslados}</td>
                          <td>
                            {dia.tonelaje_recibido != null
                              ? `${Number(dia.tonelaje_recibido).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TN`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Gráfico de barras */}
            <div className="seccion-grafico" ref={graficPlacaRef}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Traslados por Placa</h2>
                <button
                  className="btn-limpiar"
                  onClick={descargarPlacaPDF}
                  disabled={exportingPlacaPdf || viajesPorPlaca.length === 0}
                  style={{ background: '#1B7430', color: '#fff', border: 'none', fontSize: 13, padding: '6px 14px' }}
                >
                  {exportingPlacaPdf ? 'Generando...' : '\uD83D\uDCE5 Descargar PDF'}
                </button>
              </div>
              {viajesPorPlaca.length === 0 ? (
                <p className="empty-message">No hay datos para mostrar</p>
              ) : (
                <div className="grafico-container">
                  <ResponsiveContainer width="100%" height={Math.max(400, viajesPorPlaca.length * 25)}>
                    <BarChart
                      data={viajesPorPlaca}
                      layout="vertical"
                      margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="placa"
                        type="category"
                        width={80}
                        tick={{ fontSize: 11, fill: '#555' }}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} traslados`, 'Traslados']}
                        labelFormatter={(label) => `Placa: ${label}`}
                      />
                      <Bar dataKey="viajes" name="Traslados">
                        {viajesPorPlaca.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList dataKey="viajes" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#333' }} formatter={(value) => Number(value) === 1 ? `${value} traslado` : `${value} traslados`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViajesCliente;
