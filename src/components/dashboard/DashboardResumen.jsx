import { useState, useEffect } from 'react';
import { dashboardService } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell
} from 'recharts';
import './DashboardComponents.css';
import TablasDetalladasModal from './TablasDetalladasModal';
import ReporteGuiasModal from './ReporteGuiasModal';
import TablaUnidadesModal from './TablaUnidadesModal';

const FILTER_FIELDS = ['mes', 'semana', 'cliente', 'transportista', 'unidad', 'transportado'];

const DashboardResumen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [showTablas, setShowTablas] = useState(false);
  const [showGuias, setShowGuias] = useState(false);
  const [showUnidades, setShowUnidades] = useState(false);
  const [segmentadores, setSegmentadores] = useState({
    meses: [],
    semanas: [],
    clientes: [],
    transportistas: [],
    unidades: [],
    transportados: [],
  });

  // Mapa de campo → array de opciones en segmentadores
  const fieldToOptions = {
    mes: segmentadores.meses,
    semana: segmentadores.semanas,
    cliente: segmentadores.clientes,
    transportista: segmentadores.transportistas,
    unidad: segmentadores.unidades,
    transportado: segmentadores.transportados,
  };

  // Carga inicial: todas las opciones sin filtro
  useEffect(() => {
    const init = async () => {
      try {
        const seg = await dashboardService.getSegmentadoresFiltrados({});
        setSegmentadores(seg);
      } catch (error) {
        console.error('Error cargando segmentadores:', error);
      }
    };
    init();
  }, []);

  // Cada vez que cambian los filtros, recarga los datos del dashboard
  useEffect(() => {
    loadData();
  }, [filters]);

  /**
   * Maneja el cambio de un filtro:
   * 1. Actualiza el filtro cambiado
   * 2. Pide al backend las opciones válidas con los nuevos filtros
   * 3. Resetea cualquier filtro cuyo valor actual ya no esté disponible (conflicto)
   */
  const handleFilterChange = async (key, value) => {
    const newFilters = { ...filters };
    if (value === '') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }

    setFiltersLoading(true);
    try {
      const newSeg = await dashboardService.getSegmentadoresFiltrados(newFilters);

      const newFieldToOptions = {
        mes: newSeg.meses,
        semana: newSeg.semanas,
        cliente: newSeg.clientes,
        transportista: newSeg.transportistas,
        unidad: newSeg.unidades,
        transportado: newSeg.transportados,
      };

      // Resetear filtros que ya no tienen valor válido en las nuevas opciones
      const validatedFilters = { ...newFilters };
      for (const field of FILTER_FIELDS) {
        if (field !== key && validatedFilters[field]) {
          if (!newFieldToOptions[field].includes(validatedFilters[field])) {
            delete validatedFilters[field];
          }
        }
      }

      setSegmentadores(newSeg);
      setFilters(validatedFilters);
    } catch (error) {
      console.error('Error actualizando filtros en cascada:', error);
      setFilters(newFilters);
    } finally {
      setFiltersLoading(false);
    }
  };

  const clearFilters = async () => {
    setFiltersLoading(true);
    try {
      const seg = await dashboardService.getSegmentadoresFiltrados({});
      setSegmentadores(seg);
    } catch (error) {
      console.error('Error limpiando filtros:', error);
    } finally {
      setFiltersLoading(false);
    }
    setFilters({});
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const resumen = await dashboardService.getResumen(filters);
      setData(resumen);
    } catch (error) {
      console.error('Error cargando resumen:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-section"><div className="spinner"></div></div>;
  }

  if (!data) {
    return <div className="empty-section">No hay datos disponibles</div>;
  }

  return (
    <div className="dashboard-resumen">
      {/* Filtros */}
      <div className="section-filters">
        <div className="filter-row">
          <div className="filter-item">
            <label>Mes</label>
            <select
              value={filters.mes || ''}
              onChange={(e) => handleFilterChange('mes', e.target.value)}
              disabled={filtersLoading}
            >
              <option value="">Todos</option>
              {segmentadores.meses.map(mes => <option key={mes} value={mes}>{mes}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>Semana</label>
            <select
              value={filters.semana || ''}
              onChange={(e) => handleFilterChange('semana', e.target.value)}
              disabled={filtersLoading}
            >
              <option value="">Todas</option>
              {segmentadores.semanas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>Cliente</label>
            <select
              value={filters.cliente || ''}
              onChange={(e) => handleFilterChange('cliente', e.target.value)}
              disabled={filtersLoading}
            >
              <option value="">Todos</option>
              {segmentadores.clientes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>Transportista</label>
            <select
              value={filters.transportista || ''}
              onChange={(e) => handleFilterChange('transportista', e.target.value)}
              disabled={filtersLoading}
            >
              <option value="">Todos</option>
              {segmentadores.transportistas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>Unidad</label>
            <select
              value={filters.unidad || ''}
              onChange={(e) => handleFilterChange('unidad', e.target.value)}
              disabled={filtersLoading}
            >
              <option value="">Todas</option>
              {segmentadores.unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>Transportado</label>
            <select
              value={filters.transportado || ''}
              onChange={(e) => handleFilterChange('transportado', e.target.value)}
              disabled={filtersLoading}
            >
              <option value="">Todos</option>
              {segmentadores.transportados.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className="btn-clear-local" onClick={clearFilters} disabled={filtersLoading}>
            {filtersLoading ? '...' : 'Limpiar filtros'}
          </button>
        </div>
      </div>

      {/* Indicadores principales */}
      <div className="indicators-grid">
        <div className="indicator-card">
          <div className="indicator-icon">🚛</div>
          <div className="indicator-content">
            <h3>Traslados</h3>
            <p className="indicator-value">{data.indicadores.traslados}</p>
            <span className="indicator-label">Total de documentos</span>
          </div>
        </div>

        <div className="indicator-card highlight">
          <div className="indicator-icon">⛏️</div>
          <div className="indicator-content">
            <h3>TN Recibidas (Filtrado)</h3>
            <p className="indicator-value">{data.indicadores.tnRecibidaFiltrado?.toFixed(2) || '0.00'}</p>
            <span className="indicator-label">Con filtros aplicados</span>
          </div>
        </div>
      </div>

      {/* Control de Peso */}
      <div className="section-card">
        <h2>Control de Peso</h2>
        <div className="control-peso-grid single">
          <div className="peso-item">
            <label>Peso Guía (TN Enviado)</label>
            <span className="peso-value recibido">
              {data.controlPeso.tn_enviado_total > 0 
                ? data.controlPeso.tn_enviado_total.toFixed(2) 
                : 'Pendiente'}
            </span>
          </div>
          <div className="peso-item">
            <label>Peso Ticket (TN Recibido)</label>
            <span className="peso-value recibido">
              {data.controlPeso.tn_recibida_total > 0 
                ? data.controlPeso.tn_recibida_total.toFixed(2) 
                : 'Pendiente'}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico Peso Guía vs Peso Ticket */}
      <div className="section-card">
        <h2>Peso Guía vs Peso Ticket</h2>
        <div className="chart-container">
          {(() => {
            const pesoGuia = data.controlPeso.tn_enviado_total || 0;
            const pesoTicket = data.controlPeso.tn_recibida_total || 0;
            if (pesoGuia === 0 && pesoTicket === 0) return <p className="empty-message">No hay datos para mostrar</p>;
            const chartData = [
              { nombre: 'Peso Guía', valor: pesoGuia },
              { nombre: 'Peso Ticket', valor: pesoTicket },
            ];
            const COLORS = ['#1B7430', '#E8913A'];
            return (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 80, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} hide />
                  <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 13, fontWeight: 600 }} />
                  <Tooltip formatter={(value) => `${parseFloat(value).toFixed(2)} TN`} />
                  <Bar dataKey="valor" name="TN">
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                    <LabelList dataKey="valor" position="right" formatter={(v) => `${parseFloat(v).toFixed(2)} TN`} style={{ fontSize: 12, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* Botón Tablas Detalladas */}
      <div className="section-card" style={{ textAlign: 'center', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn-ver-tablas" onClick={() => setShowTablas(true)}>
          📊 Tablas Detalladas
        </button>
        <button className="btn-ver-tablas btn-ver-guias" onClick={() => setShowGuias(true)}>
          🚛 Reporte de Guías
        </button>
        <button className="btn-ver-tablas btn-ver-unidades" onClick={() => setShowUnidades(true)}>
          🚚 Tabla de Unidades
        </button>
      </div>

      {/* Modal Tablas Detalladas */}
      <TablasDetalladasModal
        isOpen={showTablas}
        onClose={() => setShowTablas(false)}
        mesesDisponibles={segmentadores.meses}
      />

      {/* Modal Reporte Guías */}
      <ReporteGuiasModal
        isOpen={showGuias}
        onClose={() => setShowGuias(false)}
      />

      {/* Modal Tabla Unidades */}
      <TablaUnidadesModal
        isOpen={showUnidades}
        onClose={() => setShowUnidades(false)}
      />
    </div>
  );
};

export default DashboardResumen;
