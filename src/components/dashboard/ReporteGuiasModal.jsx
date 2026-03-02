import { useState, useEffect, useRef } from 'react';
import { dashboardService } from '../../services/api';
import './ReporteGuiasModal.css';

const ReporteGuiasModal = ({ isOpen, onClose }) => {
  const [empresas, setEmpresas] = useState([]);
  const [meses, setMeses] = useState([]);
  const [empresa, setEmpresa] = useState('');
  const [mes, setMes] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingOpciones, setLoadingOpciones] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    if (isOpen) {
      loadOpciones();
    }
  }, [isOpen]);

  const loadOpciones = async () => {
    setLoadingOpciones(true);
    try {
      const result = await dashboardService.getReporteGuiasOpciones();
      setEmpresas(result.empresas || []);
      setMeses(result.meses || []);
    } catch (error) {
      console.error('Error cargando opciones:', error);
    } finally {
      setLoadingOpciones(false);
    }
  };

  const canGenerate = empresa && mes;

  const handleGenerar = async () => {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const result = await dashboardService.getReporteGuias({ empresa, mes });
      setData(result);
    } catch (error) {
      console.error('Error generando reporte:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>${empresa} - Guías Emitidas - ${mes}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 12px; font-size: 8px; }
          h2 { font-size: 13px; margin: 12px 0 6px 0; color: #1a1a1a; text-align: center; }
          h3 { font-size: 11px; margin: 8px 0 4px 0; color: #145524; }
          h4 { font-size: 10px; margin: 4px 0; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 7.5px; }
          th, td { border: 1px solid #555; padding: 2px 4px; text-align: right; }
          th { background: #1B7430; color: white; font-weight: 600; text-align: center; }
          td.col-left { text-align: left; }
          tr.fila-subtotal { background: #e8f5e9; font-weight: 700; }
          tr.fila-total { background: #c8e6c9; font-weight: 700; }
          .totales-moneda { margin-top: 4px; font-size: 9px; font-weight: 700; }
          @media print { body { padding: 6px; } @page { size: landscape; margin: 8mm; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  if (!isOpen) return null;

  const formatNum = (n) => {
    const val = Number(n) || 0;
    return val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const renderBloque = (bloque, idx) => (
    <div key={idx} className="rg-bloque">
      <h3>UNID: {bloque.placa}</h3>
      {bloque.semanas.map((sem, sIdx) => (
        <div key={sIdx} className="rg-semana-block">
          <table className="rg-table">
            {sIdx === 0 && (
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Guía (Transportista)</th>
                  <th>Conductor</th>
                  <th>Placa</th>
                  <th>Peso</th>
                  <th>Peso (Mina)</th>
                  <th>N° Ticket</th>
                  <th>Guía (Remitente)</th>
                  <th>Cliente</th>
                  <th>Recorrido</th>
                  <th>Material</th>
                  <th>Precio</th>
                  <th>B.I.</th>
                  <th>Importe Total</th>
                </tr>
              </thead>
            )}
            <tbody>
              {sem.viajes.map((v, vIdx) => (
                <tr key={vIdx}>
                  <td className="col-left">{formatDate(v.fecha)}</td>
                  <td className="col-left">{v.grt}</td>
                  <td className="col-left">{v.conductor}</td>
                  <td>{v.placa}</td>
                  <td>{formatNum(v.peso)}</td>
                  <td>{formatNum(v.pesoMina)}</td>
                  <td className="col-left">{v.ticket}</td>
                  <td className="col-left">{v.grr}</td>
                  <td className="col-left">{v.cliente}</td>
                  <td className="col-left">{v.recorrido}</td>
                  <td className="col-left">{v.material}</td>
                  <td>{v.divisa === 'PEN' ? 'S/' : '$'}{formatNum(v.precio)}</td>
                  <td>{v.divisa === 'PEN' ? 'S/' : '$'}{formatNum(v.bi)}</td>
                  <td>{v.divisa === 'PEN' ? 'S/' : '$'}{formatNum(v.importeTotal)}</td>
                </tr>
              ))}
              <tr className="fila-subtotal">
                <td colSpan={5} className="col-left">{sem.semana}</td>
                <td>{formatNum(sem.totalTn)}</td>
                <td colSpan={8}></td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
      <div className="rg-bloque-totales">
        <table className="rg-table">
          <tbody>
            <tr className="fila-total">
              <td colSpan={5} className="col-left">TOTAL</td>
              <td>{formatNum(bloque.totalTn)}</td>
              <td colSpan={8}></td>
            </tr>
          </tbody>
        </table>
        <div className="totales-moneda">
          {bloque.totalDolares > 0 && <span className="moneda-tag">DOLARES ${formatNum(bloque.totalDolares)}</span>}
          {bloque.totalSoles > 0 && <span className="moneda-tag">S/ {formatNum(bloque.totalSoles)}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="rg-modal-overlay" onClick={onClose}>
      <div className="rg-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rg-modal-header">
          <div className="rg-modal-title">
            <h1>Transporte Según Guías Emitidas</h1>
          </div>
          <div className="rg-modal-actions">
            {data && !data.error && (
              <button className="btn-download-pdf" onClick={handleDownloadPDF}>
                📥 Descargar PDF
              </button>
            )}
            <button className="btn-close-modal" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Filtros */}
        <div className="rg-filters-bar">
          <div className="rg-filter-item">
            <label>Empresa de Transporte:</label>
            <select
              value={empresa}
              onChange={(e) => { setEmpresa(e.target.value); setData(null); }}
              disabled={loadingOpciones}
            >
              <option value="">Seleccionar empresa</option>
              {empresas.map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
            </select>
          </div>

          <div className="rg-filter-item">
            <label>Mes:</label>
            <select
              value={mes}
              onChange={(e) => { setMes(e.target.value); setData(null); }}
              disabled={!empresa}
            >
              <option value="">Seleccionar mes</option>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <button className="rg-btn-generar" onClick={handleGenerar} disabled={!canGenerate || loading}>
            {loading ? 'Generando...' : 'Generar Reporte'}
          </button>
        </div>

        {/* Body */}
        <div className="rg-modal-body">
          {loading ? (
            <div className="loading-section"><div className="spinner"></div><p>Generando reporte...</p></div>
          ) : !data ? (
            <div className="empty-section">Selecciona empresa y mes, luego presiona "Generar Reporte"</div>
          ) : data.error ? (
            <div className="empty-section">{data.error}</div>
          ) : (
            <div ref={printRef}>
              <h2>{data.empresa} — TRANSPORTE SEGÚN GUÍAS EMITIDAS</h2>
              <h4 style={{ textAlign: 'center', color: '#555', marginBottom: 12 }}>{data.mes}</h4>

              {data.bloques.map((bloque, idx) => renderBloque(bloque, idx))}

              {/* Totales generales */}
              <div className="rg-totales-generales">
                <h3>TOTALES GENERALES</h3>
                <p>Total TN: <strong>{formatNum(data.totalesGenerales.totalTn)}</strong></p>
                {data.totalesGenerales.totalDolares > 0 && (
                  <p>Total Dólares: <strong>${formatNum(data.totalesGenerales.totalDolares)}</strong></p>
                )}
                {data.totalesGenerales.totalSoles > 0 && (
                  <p>Total Soles: <strong>S/ {formatNum(data.totalesGenerales.totalSoles)}</strong></p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReporteGuiasModal;
