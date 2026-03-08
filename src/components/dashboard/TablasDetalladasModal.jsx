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
          h2 { font-size: 16px; margin: 15px 0 8px 0; color: #1E3D2C; }
          h3 { font-size: 13px; margin: 10px 0 5px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
          th, td { border: 1px solid #E2E8F0; padding: 4px 6px; text-align: right; color: #1E2A3A; }
          th { background: #A8DFC4; color: #1E3D2C; font-weight: 600; text-align: center; }
          th.col-cliente { text-align: left; background: #96D9B8; color: #173324; }
          th.col-general { background: #A3BFFA; border-color: #8DAFEF; color: #1E2F5C; }
          th.col-empresa-0 { background: #C4A8F0; border-color: #B393E5; color: #2E2048; }
          th.col-empresa-1 { background: #FAC98A; border-color: #EBB876; color: #3D2200; }
          th.col-empresa-2 { background: #F5A3A8; border-color: #E89298; color: #3D1018; }
          th.col-empresa-3 { background: #A8C8DC; border-color: #95BACE; color: #1A3040; }
          td.col-cliente { text-align: left; font-weight: 500; }
          td.col-material { padding-left: 20px; font-weight: 400; font-size: 9px; }
          tr.fila-cliente-header td { background: #C5D0E0; color: #1E2A3A; font-weight: 700; text-align: left; }
          tr.fila-total { background: #A8DBC0; font-weight: 700; color: #1E3D2C; }
          .margen-table { margin: 10px 0; }
          .margen-table th { background: #A3BFFA; }
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
    const { empresas, grupos, totales } = data;

    return (
      <div className="tabla-detallada-section">
        <h2>{title}</h2>
        <div className="tabla-scroll-container">
          <table className="tabla-detallada">
            <colgroup>
              <col style={{ minWidth: '140px' }} />
              {empresas.concat(['general']).map(() => [
                <col key={Math.random()} style={{ minWidth: '80px' }} />,
                <col key={Math.random()} style={{ minWidth: '90px' }} />,
              ])}
            </colgroup>
            <thead>
              <tr>
                <th className="col-cliente" rowSpan={2}>Cliente</th>
                <th className="col-general" colSpan={2}>General</th>
                {empresas.map((emp, idx) => (
                  <th key={emp} className={`col-empresa-${idx % 4}`} colSpan={2}>{emp}</th>
                ))}
              </tr>
              <tr>
                <th className="col-general">TNE</th>
                <th className="col-general">Importe</th>
                {empresas.map((emp, idx) => (
                  <th key={`${emp}-tne`} className={`col-empresa-${idx % 4}`}>TNE</th>
                )).flatMap((el, i) => [el, <th key={`${empresas[i]}-imp`} className={`col-empresa-${i % 4}`}>Importe</th>])}
              </tr>
            </thead>
            <tbody>
              {grupos.map((grupo, gIdx) => (
                <>
                  {/* Fila encabezado del cliente */}
                  <tr key={`cliente-${gIdx}`} className="fila-cliente-header">
                    <td className="col-cliente" colSpan={3 + empresas.length * 2}>
                      {grupo.cliente}
                    </td>
                  </tr>
                  {/* Filas de materiales */}
                  {grupo.materiales.map((mat, mIdx) => (
                    <tr key={`mat-${gIdx}-${mIdx}`}>
                      <td className="col-cliente col-material">{mat.label}</td>
                      <td>{formatNum(mat.data.general.tne)} TN</td>
                      <td>{mat.divisa === 'PEN' ? 'S/' : '$'}{formatNum(type === 'venta' ? mat.data.general.importeVenta : mat.data.general.importeCosto)}</td>
                      {empresas.map(emp => {
                        const d = mat.data[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
                        return [
                          <td key={`${emp}-${gIdx}-${mIdx}-tne`}>{formatNum(d.tne)} TN</td>,
                          <td key={`${emp}-${gIdx}-${mIdx}-imp`}>{mat.divisa === 'PEN' ? 'S/' : '$'}{formatNum(type === 'venta' ? d.importeVenta : d.importeCosto)}</td>,
                        ];
                      })}
                    </tr>
                  ))}
                </>
              ))}
              {/* Total Dólares */}
              <tr className="fila-total">
                <td className="col-cliente">Total Dólares (USD)</td>
                <td>{formatNum(totales.USD.general.tne)} TN</td>
                <td>${formatNum(type === 'venta' ? totales.USD.general.importeVenta : totales.USD.general.importeCosto)}</td>
                {empresas.map(emp => {
                  const d = totales.USD[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
                  return [
                    <td key={`usd-${emp}-tne`}>{formatNum(d.tne)} TN</td>,
                    <td key={`usd-${emp}-imp`}>${formatNum(type === 'venta' ? d.importeVenta : d.importeCosto)}</td>,
                  ];
                })}
              </tr>
              {/* Total Soles */}
              <tr className="fila-total">
                <td className="col-cliente">Total Soles (PEN)</td>
                <td>{formatNum(totales.PEN.general.tne)} TN</td>
                <td>S/{formatNum(type === 'venta' ? totales.PEN.general.importeVenta : totales.PEN.general.importeCosto)}</td>
                {empresas.map(emp => {
                  const d = totales.PEN[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
                  return [
                    <td key={`pen-${emp}-tne`}>{formatNum(d.tne)} TN</td>,
                    <td key={`pen-${emp}-imp`}>S/{formatNum(type === 'venta' ? d.importeVenta : d.importeCosto)}</td>,
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
    const { margen, empresas } = data;

    return (
      <div className="tabla-detallada-section margen-section">
        <h2>Margen de Ganancia</h2>
        <div className="tabla-scroll-container">
          <table className="tabla-detallada margen-table">
            <colgroup>
              <col style={{ minWidth: '140px' }} />
              {empresas.concat(['general']).map((_, i) => [
                <col key={`m1-${i}`} style={{ minWidth: '80px' }} />,
                <col key={`m2-${i}`} style={{ minWidth: '90px' }} />,
              ])}
            </colgroup>
            <thead>
              <tr>
                <th className="col-cliente">Concepto</th>
                <th className="col-general" colSpan={2}>General</th>
                {empresas.map((emp, idx) => (
                  <th key={emp} className={`col-empresa-${idx % 4}`} colSpan={2}>{emp}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-cliente">Dólares (USD)</td>
                <td colSpan={2}>${formatNum(margen.USD.general.margen)}</td>
                {empresas.map(emp => (
                  <td key={`usd-${emp}`} colSpan={2}>${formatNum((margen.USD[emp] || { margen: 0 }).margen)}</td>
                ))}
              </tr>
              <tr>
                <td className="col-cliente">Soles (PEN)</td>
                <td colSpan={2}>S/{formatNum(margen.PEN.general.margen)}</td>
                {empresas.map(emp => (
                  <td key={`pen-${emp}`} colSpan={2}>S/{formatNum((margen.PEN[emp] || { margen: 0 }).margen)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
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
                <h3 style={{ textAlign: 'center', marginBottom: 14, fontSize: '1.1rem', fontWeight: 700, color: '#1a2332', letterSpacing: '0.02em' }}>
                  Reporte Detallado — <span style={{ textTransform: 'uppercase', color: '#2D8F4E', fontWeight: 800 }}>{mes}</span>
                </h3>
                {renderTable('Tabla de Venta (Precio Unitario × Peso Ticket)', 'venta')}
                {renderTable('Tabla de Costo (Precio Costo × Peso Ticket)', 'costo')}
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
