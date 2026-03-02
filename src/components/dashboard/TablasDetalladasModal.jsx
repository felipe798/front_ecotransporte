import { useState, useEffect, useRef } from 'react';
import { dashboardService } from '../../services/api';
import './TablasDetalladasModal.css';

const TablasDetalladasModal = ({ isOpen, onClose, mesesDisponibles }) => {
  const [mes, setMes] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    if (isOpen && mesesDisponibles.length > 0 && !mes) {
      setMes(mesesDisponibles[0]);
    }
  }, [isOpen, mesesDisponibles]);

  useEffect(() => {
    if (mes) {
      loadData();
    }
  }, [mes]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await dashboardService.getTablasDetalladas(mes);
      setData(result);
    } catch (error) {
      console.error('Error cargando tablas detalladas:', error);
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
        <title>Tablas Detalladas - ${mes}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
          h2 { font-size: 16px; margin: 15px 0 8px 0; color: #1a1a1a; }
          h3 { font-size: 13px; margin: 10px 0 5px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
          th, td { border: 1px solid #333; padding: 4px 6px; text-align: right; }
          th { background: #1B7430; color: white; font-weight: 600; text-align: center; }
          th.col-cliente { text-align: left; background: #145524; }
          td.col-cliente { text-align: left; font-weight: 500; }
          tr.fila-total { background: #e8f5e9; font-weight: 700; }
          tr.fila-fixed { background: #fafafa; }
          .margen-table { max-width: 400px; margin: 10px auto; }
          .margen-table th { background: #0d47a1; }
          .margen-table td { font-weight: 600; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (!isOpen) return null;

  const formatNum = (n) => {
    const val = Number(n) || 0;
    return val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderTable = (title, type) => {
    if (!data) return null;
    const { empresas, filas, totales } = data;

    return (
      <div className="tabla-detallada-section">
        <h2>{title}</h2>
        <div className="tabla-scroll-container">
          <table className="tabla-detallada">
            <thead>
              <tr>
                <th className="col-cliente" rowSpan={2}>Cliente</th>
                <th colSpan={2}>General</th>
                {empresas.map(emp => (
                  <th key={emp} colSpan={2}>{emp}</th>
                ))}
              </tr>
              <tr>
                <th>TNE</th>
                <th>Importe</th>
                {empresas.map(emp => (
                  <th key={`${emp}-tne`}>TNE</th>
                )).flatMap((el, i) => [el, <th key={`${empresas[i]}-imp`}>Importe</th>])}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, idx) => (
                <tr key={idx} className={fila.isFixed ? 'fila-fixed' : ''}>
                  <td className="col-cliente">{fila.label}</td>
                  <td>{formatNum(fila.data.general.tne)}</td>
                  <td>{formatNum(type === 'venta' ? fila.data.general.importeVenta : fila.data.general.importeCosto)}</td>
                  {empresas.map(emp => {
                    const d = fila.data[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
                    return [
                      <td key={`${emp}-${idx}-tne`}>{formatNum(d.tne)}</td>,
                      <td key={`${emp}-${idx}-imp`}>{formatNum(type === 'venta' ? d.importeVenta : d.importeCosto)}</td>,
                    ];
                  })}
                </tr>
              ))}
              {/* Total Dólares */}
              <tr className="fila-total">
                <td className="col-cliente">Total Dólares (USD)</td>
                <td>{formatNum(totales.USD.general.tne)}</td>
                <td>{formatNum(type === 'venta' ? totales.USD.general.importeVenta : totales.USD.general.importeCosto)}</td>
                {empresas.map(emp => {
                  const d = totales.USD[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
                  return [
                    <td key={`usd-${emp}-tne`}>{formatNum(d.tne)}</td>,
                    <td key={`usd-${emp}-imp`}>{formatNum(type === 'venta' ? d.importeVenta : d.importeCosto)}</td>,
                  ];
                })}
              </tr>
              {/* Total Soles */}
              <tr className="fila-total">
                <td className="col-cliente">Total Soles (PEN)</td>
                <td>{formatNum(totales.PEN.general.tne)}</td>
                <td>{formatNum(type === 'venta' ? totales.PEN.general.importeVenta : totales.PEN.general.importeCosto)}</td>
                {empresas.map(emp => {
                  const d = totales.PEN[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
                  return [
                    <td key={`pen-${emp}-tne`}>{formatNum(d.tne)}</td>,
                    <td key={`pen-${emp}-imp`}>{formatNum(type === 'venta' ? d.importeVenta : d.importeCosto)}</td>,
                  ];
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMargen = () => {
    if (!data) return null;
    const { margen } = data;

    return (
      <div className="tabla-detallada-section margen-section">
        <h2>Margen de Ganancia</h2>
        <table className="tabla-detallada margen-table">
          <thead>
            <tr>
              <th className="col-cliente">Concepto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="col-cliente">Dólares (USD)</td>
              <td>{formatNum(margen.USD.margen)}</td>
            </tr>
            <tr>
              <td className="col-cliente">Soles (PEN)</td>
              <td>{formatNum(margen.PEN.margen)}</td>
            </tr>
            <tr className="fila-total">
              <td className="col-cliente">TOTAL</td>
              <td>{formatNum(margen.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="tablas-modal-overlay" onClick={onClose}>
      <div className="tablas-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tablas-modal-header">
          <div className="tablas-modal-title">
            <h1>Tablas Detalladas</h1>
            <div className="tablas-modal-filter">
              <label>Mes:</label>
              <select value={mes} onChange={(e) => setMes(e.target.value)}>
                {mesesDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="tablas-modal-actions">

            <button className="btn-download-pdf" onClick={handleDownloadPDF} disabled={loading || !data}>
              📥 Descargar PDF
            </button>
            <button className="btn-close-modal" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="tablas-modal-body">
          {loading ? (
            <div className="loading-section"><div className="spinner"></div><p>Cargando datos...</p></div>
          ) : !data ? (
            <div className="empty-section">Selecciona un mes para ver los datos</div>
          ) : (
            <>
              <div ref={printRef}>
                <h3 style={{ textAlign: 'center', marginBottom: 10 }}>Reporte Detallado - {mes}</h3>
                {renderTable('Tabla de Venta (Precio Unitario × TN Recibida)', 'venta')}
                {renderTable('Tabla de Costo (Precio Costo × TN Recibida)', 'costo')}
                {renderMargen()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TablasDetalladasModal;
