import { useState, useEffect } from 'react';
import { dashboardService } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import './DashboardComponents.css';

// Paleta de colores equilibrada para gráficos
const COLORS = [
  '#1B7430', '#4A86B8', '#C4883A', '#8E6BAD',
  '#3A9E9E', '#C06050', '#5D8A5D', '#6882A8',
  '#B87840', '#9E6575'
];

const DashboardTransportista = () => {
  const [tnPorUnidad, setTnPorUnidad] = useState([]);
  const [tnPorCliente, setTnPorCliente] = useState([]);
  const [trasladosPorUnidad, setTrasladosPorUnidad] = useState([]);
  const [detalleTransportista, setDetalleTransportista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(false);

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

      {/* Detalle por Transportista */}
      <div className="section-card full-width">
        <h2>📋 Detalle por Transportista</h2>
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
                  <th>Costo Total</th>
                </tr>
              </thead>
              <tbody>
                {[...detalleTransportista].sort((a, b) => (parseInt(b.cantidad_traslados) || 0) - (parseInt(a.cantidad_traslados) || 0)).map((item, index) => (
                  <tr key={index}>
                    <td>{item.transportista || 'Sin asignar'}</td>
                    <td>{item.cantidad_traslados}</td>
                    <td>{(parseFloat(item.tn_recibido) || 0).toFixed(2)}</td>
                    <td>S/ {(parseFloat(item.costo_total) || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts row */}
      {(() => {
        const chartHeight = Math.max(300, tnPorUnidad.length * 50);
        const pieRadius = Math.min(200, Math.floor((chartHeight - 20) / 2));
        return (
        <>
        {/* TN por Unidad (Placa) */}
        <div className="section-card">
          <h2>🚚 TN por Unidad</h2>
          <div className="chart-container">
            {tnPorUnidad.length === 0 ? (
              <p className="empty-message">No hay datos para mostrar</p>
            ) : (
              <>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={tnPorUnidad} layout="vertical" margin={{ left: 10, right: 80, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="placa" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${parseFloat(value).toFixed(2)} TN`} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }} />
                  <Bar dataKey="total" name="TN" radius={[0, 6, 6, 0]}>
                    {tnPorUnidad.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList dataKey="total" position="right" formatter={(v) => `${parseFloat(v).toFixed(1)} TN`} style={{ fontSize: 12, fill: '#333' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Leyenda unidades */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 10, fontSize: 12 }}>
                {tnPorUnidad.map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS[index % COLORS.length], flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ color: '#333' }}>{item.placa || 'Sin placa'} — {parseFloat(item.total).toFixed(1)} TN</span>
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
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                  <Pie
                    data={tnPorCliente}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={pieRadius}
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
                    formatter={(value, name, props) => [`${parseFloat(value).toFixed(2)} TN`, props.payload.cliente || 'Sin cliente']}
                    contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Leyenda */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 10, fontSize: 12 }}>
                {tnPorCliente.map((item, index) => {
                  const total = tnPorCliente.reduce((s, i) => s + i.total, 0);
                  const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS[index % COLORS.length], flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ color: '#333' }}>{item.cliente || 'Sin cliente'} — {parseFloat(item.total).toFixed(1)} TN ({pct}%)</span>
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
<ResponsiveContainer width="100%" height={Math.max(300, trasladosPorUnidad.length * 28)}>
              <BarChart data={trasladosPorUnidad} margin={{ top: 35, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="placa" tick={{ fontSize: 11 }} interval={0} angle={0} textAnchor="middle" />
                <YAxis />
                <Tooltip formatter={(value, name) => name === 'Traslados' ? [value, 'Traslados'] : [`${parseFloat(value).toFixed(2)} TN`, 'Peso Ticket']} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }} />
                <Legend />
                <Bar dataKey="cantidad" name="Traslados" radius={[4, 4, 0, 0]}>
                  {trasladosPorUnidad.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList
                    content={({ x, y, width, value, index }) => {
                      const item = trasladosPorUnidad[index];
                      const tnRaw = item ? parseFloat(item.tn_recibido) : NaN;
                      const tn = !isNaN(tnRaw) && tnRaw > 0 ? `${tnRaw.toFixed(1)} TN` : null;
                      return (
                        <g>
                          {tn && <text x={x + width / 2} y={y - 18} textAnchor="middle" fontSize={10} fill="#1B7430" fontWeight={600}>{tn}</text>}
                          <text x={x + width / 2} y={tn ? y - 6 : y - 6} textAnchor="middle" fontSize={10} fill="#555">{value} trasl.</text>
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
                <span className="detail-value">{parseFloat(item.total).toFixed(2)} TN</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTransportista;
