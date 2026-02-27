import { useState, useEffect } from 'react';
import { dashboardService } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, LabelList
} from 'recharts';
import './DashboardComponents.css';

// Colores para divisas - contrastantes
const COLORS = {
  PEN: '#1B7430',    // Verde principal para Soles
  USD: '#4A86B8',    // Azul medio para Dólares
  dolares: '#4A86B8',
  soles: '#1B7430',
};

// Paleta de colores equilibrada para gráficos
const CHART_COLORS = [
  '#1B7430', // Verde principal
  '#4A86B8', // Azul medio
  '#C4883A', // Dorado suave
  '#8E6BAD', // Lila
  '#3A9E9E', // Teal medio
  '#C06050', // Terracota
  '#5D8A5D', // Verde salvia
  '#6882A8', // Azul grisáceo
  '#B87840', // Bronce
  '#9E6575'  // Rosa antiguo
];

const DashboardFinanciero = ({ filters }) => {
  const [porCobrar, setPorCobrar] = useState([]);
  const [porPagar, setPorPagar] = useState([]);
  const [margenOperativo, setMargenOperativo] = useState([]);
  const [tnClienteEmpresa, setTnClienteEmpresa] = useState([]);
  const [seguimiento, setSeguimiento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cobrar');

  const [localFilters, setLocalFilters] = useState({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  const [filterOptions, setFilterOptions] = useState({ meses: [], semanas: [], clientes: [], transportistas: [], unidades: [], divisas: [] });
  const [filtersLoading, setFiltersLoading] = useState(false);

  const [localFiltersPagar, setLocalFiltersPagar] = useState({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  const [filterOptionsPagar, setFilterOptionsPagar] = useState({ meses: [], semanas: [], clientes: [], transportistas: [], unidades: [], divisas: [] });
  const [filtersLoadingPagar, setFiltersLoadingPagar] = useState(false);

  const [localFiltersMargen, setLocalFiltersMargen] = useState({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  const [filterOptionsMargen, setFilterOptionsMargen] = useState({ meses: [], semanas: [], clientes: [], transportistas: [], unidades: [], divisas: [] });
  const [filtersLoadingMargen, setFiltersLoadingMargen] = useState(false);

  const [localFiltersTn, setLocalFiltersTn] = useState({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  const [filterOptionsTn, setFilterOptionsTn] = useState({ meses: [], semanas: [], clientes: [], transportistas: [], unidades: [], divisas: [] });
  const [filtersLoadingTn, setFiltersLoadingTn] = useState(false);

  const getActiveFilters = () => {
    const active = {};
    Object.entries(localFilters).forEach(([k, v]) => { if (v) active[k] = v; });
    return active;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const data = await dashboardService.getSegmentadoresFiltrados({});
        const opts = {
          meses: data.meses || [],
          semanas: data.semanas || [],
          clientes: data.clientes || [],
          transportistas: data.transportistas || [],
          unidades: data.unidades || [],
          divisas: data.divisas || [],
        };
        setFilterOptions(opts);
        setFilterOptionsPagar(opts);
        setFilterOptionsMargen(opts);
        setFilterOptionsTn(opts);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  useEffect(() => {
    loadStaticData();
  }, []);

  useEffect(() => {
    loadCobrar();
  }, [localFilters]);

  useEffect(() => {
    loadPagar();
  }, [localFiltersPagar]);

  useEffect(() => {
    loadMargen();
  }, [localFiltersMargen]);

  useEffect(() => {
    loadTnClienteEmpresa();
  }, [localFiltersTn]);

  const getActivePagarFilters = () => {
    const active = {};
    Object.entries(localFiltersPagar).forEach(([k, v]) => { if (v) active[k] = v; });
    return active;
  };

  const loadCobrar = async () => {
    setLoading(true);
    try {
      const activeFilters = getActiveFilters();
      const cobrar = await dashboardService.getPorCobrar(activeFilters);
      setPorCobrar((cobrar || []).map(item => ({ ...item, total: parseFloat(item.total) || 0 })));
    } catch (error) {
      console.error('Error cargando Por Cobrar:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPagar = async () => {
    setLoading(true);
    try {
      const activeFilters = getActivePagarFilters();
      const pagar = await dashboardService.getPorPagar(activeFilters);
      setPorPagar((pagar || []).map(item => ({ ...item, total: parseFloat(item.total) || 0 })));
    } catch (error) {
      console.error('Error cargando Por Pagar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveMargenFilters = () => {
    const active = {};
    Object.entries(localFiltersMargen).forEach(([k, v]) => { if (v) active[k] = v; });
    return active;
  };

  const loadMargen = async () => {
    setLoading(true);
    try {
      const activeFilters = getActiveMargenFilters();
      const margen = await dashboardService.getMargenOperativo(activeFilters);
      setMargenOperativo((margen || []).map(item => ({ ...item, total: parseFloat(item.total) || 0 })));
    } catch (error) {
      console.error('Error cargando Margen Operativo:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveTnFilters = () => {
    const active = {};
    Object.entries(localFiltersTn).forEach(([k, v]) => { if (v) active[k] = v; });
    return active;
  };

  const loadTnClienteEmpresa = async () => {
    setLoading(true);
    try {
      const activeFilters = getActiveTnFilters();
      const tnCE = await dashboardService.getTnClienteEmpresa(activeFilters);
      setTnClienteEmpresa((tnCE || []).map(item => ({ ...item, total: parseFloat(item.total) || 0 })));
    } catch (error) {
      console.error('Error cargando TN Recibido:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaticData = async () => {
    setLoading(true);
    try {
      const [seg] = await Promise.all([
        dashboardService.getSeguimientoTransporte({}),
      ]);
      setSeguimiento(seg || []);
    } catch (error) {
      console.error('Error cargando datos financieros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setFiltersLoading(true);
    try {
      const active = {};
      Object.entries(newFilters).forEach(([k, v]) => { if (v) active[k] = v; });
      const data = await dashboardService.getSegmentadoresFiltrados(active);
      const newOptions = {
        meses: data.meses || [],
        semanas: data.semanas || [],
        clientes: data.clientes || [],
        transportistas: data.transportistas || [],
        unidades: data.unidades || [],
        divisas: data.divisas || [],
      };
      const validated = { ...newFilters };
      if (validated.mes && !newOptions.meses.includes(validated.mes)) validated.mes = '';
      if (validated.semana && !newOptions.semanas.includes(validated.semana)) validated.semana = '';
      if (validated.cliente && !newOptions.clientes.includes(validated.cliente)) validated.cliente = '';
      if (validated.transportista && !newOptions.transportistas.includes(validated.transportista)) validated.transportista = '';
      if (validated.unidad && !newOptions.unidades.includes(validated.unidad)) validated.unidad = '';
      if (validated.divisa && !newOptions.divisas.includes(validated.divisa)) validated.divisa = '';
      setFilterOptions(newOptions);
      setLocalFilters(validated);
    } catch (e) { console.error(e); } finally { setFiltersLoading(false); }
  };

  const clearFilters = async () => {
    setFiltersLoading(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setFilterOptions({ meses: data.meses || [], semanas: data.semanas || [], clientes: data.clientes || [], transportistas: data.transportistas || [], unidades: data.unidades || [], divisas: data.divisas || [] });
    } catch (e) { console.error(e); } finally { setFiltersLoading(false); }
    setLocalFilters({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  };

  const handleFilterChangePagar = async (key, value) => {
    const newFilters = { ...localFiltersPagar, [key]: value };
    setFiltersLoadingPagar(true);
    try {
      const active = {};
      Object.entries(newFilters).forEach(([k, v]) => { if (v) active[k] = v; });
      const data = await dashboardService.getSegmentadoresFiltrados(active);
      const newOptions = {
        meses: data.meses || [],
        semanas: data.semanas || [],
        clientes: data.clientes || [],
        transportistas: data.transportistas || [],
        unidades: data.unidades || [],
        divisas: data.divisas || [],
      };
      const validated = { ...newFilters };
      if (validated.mes && !newOptions.meses.includes(validated.mes)) validated.mes = '';
      if (validated.semana && !newOptions.semanas.includes(validated.semana)) validated.semana = '';
      if (validated.cliente && !newOptions.clientes.includes(validated.cliente)) validated.cliente = '';
      if (validated.transportista && !newOptions.transportistas.includes(validated.transportista)) validated.transportista = '';
      if (validated.unidad && !newOptions.unidades.includes(validated.unidad)) validated.unidad = '';
      if (validated.divisa && !newOptions.divisas.includes(validated.divisa)) validated.divisa = '';
      setFilterOptionsPagar(newOptions);
      setLocalFiltersPagar(validated);
    } catch (e) { console.error(e); } finally { setFiltersLoadingPagar(false); }
  };

  const clearFiltersPagar = async () => {
    setFiltersLoadingPagar(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setFilterOptionsPagar({ meses: data.meses || [], semanas: data.semanas || [], clientes: data.clientes || [], transportistas: data.transportistas || [], unidades: data.unidades || [], divisas: data.divisas || [] });
    } catch (e) { console.error(e); } finally { setFiltersLoadingPagar(false); }
    setLocalFiltersPagar({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  };

  const handleFilterChangeMargen = async (key, value) => {
    const newFilters = { ...localFiltersMargen, [key]: value };
    setFiltersLoadingMargen(true);
    try {
      const active = {};
      Object.entries(newFilters).forEach(([k, v]) => { if (v) active[k] = v; });
      const data = await dashboardService.getSegmentadoresFiltrados(active);
      const newOptions = {
        meses: data.meses || [],
        semanas: data.semanas || [],
        clientes: data.clientes || [],
        transportistas: data.transportistas || [],
        unidades: data.unidades || [],
        divisas: data.divisas || [],
      };
      const validated = { ...newFilters };
      if (validated.mes && !newOptions.meses.includes(validated.mes)) validated.mes = '';
      if (validated.semana && !newOptions.semanas.includes(validated.semana)) validated.semana = '';
      if (validated.cliente && !newOptions.clientes.includes(validated.cliente)) validated.cliente = '';
      if (validated.transportista && !newOptions.transportistas.includes(validated.transportista)) validated.transportista = '';
      if (validated.unidad && !newOptions.unidades.includes(validated.unidad)) validated.unidad = '';
      if (validated.divisa && !newOptions.divisas.includes(validated.divisa)) validated.divisa = '';
      setFilterOptionsMargen(newOptions);
      setLocalFiltersMargen(validated);
    } catch (e) { console.error(e); } finally { setFiltersLoadingMargen(false); }
  };

  const clearFiltersMargen = async () => {
    setFiltersLoadingMargen(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setFilterOptionsMargen({ meses: data.meses || [], semanas: data.semanas || [], clientes: data.clientes || [], transportistas: data.transportistas || [], unidades: data.unidades || [], divisas: data.divisas || [] });
    } catch (e) { console.error(e); } finally { setFiltersLoadingMargen(false); }
    setLocalFiltersMargen({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  };

  const handleFilterChangeTn = async (key, value) => {
    const newFilters = { ...localFiltersTn, [key]: value };
    setFiltersLoadingTn(true);
    try {
      const active = {};
      Object.entries(newFilters).forEach(([k, v]) => { if (v) active[k] = v; });
      const data = await dashboardService.getSegmentadoresFiltrados(active);
      const newOptions = {
        meses: data.meses || [],
        semanas: data.semanas || [],
        clientes: data.clientes || [],
        transportistas: data.transportistas || [],
        unidades: data.unidades || [],
        divisas: data.divisas || [],
      };
      const validated = { ...newFilters };
      if (validated.mes && !newOptions.meses.includes(validated.mes)) validated.mes = '';
      if (validated.semana && !newOptions.semanas.includes(validated.semana)) validated.semana = '';
      if (validated.cliente && !newOptions.clientes.includes(validated.cliente)) validated.cliente = '';
      if (validated.transportista && !newOptions.transportistas.includes(validated.transportista)) validated.transportista = '';
      if (validated.unidad && !newOptions.unidades.includes(validated.unidad)) validated.unidad = '';
      if (validated.divisa && !newOptions.divisas.includes(validated.divisa)) validated.divisa = '';
      setFilterOptionsTn(newOptions);
      setLocalFiltersTn(validated);
    } catch (e) { console.error(e); } finally { setFiltersLoadingTn(false); }
  };

  const clearFiltersTn = async () => {
    setFiltersLoadingTn(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setFilterOptionsTn({ meses: data.meses || [], semanas: data.semanas || [], clientes: data.clientes || [], transportistas: data.transportistas || [], unidades: data.unidades || [], divisas: data.divisas || [] });
    } catch (e) { console.error(e); } finally { setFiltersLoadingTn(false); }
    setLocalFiltersTn({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  };

  // Normalizar divisa a USD o PEN
  const normalizeDivisa = (divisa) => {
    if (!divisa) return 'PEN';
    const d = divisa.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (d.includes('dolar') || d.includes('dollar') || d === 'usd') return 'USD';
    if (d.includes('sol') || d === 'pen') return 'PEN';
    return 'USD';
  };

  // Agrupar datos para gráficos jerárquicos (Cliente → Empresa)
  const prepareChartData = (data) => {
    const grouped = {};
    data.forEach(item => {
      const key = `${item.cliente}|${item.empresa}`;
      if (!grouped[key]) {
        grouped[key] = {
          label: `${item.cliente} - ${item.empresa}`,
          cliente: item.cliente,
          empresa: item.empresa,
          PEN: 0,
          USD: 0,
        };
      }
      const divisa = normalizeDivisa(item.divisa);
      grouped[key][divisa] = (grouped[key][divisa] || 0) + parseFloat(item.total || 0);
    });
    return Object.values(grouped);
  };

  // Preparar datos para TN por Cliente/Empresa
  const prepareTnData = (data) => data.map(item => ({
    label: `${item.cliente} - ${item.empresa}`,
    cliente: item.cliente,
    empresa: item.empresa,
    total: parseFloat(item.total || 0),
  }));

  // Preparar datos de seguimiento (pivot por semana)
  const prepareSeguimientoData = (data) => {
    const semanas = [...new Set(data.map(d => d.semana))].sort();
    const grouped = {};
    
    data.forEach(item => {
      const key = `${item.cliente}|${item.empresa}|${item.placa}`;
      if (!grouped[key]) {
        grouped[key] = {
          cliente: item.cliente,
          empresa: item.empresa,
          placa: item.placa,
        };
        semanas.forEach(s => grouped[key][s] = 0);
      }
      grouped[key][item.semana] = parseFloat(item.tn_enviado || 0);
    });
    
    return { rows: Object.values(grouped), semanas };
  };

  if (loading) {
    return <div className="loading-section"><div className="spinner"></div></div>;
  }

  const cobrarChart = prepareChartData(porCobrar);
  const pagarChart = prepareChartData(porPagar);
  const margenChart = prepareChartData(margenOperativo);
  const tnChart = prepareTnData(tnClienteEmpresa);
  const seguimientoData = prepareSeguimientoData(seguimiento);

  const tabs = [
    { id: 'cobrar', label: 'Por Cobrar' },
    { id: 'pagar', label: 'Por Pagar' },
    { id: 'margen', label: 'Margen Operativo' },
    { id: 'tonelaje', label: 'TN Cliente/Empresa' },
    { id: 'seguimiento', label: 'Seguimiento' },
  ];

  const formatCurrency = (value, divisa = 'PEN') => {
    const normalizedDivisa = normalizeDivisa(divisa);
    const symbol = normalizedDivisa === 'USD' ? '$' : 'S/';
    return `${symbol} ${parseFloat(value || 0).toFixed(2)}`;
  };

  return (
    <div className="dashboard-financiero">
      {/* Sub-tabs */}
      <div className="sub-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sub-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Por Cobrar */}
      {activeTab === 'cobrar' && (
        <div className="financiero-section">
          <h2>Por Cobrar por Cliente / Empresa</h2>

          {/* Filtros */}
          <div className="section-filters">
            <div className="filter-row">
              <div className="filter-item">
                <label>Mes</label>
                <select value={localFilters.mes} onChange={e => handleFilterChange('mes', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todos</option>
                  {filterOptions.meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Semana</label>
                <select value={localFilters.semana} onChange={e => handleFilterChange('semana', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todas</option>
                  {filterOptions.semanas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Cliente</label>
                <select value={localFilters.cliente} onChange={e => handleFilterChange('cliente', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todos</option>
                  {filterOptions.clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Transportista</label>
                <select value={localFilters.transportista} onChange={e => handleFilterChange('transportista', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todos</option>
                  {filterOptions.transportistas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Unidad</label>
                <select value={localFilters.unidad} onChange={e => handleFilterChange('unidad', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todas</option>
                  {filterOptions.unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Divisa</label>
                <select value={localFilters.divisa} onChange={e => handleFilterChange('divisa', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todas</option>
                  {filterOptions.divisas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn-clear-local" onClick={clearFilters} disabled={filtersLoading}>
                {filtersLoading ? '...' : 'Limpiar'}
              </button>
            </div>
          </div>
          
          {/* Tabla */}
          <div className="section-card">
            <h3>Tabla Dinámica - Por Cobrar</h3>
            {porCobrar.length === 0 ? (
              <p className="empty-message">No hay datos de facturación</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Empresa</th>
                      <th>Divisa</th>
                      <th>Por Cobrar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCobrar.map((item, index) => (
                      <tr key={index}>
                        <td>{item.cliente || 'Sin cliente'}</td>
                        <td>{item.empresa}</td>
                        <td>{item.divisa || 'PEN'}</td>
                        <td className="amount">{formatCurrency(item.total, item.divisa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Gráfico */}
          <div className="chart-section">
            <h3>Gráfica - Por Cobrar</h3>
            <div className="chart-container">
              {cobrarChart.length === 0 ? (
                <p className="empty-message">No hay datos para graficar</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, cobrarChart.length * 50)}>
                  <BarChart data={cobrarChart} layout="vertical" margin={{ right: 110, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" width={180} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value, name) => [formatCurrency(value, name), name]} />
                    <Legend />
                    <Bar dataKey="PEN" name="Soles (PEN)" fill={COLORS.PEN}>
                      <LabelList dataKey="PEN" position="right" formatter={(v) => v > 0 ? `S/ ${parseFloat(v).toFixed(0)}` : ''} style={{ fontSize: 11, fill: '#1B7430' }} />
                    </Bar>
                    <Bar dataKey="USD" name="Dólares (USD)" fill={COLORS.USD}>
                      <LabelList dataKey="USD" position="right" formatter={(v) => v > 0 ? `$ ${parseFloat(v).toFixed(0)}` : ''} style={{ fontSize: 11, fill: '#4A86B8' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Por Pagar */}
      {activeTab === 'pagar' && (
        <div className="financiero-section">
          <h2>Por Pagar por Cliente / Empresa</h2>

          {/* Filtros */}
          <div className="section-filters">
            <div className="filter-row">
              <div className="filter-item">
                <label>Mes</label>
                <select value={localFiltersPagar.mes} onChange={e => handleFilterChangePagar('mes', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todos</option>
                  {filterOptionsPagar.meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Semana</label>
                <select value={localFiltersPagar.semana} onChange={e => handleFilterChangePagar('semana', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todas</option>
                  {filterOptionsPagar.semanas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Cliente</label>
                <select value={localFiltersPagar.cliente} onChange={e => handleFilterChangePagar('cliente', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todos</option>
                  {filterOptionsPagar.clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Transportista</label>
                <select value={localFiltersPagar.transportista} onChange={e => handleFilterChangePagar('transportista', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todos</option>
                  {filterOptionsPagar.transportistas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Unidad</label>
                <select value={localFiltersPagar.unidad} onChange={e => handleFilterChangePagar('unidad', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todas</option>
                  {filterOptionsPagar.unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Divisa</label>
                <select value={localFiltersPagar.divisa} onChange={e => handleFilterChangePagar('divisa', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todas</option>
                  {filterOptionsPagar.divisas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn-clear-local" onClick={clearFiltersPagar} disabled={filtersLoadingPagar}>
                {filtersLoadingPagar ? '...' : 'Limpiar'}
              </button>
            </div>
          </div>

          <div className="section-card">
            <h3>Tabla Dinámica - Por Pagar</h3>
            {porPagar.length === 0 ? (
              <p className="empty-message">No hay datos de pagos pendientes</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Empresa</th>
                      <th>Divisa</th>
                      <th>Por Pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porPagar.map((item, index) => (
                      <tr key={index}>
                        <td>{item.cliente || 'Sin cliente'}</td>
                        <td>{item.empresa}</td>
                        <td>{item.divisa || 'PEN'}</td>
                        <td className="amount negative">{formatCurrency(item.total, item.divisa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="chart-section">
            <h3>Gráfica - Por Pagar</h3>
            <div className="chart-container">
              {pagarChart.length === 0 ? (
                <p className="empty-message">No hay datos para graficar</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, pagarChart.length * 50)}>
                  <BarChart data={pagarChart} layout="vertical" margin={{ right: 110, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" width={180} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value, name) => [formatCurrency(value, name), name]} />
                    <Legend />
                    <Bar dataKey="PEN" name="Soles (PEN)" fill={COLORS.PEN}>
                      <LabelList dataKey="PEN" position="right" formatter={(v) => v > 0 ? `S/ ${parseFloat(v).toFixed(0)}` : ''} style={{ fontSize: 11, fill: '#1B7430' }} />
                    </Bar>
                    <Bar dataKey="USD" name="Dólares (USD)" fill={COLORS.USD}>
                      <LabelList dataKey="USD" position="right" formatter={(v) => v > 0 ? `$ ${parseFloat(v).toFixed(0)}` : ''} style={{ fontSize: 11, fill: '#4A86B8' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Margen Operativo */}
      {activeTab === 'margen' && (
        <div className="financiero-section">
          <h2>Margen Operativo por Cliente / Empresa</h2>

          {/* Filtros */}
          <div className="section-filters">
            <div className="filter-row">
              <div className="filter-item">
                <label>Mes</label>
                <select value={localFiltersMargen.mes} onChange={e => handleFilterChangeMargen('mes', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todos</option>
                  {filterOptionsMargen.meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Semana</label>
                <select value={localFiltersMargen.semana} onChange={e => handleFilterChangeMargen('semana', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todas</option>
                  {filterOptionsMargen.semanas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Cliente</label>
                <select value={localFiltersMargen.cliente} onChange={e => handleFilterChangeMargen('cliente', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todos</option>
                  {filterOptionsMargen.clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Transportista</label>
                <select value={localFiltersMargen.transportista} onChange={e => handleFilterChangeMargen('transportista', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todos</option>
                  {filterOptionsMargen.transportistas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Unidad</label>
                <select value={localFiltersMargen.unidad} onChange={e => handleFilterChangeMargen('unidad', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todas</option>
                  {filterOptionsMargen.unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Divisa</label>
                <select value={localFiltersMargen.divisa} onChange={e => handleFilterChangeMargen('divisa', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todas</option>
                  {filterOptionsMargen.divisas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn-clear-local" onClick={clearFiltersMargen} disabled={filtersLoadingMargen}>
                {filtersLoadingMargen ? '...' : 'Limpiar'}
              </button>
            </div>
          </div>

          <div className="section-card">
            <h3>Tabla Dinámica - Margen Operativo (Por Cobrar - Por Pagar)</h3>
            {margenOperativo.length === 0 ? (
              <p className="empty-message">No hay datos de margen</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Empresa</th>
                      <th>Divisa</th>
                      <th>Margen Operativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {margenOperativo.map((item, index) => {
                      const margen = parseFloat(item.total || 0);
                      return (
                        <tr key={index}>
                          <td>{item.cliente || 'Sin cliente'}</td>
                          <td>{item.empresa}</td>
                          <td>{item.divisa || 'PEN'}</td>
                          <td className={`amount ${margen >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(margen, item.divisa)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="chart-section">
            <h3>Gráfica - Margen Operativo</h3>
            <div className="chart-container">
              {margenChart.length === 0 ? (
                <p className="empty-message">No hay datos para graficar</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, margenChart.length * 50)}>
                  <BarChart data={margenChart} layout="vertical" margin={{ right: 110, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" width={180} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value, name) => [formatCurrency(value, name), name]} />
                    <Legend />
                    <Bar dataKey="PEN" name="Soles (PEN)" fill={COLORS.PEN}>
                      <LabelList dataKey="PEN" position="right" formatter={(v) => v !== 0 ? `S/ ${parseFloat(v).toFixed(0)}` : ''} style={{ fontSize: 11, fill: '#1B7430' }} />
                    </Bar>
                    <Bar dataKey="USD" name="Dólares (USD)" fill={COLORS.USD}>
                      <LabelList dataKey="USD" position="right" formatter={(v) => v !== 0 ? `$ ${parseFloat(v).toFixed(0)}` : ''} style={{ fontSize: 11, fill: '#4A86B8' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TN por Cliente/Empresa */}
      {activeTab === 'tonelaje' && (
        <div className="financiero-section">
          <h2>Tonelaje Recibido por Cliente / Empresa</h2>

          {/* Filtros */}
          <div className="section-filters">
            <div className="filter-row">
              <div className="filter-item">
                <label>Mes</label>
                <select value={localFiltersTn.mes} onChange={e => handleFilterChangeTn('mes', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todos</option>
                  {filterOptionsTn.meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Semana</label>
                <select value={localFiltersTn.semana} onChange={e => handleFilterChangeTn('semana', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todas</option>
                  {filterOptionsTn.semanas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Cliente</label>
                <select value={localFiltersTn.cliente} onChange={e => handleFilterChangeTn('cliente', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todos</option>
                  {filterOptionsTn.clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Transportista</label>
                <select value={localFiltersTn.transportista} onChange={e => handleFilterChangeTn('transportista', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todos</option>
                  {filterOptionsTn.transportistas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Unidad</label>
                <select value={localFiltersTn.unidad} onChange={e => handleFilterChangeTn('unidad', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todas</option>
                  {filterOptionsTn.unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Divisa</label>
                <select value={localFiltersTn.divisa} onChange={e => handleFilterChangeTn('divisa', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todas</option>
                  {filterOptionsTn.divisas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn-clear-local" onClick={clearFiltersTn} disabled={filtersLoadingTn}>
                {filtersLoadingTn ? '...' : 'Limpiar'}
              </button>
            </div>
          </div>

          <div className="section-card">
            <h3>Tabla Dinámica - TN Recibido</h3>
            {tnClienteEmpresa.length === 0 ? (
              <p className="empty-message">No hay datos de tonelaje</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Empresa</th>
                      <th>TN Recibido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tnClienteEmpresa.map((item, index) => (
                      <tr key={index}>
                        <td>{item.cliente || 'Sin cliente'}</td>
                        <td>{item.empresa}</td>
                        <td>{parseFloat(item.total).toFixed(2)} TN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="chart-section">
            <h3>Gráfica - TN Recibido por Cliente / Empresa</h3>
            <div className="chart-container">
              {tnChart.length === 0 ? (
                <p className="empty-message">No hay datos para graficar</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, tnChart.length * 50)}>
                  <BarChart data={tnChart} layout="vertical" margin={{ right: 90, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" width={200} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${parseFloat(value).toFixed(2)} TN`, 'Tonelaje']} />
                    <Legend />
                    <Bar dataKey="total" name="TN Recibido" fill={COLORS.PEN}>
                      <LabelList dataKey="total" position="right" formatter={(v) => v > 0 ? `${parseFloat(v).toFixed(1)} TN` : ''} style={{ fontSize: 11, fill: '#1B7430' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Seguimiento de Transporte */}
      {activeTab === 'seguimiento' && (
        <div className="financiero-section">
          <h2>Seguimiento de Transporte - TN Enviado por Semana</h2>
          
          <div className="section-card full-width">
            <h3>Tabla de Seguimiento (Cliente → Empresa → Unidad → Semana)</h3>
            {seguimiento.length === 0 ? (
              <p className="empty-message">No hay datos de seguimiento</p>
            ) : (
              <div className="table-container seguimiento-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Empresa</th>
                      <th>Placa</th>
                      {seguimientoData.semanas.map(semana => (
                        <th key={semana}>{semana}</th>
                      ))}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seguimientoData.rows.map((row, index) => {
                      const total = seguimientoData.semanas.reduce((sum, s) => sum + (row[s] || 0), 0);
                      return (
                        <tr key={index}>
                          <td>{row.cliente || 'Sin cliente'}</td>
                          <td>{row.empresa}</td>
                          <td>{row.placa}</td>
                          {seguimientoData.semanas.map(semana => (
                            <td key={semana} className="number">
                              {row[semana] ? row[semana].toFixed(2) : '-'}
                            </td>
                          ))}
                          <td className="total">{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFinanciero;
