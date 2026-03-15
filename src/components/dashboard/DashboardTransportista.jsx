import { useState, useEffect, useRef } from 'react';
import { dashboardService } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import XLSX from 'xlsx-js-style';
import './DashboardComponents.css';

const fmtNum = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Paleta de colores equilibrada para gráficos
const COLORS = [
  '#1B7430', '#4A86B8', '#E8913A', '#8E6BAD',
  '#E05555', '#2BBBAD', '#F7C948', '#6C5CE7',
  '#FF6B81', '#17A2B8'
];

const DashboardTransportista = () => {
  const isMobile = useIsMobile();
  const contentRef = useRef(null);
  const [tnPorUnidad, setTnPorUnidad] = useState([]);
  const [tnPorCliente, setTnPorCliente] = useState([]);
  const [trasladosPorUnidad, setTrasladosPorUnidad] = useState([]);
  const [detalleTransportista, setDetalleTransportista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [divisaFiltro, setDivisaFiltro] = useState('');

  const descargarPDF = async () => {
    if (!contentRef.current) return;
    setExportingPdf(true);
    try {
      // Build filter subtitle
      const filterParts = [];
      if (localFilters.mes) filterParts.push(localFilters.mes);
      if (localFilters.cliente) filterParts.push(localFilters.cliente);
      if (localFilters.transportista) filterParts.push(localFilters.transportista);
      if (localFilters.unidad) filterParts.push(`Placa: ${localFilters.unidad}`);
      if (divisaFiltro) filterParts.push(divisaFiltro);
      const subtitle = filterParts.length > 0 ? filterParts.join(' — ') : 'General';

      // Hide divisa select during capture
      const divisaSelect = contentRef.current.querySelector('select');
      const origDisplay = divisaSelect ? divisaSelect.style.display : null;
      if (divisaSelect) divisaSelect.style.display = 'none';

      // Inject title
      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = 'text-align:center;padding:16px 0 12px;border-bottom:2px solid #1B7430;margin-bottom:12px;';
      titleDiv.innerHTML = `<div style="font-size:22px;font-weight:800;color:#1B7430;">Detalle Transportista</div><div style="font-size:14px;color:#333;margin-top:6px;">${subtitle}</div>`;
      contentRef.current.insertBefore(titleDiv, contentRef.current.firstChild);

      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#f5f5f5' });
      contentRef.current.removeChild(titleDiv);
      if (divisaSelect) divisaSelect.style.display = origDisplay;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('Detalle_Transportista.pdf');
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const descargarDetalleExcel = () => {
    const filtered = detalleTransportista.filter(item => !divisaFiltro || (item.divisa_cost || 'PEN') === divisaFiltro);
    if (filtered.length === 0) return;
    const wb = XLSX.utils.book_new();
    const hStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1B7430' } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'medium', color: { rgb: '145A25' } } } };
    const cellL = { font: { sz: 10 }, alignment: { horizontal: 'left' }, border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const cellR = { font: { sz: 10 }, alignment: { horizontal: 'right' }, numFmt: '#,##0.00', border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const cellN = { font: { sz: 10 }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const rows = [
      [{ v: 'Transportista', s: hStyle }, { v: 'Traslados', s: hStyle }, { v: 'Peso Ticket (TN)', s: hStyle }, { v: 'Divisa', s: hStyle }, { v: 'Precio con IGV', s: hStyle }],
      ...filtered.sort((a, b) => (parseInt(b.cantidad_traslados) || 0) - (parseInt(a.cantidad_traslados) || 0)).map(item => [
        { v: item.transportista || 'Sin asignar', s: cellL },
        { v: parseInt(item.cantidad_traslados) || 0, t: 'n', s: cellN },
        { v: Math.round((parseFloat(item.tn_recibido) || 0) * 100) / 100, t: 'n', s: cellR },
        { v: item.divisa_cost || 'PEN', s: cellN },
        { v: Math.round((parseFloat(item.precio_total) || 0) * 100) / 100, t: 'n', s: cellR },
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle Transportista');
    XLSX.writeFile(wb, 'Detalle_Transportista.xlsx');
  };

  const [localFilters, setLocalFilters] = useState({
    mes: '', cliente: '', transportista: '', unidad: ''
  });

  const [segmentadores, setSegmentadores] = useState({
    meses: [], clientes: [], transportistas: [], unidades: []
  });

  useEffect(() => {
    const init = async () => {
      try {
        const data = await dashboardService.getSegmentadoresFiltrados({});
        setSegmentadores({
          meses: data.meses || [],
          clientes: data.clientes || [],
          transportistas: data.transportistas || [],
          unidades: data.unidades || []
        });
      } catch (error) {
        console.error('Error cargando segmentadores:', error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    loadData();
  }, [localFilters]);

  const getActiveFilters = () => {
    const f = {};
    if (localFilters.mes) f.mes = localFilters.mes;
    if (localFilters.cliente) f.cliente = localFilters.cliente;
    if (localFilters.transportista) f.transportista = localFilters.transportista;
    if (localFilters.unidad) f.unidad = localFilters.unidad;
    return f;
  };

  const handleFilterChange = async (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setFiltersLoading(true);
    try {
      const activeForCascade = {};
      if (newFilters.mes) activeForCascade.mes = newFilters.mes;
      if (newFilters.cliente) activeForCascade.cliente = newFilters.cliente;
      if (newFilters.transportista) activeForCascade.transportista = newFilters.transportista;
      if (newFilters.unidad) activeForCascade.unidad = newFilters.unidad;

      const newSeg = await dashboardService.getSegmentadoresFiltrados(activeForCascade);

      // Resetear filtros que ya no son válidos
      if (newFilters.mes && !newSeg.meses.includes(newFilters.mes)) newFilters.mes = '';
      if (newFilters.cliente && !newSeg.clientes.includes(newFilters.cliente)) newFilters.cliente = '';
      if (newFilters.transportista && !newSeg.transportistas.includes(newFilters.transportista)) newFilters.transportista = '';
      if (newFilters.unidad && !newSeg.unidades.includes(newFilters.unidad)) newFilters.unidad = '';

      setSegmentadores({
        meses: newSeg.meses || [],
        clientes: newSeg.clientes || [],
        transportistas: newSeg.transportistas || [],
        unidades: newSeg.unidades || []
      });
      setLocalFilters(newFilters);
    } catch (error) {
      console.error('Error en filtros en cascada:', error);
      setLocalFilters(newFilters);
    } finally {
      setFiltersLoading(false);
    }
  };

  const clearFilters = async () => {
    setFiltersLoading(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setSegmentadores({
        meses: data.meses || [],
        clientes: data.clientes || [],
        transportistas: data.transportistas || [],
        unidades: data.unidades || []
      });
    } catch (error) {
      console.error('Error limpiando filtros:', error);
    } finally {
      setFiltersLoading(false);
    }
    setLocalFilters({ mes: '', cliente: '', transportista: '', unidad: '' });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const activeFilters = getActiveFilters();
      const [unidad, cliente, traslados, detalle] = await Promise.all([
        dashboardService.getTnPorUnidad(activeFilters),
        dashboardService.getTnPorCliente(activeFilters),
        dashboardService.getTrasladosPorUnidad(activeFilters),
        dashboardService.getDetalleTransportista(activeFilters),
      ]);
      setTnPorUnidad((unidad || []).map(item => ({ ...item, total: parseFloat(item.total) || 0 })));
      setTnPorCliente((cliente || []).map(item => ({ ...item, total: parseFloat(item.total) || 0 })));
      setTrasladosPorUnidad((traslados || []).map(item => ({ ...item, cantidad: parseInt(item.cantidad) || 0, tn_recibido: parseFloat(item.tn_recibido) || 0 })));
      setDetalleTransportista(detalle || []);
    } catch (error) {
      console.error('Error cargando datos de transportista:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-section"><div className="spinner"></div></div>;
  }

  return (
    <div className="dashboard-transportista">
      <div className="pdf-btn-wrapper">
        <button className="btn-download-pdf" onClick={descargarPDF} disabled={exportingPdf}>
          {exportingPdf ? 'Generando...' : '📥 Descargar PDF'}
        </button>
      </div>
      {/* Filtros en cascada */}
      <div className="section-filters">
        <div className="filter-row">
          <div className="filter-item">
            <label>Mes</label>
            <select value={localFilters.mes} onChange={(e) => handleFilterChange('mes', e.target.value)} disabled={filtersLoading}>
              <option value="">Todos</option>
              {segmentadores.meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>Cliente</label>
            <select value={localFilters.cliente} onChange={(e) => handleFilterChange('cliente', e.target.value)} disabled={filtersLoading}>
              <option value="">Todos</option>
              {segmentadores.clientes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>Transportista</label>
            <select value={localFilters.transportista} onChange={(e) => handleFilterChange('transportista', e.target.value)} disabled={filtersLoading}>
              <option value="">Todos</option>
              {segmentadores.transportistas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>Unidad</label>
            <select value={localFilters.unidad} onChange={(e) => handleFilterChange('unidad', e.target.value)} disabled={filtersLoading}>
              <option value="">Todas</option>
              {segmentadores.unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <button className="btn-clear-local" onClick={clearFilters} disabled={filtersLoading}>
            {filtersLoading ? '...' : 'Limpiar'}
          </button>
        </div>
      </div>

      <div ref={contentRef}>
      {/* Detalle por Transportista */}
      <div className="section-card full-width">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <h2 style={{ margin: 0 }}>📋 Detalle por Transportista</h2>
          <button className="btn-download-excel" onClick={descargarDetalleExcel} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #1B7430', background: '#e8f5e9', color: '#1B7430', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>📊 Excel</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>Divisa:</label>
            <select
              value={divisaFiltro}
              onChange={e => setDivisaFiltro(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              <option value="">Todas</option>
              <option value="USD">$ Dólares (USD)</option>
              <option value="PEN">S/ Soles (PEN)</option>
            </select>
          </div>
        </div>
        {detalleTransportista.length === 0 ? (
          <p className="empty-message">No hay datos para mostrar</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transportista</th>
                  <th>Traslados</th>
                  <th>Peso Ticket</th>
                  <th>Divisa</th>
                  <th>Precio con IGV</th>
                </tr>
              </thead>
              <tbody>
                {[...detalleTransportista]
                  .filter(item => !divisaFiltro || (item.divisa_cost || 'PEN') === divisaFiltro)
                  .sort((a, b) => (parseInt(b.cantidad_traslados) || 0) - (parseInt(a.cantidad_traslados) || 0)).map((item, index) => (
                  <tr key={index}>
                    <td>{item.transportista || 'Sin asignar'}</td>
                    <td>{item.cantidad_traslados}</td>
                    <td>{fmtNum(item.tn_recibido)}</td>
                    <td>{(item.divisa_cost || 'PEN')}</td>
                    <td>{(item.divisa_cost || 'PEN') === 'USD' ? '$' : 'S/'} {(parseFloat(item.precio_total) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts row */}
      {(() => {
        const chartHeight = Math.max(300, tnPorUnidad.length * (isMobile ? 40 : 50));
        const pieRadius = Math.min(isMobile ? 110 : 200, Math.floor((chartHeight - 20) / 2));
        return (
        <>
        {/* TN por Unidad (Placa) */}
        <div className="section-card">
          <h2>🚚 TN por Unidad</h2>
          <div className="chart-container" style={{ overflowX: tnPorUnidad.length > (isMobile ? 6 : 12) ? 'auto' : 'hidden' }}>
            {tnPorUnidad.length === 0 ? (
              <p className="empty-message">No hay datos para mostrar</p>
            ) : (
              <>
              <ResponsiveContainer width={tnPorUnidad.length > (isMobile ? 6 : 12) ? Math.max(tnPorUnidad.length * (isMobile ? 60 : 80), 600) : '100%'} height={isMobile ? 300 : 400} debounce={50}>
                <BarChart data={tnPorUnidad} margin={{ left: 10, right: 20, top: 20, bottom: isMobile ? 60 : 50 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#b0b0b0" strokeOpacity={0.7} />
                  <XAxis dataKey="placa" tick={{ fontSize: isMobile ? 9 : 11, angle: -45, textAnchor: 'end' }} height={isMobile ? 70 : 60} interval={0} />
                  <YAxis tick={{ fontSize: isMobile ? 9 : 11 }} width={isMobile ? 50 : 65} tickFormatter={(v) => `${v} TN`} />
                  <Tooltip formatter={(value) => `${fmtNum(value)} TN`} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }} />
                  <Bar dataKey="total" name="TN" radius={[6, 6, 0, 0]} maxBarSize={isMobile ? 40 : 60}>
                    {tnPorUnidad.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList dataKey="total" position="top" formatter={(v) => `${fmtNum(v)}`} style={{ fontSize: isMobile ? 8 : 10, fill: '#333' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Leyenda unidades */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 10, fontSize: 12, minWidth: tnPorUnidad.length > (isMobile ? 6 : 12) ? Math.max(tnPorUnidad.length * (isMobile ? 60 : 80), 600) : undefined }}>
                {tnPorUnidad.map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS[index % COLORS.length], flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ color: '#333' }}>{item.placa || 'Sin placa'} — {fmtNum(item.total)} TN</span>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </div>

        {/* TN por Cliente */}
        <div className="section-card">
          <h2>🧑‍💼 TN por Cliente</h2>
          <div className="chart-container pie-chart">
            {tnPorCliente.length === 0 ? (
              <p className="empty-message">No hay datos para mostrar</p>
            ) : (
              <>
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <Pie
                    data={tnPorCliente}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={isMobile ? 80 : 120}
                    fill="#8884d8"
                    dataKey="total"
                    nameKey="cliente"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {tnPorCliente.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => {
                      const total = tnPorCliente.reduce((s, i) => s + i.total, 0);
                      const pct = total > 0 ? ((parseFloat(value) / total) * 100).toFixed(2) : '0.00';
                      return [`${fmtNum(value)} TN (${pct}%)`, props.payload.cliente || 'Sin cliente'];
                    }}
                    contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Leyenda */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 4, fontSize: 12 }}>
                {tnPorCliente.map((item, index) => {
                  const total = tnPorCliente.reduce((s, i) => s + i.total, 0);
                  const pct = total > 0 ? ((item.total / total) * 100).toFixed(2) : '0.00';
                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS[index % COLORS.length], flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ color: '#333' }}>{item.cliente || 'Sin cliente'} — {fmtNum(item.total)} TN ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        </div>
        </>
        );
      })()}

      {/* Traslados por Unidad */}
      <div className="section-card">
        <h2>📦 Traslados por Unidad</h2>
        {trasladosPorUnidad.length === 0 ? (
          <p className="empty-message">No hay datos para mostrar</p>
        ) : (
          <div className="chart-container">
<ResponsiveContainer width="100%" height={Math.max(isMobile ? 250 : 300, trasladosPorUnidad.length * (isMobile ? 22 : 28))}>
              <BarChart data={trasladosPorUnidad} margin={{ top: isMobile ? 25 : 35, right: isMobile ? 10 : 20, left: 0, bottom: isMobile ? 10 : 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="placa" tick={{ fontSize: isMobile ? 9 : 11 }} interval={0} angle={isMobile ? -45 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 50 : 30} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 30 : 60} />
                <Tooltip formatter={(value, name) => name === 'Traslados' ? [value, 'Traslados'] : [`${fmtNum(value)} TN`, 'Peso Ticket']} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }} />
                {!isMobile && <Legend />}
                <Bar dataKey="cantidad" name="Traslados" radius={[4, 4, 0, 0]}>
                  {trasladosPorUnidad.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList
                    content={({ x, y, width, value, index }) => {
                      const item = trasladosPorUnidad[index];
                      const tnRaw = item ? parseFloat(item.tn_recibido) : NaN;
                      const tn = !isNaN(tnRaw) && tnRaw > 0 ? `${fmtNum(tnRaw)} TN` : null;
                      const fs = isMobile ? 8 : 10;
                      return (
                        <g>
                          {tn && !isMobile && <text x={x + width / 2} y={y - 18} textAnchor="middle" fontSize={fs} fill="#1B7430" fontWeight={600}>{tn}</text>}
                          <text x={x + width / 2} y={tn && !isMobile ? y - 6 : y - 6} textAnchor="middle" fontSize={fs} fill="#555">{value}</text>
                        </g>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Lista detallada de TN por Cliente */}
      <div className="section-card">
        <h2>📝 Detalle TN por Cliente</h2>
        {tnPorCliente.length === 0 ? (
          <p className="empty-message">No hay datos para mostrar</p>
        ) : (
          <div className="detail-list">
            {tnPorCliente.map((item, index) => (
              <div className="detail-item" key={index}>
                <span className="legend-color" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="detail-name">{item.cliente || 'Sin cliente'}</span>
                <span className="detail-value">{fmtNum(item.total)} TN</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default DashboardTransportista;
