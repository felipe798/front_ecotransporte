import { useState, useEffect } from 'react';
import { dashboardService } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './DashboardComponents.css';

const DashboardVariacion = ({ filters }) => {
  const [tablaPivot, setTablaPivot] = useState([]);
  const [tnPorUnidadMes, setTnPorUnidadMes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pivot, unidadMes] = await Promise.all([
        dashboardService.getTablaPivot(filters),
        dashboardService.getTnPorUnidadMes(filters),
      ]);
      // Parsear valores a números
      setTablaPivot((pivot || []).map(item => ({
        ...item,
        tn_enviado: parseFloat(item.tn_enviado) || 0,
        tn_recibido: parseFloat(item.tn_recibido) || 0,
        variacion: parseFloat(item.variacion) || 0
      })));
      setTnPorUnidadMes((unidadMes || []).map(item => ({
        ...item,
        total: parseFloat(item.total) || 0
      })));
    } catch (error) {
      console.error('Error cargando datos de variación:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-section"><div className="spinner"></div></div>;
  }

  // Agrupar datos por unidad para el gráfico
  const datosGrafico = tnPorUnidadMes.reduce((acc, item) => {
    const existingItem = acc.find(x => x.mes === item.mes);
    if (existingItem) {
      existingItem[item.placa] = parseFloat(item.total) || 0;
    } else {
      acc.push({
        mes: item.mes,
        [item.placa]: parseFloat(item.total) || 0
      });
    }
    return acc;
  }, []);

  // Obtener placas únicas para las barras
  const placasUnicas = [...new Set(tnPorUnidadMes.map(item => item.placa))];
  // Paleta de colores equilibrada para gráficos
  const colors = [
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

  return (
    <div className="dashboard-variacion">
      {/* Tabla Pivot TN Recibidas */}
      <div className="section-card full-width">
        <h2>📊 Tabla Pivot - Peso Ticket por Semana</h2>
        {tablaPivot.length === 0 ? (
          <p className="empty-message">No hay datos para mostrar</p>
        ) : (
          <div className="table-container pivot-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Cliente</th>
                  <th>Peso Guía (TN Enviada)</th>
                  <th>Peso Ticket (TN Recibida)</th>
                  <th>Variación</th>
                  <th>% Variación</th>
                </tr>
              </thead>
              <tbody>
                {tablaPivot.map((item, index) => {
                  const porcVariacion = item.tn_enviado > 0 
                    ? ((item.variacion / item.tn_enviado) * 100).toFixed(2) 
                    : 0;
                  return (
                    <tr key={index} className={parseFloat(item.variacion) < 0 ? 'row-negative' : ''}>
                      <td>{item.semana}</td>
                      <td>{item.cliente || 'Sin cliente'}</td>
                      <td>{parseFloat(item.tn_enviado).toFixed(2)}</td>
                      <td>{parseFloat(item.tn_recibido).toFixed(2)}</td>
                      <td className={parseFloat(item.variacion) < 0 ? 'negative' : 'positive'}>
                        {parseFloat(item.variacion).toFixed(2)}
                      </td>
                      <td className={parseFloat(porcVariacion) < 0 ? 'negative' : 'positive'}>
                        {porcVariacion}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TN por Unidad por Mes */}
      <div className="chart-section">
        <h2>🚛 Peso Guía / Peso Ticket por Unidad por Mes</h2>
        <div className="chart-container">
          {datosGrafico.length === 0 ? (
            <p className="empty-message">No hay datos para mostrar</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => `${parseFloat(value).toFixed(2)} TN`} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }} />
                <Legend />
                {placasUnicas.slice(0, 8).map((placa, index) => (
                  <Bar 
                    key={placa} 
                    dataKey={placa} 
                    name={placa} 
                    fill={colors[index % colors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Resumen de Variación */}
      <div className="section-card">
        <h2>⚖️ Resumen de Variación</h2>
        <div className="variacion-summary">
          {(() => {
            const totalEnviado = tablaPivot.reduce((sum, item) => sum + parseFloat(item.tn_enviado || 0), 0);
            const totalRecibido = tablaPivot.reduce((sum, item) => sum + parseFloat(item.tn_recibido || 0), 0);
            const variacionTotal = totalRecibido - totalEnviado;
            const porcVariacion = totalEnviado > 0 ? ((variacionTotal / totalEnviado) * 100) : 0;
            
            return (
              <>
                <div className="summary-item">
                  <label>Total Peso Guía (TN Enviada)</label>
                  <span className="summary-value">{totalEnviado.toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <label>Total Peso Ticket (TN Recibida)</label>
                  <span className="summary-value">{totalRecibido.toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <label>Variación Total</label>
                  <span className={`summary-value ${variacionTotal < 0 ? 'negative' : 'positive'}`}>
                    {variacionTotal.toFixed(2)} TN ({porcVariacion.toFixed(2)}%)
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Tabla detallada por Unidad y Mes */}
      <div className="section-card full-width">
        <h2>📝 Detalle TN por Unidad y Mes</h2>
        {tnPorUnidadMes.length === 0 ? (
          <p className="empty-message">No hay datos para mostrar</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Placa</th>
                  <th>TN Total</th>
                </tr>
              </thead>
              <tbody>
                {tnPorUnidadMes.map((item, index) => (
                  <tr key={index}>
                    <td>{item.mes}</td>
                    <td>{item.placa}</td>
                    <td>{parseFloat(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardVariacion;
