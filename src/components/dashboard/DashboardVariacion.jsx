import { useState, useEffect, useRef } from 'react';
import { dashboardService } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './DashboardComponents.css';

const fmtNum = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DashboardVariacion = ({ filters }) => {
  const isMobile = useIsMobile();
  const contentRef = useRef(null);
  const [tablaPivot, setTablaPivot] = useState([]);
  const [tnPorUnidadMes, setTnPorUnidadMes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const descargarPDF = async () => {
    if (!contentRef.current) return;
    setExportingPdf(true);
    try {
      const filterParts = [];
      if (filters.mes) filterParts.push(filters.mes);
      if (filters.semana) filterParts.push(`Semana ${filters.semana}`);
      if (filters.cliente) filterParts.push(filters.cliente);
      if (filters.transportista) filterParts.push(filters.transportista);
      if (filters.unidad) filterParts.push(`Placa: ${filters.unidad}`);
      if (filters.transportado) filterParts.push(filters.transportado);
      const subtitle = filterParts.length > 0 ? filterParts.join(' — ') : 'General';

      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = 'text-align:center;padding:16px 0 12px;border-bottom:2px solid #1B7430;margin-bottom:12px;';
      titleDiv.innerHTML = `<div style="font-size:22px;font-weight:800;color:#1B7430;">Variación TN</div><div style="font-size:14px;color:#333;margin-top:6px;">${subtitle}</div>`;
      contentRef.current.insertBefore(titleDiv, contentRef.current.firstChild);

      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#f5f5f5' });
      contentRef.current.removeChild(titleDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('Variacion_TN.pdf');
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

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
      <div className="pdf-btn-wrapper">
        <button className="btn-download-pdf" onClick={descargarPDF} disabled={exportingPdf}>
          {exportingPdf ? 'Generando...' : '📥 Descargar PDF'}
        </button>
      </div>
      <div ref={contentRef}>
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
                      <td>{fmtNum(item.tn_enviado)}</td>
                      <td>{fmtNum(item.tn_recibido)}</td>
                      <td className={parseFloat(item.variacion) < 0 ? 'negative' : 'positive'}>
                        {fmtNum(item.variacion)}
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
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
              <BarChart data={datosGrafico} margin={isMobile ? { top: 5, right: 5, left: 0, bottom: 5 } : undefined}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="mes" tick={{ fontSize: isMobile ? 9 : 12 }} angle={isMobile ? -45 : 0} textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 50 : 30} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 35 : 60} />
                <Tooltip formatter={(value) => `${fmtNum(value)} TN`} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }} />
                {!isMobile && <Legend />}
                {placasUnicas.slice(0, isMobile ? 6 : 8).map((placa, index) => (
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
                  <span className="summary-value">{fmtNum(totalEnviado)}</span>
                </div>
                <div className="summary-item">
                  <label>Total Peso Ticket (TN Recibida)</label>
                  <span className="summary-value">{fmtNum(totalRecibido)}</span>
                </div>
                <div className="summary-item">
                  <label>Variación Total</label>
                  <span className={`summary-value ${variacionTotal < 0 ? 'negative' : 'positive'}`}>
                    {fmtNum(variacionTotal)} TN ({fmtNum(porcVariacion)}%)
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
                    <td>{fmtNum(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default DashboardVariacion;
