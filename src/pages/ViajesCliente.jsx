import { useState, useEffect } from 'react';
import { dashboardService } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
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

  // Paleta de colores equilibrada
  const COLORS = [
    '#1B7430', '#4A86B8', '#C4883A', '#8E6BAD', '#3A9E9E',
    '#C06050', '#5D8A5D', '#6882A8', '#B87840', '#9E6575'
  ];

  // Cargar filtros iniciales
  useEffect(() => {
    loadFiltros();
  }, []);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    loadData();
  }, [selectedCliente, selectedPlaca, selectedMes]);

  const loadFiltros = async () => {
    try {
      const segmentadores = await dashboardService.getSegmentadores();
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
      </div>

      {loading ? (
        <div className="loading-section"><div className="spinner"></div></div>
      ) : (
        <>
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
              <h2>Días con Viajes</h2>
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
            <div className="seccion-grafico">
              <h2>Traslados por Placa</h2>
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
        </>
      )}
    </div>
  );
};

export default ViajesCliente;
