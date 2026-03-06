import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
  LineChart, Line, Cell
} from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';

const CHART_COLORS = [
  '#1B7430', '#4A86B8', '#E8913A', '#8E6BAD',
  '#5BA3C9', '#C4883A', '#9E6575', '#6882A8',
  '#3A9E9E', '#B87840'
];

const CustomSemanaTick = ({ x, y, payload, data, isMobile }) => {
  const item = data?.find(d => d.semana === payload.value);
  const tn = item ? parseFloat(item.total).toFixed(2) : '';
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#555" fontSize={isMobile ? 10 : 12}>
        {payload.value}
      </text>
      {tn && (
        <text x={0} y={0} dy={28} textAnchor="middle" fill="#1B7430" fontSize={isMobile ? 9 : 11} fontWeight={600}>
          {tn} TN
        </text>
      )}
    </g>
  );
};
import './DashboardComponents.css';

const Modal = ({ title, items, onClose }) => (
  <div className="dm-overlay" onClick={onClose}>
    <div className="dm-content" onClick={e => e.stopPropagation()}>
      <div className="dm-header">
        <h3>{title}</h3>
        <button className="dm-close" onClick={onClose}>×</button>
      </div>
      <div className="dm-body">
        {items.length === 0 ? (
          <p className="empty-message">No hay documentos para mostrar</p>
        ) : (
          <table className="dm-table">
            <thead>
              <tr>
                <th>GRT</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Unidad</th>
                <th>Ticket</th>
                <th>Peso Ticket (TN Recibida)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(doc => (
                <tr key={doc.id}>
                  <td className="dm-code">{doc.grt || '-'}</td>
                  <td>{doc.fecha || '-'}</td>
                  <td>{doc.cliente || '-'}</td>
                  <td>{doc.unidad || '-'}</td>
                  <td className="dm-code">{doc.ticket || '-'}</td>
                  <td>{doc.tn_recibida ? Number(doc.tn_recibida).toFixed(2) : '-'}</td>
                  <td>
                    <Link to={`/documents/${doc.id}/edit`} className="btn-action btn-edit" onClick={onClose}>
                      🔒 Ticket
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
);

const DashboardSemanal = ({ filters: globalFilters }) => {
  const isMobile = useIsMobile();
  const [tnEnviadoPorSemana, setTnEnviadoPorSemana] = useState([]);
  const [tnRecibidoPorSemana, setTnRecibidoPorSemana] = useState([]);
  const [tnRecibidoPorConcentrado, setTnRecibidoPorConcentrado] = useState([]);
  const [guiasPorVerificar, setGuiasPorVerificar] = useState(0);
  const [modal, setModal] = useState(null); // { title, items }
  const [loadingModal, setLoadingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filtros locales exclusivos de esta sección
  const [localFilters, setLocalFilters] = useState({
    mes: '',
    transportado: '',
    cliente: ''
  });
  
  // Opciones para los filtros
  const [segmentadores, setSegmentadores] = useState({
    meses: [],
    transportados: [],
    clientes: []
  });
  const [filtersLoading, setFiltersLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await dashboardService.getSegmentadoresFiltrados({});
        setSegmentadores({
          meses: data.meses || [],
          transportados: data.transportados || [],
          clientes: data.clientes || []
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

  const handleLocalFilterChange = async (key, value) => {
    const newFilters = { ...localFilters };
    newFilters[key] = value;

    setFiltersLoading(true);
    try {
      const activeForCascade = {};
      if (newFilters.mes) activeForCascade.mes = newFilters.mes;
      if (newFilters.transportado) activeForCascade.transportado = newFilters.transportado;
      if (newFilters.cliente) activeForCascade.cliente = newFilters.cliente;

      const newSeg = await dashboardService.getSegmentadoresFiltrados(activeForCascade);

      // Resetear filtros cuyo valor actual ya no esté disponible
      if (newFilters.mes && !newSeg.meses.includes(newFilters.mes)) newFilters.mes = '';
      if (newFilters.transportado && !newSeg.transportados.includes(newFilters.transportado)) newFilters.transportado = '';
      if (newFilters.cliente && !newSeg.clientes.includes(newFilters.cliente)) newFilters.cliente = '';

      setSegmentadores({
        meses: newSeg.meses || [],
        transportados: newSeg.transportados || [],
        clientes: newSeg.clientes || []
      });
      setLocalFilters(newFilters);
    } catch (error) {
      console.error('Error actualizando filtros en cascada:', error);
      setLocalFilters(newFilters);
    } finally {
      setFiltersLoading(false);
    }
  };

  const clearLocalFilters = async () => {
    setFiltersLoading(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setSegmentadores({
        meses: data.meses || [],
        transportados: data.transportados || [],
        clientes: data.clientes || []
      });
    } catch (error) {
      console.error('Error limpiando filtros:', error);
    } finally {
      setFiltersLoading(false);
    }
    setLocalFilters({ mes: '', transportado: '', cliente: '' });
  };

  const openGuiasModal = async () => {
    setLoadingModal(true);
    setModal({ title: 'Guías por verificar', items: [] });
    try {
      const activeFilters = getActiveFilters();
      const items = await dashboardService.getGuiasPorVerificarList(activeFilters);
      setModal({ title: 'Guías por verificar', items: items || [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModal(false);
    }
  };

  // Combinar filtros locales (solo los que tienen valor)
  const getActiveFilters = () => {
    const filters = {};
    if (localFilters.mes) filters.mes = localFilters.mes;
    if (localFilters.transportado) filters.transportado = localFilters.transportado;
    if (localFilters.cliente) filters.cliente = localFilters.cliente;
    return filters;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const activeFilters = getActiveFilters();
      const [enviado, recibido, concentradoRecibido, guiasRes] = await Promise.all([
        dashboardService.getTnEnviadoPorSemana(activeFilters),
        dashboardService.getTnRecibidoPorSemana(activeFilters),
        dashboardService.getTnRecibidoPorConcentrado(activeFilters),
        dashboardService.getGuiasPorVerificarCount(activeFilters),
      ]);
      // Parsear valores a números
      setTnEnviadoPorSemana((enviado || []).map(item => ({
        ...item,
        total: parseFloat(item.total) || 0
      })));
      setTnRecibidoPorSemana((recibido || []).map(item => ({
        ...item,
        total: parseFloat(item.total) || 0
      })));
      setTnRecibidoPorConcentrado((concentradoRecibido || []).map(item => ({
        ...item,
        total: parseFloat(item.total) || 0
      })));
      setGuiasPorVerificar(guiasRes?.count || 0);
    } catch (error) {
      console.error('Error cargando datos semanales:', error);
    } finally {
      setLoading(false);
    }
  };

  // Combinar datos semanales para gráfico comparativo
  const datosComparativos = tnEnviadoPorSemana.map((item, index) => ({
    semana: item.semana,
    tn_enviado: parseFloat(item.total) || 0,
    tn_recibido: parseFloat(tnRecibidoPorSemana[index]?.total) || 0,
  }));

  return (
    <div className="dashboard-semanal">
      {modal && (
        <Modal
          title={loadingModal ? 'Cargando...' : modal.title}
          items={modal.items}
          onClose={() => setModal(null)}
        />
      )}

      {/* Indicadores de verificación */}
      <div className="verificacion-indicators">
        <div className="verificacion-card warning clickable" onClick={openGuiasModal} title="Ver detalle">
          <div className="verificacion-icon">📝</div>
          <div className="verificacion-content">
            <span className="verificacion-value">{guiasPorVerificar}</span>
            <span className="verificacion-label">Guías por verificar</span>
          </div>
          <span className="card-arrow">→</span>
        </div>

      </div>

      {/* Filtros exclusivos de esta sección */}
      <div className="section-filters">
        <div className="filter-row">
          <div className="filter-item">
            <label>Mes</label>
            <select
              value={localFilters.mes}
              onChange={(e) => handleLocalFilterChange('mes', e.target.value)}
              disabled={filtersLoading}
            >
              <option value="">Todos</option>
              {segmentadores.meses.map(mes => (
                <option key={mes} value={mes}>{mes}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Transportado</label>
            <select
              value={localFilters.transportado}
              onChange={(e) => handleLocalFilterChange('transportado', e.target.value)}
              disabled={filtersLoading}
            >
              <option value="">Todos</option>
              {segmentadores.transportados.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Cliente</label>
            <select
              value={localFilters.cliente}
              onChange={(e) => handleLocalFilterChange('cliente', e.target.value)}
              disabled={filtersLoading}
            >
              <option value="">Todos</option>
              {segmentadores.clientes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button className="btn-clear-local" onClick={clearLocalFilters} disabled={filtersLoading}>
            {filtersLoading ? '...' : 'Limpiar'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-section"><div className="spinner"></div></div>
      ) : (
        <>
          {/* Gráfico TN Recibido por Semana */}
          <div className="chart-section">
        <h2>📦 Peso Ticket por Semana</h2>
        <div className="chart-container">
          {tnRecibidoPorSemana.length === 0 ? (
            <p className="empty-message">No hay datos para mostrar</p>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 320}>
              <BarChart data={tnRecibidoPorSemana} margin={{ top: 10, right: isMobile ? 10 : 20, left: 0, bottom: isMobile ? 30 : 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="semana"
                  height={isMobile ? 45 : 55}
                  tick={<CustomSemanaTick data={tnRecibidoPorSemana} isMobile={isMobile} />}
                  interval={isMobile ? 'preserveStartEnd' : 0}
                />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 35 : 60} />
                <Tooltip formatter={(value) => [`${parseFloat(value).toFixed(2)} TN`, 'Peso Ticket']} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }} />
                {!isMobile && <Legend />}
                <Bar dataKey="total" name="Peso Ticket" radius={[4, 4, 0, 0]}>
                  {tnRecibidoPorSemana.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeOpacity={0.3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TN Recibido por Tipo de Concentrado */}
      <div className="chart-section">
        <h2>⛏️ Peso Ticket por Tipo de Concentrado</h2>
        <div className="chart-container">
          {tnRecibidoPorConcentrado.length === 0 ? (
            <p className="empty-message">No hay datos para mostrar</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(150, tnRecibidoPorConcentrado.length * (isMobile ? 40 : 45))}>
              <BarChart
                data={tnRecibidoPorConcentrado}
                layout="vertical"
                margin={{ top: 10, right: isMobile ? 45 : 70, left: isMobile ? 5 : 10, bottom: 10 }}
                barSize={isMobile ? 20 : 25}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis type="number" tick={{ fontSize: isMobile ? 9 : 11 }} />
                <YAxis 
                  dataKey="tipo_concentrado" 
                  type="category" 
                  width={isMobile ? 70 : 120}
                  tick={{ fontSize: isMobile ? 9 : 11, fill: '#333' }}
                  tickMargin={isMobile ? 4 : 8}
                />
                <Tooltip formatter={(value) => [`${parseFloat(value).toFixed(2)} TN`, 'Peso Ticket']} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }} />
                <Bar dataKey="total" name="Peso Ticket" radius={[0, 6, 6, 0]}>
                  {tnRecibidoPorConcentrado.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke={CHART_COLORS[index % CHART_COLORS.length]} strokeOpacity={0.3} />
                  ))}
                  <LabelList dataKey="total" position="right" formatter={(v) => `${parseFloat(v).toFixed(2)} TN`} style={{ fontSize: isMobile ? 9 : 11, fill: '#333', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default DashboardSemanal;
